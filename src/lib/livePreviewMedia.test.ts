import { describe, expect, it, vi } from 'vitest'
import {
  collectUnpopulatedUploadIds,
  fetchMediaByIds,
  populateUploads,
  uploadValueToId,
} from './livePreviewMedia'
import { lexicalToHtml } from './richtext'

const upload = (value: unknown) => ({ type: 'upload', value })
const doc = (...children: unknown[]) => ({ root: { type: 'root', children } })

describe('uploadValueToId', () => {
  it('數字與純數字字串是媒體 ID', () => {
    expect(uploadValueToId(12)).toBe(12)
    expect(uploadValueToId('12')).toBe('12')
  })

  it('非數字字串是既有的 raw URL 用法，不是 ID', () => {
    expect(uploadValueToId('/media/a.png')).toBeNull()
  })

  it('只有 id 的物件要補，已經帶得出來源的不用補', () => {
    expect(uploadValueToId({ id: 7 })).toBe(7)
    expect(uploadValueToId({ id: 7, url: '/media/a.png' })).toBeNull()
    expect(uploadValueToId({ id: 7, filename: 'a.png' })).toBeNull()
    expect(uploadValueToId({ id: 7, sizes: { hero: { url: '/h.png' } } })).toBeNull()
  })

  it('沒有 value 就沒有 ID', () => {
    expect(uploadValueToId(undefined)).toBeNull()
    expect(uploadValueToId({})).toBeNull()
  })
})

describe('collectUnpopulatedUploadIds', () => {
  it('挖出巢狀節點裡的 ID 並去重', () => {
    const content = doc(
      upload(12),
      { type: 'paragraph', children: [upload({ id: 12 }), upload(34)] },
      upload({ id: 56, url: '/media/ok.png' }),
    )
    expect(collectUnpopulatedUploadIds(content)).toEqual([12, 34])
  })

  it('沒有 root 或沒有 upload 節點時回空陣列', () => {
    expect(collectUnpopulatedUploadIds(null)).toEqual([])
    expect(collectUnpopulatedUploadIds(doc({ type: 'paragraph', children: [] }))).toEqual([])
  })
})

describe('populateUploads', () => {
  it('回填之後 lexicalToHtml 才產得出 img（沒回填就是空字串）', () => {
    const content = doc(upload(12))
    expect(lexicalToHtml(content)).toBe('')

    const filled = populateUploads(
      content,
      new Map([['12', { url: '/media/a.png', alt: '圖說' }]]),
    )
    expect(lexicalToHtml(filled)).toBe(
      '<figure><img src="/media/a.png" alt="圖說" loading="lazy" /></figure>',
    )
  })

  it('不改動傳進來的物件', () => {
    const content = doc(upload(12))
    populateUploads(content, new Map([['12', { url: '/media/a.png' }]]))
    expect((content.root.children[0] as any).value).toBe(12)
  })

  it('查不到的 ID 原樣留著', () => {
    const filled: any = populateUploads(doc(upload(99)), new Map())
    expect(filled.root.children[0].value).toBe(99)
  })
})

describe('fetchMediaByIds', () => {
  it('打 media API 並回傳 id -> 媒體物件', async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify({ id: 12, url: '/media/a.png' }), { status: 200 }),
    )
    const map = await fetchMediaByIds([12], fetchImpl as any)
    expect(fetchImpl.mock.calls[0][0]).toContain('/api/media/12')
    expect(map.get('12')?.url).toBe('/media/a.png')
  })

  it('API 掛掉或回 404 時安靜跳過，不丟例外', async () => {
    const boom = vi.fn(async () => {
      throw new Error('offline')
    })
    await expect(fetchMediaByIds([555], boom as any)).resolves.toEqual(new Map())

    const notFound = vi.fn(async () => new Response('', { status: 404 }))
    await expect(fetchMediaByIds([556], notFound as any)).resolves.toEqual(new Map())
  })

  it('同一個 ID 只打一次 API，第二次走快取', async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify({ id: 77, url: '/media/c.png' }), { status: 200 }),
    )
    await fetchMediaByIds([77], fetchImpl as any)
    const second = await fetchMediaByIds([77], fetchImpl as any)
    expect(fetchImpl).toHaveBeenCalledTimes(1)
    expect(second.get('77')?.url).toBe('/media/c.png')
  })
})
