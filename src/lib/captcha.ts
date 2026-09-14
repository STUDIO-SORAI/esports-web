import { createHmac, randomBytes } from "crypto";
import { promises as fs, existsSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const candidateDirs = [
  path.join(process.cwd(), "apps", "web", "public", "captcha"),
  path.join(process.cwd(), "public", "captcha"),
  path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "public", "captcha"),
  path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "captcha"),
];

function getCaptchaDir(): string {
  for (const dir of candidateDirs) {
    if (existsSync(dir)) return dir;
  }
  return path.join(process.cwd(), "apps", "web", "public", "captcha");
}

const SECRET =
  process.env.CAPTCHA_SECRET ||
  process.env.ALTCHA_HMAC_KEY ||
  (() => {
    if (process.env.NODE_ENV === "production") {
      console.warn(
        "[Security Warning] CAPTCHA_SECRET is not configured in environment variables. Falling back to default development secret. Please set CAPTCHA_SECRET for production security."
      );
    }
    return "sorai-esports-human-captcha-secret-salt-2026";
  })();

const PLAYER_NAMES: Record<string, string> = {
  boaster: "Boaster",
  chovy: "Chovy",
  faker: "Faker",
  niko: "NiKo",
  shaiiko: "Shaiiko",
  others: "其他",
};

const PLAYER_GAMES: Record<string, string> = {
  boaster: "特戰英豪",
  chovy: "英雄聯盟",
  faker: "英雄聯盟",
  niko: "CS2",
  shaiiko: "虹彩六號",
  others: "其他",
};

export interface CaptchaPuzzle {
  question: string;
  images: string[]; // 9 base64 data URLs
  token: string;
}

function sign(data: string): string {
  return createHmac("sha256", SECRET).update(data).digest("base64url");
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

async function getImagesFromCategory(category: string, count: number): Promise<string[]> {
  const baseDir = getCaptchaDir();
  const dir = path.join(baseDir, category);
  
  if (!existsSync(dir)) {
    console.error(`[Captcha] Directory not found: ${dir}`);
    return [];
  }

  const files = await fs.readdir(dir);
  const imageFiles = files.filter((f) => /\.(jpg|jpeg|png|webp|avif)$/i.test(f));
  const shuffled = shuffle(imageFiles);
  const picked = shuffled.slice(0, count);

  const results: string[] = [];
  for (const file of picked) {
    const buf = await fs.readFile(path.join(dir, file));
    const ext = path.extname(file).slice(1);
    const mime = ext === "jpg" || ext === "jpeg" ? "image/jpeg" : `image/${ext}`;
    results.push(`data:${mime};base64,${buf.toString("base64")}`);
  }
  return results;
}

export async function generatePuzzle(): Promise<CaptchaPuzzle> {
  const categories = Object.keys(PLAYER_NAMES).filter((c) => c !== "others");
  const targetCategory = categories[Math.floor(Math.random() * categories.length)];
  const targetName = PLAYER_NAMES[targetCategory];
  const targetGame = PLAYER_GAMES[targetCategory];

  const otherCategories = Object.keys(PLAYER_NAMES).filter((c) => c !== targetCategory);

  // Decide how many target images: 2 ~ 4
  const targetCount = Math.floor(Math.random() * 3) + 2; // 2, 3, or 4
  const otherCount = 9 - targetCount;

  const targetImages = await getImagesFromCategory(targetCategory, targetCount);

  // Fill others by randomly picking from other categories
  const otherImages: string[] = [];
  let attempts = 0;
  while (otherImages.length < otherCount && attempts < 50) {
    attempts++;
    const cat = otherCategories[Math.floor(Math.random() * otherCategories.length)];
    const imgs = await getImagesFromCategory(cat, 1);
    if (imgs.length > 0) otherImages.push(imgs[0]);
  }

  // Combine and shuffle, keep track of correct indices
  const combined = shuffle(
    targetImages.map((img) => ({ img, isTarget: true })).concat(
      otherImages.map((img) => ({ img, isTarget: false }))
    )
  );

  const correctIndices = combined
    .map((item, idx) => (item.isTarget ? idx : -1))
    .filter((i) => i !== -1);

  const images = combined.map((item) => item.img);

  const payload = JSON.stringify({
    a: correctIndices.sort((a, b) => a - b),
    e: Date.now() + 5 * 60 * 1000,
    r: randomBytes(8).toString("hex"),
  });
  const token = `${Buffer.from(payload).toString("base64url")}.${sign(payload)}`;

  const question = `請選出${targetGame}選手${targetName}的照片`;

  return { question, images, token };
}

export function verifyPuzzle(token: string, selectedIndices: number[]): boolean {
  try {
    const [payloadB64, signature] = token.split(".");
    if (!payloadB64 || !signature) return false;

    const payload = Buffer.from(payloadB64, "base64url").toString("utf8");
    if (sign(payload) !== signature) return false;

    const data = JSON.parse(payload);
    if (Date.now() > data.e) return false;

    const correct = (data.a as number[]).sort((a: number, b: number) => a - b);
    const selected = [...selectedIndices].sort((a, b) => a - b);

    if (correct.length !== selected.length) return false;
    return correct.every((val, idx) => val === selected[idx]);
  } catch {
    return false;
  }
}
