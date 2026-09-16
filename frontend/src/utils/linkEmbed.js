import { instagramPostUrl } from './instagram';

/** Only construct native embeds for recognised public post/video URLs. */
export function linkEmbed(content) {
  let url;
  try {
    url = new URL(content.trim());
  } catch {
    return null;
  }
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || url.port) {
    return null;
  }

  const instagram = instagramPostUrl(content);
  if (instagram) return { provider: 'Instagram', url: instagram, type: 'instagram' };

  const host = url.hostname.replace(/^www\./, '');
  if (['youtube.com', 'm.youtube.com', 'music.youtube.com', 'youtu.be', 'youtube-nocookie.com'].includes(host)) {
    let id;
    let vertical = false;
    if (host === 'youtu.be') {
      id = url.pathname.match(/^\/([\w-]{11})\/?$/)?.[1];
    } else if (url.pathname === '/watch') {
      id = url.searchParams.get('v');
    } else {
      const match = url.pathname.match(/^\/(shorts|embed|live)\/([\w-]{11})\/?$/);
      id = match?.[2];
      vertical = match?.[1] === 'shorts';
    }
    if (id && /^[\w-]{11}$/.test(id)) {
      return {
        provider: 'YouTube',
        type: 'frame',
        layout: vertical ? 'portrait' : 'video',
        url: `https://www.youtube-nocookie.com/embed/${id}?autoplay=0&controls=0&disablekb=1&fs=0`,
      };
    }
  }

  if (['linkedin.com', 'm.linkedin.com'].includes(host)) {
    const feed = url.pathname.match(/^\/(?:embed\/)?feed\/update\/(urn:li:(?:activity|share|ugcPost):\d+)\/?$/);
    const activity = url.pathname.startsWith('/posts/')
      ? url.pathname.match(/-activity-(\d+)(?:-[\w-]+)?\/?$/)?.[1]
      : null;
    const urn = feed?.[1] || (activity ? `urn:li:activity:${activity}` : null);
    if (urn) {
      return {
        provider: 'LinkedIn',
        type: 'frame',
        layout: 'post',
        url: `https://www.linkedin.com/embed/feed/update/${urn}`,
      };
    }
  }

  // Arbitrary pages commonly forbid framing. Use saved details for those URLs.
  return null;
}
