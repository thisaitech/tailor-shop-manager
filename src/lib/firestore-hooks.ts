import { useState, useEffect, useCallback } from 'react';
import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  onSnapshot,
  writeBatch,
  QuerySnapshot,
  DocumentData
} from 'firebase/firestore';
import { db } from './firebase';

/**
 * Custom hook to sync data with Firestore
 * Replaces the Spark useKV hook with Firebase Firestore
 * 
 * @param collectionName - Firestore collection name
 * @param initialValue - Initial value if collection is empty
 * @returns [data, setData] - Current data and setter function
 */
export function useFirestore<T>(
  collectionName: string,
  initialValue: T
): [T, (value: T | ((prev: T) => T)) => Promise<void>] {
  const [data, setDataState] = useState<T>(initialValue);
  const [isLoading, setIsLoading] = useState(true);

  // Load data on mount
  useEffect(() => {
    const collectionRef = collection(db, collectionName);
    
    // Subscribe to real-time updates
    const unsubscribe = onSnapshot(
      collectionRef,
      (snapshot: QuerySnapshot<DocumentData>) => {
        if (snapshot.empty) {
          setDataState(initialValue);
          setIsLoading(false);
          return;
        }

        const items = snapshot.docs.map((doc) => ({
          ...doc.data(),
          id: doc.id,
        }));

        // If initial value is an array, return array
        if (Array.isArray(initialValue)) {
          setDataState(items as T);
        } else {
          // For single documents, return the first item
          setDataState(items[0] as T);
        }
        setIsLoading(false);
      },
      (error) => {
        console.error(`Error loading ${collectionName}:`, error);
        setDataState(initialValue);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [collectionName]);

  // Update data in Firestore
  const setData = useCallback(
    async (value: T | ((prev: T) => T)) => {
      const newValue = typeof value === 'function' 
        ? (value as (prev: T) => T)(data)
        : value;

      setDataState(newValue);

      try {
        const collectionRef = collection(db, collectionName);
        const batch = writeBatch(db);

        // Clear existing documents
        const existingDocs = await getDocs(collectionRef);
        existingDocs.forEach((doc) => {
          batch.delete(doc.ref);
        });

        // Add new documents
        if (Array.isArray(newValue)) {
          (newValue as any[]).forEach((item) => {
            const docRef = doc(collectionRef, item.id || `${Date.now()}_${Math.random()}`);
            batch.set(docRef, item);
          });
        } else if (newValue && typeof newValue === 'object') {
          const docRef = doc(collectionRef, (newValue as any).id || 'default');
          batch.set(docRef, newValue);
        }

        await batch.commit();
      } catch (error) {
        console.error(`Error updating ${collectionName}:`, error);
        throw error;
      }
    },
    [collectionName, data]
  );

  return [data, setData];
}

/**
 * Add a single document to a collection
 */
export async function addDocument<T extends { id?: string }>(
  collectionName: string,
  data: T
): Promise<string> {
  try {
    const id = data.id || `${collectionName.toUpperCase()}_${Date.now()}`;
    const docRef = doc(db, collectionName, id);
    await setDoc(docRef, { ...data, id });
    return id;
  } catch (error) {
    console.error(`Error adding document to ${collectionName}:`, error);
    throw error;
  }
}

/**
 * Update a single document in a collection
 */
export async function updateDocument<T>(
  collectionName: string,
  id: string,
  data: Partial<T>
): Promise<void> {
  try {
    const docRef = doc(db, collectionName, id);
    await setDoc(docRef, data, { merge: true });
  } catch (error) {
    console.error(`Error updating document in ${collectionName}:`, error);
    throw error;
  }
}

/**
 * Delete a single document from a collection
 */
export async function deleteDocument(
  collectionName: string,
  id: string
): Promise<void> {
  try {
    const docRef = doc(db, collectionName, id);
    await deleteDoc(docRef);
  } catch (error) {
    console.error(`Error deleting document from ${collectionName}:`, error);
    throw error;
  }
}

/**
 * Get all documents from a collection
 */
export async function getDocuments<T>(
  collectionName: string
): Promise<T[]> {
  try {
    const collectionRef = collection(db, collectionName);
    const snapshot = await getDocs(collectionRef);
    return snapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id } as T));
  } catch (error) {
    console.error(`Error getting documents from ${collectionName}:`, error);
    throw error;
  }
}
