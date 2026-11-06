import type { APIRoute } from 'astro'
import { validateSponsorKyc } from '../../lib/sponsorKyc'

const API_URL =
  process.env.PAYLOAD_API_URL ?? import.meta.env.PAYLOAD_API_URL ?? 'http://localhost:3000'

export const POST: APIRoute = async ({ request, clientAddress }) => {
  try {
    const body = await request.json().catch(() => ({}))
    const { email, contact, currency, amount, legalConfirmed } = body

    const validation = validateSponsorKyc({
      email,
      contact,
      currency,
      amount,
      legalConfirmed: Boolean(legalConfirmed),
    })

    if (!validation.valid || !validation.sponsorId) {
      return new Response(
        JSON.stringify({ error: validation.error || '資料驗證失敗' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    const ip = clientAddress || request.headers.get('x-forwarded-for') || 'unknown'

    // 寫入 Payload CMS sponsors collection (附帶 1.2 秒超時控制，不卡死前端)
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 1200)

      const cmsRes = await fetch(`${API_URL}/api/sponsors`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sponsorId: validation.sponsorId,
          email: email.trim(),
          contact: (contact || '').trim(),
          currency,
          amount: amount ? String(amount) : '',
          status: 'pending',
          ip,
        }),
        signal: controller.signal,
      })
        .catch((err) => {
          console.warn('[Sponsor KYC] CMS Connection skipped (non-blocking):', err.message)
          return null
        })
        .finally(() => clearTimeout(timeoutId))

      if (cmsRes && cmsRes.ok) {
        const doc = await cmsRes.json().catch(() => ({}))
        console.info(
          `[Sponsor KYC] Stored in CMS (ID: ${doc.doc?.id}): ${validation.sponsorId} (${email})`
        )
      }
    } catch (cmsErr: any) {
      console.warn('[Sponsor KYC] CMS connection non-blocking bypass:', cmsErr?.message)
    }

    // 伺服器端稽核紀錄
    const auditRecord = {
      sponsorId: validation.sponsorId,
      email: email.trim(),
      contact: (contact || '').trim(),
      currency,
      amount: amount || 'open',
      ip,
      timestamp: new Date().toISOString(),
    }
    console.info('[Sponsor KYC Audit]', JSON.stringify(auditRecord))

    return new Response(
      JSON.stringify({
        success: true,
        sponsorId: validation.sponsorId,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  } catch (err) {
    console.error('[Sponsor KYC Error]', err)
    return new Response(
      JSON.stringify({ error: '伺服器處理失敗，請稍後再試' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
}
