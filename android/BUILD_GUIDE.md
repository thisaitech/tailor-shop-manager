# Building Android APK in Android Studio

This guide shows how to build the Tailor Shop Manager Android app using Android Studio.

## Prerequisites

1. **Android Studio** (latest version recommended)
   - Download from: https://developer.android.com/studio
   - Install with default settings

2. **Java Development Kit (JDK)**
   - Android Studio usually installs this automatically
   - If needed, download JDK 11 or newer

## Step-by-Step Build Instructions

### 1. Open Project in Android Studio

1. Launch **Android Studio**
2. Click **Open** (or **File → Open**)
3. Navigate to: `Z:\Projects\thisai_tailor\tailor-shop-manager\android`
4. Click **OK**

Android Studio will:
- Import the project
- Download Gradle dependencies (this may take a few minutes on first run)
- Index files

### 2. Wait for Gradle Sync

- Watch the bottom status bar for "Gradle sync" progress
- If prompted to update Gradle or plugins, click **Update** (recommended)
- Wait until you see "Gradle sync finished" or "BUILD SUCCESSFUL"

### 3. Configure Build Variant (Optional)

- In Android Studio, go to **Build → Select Build Variant**
- Choose **release** for the production APK (smaller, optimized)
- Or keep **debug** for testing (larger, includes debug info)

### 4. Build the APK

**Method A: Build Menu (Recommended)**
1. Go to **Build → Build Bundle(s) / APK(s) → Build APK(s)**
2. Android Studio will compile and create the APK
3. Wait for the notification: "APK(s) generated successfully"
4. Click **locate** in the notification to find the APK

**Method B: Gradle Command**
1. Open **Terminal** in Android Studio (bottom toolbar)
2. Run:
   ```bash
   gradlew assembleRelease
   ```
   (or `gradlew.bat assembleRelease` on Windows)
3. APK will be created at: `app/build/outputs/apk/release/app-release.apk`

### 5. Locate Your APK

The APK file will be at:
```
android/app/build/outputs/apk/release/app-release.apk
```
or
```
android/app/build/outputs/apk/debug/app-debug.apk
```

### 6. Install APK on Android Device

**Via USB:**
1. Enable **Developer Options** on your Android device:
   - Go to Settings → About Phone
   - Tap "Build Number" 7 times
2. Enable **USB Debugging**:
   - Go to Settings → Developer Options
   - Turn on "USB Debugging"
3. Connect your device via USB
4. In Android Studio:
   - Click **Run** (green play button) or press **Shift+F10**
   - Select your device from the list
   - App will install and launch

**Via File Transfer:**
1. Copy `app-release.apk` to your phone (via USB, email, cloud storage, etc.)
2. On your phone, open the APK file
3. Android may warn "Install blocked" → tap **Settings** → allow "Install unknown apps"
4. Tap **Install**

## Customization Options

### Change App Name
Edit: `android/app/src/main/res/values/strings.xml`
```xml
<string name="app_name">Your Custom Name</string>
```

### Change App Icon
Replace icon files in:
- `android/app/src/main/res/mipmap-mdpi/ic_launcher.png` (48x48)
- `android/app/src/main/res/mipmap-hdpi/ic_launcher.png` (72x72)
- `android/app/src/main/res/mipmap-xhdpi/ic_launcher.png` (96x96)
- `android/app/src/main/res/mipmap-xxhdpi/ic_launcher.png` (144x144)
- `android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png` (192x192)

### Change Package Name or Version
Edit: `android/app/build.gradle`
```gradle
defaultConfig {
    applicationId "com.yourcompany.yourapp"  // Change package name
    versionCode 2                             // Increment for updates
    versionName "1.1"                         // User-visible version
}
```

### Change Web App URL
Edit: `android/app/src/main/java/com/thisai/tailorshop/MainActivity.java`
```java
private static final String APP_URL = "https://your-custom-url.web.app";
```

## Troubleshooting

### Gradle Sync Failed
- Check internet connection (Gradle downloads dependencies)
- Try: **File → Invalidate Caches / Restart**
- Update Android Studio: **Help → Check for Updates**

### Build Failed
- Check **Build** tab at bottom for error messages
- Common fixes:
  - Update Gradle: modify `android/gradle/wrapper/gradle-wrapper.properties`
  - Update Android Gradle Plugin: modify `android/build.gradle`
  - Install missing SDK components: **Tools → SDK Manager**

### App Crashes on Device
- Check **Logcat** tab in Android Studio while device is connected
- Verify internet permissions are granted
- Try clearing app data: Settings → Apps → Tailor Shop Manager → Clear Data

### APK Won't Install
- Uninstall any previous version first
- Enable "Install from unknown sources" in device settings
- Check APK file size (>0 bytes)

## Building Signed APK (for Google Play Store)

1. **Generate Keystore:**
   - Go to **Build → Generate Signed Bundle / APK**
   - Select **APK** → Next
   - Click **Create new...**
   - Fill in keystore path, password, alias details
   - **SAVE YOUR KEYSTORE AND PASSWORD SECURELY!**

2. **Build Signed APK:**
   - **Build → Generate Signed Bundle / APK**
   - Select existing keystore
   - Enter passwords
   - Choose **release** build variant
   - Check **V1 (Jar Signature)** and **V2 (Full APK Signature)**
   - Click **Finish**

3. **Upload to Play Store:**
   - The signed APK will be at: `app/release/app-release.apk`
   - Upload to Google Play Console

## Quick Command Reference

```bash
# Build debug APK
gradlew assembleDebug

# Build release APK
gradlew assembleRelease

# Clean build
gradlew clean

# Install on connected device
gradlew installDebug

# Build and install
gradlew installDebug
```

## App Features

This Android app:
- ✅ Loads your PWA from Firebase Hosting
- ✅ Works offline (via service worker)
- ✅ Supports localStorage for data persistence
- ✅ Enables JavaScript and DOM storage
- ✅ Handles back button navigation
- ✅ Responsive design (zoom enabled)
- ✅ Full-screen web app experience

## Support

For issues:
1. Check Android Studio **Build** output tab
2. Review **Logcat** for runtime errors
3. Verify Firebase Hosting URL is accessible
4. Test in browser first before building APK

## Current Configuration

- **App Name:** Tailor Shop Manager
- **Package:** com.thisai.tailorshop
- **Min SDK:** Android 7.0 (API 24)
- **Target SDK:** Android 14 (API 34)
- **URL:** https://thisai-tailor-shop.web.app
- **Version:** 1.0 (code 1)
