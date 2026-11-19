import type { APIRoute } from 'astro'
import { searchPosts, mediaUrl, assetUrl } from '../../lib/payload'
import { toPlainShareTitle } from '../../lib/seo'

/** 導覽列的搜尋浮層要顯示縮圖與分類，所以這裡多帶幾個欄位回去。 */
export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url)
  const q = url.searchParams.get('q') || ''

  if (!q.trim()) {
    return new Response(JSON.stringify([]), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const posts = await searchPosts(q, 10)
    const results = posts.map((p) => {
      const cover = mediaUrl(p.featuredImage)
      const category =
        p.category && typeof p.category === 'object' ? p.category.name : ''
      const firstTag = (p.tags || []).find((t) => typeof t === 'object') as
        | { name?: string }
        | undefined

      return {
        slug: p.slug,
        title: toPlainShareTitle(p.title),
        excerpt: p.excerpt,
        publishedAt: p.publishedAt,
        coverImage: cover ? assetUrl(cover) : '',
        category,
        source: (firstTag?.name || category || 'SOURCES').toUpperCase(),
      }
    })

    return new Response(JSON.stringify(results), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('[Search API] Error:', error)
    return new Response(JSON.stringify([]), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
