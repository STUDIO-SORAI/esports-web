import type { TransferGameSlug } from './transfers';

export type TransferMoveStatus = 'official' | 'rumor';

/** 轉會事件上的隊伍（CMS 以 depth=1 帶出來的那一份）。 */
export interface TransferMoveTeam {
  name: string;
  logoUrl?: string;
}

/** `/api/transfer-moves` 單筆事件，取用前已先過濾 state 與 publishAt。 */
export interface TransferMoveDoc {
  id: string | number;
  playerName: string;
  country?: string;
  role?: string;
  notes?: string;
  status: TransferMoveStatus;
  game: TransferGameSlug;
  /** 名冊改動當下的時間（ISO 字串） */
  date: string;
  sourceName?: string;
  fromTeam?: TransferMoveTeam | null;
  toTeam?: TransferMoveTeam | null;
}

/** 單側顯示資料。`known: false` 代表去向／來處未定，畫面上是 `?` 而不是隊徽。 */
export interface TransferMoveSideView {
  label: string;
  logoUrl?: string;
  known: boolean;
}

export interface TransferMoveRow {
  key: string;
  playerName: string;
  country?: string;
  /** 角色優先取 role，沒有才退回 notes，都沒有就空字串 */
  roleLabel: string;
  from: TransferMoveSideView;
  to: TransferMoveSideView;
  date: string;
  /** 整列的點擊目標：該列遊戲的轉會頁 */
  href: string;
  /** 有來源時掛在整列的 title 上；線上只有少部分選手有填 */
  sourceName?: string;
}

/** 每個分頁顯示的則數。 */
export const TRANSFER_WIDGET_ROWS = 4;

const text = (value?: string | null): string => (value || '').trim();

const sideOf = (team?: TransferMoveTeam | null): TransferMoveSideView => {
  const name = text(team?.name);
  if (!name) return { label: '?', known: false };
  const logoUrl = text(team?.logoUrl);
  return logoUrl ? { label: name, logoUrl, known: true } : { label: name, known: true };
};

/** 排序用的時間戳。壞日期不丟例外，排到最後。 */
const timeOf = (iso?: string): number => {
  const t = new Date(iso || '').getTime();
  return Number.isNaN(t) ? -Infinity : t;
};

/**
 * 挑出某一分頁要顯示的事件並整成單列顯示資料。
 * 沒有時間下限：淡季就顯示較舊的消息，不做空狀態。
 * 傳 game 就只留該款遊戲（小部件的左右切換用），不傳則不分遊戲。
 */
export function selectTransferMoveRows(
  docs: TransferMoveDoc[],
  status: TransferMoveStatus,
  limit = TRANSFER_WIDGET_ROWS,
  game?: TransferGameSlug,
): TransferMoveRow[] {
  return (docs || [])
    .filter((doc) => doc && doc.status === status && text(doc.playerName))
    .filter((doc) => !game || doc.game === game)
    .sort((a, b) => timeOf(b.date) - timeOf(a.date))
    .slice(0, limit)
    .map((doc) => {
      const sourceName = text(doc.sourceName);
      return {
        key: `${doc.id}`,
        playerName: text(doc.playerName),
        country: text(doc.country) || undefined,
        roleLabel: text(doc.role) || text(doc.notes),
        from: sideOf(doc.fromTeam),
        to: sideOf(doc.toTeam),
        date: doc.date,
        href: `/transfers/${doc.game}`,
        sourceName: sourceName || undefined,
      };
    });
}

/** 列上的短日期。全站時間一律 Asia/Taipei；壞日期回空字串而不是丟 RangeError。 */
export function formatMoveDate(iso?: string): string {
  const date = new Date(iso || '');
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('zh-TW', {
    timeZone: 'Asia/Taipei',
    month: 'numeric',
    day: 'numeric',
  }).format(date);
}
