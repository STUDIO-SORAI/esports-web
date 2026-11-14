import { describe, it, expect } from 'vitest'
import React from 'react'
import { renderToString } from 'react-dom/server'
import { SponsorTiers } from './SponsorTiers'

describe('SponsorTiers', () => {
  it('在伺服器端 SSR 能正常求值並包含更多贊助方案計畫與洽談合作按鈕', () => {
    const html = renderToString(React.createElement(SponsorTiers))
    expect(html).toContain('更多贊助方案計畫 / 組織合作計畫')
    expect(html).toContain('首頁動態膠囊')
    expect(html).toContain('首頁與新聞內頁廣告圖片')
    expect(html).toContain('新聞專題冠名')
    expect(html).toContain('洽談合作')
    expect(html).not.toContain('客製')
    expect(html).toContain('studio@sorai.tw')
  })
})
