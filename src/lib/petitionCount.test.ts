import { describe, expect, it } from 'vitest'

import { parseSignatureCount } from './petitionCount'

describe('parseSignatureCount', () => {
  it('接受非負整數與數字字串', () => {
    expect(parseSignatureCount(0)).toBe(0)
    expect(parseSignatureCount(42)).toBe(42)
    expect(parseSignatureCount('123')).toBe(123)
  })

  it('小數會向下取整，不會顯示 1,234.56 人', () => {
    expect(parseSignatureCount(12.9)).toBe(12)
  })

  it('負數、NaN、Infinity 一律視為沒有數字', () => {
    expect(parseSignatureCount(-1)).toBeNull()
    expect(parseSignatureCount(Number.NaN)).toBeNull()
    expect(parseSignatureCount(Number.POSITIVE_INFINITY)).toBeNull()
  })

  it('空字串、null、物件、布林值都不會被當成 0', () => {
    expect(parseSignatureCount('')).toBeNull()
    expect(parseSignatureCount('   ')).toBeNull()
    expect(parseSignatureCount(null)).toBeNull()
    expect(parseSignatureCount(undefined)).toBeNull()
    expect(parseSignatureCount({ count: 5 })).toBeNull()
    expect(parseSignatureCount(true)).toBeNull()
  })

  it('壞掉的字串不會變成 NaN', () => {
    expect(parseSignatureCount('abc')).toBeNull()
    expect(parseSignatureCount('12px')).toBeNull()
  })
})
