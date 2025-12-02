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
  arrayUnion,
  arrayRemove,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';

const DESIGN_CATEGORIES_COLLECTION = 'designCategories';

// Design Category Types
export type DesignCategoryType = 'neck' | 'collar' | 'pant' | 'blouse' | 'chudithar' | 'frock' | 'shirt';

export const DESIGN_CATEGORY_OPTIONS: { value: DesignCategoryType; label: string }[] = [
  { value: 'neck', label: 'Neck' },
  { value: 'collar', label: 'Collar' },
  { value: 'pant', label: 'Pant' },
  { value: 'blouse', label: 'Blouse' },
  { value: 'chudithar', label: 'Chudithar' },
  { value: 'frock', label: 'Frock' },
  { value: 'shirt', label: 'Shirt' },
];

// Image record interface
export interface DesignImage {
  id: string;
  designCode: string; // Auto-generated: DSG0001, DSG0002, etc.
  name: string;
  url: string;
  storagePath: string;
  uploadedAt: number;
}

// Design Category interface
export interface DesignCategory {
  id: string;
  name: string;
  categoryType: DesignCategoryType; // Type: Neck/Collar/Pant/Blouse/Chudithar/Frock/Shirt
  companyId: string;
  createdBy: string;
  images: DesignImage[];
  createdAt: number;
  updatedAt: number;
}

/**
 * Generate auto-incrementing category ID
 * Format: CAT0001, CAT0002, etc.
 */
async function generateCategoryId(companyId: string): Promise<string> {
  try {
    const categoriesRef = collection(db, DESIGN_CATEGORIES_COLLECTION);
    const q = query(categoriesRef, where('companyId', '==', companyId));
    const snapshot = await getDocs(q);

    // Get all existing IDs and find the highest number
    const existingIds = snapshot.docs.map(doc => doc.id);
    let maxNum = 0;

    existingIds.forEach(id => {
      const match = id.match(/^CAT(\d+)$/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    });

    const count = maxNum + 1;
    return `CAT${count.toString().padStart(4, '0')}`;
  } catch (error) {
    console.error('[designCategoryService] Error generating category ID:', error);
    return `CAT${Date.now()}`;
  }
}

/**
 * Generate auto-incrementing design code
 * Format: D001, D002, etc.
 */
async function generateDesignCode(companyId: string): Promise<string> {
  try {
    // Count all images across all categories for this company
    const categoriesRef = collection(db, DESIGN_CATEGORIES_COLLECTION);
    const q = query(categoriesRef, where('companyId', '==', companyId));
    const snapshot = await getDocs(q);

    let totalImages = 0;
    snapshot.docs.forEach(doc => {
      const data = doc.data();
      totalImages += (data.images || []).length;
    });

    const count = totalImages + 1;
    return `D${count.toString().padStart(3, '0')}`;
  } catch (error) {
    console.error('[designCategoryService] Error generating design code:', error);
    return `D${Date.now().toString().slice(-3)}`;
  }
}

/**
 * Create a new design category
 */
export async function createDesignCategory(
  name: string,
  categoryType: DesignCategoryType,
  companyId: string,
  adminId: string
): Promise<DesignCategory> {
  try {
    const categoryId = await generateCategoryId(companyId);

    const newCategory: DesignCategory = {
      id: categoryId,
      name,
      categoryType,
      companyId,
      createdBy: adminId,
      images: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    console.log('[designCategoryService] Creating category:', newCategory);

    await setDoc(doc(db, DESIGN_CATEGORIES_COLLECTION, categoryId), {
      ...newCategory,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    console.log(`[designCategoryService] Category ${categoryId} created successfully`);
    return newCategory;
  } catch (error) {
    console.error('[designCategoryService] Error creating category:', error);
    throw error;
  }
}

/**
 * Get all design categories for a company
 */
export async function getDesignCategoriesByCompany(companyId: string): Promise<DesignCategory[]> {
  try {
    const categoriesRef = collection(db, DESIGN_CATEGORIES_COLLECTION);
    const q = query(categoriesRef, where('companyId', '==', companyId));
    const snapshot = await getDocs(q);

    const categories: DesignCategory[] = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        ...data,
        createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toMillis() : data.createdAt,
        updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toMillis() : data.updatedAt,
        images: (data.images || []).map((img: any) => ({
          ...img,
          uploadedAt: img.uploadedAt instanceof Timestamp ? img.uploadedAt.toMillis() : img.uploadedAt,
        })),
      } as DesignCategory;
    });

    console.log(`[designCategoryService] Loaded ${categories.length} categories for company ${companyId}`);
    return categories;
  } catch (error) {
    console.error('[designCategoryService] Error getting categories:', error);
    throw error;
  }
}

/**
 * Get a specific design category by ID
 */
export async function getDesignCategory(categoryId: string): Promise<DesignCategory | null> {
  try {
    const categoryDoc = await getDoc(doc(db, DESIGN_CATEGORIES_COLLECTION, categoryId));

    if (!categoryDoc.exists()) {
      console.log(`[designCategoryService] Category ${categoryId} not found`);
      return null;
    }

    const data = categoryDoc.data();
    return {
      ...data,
      createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toMillis() : data.createdAt,
      updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toMillis() : data.updatedAt,
      images: (data.images || []).map((img: any) => ({
        ...img,
        uploadedAt: img.uploadedAt instanceof Timestamp ? img.uploadedAt.toMillis() : img.uploadedAt,
      })),
    } as DesignCategory;
  } catch (error) {
    console.error('[designCategoryService] Error getting category:', error);
    throw error;
  }
}

/**
 * Update a design category name
 */
export async function updateDesignCategory(
  categoryId: string,
  name: string
): Promise<void> {
  try {
    console.log(`[designCategoryService] Updating category ${categoryId}`);

    await updateDoc(doc(db, DESIGN_CATEGORIES_COLLECTION, categoryId), {
      name,
      updatedAt: serverTimestamp(),
    });

    console.log(`[designCategoryService] Category ${categoryId} updated successfully`);
  } catch (error) {
    console.error('[designCategoryService] Error updating category:', error);
    throw error;
  }
}

/**
 * Delete a design category and all its images from storage
 */
export async function deleteDesignCategory(categoryId: string): Promise<void> {
  try {
    console.log(`[designCategoryService] Deleting category ${categoryId}`);

    // Get category to find images
    const category = await getDesignCategory(categoryId);

    if (category) {
      // Delete all images from storage
      for (const image of category.images) {
        try {
          const imageRef = ref(storage, image.storagePath);
          await deleteObject(imageRef);
          console.log(`[designCategoryService] Deleted image ${image.storagePath}`);
        } catch (err) {
          console.warn(`[designCategoryService] Could not delete image ${image.storagePath}:`, err);
        }
      }
    }

    // Delete category document
    await deleteDoc(doc(db, DESIGN_CATEGORIES_COLLECTION, categoryId));

    console.log(`[designCategoryService] Category ${categoryId} deleted successfully`);
  } catch (error) {
    console.error('[designCategoryService] Error deleting category:', error);
    throw error;
  }
}

/**
 * Upload an image to a category
 */
export async function uploadImageToCategory(
  categoryId: string,
  file: File,
  companyId: string
): Promise<DesignImage> {
  try {
    // Generate design code
    const designCode = await generateDesignCode(companyId);

    // Create unique filename
    const filename = `${designCode}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
    const storagePath = `designs/${companyId}/${categoryId}/${filename}`;
    const storageRef = ref(storage, storagePath);

    console.log(`[designCategoryService] Uploading image to ${storagePath} with code ${designCode}`);

    // Upload file
    await uploadBytes(storageRef, file);

    // Get download URL
    const url = await getDownloadURL(storageRef);

    // Create image record
    const imageRecord: DesignImage = {
      id: filename,
      designCode,
      name: file.name,
      url,
      storagePath,
      uploadedAt: Date.now(),
    };

    // Add to category document
    // Note: arrayUnion() doesn't support serverTimestamp(), so we use Date.now()
    const catRef = doc(db, DESIGN_CATEGORIES_COLLECTION, categoryId);
    await updateDoc(catRef, {
      images: arrayUnion(imageRecord),
      updatedAt: serverTimestamp(),
    });

    console.log(`[designCategoryService] Image ${filename} uploaded successfully`);
    return imageRecord;
  } catch (error) {
    console.error('[designCategoryService] Error uploading image:', error);
    throw error;
  }
}

/**
 * Delete an image from a category
 */
export async function deleteImageFromCategory(
  categoryId: string,
  image: DesignImage
): Promise<void> {
  try {
    console.log(`[designCategoryService] Deleting image ${image.id} from category ${categoryId}`);

    // Delete from storage
    try {
      const imageRef = ref(storage, image.storagePath);
      await deleteObject(imageRef);
    } catch (err) {
      console.warn(`[designCategoryService] Could not delete from storage:`, err);
    }

    // Remove from category document - need to get current images and filter
    const category = await getDesignCategory(categoryId);
    if (category) {
      const updatedImages = category.images.filter(img => img.id !== image.id);
      await updateDoc(doc(db, DESIGN_CATEGORIES_COLLECTION, categoryId), {
        images: updatedImages,
        updatedAt: serverTimestamp(),
      });
    }

    console.log(`[designCategoryService] Image ${image.id} deleted successfully`);
  } catch (error) {
    console.error('[designCategoryService] Error deleting image:', error);
    throw error;
  }
}

/**
 * Get images for a specific category
 */
export async function getImagesForCategory(categoryId: string): Promise<DesignImage[]> {
  try {
    const category = await getDesignCategory(categoryId);
    return category?.images || [];
  } catch (error) {
    console.error('[designCategoryService] Error getting images for category:', error);
    throw error;
  }
}
