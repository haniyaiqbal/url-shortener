import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  server: {
    // In development, send API calls to the NestJS app.
    proxy: { '/api': 'http://localhost:3000' },
  },
})
