import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: { chunkSizeWarningLimit: 2500 },
  server: {
    host: 'localhost',
    port: 5173,
    strictPort: true,
    hmr: {
      overlay: false,
    },
  },
})
