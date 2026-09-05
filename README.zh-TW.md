<div align="center">
  <a href="https://esports.sorai.tw" target="_blank" rel="noopener noreferrer">
    <img src="https://files.catbox.moe/5anfzv.png" alt="SORAI ESPORTS" width="340" />
  </a>

  <p>
    <b>現代化、高效能的電競新聞媒體與賽事追蹤前端專案。</b>
  </p>

  <p>
    <a href="https://esports.sorai.tw"><img src="https://img.shields.io/badge/線上預覽-esports.sorai.tw-E11D48?style=for-the-badge&logo=googlechrome&logoColor=white" alt="線上預覽" /></a>
    <a href="https://astro.build/"><img src="https://img.shields.io/badge/Astro_5-FF5D01?style=for-the-badge&logo=astro&logoColor=white" alt="Astro 5" /></a>
    <a href="https://react.dev/"><img src="https://img.shields.io/badge/React_19-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React 19" /></a>
    <a href="https://tailwindcss.com/"><img src="https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" alt="Tailwind CSS" /></a>
    <a href="LICENSE"><img src="https://img.shields.io/badge/授權條款-MPL_2.0-059669?style=for-the-badge" alt="授權條款: MPL 2.0" /></a>
  </p>

  <p>
    <a href="README.md">English</a> | <b>繁體中文</b>
  </p>
</div>

以 **Astro 5 (SSR)**、**React 19**、**HeroUI** 與 **Tailwind CSS** 建構，專為極速首屏載入、強固 SEO 優化與沈浸式數位閱讀體驗而打造。

### 核心特性

- **Astro 5 混合 SSR 架構**：極速首屏渲染，搭配按需局部客戶端水合（React Islands）。
- **富文本 Lexical 原生序列化**：專為 Payload CMS 3 Lexical JSON 格式打造，支援語法高亮代碼、螢光筆標記（`~~標記~~`）、表格與社群媒體嵌入（X / Twitter、YouTube、Twitch、Threads）。
- **即時電競比分與賽程追蹤**：整合 PandaScore API，支援 VALORANT、LoL、CS2、R6 等進行中（LIVE）比分與近期賽程，具備 SSR 級別記憶體快取。
- **電競選手人臉人機驗證**：原創 9 宮格電競選手辨識挑戰（Faker、Chovy、Boaster、NiKo、Shaiiko），兼顧防禦垃圾投稿與社群趣味。
- **零閃爍（Zero-Flash）深淺色主題**：原生 class 切換，支援 localStorage 狀態持久化與作業系統偏好同步。
- **多層資安加固**：內建 SSRF 防護、HMAC SHA-256 簽章防竄改、Twitch iframe parent 來源白名單限制。

### 技術棧

| 層級 | 技術選型 |
| :--- | :--- |
| **核心框架** | [Astro 5](https://astro.build/) (`@astrojs/node` standalone SSR) |
| **UI 元件** | [React 19](https://react.dev/) & [HeroUI](https://heroui.com/) |
| **樣式引擎** | [Tailwind CSS 3](https://tailwindcss.com/) |
| **單元測試** | [Vitest 4](https://vitest.dev/) |
| **轉場動效** | 原生 CSS Keyframes 動畫、`@starting-style`、[Framer Motion](https://www.framer.com/motion/) |

---

## 快速開始

環境需求：**Node.js 20+** 與 **pnpm 9+**。

```bash
# 1. 複製專案與安裝依賴
git clone https://github.com/STUDIO-SORAI/esports-web.git
cd esports-web
pnpm install

# 2. 環境變數設定
cp .env.example .env

# 3. 啟動本地開發伺服器 (http://localhost:4321)
pnpm dev
```

**常用指令：**

```bash
pnpm test     # 執行 Vitest 單元測試
pnpm build    # 編譯 SSR 生產版本至 dist/
node dist/server/entry.mjs   # 啟動正式伺服器
```

**環境變數說明：**

| 變數名稱 | 說明 | 預設值 |
| :--- | :--- | :--- |
| `WEB_URL` | 前端公開網址 (結尾不帶斜線) | `http://localhost:4321` |
| `PAYLOAD_API_URL` | 後端 Payload CMS 3 API 伺服器網址 | `http://localhost:3000` |
| `PANDASCORE_TOKEN` | PandaScore 賽事比分 API Token (選填) | _無_ |
| `CAPTCHA_SECRET` | 投稿人機驗證 HMAC 簽章密鑰 | _開發備援值_ |
| `CONTACT_EMAIL` | 公開編輯室聯絡信箱 (選填) | _無_ |
| `NEWS_TITLE` | 站台名稱 | `SORAI Esports` |

---

## Payload CMS 3 後端配置指南

本專案透過 REST/GraphQL 與 [Payload CMS 3](https://payloadcms.com/) 串接。後端 `payload.config.ts` 設定方式如下：

### 1. CORS 與 CSRF 白名單設定

在 Payload 中加入 Astro 前端 Origin：

```typescript
// payload.config.ts
const webUrl = process.env.WEB_URL || 'http://localhost:4321';

export default buildConfig({
  cors: [webUrl].filter(Boolean),
  csrf: [webUrl].filter(Boolean),
});
```

### 2. 富文本編輯器（Lexical）配置

啟用前端序列化器所需的編輯器功能：

```typescript
import {
  lexicalEditor,
  HeadingFeature,
  FixedToolbarFeature,
  InlineToolbarFeature,
  BlockquoteFeature,
  HorizontalRuleFeature,
  OrderedListFeature,
  UnorderedListFeature,
  InlineCodeFeature,
  LinkFeature,
  UploadFeature,
} from '@payloadcms/richtext-lexical';

export default buildConfig({
  editor: lexicalEditor({
    features: ({ defaultFeatures }) => [
      ...defaultFeatures,
      HeadingFeature({ enabledHeadingSizes: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'] }),
      FixedToolbarFeature(),
      InlineToolbarFeature(),
      BlockquoteFeature(),
      HorizontalRuleFeature(),
      OrderedListFeature(),
      UnorderedListFeature(),
      InlineCodeFeature(),
      LinkFeature({ enabledCollections: ['posts'] }),
      UploadFeature({
        collections: {
          media: {
            fields: [{ name: 'caption', type: 'text', label: '圖片題注/說明' }],
          },
        },
      }),
    ],
  }),
});
```

### 3. 前端依賴的 Collections 規格

| Collection 名稱 | Slug | 關鍵欄位 |
| :--- | :--- | :--- |
| **文章** | `posts` | `title`, `slug` (唯一值), `excerpt`, `content` (lexical), `heroImage` (`media`), `category` (`categories`), `tags` (`tags`[]), `authors` (`users`[]), `publishedAt`, `status` ('draft' \| 'published') |
| **快訊簡報** | `briefs` | `title`, `slug`, `content` (lexical), `heroImage` (圖片), `authorNames` (字串陣列), `category` (`categories`), `publishedAt` |
| **主賽事分類** | `categories` | `name` (如：'特戰英豪', '英雄聯盟'), `slug` (如：'valorant', 'lol'), `description` |
| **話題標籤** | `tags` | `name`, `slug` |
| **圖片媒體庫** | `media` | Upload Collection，包含 Sharp 縮圖、`alt`、`caption` |
| **讀者投稿** | `submissions`| `title`, `name`, `email`, `category`, `content`, `status` |

### 4. 即時預覽（Live Preview）設定 (選填)

```typescript
// collections/Posts.ts
export const Posts: CollectionConfig = {
  slug: 'posts',
  admin: {
    livePreview: {
      url: ({ data }) => `${process.env.WEB_URL || 'http://localhost:4321'}/posts/${data.slug}`,
    },
  },
};
```

---

## 專案目錄結構

```
├── public/              # 靜態資源、品牌圖示與選手人機驗證圖庫
├── src/
│   ├── app/             # 全域 CSS 樣式、字型與排版定義
│   ├── components/      # React Islands 客戶端元件與 Astro UI 模組
│   ├── layouts/         # 頁面基底佈局與 SEO Meta 標籤封裝
│   ├── lib/             # Lexical 序列化器、PandaScore 用戶端、工具函式
│   └── pages/           # Astro 頁面路由與 SSR API 端點
│       └── api/         # 驗證碼、連結預覽、統計分析等 API
├── astro.config.mjs     # Astro 與 Vite 設定檔
├── tailwind.config.mjs  # Tailwind CSS 設計體系與色彩定義
└── vitest.config.ts     # Vitest 測試環境設定檔
```

## 參與貢獻

參與貢獻請參閱 [CONTRIBUTING.md](CONTRIBUTING.md) 了解 PR 流程與 Conventional Commits 規範。

## 授權條款

本專案之程式碼採用 [Mozilla Public License 2.0 (MPL-2.0)](LICENSE) 授權。

> **品牌與專屬內容聲明：** 本專案內任何與「SORAI」相關之品牌名稱、商標、標誌、網站識別設計，以及所有編輯部撰寫發布之新聞文章、照片與專屬媒體素材，均屬於 SORAI ESPORTS 所有，**不在**開源授權範圍內。
