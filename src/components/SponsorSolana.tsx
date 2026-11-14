'use client'

import React, { useState, useEffect, useMemo, useRef } from 'react'
import QRCode from 'qrcode'
import { Copy, Check, ExternalLink, ArrowUpRight, ArrowLeft, ShieldCheck } from 'lucide-react'
import {
  buildSolanaPayUrl,
  formatAddress,
  DEFAULT_SPONSOR_WALLET,
} from '../lib/solanaPay'
import { UsageMeter, Checkbox, SkeletonBox } from './arc'

type CurrencyType = 'SOL' | 'USDC'

const PRESET_AMOUNTS: Record<CurrencyType, number[]> = {
  SOL: [0.05, 0.1, 0.25],
  USDC: [5, 10, 25],
}

interface SponsorSolanaProps {
  initialWallet?: string
  currentMonthlyTwd?: number
}

export function SponsorSolana({
  initialWallet,
  currentMonthlyTwd = 0,
}: SponsorSolanaProps) {
  const walletAddress =
    initialWallet ||
    (typeof import.meta !== 'undefined' &&
      (import.meta as any).env?.PUBLIC_SOLANA_SPONSOR_WALLET) ||
    DEFAULT_SPONSOR_WALLET

  // 流程狀態：'form' (登記聯絡方式) | 'pay' (展示付款碼)
  const [step, setStep] = useState<'form' | 'pay'>('form')

  // 登記欄位
  const [currency, setCurrency] = useState<CurrencyType>('SOL')
  const [amount, setAmount] = useState<number | null>(0.1)
  const [customInput, setCustomInput] = useState<string>('')
  const [isCustom, setIsCustom] = useState<boolean>(false)
  const [email, setEmail] = useState<string>('')
  const [contact, setContact] = useState<string>('')
  const [legalConfirmed, setLegalConfirmed] = useState<boolean>(true)

  // 驗證與傳輸狀態
  const [loading, setLoading] = useState<boolean>(false)
  const [errorMessage, setErrorMessage] = useState<string>('')
  const [sponsorId, setSponsorId] = useState<string>('')

  // 付款介面狀態
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('')
  const [copied, setCopied] = useState<boolean>(false)

  const emailInputRef = useRef<HTMLInputElement>(null)

  // 當前生效金額
  const effectiveAmount = useMemo(() => {
    if (isCustom) {
      const parsed = parseFloat(customInput)
      return !isNaN(parsed) && parsed > 0 ? parsed : null
    }
    return amount
  }, [isCustom, customInput, amount])

  // Solana Pay 協議網址（附帶鏈上 memo 追蹤碼）
  const solanaPayUrl = useMemo(() => {
    return buildSolanaPayUrl({
      recipient: walletAddress,
      amount: effectiveAmount,
      token: currency,
      label: 'SORAI ESPORTS',
      message: 'Support SORAI ESPORTS',
      memo: sponsorId || undefined,
    })
  }, [walletAddress, effectiveAmount, currency, sponsorId])

  // 生成 QR Code
  useEffect(() => {
    if (step !== 'pay' || !solanaPayUrl) return

    QRCode.toDataURL(solanaPayUrl, {
      width: 280,
      margin: 1,
      color: {
        dark: '#111111',
        light: '#ffffff',
      },
      errorCorrectionLevel: 'M',
    })
      .then((url) => setQrCodeDataUrl(url))
      .catch((err) => console.error(err))
  }, [solanaPayUrl, step])

  // 切換幣種
  const handleCurrencyChange = (c: CurrencyType) => {
    setCurrency(c)
    setIsCustom(false)
    setCustomInput('')
    setAmount(c === 'SOL' ? 0.1 : 10)
  }

  // 提交認證並取得付款碼
  const handleProceedToPay = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage('')

    const trimmedEmail = email.trim()
    if (!trimmedEmail) {
      setErrorMessage('請填寫電子信箱，以利留存備查紀錄')
      emailInputRef.current?.focus()
      return
    }

    if (!legalConfirmed) {
      setErrorMessage('請勾選確認款項來源合法')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/sponsor-kyc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: trimmedEmail,
          contact: contact.trim(),
          currency,
          amount: effectiveAmount,
          legalConfirmed,
        }),
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setErrorMessage(data.error || '認證登記失敗，請檢查輸入內容')
        setLoading(false)
        return
      }

      setSponsorId(data.sponsorId)
      setStep('pay')
    } catch {
      setErrorMessage('網路連線異常，請稍後再試')
    } finally {
      setLoading(false)
    }
  }

  // 複製地址
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(walletAddress)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      const input = document.createElement('input')
      input.value = walletAddress
      document.body.appendChild(input)
      input.select()
      document.execCommand('copy')
      document.body.removeChild(input)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    }
  }

  return (
    <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
      {/* 左側：收銀台卡片 */}
      <div className="bg-[var(--surface)] rounded-[var(--radius-panel)] p-6 sm:p-7 shadow-xs flex flex-col justify-between gap-6">
        {step === 'form' ? (
          /* 第一步：聯絡登記與金額設定 */
          <form onSubmit={handleProceedToPay} className="flex flex-col gap-5 flex-1 justify-between">
            <div className="space-y-4">
              {/* 幣種切換 */}
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-[var(--text-secondary)]">
                  選擇贊助幣種
                </span>
                <div className="grid grid-cols-2 p-1 rounded-[var(--radius-control)] bg-[var(--surface-muted)] gap-1">
                  <button
                    type="button"
                    onClick={() => handleCurrencyChange('SOL')}
                    className={`py-1.5 px-3 rounded-[calc(var(--radius-control)-4px)] text-xs font-medium transition-[background-color,color] duration-150 cursor-pointer ${
                      currency === 'SOL'
                        ? 'bg-[var(--surface)] text-[var(--foreground)] font-bold shadow-xs'
                        : 'text-[var(--text-secondary)] hover:text-[var(--foreground)]'
                    }`}
                  >
                    SOL
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCurrencyChange('USDC')}
                    className={`py-1.5 px-3 rounded-[calc(var(--radius-control)-4px)] text-xs font-medium transition-[background-color,color] duration-150 cursor-pointer ${
                      currency === 'USDC'
                        ? 'bg-[var(--surface)] text-[var(--foreground)] font-bold shadow-xs'
                        : 'text-[var(--text-secondary)] hover:text-[var(--foreground)]'
                    }`}
                  >
                    USDC
                  </button>
                </div>
              </div>

              {/* 金額選擇 Pill */}
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-[var(--text-secondary)]">
                  選擇金額
                </span>
                <div className="w-full flex items-center justify-center gap-2">
                  {PRESET_AMOUNTS[currency].map((amt) => {
                    const active = !isCustom && amount === amt
                    return (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => {
                          setIsCustom(false)
                          setAmount(amt)
                        }}
                        className={`flex-1 py-1.5 px-2 rounded-[var(--radius-control)] text-xs font-medium transition-[background-color,color] duration-150 active:scale-[0.98] cursor-pointer ${
                          active
                            ? 'bg-[var(--accent)] text-white font-bold'
                            : 'bg-[var(--surface-muted)] text-[var(--text-secondary)] hover:text-[var(--foreground)]'
                        }`}
                      >
                        {amt}
                      </button>
                    )
                  })}
                  <button
                    type="button"
                    onClick={() => {
                      if (isCustom) {
                        setIsCustom(false)
                        setAmount(currency === 'SOL' ? 0.1 : 10)
                      } else {
                        setIsCustom(true)
                      }
                    }}
                    className={`flex-1 py-1.5 px-2 rounded-[var(--radius-control)] text-xs font-medium transition-[background-color,color] duration-150 active:scale-[0.98] cursor-pointer ${
                      isCustom
                        ? 'bg-[var(--accent)] text-white font-bold'
                        : 'bg-[var(--surface-muted)] text-[var(--text-secondary)] hover:text-[var(--foreground)]'
                    }`}
                  >
                    自訂
                  </button>
                </div>

                {isCustom && (
                  <div className="relative mt-1">
                    <input
                      type="number"
                      step="any"
                      min="0"
                      placeholder="輸入自訂金額"
                      value={customInput}
                      onChange={(e) => setCustomInput(e.target.value)}
                      autoFocus
                      className="w-full px-3 py-2 pr-16 rounded-[var(--radius-control)] bg-[var(--surface-muted)] text-[var(--foreground)] text-xs placeholder:text-[var(--text-muted)] focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-[var(--text-muted)] pointer-events-none select-none">
                      {currency}
                    </span>
                  </div>
                )}
              </div>

              {/* 簡易聯絡備查 */}
              <div className="flex flex-col gap-3 pt-1">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-[var(--foreground)] flex items-center justify-between">
                    <span>電子信箱 (Email)</span>
                    <span className="text-[11px] text-[var(--accent)] font-normal">必填</span>
                  </label>
                  <input
                    ref={emailInputRef}
                    type="email"
                    required
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 rounded-[var(--radius-control)] bg-[var(--surface-muted)] text-[var(--foreground)] text-xs placeholder:text-[var(--text-muted)] focus:outline-none"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-[var(--foreground)] flex items-center justify-between">
                    <span>社群稱呼 (選填)</span>
                    <span className="text-[11px] text-[var(--text-muted)] font-normal">Discord / X / 暱稱</span>
                  </label>
                  <input
                    type="text"
                    placeholder="例如：Discord Tag 或稱呼"
                    value={contact}
                    onChange={(e) => setContact(e.target.value)}
                    className="w-full px-3 py-2 rounded-[var(--radius-control)] bg-[var(--surface-muted)] text-[var(--foreground)] text-xs placeholder:text-[var(--text-muted)] focus:outline-none"
                  />
                </div>

                {/* Arc UI Checkbox 元件 */}
                <div className="pt-1">
                  <Checkbox
                    id="legal-confirm"
                    checked={legalConfirmed}
                    onChange={(e) => setLegalConfirmed(e.target.checked)}
                    label="我確認贊助款項來源正當合法。"
                  />
                </div>
              </div>
            </div>

            {/* 錯誤資訊與提交按鈕 */}
            <div className="space-y-2 pt-2">
              {errorMessage && (
                <p className="text-xs text-rose-500 font-medium">{errorMessage}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-[var(--radius-control)] bg-[var(--accent)] hover:opacity-90 disabled:opacity-50 text-white text-xs font-bold text-center transition-opacity duration-150 active:scale-[0.98] cursor-pointer"
              >
                {loading ? '處理中...' : '確認並取得贊助付款碼'}
              </button>
            </div>
          </form>
        ) : (
          /* 第二步：解鎖顯示專屬 Solana Pay 付款碼 */
          <div className="flex flex-col items-center gap-5 flex-1 justify-between">
            {/* 登記資訊橫條與返回修改 */}
            <div className="w-full p-2.5 rounded-[var(--radius-control)] bg-[var(--surface-muted)] flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 truncate">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span className="text-[11px] font-mono text-[var(--foreground)] truncate">
                  {sponsorId}
                </span>
                <span className="text-[11px] text-[var(--text-muted)] truncate">
                  ({email})
                </span>
              </div>
              <button
                type="button"
                onClick={() => setStep('form')}
                className="text-[11px] text-[var(--text-secondary)] hover:text-[var(--foreground)] font-medium shrink-0 flex items-center gap-0.5 transition-colors duration-150 cursor-pointer"
              >
                <ArrowLeft className="w-3 h-3" />
                <span>修改</span>
              </button>
            </div>

            {/* QR Code */}
            <div className="p-3 bg-white rounded-[var(--radius-panel)] shadow-sm flex items-center justify-center my-auto">
              {qrCodeDataUrl ? (
                <img
                  src={qrCodeDataUrl}
                  alt="Solana Pay QR Code"
                  className="w-44 h-44 object-contain"
                />
              ) : (
                <SkeletonBox width={176} height={176} radius={12} className="w-44 h-44" />
              )}
            </div>

            {/* 掃碼說明與操作按鈕 */}
            <div className="w-full space-y-3">
              <div className="text-center space-y-0.5">
                <p className="text-xs font-medium text-[var(--foreground)]">
                  {effectiveAmount ? `${effectiveAmount} ${currency}` : '任意金額'} • 相機或錢包掃碼
                </p>
                <p className="text-[11px] text-[var(--text-muted)]">
                  Phantom • Backpack • Solflare
                </p>
              </div>

              <div className="w-full flex flex-col gap-2">
                <a
                  href={solanaPayUrl}
                  className="w-full py-2.5 px-4 rounded-[var(--radius-control)] bg-[var(--accent)] hover:opacity-90 text-white text-xs font-bold text-center transition-opacity duration-150 active:scale-[0.98] flex items-center justify-center gap-1.5"
                >
                  <span>開啟錢包支付</span>
                  <ArrowUpRight className="w-3.5 h-3.5 opacity-80" />
                </a>

                <button
                  type="button"
                  onClick={handleCopy}
                  className="w-full py-2 px-3 rounded-[var(--radius-control)] bg-[var(--surface-muted)] hover:bg-[var(--surface-muted)]/80 text-xs text-[var(--text-secondary)] hover:text-[var(--foreground)] flex items-center justify-between transition-[background-color,color] duration-150 active:scale-[0.98] cursor-pointer"
                >
                  <span className="font-mono text-[11px] text-[var(--foreground)]">
                    {formatAddress(walletAddress, 6)}
                  </span>
                  <span className="flex items-center gap-1 text-[11px]">
                    {copied ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-500" />
                        <span className="text-emerald-500 font-medium">已複製</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>複製地址</span>
                      </>
                    )}
                  </span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 右側：說明與對稱卡片（與左側像素級等高齊平） */}
      <div className="bg-[var(--surface)] rounded-[var(--radius-panel)] p-6 sm:p-7 shadow-xs flex flex-col justify-between gap-6">
        <div className="space-y-5">
          {/* Arc UI Usage Meter（統一新台幣 TWD 單位） */}
          <UsageMeter
            label="本月伺服器支出目標"
            sublabel="雲端主機費用"
            current={currentMonthlyTwd}
            target={500}
            unit="TWD"
            note="社群贊助實時累計"
          />

          <div className="space-y-4 pt-1">
            <div className="space-y-1">
              <h3 className="text-xs font-bold text-[var(--foreground)]">
                為什麼需要留存聯絡方式？
              </h3>
              <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed font-normal">
                為維護獨立報導資金透明與防杜爭議款項，贊助前留存基本信箱與鏈上記錄對應，確保雙方權益。
              </p>
            </div>

            <div className="space-y-1">
              <h3 className="text-xs font-bold text-[var(--foreground)]">
                為什麼使用 Solana Pay？
              </h3>
              <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed font-normal">
                無第三方抽成，每筆手續費低於 0.00025 美元，一旦付款款項 100% 將會用於 SORAI ESPORTS 的營運。
              </p>
            </div>

            <div className="space-y-1">
              <h3 className="text-xs font-bold text-[var(--foreground)]">
                支援錢包
              </h3>
              <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed font-normal">
                Phantom、Backpack、Solflare、OKX 等主流 Solana 錢包皆可直接掃碼。
              </p>
            </div>
          </div>
        </div>

        {/* 底部鏈上資訊（與左側底部操作列齊平） */}
        <div className="p-3 rounded-[var(--radius-control)] bg-[var(--surface-muted)] flex items-center justify-between text-xs text-[var(--text-secondary)]">
          <span className="text-[11px] font-medium text-[var(--text-muted)]">
            Solana Mainnet-Beta
          </span>
          <a
            href={`https://solscan.io/account/${walletAddress}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[var(--foreground)] hover:text-[var(--accent)] font-medium transition-colors duration-150"
          >
            <span>在 Solscan 檢視</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  )
}
