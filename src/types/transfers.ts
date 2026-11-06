export type TransferRegion = 'all' | 'americas' | 'emea' | 'pacific' | 'china';

export type TransferCategory = 'active' | 'rumored_in' | 'benched' | 'departed';

export interface CategoryDefinition {
  key: TransferCategory;
  label: string;
  labelEn: string;
  badgeBg: string;
  badgeText: string;
  dotColor: string;
}

export interface TransferPlayer {
  id: string;
  name: string;
  country: string; // ISO 2-letter code e.g. 'US', 'BR', 'KR'
  category: TransferCategory;
  contractYear?: string; // e.g. '2028', '2027', 'HC 2028'
  role?: string; // e.g. 'Player', 'Head Coach', 'IGL'
  notes?: string; // e.g. '試訓中', '轉往 NRG'
  sourceName?: string; // e.g. 'Sheep Esports', '官方公告', 'X'
  sourceUrl?: string; // e.g. 'https://x.com/...'
}

export interface TransferTeam {
  id: string;
  name: string;
  slug?: string;
  region: 'americas' | 'emea' | 'pacific' | 'china';
  brandColor?: string; // e.g. '#e11d48'
  logoUrl?: string;
  order?: number;
  activeRoster: TransferPlayer[]; // 現有名單
  rumoredIn: TransferPlayer[]; // 傳聞名單
  benched: TransferPlayer[]; // 板凳/待轉
  departed: TransferPlayer[]; // 離隊人員
}
