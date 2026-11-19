import { describe, expect, it } from 'vitest'
import { parseOpenLetterLogos, sanitizeLogoLink } from './openLetterLogos'

describe('sanitizeLogoLink', () => {
  it('allows https, http, and root-relative paths', () => {
    expect(sanitizeLogoLink('https://sorai.tw')).toBe('https://sorai.tw')
    expect(sanitizeLogoLink('http://example.com/a')).toBe('http://example.com/a')
    expect(sanitizeLogoLink('/about')).toBe('/about')
  })

  it('rejects unsafe or empty links', () => {
    expect(sanitizeLogoLink('javascript:alert(1)')).toBeUndefined()
    expect(sanitizeLogoLink('data:text/html,hi')).toBeUndefined()
    expect(sanitizeLogoLink('   ')).toBeUndefined()
    expect(sanitizeLogoLink(null)).toBeUndefined()
  })
})

describe('parseOpenLetterLogos', () => {
  const resolveAsset = (p?: string | null) => (p ? `https://cms.test${p}` : '')

  it('filters hidden/invalid entries, sorts by order, and prefers uploaded media over logoUrl', () => {
    const docs = [
      {
        id: 2,
        name: 'Partner B',
        logo: { url: '/media/b.png' },
        logoUrl: 'https://ignored.example/b.png',
        url: 'https://partner-b.example',
        order: 20,
        visible: true,
        themeMode: 'white',
      },
      {
        id: 3,
        name: 'Hidden Partner',
        logo: { url: '/media/hidden.png' },
        order: 1,
        visible: false,
      },
      {
        id: 1,
        name: 'Partner A',
        logo: null,
        logoUrl: 'https://cdn.example/a.svg',
        url: 'javascript:alert(1)',
        order: 5,
        visible: true,
        themeMode: 'dark',
      },
      {
        id: 4,
        name: 'No Image',
        logo: null,
        logoUrl: '',
        visible: true,
      },
    ]

    const result = parseOpenLetterLogos(docs, resolveAsset)
    expect(result).toEqual([
      {
        id: '1',
        name: 'Partner A',
        src: 'https://cdn.example/a.svg',
        href: undefined,
        themeMode: 'dark',
        order: 5,
      },
      {
        id: '2',
        name: 'Partner B',
        src: 'https://cms.test/media/b.png',
        href: 'https://partner-b.example',
        themeMode: 'white',
        order: 20,
      },
    ])
  })

  it('returns empty array for non-array input', () => {
    expect(parseOpenLetterLogos(null)).toEqual([])
    expect(parseOpenLetterLogos({})).toEqual([])
  })
})
