// 這些設定會被 SiteNavbar / MarkdownContent 這類 client island 一起打包到瀏覽器端，
// 而瀏覽器沒有 process —— 直接讀 process.env 會在 hydrate 當下丟 ReferenceError，
// 整個 island 就掛掉（dev 模式下尤其明顯，Vite 不會把模組搖掉）。一律走這個 guard。
const procEnv = typeof process !== "undefined" ? process.env : undefined;

const pick = (...values: Array<string | undefined>) => values.find((v) => v && v.trim().length > 0) || "";

export const PANDASCORE_TOKEN = pick(
  procEnv?.PANDASCORE_TOKEN,
  import.meta.env?.PANDASCORE_TOKEN,
  procEnv?.NEXT_PUBLIC_PANDASCORE_TOKEN,
  procEnv?.VITE_PANDASCORE_TOKEN
);

export const CMS_BASE_URL = pick(
  procEnv?.CMS_BASE_URL,
  procEnv?.NEXT_PUBLIC_CMS_BASE_URL,
  procEnv?.VITE_CMS_BASE_URL,
  "http://localhost:4321"
).replace(/\/+$/, "");

export const CMS_TOKEN = pick(
  procEnv?.CMS_BEARER_TOKEN,
  procEnv?.NEXT_PUBLIC_CMS_BEARER_TOKEN,
  procEnv?.VITE_CMS_BEARER_TOKEN
);

export const NEWS_TITLE = pick(
  procEnv?.NEWS_TITLE,
  procEnv?.NEXT_PUBLIC_NEWS_TITLE,
  procEnv?.VITE_NEWS_TITLE,
  "SORAI Esports"
);

// 沒設定時刻意留空，讓呼叫端 fallback 回當次請求的 origin，
// 避免正式站產出 http://localhost:4321 的分享連結。
export const SITE_URL = pick(
  procEnv?.WEB_URL,
  procEnv?.NEXT_PUBLIC_WEB_URL,
  procEnv?.SITE_URL,
  procEnv?.NEXT_PUBLIC_SITE_URL,
  procEnv?.VITE_SITE_URL
).replace(/\/+$/, "");

export const GOOGLE_SOURCE_URL = pick(
  procEnv?.GOOGLE_SOURCE_URL,
  procEnv?.NEXT_PUBLIC_GOOGLE_SOURCE_URL,
  procEnv?.VITE_GOOGLE_SOURCE_URL,
  SITE_URL
    ? (() => {
        try {
          return `https://www.google.com/preferences/source?q=${encodeURIComponent(new URL(SITE_URL).hostname)}`;
        } catch {
          return "https://www.google.com/preferences/source?q=esports.sorai.tw";
        }
      })()
    : "https://www.google.com/preferences/source?q=esports.sorai.tw"
);

export const DEFAULT_OG_IMAGE = pick(
  procEnv?.DEFAULT_OG_IMAGE,
  procEnv?.NEXT_PUBLIC_DEFAULT_OG_IMAGE,
  procEnv?.VITE_DEFAULT_OG_IMAGE,
  `${SITE_URL || "http://localhost:4321"}/og-image.png`
);

export interface NavCategory {
  name: string;
  slug: string;
}

/**
 * CMS 連不上時的備援導覽列。正常情況下分類、網址代稱與排序都來自
 * CMS 的 categories collection（見 lib/api.ts 的 fetchNavCategories）。
 */
export const CATEGORY_FALLBACK: NavCategory[] = [
  { name: "特戰英豪", slug: "valorant" },
  { name: "英雄聯盟", slug: "lol" },
  { name: "虹彩六號", slug: "r6" },
  { name: "CS2", slug: "cs2" },
  { name: "其他遊戲", slug: "others" },
  { name: "專欄報導", slug: "opinion" },
];

export const NAV_CATEGORIES = CATEGORY_FALLBACK.map((c) => c.name);

export const NAV_FALLBACK = [...CATEGORY_FALLBACK];

export const CONTACT_EMAIL = pick(
  procEnv?.CONTACT_EMAIL,
  import.meta.env?.CONTACT_EMAIL,
  procEnv?.PUBLIC_CONTACT_EMAIL
);

export function categoryPath(slug: string): string {
  return `/category/${encodeURIComponent(slug)}`;
}

/** 依分類名稱找出對應的 slug；找不到就回傳 null（代表它是話題標籤而非主分類）。 */
export function categorySlugOf(
  name: string,
  categories: NavCategory[] = CATEGORY_FALLBACK
): string | null {
  const target = name.trim().toLowerCase();
  const hit = categories.find((c) => c.name.trim().toLowerCase() === target);
  return hit ? hit.slug : null;
}

export function isMainCategory(
  name: string,
  categories: NavCategory[] = CATEGORY_FALLBACK
): boolean {
  return categorySlugOf(name, categories) !== null;
}

/** 主分類走 /category/<slug>，其餘一律當話題標籤走 /tag/<名稱>。 */
export function topicPath(
  name: string,
  categories: NavCategory[] = CATEGORY_FALLBACK
): string {
  const slug = categorySlugOf(name, categories);
  return slug ? categoryPath(slug) : `/tag/${encodeURIComponent(name)}`;
}

