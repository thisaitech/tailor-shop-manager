# 📦 Inventory System - How It Works

## Overview
The inventory system now tracks materials used by each tailor in real-time. When you create an order and assign materials, the system automatically:
1. Deducts materials from inventory
2. Creates transaction records
3. Links materials to the tailor and order

---

## How to Use the Inventory System

### 1. Add Inventory Items First

**Go to: Inventory Tab → Add Item**

Add your materials:
- Fabric (Cotton, Silk, etc.)
- Thread (different colors)
- Buttons
- Zippers
- Other accessories

Example:
```
Name: Blue Cotton Fabric
Category: Fabric
Quantity: 50
Unit: Meter
Min Quantity: 10
```

---

### 2. Create an Order with Materials

**Go to: Dashboard → Orders → New Order**

Steps:
1. **Select Customer**
2. **Upload Photos** (fabric/design)
3. **Select Materials Used** (NEW FEATURE!)
   - Click "Materials Used" section
   - Select material from dropdown
   - Enter quantity (e.g., 2.5 meters)
   - Click + to add
   - Add multiple materials if needed
4. **Assign Tailor**
5. **Set Delivery Date**
6. **Save Order**

---

### 3. What Happens Automatically

When you save the order:

✅ **Inventory Updated**
- Materials are deducted from stock
- Example: 50m → 47.5m (if you used 2.5m)

✅ **Transaction Created**
- Records who used what
- Shows tailor name
- Links to order ID

✅ **Real-time Sync**
- Updates across all devices instantly
- Mobile and web both see changes

---

## View Inventory Usage

### See All Transactions

**Go to: Inventory Tab → Recent Transactions**

You'll see:
- Material name
- Quantity used (+/-)
- Reason (e.g., "Used for order ORD...")
- **Tailor name** (who used it)
- Order ID
- Date and time

Example Transaction:
```
Blue Cotton Fabric
-2.5 meters
Tailor: Kumar
Order: ORD1731343...
Used for order ORD1731343...
Nov 11, 2025 5:30 PM
```

---

### Filter by Tailor

**Go to: Track Orders Tab**

Now you can:
- Filter by Tailor to see all their orders
- Each order shows materials used
- Track which tailor uses which materials

---

## Inventory Levels

### Low Stock Alerts

The system shows:
- 🟢 **In Stock**: quantity > minQuantity
- 🟡 **Low Stock**: quantity ≤ minQuantity
- 🔴 **Out of Stock**: quantity = 0

### Restock Items

**Inventory Tab → Click item → Update Stock**

1. Select "Stock In"
2. Enter quantity
3. Add reason (e.g., "New purchase from supplier")
4. Save

---

## Real-World Example

### Scenario: Kumar Creates a Shirt Order

1. **Customer**: John Doe needs a shirt
2. **Materials Needed**:
   - 2 meters Blue Cotton Fabric
   - 1 spool White Thread
   - 6 pieces Buttons

3. **Create Order**:
   - Select John Doe
   - In "Materials Used":
     * Add: Blue Cotton Fabric (2 meters)
     * Add: White Thread (1 spool)
     * Add: Buttons (6 pieces)
   - Assign to: Kumar
   - Save

4. **What Happens**:
   ```
   Inventory Changes:
   - Blue Cotton Fabric: 50m → 48m
   - White Thread: 10 spools → 9 spools
   - Buttons: 100 pieces → 94 pieces
   
   Transactions Created:
   1. Blue Cotton -2m (Kumar, ORD123...)
   2. White Thread -1 spool (Kumar, ORD123...)
   3. Buttons -6 pieces (Kumar, ORD123...)
   ```

5. **Track Usage**:
   - View transactions to see Kumar used these materials
   - Filter orders by Kumar to see all his work
   - Check inventory to see current stock levels

---

## Benefits

### ✅ Automatic Tracking
- No manual stock updates needed
- Every order creates transactions automatically

### ✅ Tailor Accountability
- See which tailor used which materials
- Track material usage per tailor
- Identify who uses most materials

### ✅ Real-time Updates
- Inventory syncs across all devices
- Mobile and web stay in sync
- See changes instantly

### ✅ Stock Management
- Low stock alerts
- Track when to reorder
- Prevent running out of materials

### ✅ Order History
- Every material usage linked to order
- Trace materials used for any order
- Full audit trail

---

## Tips

### 1. Add Materials (Optional)
- You can create orders without selecting materials
- Materials tracking is optional
- Use it when you want precise tracking

### 2. Keep Inventory Updated
- Add new materials as you buy them
- Set correct minimum quantities
- Restock when low

### 3. Monitor Transactions
- Check "Recent Transactions" regularly
- Verify materials are being deducted correctly
- Track tailor usage patterns

### 4. Use Filters
- Filter orders by tailor to see their workload
- Check transaction history for specific materials
- Review low stock items

---

## Common Questions

**Q: What if I don't select materials for an order?**
A: That's fine! Material selection is optional. The order will still be created normally.

**Q: Can I add materials after creating an order?**
A: Not directly. You would need to manually add a "Stock Out" transaction to record it.

**Q: What happens if I don't have enough stock?**
A: The system will warn you and won't let you select more than available.

**Q: Can I see total materials used by each tailor?**
A: Yes! Filter transactions or orders by tailor name to see their usage.

**Q: Does this work on mobile?**
A: Yes! All features work on both web and mobile apps with real-time sync.

---

## Quick Reference

### Workflow Summary
```
1. Add Inventory Items
   ↓
2. Create Order → Select Materials
   ↓
3. System Auto-deducts Stock
   ↓
4. Creates Transaction (with tailor name)
   ↓
5. View in Transaction History
   ↓
6. Track by Tailor in Orders
```

### Key Features
- ✅ Material selection in order form
- ✅ Auto inventory deduction
- ✅ Tailor name in transactions
- ✅ Real-time sync
- ✅ Filter orders by tailor
- ✅ Low stock alerts
- ✅ Transaction history

---

**Your inventory system is now smart and automatic! It tracks everything for you in real-time.** 🎉
