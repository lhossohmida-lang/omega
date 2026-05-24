@echo off
chcp 65001 > nul
title OMEGA POS Launcher
echo.
echo.
echo        ██████╗ ███╗   ███╗███████╗ ██████╗  █████╗
echo       ██╔═══██╗████╗ ████║██╔════╝██╔════╝ ██╔══██╗
echo       ██║   ██║██╔████╔██║█████╗  ██║  ███╗███████║
echo       ██║   ██║██║╚██╔╝██║██╔══╝  ██║   ██║██╔══██║
echo       ╚██████╔╝██║ ╚═╝ ██║███████╗╚██████╔╝██║  ██║
echo        ╚═════╝ ╚═╝     ╚═╝╚══════╝ ╚═════╝ ╚═╝  ╚═╝
echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║                OMEGA POS - نظام التشغيل الذكي                 ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.
echo ⏳ جاري تشغيل سيرفر المزامنة والتطبيق المحلي...
echo.

:: تشغيل سيرفر المطور وتطبيق المبيعات في الخلفية
start /b cmd /c "npm run local"

echo 🔌 انتظر قليلاً حتى يكتمل التشغيل الفعلي للسيرفر المحلي...
timeout /t 6 /nobreak > nul

echo.
echo 🛑 جاري إغلاق أي نوافذ أو عمليات خلفية لـ Google Chrome لتهيئة الطباعة الصامتة...
taskkill /f /im chrome.exe >nul 2>&1
timeout /t 2 /nobreak > nul

echo.
echo 🚀 جاري فتح واجهة المبيعات مع تفعيل الطباعة الصامتة التلقائية...
echo.

:: تحديد مسار Chrome
set "CHROME_PATH="
if exist "C:\Program Files\Google\Chrome\Application\chrome.exe" set "CHROME_PATH=C:\Program Files\Google\Chrome\Application\chrome.exe"
if exist "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" set "CHROME_PATH=C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"

if "%CHROME_PATH%"=="" (
    echo ⚠️ لم نتمكن من العثور على Google Chrome في المسار القياسي لويندوز.
    echo 🌐 جاري الفتح بالمتصفح الافتراضي للنظام...
    start http://localhost:5173
    goto :done
)

:: بروفايل منفصل خاص بـ POS — يضمن أن الرايات تعمل دائماً
set "POS_PROFILE=%LOCALAPPDATA%\OmegaPOS\ChromeProfile"
if not exist "%POS_PROFILE%" mkdir "%POS_PROFILE%"

:: تشغيل Chrome في وضع التطبيق + الطباعة الصامتة
start "" "%CHROME_PATH%" ^
  --kiosk-printing ^
  --no-first-run ^
  --no-default-browser-check ^
  --disable-features=Translate,PrintPreview ^
  --disable-print-preview ^
  --disable-pdf-tagging ^
  --user-data-dir="%POS_PROFILE%" ^
  --start-maximized ^
  --app="http://localhost:5173"

:done
echo.
echo ════════════════════════════════════════════════════════════════
echo ✅ تم تشغيل النظام بنجاح!
echo 🖨️ الطباعة التلقائية الصامتة (دون الحاجة لتأكيد) نشطة الآن.
echo.
echo 🔔 للتوضيح: عند طلب أي طباعة الآن، ستذهب مباشرة للطابعة الافتراضية
echo    لجهازك ولن تظهر صفحة المعاينة البيضاء مجدداً.
echo.
echo ⚠️ هام: يجب فتح التطبيق من خلال هذا الملف فقط (ليس من Chrome العادي)
echo    لكي تعمل الطباعة الصامتة.
echo.
echo ⚠️ الرجاء عدم إغلاق هذه النافذة السوداء أثناء العمل لأنها تشغل السيرفر.
echo ════════════════════════════════════════════════════════════════
echo.
pause
