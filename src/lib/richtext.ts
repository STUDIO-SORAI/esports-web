import { assetUrl } from './payload'

// 精簡版 Lexical JSON -> HTML 序列化，涵蓋 Payload 預設 editor 的常用節點
interface LexicalNode {
  type: string
  text?: string
  format?: number
  tag?: string
  listType?: string
  children?: LexicalNode[]
  fields?: { url?: string; newTab?: boolean }
  relationTo?: string
  value?: any
}

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

// Lexical text format bitmask
const IS_BOLD = 1
const IS_ITALIC = 2
const IS_STRIKETHROUGH = 4
const IS_UNDERLINE = 8
const IS_CODE = 16

function serializeText(node: LexicalNode): string {
  let text = escapeHtml(node.text ?? '')
  const format = typeof node.format === 'number' ? node.format : 0
  if (format & IS_CODE) text = `<code>${text}</code>`
  if (format & IS_BOLD) text = `<strong>${text}</strong>`
  if (format & IS_ITALIC) text = `<em>${text}</em>`
  if (format & IS_UNDERLINE) text = `<u>${text}</u>`
  if (format & IS_STRIKETHROUGH) text = `<span class="md-highlight">${text}</span>`
  return text
}

function serializeChildren(node: LexicalNode): string {
  return (node.children ?? []).map(serializeNode).join('')
}

function serializeNode(node: LexicalNode): string {
  switch (node.type) {
    case 'text':
      return serializeText(node)
    case 'paragraph': {
      const inner = serializeChildren(node)
      if (!inner) return ''
      if (inner.includes('|') && inner.includes('---')) {
        return `\n\n${inner}\n\n`
      }
      return `<p>${inner}</p>`
    }
    case 'heading': {
      const tag = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(node.tag ?? '')
        ? node.tag!
        : 'h2'
      return `<${tag}>${serializeChildren(node)}</${tag}>`
    }
    case 'quote':
      return `<blockquote>${serializeChildren(node)}</blockquote>`
    case 'list': {
      const tag = node.listType === 'number' ? 'ol' : 'ul'
      return `<${tag}>${serializeChildren(node)}</${tag}>`
    }
    case 'listitem':
    case 'listItem': {
      if (typeof (node as any).checked === 'boolean') {
        const checkbox = `<input type="checkbox" disabled ${(node as any).checked ? 'checked' : ''} /> `
        return `<li>${checkbox}${serializeChildren(node)}</li>`
      }
      return `<li>${serializeChildren(node)}</li>`
    }
    case 'autolink':
    case 'link': {
      const url =
        node.fields?.url ??
        (node as any).url ??
        (node.fields as any)?.link?.url ??
        (node.fields as any)?.doc?.value?.slug ??
        '#'
      const target = node.fields?.newTab ? ' target="_blank" rel="noopener noreferrer"' : ''
      return `<a href="${escapeHtml(url)}"${target}>${serializeChildren(node)}</a>`
    }
    case 'linebreak':
      return '<br />'
    case 'horizontalrule':
      return '<hr />'
    case 'upload': {
      const url =
        node.value?.url ||
        node.value?.sizes?.hero?.url ||
        node.value?.sizes?.card?.url ||
        node.fields?.url ||
        (typeof node.value === 'string' ? node.value : '') ||
        (node.value?.filename ? `/api/media/file/${node.value.filename}` : '')
      if (!url) return ''
      return `<figure><img src="${escapeHtml(assetUrl(url))}" alt="${escapeHtml(node.value?.alt || node.fields?.caption || '')}" loading="lazy" /></figure>`
    }
    case 'relationship': {
      if (node.relationTo && node.relationTo !== 'posts' && node.relationTo !== 'briefs') {
        return ''
      }
      const val = node.value as any
      if (!val || typeof val !== 'object') return ''

      const cleanText = (t?: string) =>
        (t || '').replace(/~~(.*?)~~/g, '$1').replace(/\*\*(.*?)\*\*/g, '$1').trim()

      const title = cleanText(val.title || val.slug)
      if (!title) return ''

      const slug = val.slug || (val.id ? String(val.id) : '')
      const isBrief = node.relationTo === 'briefs'
      // 戰報沒有單獨頁，連到資訊流裡那一則的錨點
      const postUrl = slug
        ? isBrief
          ? `/feed#brief-${encodeURIComponent(slug)}`
          : `/post/${encodeURIComponent(slug)}`
        : '#'

      const excerpt = cleanText(val.excerpt || val.description || '')
      const category = val.category?.name || (typeof val.category === 'string' ? val.category : '')

      const feat = val.featuredImage
      const rawImg =
        feat?.sizes?.card?.url ||
        feat?.sizes?.hero?.url ||
        feat?.url ||
        (typeof feat === 'string' && feat.startsWith('/') ? feat : '') ||
        (feat?.filename ? `/api/media/file/${feat.filename}` : '') ||
        val.coverImage ||
        ''
      const coverUrl = rawImg ? assetUrl(rawImg) : ''

      const badgeLabel = isBrief ? '延伸快訊' : '延伸閱讀'

      const imgHtml = coverUrl
        ? `<div class="w-full md:w-44 aspect-video md:self-center shrink-0 flex-none bg-zinc-100 dark:bg-zinc-800 border-b md:border-b-0 md:border-r border-zinc-200 dark:border-zinc-800 overflow-hidden"><img src="${escapeHtml(coverUrl)}" alt="${escapeHtml(title)}" class="w-full h-full object-cover !m-0 !border-0 !rounded-none !shadow-none cover-zoom" loading="lazy" /></div>`
        : ''

      const categoryHtml = category
        ? `<span class="text-[10px] font-medium text-zinc-400 dark:text-zinc-500">· ${escapeHtml(category)}</span>`
        : ''

      const excerptHtml = excerpt
        ? `<p class="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2 !m-0 leading-relaxed mb-3">${escapeHtml(excerpt)}</p>`
        : ''

      return `<div class="my-8 not-prose"><a href="${escapeHtml(postUrl)}" target="_blank" rel="noopener noreferrer" class="related-post-card flex flex-col md:flex-row border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors shadow-sm no-underline group" style="background: none;">${imgHtml}<div class="p-4 md:p-5 flex flex-col justify-center flex-1 min-w-0"><div class="flex items-center gap-1.5 mb-1.5"><span class="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-500/10 text-red-600 dark:text-red-400 tracking-wider uppercase">${badgeLabel}</span>${categoryHtml}</div><h3 class="text-base font-bold text-zinc-900 dark:text-zinc-100 line-clamp-2 !m-0 mb-1.5 leading-snug group-hover:text-red-500 transition-colors">${escapeHtml(title)}</h3>${excerptHtml}<div class="text-[10px] text-zinc-400 dark:text-zinc-500 inline-flex items-center gap-1 font-semibold tracking-wider uppercase mt-auto"><span>閱讀全文</span><svg class="w-3 h-3 group-hover:translate-x-0.5 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg></div></div></a></div>`
    }
    default:
      return serializeChildren(node)
  }
}

export function lexicalToHtml(content: unknown): string {
  const root = (content as { root?: LexicalNode } | null | undefined)?.root
  if (!root?.children) return ''

  const output: string[] = []
  const children = root.children

  let i = 0
  while (i < children.length) {
    const node = children[i]

    // Check if this node is a markdown table row paragraph (starts and ends with |)
    const isTableRowNode = (n: LexicalNode): boolean => {
      if (n.type !== 'paragraph') return false
      const rawText = (n.children ?? []).map((c) => c.text ?? '').join('').trim()
      return rawText.startsWith('|') && rawText.endsWith('|')
    }

    if (isTableRowNode(node)) {
      const tableRows: string[] = []
      while (i < children.length && isTableRowNode(children[i])) {
        // Serialize inline formatting (bold, links, etc.) while preserving cell content
        const rowText = (children[i].children ?? []).map(serializeNode).join('')
        tableRows.push(rowText.trim())
        i++
      }
      if (tableRows.length > 0) {
        output.push(`\n\n${tableRows.join('\n')}\n\n`)
        continue
      }
    }

    output.push(serializeNode(node))
    i++
  }

  return output.join('')
}
