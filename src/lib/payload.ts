// 這些設定會被 richtext.ts 帶進 MarkdownContent 這個 client island，
// 而瀏覽器沒有 process —— 直接讀 process.env 會在 hydrate 當下丟 ReferenceError，
// 整個 island 就掛掉（dev 模式下尤其明顯，Vite 不會把模組搖掉）。一律走這個 guard。
const procEnv = typeof process !== "undefined" ? process.env : undefined;

const API_URL =
  procEnv?.PAYLOAD_API_URL ?? import.meta.env.PAYLOAD_API_URL ?? 'http://localhost:3000'

export interface Media {
  id: number
  url: string
  alt: string
  width?: number
  height?: number
  sizes?: Record<string, { url: string; width: number; height: number } | undefined>
}

export interface Category {
  id: number
  name: string
  slug: string
}

export interface Tag {
  id: number
  name: string
  slug: string
}

export interface Author {
  id: number
  name?: string
  email: string
  role?: string
  avatar?: Media | number | null
  bio?: string
  contactEmail?: string
  socials?: {
    twitter?: string
    threads?: string
    instagram?: string
    discord?: string
    website?: string
  }
}

export interface Post {
  id: number
  title: string
  slug: string
  excerpt?: string
  featuredImage?: Media | number | null
  category?: Category | number | null
  tags?: (Tag | number)[]
  author?: Author | number | null
  publishedAt?: string
  content?: unknown
  _status?: string
}

export interface ListResponse<T> {
  docs: T[]
  totalDocs: number
  totalPages: number
  page: number
  limit: number
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}/api${path}`)
  if (!res.ok) {
    throw new Error(`Payload API error ${res.status}: ${path}`)
  }
  return res.json() as Promise<T>
}

export function fetchPosts(limit = 20): Promise<ListResponse<Post>> {
  return get<ListResponse<Post>>(`/posts?sort=-publishedAt&depth=2&limit=${limit}`)
}

export async function fetchPostBySlug(slug: string, draft = false): Promise<Post | null> {
  const query = `/posts?where[slug][equals]=${encodeURIComponent(slug)}&depth=2&limit=1${
    draft ? '&draft=true' : ''
  }`
  const data = await get<ListResponse<Post>>(query)
  return data.docs[0] ?? null
}

export async function fetchPostsByCategory(categorySlug: string, limit = 20): Promise<ListResponse<Post>> {
  // First find category by slug or name
  return get<ListResponse<Post>>(
    `/posts?where[category.slug][equals]=${encodeURIComponent(categorySlug)}&sort=-publishedAt&depth=2&limit=${limit}`
  ).catch(async () => {
    // fallback if category is matched by name
    return get<ListResponse<Post>>(
      `/posts?where[category.name][equals]=${encodeURIComponent(categorySlug)}&sort=-publishedAt&depth=2&limit=${limit}`
    )
  })
}

export async function fetchPostsByTag(tagSlug: string, limit = 20): Promise<ListResponse<Post>> {
  return get<ListResponse<Post>>(
    `/posts?where[tags.slug][equals]=${encodeURIComponent(tagSlug)}&sort=-publishedAt&depth=2&limit=${limit}`
  ).catch(async () => {
    return get<ListResponse<Post>>(
      `/posts?where[tags.name][equals]=${encodeURIComponent(tagSlug)}&sort=-publishedAt&depth=2&limit=${limit}`
    )
  })
}

export async function fetchCategories(): Promise<Category[]> {
  const data = await get<ListResponse<Category>>('/categories?limit=100').catch(() => ({ docs: [] }))
  return data.docs
}

export async function fetchTags(): Promise<Tag[]> {
  const data = await get<ListResponse<Tag>>('/tags?limit=100').catch(() => ({ docs: [] }))
  return data.docs
}

export async function searchPosts(query: string, limit = 20): Promise<Post[]> {
  if (!query.trim()) return []
  const data = await get<ListResponse<Post>>(
    `/posts?where[or][0][title][like]=${encodeURIComponent(query)}&where[or][1][excerpt][like]=${encodeURIComponent(
      query
    )}&sort=-publishedAt&depth=2&limit=${limit}`
  ).catch(() => ({ docs: [] }))
  return data.docs
}

const PUBLIC_CMS_URL = (
  procEnv?.PUBLIC_CMS_URL ??
  procEnv?.ADMIN_URL ??
  import.meta.env.PUBLIC_CMS_URL ??
  ''
).replace(/\/+$/, '')

/** 取出封面圖 URL（優先 card 尺寸） */
export function mediaUrl(media?: Media | number | null): string | null {
  if (!media || typeof media === 'number') return null
  return media.sizes?.card?.url ?? media.url ?? null
}

/** Payload 回傳的媒體 URL 是相對路徑，要補上 CMS origin */
export function assetUrl(path?: string | null): string {
  if (!path) return ''
  let clean = path
  if (clean.includes('localhost:3000') || clean.includes('cms:3000')) {
    clean = clean.replace(/^https?:\/\/(localhost:3000|cms:3000)/, '')
  }
  if (clean.startsWith('http')) return clean
  const normalized = clean.startsWith('/') ? clean : `/${clean}`
  return PUBLIC_CMS_URL ? `${PUBLIC_CMS_URL}${normalized}` : normalized
}

export function formatDate(dateStr?: string | null): string {
  if (!dateStr) return ''
  return new Intl.DateTimeFormat('zh-TW', {
    timeZone: 'Asia/Taipei',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(dateStr))
}

export function formatDateTime(dateStr?: string | null): string {
  if (!dateStr) return ''
  return new Intl.DateTimeFormat('zh-TW', {
    timeZone: 'Asia/Taipei',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateStr))
}

export function getReadTime(content?: unknown, excerpt?: string): string {
  const text = JSON.stringify(content || '') + (excerpt || '')
  const charCount = text.replace(/<[^>]*>/g, '').replace(/[\s\n\r]/g, '').length
  const minutes = Math.max(1, Math.ceil(charCount / 350))
  return `${minutes} 分鐘閱讀`
}

export function getCategoryName(post: Post): string {
  if (!post.category) return '專欄報導'
  if (typeof post.category === 'object' && 'name' in post.category) {
    return post.category.name
  }
  return '專欄報導'
}

export function getAuthorInfo(post: Post): { name: string; avatarUrl?: string; role?: string } {
  if (!post.author || typeof post.author === 'number') {
    return { name: 'SORAI 編輯部' }
  }
  const a = post.author as Author
  const avatarUrl = mediaUrl(a.avatar)
  return {
    name: a.name || a.email?.split('@')[0] || 'SORAI 編輯部',
    avatarUrl: avatarUrl ? assetUrl(avatarUrl) : undefined,
    role: a.role,
  }
}
