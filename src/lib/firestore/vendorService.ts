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
import {
  encryptPassword as secureEncrypt,
  decryptPassword as secureDecrypt,
  generateSecurePassword,
  isEncrypted,
} from '@/lib/crypto';

const VENDORS_COLLECTION = 'vendors';

/**
 * Generate a secure random password using Web Crypto API
 * Format: 12 characters with uppercase, lowercase, numbers, special chars
 */
function generatePassword(): string {
  return generateSecurePassword(12);
}

/**
 * Encrypt password using AES-256-GCM
 * @param password - Plain text password
 * @returns Encrypted password as base64 string
 */
async function encryptPasswordSecure(password: string): Promise<string> {
  return await secureEncrypt(password);
}

/**
 * Decrypt password using AES-256-GCM
 * Also handles legacy base64 encoded passwords for backward compatibility
 * @param encryptedPassword - Encrypted password
 * @returns Decrypted plain text password or null if decryption fails
 */
export async function decryptPasswordAsync(encryptedPassword: string): Promise<string | null> {
  try {
    if (!encryptedPassword) {
      console.error('[Vendor Auth] No encrypted password provided');
      return null;
    }

    // Check if it's encrypted with new format
    if (isEncrypted(encryptedPassword)) {
      return await secureDecrypt(encryptedPassword);
    }

    // Fallback to legacy base64 decoding for old passwords
    try {
      return atob(encryptedPassword);
    } catch {
      console.error('[Vendor Auth] Failed to decode legacy password');
      return null;
    }
  } catch (error) {
    console.error('[Vendor Auth] Failed to decrypt password:', error);
    return null;
  }
}

/**
 * @deprecated Use decryptPasswordAsync instead. Kept for backward compatibility.
 * Synchronous decrypt - only works with legacy base64 passwords
 */
export function decryptPassword(encryptedPassword: string): string | null {
  try {
    if (!encryptedPassword) {
      console.error('[Vendor Auth] No encrypted password provided');
      return null;
    }
    // Legacy base64 decoding only
    return atob(encryptedPassword);
  } catch (error) {
    console.error('[Vendor Auth] Failed to decrypt password:', error);
    return null;
  }
}

/**
 * Check if vendor with contact number already exists
 * @param contactNumber - Contact number to check
 * @param companyDocId - Company document ID
 * @param excludeVendorId - Optional vendor ID to exclude (for updates)
 * @returns Vendor if exists, null otherwise
 */
export async function findVendorByContactNumber(
  contactNumber: string,
  companyDocId: string,
  excludeVendorId?: string
): Promise<Vendor | null> {
  try {
    const vendorsRef = collection(db, VENDORS_COLLECTION);
    const q = query(
      vendorsRef,
      where('contactNumber', '==', contactNumber),
      where('companyDocId', '==', companyDocId)
    );
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return null;
    }

    // If excluding a vendor ID, check if the found vendor is different
    const vendor = snapshot.docs[0].data() as Vendor;
    if (excludeVendorId && vendor.id === excludeVendorId) {
      return null;
    }

    return vendor;
  } catch (error) {
    console.error('Error finding vendor by contact number:', error);
    return null;
  }
}

/**
 * Check if vendor with email already exists
 * @param email - Email to check
 * @param companyDocId - Company document ID
 * @param excludeVendorId - Optional vendor ID to exclude (for updates)
 * @returns Vendor if exists, null otherwise
 */
export async function findVendorByEmail(
  email: string,
  companyDocId: string,
  excludeVendorId?: string
): Promise<Vendor | null> {
  try {
    const vendorsRef = collection(db, VENDORS_COLLECTION);
    const q = query(
      vendorsRef,
      where('email', '==', email),
      where('companyDocId', '==', companyDocId)
    );
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return null;
    }

    // If excluding a vendor ID, check if the found vendor is different
    const vendor = snapshot.docs[0].data() as Vendor;
    if (excludeVendorId && vendor.id === excludeVendorId) {
      return null;
    }

    return vendor;
  } catch (error) {
    console.error('Error finding vendor by email:', error);
    return null;
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

    // Generate auto password with secure encryption
    const autoPassword = generatePassword();
    const encryptedPassword = await encryptPasswordSecure(autoPassword);
    const now = Date.now();

    const vendor: Vendor = {
      id: tailorCode,
      tailorCode,
      tailorName: vendorData.tailorName,
      aliasName: vendorData.aliasName || '',
      gender: vendorData.gender,
      businessType: vendorData.businessType,
      address1: vendorData.address1 || '',
      address2: vendorData.address2 || '',
      city: vendorData.city || '',
      pincode: vendorData.pincode || '',
      region: vendorData.region || '',
      state: vendorData.state || '',
      country: vendorData.country || 'India',
      contactNumber: vendorData.contactNumber,
      whatsappNumber: vendorData.whatsappNumber || '',
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

    // Verify current password using async decryption
    const decryptedPassword = await decryptPasswordAsync(vendor.password);
    if (decryptedPassword === null) {
      throw new Error('Unable to verify current password. Please contact support.');
    }
    if (decryptedPassword !== currentPassword) {
      throw new Error('Current password is incorrect');
    }

    // Encrypt new password with secure encryption
    const encryptedPassword = await encryptPasswordSecure(newPassword);
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
 * Authentication result with specific error messages
 */
export interface VendorAuthResult {
  success: boolean;
  vendor?: Vendor;
  error?: 'not_found' | 'invalid_password' | 'account_inactive' | 'decryption_error' | 'system_error';
  message?: string;
}

/**
 * Authenticate vendor with phone number and password
 * @param contactNumber - Vendor contact number (phone)
 * @param password - Password (plain text)
 * @returns Authentication result with vendor data or specific error
 */
export async function authenticateVendor(
  contactNumber: string,
  password: string
): Promise<VendorAuthResult> {
  try {
    // Trim inputs to handle accidental whitespace
    const trimmedContact = contactNumber.trim();
    const trimmedPassword = password.trim();

    console.log('[Vendor Auth] Authenticating vendor:', trimmedContact);

    const vendorsRef = collection(db, VENDORS_COLLECTION);
    const q = query(vendorsRef, where('contactNumber', '==', trimmedContact));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      console.log('[Vendor Auth] No vendor found with contact number:', trimmedContact);
      return { success: false, error: 'not_found', message: 'No account found with this phone number' };
    }

    const vendorDoc = snapshot.docs[0];
    const vendor = vendorDoc.data() as Vendor;

    // Check if vendor is active (if the field exists)
    if (vendor.isActive === false) {
      console.log('[Vendor Auth] Vendor account is inactive:', vendor.tailorCode);
      return { success: false, error: 'account_inactive', message: 'Your account is not active. Please contact the administrator.' };
    }

    // Verify password using async decryption (supports both new AES and legacy base64)
    const decryptedPassword = await decryptPasswordAsync(vendor.password);

    if (decryptedPassword === null) {
      console.error('[Vendor Auth] Failed to decrypt password for vendor:', vendor.tailorCode);
      return { success: false, error: 'decryption_error', message: 'Authentication error. Please contact support.' };
    }

    if (decryptedPassword === trimmedPassword) {
      console.log('[Vendor Auth] Authentication successful for vendor:', vendor.tailorCode);
      return { success: true, vendor };
    }

    console.log('[Vendor Auth] Invalid password for vendor:', vendor.tailorCode);
    return { success: false, error: 'invalid_password', message: 'Invalid password' };
  } catch (error) {
    console.error('[Vendor Auth] Error authenticating vendor:', error);
    return { success: false, error: 'system_error', message: 'System error. Please try again.' };
  }
}
