import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

const root = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  root,
  plugins: [react()],
  define: {
    'import.meta.env.VITE_DEV_LAN_ORIGIN': JSON.stringify('http://192.168.99.1:5173'),
    'import.meta.env.VITE_WAITME_BUILD_HASH': JSON.stringify('test'),
  },
  resolve: {
    alias: {
      '@': path.join(root, 'src'),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: [path.join(root, 'test/ui/vitest.setup.js')],
    include: ['test/ui/**/*.test.{jsx,tsx}'],
    testTimeout: 45_000,
    hookTimeout: 15_000,
  },
  coverage: {
    provider: 'v8',
    reportsDirectory: 'coverage-ui',
    reporter: ['text', 'lcov', 'html'],
    // Umbrales bajos pero reales: el gate CI se activa con `npm run test:ui -- --coverage`.
    thresholds: {
      statements: 5,
      branches: 3,
      functions: 5,
      lines: 5,
    },
  },
})
