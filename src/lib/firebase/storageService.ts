import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '@/lib/firebase';
import { compressImage, needsCompression, formatFileSize } from '@/lib/imageCompression';

/**
 * Upload image data URL to Firebase Storage with automatic compression
 * @param dataUrl - Base64 data URL of the image
 * @param path - Storage path (e.g., 'delivery-challans/DC001/image1.jpg')
 * @param compress - Whether to compress the image (default: true)
 * @returns Download URL of the uploaded image
 */
export async function uploadImageToStorage(
  dataUrl: string,
  path: string,
  compress: boolean = true
): Promise<string> {
  try {
    // Convert data URL to Blob
    const response = await fetch(dataUrl);
    let blob = await response.blob();

    // Compress image if enabled and file is large
    if (compress && needsCompression(blob)) {
      console.log(`[Storage] Compressing image: ${formatFileSize(blob.size)}`);
      const compressed = await compressImage(blob, {
        maxWidth: 1920,
        maxHeight: 1080,
        quality: 0.85,
        format: 'jpeg',
        maxSizeBytes: 500 * 1024, // 500KB max
      });
      console.log(`[Storage] Compressed: ${formatFileSize(compressed.originalSize)} → ${formatFileSize(compressed.compressedSize)}`);
      blob = compressed.blob;
    }

    // Create storage reference
    const storageRef = ref(storage, path);

    // Upload blob
    await uploadBytes(storageRef, blob, {
      contentType: 'image/jpeg',
    });

    // Get download URL
    const downloadURL = await getDownloadURL(storageRef);
    console.log('Image uploaded successfully:', downloadURL);

    return downloadURL;
  } catch (error) {
    console.error('Error uploading image to storage:', error);
    throw new Error('Failed to upload image');
  }
}

/**
 * Delete image from Firebase Storage
 * @param imageUrl - Full download URL or storage path
 */
export async function deleteImageFromStorage(imageUrl: string): Promise<void> {
  try {
    // Extract path from URL if full URL is provided
    let storagePath = imageUrl;

    if (imageUrl.includes('firebasestorage.googleapis.com')) {
      // Extract path from Firebase Storage URL
      const url = new URL(imageUrl);
      const pathMatch = url.pathname.match(/\/o\/(.+?)\?/);
      if (pathMatch) {
        storagePath = decodeURIComponent(pathMatch[1]);
      }
    }

    const storageRef = ref(storage, storagePath);
    await deleteObject(storageRef);
    console.log('Image deleted successfully:', storagePath);
  } catch (error) {
    console.error('Error deleting image from storage:', error);
    throw new Error('Failed to delete image');
  }
}

/**
 * Upload multiple images to Firebase Storage
 * @param dataUrls - Array of base64 data URLs
 * @param basePath - Base storage path (e.g., 'delivery-challans/DC001')
 * @returns Array of download URLs
 */
export async function uploadMultipleImages(
  dataUrls: string[],
  basePath: string
): Promise<string[]> {
  try {
    const uploadPromises = dataUrls.map((dataUrl, index) => {
      const fileName = `image_${Date.now()}_${index}.jpg`;
      const path = `${basePath}/${fileName}`;
      return uploadImageToStorage(dataUrl, path);
    });

    const downloadURLs = await Promise.all(uploadPromises);
    return downloadURLs;
  } catch (error) {
    console.error('Error uploading multiple images:', error);
    throw new Error('Failed to upload images');
  }
}
