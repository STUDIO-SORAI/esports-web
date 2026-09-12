import { describe, expect, it } from 'vitest'
import { matchesCategory, postsInCategory } from './categorySections'

const lol = { name: '英雄聯盟', slug: 'lol' }

describe('matchesCategory', () => {
  it('有 categorySlug 時以 slug 為準', () => {
    expect(matchesCategory({ categorySlug: 'lol', category: '隨便' }, lol)).toBe(true)
    expect(matchesCategory({ categorySlug: 'other-games', category: '英雄聯盟' }, lol)).toBe(false)
  })

  it('沒有 slug 才回頭比分類名稱（忽略大小寫與前後空白）', () => {
    expect(matchesCategory({ category: ' 英雄聯盟 ' }, lol)).toBe(true)
    expect(matchesCategory({ category: '其他遊戲' }, lol)).toBe(false)
  })

  it('完全沒有分類的文章不算任何一區', () => {
    expect(matchesCategory({}, lol)).toBe(false)
    expect(matchesCategory({ category: '' }, lol)).toBe(false)
  })
})

describe('postsInCategory', () => {
  // 2XKO 那篇：主要分類是「其他遊戲」，只是標籤帶了 #英雄聯盟
  const posts = [
    { slug: 'lck-booth', categorySlug: 'lol', category: '英雄聯盟', tags: ['英雄聯盟'] },
    { slug: '2xko', categorySlug: 'other-games', category: '其他遊戲', tags: ['英雄聯盟', '2XKO'] },
    { slug: 'lcp-final', categorySlug: 'lol', category: '英雄聯盟', tags: [] },
  ]

  it('標籤帶到分類名稱的文章不會被算進該分類區塊', () => {
    expect(postsInCategory(posts, lol).map((p) => p.slug)).toEqual(['lck-booth', 'lcp-final'])
  })

  it('維持傳入順序並套用上限', () => {
    expect(postsInCategory(posts, lol, 1).map((p) => p.slug)).toEqual(['lck-booth'])
  })

  it('沒有文章的分類回空陣列', () => {
    expect(postsInCategory(posts, { name: '特戰英豪', slug: 'valorant' })).toEqual([])
  })
})
