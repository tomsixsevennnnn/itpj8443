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
    coverage: {
      provider: 'v8',
      // เปิดด้วย --coverage ตอนรันจริง (pnpm test:cov) เท่านั้น — รัน pnpm test ปกติไม่ต้องคำนวณ coverage ทุกครั้ง
      reporter: ['lcov', 'text-summary'],
      reportsDirectory: 'coverage',
      exclude: ['**/*.test.ts', '**/*.stories.tsx', '.figma/**'],
    },
  },
})
