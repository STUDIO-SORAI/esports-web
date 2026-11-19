import type {
  TransferTeam,
  TransferPlayer,
  TransferCategory,
  CategoryDefinition,
  LftPlayer,
} from '../types/transfers';

export const CATEGORIES: Record<TransferCategory, CategoryDefinition> = {
  active: {
    key: 'active',
    label: '現有名單',
    labelEn: 'Active Roster',
    badgeBg: 'bg-emerald-950/60 border border-emerald-500/30',
    badgeText: 'text-emerald-400',
    dotColor: 'bg-emerald-400',
  },
  rumored_in: {
    key: 'rumored_in',
    label: '傳聞加入',
    labelEn: 'Rumored In',
    badgeBg: 'bg-sky-950/60 border border-sky-500/30',
    badgeText: 'text-sky-400',
    dotColor: 'bg-sky-400',
  },
  benched: {
    key: 'benched',
    label: '板凳 / 待轉',
    labelEn: 'Benched / Transfer Listed',
    badgeBg: 'bg-amber-950/60 border border-amber-500/30',
    badgeText: 'text-amber-400',
    dotColor: 'bg-amber-400',
  },
  departed: {
    key: 'departed',
    label: '離隊人員',
    labelEn: 'Departures',
    badgeBg: 'bg-rose-950/60 border border-rose-500/30',
    badgeText: 'text-rose-400',
    dotColor: 'bg-rose-400',
  },
};

export type TransferGameSlug = 'valorant' | 'lol' | 'cs2' | 'r6';

export interface TransferGamePage {
  slug: TransferGameSlug;
  /** <title> */
  title: string;
  /** <meta name="description"> */
  description: string;
  /** 大標下方的一句話 */
  intro: string;
  /** 遊戲短名。大標的 logo alt 與遊戲切換選單都用它。 */
  label: string;
}

const TRANSFER_GAME_PAGES: Record<TransferGameSlug, TransferGamePage> = {
  valorant: {
    slug: 'valorant',
    title: 'VALORANT 轉會期名單 | VCT 戰隊陣容追蹤',
    description:
      'VCT 各賽區合作戰隊與 Ascension 晉升戰隊最新陣容變動、選手合約與轉會動態追蹤。',
    intro: 'VCT 美洲、EMEA、太平洋與中國四大賽區各戰隊即時陣容與選手轉會動態追蹤。',
    label: '特戰英豪',
  },
  lol: {
    slug: 'lol',
    title: '英雄聯盟轉會期名單 | LoL 戰隊陣容追蹤',
    description: '英雄聯盟各賽區戰隊最新陣容變動、選手合約與轉會動態追蹤。',
    intro: '英雄聯盟各戰隊即時陣容與選手轉會動態追蹤。',
    label: '英雄聯盟',
  },
  cs2: {
    slug: 'cs2',
    title: 'CS2 轉會期名單 | Counter-Strike 2 戰隊陣容追蹤',
    description: 'Counter-Strike 2 各戰隊最新陣容變動、選手合約與轉會動態追蹤。',
    intro: 'Counter-Strike 2 各戰隊即時陣容與選手轉會動態追蹤。',
    label: 'CS2',
  },
  r6: {
    slug: 'r6',
    title: '虹彩六號轉會期名單 | Rainbow Six Siege 戰隊陣容追蹤',
    description: 'Rainbow Six Siege 各戰隊最新陣容變動、選手合約與轉會動態追蹤。',
    intro: 'Rainbow Six Siege 各戰隊即時陣容與選手轉會動態追蹤。',
    label: '虹彩六號',
  },
};

export const TRANSFER_GAME_SLUGS = Object.keys(TRANSFER_GAME_PAGES) as TransferGameSlug[];

/** 四個頁面的設定，依 TRANSFER_GAME_SLUGS 順序。遊戲切換選單用它列出選項。 */
export const TRANSFER_GAME_LIST: TransferGamePage[] = TRANSFER_GAME_SLUGS.map(
  (slug) => TRANSFER_GAME_PAGES[slug]
);

/** 轉會頁網址。/transfers 會 301 到 valorant，所以一律帶上 slug。 */
export const transferGamePath = (slug: TransferGameSlug): string => `/transfers/${slug}`;

/** 把網址上的 game 片段解析成頁面設定；認不出來回傳 null，由頁面回 404。 */
export function resolveTransferGame(slug: string): TransferGamePage | null {
  const key = (slug || '').trim().toLowerCase();
  return Object.prototype.hasOwnProperty.call(TRANSFER_GAME_PAGES, key)
    ? TRANSFER_GAME_PAGES[key as TransferGameSlug]
    : null;
}

export function normalizeCategory(raw: string): TransferCategory {
  const s = (raw || '').trim().toLowerCase();
  if (
    s.includes('rumor') ||
    s.includes('傳聞') ||
    s.includes('加入') ||
    s.includes('join') ||
    s === 'in' ||
    s.startsWith('in_') ||
    s.startsWith('in-') ||
    s.startsWith('in ')
  ) {
    return 'rumored_in';
  }
  if (
    s.includes('fa') ||
    s.includes('free agent') ||
    s.includes('bench') ||
    s.includes('板凳') ||
    s.includes('待轉') ||
    s.includes('inactive') ||
    s.includes('後備')
  ) {
    return 'benched';
  }
  if (
    s.includes('depart') ||
    s.includes('離隊') ||
    s.includes('離開') ||
    s.includes('轉出') ||
    s.includes('left') ||
    s === 'out' ||
    s.startsWith('out_') ||
    s.startsWith('out-') ||
    s.startsWith('out ')
  ) {
    return 'departed';
  }
  return 'active';
}

/**
 * Parses raw CSV content (e.g. from published Google Sheet) into TransferTeam[]
 *
 * Expected Google Sheet columns (flexible header names):
 * team, region, brandColor, category, player, country, year, notes
 *
 * category: '現有名單' | '傳聞加入' | '板凳' | '離隊人員'
 */
export function parseGoogleSheetCsv(csvContent: string): TransferTeam[] {
  if (!csvContent || typeof csvContent !== 'string') return [];

  const lines = csvContent
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length < 2) return [];

  // Parse header
  const headerLine = lines[0];
  const headers = parseCsvRow(headerLine).map((h) => h.toLowerCase().trim());

  const getColIdx = (exactMatches: string[], fuzzySubstrings: string[] = []) => {
    const exact = headers.findIndex((h) => exactMatches.some((e) => h === e));
    if (exact !== -1) return exact;
    return headers.findIndex((h) => fuzzySubstrings.some((a) => h.includes(a)));
  };

  const teamIdx = getColIdx(['team', '隊伍'], ['team', '隊伍']);
  const regionIdx = getColIdx(['region', '賽區'], ['region', '賽區']);
  const colorIdx = getColIdx(['brandcolor', 'color', 'brand_color', '顏色'], ['color', 'brand']);
  const categoryIdx = getColIdx(['category', '類別', 'type', 'column', 'col', '分類'], ['category', '類別', '分類']);
  const playerIdx = getColIdx(['player', 'name', '選手', 'id'], ['player', '選手']);
  const countryIdx = getColIdx(['country', 'flag', '國籍'], ['country', '國籍']);
  const yearIdx = getColIdx(['year', 'contract', '合約', 'role'], ['year', '合約', 'contract']);
  const notesIdx = getColIdx(['notes', 'note', '備註', '備注'], ['note', '備註']);

  if (teamIdx === -1 || playerIdx === -1) {
    return [];
  }

  const teamsMap = new Map<string, TransferTeam>();

  for (let i = 1; i < lines.length; i++) {
    const row = parseCsvRow(lines[i]);
    const teamName = (row[teamIdx] || '').trim();
    const playerName = (row[playerIdx] || '').trim();

    if (!teamName || !playerName) continue;

    const teamKey = teamName.toLowerCase().replace(/\s+/g, '-');
    // 賽區現在是 CMS 資料（每款遊戲各一組），不再是 VCT 四區的枚舉，
    // 所以 CSV 寫什麼就當成賽區代碼原樣帶過去；VCT 四區的舊寫法仍然對得上。
    // 留空就是沒指派賽區 —— 以前會硬塞 'americas'，那會讓隊伍落在錯的分頁上。
    const regionVal = ((regionIdx >= 0 ? row[regionIdx] : '') || '').toLowerCase().trim();
    const region: TransferTeam['region'] = regionVal || undefined;

    const brandColor = (colorIdx >= 0 ? row[colorIdx] : '')?.trim() || '#ef4444';

    if (!teamsMap.has(teamKey)) {
      teamsMap.set(teamKey, {
        id: teamKey,
        name: teamName,
        region,
        brandColor,
        activeRoster: [],
        rumoredIn: [],
        benched: [],
        departed: [],
      });
    }

    const team = teamsMap.get(teamKey)!;
    const rawCategory = (categoryIdx >= 0 ? row[categoryIdx] : '') || '';
    const category = normalizeCategory(rawCategory);
    const country = ((countryIdx >= 0 ? row[countryIdx] : '') || 'US').trim().toUpperCase();
    const yearVal = (yearIdx >= 0 ? row[yearIdx] : '')?.trim();
    const notesVal = (notesIdx >= 0 ? row[notesIdx] : '')?.trim() || '—';

    const player: TransferPlayer = {
      id: `${teamKey}-${i}`,
      name: playerName,
      country,
      category,
      contractYear: yearVal || undefined,
      notes: notesVal,
    };

    switch (category) {
      case 'rumored_in':
        team.rumoredIn.push(player);
        break;
      case 'benched':
        team.benched.push(player);
        break;
      case 'departed':
        team.departed.push(player);
        break;
      case 'active':
      default:
        team.activeRoster.push(player);
        break;
    }
  }

  return Array.from(teamsMap.values());
}

/**
 * Standard CSV row parser handling quotes and commas
 */
function parseCsvRow(rowText: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < rowText.length; i++) {
    const char = rowText[i];
    if (char === '"') {
      if (inQuotes && rowText[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

/** 戰隊卡片右下角切換的三種名單模式：現有名單 / 現有+傳聞 / 離隊獨立 */
export type TeamRosterTab = 'active' | 'rumors' | 'inactive';

export interface RosterPlayerItem {
  player: TransferPlayer;
  isRumored: boolean;
}

export interface RosterColumnLayout {
  mode: 'single' | 'double';
  columns: RosterPlayerItem[][];
}

/**
 * 依卡片目前選中的分頁回傳應顯示的選手清單：
 * - active（現）：僅現有名單
 * - rumors（傳）：現有名單 + 傳聞加入（傳聞成員標記 isRumored: true）
 * - inactive（離）：獨立顯示板凳／待轉與已離隊成員
 */
export function getTeamRosterForTab(
  team: Pick<TransferTeam, 'activeRoster' | 'rumoredIn' | 'benched' | 'departed'>,
  tab: TeamRosterTab
): RosterPlayerItem[] {
  if (tab === 'active') {
    return team.activeRoster.map((player) => ({ player, isRumored: false }));
  }
  if (tab === 'rumors') {
    return [
      ...team.activeRoster.map((player) => ({ player, isRumored: false })),
      ...team.rumoredIn.map((player) => ({ player, isRumored: true })),
    ];
  }
  return [...team.benched, ...team.departed].map((player) => ({
    player,
    isRumored: false,
  }));
}

/**
 * 依名單人數決定欄數：
 * - 5 人（含）以下：單排（1 欄）
 * - 超過 5 人：雙排（2 欄），左欄預設先排滿 4 人（6–8 人為 4+2 / 4+3 / 4+4），
 *   超過 8 人時平分兩欄避免撐出第三欄。
 */
export function layoutRosterColumns(items: RosterPlayerItem[]): RosterColumnLayout {
  if (items.length <= 5) {
    return { mode: 'single', columns: [items] };
  }
  const firstColCount = Math.max(4, Math.ceil(items.length / 2));
  return {
    mode: 'double',
    columns: [items.slice(0, firstColCount), items.slice(firstColCount)],
  };
}

/**
 * Generates an exemplary CSV template for Google Sheets.
 */
export function getSampleCsvTemplate(): string {
  return `team,region,brandColor,category,player,country,year,notes
Sentinels,americas,#e11d48,現有名單,OXY,US,2028,—
Sentinels,americas,#e11d48,現有名單,johnqt,MA,2028,—
Sentinels,americas,#e11d48,傳聞加入,Wo0t,TR,,試訓中
Sentinels,americas,#e11d48,板凳/待轉,cortezia,BR,2028,尋求報價
Sentinels,americas,#e11d48,離隊人員,JonahP,CA,,離隊
G2 Esports,americas,#ef4444,現有名單,Sato,US,2028,—
G2 Esports,americas,#ef4444,離隊人員,BABYBAY,US,,LFT
Fnatic,emea,#ea580c,現有名單,Boaster,UK,2027,—
Fnatic,emea,#ea580c,離隊人員,Derke,FI,,離隊 / F/A`;
}
