const procEnv = typeof process !== 'undefined' ? process.env : undefined

const API_URL =
  procEnv?.PAYLOAD_API_URL ?? import.meta.env.PAYLOAD_API_URL ?? 'http://localhost:3000'

const PUBLIC_CMS_URL = (
  procEnv?.PUBLIC_CMS_URL ??
  procEnv?.ADMIN_URL ??
  import.meta.env.PUBLIC_CMS_URL ??
  ''
).replace(/\/+$/, '')

export type OpenLetterLogoThemeMode = 'auto' | 'white' | 'dark'

export interface OpenLetterLogo {
  id: string
  name: string
  src: string
  href?: string
  themeMode: OpenLetterLogoThemeMode
  order: number
}

function defaultAssetUrl(path?: string | null): string {
  if (!path) return ''
  let clean = path.trim()
  if (!clean) return ''
  if (clean.includes('localhost:3000') || clean.includes('cms:3000')) {
    clean = clean.replace(/^https?:\/\/(localhost:3000|cms:3000)/, '')
  }
  if (/^https?:\/\//i.test(clean)) return clean
  const normalized = clean.startsWith('/') ? clean : `/${clean}`
  return PUBLIC_CMS_URL ? `${PUBLIC_CMS_URL}${normalized}` : normalized
}

export function sanitizeLogoLink(url?: unknown): string | undefined {
  if (typeof url !== 'string') return undefined
  const trimmed = url.trim()
  if (!trimmed) return undefined
  if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith('/')) {
    return trimmed
  }
  return undefined
}

function normalizeThemeMode(value: unknown): OpenLetterLogoThemeMode {
  if (value === 'white' || value === 'dark' || value === 'auto') return value
  return 'auto'
}

export function parseOpenLetterLogos(
  docs: unknown,
  resolveAsset: (path?: string | null) => string = defaultAssetUrl,
): OpenLetterLogo[] {
  if (!Array.isArray(docs)) return []

  const parsed: OpenLetterLogo[] = []
  for (const raw of docs) {
    if (!raw || typeof raw !== 'object') continue
    const doc = raw as Record<string, unknown>
    if (doc.visible === false) continue

    const name = typeof doc.name === 'string' ? doc.name.trim() : ''
    if (!name) continue

    const mediaObj = doc.logo && typeof doc.logo === 'object' ? (doc.logo as Record<string, unknown>) : null
    const mediaPath = typeof mediaObj?.url === 'string' ? mediaObj.url : null
    const src = mediaPath ? resolveAsset(mediaPath) : sanitizeLogoLink(doc.logoUrl) || ''
    if (!src) continue

    const order = typeof doc.order === 'number' && Number.isFinite(doc.order) ? doc.order : 0

    parsed.push({
      id: String(doc.id ?? name),
      name,
      src,
      href: sanitizeLogoLink(doc.url),
      themeMode: normalizeThemeMode(doc.themeMode),
      order,
    })
  }

  return parsed.sort((a, b) => a.order - b.order)
}

export async function fetchOpenLetterLogos(): Promise<OpenLetterLogo[]> {
  try {
    const response = await fetch(
      `${API_URL}/api/open-letter-logos?where[visible][equals]=true&sort=order&limit=50&depth=1`,
      {
        signal: AbortSignal.timeout(2000),
        cache: 'no-store',
      },
    )
    if (!response.ok) return []
    const data = (await response.json()) as { docs?: unknown }
    return parseOpenLetterLogos(data?.docs)
  } catch {
    return []
  }
}
