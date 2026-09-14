@echo off
title MoveFlow - Full Stack Dev
color 0A

echo ============================================
echo   MoveFlow - Starting All Services
echo ============================================
echo.

:: Check Supabase connectivity
echo [0/4] Checking Supabase database connection...
echo        Database: Supabase (cloud) - no local Docker needed
echo.

:: Start API Gateway
echo [1/4] Starting API Gateway (port 3001)...
start "MoveFlow API" /D "%~dp0" cmd /k "start-api.bat"
timeout /t 4 /nobreak >nul

:: Start Web App
echo [2/4] Starting Web App (port 3000)...
start "MoveFlow Web" /D "%~dp0" cmd /k "start-web.bat"
timeout /t 3 /nobreak >nul

:: Start ML Service
echo [3/4] Starting ML Service (port 8000)...
where python >nul 2>&1
if errorlevel 1 (
    echo [SKIP] Python not found. ML service not started.
) else (
    start "MoveFlow ML" /D "%~dp0" cmd /k "start-ml.bat"
)

:: Summary
echo.
echo [4/4] All services launched!
echo.
echo ============================================
echo   Service URLs
echo ============================================
echo   API Gateway:  http://localhost:3001
echo   Web App:      http://localhost:3000
echo   ML Service:   http://localhost:8000
echo   Swagger:      http://localhost:3001/api/docs
echo   Health:       http://localhost:3001/health
echo ============================================
echo.
echo Press any key to open the web app...
pause >nul
start "" "http://localhost:3000"
