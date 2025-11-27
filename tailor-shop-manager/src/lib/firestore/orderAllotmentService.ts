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
  deleteField,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { OrderAllotment, ServiceOrderStatus } from '@/lib/types';
import { updateServiceOrderStatus } from './serviceOrderService';

const ORDER_ALLOTMENTS_COLLECTION = 'orderAllotment';

/**
 * Generate auto-incrementing job work ID
 * Format: JOB0001, JOB0002, etc.
 */
async function generateJobWorkId(companyId: string): Promise<string> {
  try {
    const allotmentsRef = collection(db, ORDER_ALLOTMENTS_COLLECTION);
    const q = query(allotmentsRef, where('companyId', '==', companyId));
    const snapshot = await getDocs(q);
    const count = snapshot.size + 1;
    return `JOB${count.toString().padStart(4, '0')}`;
  } catch (error) {
    console.error('[orderAllotmentService] Error generating job work ID:', error);
    return `JOB${Date.now()}`;
  }
}

/**
 * Add a new order allotment to Firestore
 */
export async function addOrderAllotment(
  allotmentData: Omit<OrderAllotment, 'id' | 'createdAt' | 'updatedAt'>,
  companyId: string,
  adminId: string
): Promise<OrderAllotment> {
  try {
    const jobWorkId = await generateJobWorkId(companyId);

    // Create initial history entry
    const initialHistoryEntry = {
      timestamp: Date.now(),
      action: 'created' as const,
      newStatus: allotmentData.stitchingAllotment === 'vendor' ? 'allotted' : 'open',
      newAssignedTo: allotmentData.assignedTo,
      newAssignedName: allotmentData.assignedName,
      newStitchingAllotment: allotmentData.stitchingAllotment,
      newMaterialCost: allotmentData.materialCost,
      newJobWorkCost: allotmentData.jobWorkCost,
      notes: `Order allotment created. Job Work ID: ${jobWorkId}. Assigned to ${allotmentData.assignedName}`,
      performedBy: adminId,
    };

    const newAllotment: OrderAllotment = {
      ...allotmentData,
      id: jobWorkId,
      companyId,
      adminId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      history: [initialHistoryEntry],
    };

    // If this is a vendor allotment, initialize vendor-specific fields
    if (allotmentData.stitchingAllotment === 'vendor') {
      newAllotment.status = 'allotted'; // Initialize status for job work tailor
      newAllotment.assignedDate = Date.now(); // Set assignment date
      newAllotment.jobWorkNo = jobWorkId; // Set job work number for reference
      newAllotment.jobWorkTailorId = allotmentData.assignedTo; // Set job work tailor ID
      newAllotment.jobWorkTailorName = allotmentData.assignedName; // Set job work tailor name
      newAllotment.orderNumber = allotmentData.serviceOrderNo; // Set order number for reference
    }

    console.log('[orderAllotmentService] Adding order allotment:', newAllotment);

    await setDoc(doc(db, ORDER_ALLOTMENTS_COLLECTION, jobWorkId), {
      ...newAllotment,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    // Update service order status to 'pending' (after job allotment)
    await updateServiceOrderStatus(allotmentData.serviceOrderNo, 'pending');
    console.log(`[orderAllotmentService] Updated service order ${allotmentData.serviceOrderNo} status to 'pending'`);

    console.log(`[orderAllotmentService] Order allotment ${jobWorkId} added successfully with initial history`);
    return newAllotment;
  } catch (error) {
    console.error('[orderAllotmentService] Error adding order allotment:', error);
    throw error;
  }
}

/**
 * Get all order allotments for a company
 */
export async function getOrderAllotmentsByCompany(companyId: string): Promise<OrderAllotment[]> {
  try {
    const allotmentsRef = collection(db, ORDER_ALLOTMENTS_COLLECTION);
    const q = query(allotmentsRef, where('companyId', '==', companyId));
    const snapshot = await getDocs(q);

    const allotments: OrderAllotment[] = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        ...data,
        createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toMillis() : data.createdAt,
        updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toMillis() : data.updatedAt,
      } as OrderAllotment;
    });

    console.log(`[orderAllotmentService] Loaded ${allotments.length} order allotments for company ${companyId}`);
    return allotments;
  } catch (error) {
    console.error('[orderAllotmentService] Error getting order allotments:', error);
    throw error;
  }
}

/**
 * Get a specific order allotment by ID
 */
export async function getOrderAllotment(allotmentId: string): Promise<OrderAllotment | null> {
  try {
    const allotmentDoc = await getDoc(doc(db, ORDER_ALLOTMENTS_COLLECTION, allotmentId));

    if (!allotmentDoc.exists()) {
      console.log(`[orderAllotmentService] Order allotment ${allotmentId} not found`);
      return null;
    }

    const data = allotmentDoc.data();
    return {
      ...data,
      createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toMillis() : data.createdAt,
      updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toMillis() : data.updatedAt,
    } as OrderAllotment;
  } catch (error) {
    console.error('[orderAllotmentService] Error getting order allotment:', error);
    throw error;
  }
}

/**
 * Update an order allotment
 */
export async function updateOrderAllotment(
  allotmentId: string,
  allotmentData: Partial<Omit<OrderAllotment, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<void> {
  try {
    console.log(`[orderAllotmentService] Updating order allotment ${allotmentId}`);

    await updateDoc(doc(db, ORDER_ALLOTMENTS_COLLECTION, allotmentId), {
      ...allotmentData,
      updatedAt: serverTimestamp(),
    });

    console.log(`[orderAllotmentService] Order allotment ${allotmentId} updated successfully`);
  } catch (error) {
    console.error('[orderAllotmentService] Error updating order allotment:', error);
    throw error;
  }
}

/**
 * Update order allotment status
 */
export async function updateOrderAllotmentStatus(
  allotmentId: string,
  status: 'open' | 'in-progress' | 'closed'
): Promise<void> {
  try {
    console.log(`[orderAllotmentService] Updating order allotment ${allotmentId} status to ${status}`);

    await updateDoc(doc(db, ORDER_ALLOTMENTS_COLLECTION, allotmentId), {
      orderStatus: status,
      updatedAt: serverTimestamp(),
    });

    console.log(`[orderAllotmentService] Order allotment ${allotmentId} status updated to ${status}`);
  } catch (error) {
    console.error('[orderAllotmentService] Error updating order allotment status:', error);
    throw error;
  }
}

/**
 * Update both order allotment status and service order status
 */
export async function updateOrderAllotmentWithServiceStatus(
  allotmentId: string,
  orderStatus: 'open' | 'in-progress' | 'closed',
  serviceOrderStatus: ServiceOrderStatus
): Promise<void> {
  try {
    console.log(`[orderAllotmentService] Updating order allotment ${allotmentId} - orderStatus: ${orderStatus}, serviceOrderStatus: ${serviceOrderStatus}`);

    await updateDoc(doc(db, ORDER_ALLOTMENTS_COLLECTION, allotmentId), {
      orderStatus: orderStatus,
      serviceOrderStatus: serviceOrderStatus,
      updatedAt: serverTimestamp(),
    });

    console.log(`[orderAllotmentService] Order allotment ${allotmentId} updated successfully`);
  } catch (error) {
    console.error('[orderAllotmentService] Error updating order allotment:', error);
    throw error;
  }
}

/**
 * Generate unique stitched ID
 * Format: ST0001, ST0002, etc.
 */
async function generateStitchedId(companyId: string): Promise<string> {
  try {
    const allotmentsRef = collection(db, ORDER_ALLOTMENTS_COLLECTION);
    const q = query(
      allotmentsRef,
      where('companyId', '==', companyId),
      where('status', '==', 'stitched')
    );
    const snapshot = await getDocs(q);
    const count = snapshot.size + 1;
    return `ST${count.toString().padStart(4, '0')}`;
  } catch (error) {
    console.error('[orderAllotmentService] Error generating stitched ID:', error);
    return `ST${Date.now()}`;
  }
}

/**
 * Update vendor/job work tailor status (for Job Work Tailor Dashboard)
 * This updates the 'status' field used by job work tailors to track their work
 * When status is 'stitched', it generates a stitched ID and updates both collections
 */
export async function updateVendorOrderStatus(
  allotmentId: string,
  status: 'allotted' | 'in_progress' | 'stitched' | 'rejected',
  performedBy?: string
): Promise<void> {
  try {
    console.log(`[orderAllotmentService] Updating vendor order ${allotmentId} status to ${status}`);

    // Get the order allotment to access serviceOrderNo and companyId
    const allotmentDoc = await getDoc(doc(db, ORDER_ALLOTMENTS_COLLECTION, allotmentId));
    if (!allotmentDoc.exists()) {
      throw new Error('Order allotment not found');
    }

    const allotmentData = allotmentDoc.data();
    const currentHistory = allotmentData.history || [];

    const updateData: any = {
      status: status,
      updatedAt: serverTimestamp(),
    };

    // Create history entry for status change
    const historyEntry: any = {
      timestamp: Date.now(),
      action: 'status_changed',
      previousStatus: allotmentData.status,
      newStatus: status,
      notes: `Status changed from ${allotmentData.status || 'unknown'} to ${status}`,
      performedBy: performedBy || allotmentData.assignedName || 'vendor',
    };

    // If status is stitched, generate stitched ID and update service order
    if (status === 'stitched') {
      const stitchedId = await generateStitchedId(allotmentData.companyId);
      updateData.stitchedId = stitchedId;
      updateData.stitchedDate = serverTimestamp();

      // Update orderStatus to 'closed' when stitched
      updateData.orderStatus = 'closed';

      // Add stitched ID to history entry
      historyEntry.stitchedId = stitchedId;
      historyEntry.notes = `Order stitched. Stitched ID: ${stitchedId}`;

      console.log(`[orderAllotmentService] Generated stitched ID: ${stitchedId}`);

      // Update the service order status in newOrder collection
      if (allotmentData.serviceOrderNo) {
        try {
          const { updateServiceOrderStatus } = await import('./serviceOrderService');
          await updateServiceOrderStatus(allotmentData.serviceOrderNo, 'ready');
          console.log(`[orderAllotmentService] Updated service order ${allotmentData.serviceOrderNo} to 'ready'`);
        } catch (serviceOrderError) {
          console.error('[orderAllotmentService] Error updating service order:', serviceOrderError);
          // Continue with the allotment update even if service order update fails
        }
      }
    }

    // Add history entry to update data
    updateData.history = [...currentHistory, historyEntry];

    // Update the order allotment
    await updateDoc(doc(db, ORDER_ALLOTMENTS_COLLECTION, allotmentId), updateData);

    console.log(`[orderAllotmentService] Vendor order ${allotmentId} status updated to ${status} with history`);
  } catch (error) {
    console.error('[orderAllotmentService] Error updating vendor order status:', error);
    throw error;
  }
}

/**
 * Reassign a stitched order to a new employee or vendor
 * This resets the status from 'stitched' back to 'allotted' and updates assignment details
 * Preserves all history including previous stitched details
 */
export async function reassignStitchedOrder(
  allotmentId: string,
  newAssignment: {
    stitchingAllotment: 'employee' | 'vendor';
    assignedTo: string;
    assignedName: string;
    materialCost: number;
    jobWorkCost: number;
    expectedDeliveryDate: number;
  },
  performedBy?: string
): Promise<void> {
  try {
    console.log(`[orderAllotmentService] Reassigning stitched order ${allotmentId}`);

    // Get current order data to preserve in history
    const allotmentDoc = await getDoc(doc(db, ORDER_ALLOTMENTS_COLLECTION, allotmentId));
    if (!allotmentDoc.exists()) {
      throw new Error('Order allotment not found');
    }

    const currentData = allotmentDoc.data();
    const currentHistory = currentData.history || [];

    // Create history entry for this reassignment
    const historyEntry: any = {
      timestamp: Date.now(),
      action: 'reassigned',
      previousStatus: currentData.status ?? 'unknown',
      newStatus: currentData.status ?? 'stitched', // Keep the same status (stitched)
      previousAssignedTo: currentData.assignedTo ?? '',
      previousAssignedName: currentData.assignedName ?? '',
      newAssignedTo: newAssignment.assignedTo,
      newAssignedName: newAssignment.assignedName,
      previousStitchingAllotment: currentData.stitchingAllotment ?? '',
      newStitchingAllotment: newAssignment.stitchingAllotment,
      previousMaterialCost: currentData.materialCost ?? 0,
      newMaterialCost: newAssignment.materialCost ?? 0,
      previousJobWorkCost: currentData.jobWorkCost ?? 0,
      newJobWorkCost: newAssignment.jobWorkCost ?? 0,
      stitchedId: currentData.stitchedId ?? '', // Preserve stitched ID
      stitchedDate: currentData.stitchedDate ?? null, // Preserve stitched date
      notes: `Stitched order reassigned from ${currentData.assignedName ?? 'previous tailor'} to ${newAssignment.assignedName}`,
      performedBy: performedBy || 'admin',
      reassigned: true, // Mark as reassigned
    };

    const updateData: any = {
      status: currentData.status ?? 'stitched', // Keep status as stitched, not rejected
      stitchingAllotment: newAssignment.stitchingAllotment,
      assignedTo: newAssignment.assignedTo,
      assignedName: newAssignment.assignedName,
      materialCost: newAssignment.materialCost ?? 0,
      jobWorkCost: newAssignment.jobWorkCost ?? 0,
      orderStatus: 'open', // Reset to open so new tailor can accept
      assignedDate: serverTimestamp(),
      updatedAt: serverTimestamp(),
      reassigned: true, // Mark this order as reassigned
      reassignedDate: serverTimestamp(), // Add reassignment timestamp
      // Keep stitchedId and stitchedDate for reference/history
      // Add history entry
      history: [...currentHistory, historyEntry],
    };

    // Only add expectedDeliveryDate if it's defined
    if (newAssignment.expectedDeliveryDate !== undefined) {
      updateData.expectedDeliveryDate = newAssignment.expectedDeliveryDate;
    }

    // If reassigning to vendor, set vendor-specific fields
    if (newAssignment.stitchingAllotment === 'vendor') {
      updateData.jobWorkTailorId = newAssignment.assignedTo;
      updateData.jobWorkTailorName = newAssignment.assignedName;
    } else {
      // If reassigning to employee, remove vendor-specific fields
      updateData.jobWorkTailorId = deleteField();
      updateData.jobWorkTailorName = deleteField();
    }

    await updateDoc(doc(db, ORDER_ALLOTMENTS_COLLECTION, allotmentId), updateData);

    console.log(`[orderAllotmentService] Stitched order ${allotmentId} reassigned successfully with history preserved`);
  } catch (error) {
    console.error('[orderAllotmentService] Error reassigning stitched order:', error);
    throw error;
  }
}

/**
 * Reject an order allotment (called by tailor/vendor)
 * Updates status to 'rejected' and adds history entry
 */
export async function rejectOrderAllotment(
  allotmentId: string,
  rejectedBy?: string
): Promise<void> {
  try {
    console.log(`[orderAllotmentService] Rejecting order allotment ${allotmentId}`);

    // Get current order data
    const allotmentDoc = await getDoc(doc(db, ORDER_ALLOTMENTS_COLLECTION, allotmentId));
    if (!allotmentDoc.exists()) {
      throw new Error('Order allotment not found');
    }

    const currentData = allotmentDoc.data();
    const currentHistory = currentData.history || [];

    // Create history entry for rejection
    const historyEntry: any = {
      timestamp: Date.now(),
      action: 'rejected',
      previousStatus: currentData.status ?? 'unknown',
      newStatus: 'rejected',
      notes: `Order rejected by ${rejectedBy || currentData.assignedName || 'tailor'}`,
      performedBy: rejectedBy || currentData.assignedTo || 'tailor',
      rejectedBy: rejectedBy || currentData.assignedName || 'tailor',
      rejectedDate: Date.now(),
    };

    // Update the order allotment
    const updateData: any = {
      status: 'rejected',
      orderStatus: 'open', // Reset to open so it can be reassigned
      rejectedDate: serverTimestamp(),
      updatedAt: serverTimestamp(),
      history: [...currentHistory, historyEntry],
    };

    await updateDoc(doc(db, ORDER_ALLOTMENTS_COLLECTION, allotmentId), updateData);

    console.log(`[orderAllotmentService] Order allotment ${allotmentId} rejected successfully`);
  } catch (error) {
    console.error('[orderAllotmentService] Error rejecting order allotment:', error);
    throw error;
  }
}

/**
 * Delete an order allotment
 */
export async function deleteOrderAllotment(allotmentId: string): Promise<void> {
  try {
    console.log(`[orderAllotmentService] Deleting order allotment ${allotmentId}`);

    await deleteDoc(doc(db, ORDER_ALLOTMENTS_COLLECTION, allotmentId));

    console.log(`[orderAllotmentService] Order allotment ${allotmentId} deleted successfully`);
  } catch (error) {
    console.error('[orderAllotmentService] Error deleting order allotment:', error);
    throw error;
  }
}

/**
 * Get order allotments by service order number
 */
export async function getOrderAllotmentsByServiceOrder(serviceOrderNo: string): Promise<OrderAllotment[]> {
  try {
    const allotmentsRef = collection(db, ORDER_ALLOTMENTS_COLLECTION);
    const q = query(allotmentsRef, where('serviceOrderNo', '==', serviceOrderNo));
    const snapshot = await getDocs(q);

    const allotments: OrderAllotment[] = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        ...data,
        createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toMillis() : data.createdAt,
        updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toMillis() : data.updatedAt,
      } as OrderAllotment;
    });

    console.log(`[orderAllotmentService] Found ${allotments.length} allotments for service order ${serviceOrderNo}`);
    return allotments;
  } catch (error) {
    console.error('[orderAllotmentService] Error getting allotments by service order:', error);
    throw error;
  }
}

/**
 * Get order allotments by tailor/employee ID
 */
export async function getOrderAllotmentsByTailor(employeeId: string): Promise<OrderAllotment[]> {
  try {
    const allotmentsRef = collection(db, ORDER_ALLOTMENTS_COLLECTION);
    const q = query(allotmentsRef, where('assignedTo', '==', employeeId));
    const snapshot = await getDocs(q);

    const allotments: OrderAllotment[] = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        ...data,
        createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toMillis() : data.createdAt,
        updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toMillis() : data.updatedAt,
      } as OrderAllotment;
    });

    console.log(`[orderAllotmentService] Found ${allotments.length} allotments for tailor ${employeeId}`);
    return allotments;
  } catch (error) {
    console.error('[orderAllotmentService] Error getting allotments by tailor:', error);
    throw error;
  }
}

/**
 * Get order allotments by vendor/job work tailor ID
 * Queries for allotments where stitchingAllotment is 'vendor' and assignedTo matches vendorId
 */
export async function getOrderAllotmentsByVendor(vendorId: string): Promise<OrderAllotment[]> {
  try {
    const allotmentsRef = collection(db, ORDER_ALLOTMENTS_COLLECTION);
    // Query for vendor allotments where assignedTo matches the vendor ID
    const q = query(
      allotmentsRef,
      where('stitchingAllotment', '==', 'vendor'),
      where('assignedTo', '==', vendorId)
    );
    const snapshot = await getDocs(q);

    const allotments: OrderAllotment[] = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        ...data,
        createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toMillis() : data.createdAt,
        updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toMillis() : data.updatedAt,
        assignedDate: data.assignedDate instanceof Timestamp ? data.assignedDate.toMillis() : data.assignedDate || data.jobWorkDate,
      } as OrderAllotment;
    });

    console.log(`[orderAllotmentService] Found ${allotments.length} allotments for vendor ${vendorId}`);
    return allotments;
  } catch (error) {
    console.error('[orderAllotmentService] Error getting allotments by vendor:', error);
    throw error;
  }
}

/**
 * Get stitched orders by company
 * Returns orders with status 'stitched'
 */
export async function getStitchedOrdersByCompany(companyId: string): Promise<OrderAllotment[]> {
  try {
    const allotmentsRef = collection(db, ORDER_ALLOTMENTS_COLLECTION);
    const q = query(
      allotmentsRef,
      where('companyId', '==', companyId),
      where('status', '==', 'stitched')
    );
    const snapshot = await getDocs(q);

    const allotments: OrderAllotment[] = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        ...data,
        createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toMillis() : data.createdAt,
        updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toMillis() : data.updatedAt,
        stitchedDate: data.stitchedDate instanceof Timestamp ? data.stitchedDate.toMillis() : data.stitchedDate,
      } as OrderAllotment;
    });

    console.log(`[orderAllotmentService] Found ${allotments.length} stitched orders for company ${companyId}`);
    return allotments;
  } catch (error) {
    console.error('[orderAllotmentService] Error getting stitched orders:', error);
    throw error;
  }
}
