import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
        configure(proxy) {
          proxy.on('error', (error, _request, response) => {
            if (response.headersSent) return;
            response.writeHead(200, {
              'Content-Type': 'application/json',
              'X-QuizMaster-Offline': 'true',
            });
            response.end(JSON.stringify({ offline: true }));
            console.warn(`QuizMaster API is unavailable; the frontend will use its offline fallback (${error.code || 'connection error'}).`);
          });
        },
      },
    },
  },
})
