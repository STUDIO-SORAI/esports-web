import { DEFAULT_SPONSOR_WALLET, SOLANA_USDC_MINT } from './solanaPay'

const procEnv = typeof process !== 'undefined' ? process.env : undefined

const API_URL =
  procEnv?.PAYLOAD_API_URL ??
  (typeof import.meta !== 'undefined' ? (import.meta as any).env?.PAYLOAD_API_URL : undefined) ??
  'http://localhost:3000'

export const DEFAULT_MONTHLY_TARGET_TWD = 500
export const DEFAULT_SOLANA_RPC_URL = 'https://api.mainnet-beta.solana.com'
export const ONCHAIN_CACHE_TTL_MS = 3 * 60 * 1000
export const RATE_CACHE_TTL_MS = 10 * 60 * 1000
const MAX_SIGNATURE_PAGES = 5
const SIGNATURE_PAGE_LIMIT = 100
const TX_BATCH_SIZE = 10

export interface SponsorStats {
  currentMonthlyTwd: number
  targetMonthlyTwd: number
  solAmount: number
  usdcAmount: number
  manualAdjustmentTwd: number
  walletAddress: string
  yearMonth: string
  updatedAt: string
}

export interface SponsorSettingsConfig {
  monthlyTargetTwd: number
  manualAdjustmentTwd: number
  walletAddress: string
}

export interface SolanaTwdRates {
  solTwd: number
  usdcTwd: number
}

export interface FetchSponsorStatsOptions {
  fetchImpl?: typeof fetch
  now?: Date
  rpcUrl?: string
  bypassCache?: boolean
}

let rateCache: { data: SolanaTwdRates; timestamp: number } | null = null
const onChainCache = new Map<
  string,
  { data: { solAmount: number; usdcAmount: number }; timestamp: number }
>()
const inFlightOnChain = new Map<string, Promise<{ solAmount: number; usdcAmount: number }>>()

export function __resetSponsorStatsCacheForTest(): void {
  rateCache = null
  onChainCache.clear()
  inFlightOnChain.clear()
}

export function parsePositiveNumber(value: unknown): number | null {
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return null
    const parsed = Number(trimmed)
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null
  }
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return value
  }
  return null
}

export function parseFiniteNumber(value: unknown): number | null {
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return null
    const parsed = Number(trimmed)
    return Number.isFinite(parsed) ? parsed : null
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }
  return null
}

/**
 * 依台灣時間 (Asia/Taipei) 取得本月起訖 Unix 秒數。
 * 台灣無夏令時間，固定為 UTC+8。
 */
export function getTaipeiMonthRange(now: Date = new Date()): {
  yearMonth: string
  startUnix: number
  endUnix: number
} {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Taipei',
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(now)

  const year = Number(parts.find((p) => p.type === 'year')?.value)
  const month = Number(parts.find((p) => p.type === 'month')?.value)
  const monthStr = String(month).padStart(2, '0')
  const nextYear = month === 12 ? year + 1 : year
  const nextMonthStr = String(month === 12 ? 1 : month + 1).padStart(2, '0')

  const startMs = Date.parse(`${year}-${monthStr}-01T00:00:00+08:00`)
  const endMs = Date.parse(`${nextYear}-${nextMonthStr}-01T00:00:00+08:00`)

  return {
    yearMonth: `${year}-${monthStr}`,
    startUnix: Math.floor(startMs / 1000),
    endUnix: Math.floor(endMs / 1000),
  }
}

export function resolveMonthlyTargetTwd(
  cmsValue?: unknown,
  envValue?: unknown,
): number {
  const fromCms = parsePositiveNumber(cmsValue)
  if (fromCms !== null) return Math.round(fromCms)

  const fromEnv = parsePositiveNumber(envValue)
  if (fromEnv !== null) return Math.round(fromEnv)

  return DEFAULT_MONTHLY_TARGET_TWD
}

export function resolveWalletAddress(
  cmsValue?: unknown,
  envValue?: unknown,
): string {
  if (typeof cmsValue === 'string' && cmsValue.trim()) {
    return cmsValue.trim()
  }
  if (typeof envValue === 'string' && envValue.trim()) {
    return envValue.trim()
  }
  return DEFAULT_SPONSOR_WALLET
}

function getEnvMonthlyTarget(): unknown {
  return (
    procEnv?.SPONSOR_MONTHLY_TARGET_TWD ??
    procEnv?.PUBLIC_SPONSOR_MONTHLY_TARGET_TWD ??
    (typeof import.meta !== 'undefined'
      ? (import.meta as any).env?.SPONSOR_MONTHLY_TARGET_TWD ??
        (import.meta as any).env?.PUBLIC_SPONSOR_MONTHLY_TARGET_TWD
      : undefined)
  )
}

function getEnvWalletAddress(): unknown {
  return (
    procEnv?.SOLANA_SPONSOR_WALLET ??
    procEnv?.PUBLIC_SOLANA_SPONSOR_WALLET ??
    (typeof import.meta !== 'undefined'
      ? (import.meta as any).env?.SOLANA_SPONSOR_WALLET ??
        (import.meta as any).env?.PUBLIC_SOLANA_SPONSOR_WALLET
      : undefined)
  )
}

function getSolanaRpcUrl(overrideUrl?: string): string {
  return (
    overrideUrl ||
    procEnv?.SOLANA_RPC_URL ||
    (typeof import.meta !== 'undefined' ? (import.meta as any).env?.SOLANA_RPC_URL : undefined) ||
    DEFAULT_SOLANA_RPC_URL
  )
}

/**
 * 從 Solana parsed transaction 取出轉入指定錢包的 SOL 與 USDC 淨增加額。
 * 只計算該筆交易中受款錢包餘額「淨增加」的數量（> 0），忽略轉出或失敗交易。
 */
export function extractIncomingFromTx(
  tx: any,
  walletAddress: string,
  usdcMint: string = SOLANA_USDC_MINT,
): { sol: number; usdc: number } {
  if (!tx || !tx.meta || tx.meta.err !== null && tx.meta.err !== undefined) {
    return { sol: 0, usdc: 0 }
  }

  let sol = 0
  let usdc = 0

  const staticKeys: any[] = Array.isArray(tx.transaction?.message?.accountKeys)
    ? tx.transaction.message.accountKeys
    : []
  const loadedWritable: any[] = Array.isArray(tx.meta.loadedAddresses?.writable)
    ? tx.meta.loadedAddresses.writable
    : []
  const loadedReadonly: any[] = Array.isArray(tx.meta.loadedAddresses?.readonly)
    ? tx.meta.loadedAddresses.readonly
    : []
  const allKeys = [...staticKeys, ...loadedWritable, ...loadedReadonly]

  const walletIndex = allKeys.findIndex(
    (entry) => (typeof entry === 'string' ? entry : entry?.pubkey) === walletAddress,
  )

  if (
    walletIndex >= 0 &&
    Array.isArray(tx.meta.preBalances) &&
    Array.isArray(tx.meta.postBalances)
  ) {
    const pre = Number(tx.meta.preBalances[walletIndex])
    const post = Number(tx.meta.postBalances[walletIndex])
    if (Number.isFinite(pre) && Number.isFinite(post) && post > pre) {
      sol = (post - pre) / 1_000_000_000
    }
  }

  const preTokens: any[] = Array.isArray(tx.meta.preTokenBalances)
    ? tx.meta.preTokenBalances
    : []
  const postTokens: any[] = Array.isArray(tx.meta.postTokenBalances)
    ? tx.meta.postTokenBalances
    : []

  const preByIndex = new Map<number, any>()
  for (const pre of preTokens) {
    if (typeof pre?.accountIndex === 'number') {
      preByIndex.set(pre.accountIndex, pre)
    }
  }

  for (const post of postTokens) {
    if (post?.mint !== usdcMint || post?.owner !== walletAddress) continue
    if (typeof post?.accountIndex !== 'number') continue

    const pre = preByIndex.get(post.accountIndex)
    const decimals = Number(
      post?.uiTokenAmount?.decimals ?? pre?.uiTokenAmount?.decimals ?? 6,
    )
    const postRaw = Number(post?.uiTokenAmount?.amount ?? 0)
    const preRaw = Number(pre?.uiTokenAmount?.amount ?? 0)

    if (
      Number.isFinite(postRaw) &&
      Number.isFinite(preRaw) &&
      Number.isFinite(decimals) &&
      postRaw > preRaw
    ) {
      usdc += (postRaw - preRaw) / 10 ** decimals
    }
  }

  return { sol, usdc }
}

export async function fetchSponsorSettings(
  fetchImpl: typeof fetch = fetch,
): Promise<SponsorSettingsConfig> {
  const envTarget = getEnvMonthlyTarget()
  const envWallet = getEnvWalletAddress()

  try {
    const res = await fetchImpl(`${API_URL}/api/globals/sponsor-settings`, {
      signal: AbortSignal.timeout(1200),
      cache: 'no-store',
    })
    if (res.ok) {
      const data = await res.json()
      return {
        monthlyTargetTwd: resolveMonthlyTargetTwd(data?.monthlyTargetTwd, envTarget),
        manualAdjustmentTwd: parseFiniteNumber(data?.manualAdjustmentTwd) ?? 0,
        walletAddress: resolveWalletAddress(data?.walletAddress, envWallet),
      }
    }
  } catch {
    // CMS 暫時不可用時退回環境變數與預設值
  }

  return {
    monthlyTargetTwd: resolveMonthlyTargetTwd(undefined, envTarget),
    manualAdjustmentTwd: 0,
    walletAddress: resolveWalletAddress(undefined, envWallet),
  }
}

export async function fetchSolanaTwdRates(
  fetchImpl: typeof fetch = fetch,
  bypassCache = false,
): Promise<SolanaTwdRates> {
  const now = Date.now()
  if (!bypassCache && rateCache && now - rateCache.timestamp < RATE_CACHE_TTL_MS) {
    return rateCache.data
  }

  try {
    const res = await fetchImpl(
      'https://api.coingecko.com/api/v3/simple/price?ids=solana,usd-coin&vs_currencies=twd',
      {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(3000),
      },
    )
    if (res.ok) {
      const json = await res.json()
      const solTwd = parsePositiveNumber(json?.solana?.twd)
      const usdcTwd = parsePositiveNumber(json?.['usd-coin']?.twd)
      if (solTwd !== null && usdcTwd !== null) {
        const rates = { solTwd, usdcTwd }
        rateCache = { data: rates, timestamp: now }
        return rates
      }
    }
  } catch {
    // fallback to Coinbase
  }

  try {
    const [solRes, usdcRes] = await Promise.all([
      fetchImpl('https://api.coinbase.com/v2/exchange-rates?currency=SOL', {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(3000),
      }),
      fetchImpl('https://api.coinbase.com/v2/exchange-rates?currency=USDC', {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(3000),
      }),
    ])
    if (solRes.ok && usdcRes.ok) {
      const [solJson, usdcJson] = await Promise.all([solRes.json(), usdcRes.json()])
      const solTwd = parsePositiveNumber(solJson?.data?.rates?.TWD)
      const usdcTwd = parsePositiveNumber(usdcJson?.data?.rates?.TWD)
      if (solTwd !== null && usdcTwd !== null) {
        const rates = { solTwd, usdcTwd }
        rateCache = { data: rates, timestamp: now }
        return rates
      }
    }
  } catch {
    // fallback to stale cache
  }

  if (rateCache) {
    return rateCache.data
  }

  return { solTwd: 0, usdcTwd: 32 }
}

async function rpcCall<T = any>(
  rpcUrl: string,
  method: string,
  params: any[],
  fetchImpl: typeof fetch,
): Promise<T> {
  const res = await fetchImpl(rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method,
      params,
    }),
    signal: AbortSignal.timeout(4500),
  })
  if (!res.ok) {
    throw new Error(`Solana RPC ${method} HTTP ${res.status}`)
  }
  const json = await res.json()
  if (json?.error) {
    throw new Error(`Solana RPC ${method} error: ${json.error.message || JSON.stringify(json.error)}`)
  }
  return json.result as T
}

async function rpcBatchTransactions(
  rpcUrl: string,
  signatures: string[],
  fetchImpl: typeof fetch,
): Promise<any[]> {
  if (signatures.length === 0) return []

  const results: any[] = []
  for (let i = 0; i < signatures.length; i += TX_BATCH_SIZE) {
    const chunk = signatures.slice(i, i + TX_BATCH_SIZE)
    const batchPayload = chunk.map((sig, idx) => ({
      jsonrpc: '2.0',
      id: idx + 1,
      method: 'getTransaction',
      params: [
        sig,
        {
          encoding: 'jsonParsed',
          maxSupportedTransactionVersion: 0,
        },
      ],
    }))

    let chunkTxs: any[] | null = null
    try {
      const res = await fetchImpl(rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(batchPayload),
        signal: AbortSignal.timeout(5000),
      })
      if (res.ok) {
        const json = await res.json()
        if (Array.isArray(json)) {
          const byId = new Map<number, any>(
            json.map((item: any) => [Number(item?.id), item?.result ?? null]),
          )
          chunkTxs = chunk.map((_, idx) => byId.get(idx + 1) ?? null)
        }
      }
    } catch {
      chunkTxs = null
    }

    if (chunkTxs === null) {
      chunkTxs = await Promise.all(
        chunk.map((sig) =>
          rpcCall(
            rpcUrl,
            'getTransaction',
            [sig, { encoding: 'jsonParsed', maxSupportedTransactionVersion: 0 }],
            fetchImpl,
          ).catch(() => null),
        ),
      )
    }

    results.push(...chunkTxs)
  }

  return results
}

async function collectMonthlySignatures(
  rpcUrl: string,
  address: string,
  startUnix: number,
  endUnix: number,
  fetchImpl: typeof fetch,
): Promise<string[]> {
  const signatures: string[] = []
  let before: string | undefined

  for (let page = 0; page < MAX_SIGNATURE_PAGES; page++) {
    const options: Record<string, any> = { limit: SIGNATURE_PAGE_LIMIT }
    if (before) options.before = before

    const list = await rpcCall<any[]>(
      rpcUrl,
      'getSignaturesForAddress',
      [address, options],
      fetchImpl,
    )

    if (!Array.isArray(list) || list.length === 0) break

    let reachedBeforeMonth = false
    for (const item of list) {
      const blockTime = item?.blockTime
      if (typeof blockTime === 'number' && blockTime < startUnix) {
        reachedBeforeMonth = true
        break
      }
      if (
        item?.err === null &&
        typeof item?.signature === 'string' &&
        typeof blockTime === 'number' &&
        blockTime >= startUnix &&
        blockTime < endUnix
      ) {
        signatures.push(item.signature)
      }
    }

    if (reachedBeforeMonth || list.length < SIGNATURE_PAGE_LIMIT) break
    const lastSig = list[list.length - 1]?.signature
    if (!lastSig) break
    before = lastSig
  }

  return signatures
}

export async function fetchOnChainMonthlyTotals(
  walletAddress: string,
  options: {
    fetchImpl?: typeof fetch
    now?: Date
    rpcUrl?: string
    bypassCache?: boolean
  } = {},
): Promise<{ solAmount: number; usdcAmount: number; yearMonth: string }> {
  const fetchImpl = options.fetchImpl ?? fetch
  const nowDate = options.now ?? new Date()
  const { yearMonth, startUnix, endUnix } = getTaipeiMonthRange(nowDate)
  const rpcUrl = getSolanaRpcUrl(options.rpcUrl)
  const cacheKey = `${walletAddress}:${yearMonth}`

  const nowMs = Date.now()
  const cached = onChainCache.get(cacheKey)
  if (!options.bypassCache && cached && nowMs - cached.timestamp < ONCHAIN_CACHE_TTL_MS) {
    return { ...cached.data, yearMonth }
  }

  const existingInFlight = inFlightOnChain.get(cacheKey)
  if (!options.bypassCache && existingInFlight) {
    const data = await existingInFlight
    return { ...data, yearMonth }
  }

  const task = (async () => {
    // 1. 取得受款錢包名下的 USDC Token Account（ATA），避免直接轉 USDC 到 ATA 時漏抓簽章
    let usdcAccounts: string[] = []
    try {
      const tokenRes = await rpcCall<{ value?: any[] }>(
        rpcUrl,
        'getTokenAccountsByOwner',
        [walletAddress, { mint: SOLANA_USDC_MINT }, { encoding: 'jsonParsed' }],
        fetchImpl,
      )
      usdcAccounts = Array.isArray(tokenRes?.value)
        ? tokenRes.value.map((acc) => acc?.pubkey).filter((pk): pk is string => Boolean(pk))
        : []
    } catch {
      usdcAccounts = []
    }

    // 2. 掃描主錢包與 USDC Token Account 在本月內的交易簽章並去重
    const addressesToScan = Array.from(new Set([walletAddress, ...usdcAccounts]))
    const sigLists = await Promise.all(
      addressesToScan.map((addr) =>
        collectMonthlySignatures(rpcUrl, addr, startUnix, endUnix, fetchImpl),
      ),
    )
    const uniqueSignatures = Array.from(new Set(sigLists.flat()))

    // 3. 解析每筆交易實際轉入的 SOL / USDC
    const txs = await rpcBatchTransactions(rpcUrl, uniqueSignatures, fetchImpl)
    let solAmount = 0
    let usdcAmount = 0
    for (const tx of txs) {
      const incoming = extractIncomingFromTx(tx, walletAddress, SOLANA_USDC_MINT)
      solAmount += incoming.sol
      usdcAmount += incoming.usdc
    }

    const data = { solAmount, usdcAmount }
    onChainCache.set(cacheKey, { data, timestamp: Date.now() })
    return data
  })()

  inFlightOnChain.set(cacheKey, task)
  try {
    const data = await task
    return { ...data, yearMonth }
  } catch (err) {
    if (cached) {
      return { ...cached.data, yearMonth }
    }
    throw err
  } finally {
    inFlightOnChain.delete(cacheKey)
  }
}

export async function fetchMonthlySponsorStats(
  options: FetchSponsorStatsOptions = {},
): Promise<SponsorStats> {
  const fetchImpl = options.fetchImpl ?? fetch
  const now = options.now ?? new Date()
  const { yearMonth } = getTaipeiMonthRange(now)

  const settings = await fetchSponsorSettings(fetchImpl)

  let solAmount = 0
  let usdcAmount = 0

  const [onChainResult, rates] = await Promise.all([
    fetchOnChainMonthlyTotals(settings.walletAddress, {
      fetchImpl,
      now,
      rpcUrl: options.rpcUrl,
      bypassCache: options.bypassCache,
    }).catch((err) => {
      console.warn('[SponsorStats] Solana on-chain fetch failed:', err?.message || err)
      return null
    }),
    fetchSolanaTwdRates(fetchImpl, options.bypassCache).catch(() => ({
      solTwd: 0,
      usdcTwd: 32,
    })),
  ])

  if (onChainResult) {
    solAmount = onChainResult.solAmount
    usdcAmount = onChainResult.usdcAmount
  }

  const onChainTwd = solAmount * rates.solTwd + usdcAmount * rates.usdcTwd
  const currentMonthlyTwd = Math.max(
    0,
    Math.round(onChainTwd + settings.manualAdjustmentTwd),
  )

  return {
    currentMonthlyTwd,
    targetMonthlyTwd: settings.monthlyTargetTwd,
    solAmount,
    usdcAmount,
    manualAdjustmentTwd: settings.manualAdjustmentTwd,
    walletAddress: settings.walletAddress,
    yearMonth,
    updatedAt: now.toISOString(),
  }
}
