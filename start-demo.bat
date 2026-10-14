@echo off
title QuakeAlert Launcher
color 0A

echo ============================================
echo    QUAKEALERT - STARTING SYSTEM
echo ============================================
echo.

REM --- Check if we're in the right folder ---
if not exist "server\server.js" (
  color 0C
  echo [ERROR] server\server.js not found.
  echo Make sure this .bat file is in the quakealert root folder.
  echo.
  pause
  exit /b 1
)

if not exist "package.json" (
  color 0C
  echo [ERROR] package.json not found in this folder.
  echo.
  pause
  exit /b 1
)

echo [1/4] Starting backend server...
start "QuakeAlert Backend" cmd /k "cd /d %~dp0server && node server.js"

timeout /t 3 /nobreak >nul

echo [2/4] Starting frontend (Vite)...
start "QuakeAlert Frontend" cmd /k "cd /d %~dp0 && npm run dev"

timeout /t 4 /nobreak >nul

echo [3/4] Opening browser...
start http://localhost:5173/

timeout /t 2 /nobreak >nul

echo [4/4] Opening alert trigger window...
start "QuakeAlert Alert Trigger" cmd /k "cd /d %~dp0 && call :showAlertHelp"

echo.
echo ============================================
echo    QuakeAlert is running!
echo ============================================
echo.
echo   Backend:  http://localhost:5000
echo   Frontend: http://localhost:5173
echo.
echo   Three windows have opened:
echo     1. Backend server
echo     2. Frontend (Vite)
echo     3. Alert Trigger (paste commands there)
echo.
echo   Keep them open during the demo.
echo.
echo   To stop: close all three windows.
echo.
pause
exit /b 0

:showAlertHelp
color 0E
echo.
echo ====================================================
echo    QUAKEALERT - DEMO ALERT TRIGGER
echo ====================================================
echo.
echo   Copy-paste ONE of these commands below into
echo   this window, then press Enter.
echo.
echo   Replace X with your demo userId.
echo.
echo ----------------------------------------------------
echo.
echo   NORMAL (vibration = 1):
echo.
echo   Invoke-RestMethod -Uri http://localhost:5000/api/sensor -Method POST -ContentType "application/json" -Body '{"vibration": 1, "userId": X}'
echo.
echo ----------------------------------------------------
echo.
echo   WARNING (vibration = 3):
echo.
echo   Invoke-RestMethod -Uri http://localhost:5000/api/sensor -Method POST -ContentType "application/json" -Body '{"vibration": 3, "userId": X}'
echo.
echo ----------------------------------------------------
echo.
echo   CRITICAL (vibration = 6):
echo.
echo   Invoke-RestMethod -Uri http://localhost:5000/api/sensor -Method POST -ContentType "application/json" -Body '{"vibration": 6, "userId": X}'
echo.
echo ====================================================
echo.
echo   This window is NOT a PowerShell terminal yet.
echo   Close it and use a PowerShell window to paste.
echo   OR: right-click Windows Start, open "Terminal" (PowerShell).
echo.
echo ====================================================
echo.