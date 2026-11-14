import { describe, it, expect } from 'vitest'
import React from 'react'
import { renderToString } from 'react-dom/server'
import { Checkbox } from './checkbox'

describe('Checkbox', () => {
  it('正確渲染標籤與說明', () => {
    const html = renderToString(
      React.createElement(Checkbox, {
        label: '我已閱讀條款',
        description: '這是說明文字',
        checked: true,
        readOnly: true,
      })
    )

    expect(html).toContain('我已閱讀條款')
    expect(html).toContain('這是說明文字')
    expect(html).toContain('bg-[var(--accent)]')
  })

  it('未選中時為 surface-muted 樣式', () => {
    const html = renderToString(
      React.createElement(Checkbox, {
        label: '未選中測試',
        checked: false,
        readOnly: true,
      })
    )

    expect(html).toContain('bg-[var(--surface-muted)]')
  })
})
