'use client';

import React, { useMemo, useState } from 'react';
import {
  SIGNATURE_RECORDS,
  SIGNATURE_STATS,
  type SignatureRecord,
} from '@/data/openLetter/signaturesSnapshot';
import { filterSignatures } from '@/lib/signaturesStats';
import { InViewTitle } from '@/components/arc/in-view-title/in-view-title';
import { Badge } from '@/components/arc/badge/badge';
import { Button } from '@/components/arc/button/button';
import SegmentedControl from '@/components/arc/segmented-control/segmented-control';
import { EmptyState } from '@/components/arc/empty-state/empty-state';

const REGION_SEGMENTS = [
  { value: 'ALL', label: '全部留言' },
  { value: 'TW', label: '台灣' },
  { value: 'HK', label: '香港' },
  { value: 'VN', label: '越南' },
  { value: 'OTHER_GROUP', label: '日本與海外' },
];

type SortOrder = 'newest' | 'oldest' | 'longest';

export function SignaturesDashboard() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('ALL');
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest');
  const [displayCount, setDisplayCount] = useState(24);

  // Filter only records that have messages
  const recordsWithMessage = useMemo(() => {
    return SIGNATURE_RECORDS.filter(
      (r) => r.message && r.message.trim().length > 0
    );
  }, []);

  // Filter based on search query and region
  const filtered = useMemo(() => {
    const list = filterSignatures(recordsWithMessage, searchQuery, selectedRegion);

    return [...list].sort((a, b) => {
      if (sortOrder === 'longest') {
        return (b.message?.length || 0) - (a.message?.length || 0);
      }
      const timeA = new Date(a.createdAt).getTime();
      const timeB = new Date(b.createdAt).getTime();
      if (sortOrder === 'oldest') {
        return timeA - timeB;
      }
      return timeB - timeA;
    });
  }, [recordsWithMessage, searchQuery, selectedRegion, sortOrder]);

  const displayedList = useMemo(() => {
    return filtered.slice(0, displayCount);
  }, [filtered, displayCount]);

  const handleLoadMore = () => {
    setDisplayCount((prev) => Math.min(prev + 24, filtered.length));
  };

  const handleShowAll = () => {
    setDisplayCount(filtered.length);
  };

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      if (Number.isNaN(d.getTime())) return '';
      const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Taipei',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
      }).formatToParts(d);
      const get = (t: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === t)?.value ?? '';
      return `${get('month')}/${get('day')} ${get('hour')}:${get('minute')}`;
    } catch {
      return '';
    }
  };

  return (
    <div className="mx-auto w-full max-w-[1040px] px-4 py-8 sm:px-6 sm:py-12">
      {/* 頂部導航與麵包屑 */}
      <nav aria-label="Breadcrumb" className="mb-6 flex flex-wrap items-center justify-between gap-3 text-xs">
        <a
          href="/openletter"
          className="inline-flex items-center gap-1.5 text-[var(--text-secondary)] transition-[color] duration-150 hover:text-[var(--foreground)]"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="h-4 w-4 shrink-0"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M17 10a.75.75 0 0 1-.75.75H5.612l4.158 3.96a.75.75 0 1 1-1.04 1.08l-5.5-5.25a.75.75 0 0 1 0-1.08l5.5-5.25a.75.75 0 1 1 1.04 1.08L5.612 9.25H16.25A.75.75 0 0 1 17 10Z"
              clipRule="evenodd"
            />
          </svg>
          <span>返回公開信本文</span>
        </a>

        <div className="flex items-center gap-2">
          <Button as="a" href="/openletter#sign" size="sm" variant="primary" className="text-xs">
            參與線上連署
          </Button>
          <Button as="a" href="/openletter/openletter-zh.pdf" target="_blank" rel="noopener noreferrer" size="sm" variant="secondary" className="text-xs">
            下載完整版 PDF
          </Button>
        </div>
      </nav>

      {/* 頁面標題 */}
      <header className="mb-10 text-balance">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
          Open Letter · Community Voices & Data
        </p>
        <InViewTitle
          as="h1"
          text="社群連署數據與心聲分析"
          variant="blur"
          className="mt-3 text-3xl font-bold tracking-tight text-[var(--foreground)] sm:text-4xl md:text-5xl"
        />
        <p className="mt-4 max-w-[80ch] text-sm leading-relaxed text-[var(--text-secondary)] sm:text-base">
          針對太平洋職業聯賽（LCP）運營與賽事治理現況，本站於 2026 年 11 月 12 日發起跨賽區聯合公開信。
          截至目前已彙整 <strong className="text-[var(--foreground)]">{SIGNATURE_STATS.totalCount.toLocaleString()}</strong> 位亞太選手、從業人員、媒體與忠實觀眾的署名，
          其中 <strong className="text-[var(--foreground)]">{SIGNATURE_STATS.messageCount.toLocaleString()}</strong> 位連署人主動留下了真實建言。
        </p>
      </header>

      {/* 四大核心指標卡片 */}
      <section aria-label="核心統計數據" className="mb-12 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <div className="rounded-[var(--radius-panel)] bg-[var(--surface)] p-4 sm:p-5">
          <span className="text-xs text-[var(--text-muted)]">總連署人次</span>
          <p className="mt-1 font-serif text-2xl font-bold tabular-nums text-[var(--foreground)] sm:text-3xl">
            {SIGNATURE_STATS.totalCount.toLocaleString()}
          </p>
          <span className="mt-1 block text-[11px] text-[var(--text-secondary)]">跨四大主要聯賽賽區</span>
        </div>

        <div className="rounded-[var(--radius-panel)] bg-[var(--surface)] p-4 sm:p-5">
          <span className="text-xs text-[var(--text-muted)]">社群建言留言</span>
          <p className="mt-1 font-serif text-2xl font-bold tabular-nums text-[var(--accent)] sm:text-3xl">
            {SIGNATURE_STATS.messageCount.toLocaleString()}
          </p>
          <span className="mt-1 block text-[11px] text-[var(--text-secondary)]">
            高達 {( (SIGNATURE_STATS.messageCount / SIGNATURE_STATS.totalCount) * 100 ).toFixed(1)}% 主動附言
          </span>
        </div>

        <div className="rounded-[var(--radius-panel)] bg-[var(--surface)] p-4 sm:p-5">
          <span className="text-xs text-[var(--text-muted)]">涵蓋國家／地區</span>
          <p className="mt-1 font-serif text-2xl font-bold tabular-nums text-[var(--foreground)] sm:text-3xl">
            8+
          </p>
          <span className="mt-1 block text-[11px] text-[var(--text-secondary)]">台港澳、越、日、大洋洲等</span>
        </div>

        <div className="rounded-[var(--radius-panel)] bg-[var(--surface)] p-4 sm:p-5">
          <span className="text-xs text-[var(--text-muted)]">具名所屬單位</span>
          <p className="mt-1 font-serif text-2xl font-bold tabular-nums text-[var(--foreground)] sm:text-3xl">
            {SIGNATURE_STATS.withOrgCount.toLocaleString()}
          </p>
          <span className="mt-1 block text-[11px] text-[var(--text-secondary)]">戰隊支持者、學生與從業者</span>
        </div>
      </section>

      {/* 數據深度分析：地區佔比 & 議題聚類 */}
      <section aria-label="數據圖表分析" className="mb-14 grid gap-6 md:grid-cols-2">
        {/* 地區分佈 */}
        <div className="rounded-[var(--radius-surface)] bg-[var(--surface)] p-5 sm:p-6">
          <div className="flex items-center justify-between border-b border-[var(--surface-muted)] pb-3">
            <h2 className="text-sm font-bold text-[var(--foreground)]">連署者地區分佈</h2>
            <span className="text-xs text-[var(--text-muted)]">總計 {SIGNATURE_STATS.totalCount} 筆</span>
          </div>

          <div className="mt-4 space-y-3">
            {SIGNATURE_STATS.regionBreakdown.map((item) => (
              <div key={item.key} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-[var(--foreground)]">{item.label}</span>
                  <span className="tabular-nums text-[var(--text-secondary)]">
                    {item.count} 人 ({item.percentage}%)
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--surface-muted)]">
                  <div
                    className="h-full rounded-full bg-[var(--accent)] transition-[width] duration-300"
                    style={{ width: `${Math.max(item.percentage, 1)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 訴求關鍵議題聚類 */}
        <div className="rounded-[var(--radius-surface)] bg-[var(--surface)] p-5 sm:p-6">
          <div className="flex items-center justify-between border-b border-[var(--surface-muted)] pb-3">
            <h2 className="text-sm font-bold text-[var(--foreground)]">留言核心訴求聚類</h2>
            <span className="text-xs text-[var(--text-muted)]">{SIGNATURE_STATS.messageCount} 則留言詞頻分析</span>
          </div>

          <div className="mt-4 space-y-4">
            {SIGNATURE_STATS.topicStats.map((topic) => (
              <div key={topic.topic} className="rounded-[var(--radius-panel)] bg-[var(--surface-muted)]/50 p-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[var(--foreground)]">{topic.topic}</span>
                  <Badge tone="neutral" size="sm" pill>
                    {topic.tag}
                  </Badge>
                </div>
                <div className="mt-2 flex items-baseline justify-between text-xs text-[var(--text-secondary)]">
                  <span>提及此訴求的留言比例</span>
                  <span className="font-bold tabular-nums text-[var(--foreground)]">
                    {topic.count} 則 ({topic.percentage}%)
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-[var(--surface-muted)]">
                  <div
                    className="h-full rounded-full bg-[var(--text-secondary)]"
                    style={{ width: `${topic.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 社群留言心聲牆 (The Voices Wall) */}
      <section id="voices" aria-label="社群留言列表" className="scroll-mt-20">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <InViewTitle
              as="h2"
              text="社群真實心聲"
              variant="blur"
              className="text-2xl font-bold tracking-tight text-[var(--foreground)] sm:text-3xl"
            />
            <p className="mt-1.5 text-xs text-[var(--text-secondary)]">
              所有連署姓名皆依個人隱私規範匿名化（僅保留首字），真實呈現第一線觀眾與選手的心聲。
            </p>
          </div>
          <span className="shrink-0 text-xs text-[var(--text-muted)]">
            目前篩選：{filtered.length} 則留言
          </span>
        </div>

        {/* 篩選與搜尋工具列 */}
        <div className="mt-6 flex flex-col gap-3 rounded-[var(--radius-panel)] bg-[var(--surface)] p-3 sm:p-4 md:flex-row md:items-center md:justify-between">
          {/* 地區切換 SegmentedControl */}
          <div className="w-full md:w-auto overflow-x-auto">
            <SegmentedControl
              options={REGION_SEGMENTS}
              value={selectedRegion}
              onValueChange={(val) => {
                setSelectedRegion(val);
                setDisplayCount(24);
              }}
              className="min-w-max"
            />
          </div>

          {/* 搜尋與排序 */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[200px] flex-1 sm:w-60">
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setDisplayCount(24);
                }}
                placeholder="搜尋留言關鍵字、單位..."
                className="w-full rounded-[var(--radius-control)] bg-[var(--surface-muted)] px-3 py-1.5 text-xs text-[var(--foreground)] placeholder-[var(--text-muted)] outline-none transition-[background-color] duration-150 focus:bg-[var(--surface-muted)]/80"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label="清除搜尋"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-[var(--text-muted)] hover:text-[var(--foreground)]"
                >
                  ✕
                </button>
              )}
            </div>

            <div className="flex items-center gap-1 text-xs">
              <button
                type="button"
                onClick={() => setSortOrder('newest')}
                className={`rounded-[var(--radius-control)] px-2.5 py-1.5 font-medium transition-[color,background-color] duration-150 ${
                  sortOrder === 'newest'
                    ? 'bg-[var(--surface-muted)] text-[var(--foreground)]'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                }`}
              >
                最新
              </button>
              <button
                type="button"
                onClick={() => setSortOrder('longest')}
                className={`rounded-[var(--radius-control)] px-2.5 py-1.5 font-medium transition-[color,background-color] duration-150 ${
                  sortOrder === 'longest'
                    ? 'bg-[var(--surface-muted)] text-[var(--foreground)]'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                }`}
              >
                長文
              </button>
              <button
                type="button"
                onClick={() => setSortOrder('oldest')}
                className={`rounded-[var(--radius-control)] px-2.5 py-1.5 font-medium transition-[color,background-color] duration-150 ${
                  sortOrder === 'oldest'
                    ? 'bg-[var(--surface-muted)] text-[var(--foreground)]'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                }`}
              >
                最早
              </button>
            </div>
          </div>
        </div>

        {/* 留言卡片列表 */}
        {displayedList.length > 0 ? (
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {displayedList.map((item) => (
              <article
                key={item.id}
                className="flex flex-col justify-between rounded-[var(--radius-panel)] bg-[var(--surface)] p-4 sm:p-5 transition-[transform,background-color] duration-150 hover:bg-[var(--surface-muted)]/40"
              >
                <div>
                  {/* 卡片標頭：匿名姓名、地區、組織 */}
                  <div className="flex items-center justify-between gap-2 border-b border-[var(--surface-muted)] pb-3">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--surface-muted)] font-serif text-xs font-bold text-[var(--foreground)]">
                        {item.maskedName[0]}
                      </div>
                      <div className="space-y-0.5">
                        <span className="block text-xs font-bold text-[var(--foreground)]">
                          {item.maskedName}
                        </span>
                        {item.organization ? (
                          <span className="block max-w-[140px] truncate text-[11px] text-[var(--text-muted)] sm:max-w-[180px]">
                            {item.organization}
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <Badge tone="neutral" size="sm" pill>
                        {item.regionLabel}
                      </Badge>
                      <span className="text-[11px] tabular-nums text-[var(--text-muted)]">
                        {formatDate(item.createdAt)}
                      </span>
                    </div>
                  </div>

                  {/* 留言內文 */}
                  <div className="mt-3.5 text-xs sm:text-sm leading-relaxed text-[var(--foreground)] break-words whitespace-pre-wrap">
                    {item.message}
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-end text-[10px] text-[var(--text-muted)] font-mono">
                  <span>#{item.id}</span>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="mt-8">
            <EmptyState
              title="未找到符合條件的留言"
              description="請嘗試調整關鍵字搜尋或更換地區篩選類別。"
              action={
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedRegion('ALL');
                  }}
                >
                  清除所有篩選
                </Button>
              }
            />
          </div>
        )}

        {/* 載入更多 / 分頁按鈕 */}
        {filtered.length > displayCount && (
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button size="md" variant="secondary" onClick={handleLoadMore}>
              載入更多留言（尚有 {filtered.length - displayCount} 則）
            </Button>
            <Button size="md" variant="ghost" onClick={handleShowAll} className="text-xs text-[var(--text-muted)]">
              一次展開全部 ({filtered.length})
            </Button>
          </div>
        )}
      </section>

      {/* 底部行動呼籲 */}
      <footer className="mt-16 rounded-[var(--radius-surface)] bg-[var(--surface)] p-6 text-center sm:p-8">
        <h3 className="font-serif text-lg font-bold text-[var(--foreground)] sm:text-xl">
          加入連署，讓亞太社群的聲音被看見
        </h3>
        <p className="mt-2 text-xs sm:text-sm text-[var(--text-secondary)]">
          這是一封由選手、戰隊粉絲、實況觀眾與獨立媒體共同發起的公開信，要求 Riot Games 總部正面回應。
        </p>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
          <Button as="a" href="/openletter#sign" size="md" variant="primary">
            立即簽署公開信
          </Button>
          <Button as="a" href="/openletter" size="md" variant="secondary">
            閱讀公開信全文與訴求
          </Button>
        </div>
      </footer>
    </div>
  );
}
