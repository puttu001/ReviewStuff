export const PENDING_SHARE_KEY = 'reviewstuff_pending_share';

/** Pull a share that arrived while signed out, if any. Clears it. */
export function takePendingShare() {
  const raw = sessionStorage.getItem(PENDING_SHARE_KEY);
  if (!raw) return null;
  sessionStorage.removeItem(PENDING_SHARE_KEY);
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
