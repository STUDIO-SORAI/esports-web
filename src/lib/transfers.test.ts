import { describe, it, expect } from 'vitest';
import {
  normalizeCategory,
  parseGoogleSheetCsv,
  CATEGORIES,
  getSampleCsvTemplate,
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
