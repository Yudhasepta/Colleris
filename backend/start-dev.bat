@echo off
rem Colleris dev backend: two PHP built-in servers (Windows PHP CLI is single-worker,
rem so the long-lived /api/sse stream must run in its own process, otherwise it
rem queues every other API request behind it).
rem   :8000  all API requests  (Vite /api proxy target)
rem   :8001  the /api/sse stream only (Vite /api/sse proxy target)
start "Colleris API :8000" cmd /k "cd /d %~dp0 && php artisan serve --host=127.0.0.1 --port=8000"
start "Colleris SSE :8001" cmd /k "cd /d %~dp0 && php artisan serve --host=127.0.0.1 --port=8001"
echo.
echo Both dev servers are starting. When both say "Server running", start the frontend:
echo   cd frontend ^&^& pnpm install ^&^& pnpm dev
echo   then open http://localhost:5173
