import { describe, expect, it } from 'vitest'
import React from 'react'
import { renderToString } from 'react-dom/server'
import { OpenLetterBanner, OPEN_LETTER_BANNER_COPY } from './OpenLetterBanner'
import { PETITION_LANGUAGES } from '@/lib/petition'

describe('OpenLetterBanner', () => {
  it('renders Chinese default with all four language options and direct signup links', () => {
    const html = renderToString(React.createElement(OpenLetterBanner, { initialCount: 1280 }))

    expect(html).toContain(OPEN_LETTER_BANNER_COPY.zh.title)
    expect(html).toContain(OPEN_LETTER_BANNER_COPY.zh.signCta)
    expect(html).toContain(OPEN_LETTER_BANNER_COPY.zh.readCta)
    expect(html).toContain('1,280')
    expect(html).toContain('人已連署')

    // Four language tabs in SegmentedControl
    expect(html).toContain('中文')
    expect(html).toContain('English')
    expect(html).toContain('Tiếng Việt')
    expect(html).toContain('日本語')

    // Direct signup anchors for all four languages
    for (const lang of PETITION_LANGUAGES) {
      expect(html).toContain(`/openletter?lang=${lang}#sign`)
      expect(html).toContain(OPEN_LETTER_BANNER_COPY[lang].quickSignLabel)
    }
  })

  it.each([
    ['en', 'people have signed', '/openletter?lang=en#sign', '/openletter?lang=en'],
    ['vi', 'người đã ký tên', '/openletter?lang=vi#sign', '/openletter?lang=vi'],
    ['ja', '人が署名しました', '/openletter?lang=ja#sign', '/openletter?lang=ja'],
  ] as const)(
    'renders %s copy and links when initialLanguage is %s',
    (lang, countSuffix, signHref, letterHref) => {
      const html = renderToString(
        React.createElement(OpenLetterBanner, { initialLanguage: lang, initialCount: 42 }),
      )
      const copy = OPEN_LETTER_BANNER_COPY[lang]

      expect(html).toContain(copy.kicker)
      expect(html).toContain(copy.title)
      expect(html).toContain(copy.signCta)
      expect(html).toContain(copy.readCta)
      expect(html).toContain(countSuffix)
      expect(html).toContain('42')
      expect(html).toContain(`href="${signHref}"`)
      expect(html).toContain(`href="${letterHref}"`)
    },
  )

  it('hides signature count badge when initialCount is null or zero', () => {
    const nullHtml = renderToString(React.createElement(OpenLetterBanner, { initialCount: null }))
    expect(nullHtml).not.toContain('人已連署')

    const zeroHtml = renderToString(React.createElement(OpenLetterBanner, { initialCount: 0 }))
    expect(zeroHtml).not.toContain('人已連署')
  })

  it('keeps copy free of emojis across all four languages', () => {
    const emojiPattern = /\p{Extended_Pictographic}/u
    for (const lang of PETITION_LANGUAGES) {
      const copy = OPEN_LETTER_BANNER_COPY[lang]
      for (const value of Object.values(copy)) {
        expect(emojiPattern.test(value)).toBe(false)
      }
    }
  })
})
