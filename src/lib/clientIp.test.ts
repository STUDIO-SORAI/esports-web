import { describe, expect, it } from 'vitest'

import { resolveClientIp } from './clientIp'

describe('resolveClientIp', () => {
  it('取 X-Forwarded-For 的最後一筆（Traefik 把真實來源附加在尾端）', () => {
    expect(resolveClientIp({ forwardedFor: '203.0.113.9, 198.51.100.4, 192.0.2.1' })).toBe('192.0.2.1')
  })

  it('不會被客戶端自帶的假 IP 騙走（第一筆忽略）', () => {
    // 攻擊者送 1.1.1.1，Traefik 追加真實來源 203.0.113.7
    expect(resolveClientIp({ forwardedFor: '1.1.1.1, 203.0.113.7' })).toBe('203.0.113.7')
    expect(resolveClientIp({ forwardedFor: '1.1.1.1, 203.0.113.7' })).not.toBe('1.1.1.1')
  })

  it('會清掉空白與空欄位', () => {
    expect(resolveClientIp({ forwardedFor: ' 1.1.1.1 , ,  203.0.113.7 , ' })).toBe('203.0.113.7')
  })

  it('沒有 X-Forwarded-For 時退回 X-Real-IP', () => {
    expect(resolveClientIp({ forwardedFor: null, realIp: '203.0.113.20' })).toBe('203.0.113.20')
    expect(resolveClientIp({ forwardedFor: '  ', realIp: ' 203.0.113.21 ' })).toBe('203.0.113.21')
  })

  it('兩者都沒有時才用 socket 位址', () => {
    expect(resolveClientIp({ socketAddress: '127.0.0.1' })).toBe('127.0.0.1')
    expect(resolveClientIp({ forwardedFor: '', realIp: '', socketAddress: '::1' })).toBe('::1')
  })

  it('什麼都沒有時回 unknown，不會產生 undefined 的限流 key', () => {
    expect(resolveClientIp({})).toBe('unknown')
  })

  it('超長 header 會截斷，避免撐大限流表', () => {
    const ip = resolveClientIp({ forwardedFor: 'x'.repeat(500) })
    expect(ip).toHaveLength(64)
  })

  it('IPv6 也能正常解析', () => {
    expect(resolveClientIp({ forwardedFor: '2001:db8::1, 2001:db8::2' })).toBe('2001:db8::2')
  })
})
