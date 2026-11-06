'use client'

import React, { useState } from 'react'
import {
  Mail,
  Copy,
  Check,
  ArrowUpRight,
  Layers,
  Layout,
  Newspaper,
} from 'lucide-react'

const STUDIO_EMAIL = 'studio@sorai.tw'

const PLANS = [
  {
    title: '首頁動態膠囊',
    englishTitle: 'Homepage Capsules',
    icon: Layers,
    description:
      '預計置於首頁最新新聞下方，以極簡動態膠囊形式展示品牌標誌與名稱，並支援專屬導外連結。',
    subject: 'SORAI 合作洽談：首頁動態膠囊',
  },
  {
    title: '首頁與新聞內頁廣告圖片',
    englishTitle: 'Display Banners',
    icon: Layout,
    description:
      '於首頁焦點版位或新聞專題正文內嵌入高畫質橫幅圖片，自然融入版面排版，精準觸及核心電競族群。',
    subject: 'SORAI 合作洽談：首頁與新聞內頁廣告圖片',
  },
  {
    title: '新聞專題冠名',
    englishTitle: 'Editorial Feature Sponsorship',
    icon: Newspaper,
    description:
      '針對重大電競新聞報導、賽事戰報或轉會分析提供專題冠名露出，建立品牌形象與深厚讀者心智連結。',
    subject: 'SORAI 合作洽談：新聞專題冠名',
  },
]

export function SponsorTiers() {
  const [copied, setCopied] = useState(false)

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(STUDIO_EMAIL).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="w-full flex flex-col gap-6">
      {/* 標題與簡介 */}
      <div>
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--foreground)]">
          更多贊助方案計畫 / 組織合作計畫
        </h2>
        <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1.5 leading-relaxed">
          歡迎品牌、俱樂部與各類組織攜手合作，支持電競獨立媒體深度報導。
        </p>
      </div>

      {/* 3 欄方案卡片（Arc UI Stroke-Free 風格） */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
        {PLANS.map((plan) => {
          const IconComponent = plan.icon
          return (
            <div
              key={plan.title}
              className="rounded-[var(--radius-panel)] bg-[var(--surface)] p-5 sm:p-6 shadow-xs flex flex-col justify-between gap-6 hover:shadow-md transition-[box-shadow,transform] duration-200"
            >
              <div className="space-y-3">
                <div className="w-8 h-8 rounded-[var(--radius-control)] bg-[var(--surface-muted)] flex items-center justify-center text-[var(--foreground)]">
                  <IconComponent className="w-4 h-4" />
                </div>

                <div className="space-y-0.5">
                  <h3 className="text-sm font-bold text-[var(--foreground)] tracking-tight">
                    {plan.title}
                  </h3>
                  <p className="text-[11px] font-mono text-[var(--text-muted)]">
                    {plan.englishTitle}
                  </p>
                </div>

                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  {plan.description}
                </p>
              </div>

              <a
                href={`mailto:${STUDIO_EMAIL}?subject=${encodeURIComponent(plan.subject)}`}
                className="w-full py-2.5 px-3 rounded-[var(--radius-control)] bg-[var(--surface-muted)] hover:bg-[var(--accent)] hover:text-white text-[var(--foreground)] text-xs font-bold text-center transition-[background-color,color] duration-150 flex items-center justify-center gap-1.5 active:scale-[0.98] !no-underline"
              >
                <span>洽談合作</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </a>
            </div>
          )
        })}
      </div>

      {/* 專人洽談聯絡卡片 */}
      <div className="w-full rounded-[var(--radius-panel)] bg-[var(--surface)] p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <p className="text-xs font-bold text-[var(--foreground)]">
            合作洽談與排期諮詢
          </p>
          <p className="text-xs text-[var(--text-secondary)]">
            聯絡信箱：<span className="font-mono font-medium text-[var(--foreground)] select-all">{STUDIO_EMAIL}</span>
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
          <a
            href={`mailto:${STUDIO_EMAIL}?subject=${encodeURIComponent('SORAI 贊助與合作計畫洽談')}`}
            className="flex-1 sm:flex-none px-4 py-2 rounded-[var(--radius-control)] bg-[var(--accent)] hover:opacity-90 text-white text-xs font-bold text-center transition-opacity duration-150 flex items-center justify-center gap-1.5 active:scale-[0.98] !no-underline"
          >
            <Mail className="w-3.5 h-3.5" />
            <span>洽談合作</span>
          </a>

          <button
            type="button"
            onClick={handleCopyEmail}
            className="px-3 py-2 rounded-[var(--radius-control)] bg-[var(--surface-muted)] hover:bg-[var(--surface-muted)]/80 text-[var(--foreground)] text-xs font-medium transition-colors duration-150 flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.98]"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-500" />
                <span className="text-emerald-500 font-semibold">已複製</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                <span>複製信箱</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
