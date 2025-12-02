import { 
  collection, 
  doc, 
  setDoc,
  getDocs, 
  query, 
  where, 
  updateDoc,
  deleteDoc,
  Timestamp,
  getDoc,
  Query,
  QueryConstraint,
  orderBy,
  limit,
} from 'firebase/firestore';
import { db } from './firebase';
import { addOrderHistory } from './orderHistoryService';

const NEW_ORDERS_COLLECTION = 'newOrders';

export interface AssignedUser {
  userId: string;
  userName: string;
  userRole: 'employee' | 'vendor' | 'admin';
}

export type OrderStatus = 
  | 'open'
  | 'awaiting_acceptance'
  | 'in_progress'
  | 'rejected'
  | 'ready_to_delivery'
  | 'job_completed'
  | 'received_note'
  | 'delivered'
  | 'overdue';

export interface NewOrder {
  id: string;
  serviceOrderId: string;
  customerId: string;
  companyId: string;
  
  // Assignment tracking
  assignedBy?: AssignedUser;
  assignedTo?: AssignedUser;
  
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

// Create new order
export async function createNewOrder(
  serviceOrderId: string,
  customerId: string,
  companyId: string,
  assignedBy?: AssignedUser,
  orderAmount?: number,
  advancePayment?: number,
  isJobWork?: boolean,
  vendorId?: string,
  dueDate?: Date
): Promise<NewOrder> {
  try {
    const orderId = `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = Timestamp.now();

    const newOrder: NewOrder = {
      id: orderId,
      serviceOrderId,
      customerId,
      companyId,
      status: 'open',
      createdAt: now,
      updatedAt: now,
      assignedBy,
      orderAmount,
      advancePayment,
      remainingPayment: orderAmount ? orderAmount - (advancePayment || 0) : 0,
      paymentStatus: advancePayment ? (advancePayment === orderAmount ? 'completed' : 'partial') : 'pending',
      isJobWork,
      vendorId,
      dueDate: dueDate ? Timestamp.fromDate(dueDate) : undefined,
      isOverdue: false,
      statusHistory: {
        open: now,
      },
    };

    await setDoc(doc(db, NEW_ORDERS_COLLECTION, orderId), newOrder);
    await addOrderHistory(orderId, 'open', 'Order created', assignedBy);
    
    console.log(`[NewOrderService] Order ${orderId} created successfully`);
    return newOrder;
  } catch (error) {
    console.error('[NewOrderService] Error creating order:', error);
    throw error;
  }
}

// Get order by ID
export async function getOrderById(orderId: string): Promise<NewOrder | null> {
  try {
    const orderDoc = await getDoc(doc(db, NEW_ORDERS_COLLECTION, orderId));
    if (!orderDoc.exists()) return null;
    return { id: orderDoc.id, ...orderDoc.data() } as NewOrder;
  } catch (error) {
    console.error('[NewOrderService] Error fetching order:', error);
    throw error;
  }
}

// Get all orders by status
export async function getOrdersByStatus(status: OrderStatus): Promise<NewOrder[]> {
  try {
    const q = query(
      collection(db, NEW_ORDERS_COLLECTION),
      where('status', '==', status)
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as NewOrder));
  } catch (error) {
    console.error('[NewOrderService] Error fetching orders by status:', error);
    throw error;
  }
}

// Get orders assigned to a user
export async function getOrdersAssignedToUser(userId: string): Promise<NewOrder[]> {
  try {
    const q = query(
      collection(db, NEW_ORDERS_COLLECTION),
      where('assignedTo.userId', '==', userId)
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as NewOrder));
  } catch (error) {
    console.error('[NewOrderService] Error fetching assigned orders:', error);
    throw error;
  }
}

// Get orders by company
export async function getOrdersByCompany(companyId: string): Promise<NewOrder[]> {
  try {
    const q = query(
      collection(db, NEW_ORDERS_COLLECTION),
      where('companyId', '==', companyId)
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as NewOrder));
  } catch (error) {
    console.error('[NewOrderService] Error fetching company orders:', error);
    throw error;
  }
}

// Assign order to user
export async function assignOrderToUser(
  orderId: string,
  assignedTo: AssignedUser,
  assignedBy: AssignedUser
): Promise<void> {
  try {
    const order = await getOrderById(orderId);
    if (!order) throw new Error(`Order ${orderId} not found`);

    const previousStatus = order.status;
    const now = Timestamp.now();

    await updateDoc(doc(db, NEW_ORDERS_COLLECTION, orderId), {
      assignedTo,
      assignedBy,
      status: 'awaiting_acceptance',
      previousStatus,
      updatedAt: now,
      'statusHistory.awaiting_acceptance': now,
    });

    await addOrderHistory(
      orderId,
      'awaiting_acceptance',
      `Order assigned to ${assignedTo.userName}`,
      assignedBy,
      {
        previousStatus,
        assignedTo,
      }
    );

    console.log(`[NewOrderService] Order ${orderId} assigned to ${assignedTo.userName}`);
  } catch (error) {
    console.error('[NewOrderService] Error assigning order:', error);
    throw error;
  }
}

// Update order status
export async function updateOrderStatus(
  orderId: string,
  newStatus: OrderStatus,
  updatedBy: AssignedUser,
  remarks?: string,
  additionalData?: Record<string, any>
): Promise<void> {
  try {
    const order = await getOrderById(orderId);
    if (!order) throw new Error(`Order ${orderId} not found`);

    const previousStatus = order.status;
    const now = Timestamp.now();

    const updateData: Record<string, any> = {
      status: newStatus,
      previousStatus,
      updatedAt: now,
      [`statusHistory.${newStatus}`]: now,
    };

    if (remarks) {
      updateData.remarks = remarks;
    }

    if (additionalData) {
      Object.assign(updateData, additionalData);
    }

    // Check if order is overdue
    if (order.dueDate && newStatus !== 'delivered' && newStatus !== 'overdue') {
      const isOverdue = new Date() > order.dueDate.toDate();
      updateData.isOverdue = isOverdue;
      if (isOverdue && !order.isOverdue) {
        updateData.status = 'overdue';
        updateData.overdueAt = now;
      }
    }

    await updateDoc(doc(db, NEW_ORDERS_COLLECTION, orderId), updateData);

    await addOrderHistory(
      orderId,
      newStatus,
      remarks || `Status updated to ${newStatus}`,
      updatedBy,
      {
        previousStatus,
        ...additionalData,
      }
    );

    console.log(`[NewOrderService] Order ${orderId} status updated to ${newStatus}`);
  } catch (error) {
    console.error('[NewOrderService] Error updating order status:', error);
    throw error;
  }
}

// Accept order (vendor/employee accepts assignment)
export async function acceptOrder(orderId: string, acceptedBy: AssignedUser): Promise<void> {
  try {
    await updateOrderStatus(orderId, 'in_progress', acceptedBy, `${acceptedBy.userName} accepted the order`);
  } catch (error) {
    console.error('[NewOrderService] Error accepting order:', error);
    throw error;
  }
}

// Reject order
export async function rejectOrder(
  orderId: string,
  rejectedBy: AssignedUser,
  reason: string
): Promise<void> {
  try {
    await updateOrderStatus(orderId, 'rejected', rejectedBy, `Order rejected: ${reason}`, {
      rejectionReason: reason,
    });
  } catch (error) {
    console.error('[NewOrderService] Error rejecting order:', error);
    throw error;
  }
}

// Mark order as job completed (for vendors)
export async function markJobCompleted(orderId: string, completedBy: AssignedUser): Promise<void> {
  try {
    await updateOrderStatus(orderId, 'job_completed', completedBy, 'Job work completed by vendor');
  } catch (error) {
    console.error('[NewOrderService] Error marking job completed:', error);
    throw error;
  }
}

// Mark order as ready to delivery (for employees)
export async function markReadyToDelivery(orderId: string, completedBy: AssignedUser): Promise<void> {
  try {
    await updateOrderStatus(orderId, 'ready_to_delivery', completedBy, 'Ready for delivery');
  } catch (error) {
    console.error('[NewOrderService] Error marking ready to delivery:', error);
    throw error;
  }
}

// Add goods receipt
export async function addGoodsReceipt(
  orderId: string,
  goodsReceiptId: string,
  addedBy: AssignedUser
): Promise<void> {
  try {
    const order = await getOrderById(orderId);
    if (!order) throw new Error(`Order ${orderId} not found`);

    const now = Timestamp.now();
    await updateOrderStatus(
      orderId,
      'received_note',
      addedBy,
      'Goods receipt added',
      {
        goodsReceiptId,
        goodsReceiptDate: now,
      }
    );
  } catch (error) {
    console.error('[NewOrderService] Error adding goods receipt:', error);
    throw error;
  }
}

// Mark order as delivered
export async function markDelivered(
  orderId: string,
  deliveredBy: AssignedUser,
  paymentStatus?: 'pending' | 'partial' | 'completed'
): Promise<void> {
  try {
    const updateData: Record<string, any> = {};
    if (paymentStatus) {
      updateData.paymentStatus = paymentStatus;
    }
    await updateOrderStatus(orderId, 'delivered', deliveredBy, 'Order delivered', updateData);
  } catch (error) {
    console.error('[NewOrderService] Error marking delivered:', error);
    throw error;
  }
}

// Get orders by custom query
export async function getOrdersByQuery(constraints: QueryConstraint[]): Promise<NewOrder[]> {
  try {
    const q = query(collection(db, NEW_ORDERS_COLLECTION), ...constraints);
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as NewOrder));
  } catch (error) {
    console.error('[NewOrderService] Error fetching orders by query:', error);
    throw error;
  }
}

// Update order payment
export async function updateOrderPayment(
  orderId: string,
  amount: number,
  updatedBy: AssignedUser
): Promise<void> {
  try {
    const order = await getOrderById(orderId);
    if (!order) throw new Error(`Order ${orderId} not found`);

    const currentAdvance = order.advancePayment || 0;
    const newAdvance = currentAdvance + amount;
    const remaining = (order.orderAmount || 0) - newAdvance;
    let paymentStatus: 'pending' | 'partial' | 'completed' = 'pending';

    if (newAdvance > 0 && newAdvance < (order.orderAmount || 0)) {
      paymentStatus = 'partial';
    } else if (newAdvance >= (order.orderAmount || 0)) {
      paymentStatus = 'completed';
    }

    const now = Timestamp.now();

    await updateDoc(doc(db, NEW_ORDERS_COLLECTION, orderId), {
      advancePayment: newAdvance,
      remainingPayment: remaining,
      paymentStatus,
      updatedAt: now,
    });

    await addOrderHistory(
      orderId,
      order.status,
      `Payment of ${amount} received. Total: ${newAdvance}`,
      updatedBy,
      {
        advancePayment: newAdvance,
        paymentStatus,
      }
    );

    console.log(`[NewOrderService] Order ${orderId} payment updated`);
  } catch (error) {
    console.error('[NewOrderService] Error updating payment:', error);
    throw error;
  }
}

// Reassign order
export async function reassignOrder(
  orderId: string,
  newAssignedTo: AssignedUser,
  reassignedBy: AssignedUser
): Promise<void> {
  try {
    const order = await getOrderById(orderId);
    if (!order) throw new Error(`Order ${orderId} not found`);

    const now = Timestamp.now();

    await updateDoc(doc(db, NEW_ORDERS_COLLECTION, orderId), {
      assignedTo: newAssignedTo,
      assignedBy: reassignedBy,
      status: 'awaiting_acceptance',
      updatedAt: now,
      'statusHistory.awaiting_acceptance': now,
    });

    await addOrderHistory(
      orderId,
      'awaiting_acceptance',
      `Order re-assigned to ${newAssignedTo.userName}`,
      reassignedBy,
      {
        previousAssignee: order.assignedTo,
        newAssignee: newAssignedTo,
      }
    );

    console.log(`[NewOrderService] Order ${orderId} re-assigned to ${newAssignedTo.userName}`);
  } catch (error) {
    console.error('[NewOrderService] Error reassigning order:', error);
    throw error;
  }
}

// Get overdue orders
export async function getOverdueOrders(): Promise<NewOrder[]> {
  try {
    const q = query(
      collection(db, NEW_ORDERS_COLLECTION),
      where('isOverdue', '==', true),
      where('status', '!=', 'delivered')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as NewOrder));
  } catch (error) {
    console.error('[NewOrderService] Error fetching overdue orders:', error);
    throw error;
  }
}

// Delete order
export async function deleteOrder(orderId: string, deletedBy: AssignedUser): Promise<void> {
  try {
    const order = await getOrderById(orderId);
    if (!order) throw new Error(`Order ${orderId} not found`);

    await addOrderHistory(orderId, order.status, 'Order deleted', deletedBy);
    await deleteDoc(doc(db, NEW_ORDERS_COLLECTION, orderId));
    
    console.log(`[NewOrderService] Order ${orderId} deleted`);
  } catch (error) {
    console.error('[NewOrderService] Error deleting order:', error);
    throw error;
  }
}
