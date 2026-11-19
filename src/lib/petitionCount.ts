const API_URL =
  process.env.PAYLOAD_API_URL ?? import.meta.env.PAYLOAD_API_URL ?? 'http://localhost:3000'

/**
 * 把 API 回來的數字收斂成「非負整數或 null」。
 * 公開頁面寧可整塊不顯示，也不要出現 NaN、負數或 1,234.56 這種東西。
 */
export function parseSignatureCount(value: unknown): number | null {
  const number = typeof value === 'string' && value.trim() !== '' ? Number(value) : value
  if (typeof number !== 'number' || !Number.isFinite(number) || number < 0) return null
  return Math.floor(number)
}

export async function fetchSignatureCount(): Promise<number | null> {
  try {
    const response = await fetch(`${API_URL}/api/petition-count`, {
      signal: AbortSignal.timeout(2000),
      cache: 'no-store',
    })
    if (!response.ok) return null
    const data = (await response.json()) as { count?: unknown }
    return parseSignatureCount(data?.count)
  } catch {
    return null
  }
}
