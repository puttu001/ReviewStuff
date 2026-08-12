/**
 * Service worker.
 *
 * Two jobs:
 *  1. Exist, so the app is installable and can register as a share target.
 *  2. Drain the pending-save queue in the background, so a shared link is
 *     never lost to a cold backend, a slow network, or the app being closed.
 *
 * Deliberately no response caching: the review queue changes daily and a
 * stale-cache bug would be worse than having no offline reads.
 *
 * IndexedDB access is duplicated from src/utils/syncQueue.js because this file
 * is served as-is from public/ and cannot import from the bundle.
 */

const DB_NAME = 'reviewstuff';
const DB_VERSION = 1;
const PENDING_STORE = 'pending_saves';
const AUTH_STORE = 'auth';
const SYNC_TAG = 'sync-saves';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('sync', (event) => {
  if (event.tag === SYNC_TAG) {
    // Throwing inside waitUntil tells the browser to retry this sync later.
    event.waitUntil(drainQueue());
  }
});

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(PENDING_STORE)) {
        db.createObjectStore(PENDING_STORE, { keyPath: 'id', autoIncrement: true });
      }
      if (!db.objectStoreNames.contains(AUTH_STORE)) {
        db.createObjectStore(AUTH_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function promisify(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function getToken(db) {
  const store = db.transaction(AUTH_STORE, 'readonly').objectStore(AUTH_STORE);
  return promisify(store.get('token'));
}

async function getPending(db) {
  const store = db.transaction(PENDING_STORE, 'readonly').objectStore(PENDING_STORE);
  return promisify(store.getAll());
}

async function removePending(db, id) {
  const store = db.transaction(PENDING_STORE, 'readwrite').objectStore(PENDING_STORE);
  return promisify(store.delete(id));
}

async function drainQueue() {
  const db = await openDb();

  try {
    const pending = await getPending(db);
    if (pending.length === 0) return;

    const token = await getToken(db);
    if (!token) {
      // Signed out. Keep the items — they'll go out after the next sign-in.
      return;
    }

    let retryNeeded = false;

    for (const item of pending) {
      let res;
      try {
        res = await fetch(`${item.apiUrl}/save`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(item.payload),
        });
      } catch {
        // Network still down — keep the item and let the browser retry.
        retryNeeded = true;
        continue;
      }

      if (res.ok) {
        await removePending(db, item.id);
        await notifyClients(item.payload);
      } else if (res.status === 401) {
        // Token expired. Keep it queued; a fresh sign-in will replace the token.
        retryNeeded = true;
      } else if (res.status >= 500) {
        retryNeeded = true;
      } else {
        // 4xx other than auth means this payload will never be accepted
        // (e.g. nothing savable in it). Retrying forever would be pointless.
        await removePending(db, item.id);
      }
    }

    if (retryNeeded) {
      throw new Error('Some saves still pending; requesting retry');
    }
  } finally {
    db.close();
  }
}

async function notifyClients(payload) {
  const clients = await self.clients.matchAll({ includeUncontrolled: true });
  for (const client of clients) {
    client.postMessage({ type: 'save-synced', payload });
  }
}
