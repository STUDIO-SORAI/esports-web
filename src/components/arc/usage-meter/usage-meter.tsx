'use client'

import React from 'react'

export interface UsageMeterProps {
  label: string
  sublabel?: string
  current: number
  target: number
  unit?: string
  note?: string
  variant?: 'card' | 'inline'
  className?: string
}

export function UsageMeter({
  label,
  sublabel,
  current,
  target,
  unit = 'TWD',
  note,
  variant = 'inline',
  className = '',
}: UsageMeterProps) {
  const percentage = Math.min(100, Math.max(0, Math.round((current / target) * 100)))

  const content = (
    <div className="w-full flex flex-col gap-2.5">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-0.5">
          <h4 className="text-xs font-bold text-[var(--foreground)]">{label}</h4>
          {sublabel && (
            <p className="text-[11px] text-[var(--text-secondary)] leading-tight">{sublabel}</p>
          )}
        </div>
        <div className="text-right shrink-0">
          <span className="font-mono text-xs font-bold text-[var(--foreground)]">
            {`${unit} ${current}`}
          </span>
          <span className="font-mono text-[11px] text-[var(--text-muted)]">
            {` / ${unit} ${target}`}
          </span>
        </div>
      </div>

      {/* 進度條軌道 (Track) */}
      <div
        className="w-full h-2 rounded-full bg-[var(--surface-muted)] overflow-hidden relative"
        role="progressbar"
        aria-valuenow={current}
        aria-valuemin={0}
        aria-valuemax={target}
        aria-label={label}
      >
        <div
          className="h-full rounded-full bg-[var(--accent)] transition-[width] duration-500 ease-out"
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* 底部說明與進度比率 */}
      <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)]">
        <span>{note || '本月社群贊助累計'}</span>
        <span className="font-mono font-medium text-[var(--text-secondary)]">
          {`${percentage}% 達成`}
        </span>
      </div>
    </div>
  )

  if (variant === 'card') {
    return (
      <div
        className={`w-full bg-[var(--surface)] rounded-[var(--radius-panel)] p-5 shadow-xs ${className}`}
      >
        {content}
      </div>
    )
  }

  return (
    <div className={`w-full p-4 rounded-[var(--radius-control)] bg-[var(--surface-muted)] ${className}`}>
      {content}
    </div>
  )
}
