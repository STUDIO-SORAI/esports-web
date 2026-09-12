import { heroui } from '@heroui/theme'

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}',
    '../../node_modules/@heroui/theme/dist/**/*.{js,ts,jsx,tsx}',
    './node_modules/@heroui/theme/dist/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-sans)', 'Noto Sans TC', 'sans-serif'],
        serif: ['var(--font-serif)', 'Noto Serif TC', 'serif'],
        en: ['var(--font-en)', 'Clash Display', 'system-ui', 'sans-serif'],
      },
    },
  },
  darkMode: 'class',
  plugins: [heroui()],
}
