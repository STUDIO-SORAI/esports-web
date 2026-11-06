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
    const regionVal = ((regionIdx >= 0 ? row[regionIdx] : '') || '').toLowerCase().trim();
    const region: TransferTeam['region'] =
      regionVal.includes('emea') ? 'emea'
      : regionVal.includes('pac') ? 'pacific'
      : regionVal.includes('cn') || regionVal.includes('china') ? 'china'
      : 'americas';

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
