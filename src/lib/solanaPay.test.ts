import { describe, it, expect } from 'vitest'
import {
  buildSolanaPayUrl,
  formatAddress,
  SOLANA_USDC_MINT,
  DEFAULT_SPONSOR_WALLET,
} from './solanaPay'

describe('buildSolanaPayUrl', () => {
  it('在沒有地址時回傳空字串', () => {
    expect(buildSolanaPayUrl({ recipient: '' })).toBe('')
    expect(buildSolanaPayUrl({ recipient: '   ' })).toBe('')
  })

  it('支援最基礎的無金額轉帳 URI', () => {
    const url = buildSolanaPayUrl({ recipient: DEFAULT_SPONSOR_WALLET })
    expect(url).toBe(`solana:${DEFAULT_SPONSOR_WALLET}`)
  })

  it('支援原生 SOL 帶金額、標籤與訊息', () => {
    const url = buildSolanaPayUrl({
      recipient: DEFAULT_SPONSOR_WALLET,
      amount: 0.1,
      label: 'SORAI ESPORTS',
      message: '支持 SORAI',
    })

    expect(url).toBe(
      `solana:${DEFAULT_SPONSOR_WALLET}?amount=0.1&label=SORAI+ESPORTS&message=%E6%94%AF%E6%8C%81+SORAI`
    )
  })

  it('支援 USDC 轉帳並自動帶入 USDC Mint 地址', () => {
    const url = buildSolanaPayUrl({
      recipient: DEFAULT_SPONSOR_WALLET,
      amount: 25,
      token: 'USDC',
    })

    expect(url).toContain(`amount=25`)
    expect(url).toContain(`spl-token=${SOLANA_USDC_MINT}`)
  })

  it('過濾無效或負數金額', () => {
    const url1 = buildSolanaPayUrl({
      recipient: DEFAULT_SPONSOR_WALLET,
      amount: -5,
    })
    expect(url1).toBe(`solana:${DEFAULT_SPONSOR_WALLET}`)

    const url2 = buildSolanaPayUrl({
      recipient: DEFAULT_SPONSOR_WALLET,
      amount: 'invalid',
    })
    expect(url2).toBe(`solana:${DEFAULT_SPONSOR_WALLET}`)
  })
})

describe('formatAddress', () => {
  it('正常縮短長錢包地址', () => {
    expect(formatAddress(DEFAULT_SPONSOR_WALLET, 4)).toBe('HA3E...WWqy')
    expect(formatAddress(DEFAULT_SPONSOR_WALLET, 6)).toBe('HA3Eyy...GSWWqy')
  })

  it('處理空字串與短字串', () => {
    expect(formatAddress('')).toBe('')
    expect(formatAddress('abc')).toBe('abc')
  })
})
