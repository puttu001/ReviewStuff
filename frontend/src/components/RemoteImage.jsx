import { useState } from 'react';

/**
 * An <img> pointing at an arbitrary third-party host. Renders nothing when
 * there is no src or the fetch fails — missing metadata is the normal case
 * here, not an error state, so a broken-image icon must never appear.
 */
export default function RemoteImage({ src, className, alt = '' }) {
  // Tracked by src, not a boolean, so reusing this instance for a different
  // image (the review screen advancing to the next card) starts clean.
  const [brokenSrc, setBrokenSrc] = useState(null);

  if (!src || src === brokenSrc) return null;

  return (
    <img
      className={className}
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setBrokenSrc(src)}
    />
  );
}
