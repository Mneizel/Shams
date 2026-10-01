@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo Shams al-Maarif - local server for the live-camera palm reader
echo Keep this window open while you use the site. Closing it stops the server.
echo.
where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js was not found. Install it from https://nodejs.org and re-run.
  pause
  exit /b 1
)
start "" "http://localhost:8080/web/%D8%B4%D9%85%D8%B3-%D8%A7%D9%84%D9%85%D8%B9%D8%A7%D8%B1%D9%81.html"
node tools\serve.js
pause
