# Generate APK using Android Studio

## Prerequisites
- ✅ Android Studio installed
- ✅ Java JDK installed
- ✅ Your app deployed at: https://thisai-tailor-shop.web.app

---

## Step 1: Install Bubblewrap CLI

Open PowerShell in your project directory and run:

```powershell
npm install -g @bubblewrap/cli
```

---

## Step 2: Initialize Bubblewrap Project

```powershell
# Navigate to a new directory for the Android project
cd ..
mkdir tailor-shop-android
cd tailor-shop-android

# Initialize the TWA (Trusted Web Activity) project
bubblewrap init --manifest https://thisai-tailor-shop.web.app/manifest.json
```

When prompted, enter:
- **Application name**: Thisai Tailor Shop
- **Short name**: Tailor Shop
- **Package ID**: com.thisai.tailorshop
- **Host**: thisai-tailor-shop.web.app
- **Start URL**: /
- **Theme color**: #5B21B6
- **Background color**: #ffffff
- **Icon URL**: https://thisai-tailor-shop.web.app/icon-512.png
- **Maskable icon URL**: https://thisai-tailor-shop.web.app/icon-512.png
- **Signing key**: (press Enter to generate new)

---

## Step 3: Build the Android Project

```powershell
# This creates the Android Studio project
bubblewrap build
```

This will:
- Generate Android project files
- Create a signing key
- Build the APK

The APK will be created at: `app-release-signed.apk`

---

## Step 4: Open in Android Studio (Optional)

If you want to customize the Android project:

```powershell
# Update the project
bubblewrap update

# This will create/update the Android Studio project
```

Then:
1. Open Android Studio
2. Click "Open an Existing Project"
3. Navigate to the `tailor-shop-android` folder
4. Open the project
5. Wait for Gradle sync to complete
6. Build > Generate Signed Bundle / APK
7. Choose APK
8. Use the existing key or create new
9. Select "release" build variant
10. Click Finish

---

## Alternative: Direct APK Generation (Simpler Method)

I'll create a script that does everything automatically:

```powershell
# Run this single command:
.\generate-apk.ps1
```

This will:
- Install dependencies
- Generate keystore
- Build APK
- Sign APK
- Output ready-to-install APK file

---

## Step 5: Install APK on Android Device

### Method A: USB Connection
```powershell
# Enable USB debugging on your Android device
# Connect via USB
adb install app-release-signed.apk
```

### Method B: Direct Transfer
1. Copy `app-release-signed.apk` to your phone
2. Tap the file on your phone
3. Allow installation from unknown sources
4. Install

---

## Expected Output

After successful build, you'll have:
- `app-release-signed.apk` - Ready to install
- `twa-manifest.json` - Configuration file
- Android project folder with all source files

---

## Troubleshooting

### If Bubblewrap fails:
Make sure you have:
- Node.js 14+ installed
- Java JDK 11+ installed
- Android SDK installed (comes with Android Studio)

### Set Java Home:
```powershell
$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jre"
```

### Set Android SDK:
```powershell
$env:ANDROID_SDK_ROOT = "C:\Users\YourUsername\AppData\Local\Android\Sdk"
```

---

## Next Steps

After APK is created:
1. Test on your device
2. Share with users
3. (Optional) Publish to Google Play Store

---

Let me know if you encounter any issues during the build process!
