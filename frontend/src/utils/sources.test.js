import { describe, expect, it } from 'vitest';
import { sourceName } from './sources';

describe('sourceName', () => {
  it.each([
    ['https://youtu.be/example', 'YouTube'],
    ['https://www.linkedin.com/posts/example', 'LinkedIn'],
    ['https://x.com/example', 'X'],
    ['https://www.instagram.com/p/example', 'Instagram'],
    ['https://m.facebook.com/example', 'Facebook'],
    ['https://www.threads.com/@example/post/1', 'Threads'],
    ['https://www.threads.net/@example/post/1', 'Threads'],
  ])('groups %s under %s', (url, expected) => {
    expect(sourceName(url)).toBe(expected);
  });
});
