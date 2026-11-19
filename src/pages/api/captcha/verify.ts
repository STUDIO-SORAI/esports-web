import type { APIRoute } from 'astro'
import { verifyPuzzle } from '../../../lib/captcha'

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json()
    const { token, selected } = body

    if (!token || !Array.isArray(selected)) {
      return new Response(JSON.stringify({ error: 'Invalid request' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const ok = verifyPuzzle(token, selected)

    if (!ok) {
      return new Response(JSON.stringify({ error: '答案錯誤' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('[Captcha] verify error:', error)
    return new Response(JSON.stringify({ error: 'Verification failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
