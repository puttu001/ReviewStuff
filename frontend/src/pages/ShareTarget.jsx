import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckIcon, LockIcon, SpinnerIcon } from '../components/Icons';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { PENDING_SHARE_KEY } from '../utils/pendingShare';

/**
 * Receives an OS share (Web Share Target, GET form) and saves it immediately.
 * No confirmation step by design — share, save, done.
 */
export default function ShareTarget() {
  const [params] = useSearchParams();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState('saving');
  const ran = useRef(false);

  const shared = {
    url: params.get('url') || undefined,
    text: params.get('text') || undefined,
    title: params.get('title') || undefined,
  };

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    if (!shared.url && !shared.text) {
      setStatus('empty');
      return;
    }

    // A share that arrives while signed out must not be lost — stash it and
    // replay after sign-in.
    if (!isAuthenticated) {
      sessionStorage.setItem(PENDING_SHARE_KEY, JSON.stringify(shared));
      setStatus('needs-auth');
      return;
    }

    api
      .save(shared)
      .then(() => {
        setStatus('saved');
        setTimeout(() => navigate('/', { replace: true }), 1200);
      })
      .catch(() => setStatus('error'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="page page--no-nav">
      <div className="center-state">
        {status === 'saving' && (
          <>
            <SpinnerIcon width={28} height={28} />
            <p>Saving…</p>
          </>
        )}

        {status === 'saved' && (
          <>
            <div className="icon-circle share__ok">
              <CheckIcon width={28} height={28} />
            </div>
            <h2>Saved</h2>
            <p>You'll see it tomorrow</p>
          </>
        )}

        {status === 'needs-auth' && (
          <>
            <div className="icon-circle share__lock">
              <LockIcon width={26} height={26} />
            </div>
            <h2>Sign in to save this</h2>
            <p>Your link is waiting — it'll be saved right after you sign in</p>
            <button
              className="btn btn--primary share__cta"
              onClick={() => navigate('/login')}
            >
              Continue
            </button>
          </>
        )}

        {status === 'error' && (
          <>
            <h2>Couldn't save that</h2>
            <p>Something went wrong. Try sharing again.</p>
            <button className="btn btn--text" onClick={() => navigate('/')}>
              Go home
            </button>
          </>
        )}

        {status === 'empty' && (
          <>
            <h2>Nothing to save</h2>
            <p>That share didn't include a link or any text</p>
            <button className="btn btn--text" onClick={() => navigate('/')}>
              Go home
            </button>
          </>
        )}
      </div>
    </div>
  );
}
