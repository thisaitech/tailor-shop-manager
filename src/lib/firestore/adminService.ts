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
import { getDb } from '@/lib/firebase';
import { Admin, AdminRole, CompanyProfile } from '@/lib/types';
import { sendTailorCredentialsEmail } from '@/lib/emailService';
import {
  encryptPassword as secureEncrypt,
  decryptPassword as secureDecrypt,
  isEncrypted,
  hashPassword,
  verifyPassword,
} from '@/lib/crypto';

const COMPANIES_COLLECTION = 'companies';

const ADMINS_COLLECTION = 'admins';

/**
 * Generate auto-incrementing admin ID
 * Format: ADMIN001, ADMIN002, etc.
 */
async function generateAdminId(companyId: string): Promise<string> {
  try {
    const db = await getDb();
    const adminsRef = collection(db, ADMINS_COLLECTION);
    const q = query(adminsRef, where('companyId', '==', companyId));
    const snapshot = await getDocs(q);

    // Find the highest existing admin number
    let maxNum = 0;
    snapshot.docs.forEach(doc => {
      const match = doc.id.match(/^ADMIN(\d+)$/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    });

    const count = maxNum + 1;
    return `ADMIN${count.toString().padStart(3, '0')}`;
  } catch (error) {
    console.error('Error generating admin ID:', error);
    return `ADMIN${Date.now().toString().slice(-3)}`;
  }
}

/**
 * Generate secure random 6-digit password for admin
 */
export function generateAdminPassword(): string {
  const digits = crypto.getRandomValues(new Uint8Array(6));
  return Array.from(digits, digit => (digit % 10).toString()).join('');
}

/**
 * Check if password is hashed (stored as JSON with hash and salt)
 */
function isPasswordHashed(password: string): boolean {
  try {
    const parsed = JSON.parse(password);
    return parsed && typeof parsed.hash === 'string' && typeof parsed.salt === 'string';
  } catch {
    return false;
  }
}

/**
 * Verify password - supports plain text, encrypted, and hashed passwords
 */
async function verifyAdminPassword(storedPassword: string, inputPassword: string): Promise<boolean> {
  try {
    if (!storedPassword) return false;

    if (isPasswordHashed(storedPassword)) {
      const { hash, salt } = JSON.parse(storedPassword);
      return await verifyPassword(inputPassword, hash, salt);
    }

    if (isEncrypted(storedPassword)) {
      const decrypted = await secureDecrypt(storedPassword);
      return decrypted === inputPassword;
    }

    return storedPassword === inputPassword;
  } catch (error) {
    console.error('[Admin Auth] Failed to verify password:', error);
    return false;
  }
}

/**
 * Admin data with company reference
 */
export interface AdminWithCompany extends Admin {
  companyId: string;
  companyDocId: string;
}

/**
 * Check if admin with contact number already exists (globally across all companies)
 */
export async function findAdminByContactNumber(
  contactNumber: string,
  companyDocId?: string,
  excludeAdminId?: string
): Promise<AdminWithCompany | null> {
  try {
    const db = await getDb();
    const adminsRef = collection(db, ADMINS_COLLECTION);
    // Check globally - contact number must be unique across all admins
    const q = query(
      adminsRef,
      where('contactNumber', '==', contactNumber)
    );
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return null;
    }

    const admin = snapshot.docs[0].data() as AdminWithCompany;
    if (excludeAdminId && admin.id === excludeAdminId) {
      return null;
    }

    return admin;
  } catch (error) {
    console.error('Error finding admin by contact number:', error);
    return null;
  }
}

/**
 * Check if admin with email already exists (globally across all companies)
 */
export async function findAdminByEmail(
  email: string,
  companyDocId?: string,
  excludeAdminId?: string
): Promise<AdminWithCompany | null> {
  try {
    const db = await getDb();
    const adminsRef = collection(db, ADMINS_COLLECTION);
    // Check globally - email must be unique across all admins
    const q = query(
      adminsRef,
      where('email', '==', email)
    );
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return null;
    }

    const admin = snapshot.docs[0].data() as AdminWithCompany;
    if (excludeAdminId && admin.id === excludeAdminId) {
      return null;
    }

    return admin;
  } catch (error) {
    console.error('Error finding admin by email:', error);
    return null;
  }
}

/**
 * Generate auto-incrementing company ID
 * Format: COMP0001, COMP0002, etc.
 */
async function generateCompanyId(): Promise<string> {
  try {
    const db = await getDb();
    const companiesRef = collection(db, COMPANIES_COLLECTION);
    const snapshot = await getDocs(companiesRef);

    // Find the highest existing company number
    let maxNum = 0;
    snapshot.docs.forEach(doc => {
      const data = doc.data();
      if (data.id) {
        const match = data.id.match(/^COMP(\d+)$/);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > maxNum) maxNum = num;
        }
      }
    });

    const count = maxNum + 1;
    return `COMP${count.toString().padStart(4, '0')}`;
  } catch (error) {
    console.error('Error generating company ID:', error);
    return `COMP${Date.now().toString().slice(-4)}`;
  }
}

/**
 * Get all admins across all companies (for root user)
 */
export async function getAllAdmins(): Promise<AdminWithCompany[]> {
  try {
    const db = await getDb();
    const adminsRef = collection(db, ADMINS_COLLECTION);
    const snapshot = await getDocs(adminsRef);

    return snapshot.docs.map((doc) => doc.data() as AdminWithCompany);
  } catch (error) {
    console.error('Error fetching all admins:', error);
    return [];
  }
}

/**
 * Create new admin with a new company/shop
 * Each admin gets their own company
 */
export async function createAdminWithCompany(
  createdBy: string,
  adminData: {
    name: string;
    aliasName?: string;
    gender: 'male' | 'female';
    email: string;
    contactNumber: string;
    whatsappNumber?: string;
    address1?: string;
    address2?: string;
    city?: string;
    pincode?: string;
    state?: string;
    country?: string;
    role: AdminRole;
    isActive: boolean;
  },
  shopData: {
    shopName: string;
    businessType?: 'service' | 'sales' | 'sales_and_services';
    productCategory?: string;
  }
): Promise<AdminWithCompany & { plainPassword: string; companyProfile: CompanyProfile }> {
  try {
    const db = await getDb();

    // Generate unique IDs
    const companyId = await generateCompanyId();
    const adminId = `ADMIN${companyId.replace('COMP', '')}`; // Use same number as company

    // Create company profile
    const companyDocId = adminId; // Use admin ID as company doc ID for easy lookup
    const companyProfile: CompanyProfile = {
      id: companyId,
      companyName: shopData.shopName,
      aliasName: adminData.aliasName || '',
      businessType: shopData.businessType || 'service',
      productCategory: shopData.productCategory || 'Tailoring',
      address1: adminData.address1 || '',
      address2: adminData.address2 || '',
      city: adminData.city || '',
      pincode: adminData.pincode || '',
      region: '',
      state: adminData.state || '',
      country: adminData.country || 'India',
      contactNumber: adminData.contactNumber,
      email: adminData.email,
      panNumber: '',
      gstinNumber: '',
      bankName: '',
      accountNumber: '',
      accountHolderName: '',
      branchName: '',
      ifscCode: '',
      bankContactNumber: '',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    // Save company profile
    const companyRef = doc(db, COMPANIES_COLLECTION, companyDocId);
    await setDoc(companyRef, companyProfile);
    console.log('[Admin Service] Company created:', companyId);

    // Generate password
    const plainPassword = generateAdminPassword();

    // Create admin
    const admin: AdminWithCompany = {
      id: adminId,
      adminCode: adminId,
      name: adminData.name,
      aliasName: adminData.aliasName || '',
      gender: adminData.gender,
      profilePicture: '',
      email: adminData.email,
      contactNumber: adminData.contactNumber,
      whatsappNumber: adminData.whatsappNumber || '',
      address1: adminData.address1 || '',
      address2: adminData.address2 || '',
      city: adminData.city || '',
      pincode: adminData.pincode || '',
      region: '',
      state: adminData.state || '',
      country: adminData.country || 'India',
      role: adminData.role,
      isActive: adminData.isActive ?? true,
      password: plainPassword, // Plain password for first login
      passwordHistory: [],
      isFirstLogin: true,
      lastPasswordChange: Date.now(),
      companyId,
      companyDocId,
      createdBy,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    // Save admin
    const adminRef = doc(db, ADMINS_COLLECTION, adminId);
    await setDoc(adminRef, admin);
    console.log('[Admin Service] Admin created with company:', adminId, companyId);

    // Send credentials email
    if (adminData.email) {
      try {
        const emailSent = await sendTailorCredentialsEmail({
          to: adminData.email,
          employeeName: adminData.name,
          loginId: adminData.contactNumber,
          temporaryPassword: plainPassword,
          companyName: shopData.shopName,
        });

        if (emailSent) {
          console.log('[Admin Service] Credentials email sent to:', adminData.email);
        }
      } catch (emailError) {
        console.error('[Admin Service] Error sending credentials email:', emailError);
      }
    }

    return { ...admin, plainPassword, companyProfile };
  } catch (error: any) {
    console.error('[Admin Service] Error creating admin with company:', error);
    throw new Error(error?.message || 'Failed to create admin. Please try again.');
  }
}

/**
 * Add new admin
 */
export async function addAdmin(
  companyDocId: string,
  companyId: string,
  createdBy: string,
  adminData: Omit<Admin, 'id' | 'adminCode' | 'companyId' | 'companyDocId' | 'createdBy' | 'createdAt' | 'updatedAt' | 'password' | 'passwordHistory' | 'isFirstLogin' | 'lastPasswordChange'>,
  companyName?: string
): Promise<AdminWithCompany & { plainPassword: string }> {
  try {
    const adminId = await generateAdminId(companyId);
    const plainPassword = generateAdminPassword();

    const admin: AdminWithCompany = {
      id: adminId,
      adminCode: adminId,
      name: adminData.name,
      aliasName: adminData.aliasName || '',
      gender: adminData.gender,
      profilePicture: adminData.profilePicture || '',
      email: adminData.email,
      contactNumber: adminData.contactNumber,
      whatsappNumber: adminData.whatsappNumber || '',
      address1: adminData.address1 || '',
      address2: adminData.address2 || '',
      city: adminData.city || '',
      pincode: adminData.pincode || '',
      region: adminData.region || '',
      state: adminData.state || '',
      country: adminData.country || 'India',
      role: adminData.role,
      isActive: adminData.isActive ?? true,
      password: plainPassword, // Store plain password for initial login
      passwordHistory: [],
      isFirstLogin: true,
      lastPasswordChange: Date.now(),
      companyId,
      companyDocId,
      createdBy,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const db = await getDb();
    const adminRef = doc(db, ADMINS_COLLECTION, adminId);
    await setDoc(adminRef, admin);

    console.log('[Admin Service] Admin added successfully:', adminId);

    // Send credentials email
    if (adminData.email) {
      try {
        const emailSent = await sendTailorCredentialsEmail({
          to: adminData.email,
          employeeName: adminData.name,
          loginId: adminData.contactNumber,
          temporaryPassword: plainPassword,
          companyName: companyName,
        });

        if (emailSent) {
          console.log('[Admin Service] Credentials email sent to:', adminData.email);
        }
      } catch (emailError) {
        console.error('[Admin Service] Error sending credentials email:', emailError);
      }
    }

    return { ...admin, plainPassword };
  } catch (error: any) {
    console.error('[Admin Service] Error adding admin:', error);
    throw new Error(error?.message || 'Failed to add admin. Please try again.');
  }
}

/**
 * Update admin
 */
export async function updateAdmin(
  adminId: string,
  adminData: Partial<Admin>
): Promise<void> {
  try {
    const db = await getDb();
    const adminRef = doc(db, ADMINS_COLLECTION, adminId);
    await updateDoc(adminRef, {
      ...adminData,
      updatedAt: Date.now(),
    });
    console.log('Admin updated successfully:', adminId);
  } catch (error) {
    console.error('Error updating admin:', error);
    throw new Error('Failed to update admin. Please try again.');
  }
}

/**
 * Get all admins for a company
 */
export async function getAdminsByCompany(
  companyDocId: string
): Promise<AdminWithCompany[]> {
  try {
    const db = await getDb();
    const adminsRef = collection(db, ADMINS_COLLECTION);
    const q = query(adminsRef, where('companyDocId', '==', companyDocId));
    const snapshot = await getDocs(q);

    return snapshot.docs.map((doc) => doc.data() as AdminWithCompany);
  } catch (error) {
    console.error('Error fetching admins:', error);
    return [];
  }
}

/**
 * Get single admin by ID
 */
export async function getAdmin(adminId: string): Promise<AdminWithCompany | null> {
  try {
    const db = await getDb();
    const adminRef = doc(db, ADMINS_COLLECTION, adminId);
    const docSnap = await getDoc(adminRef);

    if (docSnap.exists()) {
      return docSnap.data() as AdminWithCompany;
    }
    return null;
  } catch (error) {
    console.error('Error fetching admin:', error);
    return null;
  }
}

/**
 * Delete admin
 */
export async function deleteAdmin(adminId: string): Promise<void> {
  try {
    const db = await getDb();
    const adminRef = doc(db, ADMINS_COLLECTION, adminId);
    await deleteDoc(adminRef);
    console.log('Admin deleted successfully:', adminId);
  } catch (error) {
    console.error('Error deleting admin:', error);
    throw new Error('Failed to delete admin. Please try again.');
  }
}

/**
 * Toggle admin active status
 */
export async function toggleAdminStatus(
  adminId: string,
  isActive: boolean
): Promise<void> {
  try {
    const db = await getDb();
    const adminRef = doc(db, ADMINS_COLLECTION, adminId);
    await updateDoc(adminRef, {
      isActive,
      updatedAt: Date.now(),
    });
    console.log('Admin status updated:', adminId);
  } catch (error) {
    console.error('Error updating admin status:', error);
    throw new Error('Failed to update admin status. Please try again.');
  }
}

/**
 * Reset admin password
 */
export async function resetAdminPassword(adminId: string): Promise<string> {
  try {
    const plainPassword = generateAdminPassword();
    const db = await getDb();
    const adminRef = doc(db, ADMINS_COLLECTION, adminId);
    await updateDoc(adminRef, {
      password: plainPassword,
      isFirstLogin: true,
      updatedAt: Date.now(),
    });
    console.log('Admin password reset:', adminId);
    return plainPassword;
  } catch (error) {
    console.error('Error resetting admin password:', error);
    throw new Error('Failed to reset password. Please try again.');
  }
}

/**
 * Change admin password after first login
 */
export async function changeAdminPassword(
  adminId: string,
  oldPassword: string,
  newPassword: string
): Promise<void> {
  try {
    const db = await getDb();
    const adminRef = doc(db, ADMINS_COLLECTION, adminId);
    const adminDoc = await getDoc(adminRef);

    if (!adminDoc.exists()) {
      throw new Error('Admin not found');
    }

    const adminData = adminDoc.data() as AdminWithCompany;

    const isPasswordValid = await verifyAdminPassword(adminData.password, oldPassword);
    if (!isPasswordValid) {
      throw new Error('Current password is incorrect');
    }

    const passwordHistory = adminData.passwordHistory || [];
    const { hash, salt } = await hashPassword(newPassword);
    const hashedPassword = JSON.stringify({ hash, salt });

    passwordHistory.push({ password: adminData.password, changedAt: Date.now() });

    await updateDoc(adminRef, {
      password: hashedPassword,
      passwordHistory: passwordHistory,
      isFirstLogin: false,
      lastPasswordChange: Date.now(),
      updatedAt: Date.now(),
    });

    console.log(`[Admin Service] Password changed for admin ${adminId}`);
  } catch (error) {
    console.error('Error changing admin password:', error);
    throw new Error('Failed to change password. Please try again.');
  }
}

/**
 * Authentication result
 */
export interface AdminAuthResult {
  success: boolean;
  admin?: AdminWithCompany;
  error?: 'not_found' | 'invalid_password' | 'account_inactive' | 'system_error';
  message?: string;
}

/**
 * Verify admin login credentials
 */
export async function verifyAdminCredentials(
  contactNumber: string,
  password: string
): Promise<AdminAuthResult> {
  try {
    const trimmedContact = contactNumber.trim();
    const trimmedPassword = password.trim();

    console.log('[Admin Auth] Verifying credentials for:', trimmedContact);

    const db = await getDb();
    const adminsRef = collection(db, ADMINS_COLLECTION);

    const contactQuery = query(
      adminsRef,
      where('contactNumber', '==', trimmedContact)
    );
    const contactSnapshot = await getDocs(contactQuery);

    if (contactSnapshot.empty) {
      console.log('[Admin Auth] No admin found with contact number:', trimmedContact);
      return { success: false, error: 'not_found', message: 'No account found with this phone number' };
    }

    const adminData = contactSnapshot.docs[0].data() as AdminWithCompany;
    console.log('[Admin Auth] Admin found:', {
      id: adminData.id,
      name: adminData.name,
      isFirstLogin: adminData.isFirstLogin,
      isActive: adminData.isActive,
      role: adminData.role
    });

    const isPasswordValid = await verifyAdminPassword(adminData.password, trimmedPassword);
    if (!isPasswordValid) {
      console.log('[Admin Auth] Invalid password for admin:', adminData.id);
      return { success: false, error: 'invalid_password', message: 'Invalid password' };
    }

    if (adminData.isActive === false) {
      console.log('[Admin Auth] Admin account is inactive:', adminData.id);
      return { success: false, error: 'account_inactive', message: 'Your account is not active. Please contact the super admin.' };
    }

    console.log('[Admin Auth] Authentication successful for admin:', adminData.id);
    return { success: true, admin: adminData };
  } catch (error) {
    console.error('[Admin Auth] Error verifying admin credentials:', error);
    return { success: false, error: 'system_error', message: 'System error. Please try again.' };
  }
}

/**
 * Create or verify first super admin exists for a company
 */
export async function ensureSuperAdminExists(
  companyDocId: string,
  companyId: string,
  adminContactNumber: string,
  adminPassword: string,
  adminName: string = 'Super Admin'
): Promise<{ success: boolean; message: string; adminId?: string }> {
  try {
    const db = await getDb();

    // Check if any admin exists for this company
    const adminsRef = collection(db, ADMINS_COLLECTION);
    const q = query(adminsRef, where('companyDocId', '==', companyDocId));
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      console.log('[Admin Service] Admin already exists for company');
      return { success: true, message: 'Admin already exists', adminId: snapshot.docs[0].id };
    }

    // Create super admin
    const adminId = 'ADMIN001';
    const superAdmin: AdminWithCompany = {
      id: adminId,
      adminCode: adminId,
      name: adminName,
      aliasName: 'Admin',
      gender: 'male',
      profilePicture: '',
      email: '',
      contactNumber: adminContactNumber,
      whatsappNumber: adminContactNumber,
      address1: '',
      address2: '',
      city: '',
      pincode: '',
      region: '',
      state: '',
      country: 'India',
      role: 'super_admin',
      isActive: true,
      password: adminPassword, // Plain password for first admin
      passwordHistory: [],
      isFirstLogin: false, // No forced password change for first admin
      lastPasswordChange: Date.now(),
      companyId,
      companyDocId,
      createdBy: 'system',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const adminRef = doc(db, ADMINS_COLLECTION, adminId);
    await setDoc(adminRef, superAdmin);

    console.log('[Admin Service] Super admin created:', adminId);
    return {
      success: true,
      message: `Super admin created. Login: ${adminContactNumber}`,
      adminId
    };
  } catch (error) {
    console.error('[Admin Service] Error creating super admin:', error);
    return {
      success: false,
      message: `Failed to create super admin: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}
