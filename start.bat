@echo off
echo ==========================================
echo   MoveinSync Logistic - Starting Servers
echo ==========================================
echo.

set "ROOT=%~dp0"

echo [1/2] Building API Gateway...
cd /d "%ROOT%apps\api-gateway"
call npm run build
if %ERRORLEVEL% neq 0 (
    echo.
    echo FAILED to build API Gateway!
    pause
    exit /b 1
)
echo Build OK.

echo.
echo [2/2] Starting API Gateway (port 3001) and Web App (port 3000)...
start "API Gateway" /D "%ROOT%apps\api-gateway" cmd /k node dist/main.js
start "Web App" /D "%ROOT%apps\web" cmd /k npm run dev

echo.
echo Waiting for servers to start...
timeout /t 5 /nobreak >nul

echo.
echo ==========================================
echo   Servers Starting:
echo     API:    http://localhost:3001
echo     Web:    http://localhost:3000
echo ==========================================
echo.
echo Credentials:
echo   Admin:   admin@acme.com / Admin@2026
echo   Manager: manager@acme.com / Admin@2026
echo   Driver:  driver1@acme.com / Admin@2026
echo.
echo Press any key to open browser...
pause >nul
start http://localhost:3000
