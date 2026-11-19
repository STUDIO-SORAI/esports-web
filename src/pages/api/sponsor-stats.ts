import type { APIRoute } from 'astro'

import { DEFAULT_MONTHLY_TARGET_TWD, fetchMonthlySponsorStats } from '../../lib/sponsorStats'
import { DEFAULT_SPONSOR_WALLET } from '../../lib/solanaPay'

/**
 * 公開的本月贊助進度統計。
 * 只回傳累計金額與目標門檻（不含任何贊助者個人資料），
 * 讓首頁側欄與 /sponsor 頁面在 SSR 或前端重新同步時取得最新進度。
 */
export const GET: APIRoute = async () => {
  try {
    const stats = await fetchMonthlySponsorStats()
    return new Response(JSON.stringify(stats), {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'public, max-age=30, stale-while-revalidate=60',
      },
    })
  } catch {
    return new Response(
      JSON.stringify({
        currentMonthlyTwd: 0,
        targetMonthlyTwd: DEFAULT_MONTHLY_TARGET_TWD,
        solAmount: 0,
        usdcAmount: 0,
        manualAdjustmentTwd: 0,
        walletAddress: DEFAULT_SPONSOR_WALLET,
        yearMonth: '',
        updatedAt: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Cache-Control': 'no-store',
        },
      },
    )
  }
}
