import type { APIRoute } from 'astro'
import { fetchAllPosts, fetchAllBriefs, fetchCategories, parseMaybeJsonArray } from '../lib/api'
import { CATEGORY_FALLBACK, categoryPath, isMainCategory } from '../lib/config'
import { siteOrigin, xmlEscape } from '../lib/seo'

function urlEntry(loc: string, lastmod?: string, changefreq = 'weekly', priority = '0.6') {
  const lastmodTag = lastmod ? `\n    <lastmod>${xmlEscape(lastmod.slice(0, 10))}</lastmod>` : ''
  return `  <url>
    <loc>${xmlEscape(loc)}</loc>${lastmodTag}
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`
}

export const GET: APIRoute = async ({ request, url }) => {
  const origin = siteOrigin(request, url)
  const posts = await fetchAllPosts().catch(() => [])
  const briefs = await fetchAllBriefs().catch(() => [])

  const staticPaths = [
    { path: '/', changefreq: 'hourly', priority: '1.0' },
    { path: '/matches', changefreq: 'hourly', priority: '0.7' },
    { path: '/about', changefreq: 'monthly', priority: '0.5' },
    { path: '/contact', changefreq: 'monthly', priority: '0.5' },
    { path: '/privacy', changefreq: 'monthly', priority: '0.4' },
    { path: '/disclaimer', changefreq: 'monthly', priority: '0.4' },
    { path: '/tag', changefreq: 'daily', priority: '0.5' },
    { path: '/feed', changefreq: 'hourly', priority: '0.8' },
  ]

  const cmsCategories = await fetchCategories().catch(() => [])
  const categories = cmsCategories.length > 0 ? cmsCategories : CATEGORY_FALLBACK

  const categoryPaths = categories.map(({ slug }) => ({
    path: categoryPath(slug),
    changefreq: 'daily',
    priority: '0.8',
  }))

  const tagSet = new Set<string>()
  for (const post of posts) {
    for (const tag of parseMaybeJsonArray(post.tags)) {
      if (tag && !isMainCategory(tag, categories)) tagSet.add(tag)
    }
  }
  for (const brief of briefs) {
    for (const tag of brief.tags || []) {
      if (tag && !isMainCategory(tag, categories)) tagSet.add(tag)
    }
  }

  const tagPaths = [...tagSet].sort().map((tag) => ({
    path: `/tag/${encodeURIComponent(tag)}`,
    changefreq: 'weekly',
    priority: '0.5',
  }))

  const latestPost = posts[0]?.updatedAt || posts[0]?.publishedAt
  const latestBrief = briefs[0]?.updatedAt || briefs[0]?.publishedAt
  const latest = [latestPost, latestBrief]
    .filter((value): value is string => Boolean(value))
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0]
  const entries = [
    ...staticPaths.map((item) =>
      urlEntry(
        `${origin}${item.path}`,
        item.path === '/' || item.path === '/feed' ? latest : undefined,
        item.changefreq,
        item.priority
      )
    ),
    ...categoryPaths.map((item) => urlEntry(`${origin}${item.path}`, latest, item.changefreq, item.priority)),
    ...posts
      .filter((post) => post.slug)
      .map((post) =>
        urlEntry(
          `${origin}/post/${encodeURIComponent(post.slug)}`,
          post.updatedAt || post.publishedAt,
          'weekly',
          '0.9'
        )
      ),
    ...briefs
      .filter((brief) => brief.slug)
      .map((brief) =>
        urlEntry(
          `${origin}/brief/${encodeURIComponent(brief.slug)}`,
          brief.updatedAt || brief.publishedAt,
          'hourly',
          '0.8'
        )
      ),
    ...tagPaths.map((item) => urlEntry(`${origin}${item.path}`, undefined, item.changefreq, item.priority)),
  ]

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.join('\n')}
</urlset>
`

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=1800',
    },
  })
}
