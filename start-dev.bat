@echo off
title MoveFlow - Dev (API + Web)
color 0A

echo ============================================
echo   MoveFlow - Starting Dev Services
echo ============================================
echo.

echo [1/2] Starting API Gateway (port 3001)...
start "MoveFlow API" /D "%~dp0" cmd /k "start-api.bat"

timeout /t 4 /nobreak >nul

echo [2/2] Starting Web App (port 3000)...
start "MoveFlow Web" /D "%~dp0" cmd /k "start-web.bat"

echo.
echo ============================================
echo   Dev services started!
echo ============================================
echo   API Gateway:  http://localhost:3001
echo   Web App:      http://localhost:3000
echo   Swagger:      http://localhost:3001/api/docs
echo ============================================
echo.
echo Press any key to open the web app...
pause >nul
start "" "http://localhost:3000"
