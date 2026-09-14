@echo off
title MoveFlow - DB Setup
color 0E

echo ============================================
echo   MoveFlow - Database Setup
echo ============================================
echo.

cd /d "%~dp0packages\database"

if not exist ".env" (
    echo [INFO] No .env in packages/database, using root .env
)

echo [1/4] Generating Prisma Client...
call npx prisma generate
if errorlevel 1 (
    echo [ERROR] Prisma generate failed!
    pause
    exit /b 1
)
echo [OK] Prisma Client generated.
echo.

echo [2/4] Running Migrations...
call npx prisma migrate dev --name init
if errorlevel 1 (
    echo [ERROR] Migration failed!
    pause
    exit /b 1
)
echo [OK] Migrations applied.
echo.

echo [3/4] Seeding Database...
call npx prisma db seed
if errorlevel 1 (
    echo [WARN] Seeding failed (may already exist).
) else (
    echo [OK] Database seeded.
)
echo.

echo [4/4] Opening Prisma Studio...
call npx prisma studio

echo.
echo ============================================
echo   Database setup complete!
echo ============================================
pause
