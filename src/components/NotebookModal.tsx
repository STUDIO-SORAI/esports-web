import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { PostNotebook } from '../lib/types';
import { useLightbox } from './Lightbox';
import { lockBodyScroll } from './scrollLock';
import { Badge } from '@/components/arc/badge/badge';
import { Button } from '@/components/arc/button/button';

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

interface NotebookCardProps {
  notebook: PostNotebook;
  index: number;
  onOpen: (tab?: 'images' | 'text') => void;
}

/**
 * 附錄卡片（可嵌入於正文段落中，或展示於文末）
 */
export function NotebookCard({ notebook, onOpen }: NotebookCardProps) {
  const imagesCount = notebook.images ? notebook.images.length : 0;

  return (
    <section className="w-full max-w-[768px] mx-auto my-6 text-left rounded-[var(--radius-panel)] bg-[var(--surface)] hover:bg-[var(--surface-muted)] p-4 sm:p-5 transition-[background-color] duration-150 shadow-xs">
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <div className="flex items-center gap-2 shrink-0 whitespace-nowrap">
          <Badge variant="accent" size="sm">
            <svg className="w-3 h-3 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
              <path d="M6 6h10" />
              <path d="M6 10h10" />
            </svg>
            附錄
          </Badge>

          {imagesCount > 0 && (
            <Badge variant="neutral" size="sm">
              <svg className="w-3 h-3 mr-1 text-[var(--accent)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                <circle cx="9" cy="9" r="2" />
                <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
              </svg>
              {imagesCount} 張圖片
            </Badge>
          )}
        </div>

        {notebook.source && (
          <span className="text-xs text-[var(--text-muted)] truncate min-w-0 text-right ml-auto">
            出處：{notebook.source}
          </span>
        )}
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h3 className="!m-0 !p-0 !text-base sm:!text-lg font-serif font-medium text-[var(--foreground)] leading-snug">
          {notebook.title}
        </h3>

        <div className="shrink-0 flex items-center justify-end sm:justify-start gap-2 pt-1 sm:pt-0">
          {imagesCount > 0 && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => onOpen('images')}
              className="gap-1 text-xs font-medium"
            >
              <svg className="w-3 h-3 text-[var(--text-secondary)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                <circle cx="9" cy="9" r="2" />
                <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
              </svg>
              <span>查看圖片</span>
            </Button>
          )}

          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={() => onOpen('text')}
            className="gap-1 text-xs font-medium"
          >
            <span>閱讀全文</span>
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
          </Button>
        </div>
      </div>

      {notebook.description && (
        <div className="mt-2.5 pl-3 border-l-2 border-[var(--accent)] text-xs text-[var(--text-secondary)] leading-relaxed font-normal">
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
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-[4px] transition-opacity duration-200 ease-out"
        onClick={onClose}
      />

      <div className="relative w-full max-w-4xl max-h-[85vh] sm:max-h-[86vh] flex flex-col bg-[var(--surface-raised)] rounded-[var(--radius-panel)] shadow-2xl overflow-hidden z-10 text-left">
        <div className="relative flex items-start justify-between px-5 sm:px-6 py-4 bg-[var(--surface-muted)] shrink-0 pr-12 sm:pr-14">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1.5 min-w-0">
              <Badge variant="accent" size="sm">附錄</Badge>
              {notebook.source && (
                <span className="text-xs text-[var(--text-muted)] truncate min-w-0">
                  出處：{notebook.source}
                </span>
              )}
            </div>
            <h3
              id="notebook-modal-title"
              className="!m-0 !p-0 !text-base sm:!text-lg font-serif font-medium text-[var(--foreground)] truncate"
            >
              {notebook.title}
            </h3>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 w-8 h-8 flex items-center justify-center rounded-[var(--radius-control)] text-[var(--text-muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-muted)] transition-colors cursor-pointer"
            aria-label="關閉視窗"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {hasImages && hasContent && (
          <div className="flex items-center gap-2 px-5 py-2.5 bg-[var(--surface-muted)] shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab('images')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-control)] text-xs font-medium transition-[background-color,color] ${
                activeTab === 'images'
                  ? 'bg-[var(--surface)] text-[var(--foreground)] shadow-xs'
                  : 'text-[var(--text-secondary)] hover:text-[var(--foreground)] hover:bg-[var(--surface)]'
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
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-control)] text-xs font-medium transition-[background-color,color] ${
                activeTab === 'text'
                  ? 'bg-[var(--surface)] text-[var(--foreground)] shadow-xs'
                  : 'text-[var(--text-secondary)] hover:text-[var(--foreground)] hover:bg-[var(--surface)]'
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

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {notebook.description && (
            <div className="pl-3 border-l-2 border-[var(--accent)] text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed font-normal">
              {notebook.description}
            </div>
          )}

          {hasImages && (activeTab === 'images' || !hasContent) && (
            <div className="space-y-4">
              <div
                className="relative w-full max-h-[62vh] min-h-[260px] sm:min-h-[380px] bg-black/90 rounded-[var(--radius-panel)] overflow-hidden flex items-center justify-center select-none shadow-inner"
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
              >
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

                {images.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={handlePrevSlide}
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-[var(--surface)] text-[var(--foreground)] flex items-center justify-center hover:text-[var(--accent)] transition-colors shadow-md"
                      aria-label="上一張圖片"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="15 18 9 12 15 6" />
                      </svg>
                    </button>

                    <button
                      type="button"
                      onClick={handleNextSlide}
                      className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-[var(--surface)] text-[var(--foreground)] flex items-center justify-center hover:text-[var(--accent)] transition-colors shadow-md"
                      aria-label="下一張圖片"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    </button>
                  </>
                )}

                <div className="absolute top-3 right-3 px-2 py-0.5 rounded-[var(--radius-control)] bg-black/60 text-white text-[11px] font-medium tabular-nums flex items-center gap-1 shadow">
                  <span>{currentSlide + 1}</span>
                  <span className="opacity-60">/</span>
                  <span>{images.length}</span>
                </div>

                <div className="absolute bottom-3 left-3 px-2.5 py-1 rounded-[var(--radius-control)] bg-black/60 text-white/80 text-[11px] flex items-center gap-1 pointer-events-none">
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    <line x1="11" y1="8" x2="11" y2="14" />
                    <line x1="8" y1="11" x2="14" y2="11" />
                  </svg>
                  點擊圖片可放大檢視
                </div>
              </div>

              {images[currentSlide].caption && (
                <div className="text-center text-xs sm:text-sm text-[var(--text-secondary)] py-1 font-normal">
                  {images[currentSlide].caption}
                </div>
              )}

              {images.length > 1 && (
                <div className="flex items-center gap-2 overflow-x-auto py-1 px-1 justify-center">
                  {images.map((img, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setCurrentSlide(idx)}
                      className={`relative shrink-0 w-12 h-12 sm:w-16 sm:h-16 rounded-[var(--radius-control)] overflow-hidden border-2 transition-[border-color,opacity] duration-150 cursor-pointer ${
                        idx === currentSlide
                          ? 'border-[var(--accent)] opacity-100'
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

          {hasContent && (activeTab === 'text' || !hasImages) && (
            <div className="whitespace-pre-wrap font-sans text-sm sm:text-base leading-relaxed text-[var(--foreground)] selection:bg-[var(--accent-subtle)] break-words font-normal">
              {notebook.content}
            </div>
          )}
        </div>

        {hasImages && (
          <div className="px-5 py-2.5 bg-[var(--surface-muted)] flex items-center justify-between text-xs text-[var(--text-muted)] shrink-0">
            <span>共 {images.length} 張圖片</span>
            <span className="text-[11px] text-[var(--text-muted)]">按 ESC 或點擊右上角 ✕ 關閉</span>
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
      {notebooks.map((nb, index) => (
        <NotebookCard
          key={nb.id || index}
          notebook={nb}
          index={index}
          onOpen={(tab) => handleOpen(index, tab)}
        />
      ))}

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

      {lightboxOverlay}
    </div>
  );
}
