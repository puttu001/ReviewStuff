export function isUrl(value) {
  return /^https?:\/\/\S+$/i.test(value.trim());
}

export function hostname(content) {
  try {
    return new URL(content).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

/** Title to display: explicit title, else the URL/note text itself. */
export function displayTitle(item) {
  return item.title?.trim() || item.content;
}

export function relativeTime(isoString) {
  const then = new Date(isoString);
  const days = Math.floor((Date.now() - then.getTime()) / 86400000);

  if (days <= 0) return 'saved today';
  if (days === 1) return 'saved 1d ago';
  if (days < 30) return `saved ${days}d ago`;
  const months = Math.floor(days / 30);
  return `saved ${months}mo ago`;
}
