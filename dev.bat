@echo off
echo Starting Money Keeper Development Servers...
echo.

set "BACKEND_DIR=backend"
set "FRONTEND_DIR=frontend"
set "VENV_PY=%BACKEND_DIR%\venv\Scripts\python.exe"

echo Starting Flask backend on http://localhost:8000...
if exist "%VENV_PY%" (
  echo Detected virtual environment: %VENV_PY%
  start "Flask Backend" "%VENV_PY%" "%BACKEND_DIR%\run.py"
) else (
  echo No venv detected. Using system Python.
  start "Flask Backend" python "%BACKEND_DIR%\run.py"
)

timeout /t 3 /nobreak > nul

echo Starting Vite frontend on http://localhost:3000...
cd "%FRONTEND_DIR%"
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
