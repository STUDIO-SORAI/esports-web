import type { APIRoute } from 'astro'
import { fetchPosts } from '../lib/api'
import { SITE_NAME, DEFAULT_DESCRIPTION, siteOrigin, absoluteUrl, xmlEscape, toPlainShareTitle } from '../lib/seo'

function cdata(text: string): string {
  if (!text) return '<![CDATA[]]>'
  return `<![CDATA[${text.replace(/]]>/g, ']]]]><![CDATA[>')}]]>`
}

export const GET: APIRoute = async ({ request, url }) => {
  const origin = siteOrigin(request, url)
  const posts = await fetchPosts().catch(() => [])

  const lastBuildDate = posts[0]?.publishedAt || posts[0]?.updatedAt || new Date().toISOString()
  const buildDateStr = new Date(lastBuildDate).toUTCString()

  const itemsXml = posts
    .filter((post) => post.slug)
    .map((post) => {
      const postUrl = `${origin}/post/${encodeURIComponent(post.slug)}`
      const pubDate = post.publishedAt || post.updatedAt
      const pubDateStr = pubDate ? new Date(pubDate).toUTCString() : new Date().toUTCString()
      const categoryTag = post.category ? `\n      <category>${cdata(post.category)}</category>` : ''
      const mediaTag = post.coverImage
        ? `\n      <media:content url="${xmlEscape(absoluteUrl(origin, post.coverImage))}" medium="image" />`
        : ''

      const fullContent = post.content || post.description || toPlainShareTitle(post.title)

      return `    <item>
      <title>${cdata(toPlainShareTitle(post.title))}</title>
      <link>${postUrl}</link>
      <guid isPermaLink="true">${postUrl}</guid>
      <pubDate>${pubDateStr}</pubDate>
      <description>${cdata(post.description || toPlainShareTitle(post.title))}</description>
      <content:encoded>${cdata(fullContent)}</content:encoded>${categoryTag}${mediaTag}
    </item>`
    })
    .join('\n')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
  xmlns:atom="http://www.w3.org/2005/Atom"
  xmlns:content="http://purl.org/rss/1.0/modules/content/"
  xmlns:dc="http://purl.org/dc/elements/1.1/"
  xmlns:media="http://search.yahoo.com/mrss/">
  <channel>
    <title>${cdata(SITE_NAME)}</title>
    <link>${origin}</link>
    <description>${cdata(DEFAULT_DESCRIPTION)}</description>
    <language>zh-TW</language>
    <lastBuildDate>${buildDateStr}</lastBuildDate>
    <atom:link href="${origin}/rss.xml" rel="self" type="application/rss+xml" />
${itemsXml}
  </channel>
</rss>
`

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=1800, s-maxage=3600',
    },
  })
}
