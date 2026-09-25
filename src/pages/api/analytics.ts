import type { APIRoute } from 'astro'
import { resolveVisitorRegion } from '../../lib/visitorRegion'

const API_URL =
  process.env.PAYLOAD_API_URL ?? import.meta.env.PAYLOAD_API_URL ?? 'http://localhost:3000'

export const POST: APIRoute = async ({ request, clientAddress }) => {
  try {
    const data = await request.json().catch(() => null)
    if (!data) {
      return new Response(JSON.stringify({ ok: false }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // 地區只能在這層解：瀏覽器腳本拿不到 IP，CMS 看到的是 web 容器位址。
    // Dokploy / Traefik 會帶 X-Forwarded-For；若前面還有 Cloudflare 則用 CF-IPCountry。
    const { country, region } = resolveVisitorRegion({
      headers: request.headers,
      clientAddress,
      timezone: data.timezone,
    })

    fetch(`${API_URL}/api/analytics/event`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': request.headers.get('user-agent') || '',
      },
      body: JSON.stringify({
        session: data.session,
        path: data.path,
        referrer: data.referrer,
        title: data.title,
        duration: data.duration,
        timezone: typeof data.timezone === 'string' ? data.timezone.slice(0, 64) : '',
        country,
        region,
      }),
    }).catch(() => {})

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch {
    return new Response(JSON.stringify({ ok: false }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
