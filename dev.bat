@echo off
echo Starting Money Keeper Development Servers...
echo.

echo Starting Flask backend on http://localhost:8000...
start "Flask Backend" python run.py

timeout /t 3 /nobreak > nul

echo Starting Vite frontend on http://localhost:3000...
cd frontend
start "Vite Frontend" npm run dev
cd ..

echo.
echo ==========================================
echo Development servers are running!
echo Frontend: http://localhost:3000
echo Backend:  http://localhost:8000
echo ==========================================
echo.
echo Close the terminal windows to stop the servers
echo.

pause
