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
import { sendTailorCredentialsEmail } from '@/lib/emailService';

const VENDORS_COLLECTION = 'vendors';

/**
 * Generate a random password
 * Format: 8 characters with uppercase, lowercase, numbers
 */
function generatePassword(): string {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const allChars = uppercase + lowercase + numbers;

  let password = '';
  // Ensure at least one of each type
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];

  // Fill remaining characters
  for (let i = 3; i < 8; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }

  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('');
}

/**
 * Simple password encryption (base64 encoding)
 * Note: In production, use proper encryption like bcrypt
 */
function encryptPassword(password: string): string {
  return btoa(password);
}

/**
 * Decrypt password (base64 decoding)
 */
export function decryptPassword(encryptedPassword: string): string {
  try {
    return atob(encryptedPassword);
  } catch {
    return '';
  }
}

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
  vendorData: Omit<Vendor, 'id' | 'tailorCode' | 'companyId' | 'companyDocId' | 'createdBy' | 'createdAt' | 'updatedAt' | 'password' | 'passwordHistory' | 'isFirstLogin' | 'lastPasswordChange'>,
  companyName?: string
): Promise<{ vendor: Vendor; plainPassword: string }> {
  try {
    // Generate tailor code
    const tailorCode = await generateTailorCode(companyId);

    // Generate auto password
    const autoPassword = generatePassword();
    const encryptedPassword = encryptPassword(autoPassword);
    const now = Date.now();

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
      email: vendorData.email,
      password: encryptedPassword,
      passwordHistory: [{ password: encryptedPassword, changedAt: now }],
      isFirstLogin: true,
      lastPasswordChange: now,
      companyId,
      companyDocId,
      createdBy,
      createdAt: now,
      updatedAt: now,
    };

    // Save to Firestore
    const vendorRef = doc(db, VENDORS_COLLECTION, tailorCode);
    await setDoc(vendorRef, vendor);

    console.log('Vendor added successfully:', tailorCode);

    // Send credentials email to vendor
    try {
      await sendTailorCredentialsEmail({
        to: vendorData.email,
        employeeName: vendorData.tailorName,
        loginId: vendorData.contactNumber,
        temporaryPassword: autoPassword,
        companyName,
      });
      console.log('Login credentials email sent to:', vendorData.email);
    } catch (emailError) {
      console.error('Failed to send credentials email:', emailError);
      // Don't throw error - vendor is created successfully
    }

    return { vendor, plainPassword: autoPassword };
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

/**
 * Change vendor password
 * @param vendorId - Vendor ID (tailor code)
 * @param currentPassword - Current password (plain text)
 * @param newPassword - New password (plain text)
 */
export async function changeVendorPassword(
  vendorId: string,
  currentPassword: string,
  newPassword: string
): Promise<void> {
  try {
    const vendor = await getVendor(vendorId);
    if (!vendor) {
      throw new Error('Vendor not found');
    }

    // Verify current password
    const decryptedPassword = decryptPassword(vendor.password);
    if (decryptedPassword !== currentPassword) {
      throw new Error('Current password is incorrect');
    }

    // Encrypt new password
    const encryptedPassword = encryptPassword(newPassword);
    const now = Date.now();

    // Update password and history
    const vendorRef = doc(db, VENDORS_COLLECTION, vendorId);
    await updateDoc(vendorRef, {
      password: encryptedPassword,
      passwordHistory: [
        ...vendor.passwordHistory,
        { password: encryptedPassword, changedAt: now }
      ],
      isFirstLogin: false,
      lastPasswordChange: now,
      updatedAt: now,
    });

    console.log('Vendor password changed successfully:', vendorId);
  } catch (error) {
    console.error('Error changing vendor password:', error);
    throw error;
  }
}

/**
 * Authenticate vendor with phone number and password
 * @param contactNumber - Vendor contact number (phone)
 * @param password - Password (plain text)
 * @returns Vendor data if authentication successful, null otherwise
 */
export async function authenticateVendor(
  contactNumber: string,
  password: string
): Promise<Vendor | null> {
  try {
    const vendorsRef = collection(db, VENDORS_COLLECTION);
    const q = query(vendorsRef, where('contactNumber', '==', contactNumber));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return null;
    }

    const vendorDoc = snapshot.docs[0];
    const vendor = vendorDoc.data() as Vendor;

    // Verify password
    const decryptedPassword = decryptPassword(vendor.password);
    if (decryptedPassword === password) {
      return vendor;
    }

    return null;
  } catch (error) {
    console.error('Error authenticating vendor:', error);
    return null;
  }
}
