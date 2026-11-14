import React from 'react';
import type { TransferTeam, TransferPlayer } from '../../types/transfers';
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

interface TeamCardProps {
  team: TransferTeam;
}

export const TeamCard: React.FC<TeamCardProps> = ({ team }) => {
  const brandColor = team.brandColor || '#dc2626';

  // Generate team initials for fallback placeholder
  const initials = team.name
    .split(' ')
    .map((word) => word[0])
    .join('')
    .slice(0, 3)
    .toUpperCase();

  // 離隊/FA：合併 benched 與 departed
  const inactiveList: TransferPlayer[] = [...team.benched, ...team.departed];

  const renderPlayerRow = (player: TransferPlayer, defaultNote?: string) => (
    <div
      key={player.id}
      className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-[var(--radius-control)] bg-[var(--surface-muted)]/50 hover:bg-[var(--surface-muted)] transition-colors duration-150"
    >
      {/* 國旗在前面，放大清晰，再接放大選手名稱 */}
      <div className="flex items-center gap-2 min-w-0">
        <CountryFlag country={player.country} />
        <span
          className="font-semibold text-sm text-[var(--foreground)] truncate tracking-tight"
          title={player.name}
        >
          {player.name}
        </span>
      </div>

      {/* 右側：優先顯示「資料來源」超連結，若無連結則顯示職位或備註 */}
      {player.sourceUrl ? (
        <a
          href={player.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 text-right font-mono text-xs text-zinc-400 hover:text-white hover:underline flex items-center gap-1 truncate max-w-[120px] transition-colors"
          title={player.sourceName ? `資料來源: ${player.sourceName}` : '點擊查看資料來源'}
        >
          <span className="truncate">{player.sourceName || '資料來源'}</span>
          <svg
            className="w-3 h-3 shrink-0 opacity-70"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
            />
          </svg>
        </a>
      ) : defaultNote ? (
        <div className="shrink-0 text-right font-mono text-xs text-[var(--text-muted)] truncate max-w-[100px]">
          {defaultNote}
        </div>
      ) : null}
    </div>
  );

  return (
    <div className="flex flex-col w-full bg-[var(--surface)] hover:bg-[var(--surface-muted)] rounded-[var(--radius-panel)] p-3 sm:p-3.5 shadow-xs hover:shadow-md transition-[background-color,box-shadow] duration-200">
      {/* Team Header - 無格線 (Stroke-Free) */}
      <div className="flex items-center justify-between pb-1.5 mb-2">
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
            <span className="text-[11px] text-[var(--text-muted)] uppercase tracking-wider font-mono shrink-0">
              {team.region}
            </span>
          </div>
        </div>
      </div>

      {/* Arc UI Tabs: 完全填滿寬度 (w-full)，無死角貼合 */}
      <Tabs defaultValue="active" size="sm" className="w-full flex-1 flex flex-col fill-tabs">
        <TabsList size="sm" className="w-full flex" data-fill="true">
          <TabsTrigger value="active" size="sm" className="flex-1 text-center justify-center px-1 text-xs font-medium">
            現有名單
          </TabsTrigger>
          <TabsTrigger value="rumors" size="sm" className="flex-1 text-center justify-center px-1 text-xs font-medium">
            傳聞名單
          </TabsTrigger>
          <TabsTrigger value="inactive" size="sm" className="flex-1 text-center justify-center px-1 text-xs font-medium">
            離隊/FA
          </TabsTrigger>
        </TabsList>

        {/* 現有名單 - 自適應高度，不設滑條 */}
        <TabsContent value="active" className="mt-2.5 flex flex-col gap-1.5">
          {team.activeRoster.length === 0 ? (
            <div className="py-6 text-center text-xs text-[var(--text-muted)] font-mono">
              目前暫無現役成員
            </div>
          ) : (
            team.activeRoster.map((p) => {
              const roleLabel = formatRoleLabel(p.role);
              return renderPlayerRow(p, roleLabel);
            })
          )}
        </TabsContent>

        {/* 傳聞名單 - 自適應高度，不設滑條 */}
        <TabsContent value="rumors" className="mt-2.5 flex flex-col gap-1.5">
          {team.rumoredIn.length === 0 ? (
            <div className="py-6 text-center text-xs text-[var(--text-muted)] font-mono">
              目前暫無傳聞情報
            </div>
          ) : (
            team.rumoredIn.map((p) => renderPlayerRow(p, p.notes || '傳聞加盟'))
          )}
        </TabsContent>

        {/* 離隊/FA 名單 - 自適應高度，不設滑條 */}
        <TabsContent value="inactive" className="mt-2.5 flex flex-col gap-1.5">
          {inactiveList.length === 0 ? (
            <div className="py-6 text-center text-xs text-[var(--text-muted)] font-mono">
              目前無離隊或 FA 選手
            </div>
          ) : (
            inactiveList.map((p) => {
              const label =
                p.category === 'benched'
                  ? p.notes || '待轉會'
                  : p.notes || '已離隊';
              return renderPlayerRow(p, label);
            })
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};
