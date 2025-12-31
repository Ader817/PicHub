import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  server: {
    proxy: {
      '/api': process.env.VITE_PROXY_TARGET || 'http://localhost:8080',
      '/uploads': process.env.VITE_PROXY_TARGET || 'http://localhost:8080',
    },
  },
})
