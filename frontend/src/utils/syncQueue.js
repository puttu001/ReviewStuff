/**
 * Durable queue for shared items.
 *
 * A share must never be lost to a slow/cold backend or a dead connection, so
 * the page hands the save to IndexedDB and returns immediately. The service
 * worker drains the queue in the background (see public/sw.js) and retries
 * until it succeeds.
 *
 * IndexedDB rather than localStorage because service workers cannot read
 * localStorage — it is a synchronous API and unavailable outside a document.
 */

const DB_NAME = 'reviewstuff';
const DB_VERSION = 1;
export const PENDING_STORE = 'pending_saves';
export const AUTH_STORE = 'auth';
export const SYNC_TAG = 'sync-saves';

export function openDb() {
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

function tx(db, store, mode, fn) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(store, mode);
    const result = fn(transaction.objectStore(store));
    transaction.oncomplete = () => resolve(result?.result);
    transaction.onerror = () => reject(transaction.error);
  });
}

/**
 * The service worker sends with whatever token is current at send time, not
 * the one captured at queue time — so a queued share still lands after the
 * user signs in again with a fresh token.
 */
export async function setStoredToken(token) {
  const db = await openDb();
  await tx(db, AUTH_STORE, 'readwrite', (store) => {
    if (token) store.put(token, 'token');
    else store.delete('token');
  });
  db.close();
}

export async function enqueueSave(payload, apiUrl) {
  const db = await openDb();
  await tx(db, PENDING_STORE, 'readwrite', (store) =>
    store.add({ payload, apiUrl, createdAt: Date.now() }),
  );
  db.close();
}

/** Remove saves owned by the account that is signing out. */
export async function clearPendingSaves() {
  const db = await openDb();
  try {
    await tx(db, PENDING_STORE, 'readwrite', (store) => store.clear());
  } finally {
    db.close();
  }
}

export function isBackgroundSyncSupported() {
  return (
    'serviceWorker' in navigator &&
    typeof window !== 'undefined' &&
    'SyncManager' in window
  );
}

/** Ask the browser to run the drain now (or when connectivity returns). */
export async function requestSaveSync() {
  const registration = await navigator.serviceWorker.ready;
  await registration.sync.register(SYNC_TAG);
}
