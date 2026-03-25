import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: { chunkSizeWarningLimit: 2500 },
  server: {
    host: 'localhost',
    port: 5173,
    strictPort: true,
    headers: {
      // Evita que Safari/Chrome sirvan módulos HMR en caché y parezca que “no cambia nada”
      'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
    },
    hmr: {
      overlay: false,
    },
  },
})
