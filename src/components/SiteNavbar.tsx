"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";
import { useDialogFocus } from "./useDialogFocus";
import { NAV_FALLBACK, categoryPath, type NavCategory } from "@/lib/config";
import { toPlainShareTitle } from "@/lib/seo";
import { SearchIcon, PenIcon, CloseIcon } from "./Icons";
import ThemeSwitch from "@/components/arc/theme-switch/theme-switch";
import { SkeletonBox } from "@/components/arc";

interface SearchResult {
  slug: string;
  title: string;
  excerpt?: string;
  publishedAt?: string;
  coverImage?: string;
  category?: string;
  source?: string;
}

const SEARCH_PLACEHOLDER_IMAGE = "/og-image.png";

/** 與 globals.css 的 .search-panel[data-closing] 過場時間一致 */
const SEARCH_EXIT_MS = 120;

function formatSearchDate(value?: string): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("zh-TW", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(d);
}

export function SiteNavbar({ 
  navItems = NAV_FALLBACK,
  latestPostsByCategory = {}
}: { 
  navItems?: NavCategory[],
  latestPostsByCategory?: Record<string, { slug: string; title: string; coverImage?: string }[]>
}) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [activeFlyout, setActiveFlyout] = useState<{ name: string; left: number } | null>(null);
  const navWrapperRef = useRef<HTMLDivElement>(null);
  const closeFlyoutTimer = useRef<NodeJS.Timeout | null>(null);

  const handleItemEnter = (item: string, e: React.MouseEvent<HTMLDivElement>) => {
    if (closeFlyoutTimer.current) clearTimeout(closeFlyoutTimer.current);
    if (!latestPostsByCategory[item] || latestPostsByCategory[item].length === 0) {
      setActiveFlyout(null);
      return;
    }
    const wrapperRect = navWrapperRef.current?.getBoundingClientRect();
    const itemRect = e.currentTarget.getBoundingClientRect();
    if (wrapperRect) {
      const left = itemRect.left - wrapperRect.left + itemRect.width / 2;
      setActiveFlyout({ name: item, left });
    }
  };

  const handleItemLeave = () => {
    if (closeFlyoutTimer.current) clearTimeout(closeFlyoutTimer.current);
    closeFlyoutTimer.current = setTimeout(() => {
      setActiveFlyout(null);
    }, 120);
  };

  const handleFlyoutEnter = () => {
    if (closeFlyoutTimer.current) clearTimeout(closeFlyoutTimer.current);
  };

  const handleFlyoutLeave = () => {
    if (closeFlyoutTimer.current) clearTimeout(closeFlyoutTimer.current);
    closeFlyoutTimer.current = setTimeout(() => {
      setActiveFlyout(null);
    }, 120);
  };
  const [isSearchClosing, setIsSearchClosing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [pathname, setPathname] = useState("/");
  const [isMounted, setIsMounted] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [currentTheme, setCurrentTheme] = useState<"light" | "dark">("dark");
  const lastScrollY = useRef(0);

  useEffect(() => {
    setIsMounted(true);
    const isDark =
      document.documentElement.classList.contains("dark") ||
      document.documentElement.getAttribute("data-theme") === "dark";
    setCurrentTheme(isDark ? "dark" : "light");

    const handleThemeChanged = (e: any) => {
      if (e.detail?.theme) {
        setCurrentTheme(e.detail.theme);
      }
    };
    window.addEventListener("theme-changed", handleThemeChanged);
    return () => window.removeEventListener("theme-changed", handleThemeChanged);
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setPathname(window.location.pathname);
    }
  }, []);

  // 手機版往下滑自動隱藏、往上滑顯示
  useEffect(() => {
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const currentScrollY = window.scrollY;
          if (isMenuOpen || isSearchOpen || currentScrollY < 20) {
            setIsVisible(true);
          } else {
            const diff = currentScrollY - lastScrollY.current;
            if (diff > 8 && currentScrollY > 60) {
              setIsVisible(false);
            } else if (diff < -8) {
              setIsVisible(true);
            }
          }
          lastScrollY.current = currentScrollY;
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isMenuOpen, isSearchOpen]);

  const handleThemeChange = (next: "light" | "dark") => {
    setCurrentTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    if (next === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    try {
      localStorage.setItem("theme", next);
    } catch {}
    window.dispatchEvent(new CustomEvent("theme-changed", { detail: { theme: next } }));
  };

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`);
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setIsSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // 離場：@starting-style 只管進場，元素一 unmount 就是瞬間消失。
  // 全螢幕的背景模糊瞬間拔掉那一格很跳，所以先標記 data-closing
  // 讓 CSS 淡出，再真的卸載。所有關閉路徑都走這個函式，狀態不會漏掉。
  const closeSearch = useCallback(() => {
    setIsSearchClosing((closing) => {
      if (closing) return closing;
      window.setTimeout(() => {
        setIsSearchOpen(false);
        setIsSearchClosing(false);
        setSearchQuery("");
        setSearchResults([]);
      }, SEARCH_EXIT_MS);
      return true;
    });
  }, []);

  // 宣告了 aria-modal 就得做到：焦點鎖在面板內、ESC 關閉、背景不捲動，
  // 關閉後焦點回到放大鏡鈕。
  const searchPanelRef = useDialogFocus<HTMLDivElement>(isSearchOpen, closeSearch);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    window.location.href = `/search?q=${encodeURIComponent(searchQuery)}`;
    closeSearch();
  };

  return (
    <div
      className={`fixed top-4 left-1/2 -translate-x-1/2 w-[95%] xl:w-[calc(100%-480px)] z-[99999] flex flex-col gap-2 transition-[transform,opacity] duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] ${
        !isVisible
          ? "max-md:-translate-y-28 max-md:opacity-0 max-md:pointer-events-none"
          : "translate-y-0 opacity-100"
      }`}
    >
      <nav className="w-full liquid-glass-nav rounded-[var(--radius-panel)] h-[58px] px-4 md:px-6 flex items-center justify-between transition-[background-color,border-color,box-shadow] duration-200">
        <div className="flex items-center gap-4">
          <button 
            type="button"
            className="md:hidden text-[var(--foreground)] flex flex-col gap-[5px] w-6 h-6 justify-center items-center relative active:scale-[0.92] transition-[transform,opacity] duration-150"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label={isMenuOpen ? "關閉選單" : "開啟選單"}
            aria-expanded={isMenuOpen}
            aria-controls="mobile-nav-menu"
          >
            <span className={`block w-5 h-[2px] bg-current transition-transform duration-300 ${isMenuOpen ? 'rotate-45 translate-y-[7px]' : ''}`}></span>
            <span className={`block w-5 h-[2px] bg-current transition-opacity duration-300 ${isMenuOpen ? 'opacity-0' : ''}`}></span>
            <span className={`block w-5 h-[2px] bg-current transition-transform duration-300 ${isMenuOpen ? '-rotate-45 -translate-y-[7px]' : ''}`}></span>
          </button>
          <a href="/" className="flex items-center hover:opacity-80 transition-opacity" aria-label="SORAI 首頁">
            <img src="/sorai-logotype_w.png" alt="SORAI" className="h-6 w-auto invert dark:invert-0" />
          </a>
        </div>

        <div className="hidden md:flex items-center gap-1.5 lg:gap-2 h-full">
          {navItems.map(({ name: item, slug }) => {
            const isActive = pathname === categoryPath(slug);
            return (
              <div 
                key={slug} 
                className="relative h-full flex items-center cursor-pointer"
                onMouseEnter={(e) => handleItemEnter(item, e)}
                onMouseLeave={handleItemLeave}
              >
                <a 
                  href={categoryPath(slug)} 
                  className={`text-xs tracking-wide font-medium px-3 py-1.5 rounded-[var(--radius-control)] transition-[color,background-color] duration-150 ${
                    isActive 
                      ? "text-[var(--foreground)] font-semibold bg-[var(--surface-muted)]" 
                      : "text-[var(--text-secondary)] hover:text-[var(--foreground)] hover:bg-[var(--surface-muted)]"
                  }`}
                >
                  {item}
                </a>
              </div>
            );
          })}
        </div>

        <div className="flex items-center gap-1 sm:gap-2">
          <button 
            type="button"
            onClick={() => setIsSearchOpen(true)}
            className="flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--foreground)] active:scale-[0.92] transition-[transform,color,background-color] duration-150 p-2 rounded-[var(--radius-control)] hover:bg-[var(--surface-muted)] cursor-pointer"
            aria-label="搜尋"
          >
            <SearchIcon size={18} />
          </button>

          <a
            href="/submit"
            className={`flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--foreground)] active:scale-[0.92] transition-[transform,color,background-color] duration-150 p-2 rounded-[var(--radius-control)] hover:bg-[var(--surface-muted)] cursor-pointer ${pathname === "/submit" ? "text-[var(--foreground)] bg-[var(--surface-muted)]" : ""}`}
            aria-label="投稿"
            title="讀者投稿"
          >
            <PenIcon size={18} />
          </a>

          <ThemeSwitch
            theme={currentTheme}
            variant="reveal"
            onThemeChange={handleThemeChange}
            iconOnly
            label="切換深淺模式"
          />
        </div>
      </nav>

      {/* 桌面端 Hover Flyout：脫離 nav 的 backdrop-filter 堆疊限制，完美繼承視窗背景，透明毛玻璃 100% 生效 */}
      <AnimatePresence>
        {activeFlyout && latestPostsByCategory[activeFlyout.name]?.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.15, ease: [0.23, 1, 0.32, 1] }}
            style={{ left: activeFlyout.left }}
            className="hidden md:flex flex-col absolute top-[64px] -translate-x-1/2 z-50 pointer-events-auto"
            onMouseEnter={handleFlyoutEnter}
            onMouseLeave={handleFlyoutLeave}
          >
            <div className="w-[320px] rounded-[var(--radius-panel)] liquid-glass-nav flex flex-col overflow-hidden p-2 shadow-2xl">
              <div className="px-3 py-1.5 bg-[var(--surface-muted)]/60 rounded-[var(--radius-control)] mb-1.5 flex items-center">
                <span className="text-xs font-semibold text-[var(--foreground)]">
                  最新 {activeFlyout.name} 報導
                </span>
              </div>
              <div className="flex flex-col gap-1">
                {latestPostsByCategory[activeFlyout.name].map((post) => (
                  <a 
                    key={post.slug} 
                    href={`/post/${post.slug}`}
                    className="flex flex-col px-2.5 py-2 rounded-[var(--radius-control)] hover:bg-[var(--surface-muted)] transition-colors group/post"
                  >
                    <span className="text-xs sm:text-[13px] font-medium text-[var(--foreground)] line-clamp-2 leading-snug group-hover/post:text-[var(--accent)] transition-colors">
                      {toPlainShareTitle(post.title)}
                    </span>
                  </a>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            id="mobile-nav-menu"
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
            className="md:hidden w-full rounded-[var(--radius-panel)] liquid-glass-nav overflow-hidden flex flex-col p-2.5 gap-1 mt-2"
          >
            {navItems.map(({ name: item, slug }) => (
              <a 
                key={slug} 
                href={categoryPath(slug)} 
                className="w-full px-3 py-2.5 rounded-[var(--radius-control)] text-base font-medium text-[var(--foreground)] hover:bg-[var(--surface-muted)] transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                {item}
              </a>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/*
        導覽列外層帶了 -translate-x-1/2，transform 會讓子元素的 fixed 以它為基準，
        霧化就只會蓋到導覽列。所以搜尋浮層要 portal 到 body 才能蓋滿整個視窗。
      */}
      {isMounted &&
        isSearchOpen &&
        createPortal(
        <div
          className="fixed inset-0 z-[100000] flex items-start justify-center px-4 pt-[12vh]"
          role="dialog"
          aria-modal="true"
          aria-label="搜尋文章"
        >
          <div
            className="search-backdrop absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-[6px]"
            data-closing={isSearchClosing || undefined}
            onClick={closeSearch}
          />

          <div
            ref={searchPanelRef}
            className="search-panel relative w-full max-w-[720px] bg-[var(--surface-raised)] rounded-[var(--radius-panel)] shadow-2xl overflow-hidden"
            data-closing={isSearchClosing || undefined}
          >
            <form onSubmit={handleSearch} className="flex items-center gap-3 px-5 h-16 bg-[var(--surface)]">
              <span className="text-[var(--text-muted)] shrink-0">
                <SearchIcon size={20} />
              </span>
              <input
                type="text"
                placeholder="搜尋文章標題或摘要..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 bg-transparent text-base text-[var(--foreground)] placeholder:text-[var(--text-muted)] outline-none focus-visible:outline-none"
              />
              <button
                type="button"
                onClick={closeSearch}
                className="shrink-0 p-1.5 -mr-1.5 rounded-full text-[var(--text-muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-muted)] active:scale-[0.92] transition-[transform,color,background-color] duration-150"
                aria-label="關閉搜尋"
              >
                <CloseIcon size={20} />
              </button>
            </form>

            {searchQuery.trim().length > 0 && (
              <div className="flex flex-col max-h-[60vh]" aria-live="polite" aria-busy={isSearching}>
                {isSearching ? (
                  <div className="skullet-sweep overflow-y-auto flex flex-col p-2 gap-1">
                    {Array.from({ length: 3 }).map((_, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-4 px-4 py-3 rounded-[var(--radius-control)]"
                      >
                        <div className="skullet-bone w-28 sm:w-36 aspect-video shrink-0 rounded-xl" />
                        <div className="flex-1 min-w-0 flex flex-col gap-2">
                          <div className="skullet-bone h-3 w-16 rounded-full" />
                          <div className="skullet-bone h-4 w-11/12 rounded-full" />
                          <div className="skullet-bone h-3.5 w-3/5 rounded-full" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : searchResults.length > 0 ? (
                  <>
                    <p className="sr-only">找到 {searchResults.length} 篇文章</p>
                    <div className="overflow-y-auto flex flex-col p-2 gap-1">
                      {searchResults.map((result) => (
                        <a
                          key={result.slug}
                          href={`/post/${result.slug}`}
                          onClick={closeSearch}
                          className="group flex items-center gap-4 px-4 py-3 rounded-[var(--radius-control)] hover:bg-[var(--surface-muted)] transition-colors"
                        >
                          <div className="w-28 sm:w-36 aspect-video shrink-0 rounded-[var(--radius-control)] overflow-hidden bg-[var(--surface-muted)]">
                            <img
                              src={result.coverImage || SEARCH_PLACEHOLDER_IMAGE}
                              alt={result.title}
                              loading="lazy"
                              className="w-full h-full object-cover cover-zoom"
                            />
                          </div>
                          <div className="flex-1 min-w-0 flex flex-col">
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mb-1.5 text-xs font-normal text-[var(--text-muted)]">
                              {result.publishedAt && (
                                <span>{formatSearchDate(result.publishedAt)}</span>
                              )}
                            </div>
                            <h3 className="text-sm sm:text-base font-medium text-[var(--foreground)] leading-snug line-clamp-2 group-hover:text-[var(--accent)] transition-colors">
                              {result.title}
                            </h3>
                          </div>
                        </a>
                      ))}
                    </div>
                    <a
                      href={`/search?q=${encodeURIComponent(searchQuery)}`}
                      onClick={closeSearch}
                      className="shrink-0 px-5 py-3 bg-[var(--surface-muted)] text-center text-xs font-medium text-[var(--foreground)] hover:bg-[var(--surface)] transition-colors"
                    >
                      查看完整搜尋結果 →
                    </a>
                  </>
                ) : (
                  <div className="py-14 text-center text-sm font-normal text-[var(--text-muted)]">
                    找不到相關文章
                  </div>
                )}
              </div>
            )}
          </div>
        </div>,
          document.body
        )}
    </div>
  );
}
