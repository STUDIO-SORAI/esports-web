"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { motion, MotionConfig } from "framer-motion";
import type { Brief } from "@/lib/types";
import { categoryPath } from "@/lib/config";
import { toPlainShareTitle } from "@/lib/seo";
import { briefBodyToText } from "@/lib/briefBody";
import { formatFeedTime } from "@/lib/api";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/arc";
import { BriefBody } from "./BriefBody";
import { BriefMedia } from "./BriefMedia";

interface FeedPageProps {
  briefs: Brief[];
  games?: { name: string; slug: string }[];
  initialCategory?: string;
}

interface GameTab {
  key: string;
  label: string;
  short: string;
  logo: string;
  aliases: string[];
}

const DEFAULT_GAMES: GameTab[] = [
  { key: "all", label: "全部快訊", short: "全部", logo: "", aliases: ["all"] },
  {
    key: "valorant",
    label: "特戰英豪",
    short: "Val",
    logo: "/games/valorant/color.png",
    aliases: ["valorant", "特戰英豪", "特戰", "test", "vct"],
  },
  {
    key: "lol",
    label: "英雄聯盟",
    short: "LoL",
    logo: "/games/lol/color.png",
    aliases: ["lol", "英雄聯盟", "lolesports", "lck", "lpl", "lcs", "lec", "cblol", "lcp"],
  },
  {
    key: "r6",
    label: "虹彩六號",
    short: "R6",
    logo: "/games/r6/white.png",
    aliases: ["r6", "虹彩六號", "rainbow6", "rainbow 6", "rainbow-six"],
  },
  {
    key: "cs2",
    label: "CS2",
    short: "CS2",
    logo: "/games/cs2/color.png",
    aliases: ["cs2", "絕對武力", "絕對武力2", "cs", "counter-strike"],
  },
];

export function FeedPage({
  briefs,
  games = [],
  initialCategory = "all",
}: FeedPageProps) {
  const [activeTab, setActiveTab] = useState<string>(initialCategory || "all");
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const c = params.get("c");
    if (c) {
      setActiveTab(c);
    }
  }, []);

  const handleTabChange = useCallback((nextTab: string) => {
    setActiveTab(nextTab);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      if (nextTab === "all") {
        url.searchParams.delete("c");
      } else {
        url.searchParams.set("c", nextTab);
      }
      window.history.replaceState(null, "", url.toString());
    }
  }, []);

  const handleCopyLink = useCallback(async (slug: string) => {
    if (typeof window === "undefined") return;
    const url = `${window.location.origin}/brief/${slug}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedSlug(slug);
      setTimeout(() => {
        setCopiedSlug((current) => (current === slug ? null : current));
      }, 2000);
    } catch {
      // fallback
    }
  }, []);

  const getBriefsForGame = useCallback(
    (gameKey: string) => {
      if (gameKey === "all") return briefs;
      const tabConfig = DEFAULT_GAMES.find((t) => t.key === gameKey);
      const aliasSet = tabConfig
        ? new Set(tabConfig.aliases.map((a) => a.toLowerCase()))
        : new Set([gameKey.toLowerCase()]);

      return briefs.filter((b) => {
        const slug = (b.categorySlug || "").trim().toLowerCase();
        const name = (b.category || "").trim().toLowerCase();
        const tags = (b.tags || []).map((t) => t.trim().toLowerCase());
        return (
          aliasSet.has(slug) ||
          aliasSet.has(name) ||
          tags.some((t) => aliasSet.has(t))
        );
      });
    },
    [briefs]
  );

  const filteredBriefs = useMemo(
    () => getBriefsForGame(activeTab),
    [getBriefsForGame, activeTab]
  );

  const renderBriefCard = (brief: Brief) => {
    const title = toPlainShareTitle(brief.title);
    const authorName = brief.authorNames[0] || "SORAI";
    const authorImage = brief.authorImages[0] || "";
    const initial = authorName.charAt(0);
    const summary = briefBodyToText(brief.body);
    const body = summary && summary.trim() !== title.trim() ? brief.body : "";
    const isCopied = copiedSlug === brief.slug;

    return (
      <article
        key={brief.id || brief.slug}
        id={`brief-${brief.slug}`}
        className="bg-[var(--surface)] hover:bg-[var(--surface-muted)] rounded-[var(--radius-panel)] p-4 sm:p-5 shadow-xs transition-colors duration-150 scroll-mt-24"
      >
        {/* Header: Author + Time + Category + Copy Link */}
        <div className="flex items-center justify-between gap-2 pb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="shrink-0">
              {authorImage ? (
                <img
                  src={authorImage}
                  alt=""
                  className="w-8 h-8 rounded-full object-cover bg-[var(--surface-muted)]"
                />
              ) : (
                <div className="w-8 h-8 text-xs rounded-full bg-[var(--surface-muted)] text-[var(--foreground)] flex items-center justify-center font-bold">
                  {initial}
                </div>
              )}
            </div>
            <div className="flex items-baseline gap-2 min-w-0">
              <span className="font-bold text-sm text-[var(--foreground)] truncate">
                {authorName}
              </span>
              <time
                dateTime={brief.publishedAt}
                className="text-xs text-[var(--text-muted)] tabular-nums font-normal shrink-0"
              >
                {formatFeedTime(brief.publishedAt || brief.updatedAt)}
              </time>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {brief.category && brief.categorySlug && (
              <a
                href={categoryPath(brief.categorySlug)}
                className="text-xs font-semibold px-2 py-0.5 rounded-[var(--radius-pill)] bg-[var(--surface-muted)] text-[var(--text-secondary)] hover:text-[var(--foreground)] hover:bg-[var(--surface-raised)] transition-colors"
              >
                {brief.category}
              </a>
            )}
            <button
              type="button"
              onClick={() => handleCopyLink(brief.slug)}
              className="p-1.5 rounded-[var(--radius-control)] text-[var(--text-secondary)] hover:text-[var(--foreground)] hover:bg-[var(--surface-muted)] transition-colors cursor-pointer text-xs flex items-center gap-1"
              aria-label="複製快訊連結"
              title="複製連結"
            >
              {isCopied ? (
                <span className="text-[11px] font-medium text-[var(--accent)]">
                  已複製！
                </span>
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Title Linking to Standalone Brief Page */}
        <h2 className="text-base sm:text-lg font-bold text-[var(--foreground)] leading-snug tracking-tight">
          <a
            href={`/brief/${brief.slug}`}
            className="hover:text-[var(--accent)] transition-colors"
          >
            {title}
          </a>
        </h2>

        {/* Body Content */}
        {body && (
          <div className="mt-2 text-sm sm:text-[15px] leading-relaxed text-[var(--foreground)] font-normal">
            <BriefBody body={body} compact />
          </div>
        )}

        {/* Attached Media */}
        {brief.image && (
          <div className="mt-3 rounded-[var(--radius-panel)] overflow-hidden bg-[var(--surface-muted)] w-fit max-w-full">
            <BriefMedia
              src={brief.image}
              alt={title}
              mime={brief.imageMime}
              width={brief.imageWidth}
              height={brief.imageHeight}
              className="max-h-[520px] max-w-full w-auto h-auto object-contain"
            />
          </div>
        )}

        {/* Card Footer: Tags & Standalone Link */}
        <div className="mt-4 pt-3 flex items-center justify-between gap-2">
          <div className="flex flex-wrap gap-1.5">
            {brief.tags &&
              brief.tags.map((tag) => (
                <a
                  key={tag}
                  href={`/tag/${encodeURIComponent(tag)}`}
                  className="text-[11px] font-medium px-2 py-0.5 rounded-[var(--radius-control)] bg-[var(--surface-muted)] text-[var(--text-secondary)] hover:text-[var(--foreground)] transition-colors"
                >
                  #{tag}
                </a>
              ))}
          </div>

          <a
            href={`/brief/${brief.slug}`}
            className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--foreground)] transition-colors shrink-0"
          >
            <span>完整頁面</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </a>
        </div>
      </article>
    );
  };

  return (
    <div className="w-full max-w-[720px] mx-auto px-4 pt-4 sm:pt-6 pb-24">
      {/* Page Header */}
      <header className="mb-6 sm:mb-8 arc-entrance" style={{ "--stagger": 0 } as React.CSSProperties}>
        <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-2">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-[var(--foreground)]">
            電競快訊
          </h1>
          <span className="text-xs font-medium text-[var(--text-secondary)] tabular-nums">
            共 {filteredBriefs.length} 則快訊
          </span>
        </div>
        <p className="mt-2 text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed font-normal">
          即時掌握賽事速報、轉會異動與電競快訊。
        </p>
      </header>

      {/* Slider Navigator with Animated TabsContent Panels */}
      <div className="mb-6 arc-entrance" style={{ "--stagger": 1 } as React.CSSProperties}>
        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <div className="mb-6">
            <TabsList className="w-full sm:w-fit">
              {DEFAULT_GAMES.map((g) => (
                <TabsTrigger
                  key={g.key}
                  value={g.key}
                  className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 min-w-0"
                >
                  {g.logo ? (
                    <img
                      src={g.logo}
                      alt=""
                      className={`w-3.5 h-3.5 sm:w-4 sm:h-4 object-contain shrink-0 ${
                        activeTab === g.key
                          ? "brightness-0 dark:invert"
                          : "brightness-0 dark:invert opacity-50"
                      }`}
                    />
                  ) : null}
                  <span className="sm:hidden truncate">{g.short}</span>
                  <span className="hidden sm:inline">{g.label}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          {DEFAULT_GAMES.map((g) => {
            const list = getBriefsForGame(g.key);
            return (
              <TabsContent key={g.key} value={g.key} className="mt-0">
                {list.length === 0 ? (
                  <div className="py-20 text-center rounded-[var(--radius-panel)] bg-[var(--surface)] p-8">
                    <p className="text-sm text-[var(--text-secondary)] font-normal">
                      此分類目前沒有電競快訊。
                    </p>
                  </div>
                ) : (
                  <MotionConfig reducedMotion="user">
                    <div className="flex flex-col gap-4" key={g.key}>
                      {list.map((brief, i) => (
                        <motion.div
                          key={brief.id || brief.slug}
                          initial={{ opacity: 0, filter: "blur(6px)" }}
                          animate={{ opacity: 1, filter: "blur(0px)" }}
                          transition={{
                            duration: 0.22,
                            delay: Math.min(i, 8) * 0.035,
                            ease: [0.16, 1, 0.3, 1],
                          }}
                        >
                          {renderBriefCard(brief)}
                        </motion.div>
                      ))}
                    </div>
                  </MotionConfig>
                )}
              </TabsContent>
            );
          })}
        </Tabs>
      </div>
    </div>
  );
}

export default FeedPage;
