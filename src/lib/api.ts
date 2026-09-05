// 這個模組會被 client island 一起打包到瀏覽器端，而瀏覽器沒有 process ——
// 直接讀 process.env 會在 hydrate 當下丟 ReferenceError，整個 island 就掛掉。
const procEnv = typeof process !== "undefined" ? process.env : undefined;

import { CMS_BASE_URL, CMS_TOKEN, CATEGORY_FALLBACK } from "./config";
import type { Post, Author, Category, Brief, PostsResponse, AuthorsResponse, PostResponse } from "./types";
import { lexicalToHtml } from "./richtext";

const API_URL =
  procEnv?.PAYLOAD_API_URL ?? import.meta.env.PAYLOAD_API_URL ?? 'http://localhost:3000';

const PUBLIC_CMS_URL = (
  procEnv?.PUBLIC_CMS_URL ??
  procEnv?.ADMIN_URL ??
  import.meta.env.PUBLIC_CMS_URL ??
  ''
).replace(/\/+$/, '');

function assetUrl(path?: string | null): string {
  if (!path) return '';
  let clean = path;
  if (clean.includes('localhost:3000') || clean.includes('cms:3000')) {
    clean = clean.replace(/^https?:\/\/(localhost:3000|cms:3000)/, '');
  }
  if (clean.startsWith('http')) return clean;
  const normalized = clean.startsWith('/') ? clean : `/${clean}`;
  return PUBLIC_CMS_URL ? `${PUBLIC_CMS_URL}${normalized}` : normalized;
}

function extractContent(raw: any): string {
  if (!raw) return '';
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && parsed.root) {
        return lexicalToHtml(parsed);
      }
    } catch {
      return raw;
    }
    return raw;
  }
  if (typeof raw === 'object' && raw.root) {
    return lexicalToHtml(raw);
  }
  return '';
}

export function cleanTitle(title?: string | null): string {
  if (!title) return '';
  return title.replace(/~~(.*?)~~/g, '$1').trim();
}

function mapPayloadDocToPost(doc: any): Post {
  const cover =
    doc.featuredImage?.sizes?.hero?.url ||
    doc.featuredImage?.url ||
    doc.featuredImage?.sizes?.card?.url;
  const categoryName = doc.category?.name || (typeof doc.category === 'string' ? doc.category : '');
  const categorySlugValue = doc.category?.slug || '';
  const tagList = (doc.tags || [])
    .map((t: any) => (typeof t === 'object' ? t.name : t))
    .filter(Boolean);

  const rawAuthors = Array.isArray(doc.authors)
    ? doc.authors
    : doc.authors
      ? [doc.authors]
      : doc.author
        ? [doc.author]
        : [];
  const authorList = rawAuthors
    .map((a: any) => (typeof a === 'object' && a?.id ? String(a.id) : String(a)))
    .filter(Boolean);
  const bodyContent = extractContent(doc.content);

  const updatedAtTimestamp = doc.updatedAt ? new Date(doc.updatedAt).getTime() : Date.now();
  const ogUrl = doc.slug
    ? PUBLIC_CMS_URL
      ? `${PUBLIC_CMS_URL}/api/og/${doc.slug}.png?v=${updatedAtTimestamp}`
      : `/api/og/${doc.slug}.png?v=${updatedAtTimestamp}`
    : '';

  const sanitizedTitle = cleanTitle(doc.title);

  return {
    id: String(doc.id),
    slug: doc.slug,
    title: sanitizedTitle,
    description: doc.excerpt || '',
    content: bodyContent,
    body: bodyContent,
    rawContent: bodyContent,
    coverImage: cover ? assetUrl(cover) : '',
    ogImage: ogUrl,
    category: categoryName,
    categorySlug: categorySlugValue,
    tags: tagList,
    authors: JSON.stringify(authorList),
    publishedAt: doc.publishedAt || doc.createdAt,
    updatedAt: doc.updatedAt,
    wordCount: sanitizedTitle ? sanitizedTitle.length * 10 : 100,
    status: doc._status || 'published',
  };
}

/**
 * 導覽列與分類頁的唯一真實來源：CMS 的 categories collection。
 * 名稱、網址代稱、排序、是否上導覽列都在後台調整，前台不再寫死。
 */
export async function fetchCategories(): Promise<Category[]> {
  try {
    const res = await fetch(`${API_URL}/api/categories?limit=100&sort=navOrder`);
    if (!res.ok) return [];
    const data = await res.json();
    const docs: any[] = data.docs || [];

    // CMS 還沒有 navOrder 欄位時（尚未部署 / 尚未 patch DB），API 回傳的順序是隨機的。
    // 這時退回 CATEGORY_FALLBACK 的順序，而不是讓導覽列看起來亂掉。
    const hasNavOrder = docs.some((doc) => typeof doc.navOrder === 'number');
    const fallbackIndex = (name: string) => {
      const i = CATEGORY_FALLBACK.findIndex(
        (c) => c.name.trim().toLowerCase() === name.trim().toLowerCase()
      );
      return i === -1 ? Number.MAX_SAFE_INTEGER : i;
    };

    return docs
      .map((doc: any) => ({
        name: String(doc.name || '').trim(),
        slug: String(doc.slug || '').trim().toLowerCase(),
        navOrder: typeof doc.navOrder === 'number' ? doc.navOrder : 0,
        // 舊資料沒有這個欄位時視為要顯示，避免升級當下導覽列整排消失。
        showInNav: doc.showInNav !== false,
      }))
      .filter((c: Category) => c.name && c.slug)
      .sort((a: Category, b: Category) =>
        hasNavOrder
          ? a.navOrder - b.navOrder || a.name.localeCompare(b.name)
          : fallbackIndex(a.name) - fallbackIndex(b.name) || a.name.localeCompare(b.name)
      );
  } catch (error) {
    console.error("[CMS] fetchCategories exception:", error);
    return [];
  }
}

/** 只取要出現在導覽列 / 首頁分類區塊的分類。 */
export async function fetchNavCategories(): Promise<Category[]> {
  return (await fetchCategories()).filter((c) => c.showInNav);
}

export async function fetchPosts(): Promise<Post[]> {
  try {
    const res = await fetch(`${API_URL}/api/posts?depth=2&limit=100&sort=-publishedAt`);
    if (!res.ok) {
      return [];
    }
    const data = await res.json();
    return (data.docs || []).map(mapPayloadDocToPost);
  } catch (error) {
    console.error("[CMS] fetchPosts exception:", error);
    return [];
  }
}

/** Paginate through every published post. Used by sitemap, not by page listings. */
export async function fetchAllPosts(): Promise<Post[]> {
  const all: Post[] = [];
  let page = 1;
  const maxPages = 50;

  try {
    while (page <= maxPages) {
      const res = await fetch(
        `${API_URL}/api/posts?depth=1&limit=100&page=${page}&sort=-publishedAt`
      );
      if (!res.ok) break;
      const data = await res.json();
      const docs = (data.docs || []).map(mapPayloadDocToPost);
      all.push(...docs);
      if (!data.hasNextPage || docs.length === 0) break;
      page += 1;
    }
  } catch (error) {
    console.error("[CMS] fetchAllPosts exception:", error);
  }

  return all;
}

export async function fetchPost(slug: string, isPreview = false): Promise<Post | null> {
  try {
    const url = `${API_URL}/api/posts?where[slug][equals]=${encodeURIComponent(slug)}&depth=2&limit=1${
      isPreview ? '&draft=true' : ''
    }`;
    const res = await fetch(url);
    if (!res.ok) {
      return null;
    }
    const data = await res.json();
    if (!data.docs || data.docs.length === 0) return null;
    return mapPayloadDocToPost(data.docs[0]);
  } catch (error) {
    console.error(`[CMS] fetchPost exception (${slug}):`, error);
    return null;
  }
}

export async function fetchAuthors(ids: string[]): Promise<Author[]> {
  if (!ids || ids.length === 0) return [];
  const normalizedIds = ids.map(String).filter(Boolean);
  if (normalizedIds.length === 0) return [];

  try {
    const res = await fetch(`${API_URL}/api/users?limit=100`);
    if (!res.ok) {
      return [];
    }
    const data = await res.json();
    const users = data.docs || [];
    const matchedUsers = users.filter((u: any) =>
      normalizedIds.includes(String(u.id))
    );

    return matchedUsers.map((u: any) => ({
      id: String(u.id),
      // email 只有登入後台時讀得到，前台這邊拿不到，別假設它存在
      name: u.name || u.email?.split('@')[0] || 'SORAI 編輯部',
      image: u.avatar?.url ? assetUrl(u.avatar.url) : '/_w.png',
      bio: u.bio || '',
      contactEmail: u.contactEmail || '',
      socials: {
        twitter: u.socials_twitter || u.socials?.twitter || '',
        threads: u.socials_threads || u.socials?.threads || '',
        instagram: u.socials_instagram || u.socials?.instagram || '',
        twitch: u.socials_twitch || u.socials?.twitch || '',
        youtube: u.socials_youtube || u.socials?.youtube || '',
        website: u.socials_website || u.socials?.website || '',
      },
    }));
  } catch (error) {
    console.error("[CMS] fetchAuthors exception:", error);
    return [];
  }
}

export function parseMaybeJsonArray(raw: unknown): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw as string[];
  try {
    const parsed = JSON.parse(raw as string);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function hasTourRosterTag(post: { tags?: string | string[] }): boolean {
  const tags = parseMaybeJsonArray(post.tags);
  return tags.some((t: string) => t.toLowerCase().includes("tour-roster"));
}

export function parseRosterFromPost(post: { title: string; content?: string; body?: string; rawContent?: string }): { scheduleId: string; teams: { name: string; logo: string | null; players: string[] }[] } | null {
  const content = post.rawContent || post.content || post.body || "";
  if (!content.trim()) return null;

  const sections = content.split(/^---\s*$/m).map(s => s.trim()).filter(Boolean);
  const teams: { name: string; logo: string | null; players: string[] }[] = [];

  for (const section of sections) {
    const lines = section.split("\n").map(l => l.trim()).filter(Boolean);
    let teamName = "";
    let logo: string | null = null;
    const players: string[] = [];

    const pushTeam = () => {
      if (teamName && players.length > 0) {
        teams.push({ name: teamName, logo, players: [...players] });
      }
    };

    for (const line of lines) {
      const headingMatch = line.match(/^#{2,3}\s+(.+)$/);
      if (headingMatch) {
        pushTeam();
        teamName = headingMatch[1].trim();
        logo = null;
        players.length = 0;
        continue;
      }

      const imgMatch = line.match(/^!\[.*?\]\((.+?)\)$/);
      if (imgMatch) {
        logo = imgMatch[1].trim();
        continue;
      }

      const playerMatch = line.match(/^[-*]\s+(.+)$/);
      if (playerMatch) {
        players.push(playerMatch[1].trim());
      }
    }

    pushTeam();
  }

  if (teams.length === 0) return null;
  return { scheduleId: post.title, teams };
}

export async function fetchTourRosters(): Promise<Record<string, { name: string; logo: string | null; players: string[] }[]>> {
  const posts = await fetchPosts();
  const rosterPosts = posts.filter(hasTourRosterTag);
  const result: Record<string, { name: string; logo: string | null; players: string[] }[]> = {};

  for (const post of rosterPosts) {
    let parsed = parseRosterFromPost(post);
    if (!parsed && post.slug) {
      const fullPost = await fetchPost(post.slug);
      if (fullPost) {
        parsed = parseRosterFromPost(fullPost);
      }
    }
    if (parsed) {
      result[parsed.scheduleId] = parsed.teams;
    }
  }

  return result;
}

export function categoryFromPost(post: Post): string {
  if (post.category) return post.category;
  const tags = parseMaybeJsonArray(post.tags);
  return tags[0] || "最新";
}

export function formatDate(value: string | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("zh-TW", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

export function formatDateTime(value: string | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("zh-TW", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

/** 社群 feed 用的相對時間。超過一週才退回日期。 */
export function formatFeedTime(value: string | undefined, now = Date.now()): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const diffMs = now - date.getTime();
  if (diffMs < 0) return formatDate(value);
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "剛剛";
  if (minutes < 60) return `${minutes}分鐘`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}小時`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}天`;
  return formatDate(value);
}

export interface UploadImage {
  url: string;
  width: number;
  height: number;
}

/**
 * 從 upload 欄位挑出要顯示的圖。
 *
 * thumbnail / card / hero 三個尺寸都是固定比例的置中裁切，直向或方形的圖丟進去
 * 會被切掉一大塊。所以優先拿只縮寬度、保留原比例的 full，其次是原圖；裁切過的
 * 派生檔只當最後手段（full 是後來才加的，早期上傳的媒體沒有這個尺寸）。
 *
 * 一併回傳寬高，讓版面能先留好位置，圖載入時不會把內容往下推。
 */
function pickUploadImage(upload: any): UploadImage | null {
  if (!upload || typeof upload !== "object") return null;
  const candidates = [
    upload.sizes?.full,
    upload,
    upload.sizes?.hero,
    upload.sizes?.card,
    upload.sizes?.thumbnail,
  ];
  for (const c of candidates) {
    if (c?.url) {
      return {
        url: assetUrl(c.url),
        width: Number(c.width) || 0,
        height: Number(c.height) || 0,
      };
    }
  }
  return null;
}

export function mapPayloadDocToBrief(doc: any): Brief {
  const rawAuthors = Array.isArray(doc.authors)
    ? doc.authors
    : doc.authors
      ? [doc.authors]
      : [];
  const authorIds = rawAuthors
    .map((a: any) => (typeof a === "object" && a?.id != null ? String(a.id) : String(a)))
    .filter((id: string) => id && id !== "undefined" && id !== "null");
  const authorNames: string[] = [];
  const authorImages: string[] = [];
  for (const a of rawAuthors) {
    if (typeof a !== "object" || !a) continue;
    const name = String(a.name || "").trim();
    if (!name) continue;
    authorNames.push(name);
    const avatar = a.avatar && typeof a.avatar === "object" ? a.avatar : null;
    const avatarPath = avatar?.sizes?.thumbnail?.url || avatar?.url;
    authorImages.push(avatarPath ? assetUrl(avatarPath) : "");
  }
  const tagList = (doc.tags || [])
    .map((t: any) => (typeof t === "object" ? t.name : t))
    .filter(Boolean);

  const briefImage = pickUploadImage(doc.image);

  return {
    id: String(doc.id),
    slug: doc.slug,
    title: cleanTitle(doc.title),
    body: typeof doc.body === "string" ? doc.body : "",
    image: briefImage?.url || "",
    imageWidth: briefImage?.width || 0,
    imageHeight: briefImage?.height || 0,
    category: doc.category?.name || (typeof doc.category === "string" ? doc.category : ""),
    categorySlug: doc.category?.slug || "",
    tags: tagList,
    authorIds,
    authorNames,
    authorImages,
    publishedAt: doc.publishedAt || doc.createdAt,
    updatedAt: doc.updatedAt,
    source: doc.source || "",
  };
}

export function filterBriefsByCategories(
  briefs: Brief[],
  slugs: string[],
  games: { name: string; slug: string }[] = []
): Brief[] {
  if (!slugs.length) return briefs;
  const set = new Set(slugs.map((s) => s.trim().toLowerCase()).filter(Boolean));
  for (const game of games) {
    if (set.has(game.slug.trim().toLowerCase()) && game.name) {
      set.add(game.name.trim().toLowerCase());
    }
  }
  if (set.size === 0) return briefs;
  return briefs.filter((brief) => {
    const slug = (brief.categorySlug || "").trim().toLowerCase();
    const name = (brief.category || "").trim().toLowerCase();
    return (slug && set.has(slug)) || (name && set.has(name));
  });
}

export function toggleFeedCategory(selected: string[], slug: string): string[] {
  const next = selected.filter((s) => s !== slug);
  if (next.length === selected.length) return [...selected, slug];
  return next;
}

export function feedFilterHref(selected: string[]): string {
  if (selected.length === 0) return "/feed";
  const params = new URLSearchParams();
  for (const slug of selected) params.append("c", slug);
  return `/feed?${params.toString()}`;
}

export async function fetchBriefs(limit = 12): Promise<Brief[]> {
  try {
    const res = await fetch(
      `${API_URL}/api/briefs?depth=2&limit=${limit}&sort=-publishedAt&where[_status][equals]=published`
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data.docs || []).map(mapPayloadDocToBrief);
  } catch (error) {
    console.error("[CMS] fetchBriefs exception:", error);
    return [];
  }
}

export async function fetchAllBriefs(): Promise<Brief[]> {
  const all: Brief[] = [];
  let page = 1;
  const maxPages = 50;

  try {
    while (page <= maxPages) {
      const res = await fetch(
        `${API_URL}/api/briefs?depth=1&limit=100&page=${page}&sort=-publishedAt&where[_status][equals]=published`
      );
      if (!res.ok) break;
      const data = await res.json();
      const docs = (data.docs || []).map(mapPayloadDocToBrief);
      all.push(...docs);
      if (!data.hasNextPage || docs.length === 0) break;
      page += 1;
    }
  } catch (error) {
    console.error("[CMS] fetchAllBriefs exception:", error);
  }

  return all;
}

export async function fetchBrief(slug: string): Promise<Brief | null> {
  try {
    const url = `${API_URL}/api/briefs?where[slug][equals]=${encodeURIComponent(slug)}&depth=2&limit=1`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.docs || data.docs.length === 0) return null;
    return mapPayloadDocToBrief(data.docs[0]);
  } catch (error) {
    console.error(`[CMS] fetchBrief exception (${slug}):`, error);
    return null;
  }
}

export function getReadTime(post: Post): string {
  const content = post.rawContent || post.body || post.content || "";
  if (content) {
    const cleanText = content.replace(/<\/?[^>]+(>|$)/g, "").replace(/[#*`_\[\]()]/g, "").trim();
    const time = Math.ceil(cleanText.length / 600);
    return `${Math.max(1, time)} 分鐘`;
  }
  const words = Number(post.wordCount || 0);
  if (!words) return "1 分鐘";
  return `${Math.max(1, Math.ceil(words / 50))} 分鐘`;
}

export function limitText(text: string, max = 72): string {
  const value = String(text || "").trim();
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1)}…`;
}
