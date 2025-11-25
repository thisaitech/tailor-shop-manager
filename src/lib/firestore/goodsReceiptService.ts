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

const GOODS_RECEIPT_COLLECTION = 'goodsReceipts';

// Shipment Type
export type ShipmentType = 'courier' | 'direct';

// Goods Receipt Status
export type GoodsReceiptStatus = 'move_to_stitching' | 'ready_to_dispatch';

// Goods Receipt interface
export interface GoodsReceipt {
  id: string; // GRN001, GRN002, etc.
  grnNo: string; // Same as id
  grnDate: number; // Timestamp
  dcNo: string; // Reference to Delivery Challan
  shipmentType: ShipmentType;
  consignmentNo: string; // Max 20 chars
  status: GoodsReceiptStatus; // Status of goods receipt
  imageUrl?: string; // Firebase Storage URL for captured image
  companyId: string;
  adminId: string;
  createdAt: number;
  updatedAt: number;
}

/**
 * Generate auto-incrementing GRN number
 * Format: GRN001, GRN002, etc.
 */
async function generateGRNNumber(companyId: string): Promise<string> {
  try {
    const grnRef = collection(db, GOODS_RECEIPT_COLLECTION);
    const q = query(grnRef, where('companyId', '==', companyId));
    const snapshot = await getDocs(q);

    const count = snapshot.size + 1;
    return `GRN${count.toString().padStart(3, '0')}`;
  } catch (error) {
    console.error('[goodsReceiptService] Error generating GRN number:', error);
    return `GRN${Date.now().toString().slice(-3)}`;
  }
}

/**
 * Create a new Goods Receipt
 */
export async function createGoodsReceipt(
  data: {
    dcNo: string;
    shipmentType: ShipmentType;
    consignmentNo: string;
    status: GoodsReceiptStatus;
    imageUrl?: string;
  },
  companyId: string,
  adminId: string
): Promise<GoodsReceipt> {
  try {
    const grnNo = await generateGRNNumber(companyId);

    const newGRN: GoodsReceipt = {
      id: grnNo,
      grnNo,
      grnDate: Date.now(),
      dcNo: data.dcNo,
      shipmentType: data.shipmentType,
      consignmentNo: data.consignmentNo.slice(0, 20), // Max 20 chars
      status: data.status,
      imageUrl: data.imageUrl,
      companyId,
      adminId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    console.log('[goodsReceiptService] Creating goods receipt:', newGRN);

    // Build Firestore document, excluding undefined fields
    const firestoreDoc: any = {
      id: grnNo,
      grnNo,
      grnDate: Date.now(),
      dcNo: data.dcNo,
      shipmentType: data.shipmentType,
      consignmentNo: data.consignmentNo.slice(0, 20),
      status: data.status,
      companyId,
      adminId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    // Only add optional imageUrl field if it has a value
    if (data.imageUrl) {
      firestoreDoc.imageUrl = data.imageUrl;
    }

    await setDoc(doc(db, GOODS_RECEIPT_COLLECTION, grnNo), firestoreDoc);

    console.log(`[goodsReceiptService] Goods Receipt ${grnNo} created successfully`);
    return newGRN;
  } catch (error) {
    console.error('[goodsReceiptService] Error creating goods receipt:', error);
    throw error;
  }
}

/**
 * Get all Goods Receipts for a company
 */
export async function getGoodsReceiptsByCompany(companyId: string): Promise<GoodsReceipt[]> {
  try {
    const grnRef = collection(db, GOODS_RECEIPT_COLLECTION);
    const q = query(
      grnRef,
      where('companyId', '==', companyId)
    );
    const snapshot = await getDocs(q);

    const receipts: GoodsReceipt[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      receipts.push({
        id: doc.id,
        grnNo: data.grnNo || doc.id,
        grnDate: data.grnDate?.toMillis?.() || data.grnDate || Date.now(),
        dcNo: data.dcNo || '',
        shipmentType: data.shipmentType || 'direct',
        consignmentNo: data.consignmentNo || '',
        status: data.status || 'move_to_stitching',
        imageUrl: data.imageUrl,
        companyId: data.companyId || '',
        adminId: data.adminId || '',
        createdAt: data.createdAt?.toMillis?.() || data.createdAt || Date.now(),
        updatedAt: data.updatedAt?.toMillis?.() || data.updatedAt || Date.now(),
      });
    });

    // Sort by createdAt descending (client-side to avoid index requirement)
    receipts.sort((a, b) => b.createdAt - a.createdAt);

    console.log(`[goodsReceiptService] Found ${receipts.length} goods receipts`);
    return receipts;
  } catch (error) {
    console.error('[goodsReceiptService] Error fetching goods receipts:', error);
    throw error;
  }
}

/**
 * Get DC numbers that don't have a GRN yet (for filtering dropdown)
 */
export async function getUsedDCNumbers(companyId: string): Promise<string[]> {
  try {
    const grnRef = collection(db, GOODS_RECEIPT_COLLECTION);
    const q = query(grnRef, where('companyId', '==', companyId));
    const snapshot = await getDocs(q);

    const usedDCNumbers: string[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      if (data.dcNo) {
        usedDCNumbers.push(data.dcNo);
      }
    });

    return usedDCNumbers;
  } catch (error) {
    console.error('[goodsReceiptService] Error fetching used DC numbers:', error);
    return [];
  }
}
