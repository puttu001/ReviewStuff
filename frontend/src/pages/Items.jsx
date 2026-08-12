import { useEffect, useMemo, useState } from 'react';
import BottomNav from '../components/BottomNav';
import ItemCard from '../components/ItemCard';
import { api } from '../api/client';
import './Items.css';

const ALL = '__all__';
const UNCATEGORIZED = '__none__';

export default function Items() {
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState(ALL);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    api
      .getItems()
      .then((data) => alive && setItems(data))
      .catch(() => {})
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  const topics = useMemo(
    () => [...new Set(items.map((i) => i.topic).filter(Boolean))].sort(),
    [items],
  );

  const visible = useMemo(() => {
    if (filter === ALL) return items;
    if (filter === UNCATEGORIZED) return items.filter((i) => !i.topic);
    return items.filter((i) => i.topic === filter);
  }, [items, filter]);

  function handleTopicChange(id, topic) {
    // Optimistic: the row is already updated server-side on success.
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, topic } : i)));
  }

  return (
    <>
      <div className="page">
        <div className="items__header">
          <h1 className="page-title items__title">Saved</h1>
          <span className="items__count">{items.length}</span>
        </div>

        <div className="items__filters">
          <Chip active={filter === ALL} onClick={() => setFilter(ALL)}>
            All
          </Chip>
          <Chip
            active={filter === UNCATEGORIZED}
            onClick={() => setFilter(UNCATEGORIZED)}
          >
            Uncategorized
          </Chip>
          {topics.map((t) => (
            <Chip key={t} active={filter === t} onClick={() => setFilter(t)}>
              {t}
            </Chip>
          ))}
        </div>

        {loading ? (
          <div className="items__skeleton" />
        ) : visible.length === 0 ? (
          <div className="center-state">
            <h2>{items.length === 0 ? 'No items yet' : 'Nothing here'}</h2>
            <p>
              {items.length === 0
                ? 'Share a link from any app to get started'
                : 'No items in this topic'}
            </p>
          </div>
        ) : (
          <div className="items__list">
            {visible.map((item) => (
              <ItemCard
                key={item.id}
                item={item}
                topics={topics}
                onTopicChange={handleTopicChange}
              />
            ))}
          </div>
        )}
      </div>
      <BottomNav />
    </>
  );
}

function Chip({ active, onClick, children }) {
  return (
    <button
      type="button"
      className={`chip ${active ? 'chip--active' : ''}`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
