import React from 'react';
import { GOOGLE_SOURCE_URL } from './GoogleSourceBanner';
import { Button } from '@/components/arc/button/button';

export function GoogleSourceCard({ className = "" }: { className?: string }) {
  return (
    <div className={`relative overflow-hidden flex flex-col p-5 sm:p-6 rounded-[var(--radius-panel)] bg-[var(--surface)] text-[var(--foreground)] shadow-xs gap-4 transition-colors ${className}`}>
      {/* Header: Google 2025 Favicon + Plus + SORAI Logotype */}
      <div className="relative z-10 flex items-center gap-2.5 pb-2">
        <div className="w-8 h-8 rounded-[var(--radius-control)] bg-[var(--surface-muted)] flex items-center justify-center shrink-0 p-1">
          <img
            src="/Google_Favicon_2025.svg"
            alt="Google"
            className="w-5 h-5 object-contain"
          />
        </div>

        <span className="text-[var(--text-muted)] text-xs font-normal">✕</span>

        <img
          src="/sorai-logotype_w.png"
          alt="SORAI ESPORTS"
          className="h-4 w-auto object-contain invert dark:invert-0 opacity-90"
        />
      </div>

      {/* Main Copy */}
      <div className="relative z-10 flex flex-col gap-1.5">
        <h3 className="text-sm font-serif font-medium text-[var(--foreground)] tracking-tight leading-snug">
          在 Google 優先閱讀 SORAI
        </h3>
        <p className="text-xs text-[var(--text-secondary)] leading-relaxed font-sans">
          將 SORAI ESPORTS 設為 Google 優先來源，在 Google 搜尋與新聞資訊流中第一時間掌握電競快訊與深度專欄。
        </p>
      </div>

      <Button
        as="a"
        href={GOOGLE_SOURCE_URL}
        target="_blank"
        rel="noopener noreferrer"
        variant="primary"
        size="md"
        className="w-full justify-between text-xs font-medium"
      >
        <span>在 Google 設為優先來源</span>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M5 12h14" />
          <path d="m12 5 7 7-7 7" />
        </svg>
      </Button>
    </div>
  );
}
