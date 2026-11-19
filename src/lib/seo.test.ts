import { describe, expect, it } from 'vitest'
import {
  splitShareTitleLines,
  toPlainShareTitle,
  requestOrigin,
  siteOrigin,
  briefArticleJsonLd,
} from './seo'
import type { Brief } from './types'

describe('splitShareTitleLines', () => {
  it("splits on '&'", () => {
    expect(splitShareTitleLines('A&B')).toEqual(['A', 'B'])
  })

  it("'&&' is a literal '&'", () => {
    expect(splitShareTitleLines('A&&B')).toEqual(['A&B'])
  })

  it('splits on newlines', () => {
    expect(splitShareTitleLines('A\nB')).toEqual(['A', 'B'])
    expect(splitShareTitleLines('A\r\nB')).toEqual(['A', 'B'])
  })

  it('strips ~~highlight~~', () => {
    expect(splitShareTitleLines('~~X~~&Y')).toEqual(['X', 'Y'])
  })

  it('homepage CR title becomes two lines without &', () => {
    expect(
      splitShareTitleLines(
        '日本戰隊 CRAZY RACCOON「贊助商歸零」&背後的娛樂帝國與日本電競的不可複製性'
      )
    ).toEqual([
      '日本戰隊 CRAZY RACCOON「贊助商歸零」',
      '背後的娛樂帝國與日本電競的不可複製性',
    ])
  })

  it('drops empty segments and trims', () => {
    expect(splitShareTitleLines('')).toEqual([])
    expect(splitShareTitleLines('   ')).toEqual([])
    expect(splitShareTitleLines('A&  &B')).toEqual(['A', 'B'])
  })
})

describe('toPlainShareTitle', () => {
  it("'A&B' -> 'A B'", () => {
    expect(toPlainShareTitle('A&B')).toBe('A B')
  })

  it("'A&&B' -> 'A&B'", () => {
    expect(toPlainShareTitle('A&&B')).toBe('A&B')
  })

  it("'~~X~~&Y' -> 'X Y'", () => {
    expect(toPlainShareTitle('~~X~~&Y')).toBe('X Y')
  })

  it('joins split lines and collapses whitespace', () => {
    expect(toPlainShareTitle('A  &  B')).toBe('A B')
    expect(toPlainShareTitle('A\n\nB')).toBe('A B')
  })
})

describe('requestOrigin and siteOrigin', () => {
  it('handles requestOrigin with fallback URL object', () => {
    const req = new Request('http://localhost:4321/test')
    const fallback = new URL('http://localhost:4321/test')
    expect(requestOrigin(req, fallback)).toBe('http://localhost:4321')
  })

  it('handles requestOrigin when fallbackUrl is omitted', () => {
    const req = new Request('http://127.0.0.1:4321/category/valorant')
    expect(requestOrigin(req)).toBe('http://127.0.0.1:4321')
  })

  it('handles x-forwarded-proto header', () => {
    const req = new Request('http://example.com/page', {
      headers: { 'x-forwarded-proto': 'https' },
    })
    expect(requestOrigin(req)).toBe('https://example.com')
  })

  it('siteOrigin does not throw when fallbackUrl is undefined', () => {
    const req = new Request('http://localhost:4321/category/lol')
    expect(() => siteOrigin(req)).not.toThrow()
    expect(siteOrigin(req)).toBeTruthy()
  })
})

describe('briefArticleJsonLd', () => {
  it('generates valid schema.org NewsArticle for a brief', () => {
    const brief: Brief = {
      id: '1',
      slug: 't1-defeats-geng',
      title: 'T1 3-2 擊敗 Gen.G 晉級決賽',
      body: '在今日剛結束的比賽中，T1 激戰五局獲勝。',
      image: '/media/test.jpg',
      category: '英雄聯盟',
      categorySlug: 'lol',
      tags: ['T1', 'LCK'],
      authorIds: ['author1'],
      authorNames: ['SORAI 編輯部'],
      authorImages: [],
      publishedAt: '2026-11-03T10:00:00.000Z',
    }

    const jsonLd = briefArticleJsonLd({
      origin: 'https://sorai.tw',
      brief,
      url: 'https://sorai.tw/brief/t1-defeats-geng',
      image: 'https://sorai.tw/media/test.jpg',
      description: '在今日剛結束的比賽中，T1 激戰五局獲勝。',
    })

    expect(jsonLd['@context']).toBe('https://schema.org')
    expect(jsonLd['@type']).toBe('NewsArticle')
    expect(jsonLd.headline).toBe('T1 3-2 擊敗 Gen.G 晉級決賽')
    expect(jsonLd.description).toBe('在今日剛結束的比賽中，T1 激戰五局獲勝。')
    expect(jsonLd.mainEntityOfPage['@id']).toBe('https://sorai.tw/brief/t1-defeats-geng')
    expect(jsonLd.author[0].name).toBe('SORAI 編輯部')
    expect(jsonLd.articleSection).toBe('英雄聯盟')
    expect(jsonLd.datePublished).toBe('2026-11-03T10:00:00.000Z')
  })
})
