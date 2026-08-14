import { useEffect, useMemo, useState } from 'react';
import BottomNav from '../components/BottomNav';
import ItemCard from '../components/ItemCard';
import { api } from '../api/client';
import { sourceName } from '../utils/sources';
import './Items.css';

const ALL = '__all__';
const UNCATEGORIZED = '__none__';

export default function Items() {
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState(ALL);
  const [source, setSource] = useState(ALL);
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

  // Ordered by how much you actually saved from each, so the platforms you use
  // sit at the front and one-off websites fall to the end.
  const sources = useMemo(() => {
    const counts = new Map();
    for (const item of items) {
      const name = sourceName(item.content);
      counts.set(name, (counts.get(name) || 0) + 1);
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([name]) => name);
  }, [items]);

  const visible = useMemo(() => {
    return items.filter((item) => {
      const topicOk =
        filter === ALL ||
        (filter === UNCATEGORIZED ? !item.topic : item.topic === filter);
      const sourceOk = source === ALL || sourceName(item.content) === source;
      return topicOk && sourceOk;
    });
  }, [items, filter, source]);

  function handleTopicChange(id, topic) {
    // Optimistic: the row is already updated server-side on success.
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, topic } : i)));
  }

  function handleDelete(id) {
    // Called only after the server confirms, so the count and the topic list
    // both fall out of this one update.
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  return (
    <>
      <div className="page">
        <div className="items__header">
          <h1 className="page-title items__title">Saved</h1>
          <span className="items__count">{items.length}</span>
        </div>

        {/* Source is derived from the URL, so this row needs no tagging effort
            and covers every item automatically. Only rendered once there is
            more than one source to choose between. */}
        {sources.length > 1 && (
          <div className="items__filters items__filters--sources">
            <Chip active={source === ALL} onClick={() => setSource(ALL)}>
              All sources
            </Chip>
            {sources.map((s) => (
              <Chip key={s} active={source === s} onClick={() => setSource(s)}>
                {s}
              </Chip>
            ))}
          </div>
        )}

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
                : filter !== ALL && source !== ALL
                  ? 'Nothing matches both of these filters'
                  : source !== ALL
                    ? `Nothing saved from ${source}`
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
                onDelete={handleDelete}
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
