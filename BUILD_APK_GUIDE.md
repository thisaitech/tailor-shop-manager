# 📱 Tailor Shop Manager - APK Build Guide

This guide explains how to build the Android APK for the Tailor Shop Manager application.

## Prerequisites

### 1. Install Node.js (v18+)
Download from: https://nodejs.org/

### 2. Install Android Studio
Download from: https://developer.android.com/studio

During installation, ensure you install:
- Android SDK (API 34 recommended)
- Android SDK Build-Tools
- Android SDK Platform-Tools
- Android Emulator (optional, for testing)

### 3. Set Environment Variables

Add these to your system environment variables:

```
ANDROID_HOME = C:\Users\<YourUsername>\AppData\Local\Android\Sdk
JAVA_HOME = C:\Program Files\Android\Android Studio\jbr
```

Add to PATH:
```
%ANDROID_HOME%\platform-tools
%ANDROID_HOME%\tools
```

### 4. Install Java JDK 17+
Android Studio includes JBR (JetBrains Runtime), but you can also install OpenJDK 17.

## Build Methods

### Method 1: PowerShell Script (Recommended)

Run the build script:
```powershell
cd D:\new\tailor-shop-manager
.\build-apk.ps1
```

The APK will be created in the `apk-output` folder.

### Method 2: Manual Build

#### Step 1: Install dependencies
```bash
npm install
```

#### Step 2: Build the web app
```bash
npm run build
```

#### Step 3: Sync Capacitor
```bash
npx cap sync android
```

#### Step 4: Build APK using Gradle
```bash
cd android
./gradlew assembleDebug
```

The APK will be at: `android/app/build/outputs/apk/debug/app-debug.apk`

### Method 3: Using Android Studio

1. Open Android Studio
2. Click "Open" and select the `android` folder in the project
3. Wait for Gradle sync to complete
4. Click `Build > Build Bundle(s) / APK(s) > Build APK(s)`
5. The APK will be generated in `android/app/build/outputs/apk/debug/`

## Building Release APK (For Production)

### Generate Signing Key

```bash
keytool -genkey -v -keystore tailor-shop-release-key.jks -keyalg RSA -keysize 2048 -validity 10000 -alias tailor-shop-key
```

### Configure Signing in Gradle

Edit `android/app/build.gradle`:

```gradle
android {
    ...
    signingConfigs {
        release {
            storeFile file('tailor-shop-release-key.jks')
            storePassword 'your_store_password'
            keyAlias 'tailor-shop-key'
            keyPassword 'your_key_password'
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled true
            proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
        }
    }
}
```

### Build Release APK

```bash
cd android
./gradlew assembleRelease
```

The signed APK will be at: `android/app/build/outputs/apk/release/app-release.apk`

## App Features

### Native Camera
- Uses back camera by default
- Opens native camera on Android
- Falls back to HTML file input on web

### Push Notifications
- Receives order status notifications
- Local notifications for immediate feedback
- Supports background notifications

### Offline Support
- PWA capabilities
- Cached resources for offline access

## Troubleshooting

### Gradle Build Fails
1. Ensure ANDROID_HOME is set correctly
2. Run `./gradlew clean` before building
3. Check that SDK version matches `android/variables.gradle`

### APK Won't Install
1. Enable "Install from Unknown Sources" on device
2. Uninstall any previous version with same package name
3. Check minimum Android version (API 24 / Android 7.0)

### Camera Not Working
1. Grant camera permission when prompted
2. Check AndroidManifest.xml has camera permissions
3. Restart the app after granting permissions

### Notifications Not Showing
1. Grant notification permission
2. Check if Do Not Disturb is enabled
3. Ensure app is not in battery optimization list

## App Information

- **Package Name**: `com.tailorshop.manager`
- **App Name**: Tailor Shop Manager
- **Minimum SDK**: API 24 (Android 7.0)
- **Target SDK**: API 34 (Android 14)

## Support

For issues or questions, contact the development team.

