import { describe, expect, it } from 'vitest'

import { OPEN_LETTER } from './index'

const LCP_RULES = 'https://cdn.sanity.io/files/dsfx7636/news_live/3fbf7c285d72ce06f7b10888278eb52fd9f06877.pdf'
const PROMOTION_RULES = 'https://cdn.sanity.io/files/dsfx7636/news_live/443a65d616d58bbe9189b47e83eb505b61eb6122.pdf'
const RETIRED_RULES = '137455865da54f3986483b0382c22206d5dea63b'

/** 正文（不含更新日誌）。日誌本身會提到舊條號與被刪除的說法。 */
function bodyText(language: keyof typeof OPEN_LETTER) {
  const letter = OPEN_LETTER[language]
  return JSON.stringify({
    tldr: letter.tldr,
    intro: letter.intro,
    demands: letter.demands,
    closing: letter.closing,
  })
}

describe('open letter fact-check corrections', () => {
  it('cites the July 2026 rule numbers and keeps the international articles', () => {
    for (const language of Object.keys(OPEN_LETTER) as (keyof typeof OPEN_LETTER)[]) {
      const body = bodyText(language)
      expect(body, language).toContain('7.1.11')
      expect(body, language).toContain('7.3.6')
      expect(body, language).toContain('7.5.3')
      expect(body, language).toContain('7.5.4')
      expect(body, language).toContain('5.2.13')
      expect(body, language).toContain('5.3.10')
      expect(body, language).toContain('v20260707')
      expect(body, language).toContain('v20261021')
      expect(body, language).toContain('00:01:25')
      expect(body, language).not.toContain('7.1.3')
      expect(body, language).not.toContain('7.4.6')
      expect(body, language).not.toContain('7.6.3')
      expect(body, language).not.toContain('7.6.4')
      expect(body, language).not.toContain(RETIRED_RULES)
    }
  })

  it('links the current LCP rulebook and the promotion ruleset from demand 01', () => {
    for (const letter of Object.values(OPEN_LETTER)) {
      const hrefs = letter.demands[0].paragraphs.flatMap((paragraph) => paragraph.sources?.map((source) => source.href) ?? [])
      expect(hrefs).toContain(LCP_RULES)
      expect(hrefs).toContain(PROMOTION_RULES)
    }
  })

  it('keeps six demands and publishes a 2026-11-14 changelog', () => {
    for (const letter of Object.values(OPEN_LETTER)) {
      expect(letter.demands).toHaveLength(6)
      expect(letter.tldr.bullets).toHaveLength(6)
      expect(letter.changelog.entries).toHaveLength(1)
      expect(letter.changelog.entries[0].date).toBe('2026-11-14')
      expect(letter.changelog.entries[0].items).toHaveLength(7)
    }
  })
})
