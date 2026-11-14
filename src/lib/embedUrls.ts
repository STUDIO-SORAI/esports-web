/**
 * 嵌入網址的解析（純函式，不碰 React）。
 * 放在 lib 是因為 Embed.tsx 會連帶 import react-tweet 的 CSS，測試環境吃不下。
 */

const YOUTUBE_URL_RE =
  /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?.*v=|embed\/|v\/|shorts\/|live\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/

/**
 * 推文網址取 ID。除了 twitter.com / x.com，也吃 vxtwitter / fxtwitter 這類
 * 貼上去才有預覽的鏡像網域（Discord 上轉貼多半長那樣），它們的路徑格式與本尊相同。
 */
const TWEET_URL_RE =
  /^https?:\/\/(?:www\.|mobile\.)?(?:twitter\.com|x\.com|vxtwitter\.com|fxtwitter\.com)\/(?:#!\/)?\w+\/status(?:es)?\/(\d+)/i

export const parseYouTubeId = (href: string): string | null => href.match(YOUTUBE_URL_RE)?.[1] ?? null

export const parseTweetId = (href: string): string | null => href.match(TWEET_URL_RE)?.[1] ?? null

/**
 * 取出 YouTube 連結上的時間戳，支援 `t=4306`、`t=4306s`、`t=1h11m46s` 與 `start=`。
 * 沒有這一段的話，embed 會忽略時間戳從頭播放。
 */
export const parseYouTubeStart = (href: string): number => {
  const raw = href.match(/[?&#]t=([^&#\s]+)/)?.[1] || href.match(/[?&#]start=([^&#\s]+)/)?.[1] || ''
  if (!raw) return 0
  if (/^\d+$/.test(raw)) return parseInt(raw, 10)

  const parts = raw.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/i)
  if (!parts || (!parts[1] && !parts[2] && !parts[3])) return 0

  return Number(parts[1] || 0) * 3600 + Number(parts[2] || 0) * 60 + Number(parts[3] || 0)
}
