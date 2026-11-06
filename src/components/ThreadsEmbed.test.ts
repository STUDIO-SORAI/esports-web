import { describe, expect, it } from 'vitest';
import { parseThreadsUrl } from './ThreadsEmbed';

describe('parseThreadsUrl', () => {
  it('正確解析標準 threads.net 網址', () => {
    const res = parseThreadsUrl('https://www.threads.net/@__js__q/post/DG24_8_SRtS');
    expect(res).toEqual({
      username: '__js__q',
      postId: 'DG24_8_SRtS',
      permalink: 'https://www.threads.net/@__js__q/post/DG24_8_SRtS',
    });
  });

  it('正確解析 threads.com 網址', () => {
    const res = parseThreadsUrl('https://threads.com/@user.name/post/ABC123xyz');
    expect(res).toEqual({
      username: 'user.name',
      postId: 'ABC123xyz',
      permalink: 'https://www.threads.net/@user.name/post/ABC123xyz',
    });
  });

  it('無效網址回傳 null', () => {
    expect(parseThreadsUrl('')).toBeNull();
    expect(parseThreadsUrl('https://threads.net/@user')).toBeNull();
    expect(parseThreadsUrl('https://twitter.com/user/status/123')).toBeNull();
  });
});
