# Installation Commands

## Quick Start

Follow these commands in order to set up Firestore integration:

### 1. Install Firebase SDK

```bash
npm install firebase
```

### 2. Set Up Environment Variables

```bash
# Copy the example file
cp .env.example .env

# Then edit .env with your Firebase credentials
# You can use any text editor:
notepad .env
# or
code .env
```

### 3. Verify Installation

```bash
# Check if firebase is installed
npm list firebase

# Should show something like:
# firebase@10.x.x
```

### 4. Start Development Server

```bash
npm run dev
```

## Environment Variables

Add these to your `.env` file:

```env
VITE_FIREBASE_API_KEY=your-api-key-here
VITE_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
```

## Getting Firebase Credentials

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project (or create a new one)
3. Click the gear icon ⚙️ → Project Settings
4. Scroll to "Your apps" section
5. Click on your web app or create one
6. Copy the config values to your `.env` file

## Update App.tsx

To use Firestore components, update your `src/App.tsx`:

```tsx
// Find and replace these imports:

// OLD (localStorage version):
import { CompanyProfile } from '@/components/CompanyProfile';
import { EmployeeManagement } from '@/components/EmployeeManagement';

// NEW (Firestore version):
import { CompanyProfile } from '@/components/CompanyProfileFirestore';
import { EmployeeManagement } from '@/components/EmployeeManagementFirestore';
```

## Verification Steps

1. **Check Firebase is installed:**
   ```bash
   npm list firebase
   ```

2. **Check environment variables are loaded:**
   - Open browser console (F12)
   - Look for "Firebase initialized successfully" message
   - If you see initialization errors, check your `.env` file

3. **Test the features:**
   - Login as owner (phone: 9486229273, password: password)
   - Click menu (hamburger icon) → Profile
   - Fill in company details and save
   - Go back and click menu → Employees
   - Add a new employee
   - You should see the auto-generated password in a modal

## Common Issues

### Issue: Firebase not installed
```bash
# Solution:
npm install firebase
```

### Issue: Environment variables not loading
```bash
# Make sure .env file is in the project root
ls -la .env  # Linux/Mac
dir .env     # Windows

# Restart dev server after changing .env
npm run dev
```

### Issue: CORS errors
```
# Make sure to configure Firestore security rules
# See FIRESTORE_SETUP_GUIDE.md for details
```

## Build for Production

```bash
# Build the app
npm run build

# Preview production build
npm run preview
```

## Additional Commands

```bash
# Lint the code
npm run lint

# Type check
npm run build

# Kill dev server (if stuck)
npm run kill
```

## File Structure After Installation

```
tailor-shop-manager/
├── src/
│   ├── lib/
│   │   ├── firebase.ts                    # Firebase config
│   │   └── firestore/
│   │       ├── companyService.ts          # Company CRUD operations
│   │       └── employeeService.ts         # Employee CRUD + password gen
│   └── components/
│       ├── CompanyProfile.tsx              # Original (localStorage)
│       ├── CompanyProfileFirestore.tsx     # New (Firestore)
│       ├── EmployeeManagement.tsx          # Original (localStorage)
│       └── EmployeeManagementFirestore.tsx # New (Firestore)
├── .env                                    # Your Firebase credentials
├── .env.example                            # Template
├── FIRESTORE_SETUP_GUIDE.md               # Detailed setup guide
├── FIRESTORE_IMPLEMENTATION_SUMMARY.md    # Implementation details
└── INSTALLATION_COMMANDS.md               # This file
```

## Next Steps

1. ✅ Install Firebase: `npm install firebase`
2. ✅ Create `.env` file with Firebase credentials
3. ✅ Update `App.tsx` to use Firestore components
4. ✅ Start dev server: `npm run dev`
5. ✅ Test the application
6. ✅ Deploy to production

## Support

For detailed setup instructions, see:
- `FIRESTORE_SETUP_GUIDE.md` - Complete Firebase setup
- `FIRESTORE_IMPLEMENTATION_SUMMARY.md` - Implementation overview

---

Happy coding! 🚀
