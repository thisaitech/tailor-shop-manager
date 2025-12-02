# New Order Management System - Implementation Guide

## Overview

This document outlines the new unified order management system that consolidates all order operations into the **`newOrders`** collection, replacing the fragmented `orderAllotment` system.

## Key Changes

### 1. **Collections Structure**

#### `newOrders` Collection
The primary collection for managing all orders with complete lifecycle tracking.

**Schema:**
```typescript
{
  id: string;
  serviceOrderId: string;
  customerId: string;
  companyId: string;
  
  // Assignment tracking
  assignedBy?: { userId: string; userName: string; userRole: 'employee' | 'vendor' | 'admin' };
  assignedTo?: { userId: string; userName: string; userRole: 'employee' | 'vendor' | 'admin' };
  
  // Status workflow
  status: OrderStatus;
  previousStatus?: OrderStatus;
  
  // Dates
  createdAt: Timestamp;
  updatedAt: Timestamp;
  dueDate?: Timestamp;
  overdueAt?: Timestamp;
  
  // Order details
  orderAmount?: number;
  advancePayment?: number;
  remainingPayment?: number;
  paymentStatus?: 'pending' | 'partial' | 'completed';
  
  // Job work specific
  isJobWork?: boolean;
  vendorId?: string;
  
  // Goods receipt
  goodsReceiptId?: string;
  goodsReceiptDate?: Timestamp;
  
  // Additional metadata
  remarks?: string;
  rejectionReason?: string;
  isOverdue?: boolean;
  
  // Status transition timestamps
  statusHistory?: {
    [key in OrderStatus]?: Timestamp;
  };
}
```

#### `orderHistory` Collection
Tracks all changes and actions on orders for audit trail.

**Schema:**
```typescript
{
  id: string;
  orderId: string;
  status: OrderStatus;
  action: string;
  performedBy: { userId: string; userName: string; userRole: 'employee' | 'vendor' | 'admin' };
  metadata?: Record<string, any>;
  createdAt: Timestamp;
  timestamp: number;
}
```

---

## Order Statuses (9 Status Workflow)

### 1. **Open** (`open`)
- **State**: Order created but not yet assigned
- **Who**: Any user (Admin, Supervisor)
- **Next Status**: Awaiting Acceptance
- **Actions**: Assign order, Add payment, Cancel
- **Notes**: Order is waiting for assignment to an Employee or Vendor

### 2. **Awaiting Acceptance** (`awaiting_acceptance`)
- **State**: Order assigned but not yet accepted
- **Who**: Assigned Employee/Vendor
- **Next Status**: In Progress or Rejected
- **Actions**: Accept, Reject with reason, Request re-assignment
- **Notes**: The assigned party can choose to accept or reject

### 3. **In Progress** (`in_progress`)
- **State**: Work is being done
- **Who**: Employee (normal stitching) or Vendor (job work)
- **Next Status**: Ready to Delivery (Employee) or Job Completed (Vendor)
- **Actions**: Update progress, Request help, Mark as completed
- **Notes**: Status shows active work being performed

### 4. **Rejected** (`rejected`)
- **State**: Order was rejected by Employee/Vendor
- **Who**: Was previously assigned to someone who rejected
- **Next Status**: Awaiting Acceptance (after re-assignment)
- **Actions**: Re-assign order, View rejection reason
- **Notes**: Admin can re-assign rejected orders

### 5. **Ready to Delivery** (`ready_to_delivery`)
- **State**: Employee stitching completed - ready for delivery/finishing
- **Who**: Completed by Employee only
- **Next Status**: Delivered (if finishing needed) or Goods Receipt (for vendor orders)
- **Actions**: Mark as delivered, Assign to vendor for finishing
- **Notes**: Employee workflow only; not for vendor job work

### 6. **Job Completed** (`job_completed`)
- **State**: Vendor job work is complete - waiting for goods receipt
- **Who**: Completed by Vendor only
- **Next Status**: Received Note
- **Actions**: Add goods receipt, Mark incomplete
- **Notes**: Vendor workflow; parcel must be received at shop before proceeding

### 7. **Received Note** (`received_note`)
- **State**: Goods receipt added - parcel received at shop
- **Who**: Added by Admin after vendor work complete
- **Next Status**: Delivered or Awaiting Acceptance (if re-assignment needed)
- **Actions**: Re-assign (for finishing work), Mark as delivered, Update goods receipt
- **Notes**: Validates goods are received before further processing

### 8. **Delivered** (`delivered`)
- **State**: Order completed and handed to customer
- **Who**: Completed by any authorized person
- **Next Status**: None (terminal state)
- **Actions**: View payment status, View history
- **Notes**: All payments should be cleared; Order is complete

### 9. **Overdue** (`overdue`)
- **State**: Order passed due date but not delivered
- **Who**: System auto-flagged
- **Next Status**: Any previous status can transition if completed
- **Actions**: Escalate, Add notes, Mark as urgent
- **Notes**: Automatically flagged when dueDate < current date and status != 'delivered'

---

## Service Methods

### `newOrderService.ts`

#### Creating Orders
```typescript
// Create new order
createNewOrder(
  serviceOrderId: string,
  customerId: string,
  companyId: string,
  assignedBy?: AssignedUser,
  orderAmount?: number,
  advancePayment?: number,
  isJobWork?: boolean,
  vendorId?: string,
  dueDate?: Date
): Promise<NewOrder>
```

#### Retrieving Orders
```typescript
// Get single order
getOrderById(orderId: string): Promise<NewOrder | null>

// Get by status
getOrdersByStatus(status: OrderStatus): Promise<NewOrder[]>

// Get assigned to user
getOrdersAssignedToUser(userId: string): Promise<NewOrder[]>

// Get by company
getOrdersByCompany(companyId: string): Promise<NewOrder[]>

// Get overdue
getOverdueOrders(): Promise<NewOrder[]>

// Custom query
getOrdersByQuery(constraints: QueryConstraint[]): Promise<NewOrder[]>
```

#### Assignment Operations
```typescript
// Assign order
assignOrderToUser(
  orderId: string,
  assignedTo: AssignedUser,
  assignedBy: AssignedUser
): Promise<void>

// Re-assign order
reassignOrder(
  orderId: string,
  newAssignedTo: AssignedUser,
  reassignedBy: AssignedUser
): Promise<void>
```

#### Status Transitions
```typescript
// Generic status update
updateOrderStatus(
  orderId: string,
  newStatus: OrderStatus,
  updatedBy: AssignedUser,
  remarks?: string,
  additionalData?: Record<string, any>
): Promise<void>

// Accept order
acceptOrder(orderId: string, acceptedBy: AssignedUser): Promise<void>

// Reject order
rejectOrder(orderId: string, rejectedBy: AssignedUser, reason: string): Promise<void>

// Job completed (vendor)
markJobCompleted(orderId: string, completedBy: AssignedUser): Promise<void>

// Ready to delivery (employee)
markReadyToDelivery(orderId: string, completedBy: AssignedUser): Promise<void>

// Add goods receipt
addGoodsReceipt(orderId: string, goodsReceiptId: string, addedBy: AssignedUser): Promise<void>

// Mark delivered
markDelivered(
  orderId: string,
  deliveredBy: AssignedUser,
  paymentStatus?: 'pending' | 'partial' | 'completed'
): Promise<void>
```

#### Payment Operations
```typescript
// Update payment
updateOrderPayment(
  orderId: string,
  amount: number,
  updatedBy: AssignedUser
): Promise<void>
```

#### Cleanup
```typescript
// Delete order
deleteOrder(orderId: string, deletedBy: AssignedUser): Promise<void>
```

---

### `orderHistoryService.ts`

```typescript
// Add history entry (automatic with status updates)
addOrderHistory(
  orderId: string,
  status: OrderStatus,
  action: string,
  performedBy: AssignedUser,
  metadata?: Record<string, any>
): Promise<void>

// Get order history
getOrderHistory(orderId: string): Promise<OrderHistoryEntry[]>

// Get user actions
getUserActionHistory(userId: string): Promise<OrderHistoryEntry[]>
```

---

### `migrationService.ts`

**Important: Run this ONCE to clean up old data**

```typescript
// Delete all stitched orders from orderAllotment collection
deleteStitchedOrdersFromOrderAllotment(): Promise<{
  deletedCount: number;
  errors: Array<{ orderId: string; error: string }>;
}>

// Get statistics
getCollectionStats(): Promise<{
  orderAllotmentCount: number;
  stitchedCount: number;
  newOrdersCount: number;
}>
```

---

## How to Execute the Cleanup

### Step 1: Check Current Stats
1. Navigate to Admin section
2. Open "Order Data Cleanup" panel
3. Click "Check Stats" to see current state
4. Note the number of stitched orders

### Step 2: Execute Cleanup
1. Click "Delete Stitched Orders" button
2. Wait for operation to complete
3. Review the before/after statistics
4. Check for any errors

### Step 3: Verify Results
- Stitched orders should now be 0 in orderAllotment
- The "jobwork completed" card should now be empty
- All future orders use newOrders collection

---

## Implementation Steps for Developers

### 1. Update Components to Use New Service
Replace references to `orderAllotment` with `newOrderService`:

**Old way:**
```typescript
import { getOrderAllotmentsByVendor } from '@/lib/firestore/orderAllotmentService';

const orders = await getOrderAllotmentsByVendor(vendorId);
```

**New way:**
```typescript
import { getOrdersAssignedToUser } from '@/lib/firestore/newOrderService';
import { getOrdersByStatus } from '@/lib/firestore/newOrderService';

// Get orders assigned to this user
const orders = await getOrdersAssignedToUser(userId);

// Get specific status
const jobCompletedOrders = await getOrdersByStatus('job_completed');
```

### 2. Update Status Checks
Replace status value checks:

**Old:**
```typescript
if (order.status === 'stitched') { ... }
```

**New:**
```typescript
if (order.status === 'job_completed') { ... }
```

### 3. Update Components
See component examples in `src/components/` for proper implementation with newOrderService

---

## Migration Workflow

### For Employee Orders
```
open → awaiting_acceptance → in_progress → ready_to_delivery → delivered
```

### For Vendor/Job Work Orders
```
open → awaiting_acceptance → in_progress → job_completed → received_note → delivered
```

### With Rejection
```
open → awaiting_acceptance → rejected → awaiting_acceptance (re-assigned) → ...
```

### With Overdue
```
(any non-delivered status) → overdue → (continue normal flow)
```

---

## Database Rules Update

Firestore rules should be updated to:
- Only allow authenticated users to create/update orders
- Restrict updates based on assigned user
- Prevent status downgrades (e.g., delivered → in_progress)
- Auto-generate history entries on updates

---

## Important Notes

1. **Data Integrity**: All operations create audit trail entries in orderHistory
2. **Automatic Timestamps**: createdAt, updatedAt, and statusHistory are auto-managed
3. **Overdue Detection**: System auto-checks against dueDate
4. **Batch Operations**: Large deletions use batch writes for efficiency
5. **Error Handling**: All errors are logged and returned for tracking

---

## Timeline

- **Immediate**: Run cleanup to delete stitched orders
- **Within 24 hours**: Update all components to use newOrderService
- **Within 48 hours**: Verify all workflows work correctly
- **Week 1**: Monitor orderHistory collection for integrity
- **Ongoing**: All new orders use newOrders collection exclusively

---

## Support & Troubleshooting

### Issue: "jobwork completed" card still shows orders after cleanup
**Solution**: 
1. Ensure cleanup ran successfully (check stats)
2. Clear browser cache and reload
3. Verify components are using newOrderService

### Issue: Cleanup errors
**Solution**:
1. Check the error details returned
2. Verify Firestore permissions
3. Ensure database connectivity
4. Retry with smaller batch size

### Issue: History entries not created
**Solution**:
1. Verify orderHistoryService is being called
2. Check Firestore rules allow writes to orderHistory
3. Ensure performedBy user data is complete

---

## API Response Examples

### Create Order Response
```json
{
  "id": "order_1701346000000_abc123def",
  "serviceOrderId": "SO-001",
  "customerId": "cust_123",
  "companyId": "comp_456",
  "status": "open",
  "createdAt": "2024-11-30T18:30:00Z",
  "updatedAt": "2024-11-30T18:30:00Z",
  "statusHistory": {
    "open": "2024-11-30T18:30:00Z"
  }
}
```

### Status Update Response
All updates create history entry:
```json
{
  "orderId": "order_1701346000000_abc123def",
  "status": "in_progress",
  "previousStatus": "awaiting_acceptance",
  "action": "Order accepted by John Doe",
  "performedBy": {
    "userId": "user_123",
    "userName": "John Doe",
    "userRole": "employee"
  },
  "createdAt": "2024-11-30T18:45:00Z"
}
```

---

## Next Steps

1. ✅ Services created (newOrderService, orderHistoryService, migrationService)
2. ✅ Cleanup component created (AdminDataCleanup)
3. ⏳ Run cleanup operation
4. ⏳ Update existing components
5. ⏳ Test all workflows
6. ⏳ Deploy to production
