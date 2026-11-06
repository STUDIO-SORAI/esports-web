'use client'

import React from 'react'
import { motion, MotionConfig } from 'framer-motion'
import { ArrowUpRight } from 'lucide-react'

interface SponsorSidebarCardProps {
  currentMonthlyTwd?: number
}

export function SponsorSidebarCard({
  currentMonthlyTwd = 0,
}: SponsorSidebarCardProps) {
  const targetTwd = 500
  const percentage = Math.min(100, Math.max(0, Math.round((currentMonthlyTwd / targetTwd) * 100)))

  return (
    <MotionConfig reducedMotion="user">
      <motion.div
        initial={{ opacity: 0, filter: 'blur(6px)' }}
        animate={{ opacity: 1, filter: 'blur(0px)' }}
        transition={{
          duration: 0.22,
          delay: 0.24,
          ease: [0.16, 1, 0.3, 1],
        }}
      >
        <a
          href="/sponsor"
          className="group block p-3 rounded-[var(--radius-panel)] bg-[var(--surface)] hover:bg-[var(--surface-muted)] transition-[transform,background-color,box-shadow] duration-200 shadow-xs hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98] relative overflow-hidden !no-underline"
          aria-label="贊助支持 SORAI"
        >
          {/* Top: 標題與目標數值 */}
          <div className="flex items-center justify-between gap-1 mb-1.5">
            <h4 className="text-xs font-bold text-[var(--foreground)] tracking-tight">
              支持 SORAI
            </h4>
            <span className="text-[10px] font-mono text-[var(--text-muted)]">
              {`${currentMonthlyTwd} / ${targetTwd} TWD`}
            </span>
          </div>

          {/* 簡介內文 */}
          <p className="text-[11px] text-[var(--text-secondary)] leading-snug mb-2.5">
            支持我們更多創作
          </p>

          {/* 微型進度條 */}
          <div className="w-full h-1 rounded-full bg-[var(--surface-muted)] group-hover:bg-zinc-200 dark:group-hover:bg-zinc-800 overflow-hidden mb-2.5 transition-colors duration-150">
            <div
              className="h-full rounded-full bg-[var(--foreground)] opacity-70 transition-[width] duration-300 ease-out"
              style={{ width: `${percentage}%` }}
            />
          </div>

          {/* Action Button: Styled Arc UI Pill */}
          <div className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-full bg-[var(--surface-muted)] group-hover:bg-[var(--accent)] text-[var(--foreground)] group-hover:text-white text-[11px] font-bold transition-[background-color,color] duration-150">
            <span>前往贊助</span>
            <ArrowUpRight className="w-3 h-3 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </div>
        </a>
      </motion.div>
    </MotionConfig>
  )
}
