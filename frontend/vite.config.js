import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,     // expõe para a rede (necessário no Docker)
    proxy: {
      // Redireciona chamadas /api para o backend Laravel
      '/api': {
        target: 'http://nginx:80',
        changeOrigin: true,
      },
    },
  },
})
