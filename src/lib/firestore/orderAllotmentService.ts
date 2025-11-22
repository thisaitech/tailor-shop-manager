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

    const newAllotment: OrderAllotment = {
      ...allotmentData,
      id: jobWorkId,
      companyId,
      adminId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    console.log('[orderAllotmentService] Adding order allotment:', newAllotment);

    await setDoc(doc(db, ORDER_ALLOTMENTS_COLLECTION, jobWorkId), {
      ...newAllotment,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    // Update service order status to 'pending' (after job allotment)
    await updateServiceOrderStatus(allotmentData.serviceOrderNo, 'pending');
    console.log(`[orderAllotmentService] Updated service order ${allotmentData.serviceOrderNo} status to 'pending'`);

    console.log(`[orderAllotmentService] Order allotment ${jobWorkId} added successfully`);
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
