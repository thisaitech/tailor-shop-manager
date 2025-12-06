import { doc, setDoc, getDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { getDb } from '@/lib/firebase';
import { CompanyProfile } from '@/lib/types';

const COMPANIES_COLLECTION = 'companies';

/**
 * Generate auto-incrementing company ID
 * Format: COMP0001, COMP0002, etc.
 */
async function generateCompanyId(): Promise<string> {
  try {
    const db = await getDb();
    const companiesRef = collection(db, COMPANIES_COLLECTION);
    const snapshot = await getDocs(companiesRef);
    const count = snapshot.size + 1;
    return `COMP${count.toString().padStart(4, '0')}`;
  } catch (error) {
    console.error('Error generating company ID:', error);
    // Fallback to timestamp-based ID
    return `COMP${Date.now()}`;
  }
}

/**
 * Save or update company profile
 * @param userId - User ID (used as document ID to link profile to user)
 * @param profileData - Company profile data
 * @returns Updated profile with company ID
 */
export async function saveCompanyProfile(
  userId: string,
  profileData: Partial<CompanyProfile>
): Promise<CompanyProfile> {
  try {
    const db = await getDb();
    // Generate company ID if this is a new profile
    let companyId = profileData.id;
    if (!companyId) {
      companyId = await generateCompanyId();
    }

    const profileToSave: CompanyProfile = {
      id: companyId,
      companyName: profileData.companyName || '',
      aliasName: profileData.aliasName,
      businessType: profileData.businessType || 'service',
      productCategory: profileData.productCategory || 'Readymades',
      address1: profileData.address1 || '',
      address2: profileData.address2,
      city: profileData.city || '',
      pincode: profileData.pincode || '',
      region: profileData.region || '',
      state: profileData.state || '',
      country: profileData.country || 'India',
      contactNumber: profileData.contactNumber || '',
      email: profileData.email || '',
      panNumber: profileData.panNumber || '',
      udhyamMsmeNo: profileData.udhyamMsmeNo,
      gstinNumber: profileData.gstinNumber || '',
      bankName: profileData.bankName || '',
      accountNumber: profileData.accountNumber || '',
      accountHolderName: profileData.accountHolderName || '',
      branchName: profileData.branchName || '',
      ifscCode: profileData.ifscCode || '',
      bankContactNumber: profileData.bankContactNumber || '',
      createdAt: profileData.createdAt || Date.now(),
      updatedAt: Date.now(),
    };

    // Save to Firestore using userId as document ID
    const companyRef = doc(db, COMPANIES_COLLECTION, userId);
    await setDoc(companyRef, profileToSave, { merge: true });

    console.log('Company profile saved successfully:', companyId);
    return profileToSave;
  } catch (error) {
    console.error('Error saving company profile:', error);
    throw new Error('Failed to save company profile. Please try again.');
  }
}

/**
 * Get company profile by user ID
 * @param userId - User ID
 * @returns Company profile or null if not found
 */
export async function getCompanyProfile(userId: string): Promise<CompanyProfile | null> {
  try {
    const db = await getDb();
    const companyRef = doc(db, COMPANIES_COLLECTION, userId);
    const docSnap = await getDoc(companyRef);

    if (docSnap.exists()) {
      return docSnap.data() as CompanyProfile;
    }
    return null;
  } catch (error) {
    console.error('Error fetching company profile:', error);
    return null;
  }
}

/**
 * Get company profile by company ID
 * @param companyId - Company ID
 * @returns Company profile or null if not found
 */
export async function getCompanyByCompanyId(companyId: string): Promise<CompanyProfile | null> {
  try {
    const db = await getDb();
    const companiesRef = collection(db, COMPANIES_COLLECTION);
    const q = query(companiesRef, where('id', '==', companyId));
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      return snapshot.docs[0].data() as CompanyProfile;
    }
    return null;
  } catch (error) {
    console.error('Error fetching company by company ID:', error);
    return null;
  }
}

/**
 * Delete company profile
 * @param userId - User ID
 */
export async function deleteCompanyProfile(userId: string): Promise<void> {
  try {
    const db = await getDb();
    const companyRef = doc(db, COMPANIES_COLLECTION, userId);
    await setDoc(companyRef, { deleted: true, deletedAt: Date.now() }, { merge: true });
    console.log('Company profile deleted successfully');
  } catch (error) {
    console.error('Error deleting company profile:', error);
    throw new Error('Failed to delete company profile');
  }
}
