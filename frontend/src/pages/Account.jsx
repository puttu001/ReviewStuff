import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppHeader from '../components/AppHeader';
import BottomNav from '../components/BottomNav';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import './Account.css';

export default function Account() {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    api.getMe()
      .then((user) => alive && setEmail(user.email))
      .catch(() => alive && setError('Could not load your account.'))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, []);

  async function handleSignOut() {
    setBusy(true);
    setError('');
    try {
      await signOut();
      navigate('/login', { replace: true });
    } catch {
      setError('Could not safely clear local account data. Please try again.');
      setBusy(false);
    }
  }

  return (
    <>
      <main className="page account">
        <AppHeader title="Account" />

        <section className="card account__identity" aria-busy={loading}>
          <span className="meta">Signed in as</span>
          <strong>{loading ? 'Loading…' : email}</strong>
        </section>

        {error && <p className="field-error" role="alert">{error}</p>}

        <div className="spacer" />

        {!confirming ? (
          <button className="btn btn--outline account__signout" onClick={() => setConfirming(true)}>
            Sign out
          </button>
        ) : (
          <section className="card account__confirmation" aria-labelledby="signout-title">
            <h2 id="signout-title">Sign out of ReviewStuff?</h2>
            <p className="meta">Any saves still waiting to sync from this device will be discarded.</p>
            <div className="account__confirmation-actions">
              <button className="btn btn--text" onClick={() => setConfirming(false)} disabled={busy}>
                Cancel
              </button>
              <button className="btn account__danger" onClick={handleSignOut} disabled={busy}>
                {busy ? 'Signing out…' : 'Sign out'}
              </button>
            </div>
          </section>
        )}
      </main>
      <BottomNav />
    </>
  );
}
