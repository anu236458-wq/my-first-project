@echo off
echo.
echo   ==========================================
echo    Apex Institute Server
echo   ==========================================
echo.
echo   Starting server on http://localhost:5000
echo   Login: admin@apex.com / admin123
echo.
echo   Press Ctrl+C to stop.
echo.
cd /d "%~dp0"
python server.py
pause
