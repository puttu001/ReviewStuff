import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckIcon, LockIcon, SpinnerIcon } from '../components/Icons';
import TopicInput from '../components/TopicInput';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { PENDING_SHARE_KEY } from '../utils/pendingShare';
import {
  enqueueSave,
  isBackgroundSyncSupported,
  requestSaveSync,
} from '../utils/syncQueue';
import './ShareTarget.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

/**
 * Receives an OS share (Web Share Target, GET form).
 *
 * Shows a small sheet first so the user can add a tag and description, then
 * hands the save to a background queue rather than awaiting it, so the screen
 * confirms instantly even when the backend is cold or the network is down.
 */
export default function ShareTarget() {
  const [params] = useSearchParams();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const shared = useMemo(
    () => ({
      url: params.get('url') || undefined,
      text: params.get('text') || undefined,
      title: params.get('title') || undefined,
    }),
    [params],
  );
  const hasContent = Boolean(shared.url || shared.text);

  const [status, setStatus] = useState(hasContent ? 'form' : 'empty');
  const [topic, setTopic] = useState('');
  const [description, setDescription] = useState('');
  const [topics, setTopics] = useState([]);

  // Suggestions keep "tech" and "Tech" from becoming two tags. Best-effort:
  // signed out or offline, the field still works as free text.
  useEffect(() => {
    if (!isAuthenticated) return;
    api
      .getItems()
      .then((items) => {
        const unique = [...new Set(items.map((i) => i.topic).filter(Boolean))];
        setTopics(unique.sort());
      })
      .catch(() => {});
  }, [isAuthenticated]);

  async function handleSave(e) {
    e.preventDefault();

    const payload = {
      ...shared,
      topic: topic.trim() || undefined,
      description: description.trim() || undefined,
    };

    // A share that arrives while signed out must not be lost — keep the tag
    // and description with it so they survive the sign-in.
    if (!isAuthenticated) {
      sessionStorage.setItem(PENDING_SHARE_KEY, JSON.stringify(payload));
      setStatus('needs-auth');
      return;
    }

    setStatus('saving');

    if (isBackgroundSyncSupported()) {
      try {
        await enqueueSave(payload, API_URL);
        await requestSaveSync();
        setStatus('queued');
        setTimeout(() => navigate('/', { replace: true }), 1200);
        return;
      } catch {
        // Fall through to a direct save.
      }
    }

    // No Background Sync (e.g. iOS Safari): save directly and wait.
    try {
      await api.save(payload);
      setStatus('saved');
      setTimeout(() => navigate('/', { replace: true }), 1200);
    } catch {
      setStatus('error');
    }
  }

  return (
    <div className="page page--no-nav">
      {status === 'form' && (
        <div className="share-sheet-backdrop">
          <form className="share-sheet" onSubmit={handleSave}>
            <h1 className="share-sheet__title">
              {shared.title || 'Save to ReviewStuff'}
            </h1>

            <div className="share-sheet__preview">{shared.url || shared.text}</div>

            <div className="field">
              <label className="field-label" htmlFor="share-tag">
                Tag
              </label>
              <TopicInput
                id="share-tag"
                value={topic}
                onChange={setTopic}
                topics={topics}
              />
            </div>

            <div className="field">
              <label className="field-label" htmlFor="share-description">
                Description
              </label>
              <textarea
                id="share-description"
                className="textarea share-sheet__description"
                placeholder="Why are you saving this?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <button type="submit" className="btn btn--primary">
              Save
            </button>
            <button
              type="button"
              className="btn btn--text"
              onClick={() => navigate('/', { replace: true })}
            >
              Cancel
            </button>
          </form>
        </div>
      )}

      {status === 'saving' && (
        <div className="center-state">
          <SpinnerIcon width={28} height={28} />
          <p>Saving…</p>
        </div>
      )}

      {(status === 'saved' || status === 'queued') && (
        <div className="center-state">
          <div className="icon-circle share__ok">
            <CheckIcon width={28} height={28} />
          </div>
          <h2>Saved</h2>
          <p>You'll see it tomorrow</p>
        </div>
      )}

      {status === 'needs-auth' && (
        <div className="center-state">
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
        </div>
      )}

      {status === 'error' && (
        <div className="center-state">
          <h2>Couldn't save that</h2>
          <p>Something went wrong. Try sharing again.</p>
          <button className="btn btn--text" onClick={() => navigate('/')}>
            Go home
          </button>
        </div>
      )}

      {status === 'empty' && (
        <div className="center-state">
          <h2>Nothing to save</h2>
          <p>That share didn't include a link or any text</p>
          <button className="btn btn--text" onClick={() => navigate('/')}>
            Go home
          </button>
        </div>
      )}
    </div>
  );
}
