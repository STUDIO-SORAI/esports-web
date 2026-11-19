import { describe, expect, it } from 'vitest'
import {
  allMajorTiersSelected,
  isMajorTier,
  matchesSelectedTiers,
  toggleMatchTier,
} from './matchFilters'

describe('isMajorTier', () => {
  it('只認 S/A/B/C，不分大小寫', () => {
    expect(isMajorTier('A')).toBe(true)
    expect(isMajorTier('s')).toBe(true)
    expect(isMajorTier('d')).toBe(false)
    expect(isMajorTier(null)).toBe(false)
    expect(isMajorTier('')).toBe(false)
  })
})

describe('matchesSelectedTiers', () => {
  it('只顯示被勾到的層級', () => {
    const selected = new Set(['a'])
    expect(matchesSelectedTiers('a', selected)).toBe(true)
    expect(matchesSelectedTiers('A', selected)).toBe(true)
    expect(matchesSelectedTiers('s', selected)).toBe(false)
    expect(matchesSelectedTiers('b', selected)).toBe(false)
  })

  it('沒有層級或 D 級一律不顯示', () => {
    const selected = new Set(['s', 'a', 'b', 'c'])
    expect(matchesSelectedTiers(null, selected)).toBe(false)
    expect(matchesSelectedTiers('d', selected)).toBe(false)
  })

  it('一個都沒勾就什麼都不顯示', () => {
    expect(matchesSelectedTiers('a', new Set())).toBe(false)
  })
})

describe('toggleMatchTier', () => {
  it('四級全開時點 A → 只留 A', () => {
    expect(toggleMatchTier(['s', 'a', 'b', 'c'], 'a')).toEqual(['a'])
  })

  it('已只留 A 時再點 S → A 跟 S 一起開', () => {
    expect(toggleMatchTier(['a'], 's')).toEqual(['s', 'a'])
  })

  it('關掉其中一個不影響其他', () => {
    expect(toggleMatchTier(['s', 'a'], 'a')).toEqual(['s'])
  })

  it('最後一個也可以關光', () => {
    expect(toggleMatchTier(['a'], 'a')).toEqual([])
  })

  it('allMajorTiersSelected 只在四級都在時為 true', () => {
    expect(allMajorTiersSelected(['s', 'a', 'b', 'c'])).toBe(true)
    expect(allMajorTiersSelected(['a', 's'])).toBe(false)
    expect(allMajorTiersSelected([])).toBe(false)
  })
})
