# 🚀 Quick Start Guide

## Prerequisites
- Node.js (v18 or higher)
- npm or yarn
- Firebase account
- (Optional) Android Studio for Android app
- (Optional) Xcode for iOS app (macOS only)

## 1. Install Dependencies

```bash
npm install
```

## 2. Firebase Setup

### Create Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project
3. Enable Firestore Database
4. Enable Firebase Storage
5. Enable Firebase Hosting

### Configure Environment
```bash
# Copy environment template
cp .env.example .env

# Edit .env with your Firebase credentials
```

Get your Firebase config from:
- Firebase Console → Project Settings → Your apps → Web app

## 3. Run Development Server

```bash
npm run dev
```

Visit: `http://localhost:5173`

## 4. Deploy to Firebase

### First Time Setup
```bash
# Login to Firebase
firebase login

# Initialize Firebase (if not already done)
firebase init

# Select: Firestore, Hosting, Storage
```

### Deploy
```bash
# Build and deploy
npm run firebase:deploy
```

Your app will be live at: `https://your-project-id.web.app`

## 5. Build Mobile App (Optional)

### Android
```bash
# Add Android platform
npm run cap:add:android

# Sync assets
npm run cap:sync

# Open in Android Studio
npm run cap:open:android
```

### iOS (macOS only)
```bash
# Add iOS platform
npm run cap:add:ios

# Sync assets
npm run cap:sync

# Open in Xcode
npm run cap:open:ios
```

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run firebase:deploy` | Build and deploy to Firebase |
| `npm run cap:sync` | Sync web assets to mobile apps |
| `npm run cap:open:android` | Open Android project |
| `npm run cap:open:ios` | Open iOS project |

## 📚 Documentation

- [Full Deployment Guide](./DEPLOYMENT_GUIDE.md) - Complete Firebase and mobile setup
- [Mobile App Guide](./MOBILE_APP_GUIDE.md) - Mobile app development details
- [PRD](./PRD.md) - Product requirements document

## 🔐 Security Note

The default Firebase rules allow open access for development. Before deploying to production:

1. Update `firestore.rules` to require authentication
2. Update `storage.rules` to require authentication
3. Enable Firebase Authentication
4. Deploy updated rules: `firebase deploy --only firestore:rules,storage`

## 💡 Tips

- Use Chrome DevTools to test PWA features
- Test offline mode by disabling network in DevTools
- Use Firebase Emulator Suite for local development
- Monitor usage in Firebase Console

## 🐛 Troubleshooting

### Build fails
```bash
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Firebase deployment fails
```bash
firebase logout
firebase login
firebase use --add
```

### Capacitor sync issues
```bash
npm run build
npx cap sync --force
```

## 🌟 Features

- ✅ Customer management
- ✅ Order tracking
- ✅ Inventory management
- ✅ Photo gallery for designs
- ✅ Multi-language support (English, Tamil, Hindi)
- ✅ Offline support
- ✅ Real-time data sync
- ✅ Progressive Web App (PWA)
- ✅ Native mobile apps (iOS & Android)

## 📱 PWA Installation

Your app can be installed on:
- Desktop browsers (Chrome, Edge, Safari)
- Android devices
- iOS devices (Add to Home Screen)

## 🤝 Support

For issues or questions:
1. Check [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)
2. Review Firebase documentation
3. Check Capacitor documentation

---

**Built with ❤️ using React, Vite, Firebase, and Capacitor**
