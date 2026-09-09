import { doc, setDoc, getDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { CompanyProfile } from '@/lib/types';

const COMPANIES_COLLECTION = 'companies';

/**
 * Generate auto-incrementing company ID
 * Format: COMP0001, COMP0002, etc.
 */
async function generateCompanyId(): Promise<string> {
  try {
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
 * Resolve a company profile for the logged-in owner/admin.
 * Links a company to the user document if missing so customers can load/save.
 */
export async function resolveCompanyForUser(
  userId: string,
  options?: {
    phone?: string;
    name?: string;
    employeeCompanyId?: string;
  }
): Promise<CompanyProfile> {
  // 1. Profile already linked to this user
  const existing = await getCompanyProfile(userId);
  if (existing?.id) {
    return existing;
  }

  // 2. Employee already has a companyId — link that company to this user
  if (options?.employeeCompanyId) {
    const byEmployeeCompany = await getCompanyByCompanyId(options.employeeCompanyId);
    if (byEmployeeCompany?.id) {
      return saveCompanyProfile(userId, byEmployeeCompany);
    }
  }

  // 3. Seeded default company document (from seedAdminUser)
  try {
    const defaultRef = doc(db, COMPANIES_COLLECTION, 'default-company');
    const defaultSnap = await getDoc(defaultRef);
    if (defaultSnap.exists()) {
      const data = defaultSnap.data() as CompanyProfile;
      if (data?.id) {
        return saveCompanyProfile(userId, data);
      }
    }
  } catch (error) {
    console.warn('[companyService] Could not read default-company:', error);
  }

  // 4. Match company by owner phone / contact number
  const phone = (options?.phone || '').replace(/\D/g, '');
  if (phone) {
    try {
      const companiesRef = collection(db, COMPANIES_COLLECTION);
      const snapshot = await getDocs(companiesRef);
      const match = snapshot.docs
        .map((d) => d.data() as CompanyProfile)
        .find((c) => {
          const contact = (c.contactNumber || '').replace(/\D/g, '');
          return contact && (contact === phone || contact.endsWith(phone) || phone.endsWith(contact));
        });
      if (match?.id) {
        return saveCompanyProfile(userId, match);
      }
    } catch (error) {
      console.warn('[companyService] Could not search companies by phone:', error);
    }
  }

  // 5. Create a new company profile for this owner
  return saveCompanyProfile(userId, {
    companyName: options?.name || 'Tailor Shop',
    contactNumber: options?.phone || '',
    businessType: 'service',
    productCategory: 'Tailoring',
    state: 'Tamil Nadu',
    country: 'India',
  });
}

/**
 * Delete company profile
 * @param userId - User ID
 */
export async function deleteCompanyProfile(userId: string): Promise<void> {
  try {
    const companyRef = doc(db, COMPANIES_COLLECTION, userId);
    await setDoc(companyRef, { deleted: true, deletedAt: Date.now() }, { merge: true });
    console.log('Company profile deleted successfully');
  } catch (error) {
    console.error('Error deleting company profile:', error);
    throw new Error('Failed to delete company profile');
  }
}
