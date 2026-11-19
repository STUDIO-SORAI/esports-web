import { gunzipSync } from 'node:zlib'
import { IPV4_COUNTRY_GZ_B64 } from './ipv4CountryData'

export const UNKNOWN_REGION = '未知地區'

const INVALID_COUNTRY_CODES = new Set(['', 'XX', 'T1', 'A1', 'A2', 'ZZ'])

/** ISO 3166-1 alpha-2 → 繁中地區名。沒列到的國家顯示代碼本身。 */
export const COUNTRY_NAMES: Record<string, string> = {
  AD: '安道爾',
  AE: '阿拉伯聯合大公國',
  AF: '阿富汗',
  AG: '安地卡及巴布達',
  AI: '安圭拉',
  AL: '阿爾巴尼亞',
  AM: '亞美尼亞',
  AO: '安哥拉',
  AR: '阿根廷',
  AS: '美屬薩摩亞',
  AT: '奧地利',
  AU: '澳洲',
  AW: '阿魯巴',
  AZ: '亞塞拜然',
  BA: '波士尼亞',
  BB: '巴貝多',
  BD: '孟加拉',
  BE: '比利時',
  BF: '布吉納法索',
  BG: '保加利亞',
  BH: '巴林',
  BI: '蒲隆地',
  BJ: '貝南',
  BM: '百慕達',
  BN: '汶萊',
  BO: '玻利維亞',
  BR: '巴西',
  BS: '巴哈馬',
  BT: '不丹',
  BW: '波札那',
  BY: '白俄羅斯',
  BZ: '貝里斯',
  CA: '加拿大',
  CD: '剛果民主共和國',
  CF: '中非共和國',
  CG: '剛果',
  CH: '瑞士',
  CI: '象牙海岸',
  CK: '庫克群島',
  CL: '智利',
  CM: '喀麥隆',
  CN: '中國',
  CO: '哥倫比亞',
  CR: '哥斯大黎加',
  CU: '古巴',
  CV: '維德角',
  CW: '庫拉索',
  CY: '賽普勒斯',
  CZ: '捷克',
  DE: '德國',
  DJ: '吉布地',
  DK: '丹麥',
  DM: '多米尼克',
  DO: '多明尼加',
  DZ: '阿爾及利亞',
  EC: '厄瓜多',
  EE: '愛沙尼亞',
  EG: '埃及',
  ER: '厄利垂亞',
  ES: '西班牙',
  ET: '衣索比亞',
  FI: '芬蘭',
  FJ: '斐濟',
  FK: '福克蘭群島',
  FM: '密克羅尼西亞',
  FO: '法羅群島',
  FR: '法國',
  GA: '加彭',
  GB: '英國',
  GD: '格瑞那達',
  GE: '喬治亞',
  GF: '法屬圭亞那',
  GG: '根西',
  GH: '迦納',
  GI: '直布羅陀',
  GL: '格陵蘭',
  GM: '甘比亞',
  GN: '幾內亞',
  GP: '瓜地洛普',
  GQ: '赤道幾內亞',
  GR: '希臘',
  GT: '瓜地馬拉',
  GU: '關島',
  GW: '幾內亞比索',
  GY: '蓋亞那',
  HK: '香港',
  HN: '宏都拉斯',
  HR: '克羅埃西亞',
  HT: '海地',
  HU: '匈牙利',
  ID: '印尼',
  IE: '愛爾蘭',
  IL: '以色列',
  IM: '曼島',
  IN: '印度',
  IQ: '伊拉克',
  IR: '伊朗',
  IS: '冰島',
  IT: '義大利',
  JE: '澤西',
  JM: '牙買加',
  JO: '約旦',
  JP: '日本',
  KE: '肯亞',
  KG: '吉爾吉斯',
  KH: '柬埔寨',
  KI: '吉里巴斯',
  KM: '葛摩',
  KN: '聖克里斯多福',
  KP: '北韓',
  KR: '南韓',
  KW: '科威特',
  KY: '開曼群島',
  KZ: '哈薩克',
  LA: '寮國',
  LB: '黎巴嫩',
  LC: '聖露西亞',
  LI: '列支敦斯登',
  LK: '斯里蘭卡',
  LR: '賴比瑞亞',
  LS: '賴索托',
  LT: '立陶宛',
  LU: '盧森堡',
  LV: '拉脫維亞',
  LY: '利比亞',
  MA: '摩洛哥',
  MC: '摩納哥',
  MD: '摩爾多瓦',
  ME: '蒙特內哥羅',
  MF: '聖馬丁',
  MG: '馬達加斯加',
  MH: '馬紹爾群島',
  MK: '北馬其頓',
  ML: '馬利',
  MM: '緬甸',
  MN: '蒙古',
  MO: '澳門',
  MP: '北馬里亞納',
  MQ: '馬丁尼克',
  MR: '茅利塔尼亞',
  MS: '蒙哲臘',
  MT: '馬爾他',
  MU: '模里西斯',
  MV: '馬爾地夫',
  MW: '馬拉威',
  MX: '墨西哥',
  MY: '馬來西亞',
  MZ: '莫三比克',
  NA: '納米比亞',
  NC: '新喀里多尼亞',
  NE: '尼日',
  NF: '諾福克島',
  NG: '奈及利亞',
  NI: '尼加拉瓜',
  NL: '荷蘭',
  NO: '挪威',
  NP: '尼泊爾',
  NR: '諾魯',
  NU: '紐埃',
  NZ: '紐西蘭',
  OM: '阿曼',
  PA: '巴拿馬',
  PE: '秘魯',
  PF: '法屬玻里尼西亞',
  PG: '巴布亞紐幾內亞',
  PH: '菲律賓',
  PK: '巴基斯坦',
  PL: '波蘭',
  PM: '聖皮埃與密克隆',
  PR: '波多黎各',
  PS: '巴勒斯坦',
  PT: '葡萄牙',
  PW: '帛琉',
  PY: '巴拉圭',
  QA: '卡達',
  RE: '留尼旺',
  RO: '羅馬尼亞',
  RS: '塞爾維亞',
  RU: '俄羅斯',
  RW: '盧安達',
  SA: '沙烏地阿拉伯',
  SB: '索羅門群島',
  SC: '塞席爾',
  SD: '蘇丹',
  SE: '瑞典',
  SG: '新加坡',
  SI: '斯洛維尼亞',
  SK: '斯洛伐克',
  SL: '獅子山',
  SM: '聖馬利諾',
  SN: '塞內加爾',
  SO: '索馬利亞',
  SR: '蘇利南',
  SS: '南蘇丹',
  ST: '聖多美普林西比',
  SV: '薩爾瓦多',
  SX: '荷屬聖馬丁',
  SY: '敘利亞',
  SZ: '史瓦帝尼',
  TC: '土克凱可群島',
  TD: '查德',
  TG: '多哥',
  TH: '泰國',
  TJ: '塔吉克',
  TL: '東帝汶',
  TM: '土庫曼',
  TN: '突尼西亞',
  TO: '東加',
  TR: '土耳其',
  TT: '千里達',
  TV: '吐瓦魯',
  TW: '台灣',
  TZ: '坦尚尼亞',
  UA: '烏克蘭',
  UG: '烏干達',
  US: '美國',
  UY: '烏拉圭',
  UZ: '烏茲別克',
  VA: '梵蒂岡',
  VC: '聖文森',
  VE: '委內瑞拉',
  VG: '英屬維京群島',
  VI: '美屬維京群島',
  VN: '越南',
  VU: '萬那杜',
  WF: '瓦利斯與富圖納',
  WS: '薩摩亞',
  XK: '科索沃',
  YE: '葉門',
  YT: '馬約特',
  ZA: '南非',
  ZM: '尚比亞',
  ZW: '辛巴威',
}

const TIMEZONE_COUNTRY: Record<string, string> = {
  'Asia/Taipei': 'TW',
  'Asia/Hong_Kong': 'HK',
  'Asia/Macau': 'MO',
  'Asia/Macao': 'MO',
  'Asia/Shanghai': 'CN',
  'Asia/Chongqing': 'CN',
  'Asia/Harbin': 'CN',
  'Asia/Urumqi': 'CN',
  'Asia/Kashgar': 'CN',
  'Asia/Tokyo': 'JP',
  'Asia/Seoul': 'KR',
  'Asia/Singapore': 'SG',
  'Asia/Kuala_Lumpur': 'MY',
  'Asia/Bangkok': 'TH',
  'Asia/Ho_Chi_Minh': 'VN',
  'Asia/Saigon': 'VN',
  'Asia/Jakarta': 'ID',
  'Asia/Makassar': 'ID',
  'Asia/Manila': 'PH',
  'Australia/Sydney': 'AU',
  'Australia/Melbourne': 'AU',
  'Pacific/Auckland': 'NZ',
  'America/New_York': 'US',
  'America/Chicago': 'US',
  'America/Denver': 'US',
  'America/Los_Angeles': 'US',
  'America/Phoenix': 'US',
  'America/Toronto': 'CA',
  'America/Vancouver': 'CA',
  'Europe/London': 'GB',
  'Europe/Paris': 'FR',
  'Europe/Berlin': 'DE',
  'Europe/Amsterdam': 'NL',
}

type HeaderReader = {
  get(name: string): string | null
}

export type VisitorRegion = {
  country: string
  region: string
}

type Ipv4Table = {
  names: string[]
  blocks: Uint8Array
}

let ipv4Table: Ipv4Table | null = null

export function normalizeCountryCode(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const code = value.trim().toUpperCase()
  if (!/^[A-Z]{2}$/.test(code)) return null
  if (INVALID_COUNTRY_CODES.has(code)) return null
  return code
}

export function regionLabel(country: string | null | undefined): string {
  const code = normalizeCountryCode(country)
  if (!code) return UNKNOWN_REGION
  return COUNTRY_NAMES[code] || code
}

export function stripMappedIpv4(ip: string): string {
  const trimmed = ip.trim().replace(/^\[|\]$/g, '')
  const mapped = trimmed.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i)
  if (mapped) return mapped[1]
  return trimmed
}

function stripPort(ip: string): string {
  const cleaned = stripMappedIpv4(ip)
  if (cleaned.startsWith('[')) {
    const end = cleaned.indexOf(']')
    if (end > 0) return cleaned.slice(1, end)
  }
  if (/^\d+\.\d+\.\d+\.\d+:\d+$/.test(cleaned)) {
    return cleaned.replace(/:\d+$/, '')
  }
  return cleaned
}

export function isPrivateIp(ip: string): boolean {
  const value = stripPort(ip)
  if (!value) return true

  if (/^\d+\.\d+\.\d+\.\d+$/.test(value)) {
    const [a, b] = value.split('.').map(Number)
    if (a === 10 || a === 127 || a === 0) return true
    if (a === 169 && b === 254) return true
    if (a === 192 && b === 168) return true
    if (a === 172 && b >= 16 && b <= 31) return true
    return false
  }

  const v6 = value.toLowerCase()
  if (v6 === '::1' || v6 === '::') return true
  if (v6.startsWith('fe80:')) return true
  if (v6.startsWith('fc') || v6.startsWith('fd')) return true
  return false
}

export function parseForwardedIps(value: string | null | undefined): string[] {
  if (!value) return []
  return value
    .split(',')
    .map((part) => stripPort(part))
    .filter(Boolean)
}

export function extractClientIp(
  headers: HeaderReader,
  clientAddress?: string | null,
): string | null {
  const candidates = [
    headers.get('cf-connecting-ip'),
    headers.get('true-client-ip'),
    headers.get('x-real-ip'),
    ...parseForwardedIps(headers.get('x-forwarded-for')),
    clientAddress ? stripPort(clientAddress) : null,
  ].filter((ip): ip is string => Boolean(ip))

  const publicIp = candidates.find((ip) => !isPrivateIp(ip))
  return publicIp || candidates[0] || null
}

export function countryFromCdnHeaders(headers: HeaderReader): string | null {
  return (
    normalizeCountryCode(headers.get('cf-ipcountry')) ||
    normalizeCountryCode(headers.get('x-vercel-ip-country')) ||
    normalizeCountryCode(headers.get('cloudfront-viewer-country'))
  )
}

export function countryFromTimezone(timezone: unknown): string | null {
  if (typeof timezone !== 'string' || !timezone) return null
  return TIMEZONE_COUNTRY[timezone] || null
}

function loadIpv4Table(): Ipv4Table {
  if (ipv4Table) return ipv4Table
  const raw = gunzipSync(Buffer.from(IPV4_COUNTRY_GZ_B64, 'base64'))
  if (raw.toString('ascii', 0, 4) !== 'SGEO') {
    throw new Error('Invalid IPv4 country table')
  }
  const countryCount = raw.readUInt16BE(5)
  const names: string[] = []
  let offset = 8
  while (names.length < countryCount && offset < raw.length - 65536) {
    let end = offset
    while (end < raw.length && raw[end] !== 0) end++
    names.push(raw.toString('ascii', offset, end))
    offset = end + 1
  }
  const blocks = new Uint8Array(raw.subarray(raw.length - 65536))
  ipv4Table = { names, blocks }
  return ipv4Table
}

export function lookupIpv4Country(ip: string): string | null {
  const value = stripPort(ip)
  const parts = value.split('.')
  if (parts.length !== 4) return null
  const octets = parts.map(Number)
  if (octets.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return null
  if (isPrivateIp(value)) return null

  const table = loadIpv4Table()
  const block = ((octets[0] << 8) | octets[1]) & 0xffff
  const idx = table.blocks[block]
  const code = table.names[idx] || ''
  return normalizeCountryCode(code)
}

export function resolveVisitorRegion(input: {
  headers: HeaderReader
  clientAddress?: string | null
  timezone?: unknown
  lookupIp?: (ip: string) => string | null
}): VisitorRegion {
  const fromCdn = countryFromCdnHeaders(input.headers)
  if (fromCdn) {
    return { country: fromCdn, region: regionLabel(fromCdn) }
  }

  const ip = extractClientIp(input.headers, input.clientAddress)
  const lookup = input.lookupIp || lookupIpv4Country
  if (ip && !isPrivateIp(ip)) {
    const fromIp = lookup(ip)
    if (fromIp) return { country: fromIp, region: regionLabel(fromIp) }
  }

  const fromTz = countryFromTimezone(input.timezone)
  if (fromTz) {
    return { country: fromTz, region: regionLabel(fromTz) }
  }

  return { country: '', region: UNKNOWN_REGION }
}
