import { parseMaybeJsonArray } from "./api";
import { CATEGORY_FALLBACK, isMainCategory, type NavCategory } from "./config";

export interface TopicPost {
  slug?: string;
  title?: string;
  tags?: string | string[];
  coverImage?: string | null;
  publishedAt?: string | null;
  updatedAt?: string | null;
}

export interface TopicEntry<P extends TopicPost = TopicPost> {
  /** 標籤原始名稱。 */
  name: string;
  /** 這個標籤底下的文章數。 */
  count: number;
  /** 這個標籤最新的一篇文章，給首頁的主打圖卡用。 */
  latestPost: P;
}

const timeOf = (post: TopicPost): number => {
  const raw = post.publishedAt || post.updatedAt;
  const t = raw ? new Date(raw).getTime() : NaN;
  return Number.isNaN(t) ? 0 : t;
};

/**
 * 把文章群整理成「主題索引」：每個話題標籤一筆，附文章數與最新的一篇。
 *
 * 刻意排除兩種標籤：
 * 1. 名稱等於主分類（特戰英豪、專欄報導⋯）的，首頁下方已經有專屬區塊，
 *    再列一次等於同一個入口做兩次。
 * 2. tour-roster 這種內部用的機能標籤，不是給讀者瀏覽的主題。
 *
 * 排序：文章數多的在前，同分時用名稱排，確保輸出穩定（不隨輸入順序漂移）。
 */
export function buildTopicIndex<P extends TopicPost>(
  posts: P[],
  categories: NavCategory[] = CATEGORY_FALLBACK
): TopicEntry<P>[] {
  const byName = new Map<string, TopicEntry<P>>();

  for (const post of posts) {
    const seen = new Set<string>();
    for (const raw of parseMaybeJsonArray(post.tags)) {
      const name = typeof raw === "string" ? raw.trim() : "";
      if (!name) continue;
      if (name.toLowerCase().includes("tour-roster")) continue;
      if (isMainCategory(name, categories)) continue;
      // 同一篇文章重複掛同一個標籤時只算一次。
      if (seen.has(name)) continue;
      seen.add(name);

      const existing = byName.get(name);
      if (!existing) {
        byName.set(name, { name, count: 1, latestPost: post });
        continue;
      }
      existing.count += 1;
      if (timeOf(post) > timeOf(existing.latestPost)) existing.latestPost = post;
    }
  }

  return Array.from(byName.values()).sort(
    (a, b) => b.count - a.count || a.name.localeCompare(b.name)
  );
}

/**
 * 標籤頁側欄的「相關主題」：跟當前標籤同時出現在同一篇文章裡的其他話題，
 * 共同出現次數多的排前面。
 *
 * 同現的主題不足 limit 時，用全站主題索引補齊（一樣排除當前標籤與已列出的），
 * 免得冷門標籤頁的側欄開天窗。
 */
export function buildRelatedTopics<P extends TopicPost>(
  posts: P[],
  currentName: string,
  categories: NavCategory[] = CATEGORY_FALLBACK,
  limit = 10
): TopicEntry<P>[] {
  const target = currentName.trim().toLowerCase();
  const isCurrent = (name: string) => name.trim().toLowerCase() === target;

  const taggedPosts = posts.filter((post) =>
    parseMaybeJsonArray(post.tags).some((t) => typeof t === "string" && isCurrent(t))
  );

  const related = buildTopicIndex(taggedPosts, categories).filter((t) => !isCurrent(t.name));
  if (related.length >= limit) return related.slice(0, limit);

  const taken = new Set(related.map((t) => t.name));
  const filler = buildTopicIndex(posts, categories).filter(
    (t) => !isCurrent(t.name) && !taken.has(t.name)
  );

  return [...related, ...filler].slice(0, limit);
}
