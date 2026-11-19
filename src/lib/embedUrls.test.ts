import { describe, expect, it } from 'vitest'
import { parseTweetId, parseYouTubeId, parseYouTubeStart } from './embedUrls'

describe('parseTweetId', () => {
  it('認得 twitter.com 與 x.com', () => {
    expect(parseTweetId('https://twitter.com/lolpacificen/status/2096176828553818449?s=20')).toBe(
      '2096176828553818449'
    )
    expect(parseTweetId('https://x.com/lolpacificen/status/2096176828553818449')).toBe('2096176828553818449')
  })

  it('認得 vxtwitter / fxtwitter 鏡像網域', () => {
    expect(parseTweetId('https://vxtwitter.com/lolpacificen/status/2096176828553818449?s=20')).toBe(
      '2096176828553818449'
    )
    expect(parseTweetId('https://fxtwitter.com/lolpacificen/status/2096176828553818449')).toBe(
      '2096176828553818449'
    )
  })

  it('吃得下 www. / mobile. 前綴與舊的 statuses 路徑', () => {
    expect(parseTweetId('https://www.vxtwitter.com/a/status/123')).toBe('123')
    expect(parseTweetId('https://mobile.twitter.com/a/status/123')).toBe('123')
    expect(parseTweetId('https://twitter.com/a/statuses/123')).toBe('123')
    expect(parseTweetId('https://twitter.com/#!/a/status/123')).toBe('123')
  })

  it('其他網域與非推文路徑回 null（會掉到連結預覽）', () => {
    expect(parseTweetId('https://example.com/a/status/123')).toBeNull()
    expect(parseTweetId('https://twitter.com/lolpacificen')).toBeNull()
    expect(parseTweetId('https://notvxtwitter.com/a/status/123')).toBeNull()
    expect(parseTweetId('')).toBeNull()
  })
})

describe('parseYouTubeId / parseYouTubeStart', () => {
  it('抓得到影片 ID 與時間戳', () => {
    expect(parseYouTubeId('https://youtu.be/dQw4w9WgXcQ?t=1m30s')).toBe('dQw4w9WgXcQ')
    expect(parseYouTubeStart('https://youtu.be/dQw4w9WgXcQ?t=1m30s')).toBe(90)
    expect(parseYouTubeStart('https://youtu.be/dQw4w9WgXcQ')).toBe(0)
  })
})
