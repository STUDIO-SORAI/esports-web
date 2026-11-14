import type { APIRoute } from 'astro'

import { fetchSignatureCount } from '../../lib/petitionCount'

/**
 * 前端輪詢用的人數代理。瀏覽器不需要知道 CMS 位址，也避開 CORS。
 * 只轉發 aggregate 數字，CMS 掛掉時回 `{ count: null }` 讓畫面整塊隱藏。
 */
export const GET: APIRoute = async () => {
  const count = await fetchSignatureCount()

  return new Response(JSON.stringify({ count }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': count === null ? 'no-store' : 'public, max-age=5, stale-while-revalidate=20',
    },
  })
}
