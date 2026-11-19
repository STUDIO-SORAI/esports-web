import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  __resetSponsorStatsCacheForTest,
  DEFAULT_MONTHLY_TARGET_TWD,
  extractIncomingFromTx,
  fetchMonthlySponsorStats,
  getTaipeiMonthRange,
  resolveMonthlyTargetTwd,
  resolveWalletAddress,
} from './sponsorStats'
import { DEFAULT_SPONSOR_WALLET, SOLANA_USDC_MINT } from './solanaPay'

describe('getTaipeiMonthRange', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('依台灣時間換月而非 UTC（2026-11-30T16:30:00Z 為台北 12 月 1 日）', () => {
    vi.setSystemTime(new Date('2026-11-30T16:30:00.000Z'))
    const range = getTaipeiMonthRange()
    expect(range.yearMonth).toBe('2026-12')
    expect(range.startUnix).toBe(Math.floor(Date.parse('2026-12-01T00:00:00+08:00') / 1000))
    expect(range.endUnix).toBe(Math.floor(Date.parse('2027-01-01T00:00:00+08:00') / 1000))
  })

  it('跨年前一刻仍落在 12 月區間內', () => {
    const now = new Date('2026-12-31T23:59:59+08:00')
    const range = getTaipeiMonthRange(now)
    expect(range.yearMonth).toBe('2026-12')
    expect(Math.floor(now.getTime() / 1000)).toBeGreaterThanOrEqual(range.startUnix)
    expect(Math.floor(now.getTime() / 1000)).toBeLessThan(range.endUnix)
  })
})

describe('resolveMonthlyTargetTwd & resolveWalletAddress', () => {
  it('依序採用 CMS > 環境變數 > 預設 500，並過濾無效數值', () => {
    expect(resolveMonthlyTargetTwd(1200, '800')).toBe(1200)
    expect(resolveMonthlyTargetTwd(0, '800')).toBe(800)
    expect(resolveMonthlyTargetTwd(-100, '800')).toBe(800)
    expect(resolveMonthlyTargetTwd(undefined, '900')).toBe(900)
    expect(resolveMonthlyTargetTwd('', '')).toBe(DEFAULT_MONTHLY_TARGET_TWD)
    expect(resolveMonthlyTargetTwd(NaN, 'abc')).toBe(DEFAULT_MONTHLY_TARGET_TWD)
  })

  it('錢包位址依序採用 CMS > 環境變數 > DEFAULT_SPONSOR_WALLET', () => {
    expect(resolveWalletAddress('  CmsWallet111  ', 'EnvWallet222')).toBe('CmsWallet111')
    expect(resolveWalletAddress('', 'EnvWallet222')).toBe('EnvWallet222')
    expect(resolveWalletAddress(undefined, '   ')).toBe(DEFAULT_SPONSOR_WALLET)
  })
})

describe('extractIncomingFromTx', () => {
  const wallet = DEFAULT_SPONSOR_WALLET

  it('正確計算原生 SOL 轉入（支援物件與字串型態 accountKeys）', () => {
    const tx = {
      meta: {
        err: null,
        preBalances: [2_000_000_000, 100_000_000],
        postBalances: [1_899_995_000, 200_000_000],
      },
      transaction: {
        message: {
          accountKeys: [{ pubkey: 'Sender111' }, { pubkey: wallet }],
        },
      },
    }
    const res = extractIncomingFromTx(tx, wallet)
    expect(res.sol).toBeCloseTo(0.1, 9)
    expect(res.usdc).toBe(0)
  })

  it('正確計算 USDC 轉入，即使收款 ATA 原本沒有餘額紀錄（首次收款建 ATA）', () => {
    const tx = {
      meta: {
        err: null,
        preBalances: [500_000_000, 0],
        postBalances: [499_000_000, 0],
        preTokenBalances: [
          {
            accountIndex: 2,
            mint: SOLANA_USDC_MINT,
            owner: 'Sender111',
            uiTokenAmount: { amount: '20000000', decimals: 6 },
          },
        ],
        postTokenBalances: [
          {
            accountIndex: 2,
            mint: SOLANA_USDC_MINT,
            owner: 'Sender111',
            uiTokenAmount: { amount: '15000000', decimals: 6 },
          },
          {
            accountIndex: 3,
            mint: SOLANA_USDC_MINT,
            owner: wallet,
            uiTokenAmount: { amount: '5000000', decimals: 6 },
          },
          {
            accountIndex: 4,
            mint: 'OtherMint999',
            owner: wallet,
            uiTokenAmount: { amount: '999000000', decimals: 6 },
          },
        ],
      },
      transaction: {
        message: {
          accountKeys: ['Sender111', wallet],
        },
      },
    }
    const res = extractIncomingFromTx(tx, wallet)
    expect(res.sol).toBe(0)
    expect(res.usdc).toBe(5)
  })

  it('忽略失敗交易與轉出交易', () => {
    const failedTx = {
      meta: {
        err: { InstructionError: [0, 'Custom'] },
        preBalances: [0],
        postBalances: [1_000_000_000],
      },
      transaction: { message: { accountKeys: [wallet] } },
    }
    expect(extractIncomingFromTx(failedTx, wallet)).toEqual({ sol: 0, usdc: 0 })

    const outgoingTx = {
      meta: {
        err: null,
        preBalances: [500_000_000],
        postBalances: [300_000_000],
      },
      transaction: { message: { accountKeys: [wallet] } },
    }
    expect(extractIncomingFromTx(outgoingTx, wallet)).toEqual({ sol: 0, usdc: 0 })
  })
})

describe('fetchMonthlySponsorStats', () => {
  beforeEach(() => {
    __resetSponsorStatsCacheForTest()
  })

  it('整合 CMS 目標與手動加計、Solana 主錢包與 USDC ATA 入帳並以匯率換算為台幣', async () => {
    const now = new Date('2026-11-18T12:00:00+08:00')
    const inMonthTs = Math.floor(Date.parse('2026-11-10T10:00:00+08:00') / 1000)
    const prevMonthTs = Math.floor(Date.parse('2026-10-31T23:59:59+08:00') / 1000)
    const ataPubkey = 'UsdcAtaAccount1111111111111111111111111111'

    const mockFetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)

      if (url.includes('/api/globals/sponsor-settings')) {
        return new Response(
          JSON.stringify({
            monthlyTargetTwd: 1000,
            manualAdjustmentTwd: 150,
            walletAddress: '',
          }),
          { status: 200 },
        )
      }

      if (url.includes('api.coingecko.com')) {
        return new Response(
          JSON.stringify({
            solana: { twd: 4500 },
            'usd-coin': { twd: 32 },
          }),
          { status: 200 },
        )
      }

      if (url.includes('mainnet-beta.solana.com')) {
        const body = JSON.parse(String(init?.body || '{}'))

        // Batch getTransaction（刻意亂序回傳測試 id 對應）
        if (Array.isArray(body)) {
          const responses = body
            .map((req: any) => {
              const sig = req.params[0]
              if (sig === 'sig-sol-1') {
                return {
                  jsonrpc: '2.0',
                  id: req.id,
                  result: {
                    meta: {
                      err: null,
                      preBalances: [1_000_000_000, 0],
                      postBalances: [900_000_000, 100_000_000],
                    },
                    transaction: {
                      message: { accountKeys: ['SenderA', DEFAULT_SPONSOR_WALLET] },
                    },
                  },
                }
              }
              if (sig === 'sig-usdc-1') {
                return {
                  jsonrpc: '2.0',
                  id: req.id,
                  result: {
                    meta: {
                      err: null,
                      preBalances: [0],
                      postBalances: [0],
                      preTokenBalances: [
                        {
                          accountIndex: 1,
                          mint: SOLANA_USDC_MINT,
                          owner: DEFAULT_SPONSOR_WALLET,
                          uiTokenAmount: { amount: '1000000', decimals: 6 },
                        },
                      ],
                      postTokenBalances: [
                        {
                          accountIndex: 1,
                          mint: SOLANA_USDC_MINT,
                          owner: DEFAULT_SPONSOR_WALLET,
                          uiTokenAmount: { amount: '6000000', decimals: 6 },
                        },
                      ],
                    },
                    transaction: { message: { accountKeys: ['SenderB'] } },
                  },
                }
              }
              return { jsonrpc: '2.0', id: req.id, result: null }
            })
            .reverse()
          return new Response(JSON.stringify(responses), { status: 200 })
        }

        if (body.method === 'getTokenAccountsByOwner') {
          return new Response(
            JSON.stringify({
              jsonrpc: '2.0',
              id: body.id,
              result: { value: [{ pubkey: ataPubkey }] },
            }),
            { status: 200 },
          )
        }

        if (body.method === 'getSignaturesForAddress') {
          const addr = body.params[0]
          if (addr === DEFAULT_SPONSOR_WALLET) {
            return new Response(
              JSON.stringify({
                jsonrpc: '2.0',
                id: body.id,
                result: [
                  { signature: 'sig-sol-1', err: null, blockTime: inMonthTs },
                  { signature: 'sig-failed', err: { Err: 1 }, blockTime: inMonthTs },
                  { signature: 'sig-prev-month', err: null, blockTime: prevMonthTs },
                ],
              }),
              { status: 200 },
            )
          }
          if (addr === ataPubkey) {
            return new Response(
              JSON.stringify({
                jsonrpc: '2.0',
                id: body.id,
                result: [
                  { signature: 'sig-usdc-1', err: null, blockTime: inMonthTs },
                  // 與主錢包重複出現的簽章應去重，不得計算兩次
                  { signature: 'sig-sol-1', err: null, blockTime: inMonthTs },
                ],
              }),
              { status: 200 },
            )
          }
        }
      }

      return new Response('Not Found', { status: 404 })
    }) as unknown as typeof fetch

    const stats = await fetchMonthlySponsorStats({
      fetchImpl: mockFetch,
      now,
      bypassCache: true,
    })

    // 0.1 SOL * 4500 + 5 USDC * 32 + 150 手動 = 450 + 160 + 150 = 760 TWD
    expect(stats.solAmount).toBeCloseTo(0.1, 9)
    expect(stats.usdcAmount).toBe(5)
    expect(stats.manualAdjustmentTwd).toBe(150)
    expect(stats.currentMonthlyTwd).toBe(760)
    expect(stats.targetMonthlyTwd).toBe(1000)
    expect(stats.yearMonth).toBe('2026-11')
    expect(stats.walletAddress).toBe(DEFAULT_SPONSOR_WALLET)
  })

  it('CoinGecko 失敗時自動改用 Coinbase 匯率；CMS 與 RPC 全掛時安全降級不拋錯', async () => {
    const now = new Date('2026-11-18T12:00:00+08:00')
    const inMonthTs = Math.floor(Date.parse('2026-11-12T10:00:00+08:00') / 1000)

    const fallbackFetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      if (url.includes('/api/globals/sponsor-settings')) {
        return new Response('CMS Down', { status: 503 })
      }
      if (url.includes('api.coingecko.com')) {
        return new Response('Rate Limited', { status: 429 })
      }
      if (url.includes('coinbase.com/v2/exchange-rates?currency=SOL')) {
        return new Response(JSON.stringify({ data: { rates: { TWD: '5000' } } }), { status: 200 })
      }
      if (url.includes('coinbase.com/v2/exchange-rates?currency=USDC')) {
        return new Response(JSON.stringify({ data: { rates: { TWD: '32' } } }), { status: 200 })
      }
      if (url.includes('mainnet-beta.solana.com')) {
        const body = JSON.parse(String(init?.body || '{}'))
        if (Array.isArray(body)) {
          return new Response(
            JSON.stringify([
              {
                jsonrpc: '2.0',
                id: body[0].id,
                result: {
                  meta: {
                    err: null,
                    preBalances: [0],
                    postBalances: [50_000_000], // 0.05 SOL
                  },
                  transaction: { message: { accountKeys: [DEFAULT_SPONSOR_WALLET] } },
                },
              },
            ]),
            { status: 200 },
          )
        }
        if (body.method === 'getTokenAccountsByOwner') {
          return new Response(JSON.stringify({ jsonrpc: '2.0', id: 1, result: { value: [] } }), { status: 200 })
        }
        if (body.method === 'getSignaturesForAddress') {
          return new Response(
            JSON.stringify({
              jsonrpc: '2.0',
              id: 1,
              result: [{ signature: 'sig-cb', err: null, blockTime: inMonthTs }],
            }),
            { status: 200 },
          )
        }
      }
      return new Response('Error', { status: 500 })
    }) as unknown as typeof fetch

    const stats = await fetchMonthlySponsorStats({
      fetchImpl: fallbackFetch,
      now,
      bypassCache: true,
    })

    // 0.05 SOL * 5000 = 250 TWD
    expect(stats.currentMonthlyTwd).toBe(250)
    expect(stats.targetMonthlyTwd).toBe(DEFAULT_MONTHLY_TARGET_TWD)

    __resetSponsorStatsCacheForTest()
    const totalOutageFetch = vi.fn(async () => {
      throw new Error('network offline')
    }) as unknown as typeof fetch

    const degraded = await fetchMonthlySponsorStats({
      fetchImpl: totalOutageFetch,
      now,
      bypassCache: true,
    })
    expect(degraded.currentMonthlyTwd).toBe(0)
    expect(degraded.targetMonthlyTwd).toBe(DEFAULT_MONTHLY_TARGET_TWD)
  })
})
