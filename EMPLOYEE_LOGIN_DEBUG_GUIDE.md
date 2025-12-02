# Employee Login Debug Guide

## 🔍 Comprehensive Debugging Added

I've added detailed console logging throughout the employee login flow. Follow this guide to diagnose any issues with the first-login password change popup.

## 📋 Step-by-Step Debugging Process

### 1. Open Browser Developer Tools
- Press `F12` or right-click → Inspect
- Go to the **Console** tab
- Keep it open while testing

### 2. Attempt Employee Login

When you log in with an employee account, you should see these logs in order:

#### Expected Console Output:

```
=== LOGIN ATTEMPT ===
Username: [phone number]
Password: [password]
Checking Firestore for employee credentials...

[Employee Auth] Verifying credentials for: [phone number]
[Employee Auth] Query result - documents found: 1
[Employee Auth] Employee found: {
  id: "EMP0001",
  name: "Employee Name",
  contactNumber: "[phone]",
  firstLogin: true,    ← CRITICAL: Must be true for first login
  isActive: true,
  role: "manager"
}

[Auth] Found employee: { ... }
[Auth] Employee firstLogin status: true   ← Check this value!
[Auth] Employee isActive status: true
[Auth] Setting current employee in storage
[Auth] ✅ FIRST LOGIN DETECTED - Returning needsPasswordSetup=true

[Login] Login result: {
  success: true,
  needsPasswordSetup: true,
  isEmployee: true
}
[Login] Login successful
[Login] Password setup needed. isEmployee: true
[Login] ✅ Setting showEmployeePasswordSetup to TRUE

[Login] Modal render check - showEmployeePasswordSetup: true
[Login] Modal render check - employee: { ... }
[Login] ✅ RENDERING ChangePasswordDialog

[ChangePasswordDialog] Component mounted for employee: [name] ID: EMP0001
```

### 3. Common Issues and Solutions

#### Issue 1: "No employee found with these credentials"

**Cause:** Phone number or password doesn't match Firestore data

**Solution:**
```javascript
// Run this in browser console to check employee data:
const { collection, getDocs } = await import('firebase/firestore');
const { db } = await import('./src/lib/firebase');

const snapshot = await getDocs(collection(db, 'employees'));
snapshot.forEach(doc => {
  console.log(doc.id, doc.data());
});
```

**Check:**
- Is `contactNumber` stored as string or number?
- Does the password match exactly (case-sensitive)?

#### Issue 2: "firstLogin: false" or "firstLogin: undefined"

**Cause:** Employee document doesn't have `firstLogin: true`

**Solution:**
```javascript
// Update employee document in Firebase Console or via code:
const { doc, updateDoc } = await import('firebase/firestore');
const { db } = await import('./src/lib/firebase');

await updateDoc(doc(db, 'employees', 'EMP0001'), {
  firstLogin: true
});
```

#### Issue 3: "Employee account is not active"

**Cause:** `isActive: false` in employee document

**Solution:**
```javascript
// Activate employee in Firebase Console or via code:
const { doc, updateDoc } = await import('firebase/firestore');
const { db } = await import('./src/lib/firebase');

await updateDoc(doc(db, 'employees', 'EMP0001'), {
  isActive: true
});
```

#### Issue 4: Modal doesn't render despite logs showing it should

**Possible Causes:**
- CSS z-index issue
- Another modal/overlay blocking it
- React render timing issue

**Solution:**
Check these logs:
```
[Login] ✅ Setting showEmployeePasswordSetup to TRUE
[Login] Modal render check - showEmployeePasswordSetup: true
[Login] Modal render check - employee: [object]
[Login] ✅ RENDERING ChangePasswordDialog
[ChangePasswordDialog] Component mounted
```

If you see all these but no modal, check:
- Inspect element and search for "Welcome" text
- Check z-index in browser DevTools
- Look for any error messages in Console (red text)

#### Issue 5: ContactNumber type mismatch

**Problem:** Firestore stores phone as `number` but query uses `string`

**Check in Firestore Console:**
```
contactNumber: 9876543210  ← number (bad)
contactNumber: "9876543210" ← string (good)
```

**Fix:** Ensure all phone numbers are stored as strings

### 4. Manual Testing Steps

1. **Create a test employee** (as owner):
   - Login: `9486229273` / `password`
   - Go to Menu → Employees
   - Add employee with phone: `1111111111`
   - Note the auto-generated password (e.g., `ABC123XY`)

2. **Verify in Firestore Console:**
   - Go to Firebase Console → Firestore Database
   - Collection: `employees`
   - Find your employee document
   - Verify fields:
     ```json
     {
       "id": "EMP0001",
       "name": "Test Employee",
       "contactNumber": "1111111111",
       "password": "ABC123XY",
       "firstLogin": true,     ← Must exist and be true
       "isActive": true,       ← Must be true
       "companyId": "COMP0001",
       "companyDocId": "USER1",
       "role": "manager"
     }
     ```

3. **Logout and login as employee:**
   - Phone: `1111111111`
   - Password: `ABC123XY` (the auto-generated one)
   - Watch the console logs

4. **Expected behavior:**
   - Login succeeds
   - Password change dialog appears
   - Cannot dismiss or bypass it
   - Enter new password (min 8 chars)
   - Click "Set Password & Continue"
   - `firstLogin` updates to `false` in Firestore
   - Redirects to dashboard

### 5. Quick Firestore Queries

Run these in browser console to inspect data:

```javascript
// Check all employees
const { collection, getDocs } = await import('firebase/firestore');
const { db } = await import('./src/lib/firebase');

const emps = await getDocs(collection(db, 'employees'));
emps.forEach(doc => console.table(doc.data()));

// Check specific employee
const { doc, getDoc } = await import('firebase/firestore');
const empDoc = await getDoc(doc(db, 'employees', 'EMP0001'));
console.log('Employee data:', empDoc.data());

// Manually set firstLogin to true
const { updateDoc } = await import('firebase/firestore');
await updateDoc(doc(db, 'employees', 'EMP0001'), { firstLogin: true });
console.log('Updated firstLogin to true');
```

### 6. Network Tab Check

If Firestore queries fail:
1. Open DevTools → Network tab
2. Filter: `firestore`
3. Try login again
4. Look for failed requests (red)
5. Check response for error messages

Common issues:
- `PERMISSION_DENIED`: Check firestore.rules (currently open for dev)
- `NOT_FOUND`: Collection or document doesn't exist
- Network error: Check internet connection / Firebase config

## 🎯 Expected Flow Summary

1. **Employee created** → `firstLogin: true` set automatically
2. **Employee logs in** → Firestore query finds employee
3. **Check firstLogin** → If `true`, show password dialog
4. **Employee sets password** → Update Firestore: `firstLogin: false`
5. **Future logins** → Skip password dialog, go straight to dashboard

## 🔧 Reset Testing

To test again with the same employee:

```javascript
// Browser console
const { doc, updateDoc } = await import('firebase/firestore');
const { db } = await import('./src/lib/firebase');

await updateDoc(doc(db, 'employees', 'EMP0001'), {
  firstLogin: true,
  password: 'ABC123XY'  // Reset to auto-generated password
});
```

## 📝 Logging Legend

- `[Employee Auth]` - Employee service (Firestore queries)
- `[Auth]` - Authentication hook (use-auth.tsx)
- `[Login]` - Login component state management
- `[ChangePasswordDialog]` - Password change modal
- `✅` - Success / expected behavior
- `❌` - Failure / unexpected behavior

## Need More Help?

If the modal still doesn't show after following this guide:
1. Share the complete console output
2. Screenshot of Firestore employee document
3. Screenshot of Network tab showing Firestore requests
4. Any error messages in red
