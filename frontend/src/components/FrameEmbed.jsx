import { useEffect, useState } from 'react';
import './FrameEmbed.css';

const LOAD_TIMEOUT_MS = 20000;

/**
 * Provider iframe (YouTube, LinkedIn) filling its container.
 * Sites can refuse to render inside a frame without raising any event, so a
 * timeout is the only way to tell "slow" from "blocked" and offer a retry.
 */
export default function FrameEmbed({ embed }) {
  const [status, setStatus] = useState('loading');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (status !== 'loading') return undefined;
    const timer = setTimeout(() => setStatus('unavailable'), LOAD_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [status, attempt]);

  return (
    <div className={`frame-embed frame-embed--${embed.layout}`}>
      {status !== 'ready' && (
        <div className="frame-embed__status">
          <p role="status">
            {status === 'loading'
              ? `Loading ${embed.provider}…`
              : `This couldn’t load here. You can open it on ${embed.provider}.`}
          </p>
          {status === 'unavailable' && (
            <button
              type="button"
              className="frame-embed__retry"
              onClick={() => {
                setStatus('loading');
                setAttempt((value) => value + 1);
              }}
            >
              Try again
            </button>
          )}
        </div>
      )}
      {status !== 'unavailable' && (
        <iframe
          key={attempt}
          src={embed.url}
          title={`${embed.provider} content`}
          allow="encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
          onLoad={() => setStatus('ready')}
        />
      )}
    </div>
  );
}
