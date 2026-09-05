import { SITE_URL } from './config'
import type { Author, Post } from './types'

export const SITE_NAME = 'SORAI ESPORTS'
export const DEFAULT_DESCRIPTION =
  'SORAI ESPORTS 提供最新的中文圈電競新聞，涵蓋賽事、戰隊、選手與產業動態。'
export const DEFAULT_LOCALE = 'zh_TW'

export function requestOrigin(request: Request, fallbackUrl: URL): string {
  const forwardedProto = request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim()
  if (!forwardedProto) return fallbackUrl.origin
  try {
    const origin = new URL(fallbackUrl.origin)
    origin.protocol = `${forwardedProto}:`
    return origin.origin
  } catch {
    return fallbackUrl.origin
  }
}

export function siteOrigin(request: Request, fallbackUrl: URL): string {
  return SITE_URL || requestOrigin(request, fallbackUrl)
}

export function absoluteUrl(origin: string, path = ''): string {
  if (!path) return origin
  if (/^(https?:|data:|blob:)/i.test(path)) return path
  const normalized = path.startsWith('/') ? path : `/${path}`
  return `${origin}${normalized}`
}

export function xmlEscape(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/** Default OG title line-break marker. `&&` means a literal `&`. */
export const OG_TITLE_BREAK = '&'

const BREAK_PLACEHOLDER = '\u0000'

/**
 * Split on explicit newlines and the OG break character. Doubled break chars
 * (`&&` by default) stay as a literal `&` rather than a line break.
 * Highlights (`~~x~~`) are stripped from each line (same as CMS og.ts).
 */
export function splitShareTitleLines(raw: string, breakChar = OG_TITLE_BREAK): string[] {
  if (!raw) return []
  const protectedRaw = raw.split(breakChar.repeat(2)).join(BREAK_PLACEHOLDER)
  return protectedRaw
    .split(/\r?\n/)
    .flatMap((line) => line.split(breakChar))
    .map((line) =>
      line
        .split(BREAK_PLACEHOLDER)
        .join(breakChar)
        .replace(/~~(.*?)~~/g, '$1')
        .trim()
    )
    .filter(Boolean)
}

/**
 * Reader/crawler title: `&` is only a line-break marker for OG *image*
 * generation. `&&` is a literal `&`. Highlights (`~~x~~`) are stripped.
 * Compact cards/lists join lines with a space. Web cannot import the CMS
 * helper, so this is a matching copy.
 */
export function toPlainShareTitle(raw: string, breakChar = OG_TITLE_BREAK): string {
  if (!raw) return ''
  return splitShareTitleLines(raw, breakChar)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function organizationJsonLd(origin: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'NewsMediaOrganization',
    name: SITE_NAME,
    url: origin,
    logo: {
      '@type': 'ImageObject',
      url: absoluteUrl(origin, '/_w.png'),
    },
    description: DEFAULT_DESCRIPTION,
    publishingPrinciples: absoluteUrl(origin, '/about'),
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'editorial',
      url: absoluteUrl(origin, '/contact'),
    },
  }
}

export function websiteJsonLd(origin: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: origin,
    inLanguage: 'zh-Hant-TW',
    description: DEFAULT_DESCRIPTION,
    publisher: {
      '@type': 'NewsMediaOrganization',
      name: SITE_NAME,
    },
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${origin}/search?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  }
}

export function breadcrumbJsonLd(
  origin: string,
  items: { name: string; path: string }[]
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: absoluteUrl(origin, item.path),
    })),
  }
}

export function newsArticleJsonLd(opts: {
  origin: string
  post: Post
  authors: Author[]
  url: string
  image: string
}) {
  const { origin, post, authors, url, image } = opts
  return {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: toPlainShareTitle(post.title),
    description: post.description || DEFAULT_DESCRIPTION,
    image: [image],
    datePublished: post.publishedAt,
    dateModified: post.updatedAt || post.publishedAt,
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': url,
    },
    author: (authors.length > 0 ? authors : [{ name: SITE_NAME }]).map((author) => ({
      '@type': 'Person',
      name: author.name,
    })),
    publisher: {
      '@type': 'NewsMediaOrganization',
      name: SITE_NAME,
      logo: {
        '@type': 'ImageObject',
        url: absoluteUrl(origin, '/_w.png'),
      },
    },
    inLanguage: 'zh-Hant-TW',
    articleSection: post.category || undefined,
  }
}
