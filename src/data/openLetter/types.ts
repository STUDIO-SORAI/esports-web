import type { PetitionLanguage } from '../../lib/petition'

/**
 * 公開信全文與連署表單文案。
 *
 * 四種語言各自是一份完整內容而不是逐句 key，因為譯文語氣本來就不會一對一
 * 對齊（英文、越南文、日文的段落切法不同），硬拆成句子只會讓譯文變形。
 */

export interface LetterSource {
  label: string
  href: string
}

export interface LetterParagraph {
  text: string
  /** 該段落引用的新聞、規章或社群貼文 */
  sources?: LetterSource[]
}

export interface LetterDemand {
  heading: string
  paragraphs: LetterParagraph[]
}

export interface LetterTldr {
  kicker: string
  title: string
  paragraphs: string[]
  bullets: string[]
}

export interface LetterChangelogEntry {
  /** 顯示用日期，例如 2026-11-14 */
  date: string
  items: string[]
}

export interface LetterChangelog {
  title: string
  entries: LetterChangelogEntry[]
}

export interface LetterUi {
  /** 語言切換列，例如「語言」 */
  languageLabel: string
  kicker: string
  title: string
  addressee: string
  publishedLabel: string
  publishedDate: string
  /** 連署人數後面的單位，例如「人已連署」 */
  countSuffix: string
  demandLabel: string
  signature: string
  /** 發起單位對內容負責的聲明，放在署名與 logo 旁邊 */
  initiatorNote: string
  readFullLetter: string
  sourcesLabel: string
  formTitle: string
  formDescription: string
  nameLabel: string
  namePlaceholder: string
  emailLabel: string
  emailPlaceholder: string
  emailNote: string
  regionLabel: string
  regionPlaceholder: string
  organizationLabel: string
  organizationPlaceholder: string
  messageLabel: string
  messagePlaceholder: string
  optional: string
  required: string
  charactersSuffix: string
  consentLabel: string
  submit: string
  submitting: string
  successTitle: string
  successBody: string
  errorTitle: string
  errors: {
    required: string
    'invalid-email': string
    'too-long': string
    duplicate: string
    'rate-limited': string
    server: string
    network: string
    consent: string
  }
  privacyNote: string
}

export interface LetterContent {
  /** <html lang> / hreflang 用的 BCP 47 代碼 */
  htmlLang: string
  /** 語言切換按鈕上的文字 */
  switchLabel: string
  tldr: LetterTldr
  intro: LetterParagraph[]
  demands: LetterDemand[]
  closing: string[]
  /** 公開更正紀錄，放在各語言版本正文底部 */
  changelog: LetterChangelog
  ui: LetterUi
}

export const PETITION_LANGUAGE_OPTIONS: { value: PetitionLanguage; label: string; htmlLang: string }[] = [
  { value: 'zh', label: '中文', htmlLang: 'zh-Hant-TW' },
  { value: 'en', label: 'English', htmlLang: 'en' },
  { value: 'vi', label: 'Tiếng Việt', htmlLang: 'vi' },
  { value: 'ja', label: '日本語', htmlLang: 'ja' },
]
