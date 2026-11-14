import { describe, expect, it } from 'vitest';
import { maskName, normalizeRegion, filterSignatures } from './signaturesStats';

describe('signaturesStats', () => {
  describe('maskName', () => {
    it('handles empty or whitespace names', () => {
      expect(maskName('')).toBe('匿名連署人');
      expect(maskName('   ')).toBe('匿名連署人');
      expect(maskName(null)).toBe('匿名連署人');
      expect(maskName(undefined)).toBe('匿名連署人');
    });

    it('masks single-character names', () => {
      expect(maskName('陳')).toBe('陳*');
      expect(maskName('A')).toBe('A*');
    });

    it('masks multi-character Chinese names', () => {
      expect(maskName('陳大')).toBe('陳*');
      expect(maskName('陳大明')).toBe('陳**');
      expect(maskName('起司蟲哥哥')).toBe('起****');
    });

    it('masks English and Vietnamese names', () => {
      expect(maskName('Bax')).toBe('B**');
      expect(maskName('Nguyễn Hoàng Huy')).toBe('N****');
      expect(maskName('Kate Chen')).toBe('K****');
    });
  });

  describe('normalizeRegion', () => {
    it('normalizes Taiwan variations', () => {
      expect(normalizeRegion('台灣')).toEqual({ key: 'TW', label: '台灣' });
      expect(normalizeRegion('臺灣')).toEqual({ key: 'TW', label: '台灣' });
      expect(normalizeRegion('台湾')).toEqual({ key: 'TW', label: '台灣' });
      expect(normalizeRegion('Taiwan')).toEqual({ key: 'TW', label: '台灣' });
      expect(normalizeRegion('TW')).toEqual({ key: 'TW', label: '台灣' });
      expect(normalizeRegion('臺灣🇹🇼')).toEqual({ key: 'TW', label: '台灣' });
    });

    it('normalizes Hong Kong variations', () => {
      expect(normalizeRegion('香港')).toEqual({ key: 'HK', label: '香港' });
      expect(normalizeRegion('Hong Kong')).toEqual({ key: 'HK', label: '香港' });
      expect(normalizeRegion('HK')).toEqual({ key: 'HK', label: '香港' });
      expect(normalizeRegion('HKSAR')).toEqual({ key: 'HK', label: '香港' });
      expect(normalizeRegion('hong kong')).toEqual({ key: 'HK', label: '香港' });
    });

    it('normalizes other APAC regions', () => {
      expect(normalizeRegion('Việt Nam')).toEqual({ key: 'VN', label: '越南' });
      expect(normalizeRegion('Vietnam')).toEqual({ key: 'VN', label: '越南' });
      expect(normalizeRegion('日本')).toEqual({ key: 'JP', label: '日本' });
      expect(normalizeRegion('Japan')).toEqual({ key: 'JP', label: '日本' });
      expect(normalizeRegion('澳門')).toEqual({ key: 'MO', label: '澳門' });
      expect(normalizeRegion('馬來西亞')).toEqual({ key: 'MY', label: '馬來西亞' });
      expect(normalizeRegion('Australia')).toEqual({ key: 'OCE', label: '大洋洲' });
    });

    it('handles empty and unknown regions', () => {
      expect(normalizeRegion('')).toEqual({ key: 'UNSPECIFIED', label: '未填寫' });
      expect(normalizeRegion(null)).toEqual({ key: 'UNSPECIFIED', label: '未填寫' });
      expect(normalizeRegion('Mars')).toEqual({ key: 'OTHER', label: '其他地區' });
    });
  });

  describe('filterSignatures', () => {
    const mockList = [
      {
        maskedName: '陳**',
        regionKey: 'TW',
        regionLabel: '台灣',
        organization: 'STUDIO SORAI',
        message: '希望能有獨立伺服器，重視選手權益',
      },
      {
        maskedName: 'L**',
        regionKey: 'HK',
        regionLabel: '香港',
        organization: '觀眾',
        message: '支持公開信，停止朝令夕改',
      },
      {
        maskedName: 'N****',
        regionKey: 'VN',
        regionLabel: '越南',
        organization: 'VCS Fan',
        message: 'Respect our teams and players',
      },
      {
        maskedName: 'T**',
        regionKey: 'JP',
        regionLabel: '日本',
        organization: '',
        message: '公平な競技環境を求めます',
      },
    ];

    it('filters by region key', () => {
      const tw = filterSignatures(mockList, '', 'TW');
      expect(tw).toHaveLength(1);
      expect(tw[0].maskedName).toBe('陳**');

      const hk = filterSignatures(mockList, '', 'HK');
      expect(hk).toHaveLength(1);
      expect(hk[0].maskedName).toBe('L**');
    });

    it('filters by query string across message, org, and name', () => {
      const byMsg = filterSignatures(mockList, '伺服器', 'ALL');
      expect(byMsg).toHaveLength(1);
      expect(byMsg[0].maskedName).toBe('陳**');

      const byOrg = filterSignatures(mockList, 'SORAI', 'ALL');
      expect(byOrg).toHaveLength(1);

      const byName = filterSignatures(mockList, 'L**', 'ALL');
      expect(byName).toHaveLength(1);
    });

    it('filters by OTHER_GROUP (non TW/HK/VN)', () => {
      const other = filterSignatures(mockList, '', 'OTHER_GROUP');
      expect(other).toHaveLength(1);
      expect(other[0].regionKey).toBe('JP');
    });
  });
});
