import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base: './' keeps the built bundle openable straight from the filesystem,
// so the dist/ folder works without a server.
export default defineConfig({
  plugins: [react()],
  base: './',
  build: { outDir: 'dist', assetsInlineLimit: 0 },
})
