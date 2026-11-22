#!/bin/sh
# Colleris dev backend: two PHP built-in servers.
# The Windows PHP CLI dev server is single-worker, so the long-lived /api/sse
# stream must run in its own process, otherwise it queues every other API
# request behind it.
#   :8000  all API requests  (Vite /api proxy target)
#   :8001  the /api/sse stream only (Vite /api/sse proxy target)
cd "$(dirname "$0")"
php artisan serve --host=127.0.0.1 --port=8000 &
php artisan serve --host=127.0.0.1 --port=8001 &
echo "Both dev servers starting. When both say \"Server running\", start the frontend:"
echo "  cd frontend && pnpm install && pnpm dev"
echo "  then open http://localhost:5173"
wait
