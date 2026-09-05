import { describe, expect, it } from 'vitest'
import {
  mapPayloadDocToBrief,
  formatDateTime,
  formatFeedTime,
  filterBriefsByCategories,
  toggleFeedCategory,
  feedFilterHref,
} from './api'

describe('mapPayloadDocToBrief', () => {
  it('maps populated image, category, authors, tags', () => {
    const brief = mapPayloadDocToBrief({
      id: 9,
      title: '~~Sentinels~~ 拿下 VCT',
      body: '短訊正文',
      slug: 'sentinels-vct',
      source: 'discord',
      publishedAt: '2026-09-03T10:00:00.000Z',
      updatedAt: '2026-09-03T10:01:00.000Z',
      image: {
        url: '/media/card.png',
        width: 2000,
        height: 2500,
        sizes: {
          hero: { url: '/media/card-hero.png', width: 1600, height: 900 },
          full: { url: '/media/card-full.png', width: 1600, height: 2000 },
        },
      },
      category: { name: '特戰英豪', slug: 'valorant' },
      tags: [{ name: 'VCT' }, { name: 'Sentinels' }],
      authors: [
        { id: 3, name: 'Alex', avatar: { url: '/media/alex.jpg' } },
        { id: 4, name: 'Bax' },
      ],
    })

    expect(brief.id).toBe('9')
    expect(brief.slug).toBe('sentinels-vct')
    expect(brief.title).toBe('Sentinels 拿下 VCT')
    expect(brief.body).toBe('短訊正文')
    // hero 是 1600x900 的置中裁切，直向圖丟進去會被切掉，所以要挑不裁切的 full
    expect(brief.image).toBe('/media/card-full.png')
    expect(brief.imageWidth).toBe(1600)
    expect(brief.imageHeight).toBe(2000)
    expect(brief.category).toBe('特戰英豪')
    expect(brief.categorySlug).toBe('valorant')
    expect(brief.tags).toEqual(['VCT', 'Sentinels'])
    expect(brief.authorIds).toEqual(['3', '4'])
    expect(brief.authorNames).toEqual(['Alex', 'Bax'])
    expect(brief.authorImages).toEqual(['/media/alex.jpg', ''])
    expect(brief.source).toBe('discord')
  })

  it('falls back to the original when sizes.full is missing', () => {
    const brief = mapPayloadDocToBrief({
      id: 1,
      title: 'A',
      slug: 'a',
      image: { url: 'https://cms.sorai.tw/media/x.jpg' },
      authors: [],
    })
    expect(brief.image).toBe('https://cms.sorai.tw/media/x.jpg')
  })

  it('does not treat numeric image id as a url', () => {
    const brief = mapPayloadDocToBrief({
      id: 1,
      title: 'A',
      slug: 'a',
      image: 12,
      authors: 7,
    })
    expect(brief.image).toBe('')
    expect(brief.authorIds).toEqual(['7'])
    expect(brief.authorNames).toEqual([])
    expect(brief.authorImages).toEqual([])
  })

  it('uses empty body when missing rather than inventing html', () => {
    const brief = mapPayloadDocToBrief({ id: 1, title: 'T', slug: 't' })
    expect(brief.body).toBe('')
    expect(brief.tags).toEqual([])
  })
})

describe('formatDateTime', () => {
  it('returns empty string for missing or invalid dates', () => {
    expect(formatDateTime(undefined)).toBe('')
    expect(formatDateTime('')).toBe('')
    expect(formatDateTime('not-a-date')).toBe('')
  })

  it('returns a non-empty Taipei datetime for a valid ISO string', () => {
    const text = formatDateTime('2026-09-03T04:05:00.000Z')
    expect(text.length).toBeGreaterThan(0)
    expect(text).toMatch(/2026/)
    expect(text).toMatch(/12/)
  })
})

describe('formatFeedTime', () => {
  const now = Date.parse('2026-09-03T12:00:00.000Z')

  it('returns empty for missing or invalid', () => {
    expect(formatFeedTime(undefined, now)).toBe('')
    expect(formatFeedTime('nope', now)).toBe('')
  })

  it('uses relative units under a week', () => {
    expect(formatFeedTime('2026-09-03T11:59:30.000Z', now)).toBe('剛剛')
    expect(formatFeedTime('2026-09-03T11:55:00.000Z', now)).toBe('5分鐘')
    expect(formatFeedTime('2026-09-03T07:00:00.000Z', now)).toBe('5小時')
    expect(formatFeedTime('2026-09-01T12:00:00.000Z', now)).toBe('2天')
  })
})

describe('filterBriefsByCategories', () => {
  const sample = [
    mapPayloadDocToBrief({ id: 1, title: 'A', slug: 'a', category: { name: '特戰英豪', slug: 'valorant' } }),
    mapPayloadDocToBrief({ id: 2, title: 'B', slug: 'b', category: { name: '虹彩六號', slug: 'r6' } }),
    mapPayloadDocToBrief({ id: 3, title: 'C', slug: 'c', category: { name: '英雄聯盟', slug: 'lol' } }),
  ]

  it('returns all when nothing selected', () => {
    expect(filterBriefsByCategories(sample, []).map((b) => b.slug)).toEqual(['a', 'b', 'c'])
  })

  it('keeps matching slugs when several games are selected', () => {
    expect(filterBriefsByCategories(sample, ['valorant', 'lol']).map((b) => b.slug)).toEqual(['a', 'c'])
  })

  it('matches category name when the stored slug differs from the nav slug', () => {
    const messy = [
      mapPayloadDocToBrief({
        id: 9,
        title: 'X',
        slug: 'x',
        category: { name: '特戰英豪', slug: 'test' },
      }),
    ]
    expect(
      filterBriefsByCategories(messy, ['valorant'], [{ name: '特戰英豪', slug: 'valorant' }]).map(
        (b) => b.slug
      )
    ).toEqual(['x'])
  })

  it('toggle adds and removes without touching the others', () => {
    expect(toggleFeedCategory(['valorant'], 'r6')).toEqual(['valorant', 'r6'])
    expect(toggleFeedCategory(['valorant', 'r6'], 'valorant')).toEqual(['r6'])
    expect(feedFilterHref([])).toBe('/feed')
    expect(feedFilterHref(['valorant', 'r6'])).toBe('/feed?c=valorant&c=r6')
  })
})

describe('mapPayloadDocToBrief image sizing', () => {
  it('prefers the original over cropped derivatives when full is absent', () => {
    // full 是後來才加的尺寸，早期上傳的媒體沒有。這時原圖比 hero 好——
    // 原圖保有真實比例，hero 已經被裁成 16:9。
    const brief = mapPayloadDocToBrief({
      id: 2,
      title: 'B',
      slug: 'b',
      image: {
        url: '/media/tall.png',
        width: 1080,
        height: 1920,
        sizes: { hero: { url: '/media/tall-hero.png', width: 1600, height: 900 } },
      },
      authors: [],
    })
    expect(brief.image).toBe('/media/tall.png')
    expect(brief.imageWidth).toBe(1080)
    expect(brief.imageHeight).toBe(1920)
  })

  it('still resolves a url when only cropped derivatives exist', () => {
    const brief = mapPayloadDocToBrief({
      id: 3,
      title: 'C',
      slug: 'c',
      image: { sizes: { card: { url: '/media/only-card.png', width: 768, height: 512 } } },
      authors: [],
    })
    expect(brief.image).toBe('/media/only-card.png')
    expect(brief.imageWidth).toBe(768)
  })

  it('reports zero dimensions when the upload carries none', () => {
    const brief = mapPayloadDocToBrief({
      id: 4,
      title: 'D',
      slug: 'd',
      image: { url: '/media/no-dims.png' },
      authors: [],
    })
    expect(brief.image).toBe('/media/no-dims.png')
    expect(brief.imageWidth).toBe(0)
    expect(brief.imageHeight).toBe(0)
  })

  it('leaves image empty when there is no upload', () => {
    const brief = mapPayloadDocToBrief({ id: 5, title: 'E', slug: 'e', authors: [] })
    expect(brief.image).toBe('')
    expect(brief.imageWidth).toBe(0)
  })
})
