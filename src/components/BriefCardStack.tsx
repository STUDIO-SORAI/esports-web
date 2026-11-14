"use client";

import React, { useState } from "react";
import { motion, AnimatePresence, MotionConfig } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Brief } from "@/lib/types";
import { formatFeedTime } from "@/lib/api";
import { toPlainShareTitle } from "@/lib/seo";
import { briefBodyToText } from "@/lib/briefBody";
import { getCategoryLogo, getGameLogoSet } from "@/lib/config";

export type BriefItem = Brief & { href?: string };

interface BriefCardStackProps {
  briefs: BriefItem[];
}

const PAGE_SIZE = 3;

/** 單張快訊卡片元件（共用於手機水平滑動與桌面 3 欄輪播） */
function BriefCard({
  item,
  isMobile = false,
}: {
  item: BriefItem;
  isMobile?: boolean;
}) {
  const title = toPlainShareTitle(item.title);
  const summary = briefBodyToText(item.body);
  const authorName = item.authorNames?.[0] || "SORAI";
  const authorImage = item.authorImages?.[0] || "";
  const categoryName = item.category || "快訊";
  const gameLogos = getGameLogoSet(categoryName);
  const time = formatFeedTime(item.publishedAt || item.updatedAt);
  const shortTime = time.replace(/^\d{4}年\s*/, "").replace(/^\d{4}[-/.年]\s*/, "");
  const hasMedia = Boolean(item.image);
  const isVideo = item.imageMime?.startsWith("video/");
  const targetHref = item.href || `/brief/${item.slug}`;

  return (
    <a
      href={targetHref}
      className={`group flex flex-col h-full rounded-[var(--radius-panel)] bg-[var(--surface)] hover:bg-[var(--surface-muted)] transition-[transform,background-color,box-shadow] duration-200 hover:-translate-y-1 hover:shadow-md active:scale-[0.99] overflow-hidden shadow-xs min-h-0 border border-transparent dark:border-white/5 ${
        isMobile ? "w-[80vw] max-w-[320px] shrink-0 snap-start" : "w-full"
      }`}
    >
      {/* 統一比例媒體容器 */}
      {/* 骨架微光的停止條件是「裡面有 img[data-loaded]」，所以沒有封面圖
          （漸層浮水印）或是影片的卡片不能掛 skullet-img-wrap —— 否則那條
          infinite 微光會在卡片載完之後永遠跑下去。 */}
      <div
        className={`relative w-full aspect-video shrink-0 overflow-hidden bg-[var(--surface-muted)] ${
          hasMedia && !isVideo ? 'skullet-img-wrap' : ''
        }`}
      >
        {/* 左上角作者懸浮標籤 */}
        <div className="absolute top-2 left-2 z-10 flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-white shadow-xs max-w-[calc(100%-16px)]">
          {authorImage ? (
            <img
              src={authorImage}
              alt=""
              className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full object-cover bg-white/20 shrink-0"
            />
          ) : (
            <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-white/20 text-white flex items-center justify-center text-[8px] sm:text-[9px] font-bold shrink-0">
              {authorName.charAt(0)}
            </div>
          )}
          <span className="text-[10px] sm:text-[11px] font-medium truncate leading-none">
            {authorName}
          </span>
        </div>

        {/* 媒體圖片/影片 或 幾何漸層浮水印 */}
        {hasMedia ? (
          isVideo ? (
            <video
              src={item.image}
              autoPlay
              loop
              muted
              playsInline
              preload="metadata"
              className="w-full h-full object-cover transition-transform duration-300 ease-out group-hover:scale-105"
            />
          ) : (
            <img
              src={item.image}
              alt=""
              loading="lazy"
              className="skullet-img w-full h-full object-cover transition-transform duration-300 ease-out group-hover:scale-105"
              onLoad={(e) => (e.currentTarget.dataset.loaded = 'true')}
            />
          )
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[var(--surface-muted)] via-[var(--surface)] to-[var(--surface-muted)] flex items-center justify-center relative select-none">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.04)_0%,transparent_70%)] pointer-events-none" />
            {gameLogos ? (
              <>
                <img
                  src={gameLogos.dark}
                  alt=""
                  className="w-10 h-10 sm:w-12 sm:h-12 object-contain opacity-20 dark:hidden transition-transform duration-300 ease-out group-hover:scale-110"
                />
                <img
                  src={gameLogos.white}
                  alt=""
                  className="w-10 h-10 sm:w-12 sm:h-12 object-contain opacity-25 hidden dark:block transition-transform duration-300 ease-out group-hover:scale-110"
                />
              </>
            ) : (
              <span className="text-xl sm:text-2xl font-black tracking-widest text-[var(--foreground)] opacity-15">
                SORAI
              </span>
            )}
          </div>
        )}
      </div>

      <div className="p-3.5 sm:p-4 flex flex-col flex-1 justify-between min-h-0">
        <div>
          {/* 分類標籤與時間 */}
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-wide text-[var(--text-secondary)] group-hover:text-[var(--foreground)] transition-colors truncate">
              {gameLogos ? (
                gameLogos.color ? (
                  <img
                    src={gameLogos.color}
                    alt=""
                    className="w-3.5 h-3.5 object-contain shrink-0"
                  />
                ) : (
                  <>
                    <img
                      src={gameLogos.dark}
                      alt=""
                      className="w-3.5 h-3.5 object-contain shrink-0 dark:hidden"
                    />
                    <img
                      src={gameLogos.white}
                      alt=""
                      className="w-3.5 h-3.5 object-contain shrink-0 hidden dark:block"
                    />
                  </>
                )
              ) : null}
              <span>#{categoryName}</span>
            </span>

            <time className="text-[11px] text-[var(--text-muted)] tabular-nums shrink-0">
              <span className="sm:hidden">{shortTime}</span>
              <span className="hidden sm:inline">{time}</span>
            </time>
          </div>

          {/* 標題（維持呼吸感與固定錨定高度） */}
          <h3 className="text-[15px] font-bold text-[var(--foreground)] leading-snug line-clamp-2 group-hover:text-[var(--accent)] transition-colors tracking-tight min-h-[2.5em]">
            {title}
          </h3>

          {/* 摘要（精練 2 行） */}
          {summary && summary.trim() !== title.trim() ? (
            <p className="mt-2 text-xs text-[var(--text-secondary)] leading-relaxed line-clamp-2 font-normal">
              {summary}
            </p>
          ) : null}
        </div>

        {/* 底部行動條（絕對不折行） */}
        <div className="pt-2.5 mt-3 border-t border-[var(--surface-muted)]/60 flex items-center justify-between text-[11px] text-[var(--text-muted)] gap-2">
          <span className="font-medium text-[var(--text-secondary)] truncate min-w-0">{categoryName}</span>
          <span className="inline-flex items-center gap-1 font-semibold group-hover:text-[var(--accent)] transition-colors whitespace-nowrap shrink-0">
            閱讀快訊
            <svg
              className="w-3 h-3 transition-transform duration-200 group-hover:translate-x-0.5 shrink-0"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M5 12h14"></path>
              <path d="m12 5 7 7-7 7"></path>
            </svg>
          </span>
        </div>
      </div>
    </a>
  );
}

export function BriefCardStack({ briefs }: BriefCardStackProps) {
  const [page, setPage] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);

  if (!briefs || briefs.length === 0) {
    return null;
  }

  const totalPages = Math.ceil(briefs.length / PAGE_SIZE);
  const canPrev = page > 0;
  const canNext = page < totalPages - 1;

  const currentBriefs = briefs.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  // 手機版水平滑動展示前 10 則快訊
  const mobileBriefs = briefs.slice(0, 10);

  const handlePrev = () => {
    if (canPrev) {
      setDirection(-1);
      setPage((prev) => prev - 1);
    }
  };

  const handleNext = () => {
    if (canNext) {
      setDirection(1);
      setPage((prev) => prev + 1);
    }
  };

  return (
    <div className="relative w-full group/carousel">
      {/* 1. 手機端：原生流暢的水平 Snap-Scroll 輪播（Peek 露出右側下一張） */}
      <div className="sm:hidden flex gap-3.5 overflow-x-auto snap-x snap-mandatory scrollbar-none pb-2 -mx-4 px-4 items-stretch">
        {mobileBriefs.map((item) => (
          <BriefCard key={`m-${item.id || item.slug}`} item={item} isMobile />
        ))}
      </div>

      {/* 2. 桌面端：精緻的 3 欄 Deck 動畫輪播 */}
      <div className="hidden sm:block">
        <MotionConfig reducedMotion="user">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={`deck-page-${page}`}
              className="grid grid-cols-3 gap-4 items-stretch"
            >
              {currentBriefs.map((item, index) => (
                <motion.div
                  key={item.id || item.slug}
                  initial={{
                    x: direction * 48,
                    rotate: direction * 2.5,
                    scale: 0.94,
                    y: 12,
                    opacity: 0,
                    filter: "blur(4px)",
                  }}
                  animate={{
                    x: 0,
                    rotate: 0,
                    scale: 1,
                    y: 0,
                    opacity: 1,
                    filter: "blur(0px)",
                    transition: {
                      type: "spring",
                      stiffness: 280,
                      damping: 24,
                      delay: index * 0.045,
                    },
                  }}
                  exit={{
                    x: direction * -48,
                    rotate: direction * -2.5,
                    scale: 0.95,
                    opacity: 0,
                    filter: "blur(4px)",
                    transition: {
                      duration: 0.18,
                      delay: index * 0.03,
                    },
                  }}
                  className="h-full"
                >
                  <BriefCard item={item} />
                </motion.div>
              ))}
            </motion.div>
          </AnimatePresence>
        </MotionConfig>

        {/* 桌面端左翻頁按鈕 */}
        {totalPages > 1 && (
          <button
            type="button"
            onClick={handlePrev}
            disabled={!canPrev}
            aria-label="上一組快訊"
            className={`absolute -left-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-[var(--surface-raised)] text-[var(--foreground)] shadow-md hover:bg-[var(--surface-muted)] flex items-center justify-center transition-[opacity,transform,background-color] duration-150 z-20 cursor-pointer ${
              !canPrev
                ? "opacity-0 pointer-events-none"
                : "opacity-90 hover:opacity-100 hover:scale-105 active:scale-95"
            }`}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}

        {/* 桌面端右翻頁按鈕 */}
        {totalPages > 1 && (
          <button
            type="button"
            onClick={handleNext}
            disabled={!canNext}
            aria-label="下一組快訊"
            className={`absolute -right-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-[var(--surface-raised)] text-[var(--foreground)] shadow-md hover:bg-[var(--surface-muted)] flex items-center justify-center transition-[opacity,transform,background-color] duration-150 z-20 cursor-pointer ${
              !canNext
                ? "opacity-0 pointer-events-none"
                : "opacity-90 hover:opacity-100 hover:scale-105 active:scale-95"
            }`}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}

export default BriefCardStack;
