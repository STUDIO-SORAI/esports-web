import { describe, expect, it } from 'vitest'
import {
  UNKNOWN_REGION,
  countryFromCdnHeaders,
  countryFromTimezone,
  extractClientIp,
  isPrivateIp,
  lookupIpv4Country,
  normalizeCountryCode,
  regionLabel,
  resolveVisitorRegion,
} from './visitorRegion'

function headers(init: Record<string, string>) {
  return new Headers(init)
}

describe('normalizeCountryCode', () => {
  it('接受兩位字母並轉大寫', () => {
    expect(normalizeCountryCode('tw')).toBe('TW')
    expect(normalizeCountryCode(' HK ')).toBe('HK')
  })

  it('拒絕 Cloudflare 的未知／匿名代碼', () => {
    expect(normalizeCountryCode('XX')).toBeNull()
    expect(normalizeCountryCode('T1')).toBeNull()
    expect(normalizeCountryCode('A1')).toBeNull()
  })

  it('拒絕空值與畸形輸入', () => {
    expect(normalizeCountryCode('')).toBeNull()
    expect(normalizeCountryCode('TWN')).toBeNull()
    expect(normalizeCountryCode(null)).toBeNull()
    expect(normalizeCountryCode(12)).toBeNull()
  })
})

describe('regionLabel', () => {
  it('把常見國家編成繁中', () => {
    expect(regionLabel('TW')).toBe('台灣')
    expect(regionLabel('hk')).toBe('香港')
    expect(regionLabel('US')).toBe('美國')
    expect(regionLabel('JP')).toBe('日本')
  })

  it('未知就顯示未知地區', () => {
    expect(regionLabel('')).toBe(UNKNOWN_REGION)
    expect(regionLabel('XX')).toBe(UNKNOWN_REGION)
    expect(regionLabel(undefined)).toBe(UNKNOWN_REGION)
  })
})

describe('isPrivateIp', () => {
  it('辨識常見私網與 loopback', () => {
    expect(isPrivateIp('127.0.0.1')).toBe(true)
    expect(isPrivateIp('10.0.1.4')).toBe(true)
    expect(isPrivateIp('192.168.1.9')).toBe(true)
    expect(isPrivateIp('172.16.0.2')).toBe(true)
    expect(isPrivateIp('172.31.255.1')).toBe(true)
    expect(isPrivateIp('::1')).toBe(true)
    expect(isPrivateIp('fd12:3456::1')).toBe(true)
  })

  it('公網 IP 不是私網', () => {
    expect(isPrivateIp('168.95.1.1')).toBe(false)
    expect(isPrivateIp('8.8.8.8')).toBe(false)
    expect(isPrivateIp('1.1.1.1')).toBe(false)
  })
})

describe('extractClientIp', () => {
  it('優先用 Cloudflare 的 connecting IP', () => {
    expect(
      extractClientIp(
        headers({
          'cf-connecting-ip': '168.95.1.1',
          'x-forwarded-for': '10.0.0.1, 172.18.0.4',
          'x-real-ip': '10.0.0.1',
        }),
        '10.0.0.1',
      ),
    ).toBe('168.95.1.1')
  })

  it('Dokploy / Traefik 只給 X-Forwarded-For 時，取第一個公網 IP', () => {
    expect(
      extractClientIp(
        headers({
          'x-forwarded-for': '61.216.1.8, 10.0.1.3, 172.18.0.2',
          'x-real-ip': '10.0.1.3',
        }),
        '172.18.0.2',
      ),
    ).toBe('61.216.1.8')
  })

  it('X-Real-IP 是公網時可以使用', () => {
    expect(
      extractClientIp(
        headers({
          'x-real-ip': '8.8.8.8',
        }),
        '127.0.0.1',
      ),
    ).toBe('8.8.8.8')
  })

  it('全部都是私網就退回第一個候選（本機 / Docker）', () => {
    expect(
      extractClientIp(
        headers({
          'x-forwarded-for': '10.0.0.8',
        }),
        '127.0.0.1',
      ),
    ).toBe('10.0.0.8')
  })
})

describe('countryFromCdnHeaders / timezone', () => {
  it('讀 CF-IPCountry', () => {
    expect(countryFromCdnHeaders(headers({ 'cf-ipcountry': 'TW' }))).toBe('TW')
    expect(countryFromCdnHeaders(headers({ 'cf-ipcountry': 'XX' }))).toBeNull()
  })

  it('時區只在對得上的時候回國家', () => {
    expect(countryFromTimezone('Asia/Taipei')).toBe('TW')
    expect(countryFromTimezone('Asia/Hong_Kong')).toBe('HK')
    expect(countryFromTimezone('Mars/Phobos')).toBeNull()
    expect(countryFromTimezone('')).toBeNull()
  })
})

describe('lookupIpv4Country', () => {
  it('中華電信 DNS 落在台灣', () => {
    expect(lookupIpv4Country('168.95.1.1')).toBe('TW')
  })

  it('Google DNS 落在美國', () => {
    expect(lookupIpv4Country('8.8.8.8')).toBe('US')
  })

  it('私網不做查表', () => {
    expect(lookupIpv4Country('127.0.0.1')).toBeNull()
    expect(lookupIpv4Country('192.168.0.1')).toBeNull()
  })
})

describe('resolveVisitorRegion', () => {
  it('CDN 國家碼優先於 IP 與時區', () => {
    const result = resolveVisitorRegion({
      headers: headers({
        'cf-ipcountry': 'JP',
        'cf-connecting-ip': '168.95.1.1',
      }),
      timezone: 'Asia/Taipei',
      lookupIp: () => 'US',
    })
    expect(result).toEqual({ country: 'JP', region: '日本' })
  })

  it('沒有 CDN header 就用公網 IP 查表', () => {
    const result = resolveVisitorRegion({
      headers: headers({
        'x-forwarded-for': '168.95.1.1, 10.0.0.2',
      }),
      timezone: 'America/New_York',
    })
    expect(result).toEqual({ country: 'TW', region: '台灣' })
  })

  it('私網 IP（本機 Docker）才退回瀏覽器時區', () => {
    const result = resolveVisitorRegion({
      headers: headers({
        'x-forwarded-for': '172.18.0.4',
      }),
      clientAddress: '10.0.0.5',
      timezone: 'Asia/Taipei',
    })
    expect(result).toEqual({ country: 'TW', region: '台灣' })
  })

  it('什麼都沒有就標未知地區', () => {
    const result = resolveVisitorRegion({
      headers: headers({}),
      clientAddress: '127.0.0.1',
    })
    expect(result).toEqual({ country: '', region: UNKNOWN_REGION })
  })

  it('不信任客戶端亂填的國家，只看 header / IP / 時區', () => {
    const result = resolveVisitorRegion({
      headers: headers({}),
      clientAddress: '127.0.0.1',
      timezone: 'not-a-zone',
    })
    expect(result.region).toBe(UNKNOWN_REGION)
  })
})
