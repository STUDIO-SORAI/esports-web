import { defineConfig } from 'astro/config'
import node from '@astrojs/node'
import react from '@astrojs/react'
import tailwind from '@astrojs/tailwind'

const site = (process.env.WEB_URL || process.env.SITE_URL || '').replace(/\/+$/, '')

export default defineConfig({
  site: site || undefined,
  output: 'server',
  integrations: [react(), tailwind()],
  adapter: node({
    mode: 'standalone',
  }),
  vite: {
    ssr: {
      noExternal: ['react-tweet', '@heroui/react', '@heroui/theme'],
    },
  },
})
