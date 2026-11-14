import { describe, expect, it } from 'vitest'

import {
  DEFAULT_PETITION_LANGUAGE,
  PETITION_LANGUAGES,
  SIGNATURE_LIMITS,
  isPetitionLanguage,
  validateSignature,
} from './petition'

function expectIssues(result: ReturnType<typeof validateSignature>) {
  if (result.ok) throw new Error('預期驗證失敗，實際卻通過了')
  return result.issues
}

describe('isPetitionLanguage', () => {
  it('只接受四種支援的語言代碼', () => {
    for (const code of PETITION_LANGUAGES) expect(isPetitionLanguage(code)).toBe(true)
    expect(isPetitionLanguage('zh-TW')).toBe(false)
    expect(isPetitionLanguage('')).toBe(false)
    expect(isPetitionLanguage(undefined)).toBe(false)
    expect(isPetitionLanguage(1)).toBe(false)
  })
})

describe('validateSignature', () => {
  it('必填欄位沒填就擋下來，並且一次回報所有缺漏', () => {
    const issues = expectIssues(validateSignature({}))
    expect(issues.name).toBe('required')
    expect(issues.email).toBe('required')
    // 選填欄位不該被標記
    expect(issues.region).toBeUndefined()
    expect(issues.message).toBeUndefined()
  })

  it('空白字串不算填寫', () => {
    const issues = expectIssues(validateSignature({ name: '   ', email: ' \n ' }))
    expect(issues.name).toBe('required')
    expect(issues.email).toBe('required')
  })

  it('email 格式錯誤要擋下來', () => {
    for (const email of ['not-an-email', 'a@b', 'a b@c.com', '@example.com', 'user@.com']) {
      const issues = expectIssues(validateSignature({ name: '小明', email }))
      expect(issues.email, email).toBe('invalid-email')
    }
  })

  it('正常輸入會去除前後空白並把 email 轉小寫', () => {
    const result = validateSignature({
      name: '  小明  ',
      email: '  Signer@Example.COM ',
      region: ' 台灣 ',
      organization: ' SORAI ',
      message: '  請正視亞太賽區  ',
      language: 'vi',
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.signature).toEqual({
      name: '小明',
      email: 'signer@example.com',
      region: '台灣',
      organization: 'SORAI',
      message: '請正視亞太賽區',
      language: 'vi',
    })
  })

  it('選填欄位沒填時會是空字串，而不是 undefined', () => {
    const result = validateSignature({ name: 'A', email: 'a@b.co' })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.signature.region).toBe('')
    expect(result.signature.organization).toBe('')
    expect(result.signature.message).toBe('')
  })

  it('超過長度上限要擋下來，邊界值則要放行', () => {
    const tooLong = expectIssues(
      validateSignature({
        name: '名'.repeat(SIGNATURE_LIMITS.name + 1),
        email: 'a@b.co',
      })
    )
    expect(tooLong.name).toBe('too-long')

    const atLimit = validateSignature({
      name: '名'.repeat(SIGNATURE_LIMITS.name),
      email: 'a@b.co',
      message: '字'.repeat(SIGNATURE_LIMITS.message),
    })
    expect(atLimit.ok).toBe(true)
  })

  it('留言過長也要擋下來（500 字上限）', () => {
    const issues = expectIssues(
      validateSignature({
        name: 'A',
        email: 'a@b.co',
        message: 'x'.repeat(SIGNATURE_LIMITS.message + 1),
      })
    )
    expect(issues.message).toBe('too-long')
  })

  it('未知語言退回預設語言，不會因此擋掉連署', () => {
    const result = validateSignature({ name: 'A', email: 'a@b.co', language: 'fr' })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.signature.language).toBe(DEFAULT_PETITION_LANGUAGE)
  })

  it('非字串的惡意輸入不會爆掉，也不會被當成有效內容', () => {
    const result = validateSignature({
      name: { toString: () => '物件' },
      email: ['a@b.co'],
      language: 123,
    })
    expect(expectIssues(result).name).toBe('required')
    expect(expectIssues(result).email).toBe('required')
  })

  it('null 或 undefined 一律視為空表單', () => {
    expect(expectIssues(validateSignature(null)).name).toBe('required')
    expect(expectIssues(validateSignature(undefined)).email).toBe('required')
  })
})
