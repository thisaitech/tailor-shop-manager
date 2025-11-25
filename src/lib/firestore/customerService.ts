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
export async function generateCustomerId(companyId: string): Promise<string> {
  try {
    console.log('[customerService] ==========================================');
    console.log('[customerService] Generating customer ID for companyId:', companyId);
    console.log('[customerService] Collection name:', CUSTOMERS_COLLECTION);

    const customersRef = collection(db, CUSTOMERS_COLLECTION);
    const q = query(customersRef, where('companyId', '==', companyId));
    const snapshot = await getDocs(q);

    console.log('[customerService] Total documents found:', snapshot.size);

    // Log all documents for debugging
    snapshot.docs.forEach(doc => {
      const data = doc.data();
      console.log(`[customerService] Document ID: ${doc.id}, companyId: ${data.companyId}`);
    });

    // Get all existing IDs and find the highest number
    const existingIds = snapshot.docs.map(doc => doc.id);
    console.log('[customerService] Existing customer IDs:', existingIds);

    let maxNum = 0;

    existingIds.forEach(id => {
      const match = id.match(/^CUST(\d+)$/);
      if (match) {
        const num = parseInt(match[1], 10);
        console.log(`[customerService] Found customer ${id} with number ${num}`);
        if (num > maxNum) maxNum = num;
      } else {
        console.warn(`[customerService] Invalid customer ID format: ${id}`);
      }
    });

    const count = maxNum + 1;
    const newCode = `CUST${count.toString().padStart(4, '0')}`;
    console.log(`[customerService] Max number found: ${maxNum}, Generated new code: ${newCode}`);
    console.log('[customerService] ==========================================');

    return newCode;
  } catch (error) {
    console.error('[customerService] Error generating customer ID:', error);
    return `CUST${Date.now().toString().slice(-4)}`;
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
  customerData: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>,
  companyId: string,
  adminId: string
): Promise<CustomerWithCompany> {
  try {
    const customerId = await generateCustomerId(companyId);
    const customerRef = doc(db, CUSTOMERS_COLLECTION, customerId);

    const newCustomer: CustomerWithCompany = {
      ...customerData,
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
    throw new Error('Failed to add customer');
  }
}

/**
 * Get all customers for a company
 */
export async function getCustomersByCompany(companyId: string): Promise<CustomerWithCompany[]> {
  try {
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
    throw new Error('Failed to fetch customers');
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

    await updateDoc(customerRef, {
      ...customerData,
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
