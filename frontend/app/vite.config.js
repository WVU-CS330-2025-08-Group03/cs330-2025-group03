import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    open: true,
    proxy: {
      '/auth': {
        target: 'http://localhost:5177',
        changeOrigin: true,
        secure: false,
      },
      '/api': {
        target: 'http://localhost:5177',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
