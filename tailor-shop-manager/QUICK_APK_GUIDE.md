# Quick Start: Generate APK with Android Studio

## ⚡ Fastest Method - Run the Automated Script

Open PowerShell in this directory and run:

```powershell
.\generate-apk.ps1
```

This will automatically:
- ✅ Install required tools
- ✅ Create Android project
- ✅ Build and sign APK
- ✅ Generate `Thisai-Tailor-Shop.apk` ready to install

---

## 🔧 Manual Method (If script fails)

### Step 1: Install Bubblewrap
```powershell
npm install -g @bubblewrap/cli
```

### Step 2: Create Android Project
```powershell
# Go to parent directory
cd ..
mkdir tailor-shop-android
cd tailor-shop-android

# Initialize project
bubblewrap init --manifest https://thisai-tailor-shop.web.app/manifest.json
```

**When prompted, enter:**
- Package ID: `com.thisai.tailorshop`
- App name: `Thisai Tailor Shop`
- Short name: `Tailor Shop`
- Accept defaults for everything else (just press Enter)

### Step 3: Build APK
```powershell
bubblewrap build
```

Wait 3-5 minutes for the build to complete.

### Step 4: Find Your APK
The APK will be in:
```
tailor-shop-android\app-release-signed.apk
```

---

## 📱 Install on Android Device

### Option A: Direct Transfer
1. Copy `app-release-signed.apk` to your phone
2. Tap the file
3. Allow installation
4. Done!

### Option B: USB Install
```powershell
adb install app-release-signed.apk
```

---

## ⚠️ Troubleshooting

### Error: Java not found
Set Java home:
```powershell
$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jre"
```

### Error: Android SDK not found
Set Android SDK:
```powershell
$env:ANDROID_SDK_ROOT = "$env:LOCALAPPDATA\Android\Sdk"
```

### Error: Bubblewrap command not found
Reinstall:
```powershell
npm uninstall -g @bubblewrap/cli
npm install -g @bubblewrap/cli
```

---

## 🎯 What You Get

After successful build:
- ✅ Signed APK ready to install
- ✅ Works offline
- ✅ Native Android app experience
- ✅ Home screen icon
- ✅ Splash screen
- ✅ No browser UI

---

## 📊 App Info

- **Package**: com.thisai.tailorshop
- **Size**: ~8-10 MB
- **Min Android**: 5.0 (API 21)
- **Target Android**: Latest

---

**Need help?** Check `ANDROID_STUDIO_APK_GUIDE.md` for detailed instructions.
