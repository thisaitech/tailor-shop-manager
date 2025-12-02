# ============================================
# Tailor Shop Manager - APK Build Script
# ============================================
# This script builds the Android APK for the application
# 
# Prerequisites:
# 1. Node.js installed (v18+)
# 2. Android Studio installed with SDK
# 3. ANDROID_HOME environment variable set
# 4. Java JDK 17+ installed
# ============================================

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  Tailor Shop Manager - APK Builder" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Check if running from project directory
if (-not (Test-Path "package.json")) {
    Write-Host "ERROR: Please run this script from the project root directory" -ForegroundColor Red
    exit 1
}

# Step 1: Install dependencies
Write-Host "[1/5] Installing dependencies..." -ForegroundColor Yellow
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: npm install failed" -ForegroundColor Red
    exit 1
}

# Step 2: Build the web application
Write-Host "[2/5] Building web application..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Build failed" -ForegroundColor Red
    exit 1
}

# Step 3: Sync with Capacitor
Write-Host "[3/5] Syncing with Capacitor..." -ForegroundColor Yellow
npx cap sync android
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Capacitor sync failed" -ForegroundColor Red
    exit 1
}

# Step 4: Build Debug APK
Write-Host "[4/5] Building Debug APK..." -ForegroundColor Yellow
Set-Location android
./gradlew assembleDebug
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Gradle build failed" -ForegroundColor Red
    Set-Location ..
    exit 1
}
Set-Location ..

# Step 5: Copy APK to output folder
Write-Host "[5/5] Copying APK to output..." -ForegroundColor Yellow
$outputDir = "apk-output"
if (-not (Test-Path $outputDir)) {
    New-Item -ItemType Directory -Path $outputDir | Out-Null
}

$apkSource = "android\app\build\outputs\apk\debug\app-debug.apk"
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$apkDest = "$outputDir\TailorShopManager-$timestamp.apk"

if (Test-Path $apkSource) {
    Copy-Item $apkSource $apkDest
    Write-Host ""
    Write-Host "============================================" -ForegroundColor Green
    Write-Host "  BUILD SUCCESSFUL!" -ForegroundColor Green
    Write-Host "============================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "APK Location: $apkDest" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "To install on device:" -ForegroundColor Yellow
    Write-Host "  1. Enable 'Install from Unknown Sources' on your Android device"
    Write-Host "  2. Transfer the APK to your device"
    Write-Host "  3. Open the APK file to install"
    Write-Host ""
} else {
    Write-Host "ERROR: APK file not found at $apkSource" -ForegroundColor Red
    exit 1
}

