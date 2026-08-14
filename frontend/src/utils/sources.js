import { hostname } from './format';

/**
 * Where an item came from, derived from its URL.
 *
 * Deliberately computed rather than stored: the source is already implied by
 * `content`, so deriving it needs no column, no migration and no backfill, and
 * it works retroactively for every item ever saved. It also cannot drift out of
 * sync with the URL the way a stored copy could.
 *
 * Matched on the registrable domain so mobile hosts and short links
 * (m.facebook.com, youtu.be, lnkd.in) fold into the same source.
 */
export const SOURCES = [
  { name: 'Instagram', domains: ['instagram.com'] },
  { name: 'Facebook', domains: ['facebook.com', 'fb.com', 'fb.watch'] },
  { name: 'YouTube', domains: ['youtube.com', 'youtu.be'] },
  { name: 'X', domains: ['x.com', 'twitter.com', 't.co'] },
  { name: 'LinkedIn', domains: ['linkedin.com', 'lnkd.in'] },
  { name: 'Reddit', domains: ['reddit.com', 'redd.it'] },
  { name: 'WhatsApp', domains: ['whatsapp.com', 'wa.me'] },
];

/** Items that are plain text rather than a link. */
export const NOTE_SOURCE = 'Note';

/**
 * A display name for the item's source: a known platform where we recognise the
 * domain, the bare hostname otherwise, or `Note` for a non-URL item.
 */
export function sourceName(content) {
  const host = hostname(content);
  if (!host) return NOTE_SOURCE;

  // `hostname` already strips `www.`; repeating it keeps this independent of
  // that detail.
  const bare = host.replace(/^www\./, '').toLowerCase();
  const known = SOURCES.find(({ domains }) =>
    domains.some((domain) => bare === domain || bare.endsWith(`.${domain}`)),
  );

  return known ? known.name : bare;
}
