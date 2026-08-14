import { useEffect, useRef, useState } from 'react';
import { MoreIcon, TrashIcon } from './Icons';
import RemoteImage from './RemoteImage';
import SiteIcon from './SiteIcon';
import TopicInput from './TopicInput';
import { api } from '../api/client';
import { displayTitle, hostname, relativeTime, siteLabel } from '../utils/format';

export default function ItemCard({ item, topics, onTopicChange, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(item.topic || '');
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return undefined;

    function onPointerDown(e) {
      if (!menuRef.current?.contains(e.target)) setMenuOpen(false);
    }
    function onKeyDown(e) {
      if (e.key === 'Escape') setMenuOpen(false);
    }

    // pointerdown rather than click, so the menu is already closed by the time
    // a tap outside it lands on whatever is underneath.
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [menuOpen]);

  const host = hostname(item.content);
  const source = siteLabel(item);

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

  async function remove() {
    setDeleting(true);
    try {
      await api.deleteItem(item.id);
      // No state reset on success — the card unmounts as the list drops the row.
      onDelete(item.id);
    } catch {
      // Put the card back the way it was rather than stranding it mid-delete.
      setDeleting(false);
      setConfirming(false);
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
          <RemoteImage className="item-card__thumb" src={item.fetched_image} />
          <div className="item-card__text">
            <h2 className="item-card__title">{displayTitle(item)}</h2>
            <p className="item-card__host meta">
              <SiteIcon
                className="item-card__favicon"
                src={item.fetched_favicon}
                url={item.content}
              />
              {source}
            </p>
          </div>
        </a>
      ) : (
        <div className="item-card__link">
          <div className="item-card__text">
            <h2 className="item-card__title">{displayTitle(item)}</h2>
            <p className="item-card__host meta">Note</p>
          </div>
        </div>
      )}

      {confirming ? (
        <div className="item-card__confirm">
          <span className="meta item-card__confirm-label">Delete this?</span>
          <button
            type="button"
            className="item-card__confirm-btn"
            onClick={() => setConfirming(false)}
            disabled={deleting}
          >
            Cancel
          </button>
          <button
            type="button"
            className="item-card__confirm-btn item-card__confirm-btn--delete"
            onClick={remove}
            disabled={deleting}
          >
            {deleting ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      ) : (
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

          <div className="item-card__actions">
            <span className="meta item-card__time">{relativeTime(item.created_at)}</span>

            <div className="item-card__menu" ref={menuRef}>
              <button
                type="button"
                className="item-card__menu-btn"
                aria-label="More actions"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen((open) => !open)}
              >
                <MoreIcon width={18} height={18} />
              </button>

              {menuOpen && (
                <div className="item-card__menu-list" role="menu">
                  <button
                    type="button"
                    role="menuitem"
                    className="item-card__menu-item"
                    onClick={() => {
                      setMenuOpen(false);
                      setConfirming(true);
                    }}
                  >
                    <TrashIcon width={16} height={16} />
                    Delete
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </article>
  );
}
