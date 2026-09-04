import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AppHeader from '../components/AppHeader';
import BottomNav from '../components/BottomNav';
import { BookmarkIcon, CheckIcon } from '../components/Icons';
import SourceIcon from '../components/SourceIcon';
import { api } from '../api/client';
import { sourceName } from '../utils/sources';
import './Dashboard.css';

const DASHBOARD_SOURCES = [
  { name: 'YouTube', slug: 'youtube' },
  { name: 'LinkedIn', slug: 'linkedin' },
  { name: 'X', slug: 'x' },
  { name: 'Instagram', slug: 'instagram' },
  { name: 'Facebook', slug: 'facebook' },
  { name: 'Threads', slug: 'threads' },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const [dueCount, setDueCount] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    Promise.all([api.getReviewToday(), api.getItems()])
      .then(([due, all]) => {
        if (!alive) return;
        setDueCount(due.length);
        setItems(all);
      })
      .catch(() => {})
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  const sourceCounts = useMemo(() => {
    const counts = new Map(DASHBOARD_SOURCES.map(({ name }) => [name, 0]));
    for (const item of items) {
      const source = sourceName(item.content);
      if (counts.has(source)) counts.set(source, counts.get(source) + 1);
    }
    return counts;
  }, [items]);

  return (
    <>
      <div className="page">
        <AppHeader />

        {loading ? (
          <DashboardSkeleton />
        ) : items.length === 0 ? (
          <FirstRun onAdd={() => navigate('/save')} />
        ) : (
          <DashboardSummary
            due={dueCount}
            total={items.length}
            sourceCounts={sourceCounts}
          />
        )}
      </div>
      <BottomNav />
    </>
  );
}

function DashboardSummary({ due, total, sourceCounts }) {
  return (
    <div className="dash__content">
      <section className="dash__metrics" aria-label="Saved item metrics">
        <div className="card dash__total-card">
          <span className="dash__metric-label">Total saved</span>
          <span className="dash__total-count">{total}</span>
          <span className="meta">{total === 1 ? 'item' : 'items'}</span>
        </div>

        <div className="dash__source-heading">
          <h2>Sources</h2>
          <span>Info only</span>
        </div>

        <dl className="dash__source-grid">
          {DASHBOARD_SOURCES.map(({ name, slug }) => (
            <div className="card dash__source" key={name}>
              <dt className="dash__source-name">
                <span
                  className={`dash__source-badge dash__source-badge--${slug}`}
                  aria-hidden="true"
                >
                  <SourceIcon source={name} />
                </span>
                <span>{name}</span>
              </dt>
              <dd className="dash__source-count">{sourceCounts.get(name)}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="dash__review" aria-label="Today's review">
        <div className="dash__stat">
          <span className="dash__count">{due}</span>
          <span className="dash__label">
            {due === 1 ? 'item to review today' : 'items to review today'}
          </span>
        </div>

        {due > 0 ? (
          <Link to="/review" className="btn btn--primary dash__review-cta">
            Start Review
          </Link>
        ) : (
          <p className="dash__caught-up">
            <CheckIcon width={18} height={18} />
            You're all caught up
          </p>
        )}
      </section>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="dash__skeleton" aria-hidden="true">
      <div className="dash__skeleton-total" />
      <div className="dash__skeleton-grid">
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} />
        ))}
      </div>
      <div className="dash__skeleton-review" />
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
