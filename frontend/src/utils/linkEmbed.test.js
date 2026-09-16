import { describe, expect, it } from 'vitest';
import { linkEmbed } from './linkEmbed';

describe('saved link embed URLs', () => {
  it('reuses the canonical Instagram permalink without share tracking', () => {
    expect(linkEmbed('https://m.instagram.com/reel/AbC_123-xy/?igsh=tracking')).toEqual({
      provider: 'Instagram', type: 'instagram', url: 'https://www.instagram.com/reel/AbC_123-xy/',
    });
  });

  it.each([
    'https://www.youtube.com/watch?v=M7lc1UVf-VE&autoplay=1&t=10',
    'https://youtu.be/M7lc1UVf-VE?si=tracking',
    'https://m.youtube.com/live/M7lc1UVf-VE',
    'https://www.youtube-nocookie.com/embed/M7lc1UVf-VE',
  ])('builds a YouTube preview with autoplay and keyboard playback disabled: %s', (url) => {
    const embed = linkEmbed(url);
    expect(embed.provider).toBe('YouTube');
    const frame = new URL(embed.url);
    expect(frame.origin).toBe('https://www.youtube-nocookie.com');
    expect(frame.pathname).toBe('/embed/M7lc1UVf-VE');
    expect(frame.searchParams.get('autoplay')).toBe('0');
    expect(frame.searchParams.get('disablekb')).toBe('1');
    expect(frame.searchParams.has('si')).toBe(false);
  });

  it('keeps YouTube Shorts in portrait format', () => {
    expect(linkEmbed('https://youtube.com/shorts/M7lc1UVf-VE?feature=share').layout).toBe('portrait');
  });

  it.each([
    ['https://www.linkedin.com/posts/person_topic-activity-7421234567890123456-abCD?utm_source=share', 'activity'],
    ['https://www.linkedin.com/feed/update/urn:li:activity:7421234567890123456/', 'activity'],
    ['https://m.linkedin.com/feed/update/urn:li:ugcPost:7421234567890123456?tracking=true', 'ugcPost'],
    ['https://www.linkedin.com/embed/feed/update/urn:li:share:7421234567890123456', 'share'],
  ])('recognises LinkedIn public post identifiers: %s', (url, kind) => {
    expect(linkEmbed(url).url).toBe(`https://www.linkedin.com/embed/feed/update/urn:li:${kind}:7421234567890123456`);
  });

  it.each([
    'A plain note',
    'https://example.com/article',
    'https://instagram.com/creator/',
    'https://youtube.com/playlist?list=example',
    'https://youtube.com/watch?v=invalid',
    'https://youtu.be/M7lc1UVf-VE/extra',
    'https://youtube.com.example.org/watch?v=M7lc1UVf-VE',
    'https://user:password@youtube.com/watch?v=M7lc1UVf-VE',
    'https://youtube.com:8443/watch?v=M7lc1UVf-VE',
    'ftp://youtube.com/watch?v=M7lc1UVf-VE',
    'https://linkedin.com/in/person/',
    'https://linkedin.com.example.org/feed/update/urn:li:activity:123',
    'https://lnkd.in/short-link',
  ])('falls back to saved details for unsupported or unsafe frame URLs: %s', (url) => {
    expect(linkEmbed(url)).toBeNull();
  });
});
