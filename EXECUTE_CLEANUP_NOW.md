# Execute Cleanup Now - Quick Start

## Fastest Way to Run Cleanup

### Via Browser Console (Easiest)

1. **Start your development server:**
   ```bash
   npm run dev
   ```

2. **Open the application in your browser**
   - Navigate to `http://localhost:5173` (or your dev URL)

3. **Open Browser Console:**
   - Press `F12` → Select "Console" tab
   - Or: Right-click → Inspect → Console

4. **Paste and Run This Command:**
   ```javascript
   import('src/lib/firestore/migrationService.js').then(m => {
     m.deleteStitchedOrdersFromOrderAllotment().then(result => {
       console.log('✅ Cleanup Complete!');
       console.log('Deleted:', result.deletedCount);
       console.log('Errors:', result.errors.length);
       if (result.errors.length > 0) {
         console.table(result.errors);
       }
     }).catch(e => console.error('❌ Error:', e));
   });
   ```

5. **Wait for completion** - You should see:
   ```
   ✅ Cleanup Complete!
   Deleted: [number]
   Errors: 0
   ```

---

## Alternative: Via Admin Component

### Step 1: Add Component to Your Route
Edit `src/App.tsx` or your routing file:

```tsx
import { AdminDataCleanup } from '@/components/AdminDataCleanup';

// Add this route
{
  path: '/admin/cleanup',
  element: <AdminDataCleanup />,
  requiredRole: 'admin'
}
```

### Step 2: Navigate to Cleanup Page
1. Go to: `http://localhost:5173/admin/cleanup`
2. Click "Check Stats" to verify
3. Click "Delete Stitched Orders" to run cleanup

---

## Verification After Cleanup

### Check 1: Browser Console
```javascript
import('src/lib/firestore/migrationService.js').then(m => {
  m.getCollectionStats().then(stats => {
    console.log('📊 Current Stats:');
    console.table(stats);
  });
});
```

Should show:
```
┌─────────────────────┬────────┐
│ (index)             │ Values │
├─────────────────────┼────────┤
│ orderAllotmentCount │ X      │
│ stitchedCount       │ 0      │ ← Should be 0
│ newOrdersCount      │ Y      │
└─────────────────────┴────────┘
```

### Check 2: Application
1. Reload the application (F5)
2. Go to "Job Work Tailor Dashboard"
3. Check "jobwork completed" card - should be empty ✅

### Check 3: Firebase Console
1. Open [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Go to Firestore Database
4. Navigate to `orderAllotment` collection
5. Add filter: `status == stitched`
6. Should show 0 results ✅

---

## What Happens During Cleanup

### Data Flow
```
1. Query all documents where status='stitched' in 'orderAllotment'
   ↓
2. Delete in batches of 500 documents
   ↓
3. Log progress and any errors
   ↓
4. Return results with count and error list
   ↓
5. Display before/after comparison
```

### Expected Results
```
Before:
  - orderAllotment: ~100 documents
  - stitched: ~50 documents
  
After:
  - orderAllotment: ~50 documents
  - stitched: 0 documents ✅
  - newOrders: (unchanged)
```

---

## If Something Goes Wrong

### Error: "deleteStitchedOrdersFromOrderAllotment is not defined"
**Solution:** 
- Ensure `migrationService.ts` is saved
- Restart dev server: `npm run dev`
- Try again

### Error: "Permission denied"
**Solution:**
- Check Firestore rules allow delete
- Ensure you're logged in as admin
- Check database connectivity

### Error: "Network error"
**Solution:**
- Check internet connection
- Verify Firebase project is active
- Restart dev server and try again

---

## One-Line Execution (Copy-Paste Ready)

If you want to just copy-paste ONE command:

### For Quick Check:
```javascript
fetch('/api/firestore-stats').then(r => r.json()).then(d => console.table(d));
```

### For Direct Cleanup (No UI):
```javascript
(async () => { 
  const { deleteStitchedOrdersFromOrderAllotment } = await import('src/lib/firestore/migrationService.ts');
  const result = await deleteStitchedOrdersFromOrderAllotment();
  console.log(`✅ Deleted ${result.deletedCount} orders. Errors: ${result.errors.length}`);
})();
```

---

## Step-by-Step Walkthrough

### Stage 1: Pre-Cleanup (5 seconds)
```javascript
// Check what we're about to delete
const { getCollectionStats } = await import('src/lib/firestore/migrationService.ts');
const before = await getCollectionStats();
console.log('Before:', before);
// Expected: { orderAllotmentCount: X, stitchedCount: Y, newOrdersCount: Z }
```

### Stage 2: Execute Cleanup (30-60 seconds)
```javascript
// Delete all stitched orders
const { deleteStitchedOrdersFromOrderAllotment } = await import('src/lib/firestore/migrationService.ts');
const result = await deleteStitchedOrdersFromOrderAllotment();
console.log(`✅ Cleanup done! Deleted: ${result.deletedCount}, Errors: ${result.errors.length}`);
```

### Stage 3: Post-Cleanup Verification (5 seconds)
```javascript
// Verify cleanup worked
const after = await getCollectionStats();
console.log('After:', after);
// Expected: { orderAllotmentCount: X-Y, stitchedCount: 0, newOrdersCount: Z }
```

---

## Real-World Example

### Before Cleanup
```
📊 Database State
orderAllotment collection:
  - Total documents: 150
  - Status "stitched": 45 ← These will be deleted
  - Status "in_progress": 30
  - Status "allotted": 75

Dashboard:
  "jobwork completed" card: Shows 45 orders
```

### Execute Cleanup
```
Running: deleteStitchedOrdersFromOrderAllotment()
⏳ Deleting batch 1/1 (45 documents)...
✅ Completed! Deleted: 45, Errors: 0
```

### After Cleanup
```
📊 Database State
orderAllotment collection:
  - Total documents: 105
  - Status "stitched": 0 ✅ GONE!
  - Status "in_progress": 30
  - Status "allotted": 75

Dashboard:
  "jobwork completed" card: Empty ✅
```

---

## Performance Notes

| Operation | Time | Notes |
|-----------|------|-------|
| Query stitched orders | 1-2s | Depends on collection size |
| Delete per batch (500) | 5-10s | Network latency included |
| Typical cleanup (50 orders) | 30s | One batch |
| Typical cleanup (500 orders) | 1-2m | Multiple batches |
| UI update after refresh | 2s | Browser re-renders |

---

## Next Steps After Cleanup

1. ✅ Run cleanup (this doc)
2. ⏳ Verify stats are correct
3. ⏳ Update components to use newOrderService
4. ⏳ Test order workflows
5. ⏳ Deploy to production

---

## Support

**Having issues?**
- Check `CLEANUP_EXECUTION_GUIDE.md` for detailed troubleshooting
- See `NEW_ORDER_MANAGEMENT_IMPLEMENTATION.md` for API documentation
- Check browser console (F12) for error messages
- Review Firestore rules: Firebase Console → Firestore → Rules

**Ready to proceed?** 👉 Run the cleanup command above! ✅
