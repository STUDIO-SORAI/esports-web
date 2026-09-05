<div align="center">
  <a href="https://esports.sorai.tw" target="_blank" rel="noopener noreferrer">
    <img src="https://files.catbox.moe/5anfzv.png" alt="SORAI ESPORTS" width="340" />
  </a>

  <p>
    <b>Modern, high-performance esports media & tournament tracking frontend.</b>
  </p>

  <p>
    <a href="https://esports.sorai.tw"><img src="https://img.shields.io/badge/LIVE_DEMO-esports.sorai.tw-E11D48?style=for-the-badge&logo=googlechrome&logoColor=white" alt="Live Demo" /></a>
    <a href="https://astro.build/"><img src="https://img.shields.io/badge/Astro_5-FF5D01?style=for-the-badge&logo=astro&logoColor=white" alt="Astro 5" /></a>
    <a href="https://react.dev/"><img src="https://img.shields.io/badge/React_19-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React 19" /></a>
    <a href="https://tailwindcss.com/"><img src="https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" alt="Tailwind CSS" /></a>
    <a href="LICENSE"><img src="https://img.shields.io/badge/License-MPL_2.0-059669?style=for-the-badge" alt="License: MPL 2.0" /></a>
  </p>

  <p>
    <b>English</b> | <a href="README.zh-TW.md">繁體中文</a>
  </p>
</div>

Built with **Astro 5 (SSR)**, **React 19**, **HeroUI**, and **Tailwind CSS**. Engineered for lightning-fast delivery, robust SEO, and immersive digital reading experiences.

### Key Highlights

- **Astro 5 Hybrid SSR Architecture**: Ultra-fast server-side rendering paired with selective React Islands client hydration.
- **RichText & Lexical Serialization**: Native serializer for Payload CMS 3 Lexical JSON documents, supporting syntax-highlighted code blocks, custom highlight markers, tables, and social embeds (X / Twitter, YouTube, Twitch, Threads).
- **Live Match Tracking & Schedules**: Real-time tournament brackets and match scores powered by PandaScore API integration with SSR memory caching.
- **Esports Face-Recognition Captcha**: Interactive 9-grid player recognition challenge for bot-resistant community submissions.
- **Zero-Flash Dark / Light Theme**: Native class-based color switching with local storage persistence and system preference synchronization.
- **Hardened Security**: Built-in SSRF protection on server endpoints, HMAC SHA-256 challenge token verification, and dynamic Twitch iframe parent whitelisting.

### Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Framework** | [Astro 5](https://astro.build/) (`@astrojs/node` standalone) |
| **UI Components** | [React 19](https://react.dev/) & [HeroUI](https://heroui.com/) |
| **Styling** | [Tailwind CSS 3](https://tailwindcss.com/) |
| **Unit Testing** | [Vitest 4](https://vitest.dev/) |
| **Animations** | Native CSS Animations, `@starting-style`, [Framer Motion](https://www.framer.com/motion/) |

---

## Quick Start

Requires **Node.js 20+** and **pnpm 9+**.

```bash
# 1. Clone and install dependencies
git clone https://github.com/STUDIO-SORAI/esports-web.git
cd esports-web
pnpm install

# 2. Configure environment
cp .env.example .env

# 3. Start local development server (http://localhost:4321)
pnpm dev
```

**Common commands:**

```bash
pnpm test     # Run Vitest test suite
pnpm build    # Compile SSR production build to dist/
node dist/server/entry.mjs   # Run production server
```

**Environment variables reference:**

| Variable | Description | Default |
| :--- | :--- | :--- |
| `WEB_URL` | Frontend public origin (without trailing slash) | `http://localhost:4321` |
| `PAYLOAD_API_URL` | Backend Payload CMS 3 API endpoint | `http://localhost:3000` |
| `PANDASCORE_TOKEN` | PandaScore API token for live matches (optional) | _None_ |
| `CAPTCHA_SECRET` | Secret salt for Captcha HMAC verification | _Dev fallback_ |
| `CONTACT_EMAIL` | Public editorial contact email (optional) | _None_ |
| `NEWS_TITLE` | Site branding title | `SORAI Esports` |

---

## Payload CMS 3 Backend Integration

This frontend connects to [Payload CMS 3](https://payloadcms.com/) over REST/GraphQL. Configure your `payload.config.ts` accordingly:

### 1. CORS & CSRF Whitelist

Allow your Astro frontend origin in Payload:

```typescript
// payload.config.ts
const webUrl = process.env.WEB_URL || 'http://localhost:4321';

export default buildConfig({
  cors: [webUrl].filter(Boolean),
  csrf: [webUrl].filter(Boolean),
});
```

### 2. Lexical Editor Setup

Enable the required features for full RichText serialization:

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
            fields: [{ name: 'caption', type: 'text', label: 'Caption' }],
          },
        },
      }),
    ],
  }),
});
```

### 3. Collection Schema Expectations

| Collection | Slug | Key Fields |
| :--- | :--- | :--- |
| **Articles** | `posts` | `title`, `slug` (unique), `excerpt`, `content` (lexical), `heroImage` (`media`), `category` (`categories`), `tags` (`tags`[]), `authors` (`users`[]), `publishedAt`, `status` ('draft' \| 'published') |
| **Quick Briefs** | `briefs` | `title`, `slug`, `content` (lexical), `heroImage` (upload), `authorNames` (text[]), `category` (`categories`), `publishedAt` |
| **Categories** | `categories` | `name` (e.g. '特戰英豪', '英雄聯盟'), `slug` (e.g. 'valorant', 'lol'), `description` |
| **Topics/Tags** | `tags` | `name`, `slug` |
| **Media Library** | `media` | Upload collection with Sharp resizing, `alt`, `caption` |
| **Submissions** | `submissions` | `title`, `name`, `email`, `category`, `content`, `status` |

### 4. Live Preview Setup (Optional)

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

## Project Structure

```
├── public/              # Static assets, brand icons, and captcha image sets
├── src/
│   ├── app/             # Global styles, fonts, and CSS tokens
│   ├── components/      # React Islands & Astro UI components
│   ├── layouts/         # Base layout wrappers and SEO meta headers
│   ├── lib/             # Lexical serializer, PandaScore client, utilities
│   └── pages/           # Astro file-based routes and SSR API endpoints
│       └── api/         # Captcha verification, link preview, analytics
├── astro.config.mjs     # Astro & Vite configuration
├── tailwind.config.mjs  # Tailwind CSS theme extension
└── vitest.config.ts     # Vitest configuration
```

## Contributing

Please see [CONTRIBUTING.md](CONTRIBUTING.md) for contribution guidelines, code of conduct, and pull request procedures.

## License

The source code in this repository is licensed under the [Mozilla Public License 2.0 (MPL-2.0)](LICENSE).

> **Brand & Content Notice:** The "SORAI" name, logotypes, brand marks, site design identity, and all published editorial articles, photographs, and media assets belong exclusively to SORAI ESPORTS and are **NOT** covered by the open-source license.
