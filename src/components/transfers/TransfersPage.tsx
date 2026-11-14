'use client';

import React, { useState, useMemo, useRef, useEffect, useSyncExternalStore } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import type { TransferRegion, TransferTeam } from '../../types/transfers';
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
  /** 賽區切換。region 枚舉是 VCT 四區，非 VALORANT 的頁面關掉。 */
  showRegionTabs?: boolean;
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

const subscribe = (callback: () => void) => {
  window.addEventListener('resize', callback);
  return () => window.removeEventListener('resize', callback);
};

const getSnapshot = () => {
  const w = window.innerWidth;
  if (w >= 1536) return 4;
  if (w >= 1024) return 3;
  if (w >= 768) return 2;
  return 1;
};

const getServerSnapshot = () => 1;

export const TransfersPage: React.FC<TransfersPageProps> = ({
  initialTeams = [],
  game = 'valorant',
  intro = 'VCT 美洲、EMEA、太平洋與中國四大賽區各戰隊即時陣容與選手轉會動態追蹤。',
  showRegionTabs = true,
}) => {
  const [activeTab, setActiveTab] = useState<TransferRegion>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const teams = initialTeams || [];
  const columnCount = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

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

  // Distribute filtered teams round-robin across columns to lock items into independent columns
  const columns = useMemo(() => {
    const cols: TransferTeam[][] = Array.from({ length: columnCount }, () => []);
    filteredTeams.forEach((team, index) => {
      cols[index % columnCount].push(team);
    });
    return cols;
  }, [filteredTeams, columnCount]);

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

      {/* Controls Bar: Arc UI Tabs with Monochrome Regional Logos + Search Input */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {showRegionTabs && (
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TransferRegion)}>
          <TabsList className="w-full sm:w-fit">
            <TabsTrigger value="all" className="flex items-center justify-center px-3 sm:px-3.5 text-xs">
              ALL
            </TabsTrigger>
            <TabsTrigger value="americas" className="flex items-center gap-1.5 px-3 sm:px-3.5 text-xs">
              <img
                src="/event/vct-america.avif"
                alt="AMERICA"
                className="w-3.5 h-3.5 object-contain brightness-0 dark:invert shrink-0 opacity-80"
              />
              <span>AMERICA</span>
            </TabsTrigger>
            <TabsTrigger value="emea" className="flex items-center gap-1.5 px-3 sm:px-3.5 text-xs">
              <img
                src="/event/vct-emea.avif"
                alt="EMEA"
                className="w-3.5 h-3.5 object-contain brightness-0 dark:invert shrink-0 opacity-80"
              />
              <span>EMEA</span>
            </TabsTrigger>
            <TabsTrigger value="pacific" className="flex items-center gap-1.5 px-3 sm:px-3.5 text-xs">
              <img
                src="/event/vct-pacific.avif"
                alt="PACIFIC"
                className="w-3.5 h-3.5 object-contain brightness-0 dark:invert shrink-0 opacity-80"
              />
              <span>PACIFIC</span>
            </TabsTrigger>
            <TabsTrigger value="china" className="flex items-center gap-1.5 px-3 sm:px-3.5 text-xs">
              <img
                src="/event/vct-cn.avif"
                alt="CHINA"
                className="w-3.5 h-3.5 object-contain brightness-0 dark:invert shrink-0 opacity-80"
              />
              <span>CHINA</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
        )}

        {/* Search Bar & Counter */}
        <div className={showRegionTabs ? 'flex items-center gap-2.5 w-full sm:w-auto' : 'flex items-center gap-2.5 w-full sm:w-auto sm:ml-auto'}>
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

      {/* Teams Masonry - 定欄式多欄瀑布流，各欄完全獨立，卡片縮排絕不跨欄跳動 */}
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
              showRegionTabs
                ? '請嘗試其他搜尋關鍵字，或切換至 ALL 查看全部賽區。'
                : '請嘗試其他搜尋關鍵字。'
            }
          />
          )
        ) : (
          <div className="flex gap-3 sm:gap-4 items-start w-full">
            {columns.map((colTeams, colIndex) => (
              <div key={colIndex} className="flex-1 flex flex-col gap-3 sm:gap-4 min-w-0">
                {colTeams.map((team) => (
                  <TeamCard key={team.id} team={team} />
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
