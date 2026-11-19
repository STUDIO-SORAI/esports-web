import { describe, it, expect } from 'vitest'
import { validateSponsorKyc } from './sponsorKyc'

describe('validateSponsorKyc', () => {
  it('缺少 Email 時回傳錯誤', () => {
    const res = validateSponsorKyc({
      email: '',
      currency: 'SOL',
      legalConfirmed: true,
    })
    expect(res.valid).toBe(false)
    expect(res.error).toContain('請輸入電子信箱')
  })

  it('無效 Email 格式時回傳錯誤', () => {
    const res = validateSponsorKyc({
      email: 'invalid-email',
      currency: 'SOL',
      legalConfirmed: true,
    })
    expect(res.valid).toBe(false)
    expect(res.error).toContain('格式')
  })

  it('未勾選合法聲明時回傳錯誤', () => {
    const res = validateSponsorKyc({
      email: 'test@example.com',
      currency: 'SOL',
      legalConfirmed: false,
    })
    expect(res.valid).toBe(false)
    expect(res.error).toContain('聲明')
  })

  it('驗證通過並產生 SORAI- 開頭之 sponsorId', () => {
    const res = validateSponsorKyc({
      email: 'donor@sorai.tw',
      contact: 'Discord: donor#1234',
      currency: 'USDC',
      amount: 25,
      legalConfirmed: true,
    })
    expect(res.valid).toBe(true)
    expect(res.sponsorId).toMatch(/^SORAI-[A-F0-9]{8}$/)
  })
})
