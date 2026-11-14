import { describe, it, expect } from 'vitest'
import React from 'react'
import { renderToString } from 'react-dom/server'
import { SponsorSidebarCard } from './SponsorSidebarCard'

describe('SponsorSidebarCard', () => {
  it('在伺服器端 SSR 能正常求值並包含支持與目標，且移除 Solana 標示', () => {
    const html = renderToString(React.createElement(SponsorSidebarCard, { currentMonthlyTwd: 100 }))
    expect(html).toContain('支持 SORAI')
    expect(html).toContain('支持我們更多創作')
    expect(html).not.toContain('Solana')
    expect(html).toContain('100 / 500 TWD')
    expect(html).toContain('/sponsor')
  })
})
