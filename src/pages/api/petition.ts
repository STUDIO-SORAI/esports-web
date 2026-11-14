import type { APIRoute } from 'astro'

import { resolveClientIp } from '../../lib/clientIp'
import { validateSignature, type SignatureField } from '../../lib/petition'

const API_URL =
  process.env.PAYLOAD_API_URL ?? import.meta.env.PAYLOAD_API_URL ?? 'http://localhost:3000'

const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000
const RATE_LIMIT_MAX = 5
const RATE_LIMIT_MAX_KEYS = 5000

/** 單機版 limiter。Astro 目前是 standalone 單一容器，記憶體計數就夠用。 */
const hits = new Map<string, number[]>()

function isRateLimited(ip: string, now = Date.now()): boolean {
  const recent = (hits.get(ip) ?? []).filter((time) => now - time < RATE_LIMIT_WINDOW_MS)
  if (recent.length >= RATE_LIMIT_MAX) {
    hits.set(ip, recent)
    return true
  }
  recent.push(now)
  hits.set(ip, recent)

  if (hits.size > RATE_LIMIT_MAX_KEYS) {
    for (const [key, times] of hits) {
      if (times.every((time) => now - time >= RATE_LIMIT_WINDOW_MS)) hits.delete(key)
    }
  }
  return false
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  })
}

/** Payload 對唯一鍵衝突回 400，訊息藏在 errors[].data.errors[].message。 */
function isUniqueViolation(body: unknown): boolean {
  try {
    const messages: string[] = []
    const walk = (node: unknown) => {
      if (!node || typeof node !== 'object') return
      for (const value of Object.values(node as Record<string, unknown>)) {
        if (typeof value === 'string') messages.push(value)
        else walk(value)
      }
    }
    walk(body)
    return messages.some((message) => message.toLowerCase().includes('must be unique'))
  } catch {
    return false
  }
}

export const POST: APIRoute = async ({ request, clientAddress }) => {
  let body: Record<string, unknown> = {}
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return json({ error: 'server' }, 400)
  }

  // 機器人陷阱。真的填了也不要告訴它發生什麼事，假裝成功即可。
  if (typeof body.hp === 'string' && body.hp.trim() !== '') {
    return json({ success: true })
  }

  const ip = resolveClientIp({
    forwardedFor: request.headers.get('x-forwarded-for'),
    realIp: request.headers.get('x-real-ip'),
    socketAddress: clientAddress,
  })
  if (isRateLimited(ip)) {
    return json({ error: 'rate-limited' }, 429)
  }

  const result = validateSignature(body)
  if (!result.ok) {
    const issues = Object.keys(result.issues) as SignatureField[]
    return json({ error: 'required', issues }, 400)
  }

  const { signature } = result

  try {
    const submitToken = process.env.PETITION_SUBMIT_TOKEN
    const payloadRes = await fetch(`${API_URL}/api/petitions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(submitToken ? { 'x-petition-token': submitToken } : {}),
      },
      body: JSON.stringify({
        name: signature.name,
        email: signature.email,
        region: signature.region || undefined,
        organization: signature.organization || undefined,
        message: signature.message || undefined,
        language: signature.language,
        status: 'pending',
        ip,
        // Payload 的 userAgent 欄位上限 300，header 可能更長，先截斷避免整筆被退
        userAgent: (request.headers.get('user-agent') ?? '').slice(0, 300) || undefined,
      }),
    })

    if (payloadRes.status === 400 || payloadRes.status === 409) {
      const detail = await payloadRes.json().catch(() => null)
      if (payloadRes.status === 409 || isUniqueViolation(detail)) {
        return json({ error: 'duplicate' }, 409)
      }
      console.error('[Petition] Payload rejected the record:', JSON.stringify(detail).slice(0, 500))
      return json({ error: 'server' }, 500)
    }

    if (!payloadRes.ok) {
      const detail = await payloadRes.text().catch(() => '')
      console.error('[Petition] Payload CMS Error:', payloadRes.status, detail.slice(0, 500))
      return json({ error: 'server' }, 500)
    }

    console.log(`[Petition] Signature recorded (${signature.language})`)
    return json({ success: true })
  } catch (error) {
    console.error('[Petition] Error:', error)
    return json({ error: 'server' }, 500)
  }
}
