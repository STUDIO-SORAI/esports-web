import { describe, expect, it } from 'vitest'
import { splitShareTitleLines, toPlainShareTitle } from './seo'

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
