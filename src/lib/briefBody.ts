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
