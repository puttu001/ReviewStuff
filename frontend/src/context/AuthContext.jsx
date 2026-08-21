import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, clearToken, getToken, setToken } from '../api/client';
import { clearPendingSaves, setStoredToken } from '../utils/syncQueue';
import { clearPendingShare } from '../utils/pendingShare';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setTokenState] = useState(() => getToken());
  const [user, setUser] = useState(null);

  // The service worker cannot read localStorage, so mirror the token into
  // IndexedDB for the background save queue.
  useEffect(() => {
    setStoredToken(token).catch(() => {});
  }, [token]);

  useEffect(() => {
    if (!token) {
      setUser(null);
      return;
    }
    let alive = true;
    api.getMe().then((account) => alive && setUser(account)).catch(() => {});
    return () => { alive = false; };
  }, [token]);

  const signIn = useCallback(async (googleIdToken) => {
    const { access_token } = await api.googleAuth(googleIdToken);
    setToken(access_token);
    setTokenState(access_token);
    setUser(await api.getMe());
    return access_token;
  }, []);

  const signOut = useCallback(async () => {
    // A queued save is account data: remove it before allowing another account
    // to supply the token that the service worker will use to drain the queue.
    await clearPendingSaves();
    clearPendingShare();
    try {
      window.google?.accounts?.id?.disableAutoSelect?.();
    } catch {
      // Google cleanup must not prevent local sign-out.
    }
    clearToken();
    setUser(null);
    setTokenState(null);
  }, []);

  const value = useMemo(
    () => ({ token, user, isAuthenticated: Boolean(token), signIn, signOut }),
    [token, user, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
