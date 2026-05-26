@echo off
chcp 65001 > nul
title OMEGA POS Installer - تثبيت نظام أوميغا
color 0B

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
echo ║             مساعد تثبيت نظام أوميغا لنقاط البيع              ║
echo ║                   OMEGA POS Installer                        ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.
echo ⏳ جاري فحص بيئة التشغيل والتحقق من المتطلبات الأساسية...
echo.

:: 1. التحقق من صلاحيات المسؤول (Administrator)
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo ⚠️ يُنصح بتشغيل هذا المثبت كمسؤول (Administrator) لضمان تثبيت Node.js وإنشاء الاختصارات بشكل صحيح.
    echo 🔄 جاري محاولة إعادة التشغيل بصلاحيات المسؤول...
    powershell -Command "Start-Process '%~f0' -Verb RunAs"
    exit /b
)

:: 2. فحص وتثبيت Node.js
echo 🔎 الخطوة 1: فحص وجود Node.js...
where node >nul 2>nul
if %errorLevel% equ 0 (
    echo ✅ Node.js مثبت بالفعل على جهازك.
    for /f "tokens=*" %%v in ('node -v') do set "NODE_VER=%%v"
    echo 📦 الإصدار الحالي: %NODE_VER%
    echo.
) else (
    echo ❌ Node.js غير مثبت على هذا الجهاز.
    echo 📥 جاري تحميل وتثبيت Node.js LTS (الإصدار المستقر 20)...
    echo ⏳ يرجى الانتظار، قد يستغرق التحميل بضع دقائق اعتماداً على سرعة الإنترنت...
    
    :: إنشاء مجلد مؤقت للتحميل
    set "TEMP_DIR=%TEMP%\OmegaInstaller"
    if not exist "%TEMP_DIR%" mkdir "%TEMP_DIR%"
    
    :: تحميل ملف التثبيت باستخدام PowerShell
    powershell -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; echo '⏳ جاري تنزيل الملف...'; Invoke-WebRequest -Uri 'https://nodejs.org/dist/v20.11.1/node-v20.11.1-x64.msi' -OutFile '%TEMP_DIR%\node-v20.11.1-x64.msi'"
    
    if exist "%TEMP_DIR%\node-v20.11.1-x64.msi" (
        echo 💾 تم تحميل الملف بنجاح. جاري التثبيت الصامت الآن...
        msiexec /i "%TEMP_DIR%\node-v20.11.1-x64.msi" /passive /norestart
        echo ✅ اكتمل تثبيت Node.js بنجاح!
        
        :: تنظيف الملف المؤقت
        del /f /q "%TEMP_DIR%\node-v20.11.1-x64.msi" >nul 2>&1
        
        :: تحديث مسارات البيئة (PATH) في الجلسة الحالية
        echo 🔄 جاري تحديث مسارات النظام البيئية...
        for /f "tokens=*" %%i in ('powershell -Command "[Environment]::GetEnvironmentVariable('Path', 'Machine') + ';' + [Environment]::GetEnvironmentVariable('Path', 'User')"') do set "PATH=%%i"
    ) else (
        echo ❌ فشل تحميل Node.js تلقائياً. يرجى تثبيته يدوياً من الموقع الرسمي: https://nodejs.org
        pause
        exit /b
    )
    echo.
)

:: 3. تثبيت حزم الاعتماديات (Dependencies)
echo 🔎 الخطوة 2: تثبيت حزم ومكتبات النظام (npm install)...
echo ⏳ جاري تهيئة الحزم، يرجى عدم إغلاق النافذة...
cd /d "%~dp0"

:: التحقق من وجود ملف package.json
if not exist "package.json" (
    echo ❌ خطأ: لم يتم العثور على ملف package.json في هذا المجلد!
    echo تأكد من فك ضغط جميع الملفات في مجلد التثبيت.
    pause
    exit /b
)

:: تشغيل التثبيت
call npm install
if %errorLevel% equ 0 (
    echo ✅ تم تثبيت جميع الحزم والمكتبات بنجاح!
) else (
    echo ⚠️ حدث خطأ أو تحذير أثناء تثبيت بعض الحزم. سنحاول المتابعة...
)
echo.

:: 4. إنشاء اختصار على سطح المكتب لملف التشغيل
echo 🔎 الخطوة 3: إنشاء اختصار على سطح المكتب لتسهيل تشغيل التطبيق...
set "LAUNCHER_PATH=%~dp0run-omega-pos.bat"
set "SHORTCUT_NAME=Omega POS.lnk"

powershell -Command "$WshShell = New-Object -ComObject WScript.Shell; $Shortcut = $WshShell.CreateShortcut([System.IO.Path]::Combine([System.Environment]::GetFolderPath('Desktop'), '%SHORTCUT_NAME%')); $Shortcut.TargetPath = '%LAUNCHER_PATH%'; $Shortcut.WorkingDirectory = '%~dp0'; $Shortcut.Description = 'تشغيل نظام OMEGA POS لإدارة المبيعات والطباعة الصامتة'; $Shortcut.IconLocation = 'C:\Windows\System32\shell32.dll,14'; $Shortcut.Save()"

if %errorLevel% equ 0 (
    echo ✅ تم إنشاء اختصار 'Omega POS' على سطح المكتب بنجاح!
) else (
    echo ⚠️ لم نتمكن من إنشاء الاختصار تلقائياً. يمكنك تشغيل النظام يدوياً بالضغط على الملف run-omega-pos.bat
)
echo.

:: 5. إعداد جدار الحماية (اختياري للمزامنة المحلية)
echo 🔎 الخطوة 4: تهيئة إعدادات الشبكة المحلية لمزامنة المطبخ...
netsh advfirewall firewall show rule name="Omega Local Sync Port 5173" >nul 2>&1
if %errorLevel% neq 0 (
    echo 🔌 جاري السماح للمتصفحات والأجهزة الأخرى بالاتصال بالنظام عبر الشبكة المحلية (المنفذ 5173)...
    netsh advfirewall firewall add rule name="Omega Local Sync Port 5173" dir=in action=allow protocol=TCP localport=5173 >nul 2>&1
    netsh advfirewall firewall add rule name="Omega Local Sync Port 3001" dir=in action=allow protocol=TCP localport=3001 >nul 2>&1
    echo ✅ تم إعداد جدار الحماية بنجاح!
) else (
    echo ✅ إعدادات الشبكة مهيأة مسبقاً.
)
echo.

echo ════════════════════════════════════════════════════════════════
echo 🎉 تهانينا! تم تثبيت نظام OMEGA POS بنجاح! 🎉
echo ════════════════════════════════════════════════════════════════
echo.
echo 💡 للبدء الآن:
echo 1. اذهب إلى سطح المكتب وافتح الاختصار "Omega POS".
echo 2. سيقوم النظام بتشغيل واجهة البيع وتفعيل الطباعة التلقائية (الصامتة).
echo 3. لمزامنة شاشات المطبخ، تأكد من اتصال الأجهزة بنفس شبكة WiFi المحلية.
echo.
echo 📞 للدعم الفني، يرجى التواصل مع فريق تطوير OMEGA.
echo ════════════════════════════════════════════════════════════════
echo.
pause
