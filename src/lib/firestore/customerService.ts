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
  serverTimestamp,
  Timestamp,
  orderBy,
  limit,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Customer } from '@/lib/types';

const CUSTOMERS_COLLECTION = 'newcustomers';

/**
 * Generate auto-incrementing customer ID
 * Format: CUST0001, CUST0002, etc.
 */
export async function generateCustomerId(companyId: string, prefix = 'CUST', digits = 4): Promise<string> {
  try {
    const { generateNextNumber } = await import('@/lib/firestore/numberSeriesService');
    return await generateNextNumber(companyId, prefix, digits, 'customer');
  } catch (error) {
    console.error('[customerService] Error generating customer ID:', error);
    return `${prefix}${Date.now().toString().slice(-digits)}`;
  }
}

/**
 * Customer data with company reference
 */
export interface CustomerWithCompany extends Customer {
  companyId: string;
  adminId: string;
}

/**
 * Check if customer with phone number already exists
 * @param phone - Phone number to check
 * @param companyId - Company ID
 * @param excludeCustomerId - Optional customer ID to exclude (for updates)
 * @returns Customer if exists, null otherwise
 */
export async function findCustomerByPhone(
  phone: string,
  companyId: string,
  excludeCustomerId?: string
): Promise<CustomerWithCompany | null> {
  try {
    const customersRef = collection(db, CUSTOMERS_COLLECTION);
    const q = query(
      customersRef,
      where('phone', '==', phone),
      where('companyId', '==', companyId)
    );
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return null;
    }

    // If excluding a customer ID, check if the found customer is different
    const data = snapshot.docs[0].data();
    const customer = {
      ...data,
      id: snapshot.docs[0].id,
      createdAt: convertTimestamp(data.createdAt),
      updatedAt: convertTimestamp(data.updatedAt),
    } as CustomerWithCompany;

    if (excludeCustomerId && customer.id === excludeCustomerId) {
      return null;
    }

    return customer;
  } catch (error) {
    console.error('Error finding customer by phone:', error);
    return null;
  }
}

/**
 * Check if customer with email already exists
 * @param email - Email to check
 * @param companyId - Company ID
 * @param excludeCustomerId - Optional customer ID to exclude (for updates)
 * @returns Customer if exists, null otherwise
 */
export async function findCustomerByEmail(
  email: string,
  companyId: string,
  excludeCustomerId?: string
): Promise<CustomerWithCompany | null> {
  try {
    const customersRef = collection(db, CUSTOMERS_COLLECTION);
    const q = query(
      customersRef,
      where('email', '==', email),
      where('companyId', '==', companyId)
    );
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return null;
    }

    // If excluding a customer ID, check if the found customer is different
    const data = snapshot.docs[0].data();
    const customer = {
      ...data,
      id: snapshot.docs[0].id,
      createdAt: convertTimestamp(data.createdAt),
      updatedAt: convertTimestamp(data.updatedAt),
    } as CustomerWithCompany;

    if (excludeCustomerId && customer.id === excludeCustomerId) {
      return null;
    }

    return customer;
  } catch (error) {
    console.error('Error finding customer by email:', error);
    return null;
  }
}

/**
 * Convert Firestore timestamp to number
 */
function convertTimestamp(timestamp: any): number {
  if (timestamp instanceof Timestamp) {
    return timestamp.toMillis();
  }
  if (typeof timestamp === 'number') {
    return timestamp;
  }
  return Date.now();
}

/**
 * Add a new customer to Firestore
 */
// Helper function to remove undefined values from an object
function removeUndefinedFields<T extends Record<string, unknown>>(obj: T): T {
  return Object.fromEntries(
    Object.entries(obj).filter(([, value]) => value !== undefined)
  ) as T;
}

export async function addCustomer(
  customerData: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'> & { preferredId?: string },
  companyId: string,
  adminId: string
): Promise<CustomerWithCompany> {
  try {
    const preferredId = (customerData.preferredId || '').trim().toUpperCase();
    let customerId: string;
    if (preferredId) {
      const existing = await getDoc(doc(db, CUSTOMERS_COLLECTION, preferredId));
      if (existing.exists()) {
        throw new Error(`Customer number ${preferredId} already exists`);
      }
      customerId = preferredId;
    } else {
      customerId = await generateCustomerId(companyId);
    }
    const customerRef = doc(db, CUSTOMERS_COLLECTION, customerId);

    const { preferredId: _preferredId, ...rest } = customerData;
    const newCustomer: CustomerWithCompany = {
      ...rest,
      id: customerId,
      companyId,
      adminId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    // Remove undefined fields before saving to Firestore
    const cleanedCustomer = removeUndefinedFields(newCustomer);

    await setDoc(customerRef, {
      ...cleanedCustomer,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    console.log('Customer added successfully:', customerId);
    return newCustomer;
  } catch (error) {
    console.error('Error adding customer:', error);
    if (error instanceof Error && error.message.startsWith('Customer number')) {
      throw error;
    }
    throw new Error('Failed to add customer');
  }
}

/**
 * Get all customers for a company
 */
export async function getCustomersByCompany(companyId: string): Promise<CustomerWithCompany[]> {
  try {
    if (!companyId) {
      console.warn('[customerService] getCustomersByCompany called without companyId');
      return [];
    }
    const customersRef = collection(db, CUSTOMERS_COLLECTION);
    const q = query(customersRef, where('companyId', '==', companyId));
    const snapshot = await getDocs(q);

    const customers: CustomerWithCompany[] = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        ...data,
        id: doc.id,
        createdAt: convertTimestamp(data.createdAt),
        updatedAt: convertTimestamp(data.updatedAt),
      } as CustomerWithCompany;
    });

    console.log(`Found ${customers.length} customers for company ${companyId}`);
    return customers;
  } catch (error) {
    console.error('Error fetching customers:', error);
    return [];
  }
}

/**
 * Get a single customer by ID
 */
export async function getCustomerById(customerId: string): Promise<CustomerWithCompany | null> {
  try {
    const customerRef = doc(db, CUSTOMERS_COLLECTION, customerId);
    const customerDoc = await getDoc(customerRef);

    if (!customerDoc.exists()) {
      return null;
    }

    const data = customerDoc.data();
    return {
      ...data,
      id: customerDoc.id,
      createdAt: convertTimestamp(data.createdAt),
      updatedAt: convertTimestamp(data.updatedAt),
    } as CustomerWithCompany;
  } catch (error) {
    console.error('Error fetching customer:', error);
    throw new Error('Failed to fetch customer');
  }
}

/**
 * Update an existing customer
 */
export async function updateCustomer(
  customerId: string,
  customerData: Partial<Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<void> {
  try {
    const customerRef = doc(db, CUSTOMERS_COLLECTION, customerId);

    // Remove undefined fields before saving to Firestore
    const cleanedData = removeUndefinedFields(customerData as Record<string, unknown>);

    await updateDoc(customerRef, {
      ...cleanedData,
      updatedAt: serverTimestamp(),
    });

    console.log('Customer updated successfully:', customerId);
  } catch (error) {
    console.error('Error updating customer:', error);
    throw new Error('Failed to update customer');
  }
}

/**
 * Delete a customer
 */
export async function deleteCustomer(customerId: string): Promise<void> {
  try {
    const customerRef = doc(db, CUSTOMERS_COLLECTION, customerId);
    await deleteDoc(customerRef);
    console.log('Customer deleted successfully:', customerId);
  } catch (error) {
    console.error('Error deleting customer:', error);
    throw new Error('Failed to delete customer');
  }
}

/**
 * Get 15 most recently created customers for a company
 * Note: Sorts client-side to avoid requiring Firestore composite index
 */
export async function getRecentCustomers(companyId: string): Promise<CustomerWithCompany[]> {
  try {
    const customersRef = collection(db, CUSTOMERS_COLLECTION);
    const q = query(
      customersRef,
      where('companyId', '==', companyId)
    );
    const snapshot = await getDocs(q);

    const customers: CustomerWithCompany[] = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        ...data,
        id: doc.id,
        createdAt: convertTimestamp(data.createdAt),
        updatedAt: convertTimestamp(data.updatedAt),
      } as CustomerWithCompany;
    });

    // Sort by createdAt descending and take first 15
    const recentCustomers = customers
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 15);

    console.log(`Found ${recentCustomers.length} recent customers for company ${companyId}`);
    return recentCustomers;
  } catch (error) {
    console.error('Error fetching recent customers:', error);
    throw new Error('Failed to fetch recent customers');
  }
}

/**
 * Search customers by name or phone number
 * Note: Uses client-side filtering to avoid requiring Firestore composite index
 */
export async function searchCustomers(companyId: string, searchText: string): Promise<CustomerWithCompany[]> {
  try {
    const text = (searchText || '').trim().toLowerCase();
    if (!text) return [];

    // Fetch all customers for the company
    const customersRef = collection(db, CUSTOMERS_COLLECTION);
    const q = query(customersRef, where('companyId', '==', companyId));
    const snapshot = await getDocs(q);

    const allCustomers: CustomerWithCompany[] = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        ...data,
        id: doc.id,
        createdAt: convertTimestamp(data.createdAt),
        updatedAt: convertTimestamp(data.updatedAt),
      } as CustomerWithCompany;
    });

    // Client-side filtering
    const results = allCustomers.filter((customer) => {
      // Search by name (case-insensitive, partial match)
      const nameMatch = customer.name.toLowerCase().includes(text);

      // Search by phone number (match digits only)
      const phoneDigits = text.replace(/\D/g, '');
      const phoneMatch = phoneDigits && (
        customer.phone.includes(phoneDigits) ||
        customer.phoneNormalized?.includes(phoneDigits)
      );

      // Search by customer ID
      const idMatch = customer.id.toLowerCase().includes(text);

      // Search by alias name
      const aliasMatch = customer.aliasName?.toLowerCase().includes(text);

      return nameMatch || phoneMatch || idMatch || aliasMatch;
    });

    // Limit to 30 results for performance
    const limitedResults = results.slice(0, 30);

    console.log(`Found ${limitedResults.length} customers matching "${searchText}"`);
    return limitedResults;
  } catch (error) {
    console.error('Error searching customers:', error);
    throw new Error('Failed to search customers');
  }
}
