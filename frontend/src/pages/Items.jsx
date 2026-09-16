import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import BottomNav from '../components/BottomNav';
import AppHeader from '../components/AppHeader';
import ItemCard from '../components/ItemCard';
import LinkPreviewDialog from '../components/LinkPreviewDialog';
import { SearchIcon, XIcon } from '../components/Icons';
import { api } from '../api/client';
import { sourceName } from '../utils/sources';
import './Items.css';

const ALL = '__all__';

export default function Items() {
  const [items, setItems] = useState([]);
  const [searchParams, setSearchParams] = useSearchParams();
  const source = searchParams.get('source') || ALL;
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [previewItem, setPreviewItem] = useState(null);
  const searchId = useId();
  const searchRef = useRef(null);
  const searchButtonRef = useRef(null);
  const sourcesRef = useRef(null);
  const topicQuery = query.trim().toLowerCase();

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
    const names = [...counts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([name]) => name);
    // A source opened from Home can have zero saved items. Keep it selectable.
    if (source !== ALL && !counts.has(source)) names.push(source);
    return names;
  }, [items, source]);

  useEffect(() => {
    sourcesRef.current?.querySelector('[aria-pressed="true"]')?.scrollIntoView({
      block: 'nearest', inline: 'nearest',
    });
  }, [source, sources]);

  const visible = useMemo(() => {
    return items.filter((item) => {
      const topicOk = !topicQuery || (item.topic || '').toLowerCase().includes(topicQuery);
      const sourceOk = source === ALL || sourceName(item.content) === source;
      return topicOk && sourceOk;
    });
  }, [items, topicQuery, source]);

  function selectSource(nextSource) {
    setSearchParams((previous) => {
      const next = new URLSearchParams(previous);
      if (nextSource === ALL) next.delete('source');
      else next.set('source', nextSource);
      return next;
    }, { replace: true });
  }

  function closeSearch() {
    setSearchOpen(false);
    setQuery('');
    searchButtonRef.current?.focus();
  }

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
        <AppHeader />
        <div className="items__header">
          <h1 className="page-title items__title">Saved</h1>
          <span className="items__count">{items.length}</span>
          <button
            ref={searchButtonRef}
            type="button"
            className={`items__search-btn${searchOpen ? ' items__search-btn--active' : ''}`}
            aria-label="Search topics"
            aria-expanded={searchOpen}
            aria-controls={searchOpen ? searchId : undefined}
            title="Search saved topics"
            onClick={() => searchOpen ? closeSearch() : setSearchOpen(true)}
          >
            <SearchIcon width={20} height={20} aria-hidden="true" />
          </button>
        </div>

        {searchOpen && (
          <div id={searchId} className="items__search" role="search" aria-label="Search saved topics">
            <div className="items__search-field">
              <input
                ref={searchRef}
                type="search"
                className="input items__search-input"
                aria-label="Search saved topics"
                placeholder="Search saved topics"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Escape') {
                    event.preventDefault();
                    closeSearch();
                  }
                }}
                autoFocus
              />
              {query && (
                <button
                  type="button"
                  className="items__search-clear"
                  aria-label="Clear topic search"
                  onClick={() => {
                    setQuery('');
                    searchRef.current?.focus();
                  }}
                >
                  <XIcon width={18} height={18} aria-hidden="true" />
                </button>
              )}
            </div>
            {topicQuery && !loading && (
              <p className="meta items__search-count" role="status">
                {visible.length} {visible.length === 1 ? 'item matches' : 'items match'}
              </p>
            )}
          </div>
        )}

        {/* Source is derived from the URL, so this row needs no tagging effort
            and covers every item automatically. Only rendered once there is
            more than one source to choose between, or a source is selected. */}
        {(sources.length > 1 || source !== ALL) && (
          <div className="items__filters" ref={sourcesRef} role="group" aria-label="Filter by source">
            <Chip active={source === ALL} onClick={() => selectSource(ALL)}>
              All sources
            </Chip>
            {sources.map((s) => (
              <Chip key={s} active={source === s} onClick={() => selectSource(s)}>
                {s}
              </Chip>
            ))}
          </div>
        )}

        {loading ? (
          <div className="items__skeleton" />
        ) : visible.length === 0 ? (
          <div className="center-state">
            <h2>{items.length === 0 ? 'No items yet' : 'Nothing here'}</h2>
            <p>
              {items.length === 0
                ? 'Share a link from any app to get started'
                : topicQuery
                  ? `No saved topics match “${query.trim()}”${source !== ALL ? ` in ${source}` : ''}`
                  : source !== ALL
                    ? `Nothing saved from ${source}`
                    : 'No items to show'}
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
                onPreview={setPreviewItem}
              />
            ))}
          </div>
        )}
      </div>
      <BottomNav />
      {previewItem && (
        <LinkPreviewDialog
          key={previewItem.id}
          item={previewItem}
          onClose={() => setPreviewItem(null)}
        />
      )}
    </>
  );
}

function Chip({ active, onClick, children }) {
  return (
    <button
      type="button"
      className={`chip ${active ? 'chip--active' : ''}`}
      aria-pressed={active}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
