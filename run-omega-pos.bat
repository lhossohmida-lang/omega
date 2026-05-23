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
echo 🚀 جاري فتح واجهة المبيعات مع تفعيل الطباعة الصامتة التلقائية...
echo.

:: البحث عن مسار متصفح كروم وتشغيله مع وضعية الطباعة الصامتة
if exist "C:\Program Files\Google\Chrome\Application\chrome.exe" (
    start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" --kiosk-printing "http://localhost:5173"
) else if exist "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" (
    start "" "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" --kiosk-printing "http://localhost:5173"
) else (
    echo ⚠️ لم نتمكن من العثور على Google Chrome في المسار القياسي لويندوز.
    echo 🌐 جاري الفتح بالمتصفح الافتراضي للنظام...
    start http://localhost:5173
)

echo.
echo ════════════════════════════════════════════════════════════════
echo ✅ تم تشغيل النظام بنجاح!
echo 🖨️ الطباعة التلقائية الصامتة (دون الحاجة لتأكيد) نشطة الآن.
echo.
echo 🔔 للتوضيح: عند طلب أي طباعة الآن، ستذهب مباشرة للطابعة الافتراضية
echo    لجهازك ولن تظهر صفحة المعاينة البيضاء مجدداً.
echo.
echo ⚠️ الرجاء عدم إغلاق هذه النافذة السوداء أثناء العمل لأنها تشغل السيرفر.
echo ════════════════════════════════════════════════════════════════
echo.
pause
