import { useState } from 'react';
import TopicInput from './TopicInput';
import { api } from '../api/client';
import { displayTitle, hostname, relativeTime } from '../utils/format';

export default function ItemCard({ item, topics, onTopicChange }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(item.topic || '');
  const [busy, setBusy] = useState(false);

  const host = hostname(item.content);

  async function commit() {
    const next = draft.trim() || null;
    if (next === item.topic) {
      setEditing(false);
      return;
    }

    setBusy(true);
    try {
      await api.updateItem(item.id, { topic: next });
      onTopicChange(item.id, next);
      setEditing(false);
    } catch {
      setDraft(item.topic || '');
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="card item-card">
      {host ? (
        <a
          className="item-card__link"
          href={item.content}
          target="_blank"
          rel="noreferrer"
        >
          <h2 className="item-card__title">{displayTitle(item)}</h2>
          <p className="item-card__host meta">{host}</p>
        </a>
      ) : (
        <div className="item-card__link">
          <h2 className="item-card__title">{displayTitle(item)}</h2>
          <p className="item-card__host meta">Note</p>
        </div>
      )}

      <div className="item-card__footer">
        {editing ? (
          <div className="item-card__edit">
            <TopicInput
              value={draft}
              onChange={setDraft}
              topics={topics}
              autoFocus
              disabled={busy}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commit();
                if (e.key === 'Escape') setEditing(false);
              }}
              onBlur={commit}
            />
          </div>
        ) : (
          <button
            type="button"
            className={`chip ${item.topic ? '' : 'chip--add'}`}
            onClick={() => setEditing(true)}
          >
            {item.topic || '+ Add topic'}
          </button>
        )}

        <span className="meta item-card__time">{relativeTime(item.created_at)}</span>
      </div>
    </article>
  );
}
