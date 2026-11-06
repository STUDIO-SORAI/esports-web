import { describe, it, expect } from 'vitest'
import React from 'react'
import { renderToString } from 'react-dom/server'
import { SponsorHeaderBanner } from './SponsorHeaderBanner'

describe('SponsorHeaderBanner', () => {
  it('正確渲染支持 SORAI、支持我們更多創作與贊助連結，且無 Solana 標示', () => {
    const html = renderToString(React.createElement(SponsorHeaderBanner))
    expect(html).toContain('支持 SORAI')
    expect(html).toContain('支持我們更多創作')
    expect(html).not.toContain('Solana')
    expect(html).toContain('/sponsor')
  })
})
