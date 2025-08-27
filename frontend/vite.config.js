import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Proxy backend routes to Express server during development
      '/api': 'http://localhost:3000',
      // Narrow admin proxy to API only to avoid hijacking SPA routes
      '/admin/api': 'http://localhost:3000',
      // Narrow student proxy to API only to avoid hijacking SPA routes
      '/student/api': 'http://localhost:3000',
      '/public': 'http://localhost:3000'
    }
  }
})
