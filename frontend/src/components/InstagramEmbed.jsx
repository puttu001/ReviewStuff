import { useEffect, useRef, useState } from 'react';
import { loadInstagramEmbeds } from '../utils/instagram';
import './InstagramEmbed.css';

export default function InstagramEmbed({ url }) {
  const containerRef = useRef(null);
  const [status, setStatus] = useState('loading');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const container = containerRef.current;
    let alive = true;
    let frame;
    setStatus('loading');

    // Instagram replaces this element with an iframe. Keep its DOM separate
    // from React's children so switching cards can safely discard the player.
    const placeholder = document.createElement('blockquote');
    placeholder.className = 'instagram-media';
    placeholder.dataset.instgrmPermalink = url;
    placeholder.dataset.instgrmVersion = '14';
    placeholder.setAttribute('data-instgrm-captioned', '');
    container.replaceChildren(placeholder);

    function ready() {
      if (!alive) return;
      clearTimeout(timer);
      setStatus('ready');
    }

    function unavailable() {
      if (alive) setStatus('unavailable');
    }

    function watchFrame() {
      const nextFrame = container.querySelector('iframe');
      if (!nextFrame || nextFrame === frame) return;
      frame?.removeEventListener('load', ready);
      frame?.removeEventListener('error', unavailable);
      frame = nextFrame;
      frame.title = 'Instagram post';
      frame.addEventListener('load', ready);
      frame.addEventListener('error', unavailable);
    }

    const observer = new MutationObserver(watchFrame);
    observer.observe(container, { childList: true, subtree: true });
    const timer = setTimeout(unavailable, 25000);

    loadInstagramEmbeds()
      .then(() => {
        if (!alive) return;
        window.instgrm.Embeds.process();
        watchFrame();
      })
      .catch(unavailable);

    return () => {
      alive = false;
      clearTimeout(timer);
      observer.disconnect();
      frame?.removeEventListener('load', ready);
      frame?.removeEventListener('error', unavailable);
      container.replaceChildren();
    };
  }, [url, attempt]);

  return (
    <div className={`instagram-embed instagram-embed--${status}`}>
      {status !== 'ready' && (
        <div className="instagram-embed__status">
          <p role="status">
            {status === 'loading'
              ? 'Loading Instagram post…'
              : 'This post could not load here. You can open it on Instagram.'}
          </p>
          {status === 'unavailable' && (
            <button
              type="button"
              className="instagram-embed__retry"
              onClick={() => setAttempt((value) => value + 1)}
            >
              Try again
            </button>
          )}
        </div>
      )}
      <div className="instagram-embed__content" ref={containerRef} />
    </div>
  );
}
