# Firebase Deployment & Mobile App Guide

## Table of Contents
1. [Firebase Setup](#firebase-setup)
2. [Environment Configuration](#environment-configuration)
3. [Deploy to Firebase Hosting](#deploy-to-firebase-hosting)
4. [Mobile App Setup](#mobile-app-setup)
5. [Data Storage in Firebase](#data-storage-in-firebase)

---

## Firebase Setup

### 1. Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" or "Create a project"
3. Enter project name (e.g., "tailor-shop-manager")
4. Enable/disable Google Analytics (optional)
5. Click "Create project"

### 2. Enable Firebase Services

#### Enable Firestore Database
1. In Firebase Console, go to **Firestore Database**
2. Click "Create database"
3. Select "Start in test mode" (for development)
4. Choose a Cloud Firestore location (select closest to your users)
5. Click "Enable"

#### Enable Firebase Storage
1. Go to **Storage** in Firebase Console
2. Click "Get started"
3. Select "Start in test mode"
4. Click "Done"

#### Enable Firebase Hosting
1. Go to **Hosting** in Firebase Console
2. Click "Get started"
3. Follow the setup wizard (we'll use CLI below)

### 3. Get Firebase Configuration

1. In Firebase Console, go to **Project Settings** (gear icon)
2. Scroll to "Your apps" section
3. Click the **Web** icon (`</>`)
4. Register your app with a nickname (e.g., "Tailor Shop Web")
5. Copy the configuration object

---

## Environment Configuration

### 1. Create Environment File

Create a `.env` file in the project root:

```bash
# Copy from .env.example
cp .env.example .env
```

### 2. Add Firebase Configuration

Edit `.env` and replace with your Firebase project values:

```env
VITE_FIREBASE_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
VITE_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789012
VITE_FIREBASE_APP_ID=1:123456789012:web:abcdef1234567890
```

---

## Deploy to Firebase Hosting

### 1. Login to Firebase

```bash
firebase login
```

This will open a browser window for authentication.

### 2. Initialize Firebase Project

```bash
firebase init
```

Select the following options:
- ✅ Firestore
- ✅ Hosting
- ✅ Storage

Follow the prompts:
- **Firestore rules**: Use existing `firestore.rules`
- **Firestore indexes**: Use existing `firestore.indexes.json`
- **Storage rules**: Use existing `storage.rules`
- **Hosting public directory**: `dist`
- **Configure as SPA**: Yes
- **Set up automatic builds**: No
- **Overwrite index.html**: No

### 3. Build the Project

```bash
npm run build
```

### 4. Deploy to Firebase

```bash
firebase deploy
```

Or use the npm script:

```bash
npm run firebase:deploy
```

Your app will be deployed to: `https://your-project-id.web.app`

---

## Mobile App Setup

The project is configured with Capacitor for building native mobile apps.

### Prerequisites

#### For Android:
- [Android Studio](https://developer.android.com/studio)
- Java Development Kit (JDK) 11 or higher
- Android SDK

#### For iOS (macOS only):
- [Xcode](https://developer.apple.com/xcode/)
- CocoaPods (`sudo gem install cocoapods`)

### 1. Build Web Assets

```bash
npm run build
```

### 2. Add Android Platform

```bash
npm run cap:add:android
```

This creates an `android/` folder with the native Android project.

### 3. Add iOS Platform (macOS only)

```bash
npm run cap:add:ios
```

This creates an `ios/` folder with the native iOS project.

### 4. Sync Assets to Native Projects

After any web code changes:

```bash
npm run cap:sync
```

This command:
1. Builds the web app
2. Copies web assets to native projects
3. Updates native dependencies

### 5. Open in Native IDE

#### Android Studio:
```bash
npm run cap:open:android
```

Then:
1. Wait for Gradle sync to complete
2. Connect an Android device or start an emulator
3. Click the "Run" button (green play icon)

#### Xcode (macOS):
```bash
npm run cap:open:ios
```

Then:
1. Select a simulator or connected iOS device
2. Click the "Run" button (play icon)

### 6. Build for Production

#### Android APK:
1. Open in Android Studio
2. Go to **Build > Build Bundle(s) / APK(s) > Build APK(s)**
3. APK will be in `android/app/build/outputs/apk/`

#### Android App Bundle (for Play Store):
1. Open in Android Studio
2. Go to **Build > Generate Signed Bundle / APK**
3. Select "Android App Bundle"
4. Create or select a keystore
5. Follow the wizard

#### iOS (App Store):
1. Open in Xcode
2. Select "Any iOS Device" as target
3. Go to **Product > Archive**
4. Upload to App Store Connect

---

## Data Storage in Firebase

### Database Structure (Firestore)

Your data is organized in Firestore collections:

```
firestore/
├── customers/
│   ├── CUS1699999999999
│   │   ├── id: "CUS1699999999999"
│   │   ├── name: "John Doe"
│   │   ├── phone: "+919876543210"
│   │   ├── email: "john@example.com"
│   │   ├── address: "123 Main St"
│   │   ├── createdAt: 1699999999999
│   │   └── updatedAt: 1699999999999
│   └── ...
│
├── orders/
│   ├── ORD1699999999999
│   │   ├── id: "ORD1699999999999"
│   │   ├── customerId: "CUS1699999999999"
│   │   ├── customerName: "John Doe"
│   │   ├── measurements: {...}
│   │   ├── status: "pending" | "in-progress" | "ready" | "completed"
│   │   ├── assignedTailor: "Kumar"
│   │   ├── fabricPhotos: ["url1", "url2"]
│   │   ├── designPhotos: ["url1", "url2"]
│   │   ├── deliveryDate: 1699999999999
│   │   ├── createdAt: 1699999999999
│   │   └── updatedAt: 1699999999999
│   └── ...
│
├── inventory/
│   ├── INV1699999999999
│   │   ├── id: "INV1699999999999"
│   │   ├── name: "Cotton Fabric"
│   │   ├── category: "fabric"
│   │   ├── quantity: 100
│   │   ├── unit: "meters"
│   │   ├── minStock: 20
│   │   ├── lastRestocked: 1699999999999
│   │   ├── createdAt: 1699999999999
│   │   └── updatedAt: 1699999999999
│   └── ...
│
├── transactions/
│   ├── TXN1699999999999
│   │   ├── id: "TXN1699999999999"
│   │   ├── itemId: "INV1699999999999"
│   │   ├── itemName: "Cotton Fabric"
│   │   ├── type: "in" | "out"
│   │   ├── quantity: 50
│   │   ├── reason: "New stock arrival"
│   │   └── createdAt: 1699999999999
│   └── ...
│
└── tailors/
    ├── 1
    │   ├── id: "1"
    │   └── name: "Kumar"
    └── ...
```

### Storage Structure (Firebase Storage)

Photos are stored in Firebase Storage:

```
storage/
├── customers/
│   └── photos/
│       ├── 1699999999999_customer_photo.jpg
│       └── ...
│
├── orders/
│   ├── fabric/
│   │   ├── 1699999999999_fabric_photo.jpg
│   │   └── ...
│   └── design/
│       ├── 1699999999999_design_photo.jpg
│       └── ...
```

### Data Synchronization

The app uses **real-time synchronization**:
- Changes in Firestore are automatically reflected in the app
- Multiple users can work simultaneously
- Offline support with local caching
- Changes sync when connection is restored

### Offline Support

Firebase provides automatic offline persistence:
- Data is cached locally using IndexedDB
- App works offline with cached data
- Changes are queued and synced when online
- Conflicts are resolved automatically

---

## Security Rules (Production)

⚠️ **Important**: The current rules allow open access for development.

For production, update your Firestore rules to add authentication:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Only authenticated users can read/write
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

And Storage rules:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

---

## Monitoring & Analytics

### Firebase Console
- **Authentication**: Track user logins
- **Firestore**: Monitor database usage
- **Storage**: Track file uploads/downloads
- **Hosting**: View traffic and performance
- **Analytics**: User behavior (if enabled)

### Cost Monitoring
Firebase has a free tier (Spark Plan):
- Firestore: 1GB storage, 50K reads/day
- Storage: 5GB, 1GB/day downloads
- Hosting: 10GB/month

Monitor usage in Firebase Console to avoid unexpected costs.

---

## Troubleshooting

### Build Errors
```bash
# Clear cache and rebuild
rm -rf dist node_modules package-lock.json
npm install
npm run build
```

### Firebase Deploy Issues
```bash
# Re-authenticate
firebase logout
firebase login

# Check project
firebase use --add
```

### Capacitor Sync Issues
```bash
# Clean and rebuild
npx cap sync --force
npm run build
npm run cap:sync
```

### iOS CocoaPods Issues
```bash
cd ios/App
pod install --repo-update
cd ../..
```

---

## Next Steps

1. ✅ Configure Firebase project
2. ✅ Set up environment variables
3. ✅ Deploy to Firebase Hosting
4. ✅ Build mobile apps
5. 🔒 Add authentication (recommended)
6. 📊 Set up analytics
7. 🔔 Add push notifications
8. 🌐 Configure custom domain

---

## Support & Resources

- [Firebase Documentation](https://firebase.google.com/docs)
- [Capacitor Documentation](https://capacitorjs.com/docs)
- [Vite Documentation](https://vitejs.dev/)
- [React Documentation](https://react.dev/)

---

**Happy Deploying! 🚀**
