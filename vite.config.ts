import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  preview: {
    port: Number(process.env.PORT) || 4173,
    host: '0.0.0.0',
    allowedHosts: ['yeezles-todo-webapp-production.up.railway.app'],
    strictPort: true
  },
  server: {
    port: 5173,
    host: '0.0.0.0'
  }
})
