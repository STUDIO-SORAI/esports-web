/**
 * Solana Pay 協議參數與 URL 建構工具
 * 規格遵循：https://github.com/solana-labs/solana-pay/blob/master/SPEC.md
 */

export const SOLANA_USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
export const DEFAULT_SPONSOR_WALLET = 'HA3EyyrqcdqmtBsLJ6C6qVNXEUo91WKnm41M7RGSWWqy'

export interface SolanaPayOptions {
  recipient: string
  amount?: number | string | null
  token?: 'SOL' | 'USDC'
  splToken?: string
  label?: string
  message?: string
  memo?: string
}

/**
 * 建立標準 Solana Pay 轉帳請求 URI
 * 格式：solana:<recipient>?amount=<amount>&spl-token=<mint>&label=<label>&message=<message>
 */
export function buildSolanaPayUrl(options: SolanaPayOptions): string {
  const recipient = (options.recipient || '').trim()
  if (!recipient) {
    return ''
  }

  const params = new URLSearchParams()

  // 處理金額
  if (options.amount !== undefined && options.amount !== null && options.amount !== '') {
    const num = Number(options.amount)
    if (!Number.isNaN(num) && num > 0) {
      // 避免浮點數精準度問題，格式化為精簡小數
      params.set('amount', num.toString())
    }
  }

  // 處理 SPL Token (如 USDC)
  if (options.token === 'USDC') {
    params.set('spl-token', options.splToken || SOLANA_USDC_MINT)
  } else if (options.splToken) {
    params.set('spl-token', options.splToken)
  }

  // 標籤 (收款人/店家名稱)
  if (options.label) {
    params.set('label', options.label)
  }

  // 備註訊息
  if (options.message) {
    params.set('message', options.message)
  }

  // 鏈上 Memo
  if (options.memo) {
    params.set('memo', options.memo)
  }

  const query = params.toString()
  return query ? `solana:${recipient}?${query}` : `solana:${recipient}`
}

/**
 * 格式化錢包地址為前後簡寫顯示 (例如：7xKX...gAsU)
 */
export function formatAddress(address: string, chars = 4): string {
  if (!address) return ''
  if (address.length <= chars * 2 + 3) return address
  return `${address.slice(0, chars)}...${address.slice(-chars)}`
}
