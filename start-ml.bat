@echo off
title MoveFlow ML Service
color 0C

echo ============================================
echo   MoveFlow - ML Service (port 8000)
echo ============================================
echo.

cd /d "%~dp0apps\ml-service"

echo Starting FastAPI ML Service...
call python -m uvicorn app.main:app --reload --port 8000
if errorlevel 1 (
    echo.
    echo [ERROR] ML Service failed to start.
    echo Make sure Python and dependencies are installed:
    echo   pip install -r requirements.txt
    pause
)
