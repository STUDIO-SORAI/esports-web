/** @type {import('tailwindcss').Config} */
export default {
  // Tailwind 3 emits a bare `:hover`; on touch the state sticks after a tap until
  // something else is tapped. This gates every hover: utility behind a real pointer.
  future: { hoverOnlyWhenSupported: true },
  content: [
    './src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}',
  ],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        surface: {
          DEFAULT: 'var(--surface)',
          raised: 'var(--surface-raised)',
          muted: 'var(--surface-muted)',
        },
        secondary: 'var(--text-secondary)',
        muted: 'var(--text-muted)',
        border: {
          DEFAULT: 'var(--border)',
          subtle: 'var(--border-subtle)',
          strong: 'var(--border-strong)',
        },
        accent: {
          DEFAULT: 'var(--accent)',
          strong: 'var(--accent-strong)',
          subtle: 'var(--accent-subtle)',
          foreground: 'var(--accent-foreground)',
        },
        danger: {
          DEFAULT: 'var(--danger)',
        },
        success: {
          DEFAULT: 'var(--success)',
        },
        warning: {
          DEFAULT: 'var(--warning)',
        },
      },
      borderRadius: {
        control: 'var(--radius-control)',
        panel: 'var(--radius-panel)',
        surface: 'var(--radius-surface)',
        pill: 'var(--radius-pill)',
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'LINE Seed TW', 'sans-serif'],
        serif: ['var(--font-serif)', 'LINE Seed TW', 'sans-serif'],
        en: ['var(--font-en)', 'LINE Seed TW', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
