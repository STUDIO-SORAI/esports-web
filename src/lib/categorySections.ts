/**
 * 首頁的分類區塊要嚴格照「主要分類」分，不看話題標籤。
 * 之前多接一條「標籤裡有這個分類名就算」，會讓主分類在「其他遊戲」的文章
 * （例如標了 #英雄聯盟 的 2XKO 那篇）同時被塞進英雄聯盟區塊。
 */
export interface CategorizablePost {
  category?: string
  categorySlug?: string
}

export interface CategoryRef {
  name: string
  slug: string
}

const norm = (value?: string): string => (value || '').trim().toLowerCase()

/** 文章的主要分類是不是這一個分類；有 slug 就以 slug 為準，沒有才回頭比名稱 */
export function matchesCategory(post: CategorizablePost, category: CategoryRef): boolean {
  if (post.categorySlug) return norm(post.categorySlug) === norm(category.slug)
  return Boolean(norm(post.category)) && norm(post.category) === norm(category.name)
}

/** 取某個分類底下的前幾篇（傳進來的順序即輸出順序） */
export function postsInCategory<T extends CategorizablePost>(
  posts: T[],
  category: CategoryRef,
  limit = 4,
): T[] {
  return posts.filter((post) => matchesCategory(post, category)).slice(0, limit)
}
