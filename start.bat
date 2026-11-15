@echo off
echo ========================================================
echo       Starting Apex Coaching Institute Application
echo ========================================================
echo.
echo  Backend:  http://localhost:5000
echo  Frontend: http://localhost:3000
echo.
echo  Default Logins:
echo   - Admin:   admin@apex.com   / admin123
echo   - Teacher: rahul@apex.com   / teacher123
echo ========================================================
echo.

:: Start Backend in background terminal
start "Apex Institute Backend (Port 5000)" cmd /k "cd /d %~dp0backend && npm run dev"

:: Start Frontend in background terminal
start "Apex Institute Frontend (Port 3000)" cmd /k "cd /d %~dp0frontend && npm run dev"

echo Backend and Frontend servers launched in separate windows!
echo Opening browser at http://localhost:3000 ...
timeout /t 3 >nul
start http://localhost:3000
