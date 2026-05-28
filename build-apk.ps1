# =============================================================================
#  OMEGA — Build APK Script (PowerShell)
# =============================================================================
#  يبني تطبيق الويب ويلفّه بـ Capacitor وينتج APK يُنسخ إلى:
#   • .\public\omega-app.apk   (يُخدَّم بالـ Vite dev server وعند النشر)
#
#  المتطلبات قبل التشغيل:
#   1. Node.js 18+
#   2. Java JDK 17+  (مع ضبط JAVA_HOME)
#   3. Android SDK   (مع ضبط ANDROID_HOME أو ANDROID_SDK_ROOT)
#
#  الاستخدام:
#    .\build-apk.ps1
# =============================================================================

$ErrorActionPreference = "Stop"

Write-Host "🚀 OMEGA — Building APK..." -ForegroundColor Cyan

# ── Step 1: Build the web app ──────────────────────────────────────────────
Write-Host "`n📦 Building Vite web app..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) { Write-Error "Vite build failed!"; exit 1 }

# ── Step 2: Install Capacitor if not present ───────────────────────────────
Write-Host "`n⚡ Checking Capacitor..." -ForegroundColor Yellow
$hasCap = npm list @capacitor/core --depth=0 2>$null | Select-String "@capacitor/core"
if (-not $hasCap) {
    Write-Host "Installing Capacitor packages..." -ForegroundColor Gray
    npm install @capacitor/core @capacitor/cli @capacitor/android
}

# ── Step 3: Initialize Capacitor (only first time) ────────────────────────
Write-Host "`n🔧 Initializing Capacitor..." -ForegroundColor Yellow
if (-not (Test-Path ".\capacitor.config.json") -and -not (Test-Path ".\capacitor.config.ts")) {
    npx cap init "OMEGA" "com.omega.pos" --web-dir dist
}

# ── Step 4: Add Android platform (only first time) ────────────────────────
if (-not (Test-Path ".\android")) {
    Write-Host "`n📱 Adding Android platform..." -ForegroundColor Yellow
    npx cap add android
}

# ── Step 5: Sync web build to native ──────────────────────────────────────
Write-Host "`n🔄 Syncing web assets to Android..." -ForegroundColor Yellow
npx cap sync android

# ── Step 6: Build the APK ─────────────────────────────────────────────────
Write-Host "`n🔨 Building Debug APK..." -ForegroundColor Yellow
Set-Location .\android
.\gradlew.bat assembleDebug
Set-Location ..

# ── Step 7: Copy APK to public/ ───────────────────────────────────────────
$APK_SRC = ".\android\app\build\outputs\apk\debug\app-debug.apk"
$APK_DEST = ".\public\omega-app.apk"

if (Test-Path $APK_SRC) {
    Copy-Item -Path $APK_SRC -Destination $APK_DEST -Force

    $size = [math]::Round((Get-Item $APK_DEST).Length / 1MB, 2)
    Write-Host "`n✅ APK built successfully! (${size} MB)" -ForegroundColor Green
    Write-Host "   → $APK_DEST" -ForegroundColor Green
} else {
    Write-Error "APK not found at expected path: $APK_SRC"
    exit 1
}

Write-Host "`n🎉 Done! APK is ready at public\omega-app.apk" -ForegroundColor Cyan
Write-Host "   Users on Android will now auto-download it from the app!" -ForegroundColor Gray
