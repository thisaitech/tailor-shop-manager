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
import { Employee } from '@/lib/types';
import { sendTailorCredentialsEmail } from '@/lib/emailService';

const EMPLOYEES_COLLECTION = 'employees';

/**
 * Generate auto-incrementing employee ID
 * Format: EMP0001, EMP0002, etc.
 */
async function generateEmployeeId(companyId: string): Promise<string> {
  try {
    const employeesRef = collection(db, EMPLOYEES_COLLECTION);
    const q = query(employeesRef, where('companyId', '==', companyId));
    const snapshot = await getDocs(q);
    const count = snapshot.size + 1;
    return `EMP${count.toString().padStart(4, '0')}`;
  } catch (error) {
    console.error('Error generating employee ID:', error);
    return `EMP${Date.now()}`;
  }
}

/**
 * Generate random password for employee
 * Format: ABC123XY (8 characters - uppercase letters and numbers)
 */
export function generateEmployeePassword(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let password = '';
  for (let i = 0; i < 8; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

/**
 * Employee data with company reference
 */
export interface EmployeeWithCompany extends Employee {
  companyId: string;
  companyDocId: string; // User ID of company owner
  password: string; // Auto-generated password
}

/**
 * Check if employee with contact number already exists
 * @param contactNumber - Contact number to check
 * @param companyDocId - Company document ID
 * @returns Employee if exists, null otherwise
 */
export async function findEmployeeByContactNumber(
  contactNumber: string,
  companyDocId: string
): Promise<EmployeeWithCompany | null> {
  try {
    const employeesRef = collection(db, EMPLOYEES_COLLECTION);
    const q = query(
      employeesRef,
      where('contactNumber', '==', contactNumber),
      where('companyDocId', '==', companyDocId)
    );
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return null;
    }

    return snapshot.docs[0].data() as EmployeeWithCompany;
  } catch (error) {
    console.error('Error finding employee by contact number:', error);
    return null;
  }
}

/**
 * Check if employee with WhatsApp number already exists
 * @param whatsappNumber - WhatsApp number to check
 * @param companyDocId - Company document ID
 * @returns Employee if exists, null otherwise
 */
export async function findEmployeeByWhatsAppNumber(
  whatsappNumber: string,
  companyDocId: string
): Promise<EmployeeWithCompany | null> {
  try {
    const employeesRef = collection(db, EMPLOYEES_COLLECTION);
    const q = query(
      employeesRef,
      where('whatsappNumber', '==', whatsappNumber),
      where('companyDocId', '==', companyDocId)
    );
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return null;
    }

    return snapshot.docs[0].data() as EmployeeWithCompany;
  } catch (error) {
    console.error('Error finding employee by WhatsApp number:', error);
    return null;
  }
}

/**
 * Add new employee
 * @param companyDocId - Document ID of the company (user ID)
 * @param companyId - Company ID (COMP0001, etc.)
 * @param createdBy - Admin user ID who created employee
 * @param employeeData - Employee data
 * @param companyName - Optional company name for email
 * @returns Created employee with password
 */
export async function addEmployee(
  companyDocId: string,
  companyId: string,
  createdBy: string,
  employeeData: Omit<Employee, 'id' | 'employeeCode' | 'companyId' | 'companyDocId' | 'createdBy' | 'createdAt' | 'updatedAt'>,
  companyName?: string
): Promise<EmployeeWithCompany> {
  try {
    // Generate employee ID and password
    const employeeId = await generateEmployeeId(companyId);
    const password = generateEmployeePassword();

    const employee: EmployeeWithCompany = {
      id: employeeId,
      employeeCode: employeeId,
      name: employeeData.name,
      aliasName: employeeData.aliasName,
      gender: employeeData.gender,
      profilePicture: employeeData.profilePicture,
      email: employeeData.email,
      contactNumber: employeeData.contactNumber,
      whatsappNumber: employeeData.whatsappNumber,
      address1: employeeData.address1,
      address2: employeeData.address2,
      city: employeeData.city,
      pincode: employeeData.pincode,
      region: employeeData.region,
      state: employeeData.state,
      country: employeeData.country,
      role: employeeData.role,
      designation: employeeData.designation,
      joiningDate: employeeData.joiningDate,
      accessPermissions: employeeData.accessPermissions,
      accessPermissionEnabled: employeeData.accessPermissionEnabled,
      isActive: employeeData.isActive,
      firstLogin: true, // Set to true by default for new employees
      passwordHistory: [], // Initialize empty password history
      companyId,
      companyDocId,
      createdBy,
      password,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    // Save to Firestore
    const employeeRef = doc(db, EMPLOYEES_COLLECTION, employeeId);
    await setDoc(employeeRef, employee);

    console.log('[Employee Service] Employee added successfully:', employeeId);

    // Send email to tailor if role is 'tailor' and email is provided
    if (employeeData.role === 'tailor' && employeeData.email) {
      console.log('[Employee Service] Sending credentials email to tailor...');
      const emailSent = await sendTailorCredentialsEmail({
        to: employeeData.email,
        employeeName: employeeData.name,
        loginId: employeeData.contactNumber,
        temporaryPassword: password,
        companyName: companyName,
      });

      if (emailSent) {
        console.log('[Employee Service] ✅ Credentials email sent successfully to:', employeeData.email);
      } else {
        console.warn('[Employee Service] ⚠️ Failed to send credentials email to:', employeeData.email);
      }
    } else if (employeeData.role === 'tailor' && !employeeData.email) {
      console.warn('[Employee Service] ⚠️ Tailor created but no email provided. Credentials not sent.');
    }

    return employee;
  } catch (error) {
    console.error('[Employee Service] Error adding employee:', error);
    throw new Error('Failed to add employee. Please try again.');
  }
}

/**
 * Update employee
 * @param employeeId - Employee ID
 * @param employeeData - Updated employee data
 */
export async function updateEmployee(
  employeeId: string,
  employeeData: Partial<Employee>
): Promise<void> {
  try {
    const employeeRef = doc(db, EMPLOYEES_COLLECTION, employeeId);
    await updateDoc(employeeRef, {
      ...employeeData,
      updatedAt: Date.now(),
    });
    console.log('Employee updated successfully:', employeeId);
  } catch (error) {
    console.error('Error updating employee:', error);
    throw new Error('Failed to update employee. Please try again.');
  }
}

/**
 * Get all employees for a company
 * @param companyDocId - Document ID of the company (user ID)
 * @returns Array of employees
 */
export async function getEmployeesByCompany(
  companyDocId: string
): Promise<EmployeeWithCompany[]> {
  try {
    const employeesRef = collection(db, EMPLOYEES_COLLECTION);
    const q = query(employeesRef, where('companyDocId', '==', companyDocId));
    const snapshot = await getDocs(q);

    return snapshot.docs.map((doc) => doc.data() as EmployeeWithCompany);
  } catch (error) {
    console.error('Error fetching employees:', error);
    return [];
  }
}

/**
 * Get only employees with access permission enabled for a company
 * @param companyDocId - Document ID of the company (user ID)
 * @returns Array of employees with access permission enabled
 */
export async function getEnabledEmployeesByCompany(
  companyDocId: string
): Promise<EmployeeWithCompany[]> {
  try {
    const employeesRef = collection(db, EMPLOYEES_COLLECTION);
    const q = query(
      employeesRef,
      where('companyDocId', '==', companyDocId),
      where('accessPermissionEnabled', '==', true)
    );
    const snapshot = await getDocs(q);

    return snapshot.docs.map((doc) => doc.data() as EmployeeWithCompany);
  } catch (error) {
    console.error('Error fetching enabled employees:', error);
    return [];
  }
}

/**
 * Get single employee
 * @param employeeId - Employee ID
 * @returns Employee data or null
 */
export async function getEmployee(employeeId: string): Promise<EmployeeWithCompany | null> {
  try {
    const employeeRef = doc(db, EMPLOYEES_COLLECTION, employeeId);
    const docSnap = await getDoc(employeeRef);

    if (docSnap.exists()) {
      return docSnap.data() as EmployeeWithCompany;
    }
    return null;
  } catch (error) {
    console.error('Error fetching employee:', error);
    return null;
  }
}

/**
 * Delete employee
 * @param employeeId - Employee ID
 */
export async function deleteEmployee(employeeId: string): Promise<void> {
  try {
    const employeeRef = doc(db, EMPLOYEES_COLLECTION, employeeId);
    await deleteDoc(employeeRef);
    console.log('Employee deleted successfully:', employeeId);
  } catch (error) {
    console.error('Error deleting employee:', error);
    throw new Error('Failed to delete employee. Please try again.');
  }
}

/**
 * Toggle employee active status
 * @param employeeId - Employee ID
 * @param isActive - New active status
 */
export async function toggleEmployeeStatus(
  employeeId: string,
  isActive: boolean
): Promise<void> {
  try {
    const employeeRef = doc(db, EMPLOYEES_COLLECTION, employeeId);
    await updateDoc(employeeRef, {
      isActive,
      updatedAt: Date.now(),
    });
    console.log('Employee status updated:', employeeId);
  } catch (error) {
    console.error('Error updating employee status:', error);
    throw new Error('Failed to update employee status. Please try again.');
  }
}

/**
 * Reset employee password
 * @param employeeId - Employee ID
 * @returns New password
 */
export async function resetEmployeePassword(employeeId: string): Promise<string> {
  try {
    const newPassword = generateEmployeePassword();
    const employeeRef = doc(db, EMPLOYEES_COLLECTION, employeeId);
    await updateDoc(employeeRef, {
      password: newPassword,
      updatedAt: Date.now(),
    });
    console.log('Employee password reset:', employeeId);
    return newPassword;
  } catch (error) {
    console.error('Error resetting employee password:', error);
    throw new Error('Failed to reset password. Please try again.');
  }
}

/**
 * Change employee password after first login
 * @param employeeId - Employee ID
 * @param oldPassword - Current password for verification
 * @param newPassword - New password set by employee
 */
export async function changeEmployeePassword(
  employeeId: string,
  oldPassword: string,
  newPassword: string
): Promise<void> {
  try {
    // Get current employee data
    const employeeRef = doc(db, EMPLOYEES_COLLECTION, employeeId);
    const employeeDoc = await getDoc(employeeRef);

    if (!employeeDoc.exists()) {
      throw new Error('Employee not found');
    }

    const employeeData = employeeDoc.data() as EmployeeWithCompany;

    // Initialize password history if it doesn't exist
    const passwordHistory = employeeData.passwordHistory || [];

    // Add old password to history
    passwordHistory.push(oldPassword);

    // Update with new password and history
    await updateDoc(employeeRef, {
      password: newPassword,
      passwordHistory: passwordHistory,
      firstLogin: false,
      updatedAt: Date.now(),
    });

    console.log(`[Employee Service] Password changed for employee ${employeeId}. Password added to history.`);
  } catch (error) {
    console.error('Error changing employee password:', error);
    throw new Error('Failed to change password. Please try again.');
  }
}

/**
 * Verify employee login credentials
 * @param contactNumber - Employee phone number
 * @param password - Employee password
 * @returns Employee data if credentials are valid, null otherwise
 */
export async function verifyEmployeeCredentials(
  contactNumber: string,
  password: string
): Promise<EmployeeWithCompany | null> {
  try {
    console.log('[Employee Auth] Verifying credentials for:', contactNumber);
    const employeesRef = collection(db, EMPLOYEES_COLLECTION);
    const q = query(
      employeesRef,
      where('contactNumber', '==', contactNumber),
      where('password', '==', password)
    );
    const snapshot = await getDocs(q);

    console.log('[Employee Auth] Query result - documents found:', snapshot.size);

    if (snapshot.empty) {
      console.log('[Employee Auth] No employee found with these credentials');
      return null;
    }

    const employeeData = snapshot.docs[0].data() as EmployeeWithCompany;
    console.log('[Employee Auth] Employee found:', {
      id: employeeData.id,
      name: employeeData.name,
      contactNumber: employeeData.contactNumber,
      firstLogin: employeeData.firstLogin,
      isActive: employeeData.isActive,
      accessPermissionEnabled: employeeData.accessPermissionEnabled,
      role: employeeData.role
    });

    // Check if access permission is enabled
    if (!employeeData.accessPermissionEnabled) {
      console.log('[Employee Auth] Access permission is disabled for this employee');
      return null;
    }

    return employeeData;
  } catch (error) {
    console.error('[Employee Auth] Error verifying employee credentials:', error);
    return null;
  }
}
