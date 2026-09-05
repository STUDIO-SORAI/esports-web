import { describe, expect, it } from 'vitest'
import { lexicalToHtml } from './richtext'

// 測試對象是 Payload 的 Lexical editor 存進資料庫的 JSON。
// 這些節點形狀是抄真實資料來的，不是想像出來的 —— upload 節點尤其如此，
// 它的 value 會依照 depth 與有沒有 populate 而長成好幾種樣子。

const doc = (...children: unknown[]) => ({ root: { children } })
const text = (t: string, format = 0) => ({ type: 'text', text: t, format })
const para = (...children: unknown[]) => ({ type: 'paragraph', children })

describe('lexicalToHtml / 邊界輸入', () => {
  it('null、undefined、空物件都回空字串而不是丟例外', () => {
    expect(lexicalToHtml(null)).toBe('')
    expect(lexicalToHtml(undefined)).toBe('')
    expect(lexicalToHtml({})).toBe('')
    expect(lexicalToHtml({ root: {} })).toBe('')
  })

  it('空段落不會產生空的 <p></p>', () => {
    expect(lexicalToHtml(doc(para()))).toBe('')
    expect(lexicalToHtml(doc(para(text(''))))).toBe('')
  })

  it('未知節點型別會往下走 children，不會整段吃掉', () => {
    expect(lexicalToHtml(doc({ type: 'someFutureNode', children: [text('保留我')] }))).toBe('保留我')
  })
})

describe('lexicalToHtml / 跳脫', () => {
  it('內文的 HTML 特殊字元會被跳脫', () => {
    expect(lexicalToHtml(doc(para(text('<script>alert("x")</script>'))))).toBe(
      '<p>&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;</p>',
    )
  })

  it('& 只跳脫一次，不會變成 &amp;amp;', () => {
    expect(lexicalToHtml(doc(para(text('A & B'))))).toBe('<p>A &amp; B</p>')
  })

  it('連結的 href 也會跳脫', () => {
    const link = { type: 'link', fields: { url: '/a?x=1&y=2' }, children: [text('點我')] }
    expect(lexicalToHtml(doc(para(link)))).toBe('<p><a href="/a?x=1&amp;y=2">點我</a></p>')
  })
})

describe('lexicalToHtml / 文字格式 bitmask', () => {
  it.each([
    [1, '<strong>字</strong>'],
    [2, '<em>字</em>'],
    [4, '<span class="md-highlight">字</span>'],
    [8, '<u>字</u>'],
    [16, '<code>字</code>'],
  ])('format=%i', (format, expected) => {
    expect(lexicalToHtml(doc(para(text('字', format))))).toBe(`<p>${expected}</p>`)
  })

  it('多個 flag 疊加時由內而外包起來', () => {
    // 1|2|16 = bold + italic + code
    expect(lexicalToHtml(doc(para(text('字', 19))))).toBe(
      '<p><em><strong><code>字</code></strong></em></p>',
    )
  })

  it('format 不是數字時當作沒有格式', () => {
    expect(lexicalToHtml(doc(para({ type: 'text', text: '字' })))).toBe('<p>字</p>')
  })
})

describe('lexicalToHtml / 區塊節點', () => {
  it('heading 使用自己的 tag，非法 tag 退回 h2', () => {
    expect(lexicalToHtml(doc({ type: 'heading', tag: 'h3', children: [text('標')] }))).toBe('<h3>標</h3>')
    expect(lexicalToHtml(doc({ type: 'heading', tag: 'h9', children: [text('標')] }))).toBe('<h2>標</h2>')
    expect(lexicalToHtml(doc({ type: 'heading', children: [text('標')] }))).toBe('<h2>標</h2>')
  })

  it('list 依 listType 決定 ol / ul', () => {
    const items = [{ type: 'listitem', children: [text('一')] }]
    expect(lexicalToHtml(doc({ type: 'list', listType: 'number', children: items }))).toBe('<ol><li>一</li></ol>')
    expect(lexicalToHtml(doc({ type: 'list', listType: 'bullet', children: items }))).toBe('<ul><li>一</li></ul>')
  })

  it('listItem 的兩種拼法都要認得', () => {
    const items = (type: string) => [{ type, children: [text('一')] }]
    expect(lexicalToHtml(doc({ type: 'list', children: items('listitem') }))).toBe('<ul><li>一</li></ul>')
    expect(lexicalToHtml(doc({ type: 'list', children: items('listItem') }))).toBe('<ul><li>一</li></ul>')
  })

  it('checklist 項目帶 disabled 的 checkbox', () => {
    const node = { type: 'listitem', checked: true, children: [text('做完了')] }
    expect(lexicalToHtml(doc({ type: 'list', children: [node] }))).toContain(
      '<input type="checkbox" disabled checked />',
    )
  })

  it('quote、linebreak、horizontalrule', () => {
    expect(lexicalToHtml(doc({ type: 'quote', children: [text('引')] }))).toBe('<blockquote>引</blockquote>')
    expect(lexicalToHtml(doc(para(text('a'), { type: 'linebreak' }, text('b'))))).toBe('<p>a<br />b</p>')
    expect(lexicalToHtml(doc({ type: 'horizontalrule' }))).toBe('<hr />')
  })
})

describe('lexicalToHtml / 連結', () => {
  it('newTab 會補上 target 與 rel', () => {
    const link = { type: 'link', fields: { url: 'https://x.com', newTab: true }, children: [text('外')] }
    expect(lexicalToHtml(doc(para(link)))).toBe(
      '<p><a href="https://x.com" target="_blank" rel="noopener noreferrer">外</a></p>',
    )
  })

  it('沒有 newTab 就不加 target', () => {
    const link = { type: 'link', fields: { url: '/a' }, children: [text('內')] }
    expect(lexicalToHtml(doc(para(link)))).toBe('<p><a href="/a">內</a></p>')
  })

  it('url 的四種來源依序退讓，全都沒有時退回 #', () => {
    const at = (node: object) => lexicalToHtml(doc(para({ type: 'link', children: [text('x')], ...node })))
    expect(at({ fields: { url: '/one' } })).toContain('href="/one"')
    expect(at({ url: '/two' })).toContain('href="/two"')
    expect(at({ fields: { link: { url: '/three' } } })).toContain('href="/three"')
    expect(at({ fields: { doc: { value: { slug: 'four' } } } })).toContain('href="four"')
    expect(at({})).toContain('href="#"')
  })

  it('autolink 與 link 走同一條路', () => {
    const node = { type: 'autolink', fields: { url: 'https://x.com' }, children: [text('x')] }
    expect(lexicalToHtml(doc(para(node)))).toBe('<p><a href="https://x.com">x</a></p>')
  })
})

// 這一組對應 c8b1c8a：upload 節點在不同 depth 下會拿到不同形狀的 value，
// 少接一種就是文章裡整張圖不見。
describe('lexicalToHtml / upload 節點的多種 value 形狀', () => {
  const html = (value: unknown, fields?: unknown) =>
    lexicalToHtml(doc({ type: 'upload', value, fields }))

  it('populate 過的物件，直接用 value.url', () => {
    expect(html({ url: '/media/a.png', alt: '圖說' })).toBe(
      '<figure><img src="/media/a.png" alt="圖說" loading="lazy" /></figure>',
    )
  })

  it('沒有 url 但有 sizes 時退到 hero、再退到 card', () => {
    expect(html({ sizes: { hero: { url: '/h.png' }, card: { url: '/c.png' } } })).toContain('src="/h.png"')
    expect(html({ sizes: { card: { url: '/c.png' } } })).toContain('src="/c.png"')
  })

  it('value 是字串時當成 url 用', () => {
    expect(html('/media/raw.png')).toContain('src="/media/raw.png"')
  })

  it('只有 filename 時組出 media API 路徑', () => {
    expect(html({ filename: 'photo.png' })).toContain('src="/api/media/file/photo.png"')
  })

  it('完全沒有可用來源時整個節點省略，不產生壞掉的 img', () => {
    expect(html({})).toBe('')
    expect(html(undefined)).toBe('')
    expect(html({ id: 12 })).toBe('')
  })

  it('alt 缺席時是空字串而不是 undefined', () => {
    expect(html({ url: '/a.png' })).toContain('alt=""')
  })

  it('alt 內的引號會被跳脫，不會把 attribute 撐破', () => {
    expect(html({ url: '/a.png', alt: '他說"嗨"' })).toContain('alt="他說&quot;嗨&quot;"')
  })
})

// 編輯直接在 Lexical 段落裡打 markdown 表格，這些段落要被收集起來原樣送出，
// 交給下游的 markdown 轉譯，而不是各自包成 <p>。
describe('lexicalToHtml / markdown 表格段落', () => {
  it('連續的表格列被合併成一塊，不包 <p>', () => {
    const out = lexicalToHtml(
      doc(para(text('| a | b |')), para(text('| --- | --- |')), para(text('| 1 | 2 |'))),
    )
    expect(out).toBe('\n\n| a | b |\n| --- | --- |\n| 1 | 2 |\n\n')
    expect(out).not.toContain('<p>')
  })

  it('表格前後的一般段落照常包 <p>', () => {
    const out = lexicalToHtml(doc(para(text('前')), para(text('| a |')), para(text('後'))))
    expect(out).toBe('<p>前</p>\n\n| a |\n\n<p>後</p>')
  })

  it('只是含有 | 但不是以 | 開頭結尾的段落不算表格', () => {
    expect(lexicalToHtml(doc(para(text('a | b'))))).toBe('<p>a | b</p>')
  })
})
