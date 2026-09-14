import type { APIRoute } from 'astro'
import { siteOrigin } from '../lib/seo'

export const GET: APIRoute = ({ request, url }) => {
  const origin = siteOrigin(request, url)
  const body = `User-agent: *
Allow: /
Disallow: /api/

Sitemap: ${origin}/sitemap.xml
`

  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  })
}
