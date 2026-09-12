import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  resolve: {
    alias: {
      // 與 tsconfig.json 的 paths 一致
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    // 目前只測純邏輯，不需要 DOM
    environment: 'node',
    include: ['src/**/*.test.ts'],
    // payload.ts 在模組載入當下就把 PUBLIC_CMS_URL 讀成常數，
    // 固定成空字串，assetUrl 的輸出才不會隨開發者本機的 .env 飄動。
    env: {
      PUBLIC_CMS_URL: '',
    },
  },
})
