import { describe, expect, it } from 'vitest';
import { instagramPostUrl } from './instagram';

describe('Instagram review embeds', () => {
  it('uses a clean public permalink for posts and mobile reel shares', () => {
    expect(instagramPostUrl(' https://www.instagram.com/p/CaUsPbUquKV/?igsh=tracking#caption '))
      .toBe('https://www.instagram.com/p/CaUsPbUquKV/');
    expect(instagramPostUrl('https://m.instagram.com/reel/AbC_123-xy?utm_source=share'))
      .toBe('https://www.instagram.com/reel/AbC_123-xy/');
  });

  it.each([
    'A plain note',
    'https://www.linkedin.com/posts/example',
    'https://instagram.com.example.org/p/123/',
    'https://notinstagram.com/p/123/',
    'https://www.instagram.com/creator/',
    'https://www.instagram.com/stories/creator/123/',
    'https://www.instagram.com/share/reel/123/',
    'https://www.instagram.com/p/123/comments/',
    'https://user:password@www.instagram.com/p/123/',
    'https://www.instagram.com:8443/p/123/',
    'ftp://www.instagram.com/p/123/',
  ])('keeps unsupported links and lookalike hosts out of the player: %s', (content) => {
    expect(instagramPostUrl(content)).toBeNull();
  });
});
