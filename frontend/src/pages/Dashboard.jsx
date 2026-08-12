import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AppHeader from '../components/AppHeader';
import BottomNav from '../components/BottomNav';
import { BookmarkIcon, CheckIcon } from '../components/Icons';
import { api } from '../api/client';
import './Dashboard.css';

export default function Dashboard() {
  const navigate = useNavigate();
  const [dueCount, setDueCount] = useState(null);
  const [totalCount, setTotalCount] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    Promise.all([api.getReviewToday(), api.getItems()])
      .then(([due, all]) => {
        if (!alive) return;
        setDueCount(due.length);
        setTotalCount(all.length);
      })
      .catch(() => {})
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  return (
    <>
      <div className="page">
        <AppHeader />

        {loading ? (
          <div className="dash__skeleton" />
        ) : totalCount === 0 ? (
          <FirstRun onAdd={() => navigate('/save')} />
        ) : dueCount === 0 ? (
          <CaughtUp total={totalCount} />
        ) : (
          <ReviewReady due={dueCount} total={totalCount} />
        )}
      </div>
      <BottomNav />
    </>
  );
}

function ReviewReady({ due, total }) {
  return (
    <>
      <div className="dash__stat">
        <span className="dash__count">{due}</span>
        <span className="dash__label">
          {due === 1 ? 'item to review today' : 'items to review today'}
        </span>
      </div>

      <p className="dash__total meta">{total} items saved in total</p>

      <div className="spacer" />

      <Link to="/review" className="btn btn--primary">
        Start Review
      </Link>
    </>
  );
}

function CaughtUp({ total }) {
  return (
    <div className="center-state">
      <div className="icon-circle dash__icon dash__icon--success">
        <CheckIcon width={30} height={30} />
      </div>
      <h2>You're all caught up</h2>
      <p className="meta">{total} items saved in total</p>
    </div>
  );
}

function FirstRun({ onAdd }) {
  return (
    <div className="center-state">
      <div className="icon-circle dash__icon dash__icon--accent">
        <BookmarkIcon width={28} height={28} />
      </div>
      <h2>Nothing saved yet</h2>
      <p>Share a link from any app, or add one manually</p>
      <button className="btn btn--primary dash__cta" onClick={onAdd}>
        Add your first item
      </button>
    </div>
  );
}
