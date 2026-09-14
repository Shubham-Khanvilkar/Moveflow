@echo off
title MoveFlow Web App
color 0D

echo ============================================
echo   MoveFlow - Web App (port 3000)
echo ============================================
echo.

cd /d "%~dp0apps\web"

echo Starting Next.js...
call npm run dev
if errorlevel 1 (
    echo.
    echo [ERROR] Web app failed to start.
    echo Make sure dependencies are installed: npm install
    pause
)
