import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  determineTournamentStatus,
  formatMatchDate,
  formatTournamentDate,
  getGameColor,
  matchScoresFromResults,
  mergeStageGroup,
} from './pandascore'
import type { PandaScoreTournament, TournamentEvent } from './pandascore'

// 這個檔只測純轉換，不碰 fetch。所有跟「現在幾點」有關的分支都用假時鐘釘死，
// 否則測試會在半夜跑的時候換一個答案。
const NOW = new Date('2026-08-24T12:00:00.000Z')

const HOUR = 60 * 60 * 1000
const DAY = 24 * HOUR
const from = (offsetMs: number) => new Date(NOW.getTime() + offsetMs).toISOString()

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(NOW)
})
afterEach(() => {
  vi.useRealTimers()
})

describe('getGameColor', () => {
  it.each([
    ['cs2', '#f59e0b'],
    ['valorant', '#ef4444'],
    ['lol', '#3b82f6'],
    ['r6', '#a855f7'],
  ])('%s', (game, color) => {
    expect(getGameColor(game)).toBe(color)
  })

  it('未知的遊戲回灰色，不是 undefined', () => {
    expect(getGameColor('dota2')).toBe('#6b7280')
    expect(getGameColor('')).toBe('#6b7280')
  })
})

describe('formatMatchDate', () => {
  it('沒有時間就是待定', () => {
    expect(formatMatchDate(null)).toBe('日期待定')
  })

  it('已經開始或正好現在 → 進行中', () => {
    expect(formatMatchDate(from(-HOUR))).toBe('進行中')
    expect(formatMatchDate(from(0))).toBe('進行中')
  })

  it('24 小時內用小時', () => {
    expect(formatMatchDate(from(1 * HOUR))).toBe('1 小時後')
    expect(formatMatchDate(from(23 * HOUR))).toBe('23 小時後')
  })

  it('小時是無條件進位，所以半小時也算 1 小時後', () => {
    expect(formatMatchDate(from(30 * 60 * 1000))).toBe('1 小時後')
  })

  it('滿 24 小時起改用天', () => {
    expect(formatMatchDate(from(24 * HOUR))).toBe('明天')
    expect(formatMatchDate(from(2 * DAY))).toBe('2 天後')
    expect(formatMatchDate(from(7 * DAY))).toBe('7 天後')
  })

  it('超過七天退回月日格式，不再是相對時間', () => {
    const out = formatMatchDate(from(30 * DAY))
    expect(out).not.toMatch(/後|明天|進行中/)
    expect(out).toMatch(/\d/)
  })

  // ⚠️ 現況測試，不是期望行為。壞掉的日期字串會讓 diff 全變成 NaN，
  // 一路掉到最後的 Intl.DateTimeFormat.format(Invalid Date) 丟 RangeError。
  // 呼叫端 MobileMatchBar 與 TournamentSidebar 都是 SSR 期間算的，
  // 所以 PandaScore 回一筆壞資料 = 整頁 render 失敗。
  // 修法是在 new Date() 之後補 Number.isNaN(d.getTime()) 的守衛。
  it('[已知缺陷] 不合法的日期字串會丟 RangeError', () => {
    expect(() => formatMatchDate('not-a-date')).toThrow(RangeError)
    expect(() => formatMatchDate('2026-13-45')).toThrow(RangeError)
    // 空字串是 falsy，被開頭的守衛擋下來了，所以只有「非空但無法解析」會炸
    expect(formatMatchDate('')).toBe('日期待定')
  })
})

describe('formatTournamentDate', () => {
  it('沒有開始時間就是待定', () => {
    expect(formatTournamentDate(null, null)).toBe('日期待定')
  })

  it('已開始 → 進行中', () => {
    expect(formatTournamentDate(from(-DAY), null)).toBe('進行中')
  })

  it('一週內用相對天數', () => {
    expect(formatTournamentDate(from(DAY), null)).toBe('明天')
    expect(formatTournamentDate(from(3 * DAY), null)).toBe('3 天後')
    expect(formatTournamentDate(from(7 * DAY), null)).toBe('7 天後')
  })

  // 記錄現況而不是主張它是對的：賽事層級只有「天」的解析度，
  // 所以一小時後開賽跟明天開賽會顯示成同一句話。
  it('沒有小時解析度，一小時後開賽也顯示「明天」', () => {
    expect(formatTournamentDate(from(HOUR), null)).toBe('明天')
  })

  it('超過七天退回月日格式', () => {
    const out = formatTournamentDate(from(60 * DAY), null)
    expect(out).not.toMatch(/後|明天|進行中/)
  })
})

describe('determineTournamentStatus', () => {
  const tournament = (over: Partial<PandaScoreTournament>): PandaScoreTournament =>
    ({ begin_at: null, end_at: null, matches: [], ...over }) as PandaScoreTournament
  const match = (status: string) => ({ status }) as PandaScoreTournament['matches'][number]

  it('有任何一場正在打就是 running，不管時間怎麼寫', () => {
    expect(
      determineTournamentStatus(
        tournament({
          begin_at: from(10 * DAY),
          end_at: from(20 * DAY),
          matches: [match('not_started'), match('running')],
        }),
      ),
    ).toBe('running')
  })

  it('還沒到開始時間 → upcoming', () => {
    expect(determineTournamentStatus(tournament({ begin_at: from(DAY) }))).toBe('upcoming')
  })

  it('沒有任何時間資訊 → upcoming', () => {
    expect(determineTournamentStatus(tournament({}))).toBe('upcoming')
  })

  it('已過結束時間且全部打完 → finished', () => {
    expect(
      determineTournamentStatus(
        tournament({
          begin_at: from(-10 * DAY),
          end_at: from(-DAY),
          matches: [match('finished'), match('finished')],
        }),
      ),
    ).toBe('finished')
  })

  // 這是這段邏輯真正在處理的事：官方時間過了但還有沒開打的場次，通常是延期。
  it('已過結束時間但還有未開打的場次 → 視為延期，維持 running', () => {
    expect(
      determineTournamentStatus(
        tournament({
          begin_at: from(-10 * DAY),
          end_at: from(-DAY),
          matches: [match('finished'), match('not_started')],
        }),
      ),
    ).toBe('running')
  })

  it('已開打、場次尚未全部結束 → running', () => {
    expect(
      determineTournamentStatus(
        tournament({
          begin_at: from(-DAY),
          end_at: from(DAY),
          matches: [match('finished'), match('not_started')],
        }),
      ),
    ).toBe('running')
  })

  it('已開打且全部 finished 或 canceled → finished', () => {
    expect(
      determineTournamentStatus(
        tournament({
          begin_at: from(-DAY),
          end_at: from(DAY),
          matches: [match('finished'), match('canceled')],
        }),
      ),
    ).toBe('finished')
  })

  it('已開打但賽程是空的、結束時間還沒到 → running（不能把 [].every 當全部打完）', () => {
    expect(
      determineTournamentStatus(
        tournament({ begin_at: from(-HOUR), end_at: from(DAY), matches: [] }),
      ),
    ).toBe('running')
  })

  it('已開打、沒有結束時間、賽程也是空的 → running', () => {
    expect(
      determineTournamentStatus(tournament({ begin_at: from(-HOUR), matches: [] })),
    ).toBe('running')
  })
})

describe('mergeStageGroup', () => {
  const event = (over: Partial<TournamentEvent>): TournamentEvent =>
    ({
      id: 1,
      game: 'cs2',
      gameName: 'CS2',
      tournamentName: 'Group A',
      serieName: 'Porto Fall 2026',
      leagueName: 'BLAST Open',
      leagueImage: null,
      beginAt: from(-10 * DAY),
      endAt: from(-DAY),
      status: 'finished',
      tier: 'a',
      matchCount: 12,
      runningMatches: 0,
      url: null,
      ...over,
    }) as TournamentEvent

  it('同系列的小組賽已完、決賽還在打 → 整場標 running', () => {
    const merged = mergeStageGroup([
      event({ id: 21714, tournamentName: 'Group A', status: 'finished', matchCount: 12 }),
      event({ id: 21715, tournamentName: 'Group B', status: 'finished', matchCount: 12 }),
      event({
        id: 21716,
        tournamentName: 'Playoffs',
        status: 'running',
        matchCount: 5,
        beginAt: from(-DAY),
        endAt: from(DAY),
      }),
    ])
    expect(merged.status).toBe('running')
    expect(merged.matchCount).toBe(29)
    expect(merged.beginAt).toBe(from(-10 * DAY))
    expect(merged.endAt).toBe(from(DAY))
  })

  it('小組打完、下一階段還沒開打 → 仍算進行中，不要整場變已完賽', () => {
    const merged = mergeStageGroup([
      event({ tournamentName: 'Group A', status: 'finished' }),
      event({
        id: 2,
        tournamentName: 'Playoffs',
        status: 'upcoming',
        matchCount: 4,
        beginAt: from(DAY),
        endAt: from(3 * DAY),
      }),
    ])
    expect(merged.status).toBe('running')
  })
})

describe('matchScoresFromResults', () => {
  it('依 team_id 對上對手，不照 results 陣列順序', () => {
    expect(
      matchScoresFromResults(
        [
          { team_id: 3455, score: 2 },
          { team_id: 124530, score: 1 },
        ],
        [124530, 3455],
      ),
    ).toEqual({ scoreA: 1, scoreB: 2 })
  })

  it('對不上 team_id 時退回 results[0]/[1]', () => {
    expect(
      matchScoresFromResults([{ score: 2 }, { score: 0 }], [1, 2]),
    ).toEqual({ scoreA: 2, scoreB: 0 })
  })
})
