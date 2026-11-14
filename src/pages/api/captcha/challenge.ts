import type { APIRoute } from 'astro'
import { generatePuzzle } from '../../../lib/captcha'

export const GET: APIRoute = async () => {
  try {
    const puzzle = await generatePuzzle()
    return new Response(JSON.stringify(puzzle), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('[Captcha] generate error:', error)
    return new Response(JSON.stringify({ error: 'Failed to generate challenge' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
