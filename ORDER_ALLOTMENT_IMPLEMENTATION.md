# Order Allotment Feature Implementation

## Overview
Implemented Order Allotment feature that allows admins to assign confirmed service orders to employees or vendors for job work, with automatic status updates and cost tracking.

---

## Implementation Status

### ✅ Completed:
1. **OrderAllotment Type Definition** - Added to types.ts
2. **Firestore Service** - Created orderAllotmentService.ts
3. **Auto-update Service Order Status** - Automatically updates to "jobwork"

### 🔄 In Progress:
4. **OrderAllotmentForm Component** - UI form for creating allotments
5. **OwnerDashboard Integration** - Add allotment management to dashboard

---

## Data Structure

### OrderAllotment Interface

```typescript
export interface OrderAllotment {
  id: string; // Job Work No (JOB0001, JOB0002, etc.)
  jobWorkDate: number; // Auto-set to current date
  serviceOrderNo: string; // Reference to Service Order ID
  customerName: string; // Denormalized from service order
  stitchingAllotment: StitchingAllotmentType; // 'employee' | 'vendor'
  assignedTo: string; // Employee ID or Vendor ID
  assignedName: string; // Employee/Vendor name (denormalized)
  materialCost: number; // Material cost in INR
  jobWorkCost: number; // Job work cost in INR
  expectedDeliveryDate: number; // Delivery date timestamp
  orderStatus: OrderTicketStatus; // 'open' | 'in-progress' | 'closed'
  serviceOrderStatus: ServiceOrderStatus; // Status to update in service order
  companyId: string; // Company unique ID
  adminId: string; // Admin user ID who created allotment
  createdAt: number;
  updatedAt: number;
}
```

### Supporting Types

```typescript
export type StitchingAllotmentType = 'employee' | 'vendor';
export type OrderTicketStatus = 'open' | 'in-progress' | 'closed';
```

---

## Firestore Structure

```
orderAllotment/
  JOB0001/
    id: "JOB0001"
    jobWorkDate: 1700000000000
    serviceOrderNo: "SO0001"
    customerName: "John Doe"
    stitchingAllotment: "employee"
    assignedTo: "EMP0001"
    assignedName: "Jane Smith"
    materialCost: 500
    jobWorkCost: 1500
    expectedDeliveryDate: 1700500000000
    orderStatus: "open"
    serviceOrderStatus: "jobwork"
    companyId: "COMP0001"
    adminId: "ADMIN001"
    createdAt: serverTimestamp
    updatedAt: serverTimestamp
```

---

## Firestore Service Functions

### orderAllotmentService.ts

**Functions Implemented:**

1. **`generateJobWorkId(companyId)`**
   - Auto-generates sequential job work IDs (JOB0001, JOB0002, etc.)
   - Scoped by company ID

2. **`addOrderAllotment(allotmentData, companyId, adminId)`**
   - Creates new order allotment in Firestore
   - Auto-generates job work ID
   - Updates service order status to 'jobwork'
   - Returns created allotment

3. **`getOrderAllotmentsByCompany(companyId)`**
   - Fetches all allotments for a company
   - Returns array of OrderAllotment objects

4. **`getOrderAllotment(allotmentId)`**
   - Fetches single allotment by ID
   - Returns OrderAllotment or null

5. **`updateOrderAllotment(allotmentId, allotmentData)`**
   - Updates allotment fields
   - Auto-updates updatedAt timestamp

6. **`updateOrderAllotmentStatus(allotmentId, status)`**
   - Updates order status (open/in-progress/closed)
   - Auto-updates updatedAt timestamp

7. **`deleteOrderAllotment(allotmentId)`**
   - Deletes allotment from Firestore

8. **`getOrderAllotmentsByServiceOrder(serviceOrderNo)`**
   - Fetches all allotments for a specific service order
   - Returns array of OrderAllotment objects

---

## Auto-Update Service Order Status

When an order allotment is created:

```typescript
await addOrderAllotment(allotmentData, companyId, adminId);
// Automatically updates service order status:
await updateServiceOrderStatus(serviceOrderNo, 'jobwork');
```

**Flow:**
```
Create Order Allotment
         ↓
Save to Firestore orderAllotment collection
         ↓
Auto-update Service Order status to 'jobwork'
         ↓
Service Order visible in "Job Work" status
```

---

## Form Fields (To Be Implemented)

### OrderAllotmentForm Component

**Fields:**

1. **Job Work No** - Auto-generated, read-only (JOB0001)
2. **Job Work Date** - Auto-set to today, read-only
3. **Service Order No** - Dropdown of confirmed orders (status: 'open' or 'allotment')
4. **Stitching Allotment** - Radio/Select: Employee or Vendor
5. **Employee/Tailor Name** - Dropdown (dynamically loaded based on selection)
   - If Employee → show employee list from Firestore
   - If Vendor → show vendor list from Firestore
6. **Material Cost** - Numeric input (INR)
7. **Job Work Cost** - Numeric input (INR)
8. **Expected Delivery Date** - Date picker
9. **Customer Name** - Hidden/Display only (auto-loaded from service order)
10. **Order Ticket Status** - Auto-set to 'open', can be updated later

**Validation:**
- ✅ Service order must be selected
- ✅ Stitching allotment type required
- ✅ Assigned employee/vendor required
- ✅ Material cost >= 0
- ✅ Job work cost >= 0
- ✅ Expected delivery date required
- ✅ Expected delivery date must be future date

---

## UI Flow

### Step 1: Service Order Confirmed
```
Service Order SO0001 created
Status: 'open'
```

### Step 2: Create Order Allotment
```
Admin clicks "Create Allotment"
   ↓
Select Service Order: SO0001
   ↓
Choose Stitching Allotment: Employee
   ↓
Select Employee: Jane Smith (EMP0001)
   ↓
Enter Material Cost: ₹500
   ↓
Enter Job Work Cost: ₹1500
   ↓
Select Delivery Date: Nov 30, 2025
   ↓
Click "Create Allotment"
```

### Step 3: Allotment Created
```
Job Work JOB0001 created
   ↓
Service Order SO0001 status → 'jobwork'
   ↓
Allotment saved to Firestore
   ↓
Success notification shown
```

---

## Benefits

### 1. **Automatic Status Updates**
- Service order status automatically changes to 'jobwork'
- No manual intervention needed

### 2. **Cost Tracking**
- Track material costs separately
- Track job work costs
- Easy calculation of total costs

### 3. **Employee/Vendor Assignment**
- Clear assignment tracking
- Workload distribution visible
- Performance tracking possible

### 4. **Ticket System**
- Open → In Progress → Closed workflow
- Clear status tracking
- Easy to filter and report

### 5. **Multi-tenancy Support**
- Company-scoped data
- Admin tracking
- Audit trail with createdAt/updatedAt

---

## Next Steps

### 1. Create OrderAllotmentForm Component
```tsx
- Form UI with all fields
- Dynamic employee/vendor dropdown
- Validation
- Submit handler
```

### 2. Integrate into OwnerDashboard
```tsx
- Add "Allotments" tab or section
- Display allotments list
- Create/Edit/Delete functionality
- Filter by status
```

### 3. Display in Service Orders
```tsx
- Show allotment button for eligible orders
- Display allotment status badge
- Link to allotment details
```

### 4. Reporting Dashboard
```tsx
- Active allotments count
- Employee/Vendor workload
- Cost summaries
- Delivery tracking
```

---

## Example Usage

### Creating an Allotment:

```typescript
const allotmentData = {
  jobWorkDate: Date.now(),
  serviceOrderNo: "SO0001",
  customerName: "John Doe",
  stitchingAllotment: "employee",
  assignedTo: "EMP0001",
  assignedName: "Jane Smith",
  materialCost: 500,
  jobWorkCost: 1500,
  expectedDeliveryDate: new Date('2025-11-30').getTime(),
  orderStatus: "open",
  serviceOrderStatus: "jobwork",
};

await addOrderAllotment(allotmentData, "COMP0001", "ADMIN001");
```

### Updating Status:

```typescript
await updateOrderAllotmentStatus("JOB0001", "in-progress");
```

### Fetching Allotments:

```typescript
const allotments = await getOrderAllotmentsByCompany("COMP0001");
console.log(`Found ${allotments.length} allotments`);
```

---

## Console Logging

```
[orderAllotmentService] Adding order allotment: {...}
[orderAllotmentService] Updated service order SO0001 status to 'jobwork'
[orderAllotmentService] Order allotment JOB0001 added successfully
[orderAllotmentService] Loaded 5 order allotments for company COMP0001
```

---

## Files Created/Modified

### Created:
1. `src/lib/firestore/orderAllotmentService.ts` - Firestore service
2. `ORDER_ALLOTMENT_IMPLEMENTATION.md` - This documentation

### Modified:
1. `src/lib/types.ts` - Added OrderAllotment types

### To Be Created:
1. `src/components/OrderAllotmentForm.tsx` - Form component
2. Integration in OwnerDashboard

---

## Summary

Successfully implemented the backend foundation for Order Allotment feature:

✅ **Type definitions** for OrderAllotment with all required fields
✅ **Firestore service** with CRUD operations and auto-ID generation
✅ **Auto-status update** for service orders when allotment created
✅ **Multi-tenancy support** with companyId and adminId
✅ **Comprehensive logging** for debugging
✅ **Sequential job work IDs** (JOB0001, JOB0002, etc.)

**Next:** Create UI components and integrate into dashboard!
