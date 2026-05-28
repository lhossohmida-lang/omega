$ErrorActionPreference = "Stop"

# Force JDK 21 for Gradle compilation
$env:JAVA_HOME = "C:\Program Files\Microsoft\jdk-21.0.11.10-hotspot"
$env:Path = "$env:JAVA_HOME\bin;" + $env:Path

Write-Host "Forced JAVA_HOME to: $env:JAVA_HOME" -ForegroundColor Cyan
java -version

Write-Host "Building PWA and wrapping with Capacitor to generate Android APK..."

# 1. Build Vite
Write-Host "Building web assets..."
npm run build

# 2. Check and install capacitor
if (-not (Test-Path "capacitor.config.json")) {
    Write-Host "Initializing Capacitor..."
    npm install @capacitor/core @capacitor/cli @capacitor/android
    npx cap init "OMEGA" "com.omega.pos" --web-dir dist
}

# 3. Add Android if not present
if (-not (Test-Path "android")) {
    Write-Host "Adding Android platform..."
    npx cap add android
}

# 4. Configure Android SDK in local.properties
if (Test-Path "android") {
    $sdkPath = "C:\Users\NXT STORE\AppData\Local\Android\Sdk"
    $escapedPath = $sdkPath -replace '\\', '\\\\' -replace ':', '\:'
    "sdk.dir=$escapedPath" | Out-File -FilePath "android\local.properties" -Encoding ASCII -Force
    Write-Host "Configured Android SDK location in android/local.properties" -ForegroundColor Green
}

# 5. Sync assets
Write-Host "Syncing web assets to Capacitor..."
npx cap sync android

# 6. Compile APK
Write-Host "Compiling APK via Gradle with JDK 21..."
Set-Location android
.\gradlew.bat assembleDebug
Set-Location ..

# 7. Copy APK to public/
$apkSrc = "android\app\build\outputs\apk\debug\app-debug.apk"
$apkDest = "public\omega-app.apk"

if (Test-Path $apkSrc) {
    Copy-Item $apkSrc $apkDest -Force
    $size = [math]::Round((Get-Item $apkDest).Length / 1MB, 2)
    Write-Host "SUCCESS: APK ready at $apkDest ($size MB)"
} else {
    Write-Error "APK failed to build!"
}
