# Order Data Cleanup - Execution Guide

## Quick Start

### Step 1: Access the Cleanup Tool
1. Start your application (`npm run dev`)
2. Navigate to: `/admin/cleanup` (you may need to add this route)
3. Or access through Admin Dashboard > Data Management > Cleanup

### Step 2: Check Current Status
```
Click "Check Stats" button
```
Expected output:
```
Order Allotments: [X number]
Stitched Orders: [Y number]  ← This should be reduced to 0
New Orders: [Z number]
```

### Step 3: Execute Cleanup
```
Click "Delete Stitched Orders" button
```
The system will:
1. Query all documents with status='stitched' in orderAllotment collection
2. Delete them in batches (500 at a time)
3. Show completion status with before/after statistics
4. Display any errors that occurred

### Step 4: Verify Success
- Before/After comparison should show:
  - Stitched count: [Y] → 0
  - orderAllotment count should decrease by Y
- "jobwork completed" card in dashboard should now be empty

---

## Command Line Alternative

If you need to run cleanup via script:

### Option 1: Direct Function Call in Console
```javascript
import { deleteStitchedOrdersFromOrderAllotment } from '@/lib/firestore/migrationService';

const result = await deleteStitchedOrdersFromOrderAllotment();
console.log(`Deleted ${result.deletedCount} orders`);
console.log(`Errors: ${result.errors.length}`);
```

### Option 2: Create an Admin Script
Add this to your `src/scripts/` directory and run via `node`:

```typescript
// scripts/cleanup-stitched-orders.ts
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { deleteStitchedOrdersFromOrderAllotment, getCollectionStats } from '@/lib/firestore/migrationService';

const firebaseConfig = {
  // Your Firebase config
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function runCleanup() {
  try {
    console.log('Getting collection stats...');
    const statsBefore = await getCollectionStats();
    console.log('Stats Before:', statsBefore);

    console.log('\nStarting cleanup...');
    const result = await deleteStitchedOrdersFromOrderAllotment();
    
    console.log('\nCleanup Results:');
    console.log(`Deleted: ${result.deletedCount}`);
    console.log(`Errors: ${result.errors.length}`);

    const statsAfter = await getCollectionStats();
    console.log('\nStats After:', statsAfter);
  } catch (error) {
    console.error('Cleanup failed:', error);
  }
}

runCleanup();
```

---

## Database Backup (Recommended Before Cleanup)

### Firebase Console Backup
1. Go to Firebase Console
2. Select your project
3. Navigate to Firestore Database
4. Click "Backups" (or "Data Management")
5. Create a backup of `orderAllotment` collection
6. Note the backup ID for recovery if needed

### Manual Backup via Code
```typescript
import { getDocs, collection } from 'firebase/firestore';

async function backupOrderAllotments() {
  const snapshot = await getDocs(collection(db, 'orderAllotment'));
  const data = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
  
  // Save to file or export
  console.log(JSON.stringify(data, null, 2));
}
```

---

## Troubleshooting

### Issue: "Check Stats" shows incorrect numbers

**Solution:**
1. Clear browser cache (Ctrl+Shift+Delete)
2. Hard refresh (Ctrl+F5)
3. Check Firestore rules allow read access
4. Verify database connectivity

### Issue: Cleanup starts but doesn't complete

**Solution:**
1. Check browser console for errors (F12)
2. Verify internet connection
3. Check Firestore quota/limits
4. Try again with smaller batch size

### Issue: Some orders failed to delete

**Solution:**
1. Review error list showing which orders failed
2. Check Firestore permissions for those documents
3. Manually delete failed orders via Firebase Console
4. Re-run cleanup for remaining orders

### Issue: "jobwork completed" card still shows data after cleanup

**Solution:**
1. Verify cleanup completed (check result message)
2. Clear app cache: `localStorage.clear()`
3. Close and reopen application
4. Check that JobWorkTailorDashboard component uses newOrderService
5. Manually check Firestore: orderAllotment collection → filter by status=stitched (should be empty)

---

## What Gets Deleted

### Documents Deleted
- All documents in `orderAllotment` collection where `status === 'stitched'`

### Data NOT Affected
- ✅ `newOrders` collection (unchanged)
- ✅ `orderHistory` collection (unchanged)
- ✅ `serviceOrders` collection (unchanged)
- ✅ All customer data (unchanged)
- ✅ All payment records (unchanged)
- ✅ Goods receipt data (unchanged)

### Side Effects
- ❌ Components that reference `orderAllotment` with stitched status will stop showing those orders
- ✅ New orders will use `newOrders` collection
- ✅ History is preserved in `orderHistory` collection

---

## Post-Cleanup Steps

### 1. Verify UI Components
- [ ] Dashboard loads without errors
- [ ] "jobwork completed" card is empty
- [ ] All order cards display correctly
- [ ] No console errors

### 2. Update Components
Update the following components to use `newOrderService`:
```
- JobWorkTailorDashboard.tsx
- JobWorkFilteredOrders.tsx
- JobworkCompletedOrdersList.tsx
- OwnerDashboard.tsx
```

### 3. Test Workflows
- [ ] Create a new order
- [ ] Assign to vendor
- [ ] Vendor accepts order
- [ ] Vendor marks job completed
- [ ] Order moves through complete workflow
- [ ] History entries are created

---

## Performance Impact

### During Cleanup
- May see slight slowdown while queries run
- Batch operations (500 at a time) minimize memory usage
- Typical cleanup time: 30-60 seconds for 100+ orders

### After Cleanup
- ✅ Faster queries (fewer documents in orderAllotment)
- ✅ Cleaner codebase (using single newOrders collection)
- ✅ Better organization (status names standardized)
- ✅ Audit trail (orderHistory tracks all changes)

---

## Rollback (If Something Goes Wrong)

### From Firebase Backup
1. If you created a backup: restore from backup (see Firebase docs)
2. Re-run with corrected logic
3. Test in dev environment first

### Manual Recovery
If backup not available:
```typescript
// 1. Get deleted order data from orderHistory
const history = await getOrderHistory(orderId);
const lastStitchedEntry = history.find(h => h.status === 'stitched');

// 2. Recreate order in orderAllotment if needed
// 3. Or create in newOrders with migration logic
```

---

## Success Checklist

- [ ] Backup created (recommended)
- [ ] Cleanup component accessible
- [ ] Stats checked and noted
- [ ] Cleanup executed successfully
- [ ] Before/After stats verified
- [ ] "jobwork completed" card is empty
- [ ] No errors in browser console
- [ ] Components updated to use newOrderService
- [ ] All workflows tested
- [ ] Team notified of changes

---

## Questions?

See `NEW_ORDER_MANAGEMENT_IMPLEMENTATION.md` for:
- Detailed API documentation
- Status workflow diagrams
- Service method signatures
- Implementation examples

Contact your development team if issues persist.
