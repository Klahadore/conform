import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:6969',
        changeOrigin: true,
        secure: false,
      },
      '/uploads': {
        target: 'http://localhost:6969',
        changeOrigin: true,
        secure: false,
      },
      '/html_outputs': {
        target: 'http://localhost:6969',
        changeOrigin: true,
        secure: false,
      }
    }
  }
})
