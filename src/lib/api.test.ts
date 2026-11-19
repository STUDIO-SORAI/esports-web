import { afterEach, describe, expect, it, vi } from 'vitest'

import { fetchTransfers } from './api'

function stubTransfersResponse(docs: unknown[]) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({ ok: true, json: async () => ({ docs }) })),
  )
}

function teamDoc(slug: string, extra: Record<string, unknown> = {}) {
  return {
    id: slug,
    name: slug.toUpperCase(),
    slug,
    game: 'valorant',
    region: 'pacific',
    order: 0,
    players: [],
    ...extra,
  }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('fetchTransfers', () => {
  it('不把「不在名冊頁顯示」的自由市場虛擬隊列進名冊', async () => {
    stubTransfersResponse([
      teamDoc('sentinels'),
      teamDoc('free-agency', { hiddenFromRoster: true }),
    ])

    const teams = await fetchTransfers('valorant')

    expect(teams.map((t) => t.slug)).toEqual(['sentinels'])
  })

  // 既有 54 筆隊伍在新欄位回填前後分別長成 undefined 與 false，
  // 兩種都必須照常列出 —— 弄錯這裡會讓整個名冊頁變空。
  it('沒有這個欄位或明確標記為顯示的隊伍照常列出', async () => {
    stubTransfersResponse([teamDoc('fnatic'), teamDoc('paper-rex', { hiddenFromRoster: false })])

    const teams = await fetchTransfers('valorant')

    expect(teams.map((t) => t.slug)).toEqual(['fnatic', 'paper-rex'])
  })
})
