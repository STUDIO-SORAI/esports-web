'use client'

import React from 'react'
import { ArrowUpRight } from 'lucide-react'

interface SponsorHeaderBannerProps {
  className?: string
}

export function SponsorHeaderBanner({ className = '' }: SponsorHeaderBannerProps) {
  return (
    <a
      href="/sponsor"
      className={`group flex items-center justify-between gap-3 px-3.5 py-2 rounded-[var(--radius-control)] bg-[var(--surface)] hover:bg-[var(--surface-muted)] text-[var(--foreground)] transition-[background-color,transform] duration-150 active:scale-[0.99] !no-underline shadow-xs ${className}`}
      aria-label="贊助支持 SORAI"
    >
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-xs font-bold tracking-tight text-[var(--foreground)] shrink-0">
          支持 SORAI
        </span>
        <span className="text-[11px] text-[var(--text-muted)] truncate">
          • 支持我們更多創作
        </span>
      </div>

      <div className="flex items-center gap-1 shrink-0 text-xs font-bold text-[var(--foreground)] group-hover:text-[var(--accent)] transition-colors">
        <span className="text-[11px]">贊助</span>
        <ArrowUpRight className="w-3.5 h-3.5 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
      </div>
    </a>
  )
}
