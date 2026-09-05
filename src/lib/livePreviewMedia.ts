import { assetUrl } from './payload'

/**
 * Live preview 的資料是後台表單的「未存檔狀態」，關聯欄位一律只有 ID：
 * lexical 的 upload 節點會變成 `value: 12`，封面圖會變成 `featuredImage: 12`。
 * 伺服器端渲染時 Payload 會用 depth 幫我們 populate，postMessage 這條路不會，
 * 所以圖片在 live preview 裡整張消失（`lexicalToHtml` 對 `{ id: 12 }` 回傳空字串）。
 * 這個模組負責把那些 ID 換回媒體物件。
 */

export interface MediaDoc {
  id?: number | string
  url?: string
  filename?: string
  alt?: string
  sizes?: Record<string, { url?: string } | undefined>
}

type UnknownNode = {
  type?: string
  value?: unknown
  children?: UnknownNode[]
  [key: string]: unknown
}

/** 已經帶得出 URL 的 value 不用再打 API */
const isPopulated = (value: unknown): boolean => {
  if (!value || typeof value !== 'object') return false
  const v = value as MediaDoc
  return Boolean(v.url || v.filename || v.sizes)
}

/** 從 upload 節點的 value 取出媒體 ID；已 populate 或看起來是 URL 字串時回傳 null */
export const uploadValueToId = (value: unknown): number | string | null => {
  if (typeof value === 'number') return value
  // 純數字字串才是 ID；其他字串（`/media/a.png`）是既有的 raw URL 用法
  if (typeof value === 'string') return /^\d+$/.test(value) ? value : null
  if (value && typeof value === 'object' && !isPopulated(value)) {
    const id = (value as MediaDoc).id
    if (typeof id === 'number' || typeof id === 'string') return id
  }
  return null
}

const walk = (node: UnknownNode | undefined, visit: (n: UnknownNode) => void): void => {
  if (!node || typeof node !== 'object') return
  visit(node)
  if (Array.isArray(node.children)) node.children.forEach((child) => walk(child, visit))
}

/** 掃出整份內容裡還沒 populate 的 upload 節點媒體 ID（已去重） */
export function collectUnpopulatedUploadIds(content: unknown): (number | string)[] {
  const root = (content as { root?: UnknownNode } | null | undefined)?.root
  const ids = new Set<number | string>()
  walk(root, (node) => {
    if (node.type !== 'upload') return
    const id = uploadValueToId(node.value)
    if (id !== null) ids.add(id)
  })
  return [...ids]
}

/**
 * 用查到的媒體物件回填 upload 節點。回傳新物件，不動到傳進來的內容
 * （postMessage 的資料下一輪還會再用到）。查不到的 ID 原樣留著。
 */
export function populateUploads(
  content: unknown,
  mediaById: Map<string, MediaDoc>,
): unknown {
  if (!content || typeof content !== 'object') return content
  const clone = structuredClone(content) as { root?: UnknownNode }
  walk(clone.root, (node) => {
    if (node.type !== 'upload') return
    const id = uploadValueToId(node.value)
    if (id === null) return
    const media = mediaById.get(String(id))
    if (media) node.value = media
  })
  return clone
}

const mediaCache = new Map<string, MediaDoc>()

/** 逐一向 CMS 取媒體文件（media 的 read access 是公開的），結果會快取 */
export async function fetchMediaByIds(
  ids: (number | string)[],
  fetchImpl: typeof fetch = fetch,
): Promise<Map<string, MediaDoc>> {
  const result = new Map<string, MediaDoc>()
  await Promise.all(
    ids.map(async (id) => {
      const key = String(id)
      const cached = mediaCache.get(key)
      if (cached) {
        result.set(key, cached)
        return
      }
      try {
        const res = await fetchImpl(assetUrl(`/api/media/${encodeURIComponent(key)}?depth=0`))
        if (!res.ok) return
        const doc = (await res.json()) as MediaDoc
        if (doc && (doc.url || doc.filename || doc.sizes)) {
          mediaCache.set(key, doc)
          result.set(key, doc)
        }
      } catch {
        // 取不到就讓該張圖維持原狀，不要讓整篇預覽掛掉
      }
    }),
  )
  return result
}
