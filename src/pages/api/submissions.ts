import type { APIRoute } from 'astro'

const API_URL =
  process.env.PAYLOAD_API_URL ?? import.meta.env.PAYLOAD_API_URL ?? 'http://localhost:3000'

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json()
    const { name, email, title, category, content } = body

    if (!name || !email || !title || !content) {
      return new Response(JSON.stringify({ error: '請填妥所有必填欄位' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // 將投稿資料寫入 Payload CMS 的 submissions collection
    const payloadRes = await fetch(`${API_URL}/api/submissions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title,
        name,
        email,
        category: category || '其他',
        content,
        status: 'pending',
      }),
    })

    if (!payloadRes.ok) {
      const errData = await payloadRes.json().catch(() => ({}))
      console.error('[Community Submission] Payload CMS Error:', errData)
      return new Response(JSON.stringify({ error: '投稿儲存失敗，請稍後再試' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const createdDoc = await payloadRes.json().catch(() => ({}))
    console.log(`[Community Submission] Successfully stored in Payload CMS (ID: ${createdDoc.doc?.id}): ${title} by ${name}`)

    return new Response(
      JSON.stringify({ success: true, message: '投稿已成功送出並進入審核！' }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('[Community Submission] Error:', error)
    return new Response(JSON.stringify({ error: '伺服器連線失敗，請稍後再試' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
