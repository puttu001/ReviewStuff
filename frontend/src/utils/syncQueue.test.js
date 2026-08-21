import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { clearPendingSaves, enqueueSave, setStoredToken } from './syncQueue';

function deleteDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase('reviewstuff');
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

function getPendingSaves() {
  return new Promise((resolve, reject) => {
    const open = indexedDB.open('reviewstuff', 1);
    open.onerror = () => reject(open.error);
    open.onsuccess = () => {
      const db = open.result;
      const request = db.transaction('pending_saves', 'readonly')
        .objectStore('pending_saves')
        .getAll();
      request.onsuccess = () => {
        db.close();
        resolve(request.result);
      };
      request.onerror = () => reject(request.error);
    };
  });
}

describe('sign-out queue cleanup', () => {
  beforeEach(deleteDatabase);

  it('does not carry user A saves into user B session', async () => {
    await setStoredToken('user-a-token');
    await enqueueSave({ text: 'belongs to A' }, 'https://api.example');

    await clearPendingSaves();
    await setStoredToken(null);
    await setStoredToken('user-b-token');

    expect(await getPendingSaves()).toEqual([]);
  });
});
