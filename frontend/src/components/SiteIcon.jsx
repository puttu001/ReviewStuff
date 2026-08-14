import { useState } from 'react';
import { sourceName } from '../utils/sources';

/**
 * The site's favicon, falling back to a built-in logo for the handful of sites
 * that never give us one.
 *
 * Instagram and Facebook refuse server-side fetches outright — they redirect to
 * a login wall and then rate-limit — so enrichment comes back completely empty
 * for them: no title, no image, no favicon. A hardcoded mark is the only way
 * those rows get a recognisable marker, and it costs a fetch fewer rather than
 * one more.
 *
 * These are filled shapes in brand colours, unlike the stroked `currentColor`
 * icons in Icons.jsx — they are logos rather than UI affordances, and at 14px a
 * solid mark stays legible where a thin outline turns to mud.
 */

const brandBase = { viewBox: '0 0 24 24', 'aria-hidden': true, focusable: 'false' };

const YouTubeMark = (p) => (
  <svg {...brandBase} {...p}>
    <rect x="1" y="4" width="22" height="16" rx="5" fill="#FF0000" />
    <path d="M10 8.5v7l6-3.5z" fill="#fff" />
  </svg>
);

const FacebookMark = (p) => (
  <svg {...brandBase} {...p}>
    <circle cx="12" cy="12" r="11" fill="#1877F2" />
    <path
      d="M13.4 20v-6.6h2.2l.33-2.56H13.4V9.2c0-.74.2-1.24 1.27-1.24h1.36V5.67c-.24-.03-1.04-.1-1.98-.1-1.96 0-3.3 1.2-3.3 3.4v1.87H8.53v2.56h2.22V20z"
      fill="#fff"
    />
  </svg>
);

const InstagramMark = (p) => (
  <svg {...brandBase} {...p}>
    <rect x="2" y="2" width="20" height="20" rx="6" fill="#E4405F" />
    <circle cx="12" cy="12" r="4.2" fill="none" stroke="#fff" strokeWidth="1.9" />
    <circle cx="17.1" cy="6.9" r="1.25" fill="#fff" />
  </svg>
);

// Keyed by the source names in utils/sources.js, so domain matching lives in
// exactly one place and the filter chips and these marks can never disagree
// about what counts as Instagram.
const MARKS = {
  YouTube: YouTubeMark,
  Facebook: FacebookMark,
  Instagram: InstagramMark,
};

export default function SiteIcon({ src, url, className }) {
  // Tracked by src rather than a boolean so reusing this instance for a
  // different item (the review screen advancing) starts clean.
  const [brokenSrc, setBrokenSrc] = useState(null);

  if (src && src !== brokenSrc) {
    return (
      <img
        className={className}
        src={src}
        alt=""
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        // A favicon that 404s falls through to the brand mark on the next
        // render rather than leaving a broken-image glyph.
        onError={() => setBrokenSrc(src)}
      />
    );
  }

  const Icon = MARKS[sourceName(url)];
  if (!Icon) return null;

  // Decorative: the site name is already rendered as text right beside it.
  return <Icon className={className} />;
}
