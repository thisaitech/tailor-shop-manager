# Firestore Customer & Service Order Testing Guide

## Prerequisites
Make sure you have employee accounts set up in Firestore with `companyId`.

## Test Accounts (Already Set Up)

### Company 1: Sandra Tailor Shop
- **Phone/Username**: `7373333273`
- **Password**: `sandra123`
- **Company ID**: Should be auto-assigned when created

### Company 2: Thisai Technologies Tailor
- **Phone/Username**: `9486229273`
- **Password**: `password`
- **Company ID**: Should be auto-assigned when created

---

## How to Test Firestore Integration

### Step 1: Check if Employee Account Has CompanyId

1. **Open Browser Console** (F12)
2. **Login** with one of the test accounts above
3. **Check the console logs** for:
   ```
   [OwnerDashboard] Loading data for company: <companyId>
   ```
4. If you see `[OwnerDashboard] No company ID available`, the employee doesn't have a `companyId`

### Step 2: Verify Employee Data in Firestore

1. Go to **Firebase Console** → **Firestore Database**
2. Look for the `employees` collection
3. Find your employee document (by phone number)
4. Check if it has:
   - ✅ `companyId` field (string)
   - ✅ `companyDocId` field (string)
   - ✅ `isActive: true`
   - ✅ `accessPermissionEnabled: true`

### Step 3: Test Customer Creation

1. **Login** with employee account
2. Navigate to **Dashboard** tab
3. Click **"New Customer"** button (+ icon in Customers section)
4. Fill in customer details:
   - Customer Name: "Test Customer"
   - Contact Number: "9876543210"
   - City: "Chennai"
   - Gender: Male
5. Click **Save**
6. **Check Browser Console** for:
   ```
   [OwnerDashboard] Adding customer with all data including measurements: {...}
   Customer added successfully: CUST0001
   ```
7. **Check Firestore**:
   - Go to `customers` collection
   - Find document with ID `CUST0001`
   - Verify it has `companyId` and `adminId` fields

### Step 4: Test Service Order Creation

1. In **Dashboard** tab, click **"New Order"** button (+ icon in Orders section)
2. Select the customer you just created
3. Fill in service order details:
   - Order Category: Male
   - Order Qty: 1
   - Stitching Cost: 500
   - Expected Delivery Date: (pick a future date)
   - Reference: "Test order"
4. Click **"Confirm Order"**
5. **Check Browser Console** for:
   ```
   [OwnerDashboard] Adding service order: {...}
   Service order added successfully: SO0001
   ```
6. **Check Firestore**:
   - Go to `serviceOrders` collection
   - Find document with ID `SO0001`
   - Verify it has `companyId` and `adminId` fields

---

## Troubleshooting

### Problem: "Company Account Required" Error

**Cause**: Employee doesn't have `companyId` in Firestore

**Solution**:
1. Go to Firebase Console → Firestore
2. Find your employee in `employees` collection
3. Manually add `companyId` field (e.g., `COMP001`)
4. Refresh the app and login again

### Problem: "User authentication error" Toast

**Cause**: `companyId` or `adminId` is empty

**Solution**:
1. Check browser console for the exact error
2. Verify employee has both `companyId` and valid `id` field
3. Make sure you're logged in as an employee, not a regular user

### Problem: Data Not Saving to Firestore

**Cause**: Firebase permissions or configuration issue

**Solution**:
1. Check Firebase Console → Firestore → Rules
2. Ensure write permissions are enabled for authenticated users
3. Check browser console for Firebase errors (e.g., permission denied)

### Problem: Customer/Order Not Loading

**Cause**: Firestore query not returning data

**Solution**:
1. Check browser console for:
   ```
   [OwnerDashboard] Loaded customers: 0
   [OwnerDashboard] Loaded service orders: 0
   ```
2. Verify data exists in Firestore with matching `companyId`
3. Check Firestore indexes if you get an index error

---

## Quick Debug Commands

### Check Current User Session

Open browser console and run:
```javascript
// Check localStorage for current employee
JSON.parse(localStorage.getItem('current_employee'))

// Check for companyId
JSON.parse(localStorage.getItem('current_employee'))?.companyId

// Check for adminId
JSON.parse(localStorage.getItem('current_employee'))?.id
```

### Check if Data is in Firestore

1. Firebase Console → Firestore Database
2. Check collections:
   - `employees` - Should have employee records
   - `customers` - Should have customer records after creation
   - `serviceOrders` - Should have service order records after creation

---

## Expected Data Flow

```
1. Login with employee credentials
   ↓
2. useAuth returns { employee: { id, companyId, ... } }
   ↓
3. OwnerDashboard extracts companyId and adminId
   ↓
4. useEffect loads customers and serviceOrders from Firestore
   ↓
5. User creates customer/order → Firestore service called
   ↓
6. Data saved to Firestore with companyId and adminId
   ↓
7. Local state updated with new data
```

---

## Next Steps After Successful Test

Once you verify everything works:
1. ✅ Customer data saves to Firestore `customers` collection
2. ✅ Service order data saves to Firestore `serviceOrders` collection
3. ✅ Data loads correctly on dashboard
4. ✅ Each record has proper `companyId` and `adminId` fields

You can then:
- Add more customers and test bulk operations
- Test customer edit and delete functions
- Test service order status updates
- Deploy to production
