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
  value?: { url?: string; alt?: string }
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
