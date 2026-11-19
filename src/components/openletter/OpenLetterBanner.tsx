'use client'

import { useEffect, useState } from 'react'
import { ArrowRight, PenLine } from 'lucide-react'

import SegmentedControl from '@/components/arc/segmented-control/segmented-control'
import { OPEN_LETTER, PETITION_LANGUAGE_OPTIONS } from '@/data/openLetter'
import { DEFAULT_PETITION_LANGUAGE, isPetitionLanguage, type PetitionLanguage } from '@/lib/petition'

const STORAGE_KEY = 'sorai-openletter-lang'

export interface BannerCopy {
  kicker: string
  title: string
  description: string
  signCta: string
  readCta: string
  quickSignLabel: string
  ariaLabel: string
}

export const OPEN_LETTER_BANNER_COPY: Record<PetitionLanguage, BannerCopy> = {
  zh: {
    kicker: '社群公開信・公開連署',
    title: '致 Riot Games 全球電競管理部門：太平洋職業聯賽公開信連署',
    description:
      '針對 LCP 賽務裁決、硬體保障、賽程規劃與次級生態提出六項改革訴求，集結台港澳、越南、日本與大洋洲社群聲音。',
    signCta: '立即前往連署',
    readCta: '閱讀公開信全文',
    quickSignLabel: '中文連署',
    ariaLabel: '社群公開信與連署入口',
  },
  en: {
    kicker: 'Open Letter · Public Petition',
    title: 'Joint Open Letter to Riot Games: Add Your Signature',
    description:
      'Six concrete demands on LCP officiating transparency, server safeguards, broadcast slots, and tier-two support across TW/HK/MO, VN, JP, and OCE.',
    signCta: 'Sign the Letter',
    readCta: 'Read Full Letter',
    quickSignLabel: 'Sign in English',
    ariaLabel: 'Community open letter and petition',
  },
  vi: {
    kicker: 'Thư ngỏ · Kiến nghị công khai',
    title: 'Thư ngỏ chung gửi Riot Games: Ký tên ủng hộ ngay',
    description:
      'Sáu yêu cầu cụ thể về minh bạch trọng tài, máy chủ thi đấu, lịch phát sóng và giải hạng dưới LCP cho cộng đồng Đài Loan, Việt Nam, Nhật Bản & Châu Đại Dương.',
    signCta: 'Ký tên ủng hộ',
    readCta: 'Đọc toàn văn',
    quickSignLabel: 'Ký bằng tiếng Việt',
    ariaLabel: 'Thư ngỏ cộng đồng và ký tên ủng hộ',
  },
  ja: {
    kicker: '公開書簡・公開署名',
    title: 'Riot Games への共同公開書簡：今すぐ署名に参加する',
    description:
      'LCP の裁定透明性・サーバー環境・試合形式・下部リーグ支援に関する6つの改革要求。台湾・香港・マカオ、ベトナム、日本、オセアニアの声を届けよう。',
    signCta: '今すぐ署名する',
    readCta: '全文を読む',
    quickSignLabel: '日本語で署名',
    ariaLabel: 'コミュニティ公開書簡と署名フォーム',
  },
}

interface OpenLetterBannerProps {
  initialLanguage?: PetitionLanguage
  initialCount?: number | null
  className?: string
}

export function OpenLetterBanner({
  initialLanguage = DEFAULT_PETITION_LANGUAGE,
  initialCount = null,
  className = '',
}: OpenLetterBannerProps) {
  const [language, setLanguage] = useState<PetitionLanguage>(initialLanguage)
  const [count, setCount] = useState<number | null>(initialCount)

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY)
      if (isPetitionLanguage(stored) && stored !== initialLanguage) {
        setLanguage(stored)
      }
    } catch {
      // Ignore storage access errors in private mode
    }
  }, [initialLanguage])

  useEffect(() => {
    if (initialCount !== null) return
    let active = true
    fetch('/api/petition-count', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { count?: unknown } | null) => {
        if (!active || !data) return
        if (typeof data.count === 'number' && Number.isFinite(data.count) && data.count >= 0) {
          setCount(Math.floor(data.count))
        }
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [initialCount])

  const handleLanguageChange = (value: string) => {
    if (!isPetitionLanguage(value)) return
    setLanguage(value)
    try {
      window.localStorage.setItem(STORAGE_KEY, value)
    } catch {
      // Ignore storage errors
    }
  }

  const copy = OPEN_LETTER_BANNER_COPY[language]
  const letterUi = OPEN_LETTER[language].ui
  const signHref = `/openletter?lang=${language}#sign`
  const letterHref = `/openletter?lang=${language}`

  return (
    <section
      aria-label={copy.ariaLabel}
      className={`arc-entrance group relative w-full rounded-[var(--radius-panel)] bg-[var(--surface)] shadow-xs overflow-hidden border border-zinc-200/70 dark:border-zinc-800/80 ${className}`}
      style={{ '--stagger': 2 } as React.CSSProperties}
    >
      {/* Left accent stripe + subtle ambient corner glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 left-0 w-1 bg-[var(--accent)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          background:
            'radial-gradient(420px circle at 100% 0%, var(--accent-subtle), transparent 70%)',
        }}
      />

      <div className="relative z-10 flex flex-col gap-4 p-4 pl-5 sm:p-6 sm:pl-7">
        {/* Top Row: Kicker + Live Count + 4-Language Switcher */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--accent-subtle)] px-2.5 py-1 text-[11px] font-bold tracking-wider uppercase text-[var(--accent)]">
              <span className="relative flex h-1.5 w-1.5" aria-hidden="true">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--accent)] opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[var(--accent)]" />
              </span>
              {copy.kicker}
            </span>

            {count !== null && count > 0 && (
              <span className="inline-flex items-baseline gap-1.5 rounded-full bg-[var(--surface-muted)] px-2.5 py-0.5 text-xs text-[var(--text-secondary)]">
                <strong className="font-bold tabular-nums text-[var(--foreground)]">
                  {count.toLocaleString('en-US')}
                </strong>
                <span>{letterUi.countSuffix}</span>
              </span>
            )}
          </div>

          <div className="self-start sm:self-auto max-w-full">
            <SegmentedControl
              label={letterUi.languageLabel}
              value={language}
              onValueChange={handleLanguageChange}
              options={PETITION_LANGUAGE_OPTIONS.map((option) => ({
                value: option.value,
                label: option.label,
              }))}
            />
          </div>
        </div>

        {/* Main Content + CTA Split */}
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between lg:gap-8">
          <div className="min-w-0 flex-1">
            <a
              href={signHref}
              className="block !no-underline group/title focus:outline-none"
            >
              <h2 className="text-lg sm:text-xl md:text-2xl font-bold tracking-tight text-[var(--foreground)] group-hover/title:text-[var(--accent)] transition-colors duration-150 leading-snug">
                {copy.title}
              </h2>
            </a>
            <p className="mt-1.5 text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed max-w-3xl">
              {copy.description}
            </p>

            {/* All 4 languages quick-signup strip so visitors in any language spot the petition immediately */}
            <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1.5">
              {PETITION_LANGUAGE_OPTIONS.map((option) => {
                const isActive = option.value === language
                return (
                  <a
                    key={option.value}
                    href={`/openletter?lang=${option.value}#sign`}
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium transition-[background-color,color] duration-150 !no-underline ${
                      isActive
                        ? 'bg-[var(--surface-muted)] text-[var(--foreground)] font-semibold'
                        : 'bg-transparent text-[var(--text-muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]'
                    }`}
                  >
                    <span>{OPEN_LETTER_BANNER_COPY[option.value].quickSignLabel}</span>
                    <span aria-hidden="true">&rarr;</span>
                  </a>
                )
              })}
            </div>
          </div>

          {/* Right CTA Block */}
          <div className="flex flex-col sm:flex-row lg:flex-col items-stretch sm:items-center lg:items-end justify-center gap-2.5 shrink-0">
            <a
              href={signHref}
              className="group/cta inline-flex items-center justify-center gap-2 min-h-[var(--control-height-md)] px-5 rounded-[var(--radius-control)] bg-[var(--accent)] hover:bg-[var(--accent-strong)] text-[var(--accent-foreground)] text-sm font-bold shadow-xs hover:shadow-md hover:-translate-y-0.5 active:scale-[0.97] transition-[background-color,transform,box-shadow] duration-150 whitespace-nowrap !no-underline"
            >
              <PenLine className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>{copy.signCta}</span>
              <ArrowRight
                className="w-4 h-4 shrink-0 transition-transform duration-150 group-hover/cta:translate-x-0.5"
                aria-hidden="true"
              />
            </a>

            <a
              href={letterHref}
              className="inline-flex items-center justify-center gap-1.5 min-h-[var(--control-height-sm)] px-3.5 rounded-[var(--radius-control)] bg-[var(--surface-muted)] hover:bg-[var(--surface-raised)] text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--foreground)] active:scale-[0.97] transition-[background-color,color,transform] duration-150 whitespace-nowrap !no-underline"
            >
              <span>{copy.readCta}</span>
              <span aria-hidden="true">&rarr;</span>
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}

export default OpenLetterBanner
