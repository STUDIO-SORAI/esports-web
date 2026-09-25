import { describe, expect, it } from 'vitest'
import { briefBodyToText, splitBriefBody } from './briefBody'

describe('splitBriefBody', () => {
  it('空值與純空白回傳空陣列', () => {
    expect(splitBriefBody('')).toEqual([])
    expect(splitBriefBody(null)).toEqual([])
    expect(splitBriefBody(undefined)).toEqual([])
    expect(splitBriefBody('   \n  \n')).toEqual([])
  })

  it('沒有網址時整段就是一個文字區塊，換行保留', () => {
    expect(splitBriefBody('第一行\n第二行')).toEqual([{ type: 'text', value: '第一行\n第二行' }])
  })

  it('單獨成行的網址切成嵌入區塊', () => {
    expect(splitBriefBody('賽後訪談：\nhttps://youtu.be/dQw4w9WgXcQ\n記得看到最後')).toEqual([
      { type: 'text', value: '賽後訪談：' },
      { type: 'embed', url: 'https://youtu.be/dQw4w9WgXcQ' },
      { type: 'text', value: '記得看到最後' },
    ])
  })

  it('前後有空白的網址行照樣算嵌入', () => {
    expect(splitBriefBody('  https://www.twitch.tv/videos/123456789  ')).toEqual([
      { type: 'embed', url: 'https://www.twitch.tv/videos/123456789' },
    ])
  })

  it('夾在句子裡的網址不嵌入，維持純文字', () => {
    expect(splitBriefBody('影片在這 https://youtu.be/dQw4w9WgXcQ 快去看')).toEqual([
      { type: 'text', value: '影片在這 https://youtu.be/dQw4w9WgXcQ 快去看' },
    ])
  })

  it('貼上 iframe 原始碼時取出 src', () => {
    expect(
      splitBriefBody('<iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ" allowfullscreen></iframe>')
    ).toEqual([{ type: 'embed', url: 'https://www.youtube.com/embed/dQw4w9WgXcQ' }])
  })

  it('被跳脫過的 iframe 也取得出 src', () => {
    expect(
      splitBriefBody('&lt;iframe src=&quot;https://www.youtube.com/embed/dQw4w9WgXcQ&quot;&gt;&lt;/iframe&gt;')
    ).toEqual([{ type: 'embed', url: 'https://www.youtube.com/embed/dQw4w9WgXcQ' }])
  })

  it('連續多個網址各自成為一個嵌入', () => {
    expect(splitBriefBody('https://x.com/a/status/1\nhttps://x.com/a/status/2')).toEqual([
      { type: 'embed', url: 'https://x.com/a/status/1' },
      { type: 'embed', url: 'https://x.com/a/status/2' },
    ])
  })

  it('網址周圍的空行不會產生空的文字區塊', () => {
    expect(splitBriefBody('前文\n\nhttps://youtu.be/dQw4w9WgXcQ\n\n')).toEqual([
      { type: 'text', value: '前文' },
      { type: 'embed', url: 'https://youtu.be/dQw4w9WgXcQ' },
    ])
  })
})

describe('briefBodyToText', () => {
  it('摘要用的文字會濾掉嵌入行', () => {
    expect(briefBodyToText('賽後訪談：\nhttps://youtu.be/dQw4w9WgXcQ\n記得看到最後')).toBe(
      '賽後訪談：\n\n記得看到最後'
    )
  })

  it('整篇只有網址時回傳空字串（呼叫端才好退回標題）', () => {
    expect(briefBodyToText('https://youtu.be/dQw4w9WgXcQ')).toBe('')
  })

  it('沒有網址時原樣保留', () => {
    expect(briefBodyToText('短訊正文')).toBe('短訊正文')
  })
})
