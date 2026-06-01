import { writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { APP_VERSION } from './src/version'

const __dirname = dirname(fileURLToPath(import.meta.url))

/** Escribe la misma versión que el bundle para que el servidor la lea en server/public/app-version.json */
function writeAppVersionJsonPlugin(): Plugin {
  return {
    name: 'write-app-version-json',
    closeBundle() {
      const out = resolve(__dirname, 'dist/app-version.json')
      writeFileSync(out, `${JSON.stringify({ version: APP_VERSION })}\n`, 'utf8')
    },
  }
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), writeAppVersionJsonPlugin()],
  base: '/',
  server: {
    host: '0.0.0.0', // Permitir conexiones desde la red local
    port: 5173,
    strictPort: true, // Si 5173 está ocupado, fallar en vez de usar otro puerto
    proxy: {
      // En desarrollo, /api se reenvía al backend (evita CORS y usa el mismo origen)
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    // Permitimos chunks lazy grandes (ej: xlsx-js-style) sin advertencia de build.
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          charts: ['chart.js', 'react-chartjs-2'],
          pdf: ['jspdf', 'jspdf-autotable'],
        },
      },
    },
  },
})


