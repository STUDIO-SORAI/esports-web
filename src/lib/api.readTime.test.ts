import { describe, expect, it } from 'vitest'
import { getReadTime } from './api'
import type { Post } from './types'

function post(overrides: Partial<Post> = {}): Post {
  return {
    id: '1',
    slug: 'test',
    title: '標題',
    ...overrides,
  }
}

describe('getReadTime / 與文章內頁同一套算法', () => {
  it('用去標籤後的字數 / 600，至少 1 分鐘', () => {
    const html = `<p>${'字'.repeat(600)}</p>`
    expect(getReadTime(post({ content: html }))).toBe('1 分鐘')
    expect(getReadTime(post({ content: `<p>${'字'.repeat(601)}</p>` }))).toBe('2 分鐘')
  })

  it('優先 rawContent，再 body，再 content（內頁傳整份 post）', () => {
    expect(
      getReadTime(
        post({
          rawContent: '甲'.repeat(1200),
          body: '乙'.repeat(600),
          content: '丙'.repeat(600),
        }),
      ),
    ).toBe('2 分鐘')
  })

  it('分類頁以前把 content 字串當 post 物件傳，必須跟內頁算出同一個數字', () => {
    const html = `<article><p>${'讀'.repeat(1800)}</p></article>`
    expect(getReadTime(html)).toBe(getReadTime(post({ content: html })))
    expect(getReadTime(html)).toBe('3 分鐘')
  })

  it('沒有內文才退回 1 分鐘，不能因為傳錯型別就永遠 1 分鐘', () => {
    expect(getReadTime(post({}))).toBe('1 分鐘')
    expect(getReadTime('')).toBe('1 分鐘')
  })
})
