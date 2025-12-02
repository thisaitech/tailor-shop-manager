import {
  doc,
  setDoc,
  getDoc,
  getDocs,
  collection,
  query,
  where,
  deleteDoc,
  updateDoc,
  serverTimestamp,
  Timestamp,
  onSnapshot,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ServiceOrder, EmbeddedAllotment, ServiceOrderStatus, StitchingAllotmentType, OrderHistoryEntry } from '@/lib/types';
import {
  createOrderAssignmentNotification,
  createOrderAcceptedNotification,
  createOrderRejectedNotification,
  createOrderCompletedNotification,
  createOrderReassignedNotification,
} from '@/lib/firestore/notificationService';

// Order History Collection
const ORDER_HISTORY_COLLECTION = 'orderHistory';

const SERVICE_ORDERS_COLLECTION = 'newOrder';

/**
 * Generate auto-incrementing service order ID
 * Format: SO0001, SO0002, etc.
 */
export async function generateServiceOrderId(companyId: string): Promise<string> {
  try {
    const ordersRef = collection(db, SERVICE_ORDERS_COLLECTION);
    const q = query(ordersRef, where('companyId', '==', companyId));
    const snapshot = await getDocs(q);

    // Get all existing IDs and find the highest number
    const existingIds = snapshot.docs.map(doc => doc.id);
    let maxNum = 0;

    existingIds.forEach(id => {
      const match = id.match(/^SO(\d+)$/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    });

    const count = maxNum + 1;
    return `SO${count.toString().padStart(4, '0')}`;
  } catch (error) {
    console.error('Error generating service order ID:', error);
    return `SO${Date.now()}`;
  }
}

/**
 * Service Order data with company reference
 */
export interface ServiceOrderWithCompany extends ServiceOrder {
  companyId: string;
  adminId: string;
}

/**
 * Convert Firestore timestamp to number
 */
function convertTimestamp(timestamp: any): number {
  if (timestamp instanceof Timestamp) {
    return timestamp.toMillis();
  }
  if (typeof timestamp === 'number') {
    return timestamp;
  }
  return Date.now();
}

/**
 * Remove large data (like base64 images) from measurements to avoid Firestore size limits
 */
function sanitizeMeasurements(measurements: any[]): any[] {
  if (!Array.isArray(measurements)) return measurements;

  return measurements.map((measurement) => {
    const sanitized = { ...measurement };
    // Remove image data if present (base64 images are too large for Firestore)
    if (sanitized.image && typeof sanitized.image === 'string' && sanitized.image.length > 10000) {
      delete sanitized.image;
    }
    // Remove any other large string fields
    Object.keys(sanitized).forEach((key) => {
      if (typeof sanitized[key] === 'string' && sanitized[key].length > 100000) {
        delete sanitized[key];
      }
    });
    return sanitized;
  });
}

/**
 * Remove undefined values from object (Firestore doesn't support undefined)
 */
function removeUndefined(obj: any): any {
  if (obj === null || obj === undefined) return null;
  if (Array.isArray(obj)) return obj.map(removeUndefined);
  if (typeof obj !== 'object') return obj;

  const cleaned: any = {};
  Object.keys(obj).forEach(key => {
    const value = obj[key];
    if (value !== undefined) {
      cleaned[key] = removeUndefined(value);
    }
  });
  return cleaned;
}

/**
 * Add a new service order to Firestore
 */
export async function addServiceOrder(
  orderData: Omit<ServiceOrder, 'id' | 'createdAt' | 'updatedAt'>,
  companyId: string,
  adminId: string
): Promise<ServiceOrderWithCompany> {
  try {
    const orderId = await generateServiceOrderId(companyId);
    const orderRef = doc(db, SERVICE_ORDERS_COLLECTION, orderId);

    // Sanitize measurements to remove large image data
    const sanitizedOrderData = {
      ...orderData,
      measurements: orderData.measurements ? sanitizeMeasurements(orderData.measurements) : [],
      dressItems: orderData.dressItems || [],
    };

    const newOrder: ServiceOrderWithCompany = {
      ...sanitizedOrderData,
      id: orderId,
      companyId,
      adminId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    // Remove undefined values before saving to Firestore
    const cleanedOrder = removeUndefined({
      ...newOrder,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    await setDoc(orderRef, cleanedOrder);

    console.log('Service order added successfully:', orderId);
    return newOrder;
  } catch (error) {
    console.error('Error adding service order:', error);
    throw new Error('Failed to add service order');
  }
}

/**
 * Get all service orders for a company
 */
export async function getServiceOrdersByCompany(companyId: string): Promise<ServiceOrderWithCompany[]> {
  try {
    const ordersRef = collection(db, SERVICE_ORDERS_COLLECTION);
    const q = query(ordersRef, where('companyId', '==', companyId));
    const snapshot = await getDocs(q);

    const orders: ServiceOrderWithCompany[] = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        ...data,
        id: doc.id,
        createdAt: convertTimestamp(data.createdAt),
        updatedAt: convertTimestamp(data.updatedAt),
        serviceOrderDate: convertTimestamp(data.serviceOrderDate),
        expectedDeliveryDate: convertTimestamp(data.expectedDeliveryDate),
      } as ServiceOrderWithCompany;
    });

    console.log(`Found ${orders.length} service orders for company ${companyId}`);
    return orders;
  } catch (error) {
    console.error('Error fetching service orders:', error);
    throw new Error('Failed to fetch service orders');
  }
}

/**
 * Subscribe to real-time service orders updates for a company
 * Returns an unsubscribe function to stop listening
 */
export function subscribeToServiceOrders(
  companyId: string,
  onUpdate: (orders: ServiceOrderWithCompany[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const ordersRef = collection(db, SERVICE_ORDERS_COLLECTION);
  const q = query(ordersRef, where('companyId', '==', companyId));

  return onSnapshot(
    q,
    (snapshot) => {
      const orders: ServiceOrderWithCompany[] = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          ...data,
          id: doc.id,
          createdAt: convertTimestamp(data.createdAt),
          updatedAt: convertTimestamp(data.updatedAt),
          serviceOrderDate: convertTimestamp(data.serviceOrderDate),
          expectedDeliveryDate: convertTimestamp(data.expectedDeliveryDate),
        } as ServiceOrderWithCompany;
      });

      // Sort by serviceOrderDate descending (newest first)
      orders.sort((a, b) => b.serviceOrderDate - a.serviceOrderDate);

      console.log(`[Real-time] Service orders updated: ${orders.length} orders for company ${companyId}`);
      onUpdate(orders);
    },
    (error) => {
      console.error('[Real-time] Error in service orders subscription:', error);
      if (onError) {
        onError(error);
      }
    }
  );
}

/**
 * Get a single service order by ID
 */
export async function getServiceOrderById(orderId: string): Promise<ServiceOrderWithCompany | null> {
  try {
    const orderRef = doc(db, SERVICE_ORDERS_COLLECTION, orderId);
    const orderDoc = await getDoc(orderRef);

    if (!orderDoc.exists()) {
      return null;
    }

    const data = orderDoc.data();
    return {
      ...data,
      id: orderDoc.id,
      createdAt: convertTimestamp(data.createdAt),
      updatedAt: convertTimestamp(data.updatedAt),
      serviceOrderDate: convertTimestamp(data.serviceOrderDate),
      expectedDeliveryDate: convertTimestamp(data.expectedDeliveryDate),
    } as ServiceOrderWithCompany;
  } catch (error) {
    console.error('Error fetching service order:', error);
    throw new Error('Failed to fetch service order');
  }
}

/**
 * Update an existing service order
 */
export async function updateServiceOrder(
  orderId: string,
  orderData: Partial<Omit<ServiceOrder, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<void> {
  try {
    const orderRef = doc(db, SERVICE_ORDERS_COLLECTION, orderId);

    await updateDoc(orderRef, {
      ...orderData,
      updatedAt: serverTimestamp(),
    });

    console.log('Service order updated successfully:', orderId);
  } catch (error) {
    console.error('Error updating service order:', error);
    throw new Error('Failed to update service order');
  }
}

/**
 * Delete a service order
 */
export async function deleteServiceOrder(orderId: string): Promise<void> {
  try {
    const orderRef = doc(db, SERVICE_ORDERS_COLLECTION, orderId);
    await deleteDoc(orderRef);
    console.log('Service order deleted successfully:', orderId);
  } catch (error) {
    console.error('Error deleting service order:', error);
    throw new Error('Failed to delete service order');
  }
}

/**
 * Update service order status
 */
export async function updateServiceOrderStatus(
  orderId: string,
  status: ServiceOrder['orderStatus']
): Promise<void> {
  try {
    const orderRef = doc(db, SERVICE_ORDERS_COLLECTION, orderId);

    await updateDoc(orderRef, {
      orderStatus: status,
      updatedAt: serverTimestamp(),
    });

    console.log(`Service order ${orderId} status updated to ${status}`);
  } catch (error) {
    console.error('Error updating service order status:', error);
    throw new Error('Failed to update service order status');
  }
}

/**
 * Add an embedded allotment to a service order
 * This keeps all order data in a single document
 */
export async function addEmbeddedAllotment(
  serviceOrderId: string,
  allotment: EmbeddedAllotment
): Promise<void> {
  try {
    const orderRef = doc(db, SERVICE_ORDERS_COLLECTION, serviceOrderId);
    const orderDoc = await getDoc(orderRef);

    if (!orderDoc.exists()) {
      throw new Error(`Service order ${serviceOrderId} not found`);
    }

    const data = orderDoc.data();
    const existingAllotments: EmbeddedAllotment[] = data.allotments || [];

    // Add new allotment to the array
    const updatedAllotments = [...existingAllotments, allotment];

    await updateDoc(orderRef, {
      allotments: updatedAllotments,
      updatedAt: serverTimestamp(),
    });

    console.log(`Embedded allotment ${allotment.id} added to service order ${serviceOrderId}`);
  } catch (error) {
    console.error('Error adding embedded allotment:', error);
    throw error;
  }
}

/**
 * Update an embedded allotment within a service order
 */
export async function updateEmbeddedAllotment(
  serviceOrderId: string,
  allotmentId: string,
  updates: Partial<EmbeddedAllotment>
): Promise<void> {
  try {
    const orderRef = doc(db, SERVICE_ORDERS_COLLECTION, serviceOrderId);
    const orderDoc = await getDoc(orderRef);

    if (!orderDoc.exists()) {
      throw new Error(`Service order ${serviceOrderId} not found`);
    }

    const data = orderDoc.data();
    const existingAllotments: EmbeddedAllotment[] = data.allotments || [];

    // Find and update the specific allotment
    const updatedAllotments = existingAllotments.map(allotment => {
      if (allotment.id === allotmentId) {
        return { ...allotment, ...updates, updatedAt: Date.now() };
      }
      return allotment;
    });

    await updateDoc(orderRef, {
      allotments: updatedAllotments,
      updatedAt: serverTimestamp(),
    });

    console.log(`Embedded allotment ${allotmentId} updated in service order ${serviceOrderId}`);
  } catch (error) {
    console.error('Error updating embedded allotment:', error);
    throw error;
  }
}

/**
 * Get embedded allotments from a service order
 */
export async function getEmbeddedAllotments(serviceOrderId: string): Promise<EmbeddedAllotment[]> {
  try {
    const order = await getServiceOrderById(serviceOrderId);
    return order?.allotments || [];
  } catch (error) {
    console.error('Error getting embedded allotments:', error);
    return [];
  }
}

/**
 * Delete an embedded allotment from a service order
 */
export async function deleteEmbeddedAllotment(
  serviceOrderId: string,
  allotmentId: string
): Promise<void> {
  try {
    const orderRef = doc(db, SERVICE_ORDERS_COLLECTION, serviceOrderId);
    const orderDoc = await getDoc(orderRef);

    if (!orderDoc.exists()) {
      throw new Error(`Service order ${serviceOrderId} not found`);
    }

    const data = orderDoc.data();
    const existingAllotments: EmbeddedAllotment[] = data.allotments || [];

    // Remove the specific allotment
    const updatedAllotments = existingAllotments.filter(
      allotment => allotment.id !== allotmentId
    );

    await updateDoc(orderRef, {
      allotments: updatedAllotments,
      updatedAt: serverTimestamp(),
    });

    console.log(`Embedded allotment ${allotmentId} deleted from service order ${serviceOrderId}`);
  } catch (error) {
    console.error('Error deleting embedded allotment:', error);
    throw error;
  }
}

// ==========================================
// ORDER HISTORY FUNCTIONS
// ==========================================

/**
 * Add entry to order history
 */
export async function addOrderHistory(
  orderId: string,
  action: OrderHistoryEntry['action'],
  performedBy: string,
  performedByName: string,
  previousStatus?: ServiceOrderStatus,
  newStatus?: ServiceOrderStatus,
  metadata?: Record<string, any>
): Promise<void> {
  try {
    const historyId = `HIST_${orderId}_${Date.now()}`;
    const historyRef = doc(db, ORDER_HISTORY_COLLECTION, historyId);

    const historyEntry: OrderHistoryEntry = {
      id: historyId,
      orderId,
      timestamp: Date.now(),
      action,
      previousStatus,
      newStatus,
      performedBy,
      performedByName,
      metadata,
    };

    await setDoc(historyRef, removeUndefined(historyEntry));
    console.log(`[OrderHistory] Added history entry for order ${orderId}: ${action}`);
  } catch (error) {
    console.error('[OrderHistory] Error adding history:', error);
    // Don't throw - history is not critical
  }
}

/**
 * Get order history for an order
 */
export async function getOrderHistoryByOrderId(orderId: string): Promise<OrderHistoryEntry[]> {
  try {
    const historyRef = collection(db, ORDER_HISTORY_COLLECTION);
    const q = query(historyRef, where('orderId', '==', orderId));
    const snapshot = await getDocs(q);

    const history = snapshot.docs.map(doc => ({
      ...doc.data(),
      id: doc.id,
    })) as OrderHistoryEntry[];

    return history.sort((a, b) => b.timestamp - a.timestamp);
  } catch (error) {
    console.error('[OrderHistory] Error fetching history:', error);
    return [];
  }
}

// ==========================================
// ORDER ASSIGNMENT FUNCTIONS
// ==========================================

/**
 * Generate Job Work Number
 */
export async function generateJobWorkNo(companyId: string): Promise<string> {
  try {
    const ordersRef = collection(db, SERVICE_ORDERS_COLLECTION);
    const q = query(ordersRef, where('companyId', '==', companyId));
    const snapshot = await getDocs(q);

    let maxNum = 0;
    snapshot.docs.forEach(doc => {
      const data = doc.data();
      if (data.jobWorkNo) {
        const match = data.jobWorkNo.match(/^JOB(\d+)$/);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > maxNum) maxNum = num;
        }
      }
    });

    return `JOB${(maxNum + 1).toString().padStart(4, '0')}`;
  } catch (error) {
    console.error('Error generating job work number:', error);
    return `JOB${Date.now()}`;
  }
}

/**
 * Assign order to employee or vendor
 */
export async function assignOrder(
  orderId: string,
  assignmentType: StitchingAllotmentType,
  assignedTo: string,
  assignedToName: string,
  assignedBy: string,
  assignedByName: string,
  materialCost?: number,
  jobWorkCost?: number
): Promise<void> {
  try {
    const orderRef = doc(db, SERVICE_ORDERS_COLLECTION, orderId);
    const orderDoc = await getDoc(orderRef);

    if (!orderDoc.exists()) {
      throw new Error(`Order ${orderId} not found`);
    }

    const orderData = orderDoc.data();
    const now = Date.now();

    // Generate job work number for vendors
    let jobWorkNo: string | undefined;
    if (assignmentType === 'vendor') {
      jobWorkNo = await generateJobWorkNo(orderData.companyId);
    }

    const updateData: Partial<ServiceOrder> = {
      orderStatus: 'awaiting',
      assignmentType,
      assignedTo,
      assignedToName,
      assignedDate: now,
      assignedBy,
      materialCost,
      jobWorkCost,
      jobWorkNo,
      jobWorkDate: assignmentType === 'vendor' ? now : undefined,
    };

    await updateDoc(orderRef, {
      ...removeUndefined(updateData),
      updatedAt: serverTimestamp(),
    });

    // Add to history
    await addOrderHistory(
      orderId,
      'assigned',
      assignedBy,
      assignedByName,
      orderData.orderStatus as ServiceOrderStatus,
      'awaiting',
      { assignedTo, assignedToName, assignmentType, jobWorkNo, materialCost, jobWorkCost }
    );

    // Create notification for the assignee (employee/vendor)
    try {
      await createOrderAssignmentNotification(
        orderId,
        jobWorkNo || orderId,
        assignedTo,
        assignmentType,
        assignedByName,
        orderData.companyId
      );
    } catch (notifError) {
      console.error('Error creating assignment notification:', notifError);
      // Don't throw - notification is not critical
    }

    console.log(`Order ${orderId} assigned to ${assignedToName} (${assignmentType})`);
  } catch (error) {
    console.error('Error assigning order:', error);
    throw error;
  }
}

/**
 * Accept order (vendor/employee accepts the assignment)
 * - For VENDORS: moves to 'waitingForDC' (waiting for Delivery Challan)
 * - For EMPLOYEES: moves directly to 'inprogress'
 */
export async function acceptOrder(
  orderId: string,
  acceptedBy: string,
  acceptedByName: string
): Promise<void> {
  try {
    const orderRef = doc(db, SERVICE_ORDERS_COLLECTION, orderId);
    const orderDoc = await getDoc(orderRef);

    if (!orderDoc.exists()) {
      throw new Error(`Order ${orderId} not found`);
    }

    const orderData = orderDoc.data();
    const now = Date.now();

    // For vendors, move to 'waitingForDC' - they need a DC before work can start
    // For employees, move directly to 'inprogress'
    const newStatus: ServiceOrderStatus = orderData.assignmentType === 'vendor' ? 'waitingForDC' : 'inprogress';

    await updateDoc(orderRef, {
      orderStatus: newStatus,
      acceptedDate: now,
      updatedAt: serverTimestamp(),
    });

    await addOrderHistory(
      orderId,
      'accepted',
      acceptedBy,
      acceptedByName,
      orderData.orderStatus as ServiceOrderStatus,
      newStatus,
      { acceptedDate: now }
    );

    // Create notification for admin
    try {
      if (orderData.adminId) {
        await createOrderAcceptedNotification(
          orderId,
          orderData.jobWorkNo || orderId,
          orderData.adminId,
          acceptedByName,
          orderData.companyId
        );
      }
    } catch (notifError) {
      console.error('Error creating acceptance notification:', notifError);
    }

    console.log(`Order ${orderId} accepted by ${acceptedByName}, status: ${newStatus}`);
  } catch (error) {
    console.error('Error accepting order:', error);
    throw error;
  }
}

/**
 * Reject order
 */
export async function rejectOrder(
  orderId: string,
  rejectedBy: string,
  rejectedByName: string,
  reason: string
): Promise<void> {
  try {
    const orderRef = doc(db, SERVICE_ORDERS_COLLECTION, orderId);
    const orderDoc = await getDoc(orderRef);

    if (!orderDoc.exists()) {
      throw new Error(`Order ${orderId} not found`);
    }

    const orderData = orderDoc.data();
    const now = Date.now();

    // Update the ServiceOrder status
    await updateDoc(orderRef, {
      orderStatus: 'rejected',
      rejectedDate: now,
      rejectionReason: reason,
      updatedAt: serverTimestamp(),
    });

    // Also update the corresponding OrderAllotment status
    // Find allotments for this service order and update their status to 'rejected'
    try {
      const allotmentsRef = collection(db, 'orderAllotment');
      // Use simple query and filter in JavaScript - Firestore inequality queries don't match missing fields
      const allotmentQuery = query(allotmentsRef, where('serviceOrderNo', '==', orderId));
      const allotmentSnapshot = await getDocs(allotmentQuery);
      
      let updatedCount = 0;
      // Update each allotment that hasn't been reassigned
      for (const allotmentDoc of allotmentSnapshot.docs) {
        const data = allotmentDoc.data();
        // Only update if not reassigned (handles undefined, null, false)
        if (data.reassigned !== true) {
          await updateDoc(doc(db, 'orderAllotment', allotmentDoc.id), {
            status: 'rejected',
            rejectedDate: now,
            updatedAt: serverTimestamp(),
          });
          updatedCount++;
          console.log(`[rejectOrder] Updated OrderAllotment ${allotmentDoc.id} status to rejected`);
        }
      }
      console.log(`[rejectOrder] Updated ${updatedCount} OrderAllotment(s) for order ${orderId}`);
    } catch (allotmentError) {
      console.error('[rejectOrder] Error updating OrderAllotment status:', allotmentError);
      // Continue - don't fail the whole operation if allotment update fails
    }

    await addOrderHistory(
      orderId,
      'rejected',
      rejectedBy,
      rejectedByName,
      orderData.orderStatus as ServiceOrderStatus,
      'rejected',
      { rejectionReason: reason }
    );

    // Create notification for admin
    try {
      if (orderData.adminId) {
        await createOrderRejectedNotification(
          orderId,
          orderData.jobWorkNo || orderId,
          orderData.adminId,
          rejectedByName,
          reason,
          orderData.companyId
        );
      }
    } catch (notifError) {
      console.error('Error creating rejection notification:', notifError);
    }

    console.log(`Order ${orderId} rejected by ${rejectedByName}: ${reason}`);
  } catch (error) {
    console.error('Error rejecting order:', error);
    throw error;
  }
}

/**
 * Create Delivery Challan (for vendor orders)
 * This moves the order from 'waitingForDC' to 'inprogress'
 */
export async function createDeliveryChallan(
  orderId: string,
  dcNumber: string,
  createdBy: string,
  createdByName: string
): Promise<void> {
  try {
    const orderRef = doc(db, SERVICE_ORDERS_COLLECTION, orderId);
    const orderDoc = await getDoc(orderRef);

    if (!orderDoc.exists()) {
      throw new Error(`Order ${orderId} not found`);
    }

    const orderData = orderDoc.data();
    const now = Date.now();

    // When DC is created, move order to 'inprogress'
    await updateDoc(orderRef, {
      orderStatus: 'inprogress',
      dcNumber,
      dcDate: now,
      dcApproved: true, // DC creation means it's approved
      updatedAt: serverTimestamp(),
    });

    await addOrderHistory(
      orderId,
      'dc_created',
      createdBy,
      createdByName,
      orderData.orderStatus as ServiceOrderStatus,
      'inprogress',
      { dcNumber, dcDate: now }
    );

    console.log(`DC ${dcNumber} created for order ${orderId}, moved to inprogress`);
  } catch (error) {
    console.error('Error creating DC:', error);
    throw error;
  }
}

/**
 * Approve Delivery Challan (moves order to inprogress for vendors)
 */
export async function approveDeliveryChallan(
  orderId: string,
  approvedBy: string,
  approvedByName: string
): Promise<void> {
  try {
    const orderRef = doc(db, SERVICE_ORDERS_COLLECTION, orderId);
    const orderDoc = await getDoc(orderRef);

    if (!orderDoc.exists()) {
      throw new Error(`Order ${orderId} not found`);
    }

    const orderData = orderDoc.data();

    await updateDoc(orderRef, {
      orderStatus: 'inprogress',
      dcApproved: true,
      updatedAt: serverTimestamp(),
    });

    await addOrderHistory(
      orderId,
      'dc_approved',
      approvedBy,
      approvedByName,
      orderData.orderStatus as ServiceOrderStatus,
      'inprogress',
      { dcNumber: orderData.dcNumber }
    );

    console.log(`DC approved for order ${orderId}, moved to inprogress`);
  } catch (error) {
    console.error('Error approving DC:', error);
    throw error;
  }
}

/**
 * Mark order as ready (for employees - ready to deliver)
 */
export async function markOrderReady(
  orderId: string,
  completedBy: string,
  completedByName: string
): Promise<void> {
  try {
    const orderRef = doc(db, SERVICE_ORDERS_COLLECTION, orderId);
    const orderDoc = await getDoc(orderRef);

    if (!orderDoc.exists()) {
      throw new Error(`Order ${orderId} not found`);
    }

    const orderData = orderDoc.data();
    const now = Date.now();

    await updateDoc(orderRef, {
      orderStatus: 'ready',
      completedDate: now,
      updatedAt: serverTimestamp(),
    });

    await addOrderHistory(
      orderId,
      'status_changed',
      completedBy,
      completedByName,
      orderData.orderStatus as ServiceOrderStatus,
      'ready',
      { completedDate: now }
    );

    console.log(`Order ${orderId} marked as ready`);
  } catch (error) {
    console.error('Error marking order ready:', error);
    throw error;
  }
}

/**
 * Mark job as completed (for vendors - job-completed status)
 */
export async function markJobCompleted(
  orderId: string,
  completedBy: string,
  completedByName: string
): Promise<void> {
  try {
    const orderRef = doc(db, SERVICE_ORDERS_COLLECTION, orderId);
    const orderDoc = await getDoc(orderRef);

    if (!orderDoc.exists()) {
      throw new Error(`Order ${orderId} not found`);
    }

    const orderData = orderDoc.data();
    const now = Date.now();

    await updateDoc(orderRef, {
      orderStatus: 'job-completed',
      completedDate: now,
      updatedAt: serverTimestamp(),
    });

    await addOrderHistory(
      orderId,
      'status_changed',
      completedBy,
      completedByName,
      orderData.orderStatus as ServiceOrderStatus,
      'job-completed',
      { completedDate: now }
    );

    // Create notification for admin
    try {
      if (orderData.adminId) {
        await createOrderCompletedNotification(
          orderId,
          orderData.jobWorkNo || orderId,
          orderData.adminId,
          completedByName,
          orderData.companyId
        );
      }
    } catch (notifError) {
      console.error('Error creating completion notification:', notifError);
    }

    console.log(`Order ${orderId} marked as job-completed`);
  } catch (error) {
    console.error('Error marking job completed:', error);
    throw error;
  }
}

/**
 * Record goods receipt (for vendor orders - moves to received-note)
 */
export async function recordGoodsReceipt(
  orderId: string,
  goodsReceiptNo: string,
  receivedBy: string,
  receivedByName: string
): Promise<void> {
  try {
    const orderRef = doc(db, SERVICE_ORDERS_COLLECTION, orderId);
    const orderDoc = await getDoc(orderRef);

    if (!orderDoc.exists()) {
      throw new Error(`Order ${orderId} not found`);
    }

    const orderData = orderDoc.data();
    const now = Date.now();

    await updateDoc(orderRef, {
      orderStatus: 'received-note',
      goodsReceiptNo,
      goodsReceivedDate: now,
      updatedAt: serverTimestamp(),
    });

    await addOrderHistory(
      orderId,
      'goods_received',
      receivedBy,
      receivedByName,
      orderData.orderStatus as ServiceOrderStatus,
      'received-note',
      { goodsReceiptNo, goodsReceivedDate: now }
    );

    console.log(`Goods receipt ${goodsReceiptNo} recorded for order ${orderId}`);
  } catch (error) {
    console.error('Error recording goods receipt:', error);
    throw error;
  }
}

/**
 * Mark order as delivered
 */
export async function markOrderDelivered(
  orderId: string,
  deliveredBy: string,
  deliveredByName: string,
  paymentStatus?: 'pending' | 'partial' | 'completed'
): Promise<void> {
  try {
    const orderRef = doc(db, SERVICE_ORDERS_COLLECTION, orderId);
    const orderDoc = await getDoc(orderRef);

    if (!orderDoc.exists()) {
      throw new Error(`Order ${orderId} not found`);
    }

    const orderData = orderDoc.data();
    const now = Date.now();

    const updateData: any = {
      orderStatus: 'delivered',
      deliveredDate: now,
      updatedAt: serverTimestamp(),
    };

    if (paymentStatus) {
      updateData.paymentStatus = paymentStatus;
    }

    await updateDoc(orderRef, updateData);

    await addOrderHistory(
      orderId,
      'delivered',
      deliveredBy,
      deliveredByName,
      orderData.orderStatus as ServiceOrderStatus,
      'delivered',
      { deliveredDate: now, paymentStatus }
    );

    console.log(`Order ${orderId} marked as delivered`);
  } catch (error) {
    console.error('Error marking order delivered:', error);
    throw error;
  }
}

/**
 * Reassign order to a different employee/vendor
 */
export async function reassignOrder(
  orderId: string,
  newAssignmentType: StitchingAllotmentType,
  newAssignedTo: string,
  newAssignedToName: string,
  reassignedBy: string,
  reassignedByName: string,
  materialCost?: number,
  jobWorkCost?: number
): Promise<void> {
  try {
    const orderRef = doc(db, SERVICE_ORDERS_COLLECTION, orderId);
    const orderDoc = await getDoc(orderRef);

    if (!orderDoc.exists()) {
      throw new Error(`Order ${orderId} not found`);
    }

    const orderData = orderDoc.data();
    const now = Date.now();

    // Generate new job work number if reassigning to vendor
    let jobWorkNo = orderData.jobWorkNo;
    if (newAssignmentType === 'vendor' && !jobWorkNo) {
      jobWorkNo = await generateJobWorkNo(orderData.companyId);
    }

    const updateData: any = {
      orderStatus: 'awaiting',
      assignmentType: newAssignmentType,
      previousAssignedTo: orderData.assignedTo,
      previousAssignedToName: orderData.assignedToName,
      assignedTo: newAssignedTo,
      assignedToName: newAssignedToName,
      assignedDate: now,
      assignedBy: reassignedBy,
      isReassigned: true,
      reassignedDate: now,
      // Clear rejection fields
      rejectedDate: null,
      rejectionReason: null,
      // Update costs if provided
      ...(materialCost !== undefined && { materialCost }),
      ...(jobWorkCost !== undefined && { jobWorkCost }),
      ...(jobWorkNo && { jobWorkNo }),
      updatedAt: serverTimestamp(),
    };

    await updateDoc(orderRef, removeUndefined(updateData));

    await addOrderHistory(
      orderId,
      'reassigned',
      reassignedBy,
      reassignedByName,
      orderData.orderStatus as ServiceOrderStatus,
      'awaiting',
      {
        previousAssignedTo: orderData.assignedTo,
        previousAssignedToName: orderData.assignedToName,
        newAssignedTo,
        newAssignedToName,
        newAssignmentType,
      }
    );

    // Create notification for the new assignee
    try {
      await createOrderReassignedNotification(
        orderId,
        orderData.jobWorkNo || orderId,
        newAssignedTo,
        newAssignmentType,
        reassignedByName,
        orderData.companyId
      );
    } catch (notifError) {
      console.error('Error creating reassignment notification:', notifError);
    }

    console.log(`Order ${orderId} reassigned to ${newAssignedToName}`);
  } catch (error) {
    console.error('Error reassigning order:', error);
    throw error;
  }
}

// ==========================================
// ORDER QUERY FUNCTIONS
// ==========================================

/**
 * Get orders assigned to a specific vendor
 */
export async function getOrdersByVendor(vendorId: string): Promise<ServiceOrderWithCompany[]> {
  try {
    const ordersRef = collection(db, SERVICE_ORDERS_COLLECTION);
    // Query by assignedTo only to avoid composite index requirement
    const q = query(
      ordersRef,
      where('assignedTo', '==', vendorId)
    );
    const snapshot = await getDocs(q);

    // Filter in memory for vendor assignment type
    const orders = snapshot.docs
      .map((doc) => {
        const data = doc.data();
        return {
          ...data,
          id: doc.id,
          createdAt: convertTimestamp(data.createdAt),
          updatedAt: convertTimestamp(data.updatedAt),
          serviceOrderDate: convertTimestamp(data.serviceOrderDate),
          expectedDeliveryDate: convertTimestamp(data.expectedDeliveryDate),
        } as ServiceOrderWithCompany;
      })
      .filter(order => order.assignmentType === 'vendor');

    console.log(`[getOrdersByVendor] Found ${orders.length} orders for vendor ${vendorId}`);
    return orders;
  } catch (error) {
    console.error('Error fetching vendor orders:', error);
    throw error;
  }
}

/**
 * Get orders assigned to a specific employee
 */
export async function getOrdersByEmployee(employeeId: string): Promise<ServiceOrderWithCompany[]> {
  try {
    const ordersRef = collection(db, SERVICE_ORDERS_COLLECTION);
    // Query by assignedTo only to avoid composite index requirement
    const q = query(
      ordersRef,
      where('assignedTo', '==', employeeId)
    );
    const snapshot = await getDocs(q);

    // Filter in memory for employee assignment type
    const orders = snapshot.docs
      .map((doc) => {
        const data = doc.data();
        return {
          ...data,
          id: doc.id,
          createdAt: convertTimestamp(data.createdAt),
          updatedAt: convertTimestamp(data.updatedAt),
          serviceOrderDate: convertTimestamp(data.serviceOrderDate),
          expectedDeliveryDate: convertTimestamp(data.expectedDeliveryDate),
        } as ServiceOrderWithCompany;
      })
      .filter(order => order.assignmentType === 'employee');

    console.log(`[getOrdersByEmployee] Found ${orders.length} orders for employee ${employeeId}`);
    return orders;
  } catch (error) {
    console.error('Error fetching employee orders:', error);
    throw error;
  }
}

/**
 * Subscribe to real-time orders updates for an employee
 */
export function subscribeToEmployeeOrders(
  employeeId: string,
  onUpdate: (orders: ServiceOrderWithCompany[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const ordersRef = collection(db, SERVICE_ORDERS_COLLECTION);
  const q = query(ordersRef, where('assignedTo', '==', employeeId));

  return onSnapshot(
    q,
    (snapshot) => {
      const orders = snapshot.docs
        .map((doc) => {
          const data = doc.data();
          return {
            ...data,
            id: doc.id,
            createdAt: convertTimestamp(data.createdAt),
            updatedAt: convertTimestamp(data.updatedAt),
            serviceOrderDate: convertTimestamp(data.serviceOrderDate),
            expectedDeliveryDate: convertTimestamp(data.expectedDeliveryDate),
          } as ServiceOrderWithCompany;
        })
        .filter(order => order.assignmentType === 'employee');

      // Sort by serviceOrderDate descending
      orders.sort((a, b) => b.serviceOrderDate - a.serviceOrderDate);

      console.log(`[Real-time] Employee orders updated: ${orders.length} orders for employee ${employeeId}`);
      onUpdate(orders);
    },
    (error) => {
      console.error('[Real-time] Error in employee orders subscription:', error);
      if (onError) {
        onError(error);
      }
    }
  );
}

/**
 * Subscribe to real-time orders updates for a vendor
 */
export function subscribeToVendorOrders(
  vendorId: string,
  onUpdate: (orders: ServiceOrderWithCompany[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const ordersRef = collection(db, SERVICE_ORDERS_COLLECTION);
  const q = query(ordersRef, where('assignedTo', '==', vendorId));

  return onSnapshot(
    q,
    (snapshot) => {
      const orders = snapshot.docs
        .map((doc) => {
          const data = doc.data();
          return {
            ...data,
            id: doc.id,
            createdAt: convertTimestamp(data.createdAt),
            updatedAt: convertTimestamp(data.updatedAt),
            serviceOrderDate: convertTimestamp(data.serviceOrderDate),
            expectedDeliveryDate: convertTimestamp(data.expectedDeliveryDate),
          } as ServiceOrderWithCompany;
        })
        .filter(order => order.assignmentType === 'vendor');

      // Sort by serviceOrderDate descending
      orders.sort((a, b) => b.serviceOrderDate - a.serviceOrderDate);

      console.log(`[Real-time] Vendor orders updated: ${orders.length} orders for vendor ${vendorId}`);
      onUpdate(orders);
    },
    (error) => {
      console.error('[Real-time] Error in vendor orders subscription:', error);
      if (onError) {
        onError(error);
      }
    }
  );
}

/**
 * Get orders by status
 */
export async function getOrdersByStatus(
  companyId: string,
  status: ServiceOrderStatus
): Promise<ServiceOrderWithCompany[]> {
  try {
    const ordersRef = collection(db, SERVICE_ORDERS_COLLECTION);
    const q = query(
      ordersRef,
      where('companyId', '==', companyId),
      where('orderStatus', '==', status)
    );
    const snapshot = await getDocs(q);

    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        ...data,
        id: doc.id,
        createdAt: convertTimestamp(data.createdAt),
        updatedAt: convertTimestamp(data.updatedAt),
        serviceOrderDate: convertTimestamp(data.serviceOrderDate),
        expectedDeliveryDate: convertTimestamp(data.expectedDeliveryDate),
      } as ServiceOrderWithCompany;
    });
  } catch (error) {
    console.error(`Error fetching orders with status ${status}:`, error);
    throw error;
  }
}

/**
 * Get vendor orders waiting for DC (waitingForDC status)
 * These orders should appear in the DC "Stitched Order ID" dropdown
 */
export async function getOrdersWaitingForDC(companyId: string): Promise<ServiceOrderWithCompany[]> {
  try {
    const ordersRef = collection(db, SERVICE_ORDERS_COLLECTION);
    const q = query(
      ordersRef,
      where('companyId', '==', companyId),
      where('assignmentType', '==', 'vendor'),
      where('orderStatus', '==', 'waitingForDC')
    );
    const snapshot = await getDocs(q);

    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        ...data,
        id: doc.id,
        createdAt: convertTimestamp(data.createdAt),
        updatedAt: convertTimestamp(data.updatedAt),
        serviceOrderDate: convertTimestamp(data.serviceOrderDate),
        expectedDeliveryDate: convertTimestamp(data.expectedDeliveryDate),
      } as ServiceOrderWithCompany;
    });
  } catch (error) {
    console.error('Error fetching orders waiting for DC:', error);
    throw error;
  }
}

/**
 * @deprecated Use getOrdersWaitingForDC instead
 * Get vendor orders pending DC approval (awaiting status with assignmentType = vendor)
 */
export async function getVendorOrdersPendingDC(companyId: string): Promise<ServiceOrderWithCompany[]> {
  return getOrdersWaitingForDC(companyId);
}

/**
 * Get job-completed orders pending goods receipt
 */
export async function getOrdersPendingGoodsReceipt(companyId: string): Promise<ServiceOrderWithCompany[]> {
  try {
    const ordersRef = collection(db, SERVICE_ORDERS_COLLECTION);
    const q = query(
      ordersRef,
      where('companyId', '==', companyId),
      where('assignmentType', '==', 'vendor'),
      where('orderStatus', '==', 'job-completed')
    );
    const snapshot = await getDocs(q);

    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        ...data,
        id: doc.id,
        createdAt: convertTimestamp(data.createdAt),
        updatedAt: convertTimestamp(data.updatedAt),
        serviceOrderDate: convertTimestamp(data.serviceOrderDate),
        expectedDeliveryDate: convertTimestamp(data.expectedDeliveryDate),
      } as ServiceOrderWithCompany;
    });
  } catch (error) {
    console.error('Error fetching orders pending goods receipt:', error);
    throw error;
  }
}

/**
 * Get rejected orders
 */
export async function getRejectedOrders(companyId: string): Promise<ServiceOrderWithCompany[]> {
  try {
    const ordersRef = collection(db, SERVICE_ORDERS_COLLECTION);
    const q = query(
      ordersRef,
      where('companyId', '==', companyId),
      where('orderStatus', '==', 'rejected'),
      where('isReassigned', '!=', true)
    );
    const snapshot = await getDocs(q);

    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        ...data,
        id: doc.id,
        createdAt: convertTimestamp(data.createdAt),
        updatedAt: convertTimestamp(data.updatedAt),
        serviceOrderDate: convertTimestamp(data.serviceOrderDate),
        expectedDeliveryDate: convertTimestamp(data.expectedDeliveryDate),
      } as ServiceOrderWithCompany;
    });
  } catch (error) {
    console.error('Error fetching rejected orders:', error);
    throw error;
  }
}
