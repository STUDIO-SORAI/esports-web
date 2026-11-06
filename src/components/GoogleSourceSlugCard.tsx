"use client";

import React from "react";
import { GOOGLE_SOURCE_URL } from "./GoogleSourceBanner";

interface GoogleSourceSlugCardProps {
  className?: string;
}

export function GoogleSourceSlugCard({ className = "" }: GoogleSourceSlugCardProps) {
  return (
    <aside
      className={`group relative overflow-hidden flex flex-col p-4 rounded-[var(--radius-panel)] bg-[var(--surface)] hover:bg-[var(--surface-muted)] text-[var(--foreground)] shadow-xs hover:shadow-md transition-[background-color,box-shadow,transform] duration-200 gap-2.5 w-full border border-black/5 dark:border-white/5 ${className}`}
      aria-label="在 Google 優先閱讀 SORAI"
    >
      {/* Header: Google Favicon + ✕ + SORAI Logotype (與首頁相同的雙品牌 Logo) */}
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-[var(--radius-control)] bg-[var(--surface-muted)] flex items-center justify-center shrink-0 p-1">
          <img
            src="/Google_Favicon_2025.svg"
            alt="Google"
            className="w-4 h-4 object-contain"
          />
        </div>

        <span className="text-[var(--text-muted)] text-xs font-normal">✕</span>

        <img
          src="/sorai-logotype_w.png"
          alt="SORAI ESPORTS"
          className="h-3.5 w-auto object-contain invert dark:invert-0 opacity-90"
        />
      </div>

      {/* Main Copy (精簡短文案，不囉嗦) */}
      <div className="flex flex-col gap-1">
        <h4 className="text-sm font-bold text-[var(--foreground)] tracking-tight leading-snug">
          在 Google 優先閱讀
        </h4>
        <p className="text-xs text-[var(--text-secondary)] leading-relaxed font-normal">
          設為優先來源，即時接收最新電競戰報與深度專題。
        </p>
      </div>

      {/* Action Button: Styled Arc UI Pill */}
      <a
        href={GOOGLE_SOURCE_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="w-full flex items-center justify-between px-3.5 py-2 rounded-full bg-[var(--surface-raised)] group-hover:bg-[var(--accent)] text-[var(--foreground)] group-hover:text-white text-xs font-semibold shadow-xs transition-[background-color,color,transform] duration-200 mt-1"
      >
        <span>設為優先來源</span>
        <svg
          className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-0.5 shrink-0"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M5 12h14" />
          <path d="m12 5 7 7-7 7" />
        </svg>
      </a>
    </aside>
  );
}

export default GoogleSourceSlugCard;
