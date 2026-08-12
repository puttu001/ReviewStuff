import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AlertIcon, GoogleIcon, SpinnerIcon } from '../components/Icons';
import { useAuth } from '../context/AuthContext';
import { useGoogleSignIn } from '../hooks/useGoogleSignIn';
import { api } from '../api/client';
import { takePendingShare } from '../utils/pendingShare';
import {
  enqueueSave,
  isBackgroundSyncSupported,
  requestSaveSync,
} from '../utils/syncQueue';
import './Login.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

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

        // Replay a share that arrived before the user was signed in. Route it
        // through the durable queue so a failure here retries instead of
        // silently dropping the link.
        const pending = takePendingShare();
        if (pending) {
          try {
            if (isBackgroundSyncSupported()) {
              await enqueueSave(pending, API_URL);
              await requestSaveSync();
            } else {
              await api.save(pending);
            }
          } catch {
            // Never block sign-in on the replay.
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
        <h1 className="login__title">ReviewStuff .</h1>
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
