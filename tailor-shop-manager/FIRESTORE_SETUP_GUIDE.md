# Firestore Integration Setup Guide

This guide will help you set up Firebase Firestore for the Tailor Shop Manager application.

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Firebase Project Setup](#firebase-project-setup)
3. [Install Firebase SDK](#install-firebase-sdk)
4. [Configure Environment Variables](#configure-environment-variables)
5. [Firestore Security Rules](#firestore-security-rules)
6. [Database Structure](#database-structure)
7. [Usage](#usage)

---

## Prerequisites

- A Google account
- Node.js and npm installed
- Basic knowledge of Firebase

---

## Firebase Project Setup

### Step 1: Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" or "Create a project"
3. Enter a project name (e.g., "Tailor Shop Manager")
4. Accept the terms and click "Continue"
5. Choose whether to enable Google Analytics (optional)
6. Click "Create project"

### Step 2: Register Your Web App

1. In the Firebase Console, click on the web icon (`</>`) to add a web app
2. Enter an app nickname (e.g., "Tailor Shop Web App")
3. Check "Also set up Firebase Hosting" if you want (optional)
4. Click "Register app"
5. Copy the Firebase configuration object - you'll need this later

### Step 3: Enable Firestore Database

1. In the Firebase Console, go to "Firestore Database" in the left sidebar
2. Click "Create database"
3. Choose "Start in test mode" (for development) or "Start in production mode"
   - **Test mode**: Open access for 30 days (good for development)
   - **Production mode**: Requires proper security rules (recommended)
4. Select a Firestore location (choose one closest to your users)
5. Click "Enable"

---

## Install Firebase SDK

Run the following command in your project root:

\`\`\`bash
npm install firebase
\`\`\`

---

## Configure Environment Variables

### Step 1: Create .env File

Copy the `.env.example` file to create a new `.env` file:

\`\`\`bash
cp .env.example .env
\`\`\`

### Step 2: Add Firebase Configuration

Open the `.env` file and replace the placeholder values with your actual Firebase config values:

\`\`\`env
VITE_FIREBASE_API_KEY=AIzaSyBxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
VITE_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789012
VITE_FIREBASE_APP_ID=1:123456789012:web:abcdef1234567890
\`\`\`

**Where to find these values:**
1. Go to Firebase Console > Project Settings (gear icon)
2. Scroll down to "Your apps" section
3. Click on the web app you created
4. Copy the config values from the `firebaseConfig` object

---

## Firestore Security Rules

### Development Rules (Test Mode)

For development, you can use these open rules:

\`\`\`javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
\`\`\`

### Production Rules (Recommended)

For production, use these secure rules:

\`\`\`javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Companies collection - only authenticated users can read/write their own company
    match /companies/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    // Employees collection - only the company owner can manage employees
    match /employees/{employeeId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null &&
                     request.resource.data.companyDocId == request.auth.uid;
      allow update, delete: if request.auth != null &&
                              resource.data.companyDocId == request.auth.uid;
    }
  }
}
\`\`\`

**To apply these rules:**
1. Go to Firestore Database in Firebase Console
2. Click on the "Rules" tab
3. Paste the rules above
4. Click "Publish"

---

## Database Structure

### Collections

#### 1. `companies` Collection

Each document uses the **User ID** as the document ID.

**Document Structure:**
\`\`\`javascript
{
  id: "COMP0001",                    // Auto-generated Company ID
  companyName: "ABC Tailors",
  aliasName: "ABC",
  businessType: "service",            // service | sales | sales_and_services
  productCategory: "Readymades",
  address1: "123 Main Street",
  address2: "Suite 100",
  city: "Mumbai",
  pincode: "400001",
  region: "West",
  state: "Maharashtra",
  country: "India",
  contactNumber: "9876543210",
  panNumber: "ABCDE1234F",
  udhyamMsmeNo: "UDYAM-MH-12-1234567",
  gstinNumber: "27ABCDE1234F1Z5",
  bankName: "State Bank of India",
  accountNumber: "1234567890",
  accountHolderName: "ABC Tailors",
  branchName: "Main Branch",
  ifscCode: "SBIN0001234",
  bankContactNumber: "0221234567",
  createdAt: 1700000000000,
  updatedAt: 1700000000000
}
\`\`\`

#### 2. `employees` Collection

Each document uses an auto-generated **Employee ID** as the document ID.

**Document Structure:**
\`\`\`javascript
{
  id: "EMP0001",                     // Auto-generated Employee ID
  name: "John Doe",
  email: "john@example.com",
  contactNumber: "9876543210",
  role: "manager",                    // manager | accountant | staff | other
  designation: "Store Manager",
  joiningDate: 1700000000000,
  accessPermissions: [
    "view_orders",
    "create_orders",
    "manage_inventory"
  ],
  isActive: true,
  companyId: "COMP0001",             // Reference to company
  companyDocId: "user123",           // User ID of company owner
  password: "ABC123XY",              // Auto-generated password
  createdAt: 1700000000000,
  updatedAt: 1700000000000
}
\`\`\`

---

## Usage

### Company Profile

The application now has two versions of the Company Profile component:

1. **CompanyProfile.tsx** - Uses local storage (original)
2. **CompanyProfileFirestore.tsx** - Uses Firestore (new)

To use Firestore version, update `App.tsx`:

\`\`\`tsx
// Replace this line:
import { CompanyProfile } from '@/components/CompanyProfile';

// With this:
import { CompanyProfile } from '@/components/CompanyProfileFirestore';
\`\`\`

### Employee Management

Similarly, for Employee Management:

1. **EmployeeManagement.tsx** - Uses local storage (original)
2. **EmployeeManagementFirestore.tsx** - Uses Firestore (new)

To use Firestore version, update `App.tsx`:

\`\`\`tsx
// Replace this line:
import { EmployeeManagement } from '@/components/EmployeeManagement';

// With this:
import { EmployeeManagement } from '@/components/EmployeeManagementFirestore';
\`\`\`

### Features

#### Company Profile
- Auto-generates Company ID (COMP0001, COMP0002, etc.)
- Validates GSTIN, PAN, IFSC, and Pincode
- Stores company information and bank account details
- Links profile to authenticated user

#### Employee Management
- Auto-generates Employee ID (EMP0001, EMP0002, etc.)
- **Auto-generates 8-character password** for each employee
- Displays password in a modal after creation
- Allows password reset with new auto-generated password
- Shows employee password in the employee list
- Links employees to their company using both Company ID and Company Document ID
- Supports role-based access permissions
- Active/Inactive status toggle

---

## API Functions

### Company Service (`src/lib/firestore/companyService.ts`)

\`\`\`typescript
// Save or update company profile
await saveCompanyProfile(userId, profileData);

// Get company profile by user ID
await getCompanyProfile(userId);

// Get company by company ID
await getCompanyByCompanyId(companyId);

// Delete company profile
await deleteCompanyProfile(userId);
\`\`\`

### Employee Service (`src/lib/firestore/employeeService.ts`)

\`\`\`typescript
// Add new employee (password auto-generated)
const employee = await addEmployee(companyDocId, companyId, employeeData);
console.log('Employee password:', employee.password);

// Update employee
await updateEmployee(employeeId, updatedData);

// Get all employees for a company
const employees = await getEmployeesByCompany(companyDocId);

// Get single employee
const employee = await getEmployee(employeeId);

// Delete employee
await deleteEmployee(employeeId);

// Toggle employee active status
await toggleEmployeeStatus(employeeId, isActive);

// Reset employee password (returns new password)
const newPassword = await resetEmployeePassword(employeeId);

// Generate a new password manually
const password = generateEmployeePassword();
\`\`\`

---

## Troubleshooting

### Issue: "Firebase initialization error"

**Solution:** Check that all environment variables in `.env` are correctly set and the file is in the project root.

### Issue: "Permission denied" errors

**Solution:** Check your Firestore security rules. Make sure they allow the operations you're trying to perform.

### Issue: "User not authenticated"

**Solution:** Ensure the user is logged in before trying to save/load profiles or employees.

### Issue: "Company profile not found"

**Solution:** Make sure to create a company profile before adding employees. The employee service requires a valid company ID.

---

## Best Practices

1. **Always create a company profile first** before adding employees
2. **Save employee passwords securely** - they are displayed only once during creation
3. **Use production security rules** when deploying
4. **Back up your Firestore data** regularly
5. **Monitor Firestore usage** to stay within free tier limits

---

## Migration from Local Storage

If you have existing data in local storage and want to migrate to Firestore:

1. Export data from local storage (use browser console):
   \`\`\`javascript
   console.log(JSON.stringify(localStorage));
   \`\`\`

2. Save the output

3. Manually create documents in Firestore using the Firebase Console or write a migration script

---

## Support

For more information:
- [Firebase Documentation](https://firebase.google.com/docs)
- [Firestore Documentation](https://firebase.google.com/docs/firestore)
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started)

---

## License

This project uses Firebase, which has its own terms of service. Make sure to comply with Firebase's terms and pricing.
