import { describe, it, expect } from "vitest";
import { buildTopicIndex, buildRelatedTopics } from "./topics";
import type { NavCategory } from "./config";

const CATEGORIES: NavCategory[] = [
  { name: "特戰英豪", slug: "valorant" },
  { name: "專欄報導", slug: "opinion" },
];

const post = (
  slug: string,
  tags: string[] | string,
  publishedAt?: string | null,
  extra: Record<string, unknown> = {}
) => ({ slug, tags, publishedAt: publishedAt ?? null, ...extra });

describe("buildTopicIndex", () => {
  it("依文章數排序，並帶回每個主題的文章數", () => {
    const index = buildTopicIndex(
      [
        post("a", ["VCT", "選手動態"], "2026-01-03"),
        post("b", ["VCT"], "2026-01-02"),
        post("c", ["VCT", "選手動態"], "2026-01-01"),
      ],
      CATEGORIES
    );

    expect(index.map((t) => [t.name, t.count])).toEqual([
      ["VCT", 3],
      ["選手動態", 2],
    ]);
  });

  it("排除與主分類同名的標籤（下方已有專屬區塊，避免重覆入口）", () => {
    const index = buildTopicIndex(
      [post("a", ["專欄報導", "特戰英豪", "VCT"], "2026-01-01")],
      CATEGORIES
    );

    expect(index.map((t) => t.name)).toEqual(["VCT"]);
  });

  it("主分類比對忽略大小寫與前後空白", () => {
    const index = buildTopicIndex(
      [post("a", [" 專欄報導 ", "cs2"], "2026-01-01")],
      [...CATEGORIES, { name: "CS2", slug: "cs2" }]
    );

    expect(index).toEqual([]);
  });

  it("排除 tour-roster 這類內部機能標籤", () => {
    const index = buildTopicIndex(
      [post("a", ["tour-roster-vct-2026", "VCT"], "2026-01-01")],
      CATEGORIES
    );

    expect(index.map((t) => t.name)).toEqual(["VCT"]);
  });

  it("latestPost 取發佈時間最新的一篇，不受輸入順序影響", () => {
    const index = buildTopicIndex(
      [
        post("old", ["VCT"], "2026-01-01"),
        post("new", ["VCT"], "2026-03-01"),
        post("mid", ["VCT"], "2026-02-01"),
      ],
      CATEGORIES
    );

    expect(index[0].latestPost.slug).toBe("new");
  });

  it("沒有 publishedAt 時退回 updatedAt", () => {
    const index = buildTopicIndex(
      [
        post("a", ["VCT"], null, { updatedAt: "2026-05-01" }),
        post("b", ["VCT"], "2026-04-01"),
      ],
      CATEGORIES
    );

    expect(index[0].latestPost.slug).toBe("a");
  });

  it("吃得下 CMS 回傳的 JSON 字串型 tags", () => {
    const index = buildTopicIndex(
      [post("a", JSON.stringify(["VCT", "選手動態"]), "2026-01-01")],
      CATEGORIES
    );

    // 兩者都是 1 篇，平手時的先後由名稱決定，這裡只驗證兩個標籤都被解析出來。
    expect(index.map((t) => t.name).sort()).toEqual(["VCT", "選手動態"].sort());
  });

  it("同一篇文章重複掛同一標籤只算一次", () => {
    const index = buildTopicIndex([post("a", ["VCT", "VCT"], "2026-01-01")], CATEGORIES);

    expect(index[0].count).toBe(1);
  });

  it("忽略空字串與純空白標籤", () => {
    const index = buildTopicIndex([post("a", ["", "   ", "VCT"], "2026-01-01")], CATEGORIES);

    expect(index.map((t) => t.name)).toEqual(["VCT"]);
  });

  it("文章數相同時用名稱排序，輸出穩定", () => {
    const index = buildTopicIndex(
      [post("a", ["BBB", "AAA", "CCC"], "2026-01-01")],
      CATEGORIES
    );

    expect(index.map((t) => t.name)).toEqual(["AAA", "BBB", "CCC"]);
  });

  it("沒有標籤時回傳空陣列", () => {
    expect(buildTopicIndex([post("a", []), post("b", undefined as any)], CATEGORIES)).toEqual([]);
  });
});

describe("buildRelatedTopics", () => {
  it("只算與當前標籤同篇出現的主題，依同現次數排序", () => {
    const related = buildRelatedTopics(
      [
        post("a", ["VCT", "選手動態"], "2026-01-03"),
        post("b", ["VCT", "選手動態"], "2026-01-02"),
        post("c", ["VCT", "轉會"], "2026-01-01"),
        post("d", ["無關主題"], "2026-01-01"),
      ],
      "VCT",
      CATEGORIES
    );

    expect(related.map((t) => [t.name, t.count])).toEqual([
      ["選手動態", 2],
      ["轉會", 1],
      ["無關主題", 1],
    ]);
  });

  it("不會把當前標籤自己列進相關主題", () => {
    const related = buildRelatedTopics(
      [post("a", ["VCT", "選手動態"], "2026-01-01")],
      "VCT",
      CATEGORIES
    );

    expect(related.map((t) => t.name)).toEqual(["選手動態"]);
  });

  it("同現主題不足時用全站主題補齊，且不重複", () => {
    const related = buildRelatedTopics(
      [
        post("a", ["VCT", "選手動態"], "2026-01-03"),
        post("b", ["轉會"], "2026-01-02"),
        post("c", ["轉會"], "2026-01-01"),
      ],
      "VCT",
      CATEGORIES,
      3
    );

    // 選手動態是真正同現的，排最前面；轉會是補齊來的。
    expect(related.map((t) => t.name)).toEqual(["選手動態", "轉會"]);
  });

  it("補齊時也排除主分類", () => {
    const related = buildRelatedTopics(
      [post("a", ["VCT"], "2026-01-02"), post("b", ["專欄報導"], "2026-01-01")],
      "VCT",
      CATEGORIES
    );

    expect(related).toEqual([]);
  });

  it("尊重 limit", () => {
    const related = buildRelatedTopics(
      [post("a", ["VCT", "t1", "t2", "t3", "t4"], "2026-01-01")],
      "VCT",
      CATEGORIES,
      2
    );

    expect(related).toHaveLength(2);
  });

  it("補齊後仍不超過 limit", () => {
    const related = buildRelatedTopics(
      [
        post("a", ["VCT", "選手動態"], "2026-01-04"),
        post("b", ["轉會"], "2026-01-03"),
        post("c", ["賽程"], "2026-01-02"),
        post("d", ["傷停"], "2026-01-01"),
      ],
      "VCT",
      CATEGORIES,
      2
    );

    expect(related).toHaveLength(2);
    expect(related[0].name).toBe("選手動態");
  });

  it("當前標籤比對忽略大小寫與空白", () => {
    const related = buildRelatedTopics(
      [post("a", ["vct", "選手動態"], "2026-01-01")],
      " VCT ",
      CATEGORIES
    );

    expect(related.map((t) => t.name)).toEqual(["選手動態"]);
  });
})
