import type { APIRoute } from 'astro'
import * as cheerio from 'cheerio'

export interface LinkPreviewData {
  url: string
  domain: string
  title: string
  description: string
  image: string
}

const CACHE_TTL = 86400 * 1000 // 24 小時
const FALLBACK_TTL = 600 * 1000 // 抓取失敗只快取 10 分鐘，避免暫時性阻擋卡整天

// Yahoo / Google 等站台在部分地區會先擋一層同意條款頁，
// 抓到這種頁面時寧可退回純網域卡片，也不要把「隱私權選項」當成標題。
const CONSENT_HOSTS = ['consent.', 'guce.', 'consent.google.', 'cookiepolicy.']
const CONSENT_TITLES = /^(your privacy choices|privacy|before you continue|請先同意|隱私權)/i
const cache = new Map<string, { at: number; data: LinkPreviewData }>()

const isFetchableUrl = (raw: string): URL | null => {
  try {
    const parsed = new URL(raw)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null
    // 阻擋內網 / 本機位址，避免 SSRF
    const host = parsed.hostname.toLowerCase()
    if (
      host === 'localhost' ||
      host.endsWith('.localhost') ||
      host === '0.0.0.0' ||
      /^127\./.test(host) ||
      /^10\./.test(host) ||
      /^192\.168\./.test(host) ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(host) ||
      /^169\.254\./.test(host) ||
      host === '[::1]'
    ) {
      return null
    }
    return parsed
  } catch {
    return null
  }
}

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600',
    },
  })

export const GET: APIRoute = async ({ request }) => {
  const target = new URL(request.url).searchParams.get('url') || ''
  const parsed = isFetchableUrl(target)

  if (!parsed) {
    return json({ error: 'invalid url' }, 400)
  }

  const domain = parsed.hostname
  const fallback: LinkPreviewData = { url: target, domain, title: domain, description: '', image: '' }

  const hit = cache.get(target)
  if (hit && Date.now() - hit.at < CACHE_TTL) {
    return json(hit.data)
  }

  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 8000)
    const res = await fetch(target, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'zh-TW,zh;q=0.9,en;q=0.8',
      },
      redirect: 'follow',
      signal: controller.signal,
    })
    clearTimeout(timer)

    if (!res.ok) throw new Error(`HTTP ${res.status}`)

    const finalHost = (() => {
      try {
        return new URL(res.url).hostname.toLowerCase()
      } catch {
        return ''
      }
    })()
    if (CONSENT_HOSTS.some((h) => finalHost.includes(h))) {
      throw new Error(`consent wall: ${finalHost}`)
    }

    const $ = cheerio.load(await res.text())
    const getMeta = (prop: string, name: string) =>
      $(`meta[property="${prop}"]`).attr('content') || $(`meta[name="${name}"]`).attr('content')

    const title =
      getMeta('og:title', 'title') || getMeta('twitter:title', 'twitter:title') || $('title').text() || domain
    const description =
      getMeta('og:description', 'description') || getMeta('twitter:description', 'twitter:description') || ''
    let image = getMeta('og:image', 'og:image') || getMeta('twitter:image', 'twitter:image') || ''

    if (image && !image.startsWith('http')) {
      try {
        image = new URL(image, target).href
      } catch {
        image = ''
      }
    }

    if (CONSENT_TITLES.test(title.trim())) {
      throw new Error(`consent wall title: ${title.trim()}`)
    }

    const data: LinkPreviewData = {
      url: target,
      domain,
      title: title.trim() || domain,
      description: description.trim(),
      image,
    }
    cache.set(target, { at: Date.now(), data })
    return json(data)
  } catch (error) {
    console.error('[LinkPreview API] fetch failed:', target, error)
    cache.set(target, { at: Date.now() - (CACHE_TTL - FALLBACK_TTL), data: fallback })
    return json(fallback)
  }
}
