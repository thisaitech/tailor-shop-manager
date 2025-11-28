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
import { ServiceOrder, EmbeddedAllotment } from '@/lib/types';

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
