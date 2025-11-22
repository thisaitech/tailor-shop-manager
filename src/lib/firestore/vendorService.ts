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
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Vendor } from '@/lib/types';

const VENDORS_COLLECTION = 'vendors';

/**
 * Generate auto-incrementing tailor code
 * Format: TAL0001, TAL0002, etc.
 */
async function generateTailorCode(companyId: string): Promise<string> {
  try {
    const vendorsRef = collection(db, VENDORS_COLLECTION);
    const q = query(vendorsRef, where('companyId', '==', companyId));
    const snapshot = await getDocs(q);
    const count = snapshot.size + 1;
    return `TAL${count.toString().padStart(4, '0')}`;
  } catch (error) {
    console.error('Error generating tailor code:', error);
    return `TAL${Date.now()}`;
  }
}

/**
 * Add new vendor
 * @param companyDocId - Document ID of the company (user ID)
 * @param companyId - Company ID (COMP0001, etc.)
 * @param createdBy - Admin user ID who created vendor
 * @param vendorData - Vendor data
 * @returns Created vendor
 */
export async function addVendor(
  companyDocId: string,
  companyId: string,
  createdBy: string,
  vendorData: Omit<Vendor, 'id' | 'tailorCode' | 'companyId' | 'companyDocId' | 'createdBy' | 'createdAt' | 'updatedAt'>
): Promise<Vendor> {
  try {
    // Generate tailor code
    const tailorCode = await generateTailorCode(companyId);

    const vendor: Vendor = {
      id: tailorCode,
      tailorCode,
      tailorName: vendorData.tailorName,
      aliasName: vendorData.aliasName,
      gender: vendorData.gender,
      businessType: vendorData.businessType,
      address1: vendorData.address1,
      address2: vendorData.address2,
      city: vendorData.city,
      pincode: vendorData.pincode,
      region: vendorData.region,
      state: vendorData.state,
      country: vendorData.country,
      contactNumber: vendorData.contactNumber,
      whatsappNumber: vendorData.whatsappNumber,
      companyId,
      companyDocId,
      createdBy,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    // Save to Firestore
    const vendorRef = doc(db, VENDORS_COLLECTION, tailorCode);
    await setDoc(vendorRef, vendor);

    console.log('Vendor added successfully:', tailorCode);
    return vendor;
  } catch (error) {
    console.error('Error adding vendor:', error);
    throw new Error('Failed to add vendor. Please try again.');
  }
}

/**
 * Update vendor
 * @param vendorId - Vendor ID (tailor code)
 * @param vendorData - Updated vendor data
 */
export async function updateVendor(
  vendorId: string,
  vendorData: Partial<Vendor>
): Promise<void> {
  try {
    const vendorRef = doc(db, VENDORS_COLLECTION, vendorId);
    await updateDoc(vendorRef, {
      ...vendorData,
      updatedAt: Date.now(),
    });
    console.log('Vendor updated successfully:', vendorId);
  } catch (error) {
    console.error('Error updating vendor:', error);
    throw new Error('Failed to update vendor. Please try again.');
  }
}

/**
 * Get all vendors for a company
 * @param companyDocId - Document ID of the company (user ID)
 * @returns Array of vendors
 */
export async function getVendorsByCompany(
  companyDocId: string
): Promise<Vendor[]> {
  try {
    const vendorsRef = collection(db, VENDORS_COLLECTION);
    const q = query(vendorsRef, where('companyDocId', '==', companyDocId));
    const snapshot = await getDocs(q);

    return snapshot.docs.map((doc) => doc.data() as Vendor);
  } catch (error) {
    console.error('Error fetching vendors:', error);
    return [];
  }
}

/**
 * Get single vendor
 * @param vendorId - Vendor ID (tailor code)
 * @returns Vendor data or null
 */
export async function getVendor(vendorId: string): Promise<Vendor | null> {
  try {
    const vendorRef = doc(db, VENDORS_COLLECTION, vendorId);
    const docSnap = await getDoc(vendorRef);

    if (docSnap.exists()) {
      return docSnap.data() as Vendor;
    }
    return null;
  } catch (error) {
    console.error('Error fetching vendor:', error);
    return null;
  }
}

/**
 * Delete vendor
 * @param vendorId - Vendor ID (tailor code)
 */
export async function deleteVendor(vendorId: string): Promise<void> {
  try {
    const vendorRef = doc(db, VENDORS_COLLECTION, vendorId);
    await deleteDoc(vendorRef);
    console.log('Vendor deleted successfully:', vendorId);
  } catch (error) {
    console.error('Error deleting vendor:', error);
    throw new Error('Failed to delete vendor. Please try again.');
  }
}
