import type { APIRoute } from 'astro'
import { fetchBriefs } from '../lib/api'
import { briefBodyToText } from '../lib/briefBody'
import { SITE_NAME, siteOrigin, absoluteUrl, xmlEscape, toPlainShareTitle } from '../lib/seo'

function cdata(text: string): string {
  if (!text) return '<![CDATA[]]>'
  return `<![CDATA[${text.replace(/]]>/g, ']]]]><![CDATA[>')}]]>`
}

export const GET: APIRoute = async ({ request, url }) => {
  const origin = siteOrigin(request, url)
  const briefs = await fetchBriefs(50).catch(() => [])

  const lastBuildDate = briefs[0]?.publishedAt || briefs[0]?.updatedAt || new Date().toISOString()
  const buildDateStr = new Date(lastBuildDate).toUTCString()

  const itemsXml = briefs
    .filter((brief) => brief.slug)
    .map((brief) => {
      const briefUrl = `${origin}/brief/${encodeURIComponent(brief.slug)}`
      const pubDate = brief.publishedAt || brief.updatedAt
      const pubDateStr = pubDate ? new Date(pubDate).toUTCString() : new Date().toUTCString()
      const categoryTag = brief.category ? `\n      <category>${cdata(brief.category)}</category>` : ''
      const enclosure = brief.image
        ? `\n      <enclosure url="${xmlEscape(absoluteUrl(origin, brief.image))}" type="image/jpeg" />`
        : ''
      const mediaTag = brief.image
        ? `\n      <media:content url="${xmlEscape(absoluteUrl(origin, brief.image))}" medium="image" />`
        : ''
      const description = briefBodyToText(brief.body) || toPlainShareTitle(brief.title)

      return `    <item>
      <title>${cdata(toPlainShareTitle(brief.title))}</title>
      <link>${briefUrl}</link>
      <guid isPermaLink="true">${briefUrl}</guid>
      <pubDate>${pubDateStr}</pubDate>
      <description>${cdata(description)}</description>${categoryTag}${enclosure}${mediaTag}
    </item>`
    })
    .join('\n')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
  xmlns:atom="http://www.w3.org/2005/Atom"
  xmlns:media="http://search.yahoo.com/mrss/">
  <channel>
    <title>${cdata(`${SITE_NAME} 戰報快訊`)}</title>
    <link>${origin}/feed</link>
    <description>${cdata(`${SITE_NAME} 戰報快訊：圖卡短訊即時更新。`)}</description>
    <language>zh-TW</language>
    <lastBuildDate>${buildDateStr}</lastBuildDate>
    <atom:link href="${origin}/rss-briefs.xml" rel="self" type="application/rss+xml" />
${itemsXml}
  </channel>
</rss>
`

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=300, s-maxage=600',
    },
  })
}
