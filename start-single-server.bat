@echo off
echo ========================================================
echo   Starting Apex Institute in Single-Server Mode
echo ========================================================
echo.
echo [*] Building frontend static bundle...
cd /d "%~dp0frontend"
call npm run build
if %errorlevel% neq 0 (
    echo [X] Frontend build failed.
    pause
    exit /b 1
)

echo.
echo [*] Starting Backend + Frontend on single port (http://localhost:5000)...
cd /d "%~dp0backend"
start http://localhost:5000
npm start
