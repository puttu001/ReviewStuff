import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { ExternalLinkIcon, XIcon } from './Icons';
import InstagramEmbed from './InstagramEmbed';
import RemoteImage from './RemoteImage';
import SiteIcon from './SiteIcon';
import { displayTitle, siteLabel } from '../utils/format';
import { linkEmbed } from '../utils/linkEmbed';
import './LinkPreviewDialog.css';

export default function LinkPreviewDialog({ item, onClose }) {
  const dialogRef = useRef(null);
  const backdropPress = useRef(false);
  const titleId = useId();
  const embed = useMemo(() => linkEmbed(item.content), [item.content]);
  const [showDetails, setShowDetails] = useState(false);
  const [frameStatus, setFrameStatus] = useState('loading');
  const unavailable = useCallback(() => setFrameStatus('unavailable'), []);
  const details = !embed || showDetails || frameStatus === 'unavailable';

  useEffect(() => {
    const dialog = dialogRef.current;
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.showModal();
    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
    };
  }, []);

  useEffect(() => {
    if (embed?.type !== 'frame' || details || frameStatus !== 'loading') return undefined;
    const timer = setTimeout(unavailable, 20000);
    return () => clearTimeout(timer);
  }, [embed, details, frameStatus, unavailable]);

  function isBackdrop(event) {
    if (event.target !== event.currentTarget) return false;
    const rect = event.currentTarget.getBoundingClientRect();
    return event.clientX < rect.left || event.clientX > rect.right ||
      event.clientY < rect.top || event.clientY > rect.bottom;
  }

  return (
    <dialog
      ref={dialogRef}
      className="link-preview"
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onPointerDown={(event) => { backdropPress.current = isBackdrop(event); }}
      onClick={(event) => {
        if (backdropPress.current && isBackdrop(event)) onClose();
        backdropPress.current = false;
      }}
    >
      <header className="link-preview__header">
        <div className="link-preview__heading">
          <p className="meta">Link preview</p>
          <h2 id={titleId}>{displayTitle(item)}</h2>
        </div>
        <button type="button" className="link-preview__close" aria-label="Close preview" onClick={onClose} autoFocus>
          <XIcon width={20} height={20} aria-hidden="true" />
        </button>
      </header>

      <div className="link-preview__body" role="region" tabIndex={0} aria-label="Preview content">
        <div className="link-preview__source">
          <p className="meta">
            <SiteIcon className="link-preview__favicon" src={item.fetched_favicon} url={item.content} />
            {siteLabel(item)}
          </p>
          <p className="link-preview__url">{item.content}</p>
        </div>

        {details ? (
          <div className="link-preview__details">
            <RemoteImage className="link-preview__image" src={item.fetched_image} />
            <p className="meta" role="status">
              {!embed
                ? 'An embedded preview isn’t available for this link.'
                : frameStatus === 'unavailable'
                  ? 'The embedded preview could not load. Here are the saved link details.'
                  : 'Saved link details'}
            </p>
          </div>
        ) : embed.type === 'instagram' ? (
          <InstagramEmbed url={embed.url} previewOnly onUnavailable={unavailable} />
        ) : (
          <div className={`link-preview__frame link-preview__frame--${embed.layout}`}>
            {frameStatus === 'loading' && <p className="link-preview__loading meta" role="status">Loading {embed.provider} preview…</p>}
            <div inert className="link-preview__embed-content">
              <iframe
                src={embed.url}
                title={`${embed.provider} preview`}
                tabIndex={-1}
                allow="autoplay 'none'; fullscreen 'none'"
                onLoad={() => setFrameStatus('ready')}
                onError={unavailable}
              />
            </div>
          </div>
        )}

        {embed && (
          <button
            type="button"
            className="link-preview__toggle"
            onClick={() => {
              if (details) {
                setFrameStatus('loading');
                setShowDetails(false);
              } else {
                setShowDetails(true);
              }
            }}
          >
            {details ? frameStatus === 'unavailable' ? 'Try embed again' : 'Show embed' : 'Show saved details'}
          </button>
        )}
      </div>

      <footer className="link-preview__footer">
        <p className="meta">Open the original to play videos or interact.</p>
        <a className="btn btn--primary" href={item.content} target="_blank" rel="noreferrer">
          Open link <ExternalLinkIcon width={18} height={18} aria-hidden="true" />
        </a>
      </footer>
    </dialog>
  );
}
