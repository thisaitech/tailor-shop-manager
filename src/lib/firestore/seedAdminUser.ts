import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const EMPLOYEES_COLLECTION = 'employees';
const COMPANIES_COLLECTION = 'companies';

/**
 * Seed admin user in Firebase
 * This function creates:
 * 1. A default company profile (if not exists)
 * 2. An admin employee with the specified credentials
 */
export async function seedAdminUser(): Promise<{ success: boolean; message: string }> {
  try {
    const adminContactNumber = '9486229273';
    const adminPassword = 'password';
    const adminEmployeeId = 'ADMIN001';
    const defaultCompanyId = 'COMP0001';
    const defaultCompanyDocId = 'default-company';

    // Check if admin already exists
    const existingAdminRef = doc(db, EMPLOYEES_COLLECTION, adminEmployeeId);
    const existingAdmin = await getDoc(existingAdminRef);

    if (existingAdmin.exists()) {
      console.log('[Seed] Admin user already exists');
      return { success: true, message: 'Admin user already exists' };
    }

    // Create default company if not exists
    const companyRef = doc(db, COMPANIES_COLLECTION, defaultCompanyDocId);
    const existingCompany = await getDoc(companyRef);

    if (!existingCompany.exists()) {
      const companyProfile = {
        id: defaultCompanyId,
        companyName: 'Thisai Technologies Tailor',
        aliasName: 'TTT',
        businessType: 'service',
        productCategory: 'Tailoring',
        address1: '',
        address2: '',
        city: '',
        pincode: '',
        region: '',
        state: 'Tamil Nadu',
        country: 'India',
        contactNumber: adminContactNumber,
        email: '',
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

      await setDoc(companyRef, companyProfile);
      console.log('[Seed] Default company created:', defaultCompanyId);
    }

    // Create admin employee
    const adminEmployee = {
      id: adminEmployeeId,
      employeeCode: adminEmployeeId,
      name: 'Admin',
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
      state: 'Tamil Nadu',
      country: 'India',
      role: 'manager', // Using 'manager' as it has full access; can also use 'admin' if type supports it
      designation: 'Administrator',
      joiningDate: Date.now(),
      accessPermissions: {
        dashboard: true,
        orders: true,
        customers: true,
        inventory: true,
        reports: true,
        settings: true,
        employees: true,
        vendors: true,
      },
      accessPermissionEnabled: true,
      isActive: true,
      firstLogin: false, // Set to false so no password change required
      passwordHistory: [],
      companyId: defaultCompanyId,
      companyDocId: defaultCompanyDocId,
      createdBy: 'system',
      password: adminPassword,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    // Save admin employee to Firestore
    const adminRef = doc(db, EMPLOYEES_COLLECTION, adminEmployeeId);
    await setDoc(adminRef, adminEmployee);

    console.log('[Seed] Admin user created successfully!');
    console.log('[Seed] Login credentials:');
    console.log('[Seed]   Contact Number:', adminContactNumber);
    console.log('[Seed]   Password:', adminPassword);

    return {
      success: true,
      message: `Admin user created successfully! Login with: ${adminContactNumber} / ${adminPassword}`
    };
  } catch (error) {
    console.error('[Seed] Error creating admin user:', error);
    return {
      success: false,
      message: `Failed to create admin user: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Check if admin user exists
 */
export async function checkAdminExists(): Promise<boolean> {
  try {
    const adminRef = doc(db, EMPLOYEES_COLLECTION, 'ADMIN001');
    const adminDoc = await getDoc(adminRef);
    return adminDoc.exists();
  } catch (error) {
    console.error('[Seed] Error checking admin existence:', error);
    return false;
  }
}
