import { randomBytes } from 'crypto'

export interface SponsorKycInput {
  email: string
  contact?: string
  currency: 'SOL' | 'USDC'
  amount?: number | null
  legalConfirmed: boolean
}

export interface SponsorKycResult {
  valid: boolean
  error?: string
  sponsorId?: string
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * 簡易贊助者聯絡資訊審核（防黑錢/輕量 KYC 認證）
 */
export function validateSponsorKyc(input: SponsorKycInput): SponsorKycResult {
  const email = (input.email || '').trim()

  if (!email) {
    return { valid: false, error: '請輸入電子信箱，以利留存聯絡備查紀錄' }
  }

  if (!EMAIL_REGEX.test(email) || email.length > 254) {
    return { valid: false, error: '請輸入有效的電子信箱格式' }
  }

  if (!input.legalConfirmed) {
    return { valid: false, error: '請勾選資金來源正常合法聲明' }
  }

  // 產生 8 碼唯一追蹤序號，供 Solana Pay Memo 鏈上對帳
  const hex = randomBytes(4).toString('hex').toUpperCase()
  const sponsorId = `SORAI-${hex}`

  return {
    valid: true,
    sponsorId,
  }
}
