#!/usr/bin/env pwsh
# Simple APK Generator - No Android Studio GUI needed!

Write-Host "=== Thisai Tailor Shop - Simple APK Generator ===" -ForegroundColor Cyan
Write-Host ""

# Step 1: Create project structure
Write-Host "[1/5] Creating project structure..." -ForegroundColor Yellow
$projectDir = "..\TailorShopAPK"

if (Test-Path $projectDir) {
    Remove-Item $projectDir -Recurse -Force
}

New-Item -ItemType Directory -Path "$projectDir\app\src\main\java\com\thisai\tailorshop" -Force | Out-Null
New-Item -ItemType Directory -Path "$projectDir\app\src\main\res\values" -Force | Out-Null
New-Item -ItemType Directory -Path "$projectDir\app\src\main\res\mipmap-hdpi" -Force | Out-Null
New-Item -ItemType Directory -Path "$projectDir\app\src\main\res\mipmap-mdpi" -Force | Out-Null
New-Item -ItemType Directory -Path "$projectDir\app\src\main\res\mipmap-xhdpi" -Force | Out-Null
New-Item -ItemType Directory -Path "$projectDir\app\src\main\res\mipmap-xxhdpi" -Force | Out-Null
New-Item -ItemType Directory -Path "$projectDir\app\src\main\res\mipmap-xxxhdpi" -Force | Out-Null

Write-Host "  ✓ Directories created" -ForegroundColor Green

# Step 2: Create MainActivity
Write-Host "[2/5] Creating MainActivity..." -ForegroundColor Yellow
@"
package com.thisai.tailorshop;

import android.app.Activity;
import android.os.Bundle;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.WebSettings;

public class MainActivity extends Activity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        WebView webView = new WebView(this);
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        
        webView.setWebViewClient(new WebViewClient());
        webView.loadUrl("https://thisai-tailor-shop.web.app");
        
        setContentView(webView);
    }
}
"@ | Out-File -FilePath "$projectDir\app\src\main\java\com\thisai\tailorshop\MainActivity.java" -Encoding UTF8

Write-Host "  ✓ MainActivity created" -ForegroundColor Green

# Step 3: Create AndroidManifest.xml
Write-Host "[3/5] Creating AndroidManifest..." -ForegroundColor Yellow
@"
<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.thisai.tailorshop">

    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />

    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="Thisai Tailor Shop"
        android:theme="@android:style/Theme.NoTitleBar.Fullscreen">
        <activity
            android:name=".MainActivity"
            android:exported="true">
            <intent-filter>
                <action android:name="android.action.MAIN" />
                <category android:name="android.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>

</manifest>
"@ | Out-File -FilePath "$projectDir\app\src\main\AndroidManifest.xml" -Encoding UTF8

Write-Host "  ✓ AndroidManifest created" -ForegroundColor Green

# Step 4: Create build.gradle files
Write-Host "[4/5] Creating Gradle configuration..." -ForegroundColor Yellow

# Root build.gradle
@"
buildscript {
    repositories {
        google()
        mavenCentral()
    }
    dependencies {
        classpath 'com.android.tools.build:gradle:8.1.0'
    }
}

allprojects {
    repositories {
        google()
        mavenCentral()
    }
}
"@ | Out-File -FilePath "$projectDir\build.gradle" -Encoding UTF8

# App build.gradle
@"
plugins {
    id 'com.android.application'
}

android {
    compileSdk 34
    
    defaultConfig {
        applicationId "com.thisai.tailorshop"
        minSdk 21
        targetSdk 34
        versionCode 1
        versionName "1.0"
    }
    
    buildTypes {
        release {
            minifyEnabled false
        }
    }
}
"@ | Out-File -FilePath "$projectDir\app\build.gradle" -Encoding UTF8

# gradle.properties
@"
android.useAndroidX=true
android.enableJetifier=true
org.gradle.jvmargs=-Xmx2048m
"@ | Out-File -FilePath "$projectDir\gradle.properties" -Encoding UTF8

# settings.gradle
@"
rootProject.name = "Thisai Tailor Shop"
include ':app'
"@ | Out-File -FilePath "$projectDir\settings.gradle" -Encoding UTF8

Write-Host "  ✓ Gradle files created" -ForegroundColor Green

# Step 5: Build APK
Write-Host "[5/5] Building APK..." -ForegroundColor Yellow
Write-Host "  → This requires Android SDK to be installed" -ForegroundColor Gray
Write-Host ""

Set-Location $projectDir

Write-Host "Project created at: $projectDir" -ForegroundColor Cyan
Write-Host ""
Write-Host "To build the APK, run these commands in Android Studio Terminal:" -ForegroundColor Yellow
Write-Host "  cd $projectDir" -ForegroundColor White
Write-Host "  .\gradlew assembleRelease" -ForegroundColor White
Write-Host ""
Write-Host "Or open this project in Android Studio:" -ForegroundColor Yellow
Write-Host "  File > Open > Select: $projectDir" -ForegroundColor White
Write-Host "  Then: Build > Build Bundle(s)/APK(s) > Build APK(s)" -ForegroundColor White
Write-Host ""

Set-Location ..
