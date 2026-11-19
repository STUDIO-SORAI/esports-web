'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { motion, MotionConfig } from 'motion/react';
import type { TransferRegion, TransferRegionOption, TransferTeam } from '../../types/transfers';
import { TeamCard } from './TeamCard';
import { InViewTitle } from '../arc/in-view-title/in-view-title';
import { Tabs, TabsList, TabsTrigger } from '../arc/tabs/tabs';
import { EmptyState } from '../arc/empty-state/empty-state';
import { TRANSFER_GAME_LIST, transferGamePath, type TransferGameSlug } from '../../lib/transfers';
import { GameMark } from './GameMark';

interface TransfersPageProps {
  initialTeams?: TransferTeam[];
  /** 這一頁是哪款遊戲。決定大標的 logo 與切換選單目前選中的項目。 */
  game?: TransferGameSlug;
  /** 大標下方的一句話。預設為 VALORANT，維持原樣。 */
  intro?: string;
  /**
   * 這款遊戲底下的賽區分頁，由 CMS 的 transfer-regions 給。
   * 空陣列就不顯示分頁列 —— 還沒建賽區的遊戲本來就沒有東西可切。
   */
  regions?: TransferRegionOption[];
}

/** 大標右側的遊戲切換選單。四個頁面同一份清單，點了直接換網址。 */
const GameSwitcher: React.FC<{ game: TransferGameSlug }> = ({ game }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = TRANSFER_GAME_LIST.find((g) => g.slug === game) ?? TRANSFER_GAME_LIST[0];

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div className="relative shrink-0" ref={ref}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="切換遊戲"
        onClick={() => setOpen((v) => !v)}
        className="h-9 inline-flex items-center gap-2 pl-3 pr-2.5 rounded-[var(--radius-control)] bg-[var(--surface-muted)] text-xs font-medium text-[var(--foreground)] cursor-pointer transition-[background-color] duration-150 ease-[var(--ease-standard)] hover:bg-[var(--surface)]"
      >
        <GameMark slug={current.slug} label={current.label} className="h-3.5" />
        <span>{current.label}</span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-[var(--text-muted)] transition-transform duration-200 ease-[var(--ease-standard)] ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div
          role="listbox"
          aria-label="轉會情報遊戲"
          className="absolute right-0 top-[calc(100%+6px)] z-50 w-44 p-1 rounded-[var(--radius-panel)] bg-[var(--surface-muted)] shadow-2xl flex flex-col gap-0.5"
        >
          {TRANSFER_GAME_LIST.map((g) => {
            const selected = g.slug === current.slug;
            return (
              <a
                key={g.slug}
                href={transferGamePath(g.slug)}
                role="option"
                aria-selected={selected}
                className={`flex items-center gap-2 px-2.5 py-2 rounded-[var(--radius-control)] text-xs transition-[background-color,color] duration-150 ease-[var(--ease-standard)] ${
                  selected
                    ? 'bg-[var(--surface)] text-[var(--foreground)] font-semibold'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--surface)] hover:text-[var(--foreground)]'
                }`}
              >
                <GameMark slug={g.slug} label={g.label} className="h-3.5" />
                <span className="flex-1 truncate">{g.label}</span>
                {selected && <Check className="w-3.5 h-3.5 shrink-0" />}
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
};

export const TransfersPage: React.FC<TransfersPageProps> = ({
  initialTeams = [],
  game = 'valorant',
  intro = 'VCT 美洲、EMEA、太平洋與中國四大賽區各戰隊即時陣容與選手轉會動態追蹤。',
  regions = [],
}) => {
  // 分頁列只在這款遊戲真的有賽區時才出現，不再由呼叫端寫死開關
  const hasRegionTabs = regions.length > 0;
  const [activeTab, setActiveTab] = useState<TransferRegion>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const teams = initialTeams || [];

  // Filtered teams based on region and search query
  const filteredTeams = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return teams.filter((team) => {
      // Region filter
      if (activeTab !== 'all' && team.region !== activeTab) {
        return false;
      }
      // Search query filter (matches team name or any player name)
      if (q) {
        const teamMatch = team.name.toLowerCase().includes(q);
        const matchPlayer = (p: { name: string; notes?: string }) =>
          p.name.toLowerCase().includes(q) || (p.notes && p.notes.toLowerCase().includes(q));

        return (
          teamMatch ||
          team.activeRoster.some(matchPlayer) ||
          team.rumoredIn.some(matchPlayer) ||
          team.benched.some(matchPlayer) ||
          team.departed.some(matchPlayer)
        );
      }
      return true;
    });
  }, [teams, activeTab, searchQuery]);

  return (
    <div className="max-w-[1360px] mx-auto px-3 sm:px-4 md:px-6 w-full flex flex-col gap-5 sm:gap-6 font-sans">
      {/* Title Bar - 1:1 參考賽事資訊 (MatchesPage) 結構 */}
      <div>
        {/* 切換選單與大標同一列，垂直置中對齊 logo 與標題 */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <GameMark
              slug={game}
              label={TRANSFER_GAME_LIST.find((g) => g.slug === game)?.label ?? game}
              className="h-8 sm:h-10 md:h-12"
            />
            <InViewTitle
              text="轉會情報"
              variant="blur"
              className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-[var(--foreground)]"
            />
          </div>

          <GameSwitcher game={game} />
        </div>
        <p className="mt-3 text-sm sm:text-base text-[var(--text-secondary)] max-w-2xl leading-relaxed font-normal">
          {intro}
        </p>
      </div>

      {/* Legend + Controls Bar */}
      <div className="flex flex-col gap-2.5">
        <div
          className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-[var(--text-secondary)] select-none"
          aria-label="轉會名單圖例說明"
        >
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" aria-hidden="true" />
            <span>傳聞加入</span>
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="font-semibold text-[var(--foreground)]">現</span>
            <span>= 現有</span>
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="font-semibold text-[var(--foreground)]">傳</span>
            <span>= 傳聞</span>
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="font-semibold text-[var(--foreground)]">離</span>
            <span>= 離隊／LFT／FA・RFA（合約到期尚未續約）</span>
          </span>
        </div>

        {/* Controls Bar: Arc UI Tabs with Monochrome Regional Logos + Search Input */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {hasRegionTabs && (
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TransferRegion)}>
          <TabsList className="w-full sm:w-fit">
            <TabsTrigger value="all" className="flex items-center justify-center px-3 sm:px-3.5 text-xs">
              ALL
            </TabsTrigger>
            {regions.map((r) => (
              <TabsTrigger
                key={r.key}
                value={r.key}
                className="flex items-center gap-1.5 px-3 sm:px-3.5 text-xs"
              >
                {r.logoUrl && (
                  <img
                    src={r.logoUrl}
                    alt={r.label}
                    className="w-3.5 h-3.5 object-contain brightness-0 dark:invert shrink-0 opacity-80"
                  />
                )}
                <span>{r.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        )}

        {/* Search Bar & Counter */}
        <div className={hasRegionTabs ? 'flex items-center gap-2.5 w-full sm:w-auto' : 'flex items-center gap-2.5 w-full sm:w-auto sm:ml-auto'}>
          <div className="relative w-full sm:w-64">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜尋選手、戰隊或備註..."
              className="w-full px-3 py-1.5 rounded-[var(--radius-control)] bg-[var(--surface-muted)] text-[var(--foreground)] text-xs placeholder:text-[var(--text-muted)] focus:outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-[var(--text-muted)] hover:text-[var(--foreground)]"
              >
                ✕
              </button>
            )}
          </div>
          <span className="text-xs font-mono text-[var(--text-muted)] shrink-0">
            {filteredTeams.length} 隊
          </span>
        </div>
        </div>
      </div>

      {/* Teams Grid - 固定尺寸卡片網格，取代原本的瀑布流／Bento 排版 */}
      <div>
        {filteredTeams.length === 0 ? (
          teams.length === 0 ? (
            <EmptyState
              title="尚未建立轉會名單"
              description="這款遊戲的戰隊名冊還在整理中，建立後會在此顯示。"
            />
          ) : (
            <EmptyState
              title="查無符合條件的隊伍或選手"
              description={
                hasRegionTabs
                  ? '請嘗試其他搜尋關鍵字，或切換至 ALL 查看全部賽區。'
                  : '請嘗試其他搜尋關鍵字。'
              }
            />
          )
        ) : (
          <MotionConfig reducedMotion="user">
            <div
              key={activeTab}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 w-full"
            >
              {filteredTeams.map((team, index) => (
                <motion.div
                  key={`${activeTab}-${team.id}`}
                  initial={{ opacity: 0, y: 6, filter: 'blur(6px)' }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  transition={{
                    duration: 0.22,
                    delay: Math.min(index, 6) * 0.03,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                  className="h-full"
                >
                  <TeamCard team={team} />
                </motion.div>
              ))}
            </div>
          </MotionConfig>
        )}
      </div>
    </div>
  );
};
