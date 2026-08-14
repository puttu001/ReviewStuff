import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckIcon, ExternalLinkIcon, SkipIcon } from '../components/Icons';
import RemoteImage from '../components/RemoteImage';
import SiteIcon from '../components/SiteIcon';
import { api } from '../api/client';
import { displayTitle, hostname, siteLabel } from '../utils/format';
import './Review.css';

export default function Review() {
  const [queue, setQueue] = useState([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    api
      .getReviewToday()
      .then((data) => alive && setQueue(data))
      .catch(() => {})
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  const item = queue[index];

  async function act(action) {
    if (!item || busy) return;
    setBusy(true);
    try {
      await api.reviewItem(item.id, action);
      setIndex((i) => i + 1);
    } catch {
      // Leave the user on the current card; retrying is safe.
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <div className="page page--no-nav" />;
  }

  if (queue.length === 0) {
    return (
      <div className="page page--no-nav">
        <div className="center-state">
          <h2>Nothing to review today</h2>
          <p>Your next items are scheduled for tomorrow</p>
          <Link to="/" className="btn btn--text">
            Back to home
          </Link>
        </div>
      </div>
    );
  }

  if (index >= queue.length) {
    return (
      <div className="page page--no-nav">
        <div className="center-state">
          <div className="icon-circle review__done">
            <CheckIcon width={30} height={30} />
          </div>
          <h2>Done for today</h2>
          <p>Come back tomorrow for more</p>
          <Link to="/" className="btn btn--text">
            Back to home
          </Link>
        </div>
      </div>
    );
  }

  const host = hostname(item.content);

  return (
    <div className="page page--no-nav review">
      <div className="review__progress">
        <div className="review__dots">
          {queue.map((q, i) => (
            <span
              key={q.id}
              className={`review__dot ${i <= index ? 'review__dot--on' : ''}`}
            />
          ))}
        </div>
        <span className="meta">
          {index + 1} of {queue.length}
        </span>
      </div>

      <article className="card review__card">
        <span className={`chip ${item.topic ? '' : 'chip--add'}`}>
          {item.topic || 'Uncategorized'}
        </span>

        <RemoteImage className="review__image" src={item.fetched_image} />

        <h1 className="review__title">{displayTitle(item)}</h1>
        {host && (
          <p className="meta review__host">
            <SiteIcon
              className="review__favicon"
              src={item.fetched_favicon}
              url={item.content}
            />
            {siteLabel(item)}
          </p>
        )}

        <div className="spacer" />

        {host && (
          <a
            className="btn btn--outline"
            href={item.content}
            target="_blank"
            rel="noreferrer"
          >
            <ExternalLinkIcon width={18} height={18} />
            Open
          </a>
        )}
      </article>

      <div className="review__actions">
        <button
          className="btn btn--outline"
          onClick={() => act('skipped')}
          disabled={busy}
        >
          <SkipIcon width={18} height={18} />
          Skip
        </button>
        <button
          className="btn btn--success"
          onClick={() => act('reviewed')}
          disabled={busy}
        >
          <CheckIcon width={18} height={18} />
          Reviewed
        </button>
      </div>
    </div>
  );
}
