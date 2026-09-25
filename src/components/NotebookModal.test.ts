import { describe, expect, it } from 'vitest';
import type { PostNotebook } from '../lib/types';

describe('PostNotebook data model and mapping', () => {
  it('正確識別有效的附錄資料結構', () => {
    const notebook: PostNotebook = {
      id: 'nb-1',
      title: '戰隊官方公告全文',
      source: '官方社群公告',
      description: '完整收錄官方聲明與賽事規章補充說明',
      content: '感謝各位粉絲的關心與支持...',
    };

    expect(notebook.title).toBe('戰隊官方公告全文');
    expect(notebook.source).toBe('官方社群公告');
    expect(notebook.content).toContain('感謝各位粉絲');
    expect(notebook.content.length).toBeGreaterThan(0);
  });

  it('過濾掉缺少必要欄位（無標題且無內文／圖片）的無效資料', () => {
    const rawList = [
      { id: '1', title: '有效項目', content: '內容文字' },
      { id: '2', title: '', content: '無標題內容' },
      { id: '3', title: '無內容無圖片', content: '', images: [] },
      { id: '4', title: '有圖片但無內文', content: '', images: [{ url: 'https://example.com/img.jpg' }] },
      { id: '5' },
    ];

    const validList = rawList.filter(
      (n: any) => n.title && (n.content || (n.images && n.images.length > 0))
    );
    expect(validList).toHaveLength(2);
    expect(validList[0].id).toBe('1');
    expect(validList[1].id).toBe('4');
  });

  it('支援選填的 source 與 description 欄位', () => {
    const minimal: PostNotebook = {
      title: '僅標題與內文',
      content: '純文字測試',
    };

    expect(minimal.source).toBeUndefined();
    expect(minimal.description).toBeUndefined();
    expect(minimal.title).toBe('僅標題與內文');
  });

  it('支援附錄圖片清單與自訂圖說', () => {
    const withImages: PostNotebook = {
      title: '規章賽程附錄',
      content: '',
      imageUrls: 'https://example.com/1.jpg | 賽程圖表\nhttps://example.com/2.jpg',
      images: [
        { url: 'https://example.com/1.jpg', caption: '賽程圖表' },
        { url: 'https://example.com/2.jpg' },
      ],
    };

    expect(withImages.images).toHaveLength(2);
    expect(withImages.images?.[0].caption).toBe('賽程圖表');
    expect(withImages.images?.[1].caption).toBeUndefined();
  });
});

import { matchNotebookTag, injectNotebookPlacements } from './NotebookModal';

describe('matchNotebookTag', () => {
  it('正確識別中英文短代碼與序號', () => {
    expect(matchNotebookTag('{{notebook:1}}')).toEqual({ index: 0 });
    expect(matchNotebookTag('{{notebook:2}}')).toEqual({ index: 1 });
    expect(matchNotebookTag('{{notebook}}')).toEqual({ index: undefined });
    expect(matchNotebookTag('{{附錄:1}}')).toEqual({ index: 0 });
    expect(matchNotebookTag('{{附錄:3}}')).toEqual({ index: 2 });
    expect(matchNotebookTag('{{附錄}}')).toEqual({ index: undefined });
    expect(matchNotebookTag('[notebook:1]')).toEqual({ index: 0 });
    expect(matchNotebookTag('[附錄:2]')).toEqual({ index: 1 });
    expect(matchNotebookTag(':::notebook 1:::')).toEqual({ index: 0 });
    expect(matchNotebookTag('<!-- notebook:1 -->')).toEqual({ index: 0 });
  });

  it('對普通段落文字回傳 null', () => {
    expect(matchNotebookTag('這是一般段落內容')).toBeNull();
    expect(matchNotebookTag('')).toBeNull();
    expect(matchNotebookTag('https://example.com')).toBeNull();
  });
});

describe('injectNotebookPlacements', () => {
  it('支援 top 放置於文章開頭', () => {
    const content = '<p>第一段</p><p>第二段</p>';
    const notebooks: PostNotebook[] = [
      { title: '附錄一', content: '內容', placement: 'top' },
    ];
    const result = injectNotebookPlacements(content, notebooks);
    expect(result.startsWith('{{notebook:1}}\n\n')).toBe(true);
  });

  it('支援 after_p1 放置於第一段之後', () => {
    const content = '<p>第一段</p><p>第二段</p>';
    const notebooks: PostNotebook[] = [
      { title: '附錄一', content: '內容', placement: 'after_p1' },
    ];
    const result = injectNotebookPlacements(content, notebooks);
    expect(result).toBe('<p>第一段</p>\n\n{{notebook:1}}\n\n<p>第二段</p>');
  });

  it('支援 after_h2_1 放置於第一個 H2 標題之後', () => {
    const content = '<h2>章節一</h2><p>章節內文</p>';
    const notebooks: PostNotebook[] = [
      { title: '附錄一', content: '內容', placement: 'after_h2_1' },
    ];
    const result = injectNotebookPlacements(content, notebooks);
    expect(result).toContain('{{notebook:1}}');
  });

  it('若內文已有手動短代碼則不重複注入', () => {
    const content = '<p>第一段</p><p>{{notebook:1}}</p><p>第二段</p>';
    const notebooks: PostNotebook[] = [
      { title: '附錄一', content: '內容', placement: 'after_p1' },
    ];
    const result = injectNotebookPlacements(content, notebooks);
    expect(result).toBe(content);
  });
});
