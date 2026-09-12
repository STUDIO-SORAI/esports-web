/**
 * 戰報快訊的短文是純文字欄位（textarea），沒有富文本節點。
 * 這裡把它切成「文字段落」與「要嵌入的網址」兩種區塊，
 * 讓前台可以沿用文章內文那套嵌入渲染（YouTube / Twitch / X / Threads / 連結預覽），
 * 同時保留原本純文字換行照樣顯示的行為。
 */

export type BriefBlock =
  | { type: "text"; value: string }
  | { type: "embed"; url: string };

const BARE_URL_LINE = /^https?:\/\/\S+$/;
const IFRAME_SRC = /^<iframe\s[^>]*src=["']([^"']+)["']/i;
const ESCAPED_IFRAME_SRC = /^&lt;iframe\s[^&]*src=&quot;([^&]+)&quot;/i;

/** 單獨成行的網址或 iframe 才算嵌入；夾在句子裡的網址維持純文字。 */
function embedUrlOf(line: string): string | null {
  if (BARE_URL_LINE.test(line)) return line;
  const iframe = line.match(IFRAME_SRC) || line.match(ESCAPED_IFRAME_SRC);
  if (iframe) return iframe[1];
  return null;
}

export function splitBriefBody(body: string | null | undefined): BriefBlock[] {
  const raw = typeof body === "string" ? body : "";
  if (!raw.trim()) return [];

  const blocks: BriefBlock[] = [];
  let buffer: string[] = [];

  const flush = () => {
    const text = buffer.join("\n").trim();
    if (text) blocks.push({ type: "text", value: text });
    buffer = [];
  };

  for (const rawLine of raw.replace(/\r\n?/g, "\n").split("\n")) {
    const line = rawLine.trim();
    const url = line ? embedUrlOf(line) : null;
    if (url) {
      flush();
      blocks.push({ type: "embed", url });
      continue;
    }
    buffer.push(rawLine);
  }
  flush();

  return blocks;
}

/**
 * 拿掉會被渲染成嵌入的那幾行，只留可讀的文字。
 * 給 meta description、RSS 摘要與列表卡片預覽用 —— 那些地方塞 iframe 原始碼只會變亂碼。
 */
export function briefBodyToText(body: string | null | undefined): string {
  return splitBriefBody(body)
    .filter((block): block is { type: "text"; value: string } => block.type === "text")
    .map((block) => block.value)
    .join("\n\n");
}

const DIRECT_IMAGE = /\.(jpe?g|png|gif|webp|avif)(?:[?#]|$)/i;
const DIRECT_VIDEO = /\.(mp4|webm|ogv|mov|m4v)(?:[?#]|$)/i;

/**
 * 列表卡片要放的縮圖。
 *
 * 沒上傳圖卡、只在短文裡貼一行網址的戰報（現在允許這樣發），在卡片上會是一張
 * 只有標題的空卡 —— 卡片沒有嵌入渲染，看不到那個連結是什麼。所以退而求其次：
 * 網址本身就是圖片或影片檔就直接用它，YouTube 則用官方縮圖。
 * 其餘（X / Twitch / 一般連結）沒有免費拿得到的縮圖，維持沒有圖。
 */
export function briefCardMedia(brief: {
  image?: string;
  imageMime?: string;
  body?: string | null;
}): { src: string; mime: string } | null {
  if (brief.image) return { src: brief.image, mime: brief.imageMime || "" };

  for (const block of splitBriefBody(brief.body)) {
    if (block.type !== "embed") continue;
    if (DIRECT_VIDEO.test(block.url)) return { src: block.url, mime: "video/mp4" };
    if (DIRECT_IMAGE.test(block.url)) return { src: block.url, mime: "image/*" };
    const youtube = block.url.match(
      /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([\w-]{11})/,
    );
    if (youtube) {
      return { src: `https://i.ytimg.com/vi/${youtube[1]}/hqdefault.jpg`, mime: "image/jpeg" };
    }
  }
  return null;
}
