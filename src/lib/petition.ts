/**
 * 公開信連署的表單模型與驗證。
 *
 * 前後端共用同一支驗證（Astro API route 也會呼叫），避免「前端檢查過了、
 * 後端照單全收」的落差。回傳的是錯誤代碼而不是文案，翻譯由畫面層負責，
 * 所以同一套規則可以服務四種語言的介面。
 */

export const PETITION_LANGUAGES = ['zh', 'en', 'vi', 'ja'] as const

export type PetitionLanguage = (typeof PETITION_LANGUAGES)[number]

export const DEFAULT_PETITION_LANGUAGE: PetitionLanguage = 'zh'

export const SIGNATURE_LIMITS = {
  name: 80,
  email: 200,
  region: 80,
  organization: 120,
  message: 500,
} as const

export type SignatureField = 'name' | 'email' | 'region' | 'organization' | 'message'

export type SignatureIssue = 'required' | 'invalid-email' | 'too-long'

export interface SignatureDraft {
  name?: unknown
  email?: unknown
  region?: unknown
  organization?: unknown
  message?: unknown
  language?: unknown
}

export interface Signature {
  name: string
  email: string
  region: string
  organization: string
  message: string
  language: PetitionLanguage
}

export type SignatureValidation =
  | { ok: true; signature: Signature }
  | { ok: false; issues: Partial<Record<SignatureField, SignatureIssue>> }

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function isPetitionLanguage(value: unknown): value is PetitionLanguage {
  return typeof value === 'string' && (PETITION_LANGUAGES as readonly string[]).includes(value)
}

/** 表單上一律送出字串；其他型別（null、number、陣列、物件）一律當成沒填。 */
function readText(value: unknown, max: number): { value: string; issue?: SignatureIssue } {
  if (typeof value !== 'string') return { value: '' }
  const text = value.trim()
  if (text.length > max) return { value: text, issue: 'too-long' }
  return { value: text }
}

export function validateSignature(raw: SignatureDraft | null | undefined): SignatureValidation {
  const draft: SignatureDraft = raw && typeof raw === 'object' ? raw : {}
  const issues: Partial<Record<SignatureField, SignatureIssue>> = {}

  const name = readText(draft.name, SIGNATURE_LIMITS.name)
  if (name.issue) {
    issues.name = name.issue
  } else if (!name.value) {
    issues.name = 'required'
  }

  const email = readText(draft.email, SIGNATURE_LIMITS.email)
  if (email.issue) {
    issues.email = email.issue
  } else if (!email.value) {
    issues.email = 'required'
  } else if (!EMAIL_PATTERN.test(email.value)) {
    issues.email = 'invalid-email'
  }
  const region = readText(draft.region, SIGNATURE_LIMITS.region)
  if (region.issue) issues.region = region.issue

  const organization = readText(draft.organization, SIGNATURE_LIMITS.organization)
  if (organization.issue) issues.organization = organization.issue

  const message = readText(draft.message, SIGNATURE_LIMITS.message)
  if (message.issue) issues.message = message.issue

  if (Object.keys(issues).length > 0) return { ok: false, issues }

  return {
    ok: true,
    signature: {
      name: name.value,
      // email 一律小寫儲存，避免大小寫不同被當成不同連署人
      email: email.value.toLowerCase(),
      region: region.value,
      organization: organization.value,
      message: message.value,
      language: isPetitionLanguage(draft.language) ? draft.language : DEFAULT_PETITION_LANGUAGE,
    },
  }
}
