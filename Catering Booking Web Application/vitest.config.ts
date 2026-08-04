import { defineConfig } from 'vitest/config'
import path from 'node:path'

// แยกจาก vite.config.ts (ไฟล์นั้นมี plugin เฉพาะของ Figma Make) เพื่อไม่ให้ config รบกวนกัน
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
