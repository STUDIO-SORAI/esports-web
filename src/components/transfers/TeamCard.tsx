import React, { useState } from 'react';
import type { TransferTeam, TransferPlayer } from '../../types/transfers';
import {
  getTeamRosterForTab,
  layoutRosterColumns,
  type RosterPlayerItem,
  type TeamRosterTab,
} from '../../lib/transfers';
import { CountryFlag } from './CountryFlag';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../arc/tabs/tabs';

// 格式化職能與教練標籤 (HC / AC / 定位)
const formatRoleLabel = (role?: string) => {
  if (!role) return undefined;
  const trimmed = role.trim();
  const lower = trimmed.toLowerCase();

  // 助理教練 (AC)
  if (
    lower === 'ac' ||
    lower.includes('assistant coach') ||
    lower.includes('助理教練') ||
    lower.includes('助教') ||
    lower.startsWith('ac ') ||
    lower.endsWith(' ac') ||
    lower.includes('(ac)') ||
    lower.includes('（ac）')
  ) {
    return 'AC';
  }

  // 總教練 / 主教練 (HC)
  if (
    lower === 'hc' ||
    lower.includes('head coach') ||
    lower.includes('總教練') ||
    lower.includes('主教練') ||
    lower.startsWith('hc ') ||
    lower.endsWith(' hc') ||
    lower.includes('(hc)') ||
    lower.includes('（hc）')
  ) {
    return 'HC';
  }

  return trimmed;
};

const ROSTER_TABS: ReadonlyArray<{
  value: TeamRosterTab;
  shortLabel: string;
  ariaLabel: string;
  emptyMessage: string;
}> = [
  {
    value: 'active',
    shortLabel: '現',
    ariaLabel: '現有名單',
    emptyMessage: '目前暫無現役成員',
  },
  {
    value: 'rumors',
    shortLabel: '傳',
    ariaLabel: '傳聞陣容（現有＋傳聞）',
    emptyMessage: '目前暫無陣容或傳聞情報',
  },
  {
    value: 'inactive',
    shortLabel: '離',
    ariaLabel: '離隊／LFT／FA・RFA（合約到期尚未續約）',
    emptyMessage: '目前無離隊或 FA／RFA 選手',
  },
];

interface TeamCardProps {
  team: TransferTeam;
}

export const TeamCard: React.FC<TeamCardProps> = ({ team }) => {
  const [activeTab, setActiveTab] = useState<TeamRosterTab>('active');
  const brandColor = team.brandColor || '#dc2626';

  const initials = team.name
    .split(' ')
    .map((word) => word[0])
    .join('')
    .slice(0, 3)
    .toUpperCase();

  const getPlayerNote = (
    tab: TeamRosterTab,
    player: TransferPlayer,
    isRumored: boolean
  ): string | undefined => {
    if (tab === 'inactive') {
      const note = player.notes && player.notes !== '—' ? player.notes : undefined;
      return player.category === 'benched' ? note || '待轉會' : note || '已離隊';
    }
    const roleLabel = formatRoleLabel(player.role);
    if (roleLabel) return roleLabel;
    if (isRumored && player.notes && player.notes !== '—') return player.notes;
    return undefined;
  };

  const renderPlayerRow = (
    tab: TeamRosterTab,
    isDouble: boolean,
    { player, isRumored }: RosterPlayerItem
  ) => {
    const note = getPlayerNote(tab, player, isRumored);

    return (
      <div
        key={`${player.id}-${isRumored ? 'r' : 'a'}`}
        className={`h-9 flex items-center justify-between gap-1.5 rounded-[var(--radius-control)] bg-[var(--surface-muted)]/50 hover:bg-[var(--surface-muted)] transition-colors duration-150 ${
          isDouble ? 'px-2' : 'px-2.5'
        }`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <CountryFlag country={player.country} />
          <span
            className="font-semibold text-sm text-[var(--foreground)] truncate tracking-tight"
            title={player.name}
          >
            {player.name}
          </span>
          {isRumored && (
            <span
              className="w-2 h-2 rounded-full bg-red-500 shrink-0"
              title={player.notes && player.notes !== '—' ? `傳聞加入：${player.notes}` : '傳聞加入'}
              aria-label="傳聞加入"
            />
          )}
        </div>

        {/* 右側：單排顯示完整來源／職能，雙排精簡顯示以避免擠壓選手名稱 */}
        {player.sourceUrl ? (
          <a
            href={player.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`shrink-0 text-right font-mono text-xs text-zinc-400 hover:text-white hover:underline flex items-center gap-1 transition-colors duration-150 ${
              isDouble ? '' : 'truncate max-w-[116px]'
            }`}
            title={player.sourceName ? `資料來源: ${player.sourceName}` : '點擊查看資料來源'}
            aria-label={player.sourceName ? `資料來源: ${player.sourceName}` : '點擊查看資料來源'}
          >
            {!isDouble && (
              <span className="truncate">{player.sourceName || '資料來源'}</span>
            )}
            <svg
              className="w-3 h-3 shrink-0 opacity-70"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
              />
            </svg>
          </a>
        ) : note ? (
          <span
            className={`shrink-0 text-right font-mono text-[11px] text-[var(--text-muted)] truncate ${
              isDouble ? 'max-w-[44px]' : 'max-w-[100px]'
            }`}
            title={note}
          >
            {note}
          </span>
        ) : null}
      </div>
    );
  };

  const renderRosterPanel = (tab: TeamRosterTab, emptyMessage: string) => {
    const items = getTeamRosterForTab(team, tab);
    if (items.length === 0) {
      return (
        <div className="min-h-[12.75rem] flex items-center justify-center text-xs text-[var(--text-muted)] font-mono">
          {emptyMessage}
        </div>
      );
    }

    const layout = layoutRosterColumns(items);
    const isDouble = layout.mode === 'double';

    if (isDouble) {
      return (
        <div className="grid grid-cols-2 gap-x-2">
          {layout.columns.map((col, colIdx) => (
            <div key={colIdx} className="flex flex-col gap-1.5 min-w-0">
              {col.map((item) => renderPlayerRow(tab, true, item))}
            </div>
          ))}
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-1.5">
        {layout.columns[0].map((item) => renderPlayerRow(tab, false, item))}
      </div>
    );
  };

  return (
    <div className="flex flex-col w-full h-full min-h-[19.5rem] bg-[var(--surface)] hover:bg-[var(--surface-muted)]/70 rounded-[var(--radius-panel)] p-3.5 shadow-xs hover:shadow-md transition-[background-color,box-shadow] duration-200">
      {/* Team Header */}
      <div className="flex items-center justify-between pb-2.5 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          {team.logoUrl ? (
            <img
              src={team.logoUrl}
              alt={team.name}
              className="w-7 h-7 object-contain shrink-0"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          ) : (
            <div
              className="w-7 h-7 rounded-[var(--radius-control)] flex items-center justify-center font-bold text-xs text-white shadow-xs shrink-0 select-none"
              style={{ backgroundColor: brandColor }}
            >
              {initials}
            </div>
          )}
          <div className="min-w-0 flex items-baseline gap-2">
            <h3 className="font-bold text-sm sm:text-base text-[var(--foreground)] tracking-tight truncate">
              {team.name}
            </h3>
            {team.region && (
              <span className="text-[11px] text-[var(--text-muted)] uppercase tracking-wider font-mono shrink-0">
                {team.region}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Arc UI Tabs：保留原本的 TabsContent 方向性滑動淡入淡出轉場動畫，TabsList 固定在右下角 */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as TeamRosterTab)}
        size="sm"
        className="flex-1 flex flex-col"
      >
        {ROSTER_TABS.map((tab) => (
          <TabsContent
            key={tab.value}
            value={tab.value}
            className="mt-0 flex-1"
          >
            {renderRosterPanel(tab.value, tab.emptyMessage)}
          </TabsContent>
        ))}

        {/* Footer: Arc UI TabsList (size="sm") at Bottom-Right */}
        <div className="pt-2.5 mt-auto flex items-center justify-end shrink-0">
          <TabsList size="sm" aria-label={`${team.name} 名單切換`}>
            {ROSTER_TABS.map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                size="sm"
                className="px-2.5 text-xs"
                title={tab.ariaLabel}
                aria-label={tab.ariaLabel}
              >
                {tab.shortLabel}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
      </Tabs>
    </div>
  );
};
