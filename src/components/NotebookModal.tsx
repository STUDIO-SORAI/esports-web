import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { PostNotebook } from '../lib/types';
import { useLightbox } from './Lightbox';
import { lockBodyScroll } from './scrollLock';

/**
 * 匹配文章段落中的附錄嵌入短代碼
 * 支援格式：
 * - {{notebook:1}}、{{notebook:2}}、{{notebook}}
 * - {{附錄:1}}、{{附錄:2}}、{{附錄}}
 * - [notebook:1]、[notebook]、[附錄:1]、[附錄]
 * - :::notebook 1:::、:::附錄 1:::
 * - <!-- notebook:1 -->、<!-- 附錄:1 -->
 */
export function matchNotebookTag(text: string): { index?: number } | null {
  if (!text) return null;
  const trimmed = text.trim();
  const match = trimmed.match(
    /^(?:\{\{\s*(?:notebook|附錄|appendix)(?::(\d+))?\s*\}\}|\[(?:notebook|附錄|appendix)(?::(\d+))?\]|:::\s*(?:notebook|附錄|appendix)(?:\s+(\d+))?\s*:::|<!--\s*(?:notebook|附錄|appendix)(?::(\d+))?\s*-->)$/i
  );
  if (!match) return null;
  const rawNum = match[1] || match[2] || match[3] || match[4];
  return {
    index: rawNum ? parseInt(rawNum, 10) - 1 : undefined,
  };
}

/**
 * 依據附錄的 placement 設定，自動將短代碼注入至文章文字中
 */
export function injectNotebookPlacements(content: string, notebooks: PostNotebook[] = []): string {
  if (!content || !notebooks || notebooks.length === 0) return content;

  let result = content;

  notebooks.forEach((nb, idx) => {
    const tag = `{{notebook:${idx + 1}}}`;
    const altTag1 = `{{附錄:${idx + 1}}}`;
    const altTag2 = `[notebook:${idx + 1}]`;
    const altTag3 = `[附錄:${idx + 1}]`;

    // 若文章內已有此附錄的手動短代碼，不重複注入
    if (
      result.includes(tag) ||
      result.includes(altTag1) ||
      result.includes(altTag2) ||
      result.includes(altTag3)
    ) {
      return;
    }

    const placement = nb.placement || 'default';

    if (placement === 'top') {
      result = `${tag}\n\n${result}`;
    } else if (placement === 'after_p1') {
      const pMatch = result.match(/<\/p>/i);
      if (pMatch && pMatch.index !== undefined) {
        const insertPos = pMatch.index + pMatch[0].length;
        result = `${result.slice(0, insertPos)}\n\n${tag}\n\n${result.slice(insertPos)}`;
      } else {
        const dblNewline = result.indexOf('\n\n');
        if (dblNewline !== -1) {
          result = `${result.slice(0, dblNewline)}\n\n${tag}\n\n${result.slice(dblNewline + 2)}`;
        }
      }
    } else if (placement === 'after_p2') {
      const pMatches = [...result.matchAll(/<\/p>/gi)];
      if (pMatches.length >= 2 && pMatches[1].index !== undefined) {
        const insertPos = pMatches[1].index + pMatches[1][0].length;
        result = `${result.slice(0, insertPos)}\n\n${tag}\n\n${result.slice(insertPos)}`;
      } else {
        const parts = result.split('\n\n');
        if (parts.length >= 2) {
          result = `${parts[0]}\n\n${parts[1]}\n\n${tag}\n\n${parts.slice(2).join('\n\n')}`;
        }
      }
    } else if (placement === 'after_p3') {
      const pMatches = [...result.matchAll(/<\/p>/gi)];
      if (pMatches.length >= 3 && pMatches[2].index !== undefined) {
        const insertPos = pMatches[2].index + pMatches[2][0].length;
        result = `${result.slice(0, insertPos)}\n\n${tag}\n\n${result.slice(insertPos)}`;
      } else {
        const parts = result.split('\n\n');
        if (parts.length >= 3) {
          result = `${parts[0]}\n\n${parts[1]}\n\n${parts[2]}\n\n${tag}\n\n${parts.slice(3).join('\n\n')}`;
        }
      }
    } else if (placement === 'after_h2_1') {
      const h2Match = result.match(/<\/h2>|##\s+[^\n]+/i);
      if (h2Match && h2Match.index !== undefined) {
        const afterH2 = h2Match.index + h2Match[0].length;
        const nextPMatch = result.slice(afterH2).match(/<\/p>|\n\n/i);
        if (nextPMatch && nextPMatch.index !== undefined) {
          const insertPos = afterH2 + nextPMatch.index + nextPMatch[0].length;
          result = `${result.slice(0, insertPos)}\n\n${tag}\n\n${result.slice(insertPos)}`;
        } else {
          result = `${result.slice(0, afterH2)}\n\n${tag}\n\n${result.slice(afterH2)}`;
        }
      }
    } else if (placement === 'after_h2_2') {
      const h2Matches = [...result.matchAll(/<\/h2>|##\s+[^\n]+/gi)];
      if (h2Matches.length >= 2 && h2Matches[1].index !== undefined) {
        const afterH2 = h2Matches[1].index + h2Matches[1][0].length;
        const nextPMatch = result.slice(afterH2).match(/<\/p>|\n\n/i);
        if (nextPMatch && nextPMatch.index !== undefined) {
          const insertPos = afterH2 + nextPMatch.index + nextPMatch[0].length;
          result = `${result.slice(0, insertPos)}\n\n${tag}\n\n${result.slice(insertPos)}`;
        } else {
          result = `${result.slice(0, afterH2)}\n\n${tag}\n\n${result.slice(afterH2)}`;
        }
      }
    }
  });

  return result;
}

export interface NotebookCardProps {
  notebook: PostNotebook;
  index: number;
  onOpen: (tab?: 'images' | 'text') => void;
}

/**
 * 附錄卡片（可嵌入於正文段落中，或展示於文末）
 * 寬度嚴格鎖定 max-w-[768px] mx-auto，與電腦版正文段落完全同寬對齊
 */
export function NotebookCard({ notebook, onOpen }: NotebookCardProps) {
  const imagesCount = notebook.images ? notebook.images.length : 0;

  return (
    <section className="w-full max-w-[768px] mx-auto my-6 text-left rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-[#141416] p-4 sm:p-5 shadow-sm transition-colors">
      {/* 頂部中繼列：左側附錄標籤與圖片數，右側出處 */}
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <div className="flex items-center gap-2 shrink-0 whitespace-nowrap">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold tracking-wider uppercase bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 shrink-0 whitespace-nowrap">
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
              <path d="M6 6h10" />
              <path d="M6 10h10" />
            </svg>
            附錄
          </span>

          {imagesCount > 0 && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 shrink-0 whitespace-nowrap">
              <svg className="w-3 h-3 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                <circle cx="9" cy="9" r="2" />
                <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
              </svg>
              {imagesCount} 張圖片
            </span>
          )}
        </div>

        {notebook.source && (
          <span className="text-xs text-zinc-500 dark:text-zinc-400 truncate min-w-0 text-right ml-auto">
            出處：{notebook.source}
          </span>
        )}
      </div>

      {/* 附錄標題與操作按鈕：手機版縱向堆疊保留標題寬度，桌面版橫向緊湊排列 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h3 className="!m-0 !p-0 !text-base sm:!text-lg font-bold text-zinc-900 dark:text-white leading-snug">
          {notebook.title}
        </h3>

        <div className="shrink-0 flex items-center justify-end sm:justify-start gap-2 pt-1 sm:pt-0">
          {imagesCount > 0 && (
            <button
              type="button"
              onClick={() => onOpen('images')}
              className="inline-flex items-center justify-center gap-1 px-2.5 py-1 rounded text-xs font-semibold border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer shadow-sm"
            >
              <svg className="w-3 h-3 text-zinc-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                <circle cx="9" cy="9" r="2" />
                <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
              </svg>
              <span>查看圖片</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => onOpen('text')}
            className="inline-flex items-center justify-center gap-1 px-3 py-1 rounded text-xs font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors shadow-sm cursor-pointer"
          >
            <span>閱讀全文</span>
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
          </button>
        </div>
      </div>

      {/* 內文簡短說明：簡潔 Markdown 引用豎線樣式 (| 附錄內容)，無額外背景無大引號 */}
      {notebook.description && (
        <div className="mt-2.5 pl-3 border-l-2 border-red-500 text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed font-normal">
          {notebook.description}
        </div>
      )}
    </section>
  );
}

interface NotebookModalProps {
  notebooks?: PostNotebook[];
}

export interface NotebookModalDialogProps {
  notebook: PostNotebook;
  activeTab: 'images' | 'text';
  setActiveTab: (tab: 'images' | 'text') => void;
  currentSlide: number;
  setCurrentSlide: React.Dispatch<React.SetStateAction<number>>;
  onClose: () => void;
  onZoom: (url: string, alt: string) => void;
}

/**
 * 彈窗閱讀與圖片櫥窗 Dialog
 */
export function NotebookModalDialog({
  notebook,
  activeTab,
  setActiveTab,
  currentSlide,
  setCurrentSlide,
  onClose,
  onZoom,
}: NotebookModalDialogProps) {
  const touchStartXRef = useRef<number | null>(null);

  const images = notebook.images || [];
  const hasImages = images.length > 0;
  const hasContent = Boolean(notebook.content?.trim());

  const handlePrevSlide = useCallback(() => {
    if (!hasImages) return;
    setCurrentSlide((prev) => (prev > 0 ? prev - 1 : images.length - 1));
  }, [hasImages, images.length, setCurrentSlide]);

  const handleNextSlide = useCallback(() => {
    if (!hasImages) return;
    setCurrentSlide((prev) => (prev < images.length - 1 ? prev + 1 : 0));
  }, [hasImages, images.length, setCurrentSlide]);

  // 鍵盤導航：Esc 關閉，Left/Right 箭頭切換圖片
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (activeTab === 'images' && hasImages) {
        if (e.key === 'ArrowLeft') {
          handlePrevSlide();
        } else if (e.key === 'ArrowRight') {
          handleNextSlide();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    const unlock = lockBodyScroll();

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      unlock();
    };
  }, [activeTab, hasImages, onClose, handlePrevSlide, handleNextSlide]);

  // 觸控手勢滑動切換
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const deltaX = touchEndX - touchStartXRef.current;
    if (deltaX > 40) {
      handlePrevSlide();
    } else if (deltaX < -40) {
      handleNextSlide();
    }
    touchStartXRef.current = null;
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="notebook-modal-title"
      className="fixed inset-0 z-[100000] flex items-center justify-center p-4 sm:p-6 md:p-8"
    >
      {/* 背景遮罩 */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-[4px] transition-opacity duration-200 ease-out"
        onClick={onClose}
      />

      {/* 彈窗主體容器 */}
      <div className="relative w-full max-w-4xl max-h-[85vh] sm:max-h-[86vh] flex flex-col bg-white dark:bg-[#18181b] border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-200 text-left">
        {/* Header 頂部標題列 */}
        <div className="relative flex items-start justify-between px-5 sm:px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/90 dark:bg-zinc-900/90 shrink-0 pr-12 sm:pr-14">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1.5 min-w-0">
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold tracking-wider uppercase bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 shrink-0 whitespace-nowrap">
                附錄
              </span>
              {notebook.source && (
                <span className="text-xs text-zinc-500 dark:text-zinc-400 truncate min-w-0">
                  出處：{notebook.source}
                </span>
              )}
            </div>
            <h3
              id="notebook-modal-title"
              className="!m-0 !p-0 !text-base sm:!text-lg font-bold text-zinc-900 dark:text-white truncate"
            >
              {notebook.title}
            </h3>
          </div>

          {/* 右側關閉按鈕：精準置於右上角 */}
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 w-8 h-8 flex items-center justify-center rounded-lg text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200/60 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            aria-label="關閉視窗"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* 標籤分頁切換列（若同時有圖片與文字時呈現） */}
        {hasImages && hasContent && (
          <div className="flex items-center gap-2 px-5 py-2.5 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-100/60 dark:bg-zinc-900/40 shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab('images')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-[background-color,color] ${
                activeTab === 'images'
                  ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-sm'
                  : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/60 dark:hover:bg-zinc-800'
              }`}
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                <circle cx="9" cy="9" r="2" />
                <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
              </svg>
              <span>圖片櫥窗 ({images.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('text')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-[background-color,color] ${
                activeTab === 'text'
                  ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-sm'
                  : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/60 dark:hover:bg-zinc-800'
              }`}
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
              <span>文字內容</span>
            </button>
          </div>
        )}

        {/* Content 內容區塊 */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {notebook.description && (
            <div className="pl-3 border-l-2 border-red-500 text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed font-normal">
              {notebook.description}
            </div>
          )}

          {/* 圖片櫥窗（Carousel） */}
          {hasImages && (activeTab === 'images' || !hasContent) && (
            <div className="space-y-4">
              <div
                className="relative w-full max-h-[62vh] min-h-[260px] sm:min-h-[380px] bg-zinc-950 rounded-xl overflow-hidden flex items-center justify-center select-none shadow-inner"
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
              >
                {/* 主展示圖片（點擊可觸發全螢幕燈箱放大檢視） */}
                <img
                  src={images[currentSlide].url}
                  alt={images[currentSlide].caption || `第 ${currentSlide + 1} 張圖片`}
                  onClick={() =>
                    onZoom(
                      images[currentSlide].url,
                      images[currentSlide].caption || `${notebook.title} (${currentSlide + 1}/${images.length})`
                    )
                  }
                  className="max-h-[60vh] w-auto max-w-full object-contain cursor-zoom-in transition-transform duration-200"
                />

                {/* 左右導航按鈕（多於 1 張時顯示） */}
                {images.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={handlePrevSlide}
                      aria-label="上一張圖片"
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-black/60 hover:bg-black/85 text-white flex items-center justify-center transition-[background-color,transform] duration-150 cursor-pointer shadow-md focus:outline-none"
                    >
                      <svg className="w-5 h-5 sm:w-6 sm:h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="15 18 9 12 15 6" />
                      </svg>
                    </button>

                    <button
                      type="button"
                      onClick={handleNextSlide}
                      aria-label="下一張圖片"
                      className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-black/60 hover:bg-black/85 text-white flex items-center justify-center transition-[background-color,transform] duration-150 cursor-pointer shadow-md focus:outline-none"
                    >
                      <svg className="w-5 h-5 sm:w-6 sm:h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    </button>
                  </>
                )}

                {/* 計數器膠囊標籤 */}
                <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-black/75 text-white text-xs font-semibold tracking-wider flex items-center gap-1 shadow">
                  <span>{currentSlide + 1}</span>
                  <span className="opacity-60">/</span>
                  <span>{images.length}</span>
                </div>

                {/* 放大檢視提示標籤 */}
                <div className="absolute bottom-3 left-3 px-2.5 py-1 rounded-full bg-black/60 text-zinc-300 text-[11px] flex items-center gap-1 pointer-events-none">
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    <line x1="11" y1="8" x2="11" y2="14" />
                    <line x1="8" y1="11" x2="14" y2="11" />
                  </svg>
                  點擊圖片可放大檢視
                </div>
              </div>

              {/* 圖片說明題注 */}
              {images[currentSlide].caption && (
                <div className="text-center text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 py-1 font-medium">
                  {images[currentSlide].caption}
                </div>
              )}

              {/* 底部縮圖列（多於 1 張時顯示） */}
              {images.length > 1 && (
                <div className="flex items-center gap-2 overflow-x-auto py-1 px-1 justify-center">
                  {images.map((img, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setCurrentSlide(idx)}
                      className={`relative shrink-0 w-12 h-12 sm:w-16 sm:h-16 rounded-lg overflow-hidden border-2 transition-[border-color,opacity] duration-150 cursor-pointer ${
                        idx === currentSlide
                          ? 'border-red-500 ring-2 ring-red-500/30 opacity-100'
                          : 'border-transparent opacity-50 hover:opacity-90'
                      }`}
                    >
                      <img src={img.url} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 文字長文閱讀區 */}
          {hasContent && (activeTab === 'text' || !hasImages) && (
            <div className="whitespace-pre-wrap font-sans text-sm sm:text-base leading-relaxed text-zinc-800 dark:text-zinc-200 selection:bg-red-500/20 break-words font-normal">
              {notebook.content}
            </div>
          )}
        </div>

        {/* Footer 底部狀態列（僅於有圖片櫥窗時顯示頁面資訊，不放重複的關閉按鈕與字數） */}
        {hasImages && (
          <div className="px-5 py-2.5 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/90 dark:bg-zinc-900/90 flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 shrink-0">
            <span>共 {images.length} 張圖片</span>
            <span className="text-[11px] text-zinc-400 dark:text-zinc-500">按 ESC 或點擊右上角 ✕ 關閉</span>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

export function NotebookModal({ notebooks = [] }: NotebookModalProps) {
  const [activeNotebookIndex, setActiveNotebookIndex] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'images' | 'text'>('images');
  const [currentSlide, setCurrentSlide] = useState(0);

  const { open: openZoom, overlay: lightboxOverlay } = useLightbox();

  const activeNotebook = activeNotebookIndex !== null ? notebooks[activeNotebookIndex] : null;

  const handleOpen = (index: number, preferredTab?: 'images' | 'text') => {
    const nb = notebooks[index];
    const nbHasImages = (nb?.images || []).length > 0;
    setActiveNotebookIndex(index);
    setCurrentSlide(0);
    if (preferredTab) {
      setActiveTab(preferredTab);
    } else {
      setActiveTab(nbHasImages ? 'images' : 'text');
    }
  };

  const handleClose = useCallback(() => {
    setActiveNotebookIndex(null);
  }, []);

  if (!notebooks || notebooks.length === 0) {
    return null;
  }

  return (
    <div className="w-full max-w-[768px] mx-auto my-8 space-y-4">
      {/* 嵌入卡片清單 */}
      {notebooks.map((nb, index) => (
        <NotebookCard
          key={nb.id || index}
          notebook={nb}
          index={index}
          onOpen={(tab) => handleOpen(index, tab)}
        />
      ))}

      {/* 彈窗 Popup Modal */}
      {activeNotebook && (
        <NotebookModalDialog
          notebook={activeNotebook}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          currentSlide={currentSlide}
          setCurrentSlide={setCurrentSlide}
          onClose={handleClose}
          onZoom={openZoom}
        />
      )}

      {/* 燈箱縮放覆蓋層 */}
      {lightboxOverlay}
    </div>
  );
}
