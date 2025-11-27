import { storage } from './firebase';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

/**
 * Upload a photo to Firebase Storage
 * @param file - File to upload
 * @param path - Storage path (e.g., 'customers/photos', 'orders/designs')
 * @returns Download URL of the uploaded file
 */
export async function uploadPhoto(file: File, path: string): Promise<string> {
  try {
    // Generate unique filename
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 9);
    const filename = `${timestamp}_${randomString}_${file.name}`;
    const storageRef = ref(storage, `${path}/${filename}`);

    console.log(`[Storage] Uploading ${file.name} to ${path}/${filename}`);

    // Upload file
    const snapshot = await uploadBytes(storageRef, file);
    console.log(`[Storage] Upload successful:`, snapshot.metadata.fullPath);

    // Get download URL
    const downloadURL = await getDownloadURL(snapshot.ref);
    console.log(`[Storage] Download URL:`, downloadURL);

    return downloadURL;
  } catch (error) {
    console.error('[Storage] Error uploading photo:', error);
    throw error;
  }
}

/**
 * Upload multiple photos to Firebase Storage
 * @param files - Array of files to upload
 * @param path - Storage path
 * @returns Array of download URLs
 */
export async function uploadPhotos(files: File[], path: string): Promise<string[]> {
  try {
    const uploadPromises = files.map((file) => uploadPhoto(file, path));
    return await Promise.all(uploadPromises);
  } catch (error) {
    console.error('[Storage] Error uploading photos:', error);
    throw error;
  }
}

/**
 * Delete a photo from Firebase Storage
 * @param url - Download URL of the photo
 */
export async function deletePhoto(url: string): Promise<void> {
  try {
    // Extract storage path from URL
    const storageRef = ref(storage, url);
    await deleteObject(storageRef);
    console.log('[Storage] Photo deleted successfully');
  } catch (error) {
    console.error('[Storage] Error deleting photo:', error);
    // Don't throw error if file doesn't exist
    if ((error as any).code !== 'storage/object-not-found') {
      throw error;
    }
  }
}

/**
 * Convert File to base64 data URL (for preview purposes)
 * @param file - File to convert
 * @returns Promise with data URL
 */
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Convert base64 data URL to File object
 * @param dataUrl - Base64 data URL
 * @param filename - Name for the file
 * @returns File object
 */
export function dataUrlToFile(dataUrl: string, filename: string): File {
  const arr = dataUrl.split(',');
  const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  
  return new File([u8arr], filename, { type: mime });
}
