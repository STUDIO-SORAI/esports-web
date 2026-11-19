import { describe, it, expect } from 'vitest'
import React from 'react'
import { renderToString } from 'react-dom/server'
import { UsageMeter } from './usage-meter'

describe('UsageMeter', () => {
  it('正確渲染目標金額、當前金額與百分比', () => {
    const html = renderToString(
      React.createElement(UsageMeter, {
        label: '每月伺服器運營支出',
        current: 250,
        target: 500,
        unit: 'TWD',
      })
    )

    expect(html).toContain('每月伺服器運營支出')
    expect(html).toContain('TWD 250')
    expect(html).toContain('TWD 500')
    expect(html).toContain('50% 達成')
    expect(html).toContain('width:50%')
  })

  it('限制百分比上限為 100%', () => {
    const html = renderToString(
      React.createElement(UsageMeter, {
        label: '超額贊助測試',
        current: 800,
        target: 500,
        unit: 'TWD',
      })
    )

    expect(html).toContain('100% 達成')
    expect(html).toContain('width:100%')
  })
})
