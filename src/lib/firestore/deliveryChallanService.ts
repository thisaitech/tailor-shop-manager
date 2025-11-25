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

const DELIVERY_CHALLAN_COLLECTION = 'deliveryChallans';

// Shipment Type
export type ShipmentType = 'courier' | 'direct';

// Delivery Challan interface
export interface DeliveryChallan {
  id: string; // DC001, DC002, etc.
  dcNo: string; // Same as id
  dcDate: number; // Timestamp
  jobWorkNo: string; // Reference to Job Work/Order Allotment
  jobWorkTailorName?: string; // Denormalized for display
  shipmentType: ShipmentType;
  consignmentNo: string; // Max 20 chars
  imageUrl?: string; // Firebase Storage URL for captured image
  companyId: string;
  adminId: string;
  createdAt: number;
  updatedAt: number;
}

/**
 * Generate auto-incrementing DC number
 * Format: DC001, DC002, etc.
 */
async function generateDCNumber(companyId: string): Promise<string> {
  try {
    const dcRef = collection(db, DELIVERY_CHALLAN_COLLECTION);
    const q = query(dcRef, where('companyId', '==', companyId));
    const snapshot = await getDocs(q);

    const count = snapshot.size + 1;
    return `DC${count.toString().padStart(3, '0')}`;
  } catch (error) {
    console.error('[deliveryChallanService] Error generating DC number:', error);
    return `DC${Date.now().toString().slice(-3)}`;
  }
}

/**
 * Create a new Delivery Challan
 */
export async function createDeliveryChallan(
  data: {
    jobWorkNo: string;
    jobWorkTailorName?: string;
    shipmentType: ShipmentType;
    consignmentNo: string;
    imageUrl?: string;
  },
  companyId: string,
  adminId: string
): Promise<DeliveryChallan> {
  try {
    const dcNo = await generateDCNumber(companyId);

    const newDC: DeliveryChallan = {
      id: dcNo,
      dcNo,
      dcDate: Date.now(),
      jobWorkNo: data.jobWorkNo,
      jobWorkTailorName: data.jobWorkTailorName,
      shipmentType: data.shipmentType,
      consignmentNo: data.consignmentNo.slice(0, 20), // Max 20 chars
      imageUrl: data.imageUrl,
      companyId,
      adminId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    console.log('[deliveryChallanService] Creating delivery challan:', newDC);

    await setDoc(doc(db, DELIVERY_CHALLAN_COLLECTION, dcNo), {
      ...newDC,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    console.log(`[deliveryChallanService] Delivery Challan ${dcNo} created successfully`);
    return newDC;
  } catch (error) {
    console.error('[deliveryChallanService] Error creating delivery challan:', error);
    throw error;
  }
}

/**
 * Get all Delivery Challans for a company
 */
export async function getDeliveryChallansByCompany(companyId: string): Promise<DeliveryChallan[]> {
  try {
    const dcRef = collection(db, DELIVERY_CHALLAN_COLLECTION);
    // Note: If you need orderBy, create composite index for companyId + createdAt
    const q = query(
      dcRef,
      where('companyId', '==', companyId)
    );
    const snapshot = await getDocs(q);

    const challans: DeliveryChallan[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      challans.push({
        id: doc.id,
        dcNo: data.dcNo || doc.id,
        dcDate: data.dcDate?.toMillis?.() || data.dcDate || Date.now(),
        jobWorkNo: data.jobWorkNo || '',
        jobWorkTailorName: data.jobWorkTailorName,
        shipmentType: data.shipmentType || 'direct',
        consignmentNo: data.consignmentNo || '',
        imageUrl: data.imageUrl,
        companyId: data.companyId || '',
        adminId: data.adminId || '',
        createdAt: data.createdAt?.toMillis?.() || data.createdAt || Date.now(),
        updatedAt: data.updatedAt?.toMillis?.() || data.updatedAt || Date.now(),
      });
    });

    // Sort by createdAt descending (client-side to avoid index requirement)
    challans.sort((a, b) => b.createdAt - a.createdAt);

    console.log(`[deliveryChallanService] Found ${challans.length} delivery challans`);
    return challans;
  } catch (error) {
    console.error('[deliveryChallanService] Error fetching delivery challans:', error);
    throw error;
  }
}
