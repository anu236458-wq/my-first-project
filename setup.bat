@echo off
echo ========================================================
echo       Apex Institute App - Automated Setup Script
echo ========================================================
echo.

:: 1. Check Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [!] Node.js was not detected in your PATH.
    echo [*] Attempting to install Node.js LTS via winget...
    winget install OpenJS.NodeJS.LTS --silent --accept-source-agreements --accept-package-agreements
    if %errorlevel% neq 0 (
        echo [X] Winget installation could not complete automatically.
        echo Please download and install Node.js LTS manually from: https://nodejs.org
        echo Then re-run this setup script.
        pause
        exit /b 1
    )
    echo [*] Node.js installed. Please restart your terminal if needed.
) else (
    echo [OK] Node.js is installed:
    node -v
)

echo.
echo [*] Installing Backend dependencies...
cd /d "%~dp0backend"
call npm install
if %errorlevel% neq 0 (
    echo [X] Backend npm install failed.
    pause
    exit /b 1
)

echo.
echo [*] Running Database Migrations and Seed initialization...
call npm run db:migrate

echo.
echo [*] Installing Frontend dependencies...
cd /d "%~dp0frontend"
call npm install
if %errorlevel% neq 0 (
    echo [X] Frontend npm install failed.
    pause
    exit /b 1
)

echo.
echo ========================================================
echo       Setup Completed Successfully!
echo       Run start.bat to launch the application.
echo ========================================================
pause
