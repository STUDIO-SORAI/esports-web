/**
 * 解析真實的連署來源 IP。
 *
 * 正式站跑在 Traefik 後面，Node 看到的 socket 位址是 Traefik 容器，
 * 直接拿 `clientAddress` 當限流 key 會讓全站共用同一個 5 次額度。
 * Traefik 會把真實來源「附加」在 X-Forwarded-For 的尾端，所以取最後一筆；
 * 取第一筆等於讓任何人自帶一個假 IP 就能換新的限流額度。
 */
export function resolveClientIp(input: {
  forwardedFor?: string | null
  realIp?: string | null
  socketAddress?: string | null
}): string {
  const chain = (input.forwardedFor ?? '')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)

  const candidate = chain.length > 0 ? chain[chain.length - 1] : (input.realIp ?? '').trim() || (input.socketAddress ?? '')

  // header 可以很長，截斷避免有人用超長字串撐大限流表
  return candidate.trim().slice(0, 64) || 'unknown'
}
