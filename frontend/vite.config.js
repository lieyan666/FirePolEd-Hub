import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Proxy backend routes to Express server during development
      '/api': 'http://localhost:3000',
      '/admin': 'http://localhost:3000',
      '/student': 'http://localhost:3000',
      '/public': 'http://localhost:3000'
    }
  }
})
