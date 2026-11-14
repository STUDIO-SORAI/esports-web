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
} from './transfers';

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

  it('shows region tabs only for VALORANT, whose region enum is the VCT four', () => {
    expect(resolveTransferGame('valorant')?.showRegionTabs).toBe(true);
    expect(resolveTransferGame('lol')?.showRegionTabs).toBe(false);
    expect(resolveTransferGame('cs2')?.showRegionTabs).toBe(false);
    expect(resolveTransferGame('r6')?.showRegionTabs).toBe(false);
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
