import { describe, it, expect } from 'vitest';
import {
  normalizeCategory,
  parseGoogleSheetCsv,
  CATEGORIES,
  getSampleCsvTemplate,
  resolveTransferGame,
  TRANSFER_GAME_SLUGS,
  TRANSFER_GAME_LIST,
  transferGamePath,
  getTeamRosterForTab,
  layoutRosterColumns,
  type RosterPlayerItem,
} from './transfers';
import type { TransferPlayer } from '../types/transfers';

describe('transfers: normalizeCategory', () => {
  it('correctly maps various raw strings to valid TransferCategory', () => {
    expect(normalizeCategory('active')).toBe('active');
    expect(normalizeCategory('現有名單')).toBe('active');
    expect(normalizeCategory('roster')).toBe('active');
    expect(normalizeCategory('傳聞加入')).toBe('rumored_in');
    expect(normalizeCategory('rumor')).toBe('rumored_in');
    expect(normalizeCategory('in')).toBe('rumored_in');
    expect(normalizeCategory('板凳')).toBe('benched');
    expect(normalizeCategory('待轉')).toBe('benched');
    expect(normalizeCategory('benched')).toBe('benched');
    expect(normalizeCategory('FA')).toBe('benched');
    expect(normalizeCategory('離隊/FA')).toBe('benched');
    expect(normalizeCategory('離隊人員')).toBe('departed');
    expect(normalizeCategory('departed')).toBe('departed');
    expect(normalizeCategory('out')).toBe('departed');
    expect(normalizeCategory('unknown-string')).toBe('active');
  });
});

describe('transfers: parseGoogleSheetCsv', () => {
  it('returns empty array on empty or invalid input', () => {
    expect(parseGoogleSheetCsv('')).toEqual([]);
    expect(parseGoogleSheetCsv('random,header,without,required,cols')).toEqual([]);
  });

  it('correctly parses CSV rows into 4 categories (active, rumored_in, benched, departed)', () => {
    const csv = `team,region,brandColor,category,player,country,year,notes
Sentinels,americas,#e11d48,現有名單,OXY,US,2028,—
Sentinels,americas,#e11d48,傳聞加入,Wo0t,TR,,試訓中
Sentinels,americas,#e11d48,板凳/待轉,cortezia,BR,2028,尋求報價
Sentinels,americas,#e11d48,離隊人員,JonahP,CA,,離隊
Fnatic,emea,#ea580c,現有名單,Boaster,UK,2027,—`;

    const teams = parseGoogleSheetCsv(csv);
    expect(teams).toHaveLength(2);

    const sen = teams.find((t) => t.id === 'sentinels');
    expect(sen).toBeDefined();
    expect(sen?.name).toBe('Sentinels');
    expect(sen?.region).toBe('americas');
    expect(sen?.brandColor).toBe('#e11d48');

    // 現有名單
    expect(sen?.activeRoster).toHaveLength(1);
    expect(sen?.activeRoster[0].name).toBe('OXY');
    expect(sen?.activeRoster[0].country).toBe('US');
    expect(sen?.activeRoster[0].contractYear).toBe('2028');

    // 傳聞加入
    expect(sen?.rumoredIn).toHaveLength(1);
    expect(sen?.rumoredIn[0].name).toBe('Wo0t');
    expect(sen?.rumoredIn[0].notes).toBe('試訓中');

    // 板凳/待轉
    expect(sen?.benched).toHaveLength(1);
    expect(sen?.benched[0].name).toBe('cortezia');
    expect(sen?.benched[0].notes).toBe('尋求報價');

    // 離隊人員
    expect(sen?.departed).toHaveLength(1);
    expect(sen?.departed[0].name).toBe('JonahP');
    expect(sen?.departed[0].notes).toBe('離隊');

    const fnc = teams.find((t) => t.id === 'fnatic');
    expect(fnc).toBeDefined();
    expect(fnc?.region).toBe('emea');
    expect(fnc?.activeRoster[0].name).toBe('Boaster');
  });

  it('generates a valid sample template that parses cleanly', () => {
    const template = getSampleCsvTemplate();
    const parsed = parseGoogleSheetCsv(template);
    expect(parsed.length).toBeGreaterThanOrEqual(3);
    expect(parsed.some((t) => t.id === 'sentinels')).toBe(true);
    expect(parsed.some((t) => t.id === 'fnatic')).toBe(true);
  });
});

describe('transfers: category definitions', () => {

  it('verifies all 4 category definitions exist', () => {
    expect(CATEGORIES.active).toBeDefined();
    expect(CATEGORIES.rumored_in).toBeDefined();
    expect(CATEGORIES.benched).toBeDefined();
    expect(CATEGORIES.departed).toBeDefined();
  });
});

describe('transfers: resolveTransferGame', () => {
  it('resolves the four supported game slugs', () => {
    expect(resolveTransferGame('valorant')?.slug).toBe('valorant');
    expect(resolveTransferGame('lol')?.slug).toBe('lol');
    expect(resolveTransferGame('cs2')?.slug).toBe('cs2');
    expect(resolveTransferGame('r6')?.slug).toBe('r6');
  });

  it('returns null for unknown, empty or junk slugs so the page can 404', () => {
    expect(resolveTransferGame('dota2')).toBeNull();
    expect(resolveTransferGame('')).toBeNull();
    expect(resolveTransferGame('../valorant')).toBeNull();
    expect(resolveTransferGame('valorant2')).toBeNull();
  });

  it('accepts mixed case and surrounding whitespace', () => {
    expect(resolveTransferGame('VALORANT')?.slug).toBe('valorant');
    expect(resolveTransferGame('  LoL  ')?.slug).toBe('lol');
  });

  // canonicalPath 隨 /transfers 改成 301 導向 /transfers/valorant 一起拿掉：
  // 已經沒有第二個網址渲染同一份內容，不需要再指回去。
  it('gives every game a label and a /transfers/<slug> path', () => {
    expect(TRANSFER_GAME_LIST.map((g) => g.label)).toEqual([
      '特戰英豪',
      '英雄聯盟',
      'CS2',
      '虹彩六號',
    ]);
    expect(transferGamePath('valorant')).toBe('/transfers/valorant');
  });

  it('CSV 的賽區欄原樣當成賽區代碼，留空就是沒指派', () => {
    const csv = `team,region,brandColor,category,player,country,year,notes
T1,LCK,#e2012d,現有名單,Faker,KR,2027,—
NoRegion,,#111111,現有名單,Someone,TW,,—`;

    const teams = parseGoogleSheetCsv(csv);
    // 以前這裡會被硬塞成 'americas'，LCK 的隊伍就落到美洲分頁上
    expect(teams.find((t) => t.id === 't1')?.region).toBe('lck');
    expect(teams.find((t) => t.id === 'noregion')?.region).toBeUndefined();
  });

  it('gives every game its own title, description, label and intro', () => {
    const pages = ['valorant', 'lol', 'cs2', 'r6'].map((s) => resolveTransferGame(s)!);
    for (const key of ['title', 'description', 'label', 'intro'] as const) {
      const values = pages.map((p) => p[key]);
      expect(new Set(values).size).toBe(4);
      expect(values.every((v) => v.trim().length > 0)).toBe(true);
    }
  });

  it('keeps the VALORANT copy identical to the existing /transfers page', () => {
    const v = resolveTransferGame('valorant')!;
    expect(v.title).toBe('VALORANT 轉會期名單 | VCT 戰隊陣容追蹤');
    expect(v.description).toBe(
      'VCT 各賽區合作戰隊與 Ascension 晉升戰隊最新陣容變動、選手合約與轉會動態追蹤。'
    );
    expect(v.label).toBe('特戰英豪');
    expect(v.intro).toBe('VCT 美洲、EMEA、太平洋與中國四大賽區各戰隊即時陣容與選手轉會動態追蹤。');
  });

  it('exposes exactly the four games for route generation', () => {
    expect(TRANSFER_GAME_SLUGS).toEqual(['valorant', 'lol', 'cs2', 'r6']);
  });
});

describe('transfers: getTeamRosterForTab', () => {
  const mkPlayer = (id: string, name: string, category: TransferPlayer['category']): TransferPlayer => ({
    id,
    name,
    country: 'FR',
    category,
  });

  const team = {
    activeRoster: [
      mkPlayer('a1', 'Derke', 'active'),
      mkPlayer('a2', 'Less', 'active'),
    ],
    rumoredIn: [mkPlayer('r1', 'Chronicle', 'rumored_in')],
    benched: [mkPlayer('b1', 'Sayf', 'benched')],
    departed: [mkPlayer('d1', 'trexx', 'departed')],
  };

  it('active（現）只回傳現有名單且都不標記為傳聞', () => {
    const result = getTeamRosterForTab(team, 'active');
    expect(result.map((x) => [x.player.name, x.isRumored])).toEqual([
      ['Derke', false],
      ['Less', false],
    ]);
  });

  it('rumors（傳）合併現有名單與傳聞加入，且只有傳聞成員標記 isRumored', () => {
    const result = getTeamRosterForTab(team, 'rumors');
    expect(result.map((x) => [x.player.name, x.isRumored])).toEqual([
      ['Derke', false],
      ['Less', false],
      ['Chronicle', true],
    ]);
  });

  it('inactive（離）維持獨立，只包含板凳與已離隊成員', () => {
    const result = getTeamRosterForTab(team, 'inactive');
    expect(result.map((x) => [x.player.name, x.isRumored])).toEqual([
      ['Sayf', false],
      ['trexx', false],
    ]);
  });
});

describe('transfers: layoutRosterColumns', () => {
  const mkItems = (count: number): RosterPlayerItem[] =>
    Array.from({ length: count }, (_, i) => ({
      player: { id: `p${i + 1}`, name: `P${i + 1}`, country: 'FR', category: 'active' },
      isRumored: false,
    }));

  it('5 人（含）以下維持單排', () => {
    for (const n of [0, 1, 3, 5]) {
      const layout = layoutRosterColumns(mkItems(n));
      expect(layout.mode).toBe('single');
      expect(layout.columns).toHaveLength(1);
      expect(layout.columns[0]).toHaveLength(n);
    }
  });

  it('6–8 人切為兩排，左欄固定 4 人、右欄放剩餘人數', () => {
    const six = layoutRosterColumns(mkItems(6));
    expect(six.mode).toBe('double');
    expect(six.columns.map((c) => c.length)).toEqual([4, 2]);
    expect(six.columns[0].map((x) => x.player.id)).toEqual(['p1', 'p2', 'p3', 'p4']);
    expect(six.columns[1].map((x) => x.player.id)).toEqual(['p5', 'p6']);

    const seven = layoutRosterColumns(mkItems(7));
    expect(seven.mode).toBe('double');
    expect(seven.columns.map((c) => c.length)).toEqual([4, 3]);

    const eight = layoutRosterColumns(mkItems(8));
    expect(eight.mode).toBe('double');
    expect(eight.columns.map((c) => c.length)).toEqual([4, 4]);
  });

  it('超過 8 人仍維持兩排平分，不撐出第三欄', () => {
    const nine = layoutRosterColumns(mkItems(9));
    expect(nine.mode).toBe('double');
    expect(nine.columns.map((c) => c.length)).toEqual([5, 4]);

    const ten = layoutRosterColumns(mkItems(10));
    expect(ten.mode).toBe('double');
    expect(ten.columns.map((c) => c.length)).toEqual([5, 5]);
  });
});
