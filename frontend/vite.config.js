import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'


export default defineConfig({
  server: {
    port: 5173,
    // Proxy API calls to two `php artisan serve` instances (the Windows PHP
    // dev server is single-worker — no CLI workers on this platform):
    //   :8000  all API requests
    //   :8001  the long-lived /api/sse stream only
    // Without the split, the open SSE stream holds the one worker and every
    // other API request queues behind it. `SseBroadcaster` is file-backed
    // (storage/app/sse), so events broadcast in :8000 are visible to the
    // stream in :8001.
    //
    // Start both before `pnpm dev`:
    //   php artisan serve --host=127.0.0.1 --port=8000
    //   php artisan serve --host=127.0.0.1 --port=8001
    // The more specific '/api/sse' key must stay first (prefix match order).
    proxy: {
      '/api/sse': {
        target: 'http://127.0.0.1:8001',
        changeOrigin: true,
      },
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
})
