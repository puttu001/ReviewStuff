import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckIcon, SkipIcon } from '../components/Icons';
import ReviewCarousel from '../components/ReviewCarousel';
import { api } from '../api/client';
import './Review.css';

export default function Review() {
  const [queue, setQueue] = useState([]);
  const [initialCount, setInitialCount] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    api
      .getReviewToday()
      .then((data) => {
        if (!alive) return;
        setQueue(data);
        setInitialCount(data.length);
      })
      .catch(() => {})
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  const item = queue[activeIndex];

  async function act(action) {
    if (!item || busy) return;
    setBusy(true);
    try {
      await api.reviewItem(item.id, action);
      setQueue((current) => [
        ...current.slice(activeIndex + 1),
        ...current.slice(0, activeIndex),
      ]);
      setActiveIndex(0);
    } catch {
      // Leave the user on the current card; retrying is safe.
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <div className="page page--no-nav" />;
  }

  if (initialCount > 0 && queue.length === 0) {
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

  return (
    <div className="page page--no-nav review">
      <div className="review__progress">
        <div className="review__dots">
          {Array.from({ length: initialCount }, (_, i) => (
            <span
              key={i}
              className={`review__dot ${
                i < initialCount - queue.length ? 'review__dot--done' : ''
              } ${i === initialCount - queue.length ? 'review__dot--on' : ''}`}
            />
          ))}
        </div>
        <span className="meta">
          {initialCount - queue.length + 1} of {initialCount}
        </span>
      </div>

      <ReviewCarousel
        key={queue.map((queueItem) => queueItem.id).join('-')}
        items={queue}
        activeIndex={activeIndex}
        onActiveIndexChange={setActiveIndex}
      />

      <div className="review__actions">
        <button
          type="button"
          className="btn btn--outline"
          onClick={() => act('skipped')}
          disabled={busy}
        >
          <SkipIcon width={18} height={18} />
          Skip
        </button>
        <button
          type="button"
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
