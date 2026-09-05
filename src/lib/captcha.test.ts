import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createHmac } from 'node:crypto'
import { verifyPuzzle } from './captcha'

// generatePuzzle 要讀 public/captcha 底下的圖檔，屬於 I/O，不在這裡測。
// verifyPuzzle 是純函式，也是這整個機制唯一擋在提交端前面的東西 —— 它被繞過
// 就等於沒有驗證碼，所以這裡只測它，而且往壞的方向測。

// 與 captcha.ts 的 fallback 一致（測試環境不會設 CAPTCHA_SECRET）
const SECRET = 'sorai-esports-human-captcha-secret-salt-2026'
const sign = (data: string) => createHmac('sha256', SECRET).update(data).digest('base64url')

const NOW = new Date('2026-08-24T12:00:00.000Z')

/** 照 captcha.ts 的格式手工簽一張票，用來構造各種攻擊情境 */
function mint(answers: number[], expiresAt = NOW.getTime() + 5 * 60 * 1000) {
  const payload = JSON.stringify({ a: [...answers].sort((x, y) => x - y), e: expiresAt, r: 'deadbeef' })
  return `${Buffer.from(payload).toString('base64url')}.${sign(payload)}`
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(NOW)
})
afterEach(() => {
  vi.useRealTimers()
})

describe('verifyPuzzle / 正常路徑', () => {
  it('答案完全正確就通過', () => {
    expect(verifyPuzzle(mint([1, 4, 7]), [1, 4, 7])).toBe(true)
  })

  it('選取順序不影響結果', () => {
    expect(verifyPuzzle(mint([1, 4, 7]), [7, 1, 4])).toBe(true)
  })

  it('單一答案也可以', () => {
    expect(verifyPuzzle(mint([0]), [0])).toBe(true)
  })
})

describe('verifyPuzzle / 答錯', () => {
  it('少選一個不通過', () => {
    expect(verifyPuzzle(mint([1, 4, 7]), [1, 4])).toBe(false)
  })

  it('多選一個不通過', () => {
    expect(verifyPuzzle(mint([1, 4, 7]), [1, 4, 7, 8])).toBe(false)
  })

  it('數量對但內容不對，不通過', () => {
    expect(verifyPuzzle(mint([1, 4, 7]), [1, 4, 8])).toBe(false)
  })

  it('全部沒選，不通過', () => {
    expect(verifyPuzzle(mint([1, 4, 7]), [])).toBe(false)
  })

  // 排序用的是預設的字典序比較器嗎？如果是，[2,10] 會被排成 [10,2]。
  // 這條確認兩邊都用數值比較器，兩位數的索引不會對不上。
  it('索引超過個位數時排序仍然正確', () => {
    expect(verifyPuzzle(mint([2, 10, 11]), [11, 2, 10])).toBe(true)
    expect(verifyPuzzle(mint([2, 10]), [10, 2])).toBe(true)
  })
})

describe('verifyPuzzle / 偽造與竄改', () => {
  it('簽章被換掉就不通過', () => {
    const [payload] = mint([1, 2]).split('.')
    expect(verifyPuzzle(`${payload}.${sign('別的東西')}`, [1, 2])).toBe(false)
  })

  it('改答案但沿用舊簽章，不通過', () => {
    const original = mint([1, 2])
    const [, signature] = original.split('.')
    const forged = JSON.stringify({ a: [0, 1, 2, 3], e: NOW.getTime() + 60_000, r: 'deadbeef' })
    const token = `${Buffer.from(forged).toString('base64url')}.${signature}`
    expect(verifyPuzzle(token, [0, 1, 2, 3])).toBe(false)
  })

  it('用別的密鑰簽的票不通過', () => {
    const payload = JSON.stringify({ a: [1], e: NOW.getTime() + 60_000, r: 'x' })
    const token = `${Buffer.from(payload).toString('base64url')}.${createHmac('sha256', '猜的密鑰').update(payload).digest('base64url')}`
    expect(verifyPuzzle(token, [1])).toBe(false)
  })

  it('把過期時間往後改，簽章就對不上了', () => {
    const [, signature] = mint([1], NOW.getTime() - 1000).split('.')
    const extended = JSON.stringify({ a: [1], e: NOW.getTime() + 999_999, r: 'deadbeef' })
    expect(verifyPuzzle(`${Buffer.from(extended).toString('base64url')}.${signature}`, [1])).toBe(false)
  })
})

describe('verifyPuzzle / 過期', () => {
  it('過期的票不通過，即使答案正確', () => {
    expect(verifyPuzzle(mint([1, 2], NOW.getTime() - 1), [1, 2])).toBe(false)
  })

  it('還在有效期內就通過', () => {
    expect(verifyPuzzle(mint([1, 2], NOW.getTime() + 1000), [1, 2])).toBe(true)
  })

  it('票發出去五分鐘後失效', () => {
    const token = mint([1, 2])
    vi.setSystemTime(new Date(NOW.getTime() + 4 * 60 * 1000))
    expect(verifyPuzzle(token, [1, 2])).toBe(true)
    vi.setSystemTime(new Date(NOW.getTime() + 6 * 60 * 1000))
    expect(verifyPuzzle(token, [1, 2])).toBe(false)
  })
})

describe('verifyPuzzle / 畸形輸入一律回 false，不丟例外', () => {
  it.each([
    ['空字串', ''],
    ['沒有分隔點', 'abcdef'],
    ['只有 payload', 'abcdef.'],
    ['只有簽章', '.abcdef'],
    ['不是 base64 的 payload', '!!!.###'],
    ['payload 不是 JSON', `${Buffer.from('不是 json').toString('base64url')}.${sign('不是 json')}`],
    ['多個分隔點', 'a.b.c'],
  ])('%s', (_label, token) => {
    expect(verifyPuzzle(token, [1])).toBe(false)
  })

  it('payload 是合法 JSON 但缺少 a 欄位時也不會炸', () => {
    const payload = JSON.stringify({ e: NOW.getTime() + 60_000 })
    const token = `${Buffer.from(payload).toString('base64url')}.${sign(payload)}`
    expect(verifyPuzzle(token, [1])).toBe(false)
  })
})
