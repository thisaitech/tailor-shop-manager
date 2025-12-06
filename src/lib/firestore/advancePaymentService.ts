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
import { getDb } from '@/lib/firebase';
import { AdvancePayment } from '@/lib/types';
import { updateServiceOrderStatus } from './serviceOrderService';

const ADVANCE_PAYMENTS_COLLECTION = 'advancePayments';

/**
 * Generate auto-incrementing proforma invoice ID
 * Format: PI0001, PI0002, etc.
 */
export async function generateProformaInvoiceId(companyId: string): Promise<string> {
  try {
    const db = await getDb();
    console.log('[advancePaymentService] ==========================================');
    console.log('[advancePaymentService] Generating proforma invoice ID for companyId:', companyId);
    console.log('[advancePaymentService] Collection name:', ADVANCE_PAYMENTS_COLLECTION);

    const paymentsRef = collection(db, ADVANCE_PAYMENTS_COLLECTION);
    const q = query(paymentsRef, where('companyId', '==', companyId));
    const snapshot = await getDocs(q);

    console.log('[advancePaymentService] Total documents found:', snapshot.size);

    // Log all documents for debugging
    snapshot.docs.forEach(doc => {
      const data = doc.data();
      console.log(`[advancePaymentService] Document ID: ${doc.id}, companyId: ${data.companyId}`);
    });

    // Get all existing IDs and find the highest number
    const existingIds = snapshot.docs.map(doc => doc.id);
    console.log('[advancePaymentService] Existing proforma invoice IDs:', existingIds);

    let maxNum = 0;

    existingIds.forEach(id => {
      const match = id.match(/^PI(\d+)$/);
      if (match) {
        const num = parseInt(match[1], 10);
        console.log(`[advancePaymentService] Found invoice ${id} with number ${num}`);
        if (num > maxNum) maxNum = num;
      } else {
        console.warn(`[advancePaymentService] Invalid proforma invoice ID format: ${id}`);
      }
    });

    const count = maxNum + 1;
    const newCode = `PI${count.toString().padStart(4, '0')}`;
    console.log(`[advancePaymentService] Max number found: ${maxNum}, Generated new code: ${newCode}`);
    console.log('[advancePaymentService] ==========================================');

    return newCode;
  } catch (error) {
    console.error('[advancePaymentService] Error generating proforma invoice ID:', error);
    return `PI${Date.now().toString().slice(-4)}`;
  }
}

/**
 * Generate auto-incrementing invoice number
 * Format: INV0001, INV0002, etc.
 */
async function generateInvoiceNumber(companyId: string): Promise<string> {
  try {
    const db = await getDb();
    console.log('[advancePaymentService] Generating invoice number for companyId:', companyId);

    const paymentsRef = collection(db, ADVANCE_PAYMENTS_COLLECTION);
    const q = query(paymentsRef, where('companyId', '==', companyId));
    const snapshot = await getDocs(q);

    console.log('[advancePaymentService] Total documents found for invoice number:', snapshot.size);

    // Get all existing invoice numbers and find the highest number
    let maxNum = 0;

    snapshot.docs.forEach(doc => {
      const data = doc.data();
      const invoiceNo = data.invoiceNo;
      if (invoiceNo) {
        const match = invoiceNo.match(/^INV(\d+)$/);
        if (match) {
          const num = parseInt(match[1], 10);
          console.log(`[advancePaymentService] Found invoice ${invoiceNo} with number ${num}`);
          if (num > maxNum) maxNum = num;
        }
      }
    });

    const count = maxNum + 1;
    const newCode = `INV${count.toString().padStart(4, '0')}`;
    console.log(`[advancePaymentService] Generated invoice number: ${newCode}`);

    return newCode;
  } catch (error) {
    console.error('[advancePaymentService] Error generating invoice number:', error);
    return `INV${Date.now().toString().slice(-4)}`;
  }
}

/**
 * Add a new advance payment to Firestore
 */
export async function addAdvancePayment(
  paymentData: Omit<AdvancePayment, 'id' | 'proformaInvoiceNo' | 'invoiceNo' | 'createdAt' | 'updatedAt'>,
  companyId: string,
  adminId: string
): Promise<AdvancePayment> {
  try {
    const db = await getDb();
    // Generate both invoice numbers in parallel for efficiency
    const [proformaInvoiceId, invoiceNo] = await Promise.all([
      generateProformaInvoiceId(companyId),
      generateInvoiceNumber(companyId),
    ]);

    const newPayment: AdvancePayment = {
      ...paymentData,
      id: proformaInvoiceId,
      proformaInvoiceNo: proformaInvoiceId,
      invoiceNo: invoiceNo,
      companyId,
      adminId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    console.log('[advancePaymentService] Adding advance payment:', newPayment);
    console.log(`[advancePaymentService] Generated Invoice No: ${invoiceNo}, PI No: ${proformaInvoiceId}`);

    await setDoc(doc(db, ADVANCE_PAYMENTS_COLLECTION, proformaInvoiceId), {
      ...newPayment,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    // Update service order status to 'open' when advance payment is received
    if (paymentData.serviceOrderNo) {
      await updateServiceOrderStatus(paymentData.serviceOrderNo, 'open');
      console.log(`[advancePaymentService] Updated service order ${paymentData.serviceOrderNo} status to 'open'`);
    }

    console.log(`[advancePaymentService] Advance payment ${proformaInvoiceId} (Invoice: ${invoiceNo}) added successfully`);
    return newPayment;
  } catch (error) {
    console.error('[advancePaymentService] Error adding advance payment:', error);
    throw error;
  }
}

/**
 * Get all advance payments for a company
 */
export async function getAdvancePaymentsByCompany(companyId: string): Promise<AdvancePayment[]> {
  try {
    const db = await getDb();
    const paymentsRef = collection(db, ADVANCE_PAYMENTS_COLLECTION);
    const q = query(paymentsRef, where('companyId', '==', companyId));
    const snapshot = await getDocs(q);

    const payments: AdvancePayment[] = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        ...data,
        createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toMillis() : data.createdAt,
        updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toMillis() : data.updatedAt,
      } as AdvancePayment;
    });

    console.log(`[advancePaymentService] Loaded ${payments.length} advance payments for company ${companyId}`);
    return payments;
  } catch (error) {
    console.error('[advancePaymentService] Error getting advance payments:', error);
    throw error;
  }
}

/**
 * Get a specific advance payment by ID
 */
export async function getAdvancePayment(paymentId: string): Promise<AdvancePayment | null> {
  try {
    const db = await getDb();
    const paymentDoc = await getDoc(doc(db, ADVANCE_PAYMENTS_COLLECTION, paymentId));

    if (!paymentDoc.exists()) {
      console.log(`[advancePaymentService] Advance payment ${paymentId} not found`);
      return null;
    }

    const data = paymentDoc.data();
    return {
      ...data,
      createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toMillis() : data.createdAt,
      updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toMillis() : data.updatedAt,
    } as AdvancePayment;
  } catch (error) {
    console.error('[advancePaymentService] Error getting advance payment:', error);
    throw error;
  }
}

/**
 * Update an advance payment
 */
export async function updateAdvancePayment(
  paymentId: string,
  paymentData: Partial<Omit<AdvancePayment, 'id' | 'proformaInvoiceNo' | 'createdAt' | 'updatedAt'>>
): Promise<void> {
  try {
    const db = await getDb();
    console.log(`[advancePaymentService] Updating advance payment ${paymentId}`);

    await updateDoc(doc(db, ADVANCE_PAYMENTS_COLLECTION, paymentId), {
      ...paymentData,
      updatedAt: serverTimestamp(),
    });

    console.log(`[advancePaymentService] Advance payment ${paymentId} updated successfully`);
  } catch (error) {
    console.error('[advancePaymentService] Error updating advance payment:', error);
    throw error;
  }
}

/**
 * Delete an advance payment
 */
export async function deleteAdvancePayment(paymentId: string): Promise<void> {
  try {
    const db = await getDb();
    console.log(`[advancePaymentService] Deleting advance payment ${paymentId}`);

    await deleteDoc(doc(db, ADVANCE_PAYMENTS_COLLECTION, paymentId));

    console.log(`[advancePaymentService] Advance payment ${paymentId} deleted successfully`);
  } catch (error) {
    console.error('[advancePaymentService] Error deleting advance payment:', error);
    throw error;
  }
}

/**
 * Get advance payments by service order number
 */
export async function getAdvancePaymentsByServiceOrder(serviceOrderNo: string): Promise<AdvancePayment[]> {
  try {
    const db = await getDb();
    const paymentsRef = collection(db, ADVANCE_PAYMENTS_COLLECTION);
    const q = query(paymentsRef, where('serviceOrderNo', '==', serviceOrderNo));
    const snapshot = await getDocs(q);

    const payments: AdvancePayment[] = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        ...data,
        createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toMillis() : data.createdAt,
        updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toMillis() : data.updatedAt,
      } as AdvancePayment;
    });

    console.log(`[advancePaymentService] Found ${payments.length} payments for service order ${serviceOrderNo}`);
    return payments;
  } catch (error) {
    console.error('[advancePaymentService] Error getting payments by service order:', error);
    throw error;
  }
}

/**
 * Get advance payments by job work number
 */
export async function getAdvancePaymentsByJobWork(jobWorkNo: string): Promise<AdvancePayment[]> {
  try {
    const db = await getDb();
    const paymentsRef = collection(db, ADVANCE_PAYMENTS_COLLECTION);
    const q = query(paymentsRef, where('jobWorkNo', '==', jobWorkNo));
    const snapshot = await getDocs(q);

    const payments: AdvancePayment[] = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        ...data,
        createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toMillis() : data.createdAt,
        updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toMillis() : data.updatedAt,
      } as AdvancePayment;
    });

    console.log(`[advancePaymentService] Found ${payments.length} payments for job work ${jobWorkNo}`);
    return payments;
  } catch (error) {
    console.error('[advancePaymentService] Error getting payments by job work:', error);
    throw error;
  }
}
