"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { useDialogFocus } from "./useDialogFocus";
import { NAV_FALLBACK, categoryPath, type NavCategory } from "@/lib/config";
import { toPlainShareTitle } from "@/lib/seo";
import { SunIcon, MoonIcon, SearchIcon, PenIcon, CloseIcon } from "./Icons";

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
  const [isSearchClosing, setIsSearchClosing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [pathname, setPathname] = useState("/");
  const [isMounted, setIsMounted] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const lastScrollY = useRef(0);

  useEffect(() => setIsMounted(true), []);

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

  const toggleTheme = () => {
    const isDark = document.documentElement.classList.toggle("dark");
    try {
      localStorage.setItem("theme", isDark ? "dark" : "light");
    } catch {}
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
      className={`fixed top-4 left-1/2 -translate-x-1/2 w-[95%] lg:w-[70%] z-[99999] flex flex-col gap-2 transition-[transform,opacity] duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] ${
        !isVisible
          ? "max-md:-translate-y-28 max-md:opacity-0 max-md:pointer-events-none"
          : "translate-y-0 opacity-100"
      }`}
    >
      <nav className="w-full bg-white dark:bg-[#18181b] border border-zinc-200 dark:border-zinc-800 rounded-2xl h-[60px] px-4 md:px-6 flex items-center justify-between shadow-lg shadow-black/5 dark:shadow-black/40">
        <div className="flex items-center gap-4">
          <button 
            type="button"
            className="md:hidden text-zinc-800 dark:text-zinc-200 flex flex-col gap-[5px] w-6 h-6 justify-center items-center relative"
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

        <div className="hidden md:flex items-center gap-6 h-full">
          {navItems.map(({ name: item, slug }) => (
            <div key={slug} className="relative h-full flex items-center group/navitem">
              <a 
                href={categoryPath(slug)} 
                className={`font-sans text-xs tracking-widest font-bold uppercase transition-colors ${pathname === categoryPath(slug) ? "text-red-500 dark:text-red-400" : "text-zinc-800 dark:text-zinc-200 hover:text-red-500 dark:hover:text-red-400"}`}
              >
                {item}
              </a>
              {latestPostsByCategory[item] && latestPostsByCategory[item].length > 0 && (
                <div className="absolute top-[100%] left-1/2 -translate-x-1/2 pt-2 opacity-0 -translate-y-2 pointer-events-none group-hover/navitem:opacity-100 group-hover/navitem:translate-y-0 group-hover/navitem:pointer-events-auto group-focus-within/navitem:opacity-100 group-focus-within/navitem:translate-y-0 group-focus-within/navitem:pointer-events-auto transition-[opacity,transform] duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] z-50">
                  <div className="w-[300px] bg-white dark:bg-[#18181b] border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl flex flex-col overflow-hidden">
                    <div className="px-4 py-2 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
                      <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">最新 {item} 文章</span>
                    </div>
                    <div className="flex flex-col">
                      {latestPostsByCategory[item].map(post => (
                        <a 
                          key={post.slug} 
                          href={`/post/${post.slug}`}
                          className="flex flex-col px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/80 transition-colors border-b border-zinc-200 dark:border-zinc-800 last:border-0 group/post"
                        >
                          <span className="text-sm font-bold text-zinc-800 dark:text-zinc-200 line-clamp-2 leading-snug group-hover/post:text-red-500 dark:group-hover/post:text-red-400 transition-colors">
                            {toPlainShareTitle(post.title)}
                          </span>
                        </a>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <a
            href="/submit"
            className={`flex text-zinc-500 dark:text-zinc-400 hover:text-red-500 dark:hover:text-red-400 transition-colors p-2 ${pathname === "/submit" ? "text-red-500 dark:text-red-400" : ""}`}
            aria-label="投稿"
            title="讀者投稿"
          >
            <PenIcon size={18} />
          </a>

          <button 
            type="button"
            onClick={() => setIsSearchOpen(true)}
            className="text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors p-2"
            aria-label="搜尋"
          >
            <SearchIcon size={18} />
          </button>
        </div>
      </nav>

      {isMenuOpen && (
        <div
          id="mobile-nav-menu"
          className="md:hidden w-full bg-white dark:bg-[#18181b] border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl shadow-black/5 dark:shadow-black/40 overflow-hidden flex flex-col p-4"
        >
          {navItems.map(({ name: item, slug }) => (
             <a 
              key={slug} 
              href={categoryPath(slug)} 
              className="w-full py-3 font-serif text-lg text-zinc-800 dark:text-zinc-200 hover:text-red-500 dark:hover:text-red-400 transition-colors border-b border-zinc-200 dark:border-zinc-800 last:border-0"
              onClick={() => setIsMenuOpen(false)}
            >
              {item}
            </a>
          ))}
        </div>
      )}

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
          {/*
            霧化層是鋪滿整個容器的子元素，點擊一定落在它身上而不是容器本身，
            所以關閉要掛在它上面（掛在容器上判斷 target === currentTarget 永遠不成立）。
          */}
          <div
            // 6px 而不是 backdrop-blur-md（12px）：滿版的 backdrop-filter 在 opacity
            // 過場那 160ms 內每一幀都要重算全頁模糊，半徑越大越貴。與燈箱一致。
            className="search-backdrop absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-[6px]"
            data-closing={isSearchClosing || undefined}
            // 用 click 不用 mousedown：mousedown 一關掉浮層，接著的 click 會穿透到
            // 底下的連結把人帶走。click 是在霧化層還在的時候就被它接住的。
            onClick={closeSearch}
          />

          <div
            ref={searchPanelRef}
            className="search-panel relative w-full max-w-[720px] bg-white/95 dark:bg-[#18181b]/95 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl shadow-black/20 dark:shadow-black/60 overflow-hidden"
            data-closing={isSearchClosing || undefined}
          >
            <form onSubmit={handleSearch} className="flex items-center gap-3 px-5 h-16 border-b border-zinc-200 dark:border-zinc-800">
              <span className="text-zinc-400 dark:text-zinc-500 shrink-0">
                <SearchIcon size={20} />
              </span>
              <input
                type="text"
                placeholder="搜尋文章標題或摘要..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                // 焦點指示交給原生的文字游標，不再額外套一圈外框。
                // 需要 focus-visible:outline-none 才蓋得掉 globals.css 的全站焦點樣式：
                // 單獨的 outline-none 與它同專一度，會被排在後面的全站規則壓過去。
                className="flex-1 bg-transparent text-base text-zinc-800 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 outline-none focus-visible:outline-none"
              />
              <button
                type="button"
                onClick={closeSearch}
                className="shrink-0 p-1.5 -mr-1.5 rounded-full text-zinc-500 dark:text-zinc-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                aria-label="關閉搜尋"
              >
                <CloseIcon size={20} />
              </button>
            </form>

            {searchQuery.trim().length > 0 && (
              // 結果是非同步換上來的，沒有 live region 的話螢幕閱讀器不會知道
              // 搜尋跑完了、也不會知道找到幾筆。
              <div className="flex flex-col max-h-[60vh]" aria-live="polite" aria-busy={isSearching}>
                {isSearching ? (
                  <div className="py-14 text-center text-sm text-zinc-500 dark:text-zinc-400 animate-pulse">
                    正在搜尋...
                  </div>
                ) : searchResults.length > 0 ? (
                  <>
                    <p className="sr-only">找到 {searchResults.length} 篇文章</p>
                    <div className="overflow-y-auto divide-y divide-zinc-200 dark:divide-zinc-800">
                      {searchResults.map((result) => (
                        <a
                          key={result.slug}
                          href={`/post/${result.slug}`}
                          onClick={closeSearch}
                          className="group flex items-center gap-4 px-5 py-4 hover:bg-zinc-100/80 dark:hover:bg-zinc-800/60 transition-colors"
                        >
                          <div className="w-28 sm:w-36 aspect-video shrink-0 rounded overflow-hidden bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                            <img
                              src={result.coverImage || SEARCH_PLACEHOLDER_IMAGE}
                              alt={result.title}
                              loading="lazy"
                              className="w-full h-full object-cover cover-zoom"
                            />
                          </div>
                          <div className="flex-1 min-w-0 flex flex-col">
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mb-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-500">
                              {result.source && <span className="text-cyan-600 dark:text-cyan-500">[{result.source}]</span>}
                              {result.publishedAt && (
                                <>
                                  <span className="opacity-50">|</span>
                                  <span>{formatSearchDate(result.publishedAt)}</span>
                                </>
                              )}
                            </div>
                            <h3 className="text-sm sm:text-base font-bold text-zinc-800 dark:text-zinc-200 leading-snug line-clamp-2 group-hover:text-red-500 dark:group-hover:text-red-400 transition-colors">
                              {result.title}
                            </h3>
                          </div>
                        </a>
                      ))}
                    </div>
                    <a
                      href={`/search?q=${encodeURIComponent(searchQuery)}`}
                      onClick={closeSearch}
                      className="shrink-0 px-5 py-3 bg-red-50 dark:bg-red-500/10 text-center text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-500 hover:text-white dark:hover:bg-red-500 dark:hover:text-white transition-colors"
                    >
                      查看完整搜尋結果 →
                    </a>
                  </>
                ) : (
                  <div className="py-14 text-center text-sm font-bold text-zinc-500 dark:text-zinc-400">
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
