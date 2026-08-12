import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AlertIcon, GoogleIcon, SpinnerIcon } from '../components/Icons';
import { useAuth } from '../context/AuthContext';
import { useGoogleSignIn } from '../hooks/useGoogleSignIn';
import { api } from '../api/client';
import { takePendingShare } from '../utils/pendingShare';
import './Login.css';

export default function Login() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const buttonRef = useRef(null);

  const handleCredential = useCallback(
    async (idToken) => {
      setError(null);
      setBusy(true);
      try {
        await signIn(idToken);

        // Replay a share that arrived before the user was signed in.
        const pending = takePendingShare();
        if (pending) {
          try {
            await api.save(pending);
          } catch {
            // Losing the replay is bad but shouldn't block sign-in.
          }
        }

        navigate(location.state?.from || '/', { replace: true });
      } catch {
        setError('Sign-in failed. Please try again.');
      } finally {
        setBusy(false);
      }
    },
    [signIn, navigate, location.state],
  );

  const { ready, prompt, renderButton, configError } = useGoogleSignIn(handleCredential);

  useEffect(() => {
    if (ready && buttonRef.current) renderButton(buttonRef.current);
  }, [ready, renderButton]);

  return (
    <div className="page page--no-nav login">
      <div className="spacer" />

      <div className="login__brand">
        <h1 className="login__title">ReviewStuff</h1>
        <p className="text-secondary">Actually revisit what you save.</p>
      </div>

      <div className="spacer" />

      {configError && (
        <div className="login__error">
          <AlertIcon width={18} height={18} />
          <span>{configError}</span>
        </div>
      )}

      {error && (
        <div className="login__error">
          <AlertIcon width={18} height={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Google renders its own button here; the styled button below is the
          fallback that triggers the same flow via One Tap. */}
      <div ref={buttonRef} className="login__gbtn" />

      {!ready && (
        <button className="btn btn--outline" disabled>
          {busy ? <SpinnerIcon width={20} height={20} /> : <GoogleIcon />}
          {busy ? 'Signing in…' : 'Loading…'}
        </button>
      )}

      {ready && (
        <button className="btn btn--text" onClick={prompt} disabled={busy}>
          Having trouble? Try again
        </button>
      )}

      <p className="login__note text-secondary">
        We only use this to keep your saved items yours.
      </p>
    </div>
  );
}
