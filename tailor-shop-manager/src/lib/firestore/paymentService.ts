import {
  collection,
  doc,
  setDoc,
  getDocs,
  query,
  where,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

const PAYMENT_COLLECTION = 'payments';

// Payment mode type
export type PaymentMode = 'cash' | 'qr_pay' | 'nil';

// Order category type
export type OrderCategory = 'male' | 'female' | 'kids';

// Payment interface
export interface Payment {
  id: string; // PAY001, PAY002, etc.
  paymentNo: string; // Same as id
  serviceOrderNo: string; // Reference to Service Order
  serviceOrderDate: number; // Timestamp
  customerName: string;
  customerId?: string;
  orderCategory: OrderCategory;
  orderQty: number;
  uom: string; // Always "Nos"
  stitchingCost: number; // Amount in INR
  deliveredDate: number; // Timestamp
  modeOfPayment: PaymentMode;
  advancePayment: number; // Advance already paid
  balanceAmount: number; // Remaining after advance deduction
  amountPaid: number; // Amount paid in this transaction
  companyId: string;
  adminId: string;
  createdAt: number;
  updatedAt: number;
}

/**
 * Generate auto-incrementing Payment number
 * Format: PAY001, PAY002, etc.
 */
async function generatePaymentNumber(companyId: string): Promise<string> {
  try {
    const payRef = collection(db, PAYMENT_COLLECTION);
    const q = query(payRef, where('companyId', '==', companyId));
    const snapshot = await getDocs(q);

    const count = snapshot.size + 1;
    return `PAY${count.toString().padStart(3, '0')}`;
  } catch (error) {
    console.error('[paymentService] Error generating payment number:', error);
    return `PAY${Date.now().toString().slice(-3)}`;
  }
}

/**
 * Create a new Payment record
 */
export async function createPayment(
  data: {
    serviceOrderNo: string;
    serviceOrderDate: number;
    customerName: string;
    customerId?: string;
    orderCategory: OrderCategory;
    orderQty: number;
    stitchingCost: number;
    modeOfPayment: PaymentMode;
    advancePayment: number;
    amountPaid: number;
  },
  companyId: string,
  adminId: string
): Promise<Payment> {
  try {
    const paymentNo = await generatePaymentNumber(companyId);

    // Calculate balance amount
    const balanceAmount = data.stitchingCost - data.advancePayment - data.amountPaid;

    const newPayment: Payment = {
      id: paymentNo,
      paymentNo,
      serviceOrderNo: data.serviceOrderNo,
      serviceOrderDate: data.serviceOrderDate,
      customerName: data.customerName,
      customerId: data.customerId,
      orderCategory: data.orderCategory,
      orderQty: data.orderQty,
      uom: 'Nos',
      stitchingCost: data.stitchingCost,
      deliveredDate: Date.now(),
      modeOfPayment: data.modeOfPayment,
      advancePayment: data.advancePayment,
      balanceAmount: balanceAmount > 0 ? balanceAmount : 0,
      amountPaid: data.amountPaid,
      companyId,
      adminId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    console.log('[paymentService] Creating payment:', newPayment);

    await setDoc(doc(db, PAYMENT_COLLECTION, paymentNo), {
      ...newPayment,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    console.log(`[paymentService] Payment ${paymentNo} created successfully`);
    return newPayment;
  } catch (error) {
    console.error('[paymentService] Error creating payment:', error);
    throw error;
  }
}

/**
 * Get all Payments for a company
 */
export async function getPaymentsByCompany(companyId: string): Promise<Payment[]> {
  try {
    const payRef = collection(db, PAYMENT_COLLECTION);
    const q = query(
      payRef,
      where('companyId', '==', companyId)
    );
    const snapshot = await getDocs(q);

    const payments: Payment[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      payments.push({
        id: doc.id,
        paymentNo: data.paymentNo || doc.id,
        serviceOrderNo: data.serviceOrderNo || '',
        serviceOrderDate: data.serviceOrderDate?.toMillis?.() || data.serviceOrderDate || Date.now(),
        customerName: data.customerName || '',
        customerId: data.customerId,
        orderCategory: data.orderCategory || 'male',
        orderQty: data.orderQty || 0,
        uom: data.uom || 'Nos',
        stitchingCost: data.stitchingCost || 0,
        deliveredDate: data.deliveredDate?.toMillis?.() || data.deliveredDate || Date.now(),
        modeOfPayment: data.modeOfPayment || 'cash',
        advancePayment: data.advancePayment || 0,
        balanceAmount: data.balanceAmount || 0,
        amountPaid: data.amountPaid || 0,
        companyId: data.companyId || '',
        adminId: data.adminId || '',
        createdAt: data.createdAt?.toMillis?.() || data.createdAt || Date.now(),
        updatedAt: data.updatedAt?.toMillis?.() || data.updatedAt || Date.now(),
      });
    });

    // Sort by createdAt descending
    payments.sort((a, b) => b.createdAt - a.createdAt);

    console.log(`[paymentService] Found ${payments.length} payments`);
    return payments;
  } catch (error) {
    console.error('[paymentService] Error fetching payments:', error);
    throw error;
  }
}

/**
 * Get total advance payment for a customer (from service orders)
 */
export async function getCustomerAdvancePayment(
  companyId: string,
  customerId: string
): Promise<number> {
  try {
    // This would typically query service orders collection for advance payments
    // For now, return 0 as placeholder - you may need to adjust based on your service order structure
    return 0;
  } catch (error) {
    console.error('[paymentService] Error fetching customer advance:', error);
    return 0;
  }
}
