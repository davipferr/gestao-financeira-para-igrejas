/// <reference types="vitest/config" />
import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const backendUrl = process.env.BACKEND_URL ?? 'http://localhost:8000'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  server: {
    // Em desenvolvimento o Vite repassa /api para o Django. Assim frontend e
    // backend ficam na mesma origem e o cookie de sessão funciona sem CORS.
    // O changeOrigin precisa ficar desligado: se o Host fosse trocado para o do
    // Django, ele não bateria com o Origin do navegador e o CSRF bloquearia o login.
    proxy: Object.fromEntries(
      ['/api', '/admin', '/static'].map((prefix) => [prefix, { target: backendUrl, changeOrigin: false }]),
    ),
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    css: true,
  },
})
