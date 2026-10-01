@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ================================================================
echo   شمس المعارف - خادم محلي لتشغيل قراءة الكف بالكاميرا
echo   ملاحظة: ابقِ هذه النافذة مفتوحة اثناء الاستخدام. اغلاقها يوقف الخادم.
echo ================================================================
echo.
where node >nul 2>nul
if errorlevel 1 (
  echo [خطأ] لم يتم العثور على Node.js على هذا الجهاز.
  echo نزّل Node.js من https://nodejs.org ثم اعد تشغيل هذا الملف.
  echo.
  pause
  exit /b 1
)
start "" "http://localhost:8080/web/شمس-المعارف.html"
node tools\serve.js
pause
