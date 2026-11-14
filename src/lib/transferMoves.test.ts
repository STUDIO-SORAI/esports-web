import { describe, it, expect } from 'vitest';
import {
  selectTransferMoveRows,
  formatMoveDate,
  TRANSFER_WIDGET_ROWS,
  type TransferMoveDoc,
} from './transferMoves';

const move = (over: Partial<TransferMoveDoc> = {}): TransferMoveDoc => ({
  id: over.id ?? 1,
  playerName: 'Boaster',
  country: 'GB',
  status: 'official',
  game: 'valorant',
  date: '2026-11-01T00:00:00.000Z',
  fromTeam: { name: 'Fnatic', logoUrl: '/fnatic.png' },
  toTeam: { name: 'Sentinels', logoUrl: '/sen.png' },
  ...over,
});

describe('selectTransferMoveRows', () => {
  it('只留下該分頁的消息性質', () => {
    const rows = selectTransferMoveRows(
      [
        move({ id: 1, status: 'official', playerName: 'A' }),
        move({ id: 2, status: 'rumor', playerName: 'B' }),
      ],
      'official',
    );
    expect(rows.map((r) => r.playerName)).toEqual(['A']);

    const rumors = selectTransferMoveRows(
      [
        move({ id: 1, status: 'official', playerName: 'A' }),
        move({ id: 2, status: 'rumor', playerName: 'B' }),
      ],
      'rumor',
    );
    expect(rumors.map((r) => r.playerName)).toEqual(['B']);
  });

  it('每面最多四則', () => {
    const docs = Array.from({ length: 9 }, (_, i) =>
      move({ id: i, playerName: `P${i}`, date: `2026-11-0${(i % 9) + 1}T00:00:00.000Z` }),
    );
    expect(selectTransferMoveRows(docs, 'official')).toHaveLength(TRANSFER_WIDGET_ROWS);
    expect(TRANSFER_WIDGET_ROWS).toBe(4);
  });

  it('新的排前面；日期壞掉的排最後而不是整批炸掉', () => {
    const rows = selectTransferMoveRows(
      [
        move({ id: 1, playerName: '舊', date: '2026-10-01T00:00:00.000Z' }),
        move({ id: 2, playerName: '壞', date: '不是日期' }),
        move({ id: 3, playerName: '新', date: '2026-11-05T00:00:00.000Z' }),
      ],
      'official',
    );
    expect(rows.map((r) => r.playerName)).toEqual(['新', '舊', '壞']);
  });

  it('角色優先取 role，沒有才退回 notes，都沒有就留空', () => {
    const [withRole] = selectTransferMoveRows(
      [move({ role: 'IGL', notes: '試訓中' })],
      'official',
    );
    expect(withRole.roleLabel).toBe('IGL');

    const [withNotes] = selectTransferMoveRows(
      [move({ role: '   ', notes: '試訓中' })],
      'official',
    );
    expect(withNotes.roleLabel).toBe('試訓中');

    const [withNeither] = selectTransferMoveRows([move({})], 'official');
    expect(withNeither.roleLabel).toBe('');
  });

  it('未知的一側顯示 ? 而不是隊徽', () => {
    const [row] = selectTransferMoveRows(
      [move({ fromTeam: null, toTeam: { name: 'Sentinels', logoUrl: '/sen.png' } })],
      'official',
    );
    expect(row.from).toEqual({ label: '?', known: false });
    expect(row.to).toEqual({ label: 'Sentinels', logoUrl: '/sen.png', known: true });
  });

  it('沒有隊徽的已知隊伍仍帶隊名，不退回 ?', () => {
    const [row] = selectTransferMoveRows(
      [move({ fromTeam: { name: 'Karmine Corp' } })],
      'official',
    );
    expect(row.from).toEqual({ label: 'Karmine Corp', known: true });
  });

  it('整列連到該列遊戲的轉會頁', () => {
    const [row] = selectTransferMoveRows([move({ game: 'lol' })], 'official');
    expect(row.href).toBe('/transfers/lol');
  });

  it('有來源才帶來源名稱', () => {
    const [withSource] = selectTransferMoveRows(
      [move({ sourceName: 'Sheep Esports' })],
      'official',
    );
    expect(withSource.sourceName).toBe('Sheep Esports');
    const [withoutSource] = selectTransferMoveRows([move({})], 'official');
    expect(withoutSource.sourceName).toBeUndefined();
  });

  it('丟掉沒有選手名的髒資料', () => {
    const rows = selectTransferMoveRows(
      [move({ id: 1, playerName: '  ' }), move({ id: 2, playerName: 'Derke' })],
      'official',
    );
    expect(rows.map((r) => r.playerName)).toEqual(['Derke']);
  });

  it('同一列的 key 唯一，供 React 列表使用', () => {
    const rows = selectTransferMoveRows(
      [move({ id: 7, playerName: 'A' }), move({ id: 8, playerName: 'B' })],
      'official',
    );
    expect(new Set(rows.map((r) => r.key)).size).toBe(2);
  });
  it('傳了 game 就只留該款遊戲（小部件的左右切換）', () => {
    const docs = [
      move({ id: 1, playerName: 'V', game: 'valorant' }),
      move({ id: 2, playerName: 'L', game: 'lol' }),
      move({ id: 3, playerName: 'C', game: 'cs2' }),
    ];

    expect(selectTransferMoveRows(docs, 'official', 4, 'lol').map((r) => r.playerName)).toEqual([
      'L',
    ]);
    // 不傳就不分遊戲，維持原行為
    expect(selectTransferMoveRows(docs, 'official').map((r) => r.playerName)).toEqual([
      'V',
      'L',
      'C',
    ]);
  });
});

describe('formatMoveDate', () => {
  it('空值與壞日期回空字串，不丟例外', () => {
    expect(formatMoveDate(undefined)).toBe('');
    expect(formatMoveDate('')).toBe('');
    expect(formatMoveDate('不是日期')).toBe('');
  });

  it('可解析的日期回非空短字串', () => {
    const text = formatMoveDate('2026-11-05T12:00:00.000Z');
    expect(text.length).toBeGreaterThan(0);
    // 台北時區的日期部分，不寫死 Intl 的完整輸出
    expect(text).toContain('5');
  });
});
