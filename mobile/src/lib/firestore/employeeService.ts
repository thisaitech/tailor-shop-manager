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

export function generateEmployeePassword(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let password = '';
    for (let i = 0; i < 8; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
}

export interface EmployeeWithCompany extends Employee {
    companyId: string;
    companyDocId: string;
    password: string;
}

export async function findEmployeeByContactNumber(
    contactNumber: string,
    companyDocId: string,
    excludeEmployeeId?: string
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

        const employee = snapshot.docs[0].data() as EmployeeWithCompany;
        if (excludeEmployeeId && employee.id === excludeEmployeeId) {
            return null;
        }

        return employee;
    } catch (error) {
        console.error('Error finding employee by contact number:', error);
        return null;
    }
}

export async function findEmployeeByEmail(
    email: string,
    companyDocId: string,
    excludeEmployeeId?: string
): Promise<EmployeeWithCompany | null> {
    try {
        const employeesRef = collection(db, EMPLOYEES_COLLECTION);
        const q = query(
            employeesRef,
            where('email', '==', email),
            where('companyDocId', '==', companyDocId)
        );
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            return null;
        }

        const employee = snapshot.docs[0].data() as EmployeeWithCompany;
        if (excludeEmployeeId && employee.id === excludeEmployeeId) {
            return null;
        }

        return employee;
    } catch (error) {
        console.error('Error finding employee by email:', error);
        return null;
    }
}

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

export async function addEmployee(
    companyDocId: string,
    companyId: string,
    createdBy: string,
    employeeData: Omit<Employee, 'id' | 'employeeCode' | 'companyId' | 'companyDocId' | 'createdBy' | 'createdAt' | 'updatedAt'>,
    companyName?: string
): Promise<EmployeeWithCompany> {
    try {
        const employeeId = await generateEmployeeId(companyId);
        const password = generateEmployeePassword();

        const employee: EmployeeWithCompany = {
            id: employeeId,
            employeeCode: employeeId,
            name: employeeData.name,
            aliasName: employeeData.aliasName || '',
            gender: employeeData.gender,
            profilePicture: employeeData.profilePicture || '',
            email: employeeData.email,
            contactNumber: employeeData.contactNumber,
            whatsappNumber: employeeData.whatsappNumber || '',
            address1: employeeData.address1 || '',
            address2: employeeData.address2 || '',
            city: employeeData.city || '',
            pincode: employeeData.pincode || '',
            region: employeeData.region || '',
            state: employeeData.state || '',
            country: employeeData.country || 'India',
            role: employeeData.role,
            designation: employeeData.designation || '',
            joiningDate: employeeData.joiningDate,
            accessPermissions: employeeData.accessPermissions || [],
            accessPermissionEnabled: employeeData.accessPermissionEnabled ?? true,
            isActive: employeeData.isActive ?? true,
            firstLogin: true,
            passwordHistory: [],
            companyId,
            companyDocId,
            createdBy,
            password,
            createdAt: Date.now(),
            updatedAt: Date.now(),
        };

        const employeeRef = doc(db, EMPLOYEES_COLLECTION, employeeId);
        await setDoc(employeeRef, employee);

        console.log('[Employee Service] Employee added successfully:', employeeId);

        if (employeeData.email) {
            try {
                await sendTailorCredentialsEmail({
                    to: employeeData.email,
                    employeeName: employeeData.name,
                    loginId: employeeData.contactNumber,
                    temporaryPassword: password,
                    companyName: companyName,
                });
            } catch (emailError) {
                console.error('[Employee Service] ❌ Error sending credentials email:', emailError);
            }
        }

        return employee;
    } catch (error: any) {
        console.error('[Employee Service] Error adding employee:', error);
        throw new Error(error?.message || 'Failed to add employee. Please try again.');
    }
}

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

export async function changeEmployeePassword(
    employeeId: string,
    oldPassword: string,
    newPassword: string
): Promise<void> {
    try {
        const employeeRef = doc(db, EMPLOYEES_COLLECTION, employeeId);
        const employeeDoc = await getDoc(employeeRef);

        if (!employeeDoc.exists()) {
            throw new Error('Employee not found');
        }

        const employeeData = employeeDoc.data() as EmployeeWithCompany;
        const passwordHistory = employeeData.passwordHistory || [];
        passwordHistory.push(oldPassword);

        await updateDoc(employeeRef, {
            password: newPassword,
            passwordHistory: passwordHistory,
            firstLogin: false,
            updatedAt: Date.now(),
        });

        console.log(`[Employee Service] Password changed for employee ${employeeId}`);
    } catch (error) {
        console.error('Error changing employee password:', error);
        throw new Error('Failed to change password. Please try again.');
    }
}

export interface EmployeeAuthResult {
    success: boolean;
    employee?: EmployeeWithCompany;
    error?: 'not_found' | 'invalid_password' | 'account_inactive' | 'access_disabled' | 'system_error';
    message?: string;
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number = 3000): Promise<T> {
    return Promise.race([
        promise,
        new Promise<T>((_, reject) =>
            setTimeout(() => reject(new Error('Query timeout')), timeoutMs)
        ),
    ]);
}

export async function verifyEmployeeCredentials(
    contactNumber: string,
    password: string
): Promise<EmployeeAuthResult> {
    try {
        const trimmedContact = contactNumber.trim();
        const trimmedPassword = password.trim();

        console.log('[Employee Auth] Verifying credentials for:', trimmedContact);

        const employeesRef = collection(db, EMPLOYEES_COLLECTION);
        const contactQuery = query(
            employeesRef,
            where('contactNumber', '==', trimmedContact)
        );
        const contactSnapshot = await withTimeout(getDocs(contactQuery), 5000);

        if (contactSnapshot.empty) {
            return { success: false, error: 'not_found', message: 'No account found with this phone number' };
        }

        const employeeData = contactSnapshot.docs[0].data() as EmployeeWithCompany;

        if (employeeData.password !== trimmedPassword) {
            return { success: false, error: 'invalid_password', message: 'Invalid password' };
        }

        if (employeeData.isActive === false) {
            return { success: false, error: 'account_inactive', message: 'Your account is not active. Please contact the administrator.' };
        }

        if (!employeeData.accessPermissionEnabled) {
            return { success: false, error: 'access_disabled', message: 'Your access has been disabled. Please contact the administrator.' };
        }

        return { success: true, employee: employeeData };
    } catch (error) {
        console.error('[Employee Auth] Error verifying employee credentials:', error);
        return { success: false, error: 'system_error', message: 'System error. Please try again.' };
    }
}
