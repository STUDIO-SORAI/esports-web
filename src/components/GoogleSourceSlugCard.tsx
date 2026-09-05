import React from 'react';
import { GOOGLE_SOURCE_URL } from './GoogleSourceBanner';
import { GradientButton } from '@/components/ui/gradient-button';

export function GoogleSourceSlugCard() {
  return (
    <div className="relative overflow-hidden flex flex-col p-4 sm:p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#141416] text-zinc-900 dark:text-zinc-100 shadow-md shadow-black/5 dark:shadow-black/20 gap-3.5 transition-colors w-full">
      {/* Header: Google 2025 Favicon + Plus + SORAI Logotype */}
      <div className="relative z-10 flex items-center gap-2 border-b border-zinc-100 dark:border-zinc-800/80 pb-3">
        <div className="w-7 h-7 rounded-lg bg-zinc-50 dark:bg-zinc-800/90 flex items-center justify-center shrink-0 border border-zinc-200 dark:border-zinc-700/60 shadow-2xs p-1">
          <img
            src="/Google_Favicon_2025.svg"
            alt="Google"
            className="w-4 h-4 object-contain"
          />
        </div>

        <span className="text-zinc-300 dark:text-zinc-600 text-xs font-bold">✕</span>

        <img
          src="/sorai-logotype_w.png"
          alt="SORAI ESPORTS"
          className="h-3.5 w-auto object-contain invert dark:invert-0 opacity-90"
        />
      </div>

      {/* Main Copy */}
      <div className="relative z-10 flex flex-col gap-1.5">
        <h3 className="text-sm font-black text-zinc-900 dark:text-white tracking-tight leading-snug font-serif">
          在 Google 優先閱讀 SORAI
        </h3>
        <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed font-sans">
          將 SORAI ESPORTS 設為 Google 優先來源，在 Google 搜尋與新聞資訊流中第一時間掌握電競快訊與深度專欄。
        </p>
      </div>

      {/* GradientButton with popup micro-gradient and whitespace-nowrap */}
      <GradientButton asChild variant="popup" className="w-full justify-between min-w-0 px-3 sm:px-3.5 py-3 h-auto">
        <a
          href={GOOGLE_SOURCE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between w-full gap-1 whitespace-nowrap"
        >
          <span className="text-[11px] 2xl:text-xs font-bold whitespace-nowrap tracking-tight">在 Google 設為優先來源</span>
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-white/85 shrink-0"
          >
            <path d="M5 12h14" />
            <path d="m12 5 7 7-7 7" />
          </svg>
        </a>
      </GradientButton>
    </div>
  );
}
