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

function generatePassword(): string {
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const allChars = uppercase + lowercase + numbers;

    let password = '';
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];

    for (let i = 3; i < 8; i++) {
        password += allChars[Math.floor(Math.random() * allChars.length)];
    }

    return password.split('').sort(() => Math.random() - 0.5).join('');
}

function encryptPassword(password: string): string {
    // btoa/atob are available in React Native (global)
    return btoa(password);
}

export function decryptPassword(encryptedPassword: string): string | null {
    try {
        if (!encryptedPassword) {
            return null;
        }
        return atob(encryptedPassword);
    } catch (error) {
        console.error('[Vendor Auth] Failed to decrypt password:', error);
        return null;
    }
}

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

export async function addVendor(
    companyDocId: string,
    companyId: string,
    createdBy: string,
    vendorData: Omit<Vendor, 'id' | 'tailorCode' | 'companyId' | 'companyDocId' | 'createdBy' | 'createdAt' | 'updatedAt' | 'password' | 'passwordHistory' | 'isFirstLogin' | 'lastPasswordChange'>,
    companyName?: string
): Promise<{ vendor: Vendor; plainPassword: string }> {
    try {
        const tailorCode = await generateTailorCode(companyId);
        const autoPassword = generatePassword();
        const encryptedPassword = encryptPassword(autoPassword);
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

        const vendorRef = doc(db, VENDORS_COLLECTION, tailorCode);
        await setDoc(vendorRef, vendor);

        console.log('Vendor added successfully:', tailorCode);

        try {
            await sendTailorCredentialsEmail({
                to: vendorData.email,
                employeeName: vendorData.tailorName,
                loginId: vendorData.contactNumber,
                temporaryPassword: autoPassword,
                companyName,
            });
        } catch (emailError) {
            console.error('Failed to send credentials email:', emailError);
        }

        return { vendor, plainPassword: autoPassword };
    } catch (error) {
        console.error('Error adding vendor:', error);
        throw new Error('Failed to add vendor. Please try again.');
    }
}

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

        const decryptedPassword = decryptPassword(vendor.password);
        if (decryptedPassword === null) {
            throw new Error('Unable to verify current password. Please contact support.');
        }
        if (decryptedPassword !== currentPassword) {
            throw new Error('Current password is incorrect');
        }

        const encryptedPassword = encryptPassword(newPassword);
        const now = Date.now();

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

export interface VendorAuthResult {
    success: boolean;
    vendor?: Vendor;
    error?: 'not_found' | 'invalid_password' | 'account_inactive' | 'decryption_error' | 'system_error';
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

export async function authenticateVendor(
    contactNumber: string,
    password: string
): Promise<VendorAuthResult> {
    try {
        const trimmedContact = contactNumber.trim();
        const trimmedPassword = password.trim();

        console.log('[Vendor Auth] Authenticating vendor:', trimmedContact);

        const vendorsRef = collection(db, VENDORS_COLLECTION);
        const q = query(vendorsRef, where('contactNumber', '==', trimmedContact));
        const snapshot = await withTimeout(getDocs(q), 5000);

        if (snapshot.empty) {
            return { success: false, error: 'not_found', message: 'No account found with this phone number' };
        }

        const vendorDoc = snapshot.docs[0];
        const vendor = vendorDoc.data() as Vendor;

        if (vendor.isActive === false) {
            return { success: false, error: 'account_inactive', message: 'Your account is not active. Please contact the administrator.' };
        }

        const decryptedPassword = decryptPassword(vendor.password);

        if (decryptedPassword === null) {
            return { success: false, error: 'decryption_error', message: 'Authentication error. Please contact support.' };
        }

        if (decryptedPassword === trimmedPassword) {
            return { success: true, vendor };
        }

        return { success: false, error: 'invalid_password', message: 'Invalid password' };
    } catch (error) {
        console.error('[Vendor Auth] Error authenticating vendor:', error);
        return { success: false, error: 'system_error', message: 'System error. Please try again.' };
    }
}
