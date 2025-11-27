#!/usr/bin/env pwsh
# Automated APK Generator for Thisai Tailor Shop
# This script automates the entire APK generation process

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Thisai Tailor Shop - APK Generator" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Configuration
$APP_NAME = "Thisai Tailor Shop"
$PACKAGE_ID = "com.thisai.tailorshop"
$APP_URL = "https://thisai-tailor-shop.web.app"
$MANIFEST_URL = "$APP_URL/manifest.json"
$BUILD_DIR = "..\tailor-shop-android"

# Step 1: Check prerequisites
Write-Host "[1/6] Checking prerequisites..." -ForegroundColor Yellow

# Check if Node.js is installed
try {
    $nodeVersion = node --version
    Write-Host "  ✓ Node.js found: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "  ✗ Node.js not found. Please install Node.js first." -ForegroundColor Red
    exit 1
}

# Check if Java is installed
try {
    $javaVersion = java -version 2>&1 | Select-Object -First 1
    Write-Host "  ✓ Java found" -ForegroundColor Green
} catch {
    Write-Host "  ✗ Java not found. Please install Java JDK." -ForegroundColor Red
    exit 1
}

# Step 2: Install Bubblewrap
Write-Host ""
Write-Host "[2/6] Installing Bubblewrap CLI..." -ForegroundColor Yellow
try {
    npm install -g @bubblewrap/cli
    Write-Host "  ✓ Bubblewrap installed successfully" -ForegroundColor Green
} catch {
    Write-Host "  ✗ Failed to install Bubblewrap" -ForegroundColor Red
    exit 1
}

# Step 3: Create build directory
Write-Host ""
Write-Host "[3/6] Setting up build directory..." -ForegroundColor Yellow
if (Test-Path $BUILD_DIR) {
    Write-Host "  → Cleaning existing build directory..." -ForegroundColor Gray
    Remove-Item $BUILD_DIR -Recurse -Force
}
New-Item -ItemType Directory -Path $BUILD_DIR -Force | Out-Null
Set-Location $BUILD_DIR
Write-Host "  ✓ Build directory ready" -ForegroundColor Green

# Step 4: Initialize Bubblewrap project
Write-Host ""
Write-Host "[4/6] Initializing Android project..." -ForegroundColor Yellow
Write-Host "  → This may take a few minutes..." -ForegroundColor Gray

# Create initialization parameters
$initParams = @"
{
  "packageId": "$PACKAGE_ID",
  "host": "thisai-tailor-shop.web.app",
  "name": "$APP_NAME",
  "launcherName": "Tailor Shop",
  "display": "standalone",
  "themeColor": "#5B21B6",
  "backgroundColor": "#ffffff",
  "startUrl": "/",
  "iconUrl": "$APP_URL/icon-512.png",
  "maskableIconUrl": "$APP_URL/icon-512.png",
  "shortcuts": [],
  "signingKey": {
    "path": "./android.keystore",
    "alias": "android"
  }
}
"@

$initParams | Out-File -FilePath "twa-manifest.json" -Encoding UTF8

try {
    # Initialize with the manifest
    bubblewrap init --manifest $MANIFEST_URL
    Write-Host "  ✓ Project initialized" -ForegroundColor Green
} catch {
    Write-Host "  ✗ Initialization failed" -ForegroundColor Red
    Write-Host "  → You may need to run this manually:" -ForegroundColor Yellow
    Write-Host "    bubblewrap init --manifest $MANIFEST_URL" -ForegroundColor Cyan
    exit 1
}

# Step 5: Build the APK
Write-Host ""
Write-Host "[5/6] Building APK..." -ForegroundColor Yellow
Write-Host "  → This will take several minutes..." -ForegroundColor Gray

try {
    bubblewrap build
    Write-Host "  ✓ APK built successfully!" -ForegroundColor Green
} catch {
    Write-Host "  ✗ Build failed" -ForegroundColor Red
    Write-Host "  → Try building manually with: bubblewrap build" -ForegroundColor Yellow
    exit 1
}

# Step 6: Locate and display APK
Write-Host ""
Write-Host "[6/6] Locating APK file..." -ForegroundColor Yellow

$apkFile = Get-ChildItem -Path . -Filter "*.apk" -Recurse | Select-Object -First 1

if ($apkFile) {
    Write-Host "  ✓ APK found!" -ForegroundColor Green
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "         BUILD SUCCESSFUL! 🎉" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "APK Location:" -ForegroundColor Cyan
    Write-Host "  $($apkFile.FullName)" -ForegroundColor White
    Write-Host ""
    Write-Host "File Size: $([math]::Round($apkFile.Length / 1MB, 2)) MB" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Next Steps:" -ForegroundColor Yellow
    Write-Host "  1. Transfer APK to your Android device" -ForegroundColor White
    Write-Host "  2. Enable 'Install from Unknown Sources'" -ForegroundColor White
    Write-Host "  3. Tap the APK to install" -ForegroundColor White
    Write-Host ""
    Write-Host "Or install via USB:" -ForegroundColor Yellow
    Write-Host "  adb install `"$($apkFile.FullName)`"" -ForegroundColor Cyan
    Write-Host ""
    
    # Copy APK to parent directory for easy access
    $destPath = "..\..\Thisai-Tailor-Shop.apk"
    Copy-Item $apkFile.FullName -Destination $destPath -Force
    Write-Host "APK copied to: $destPath" -ForegroundColor Green
    Write-Host ""
} else {
    Write-Host "  ✗ APK file not found" -ForegroundColor Red
    Write-Host "  → Check the build output for errors" -ForegroundColor Yellow
}

# Return to original directory
Set-Location ..

Write-Host "Process complete!" -ForegroundColor Cyan
Write-Host ""
