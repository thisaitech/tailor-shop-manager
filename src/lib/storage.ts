/**
 * Upload a photo (convert to base64 data URL)
 * @param file - File to upload
 * @param path - Storage path (e.g., 'customers/photos', 'orders/fabric')
 * @returns Data URL of the file
 */
export async function uploadPhoto(file: File, path: string): Promise<string> {
  try {
    return await fileToDataUrl(file);
  } catch (error) {
    console.error('Error uploading photo:', error);
    throw error;
  }
}

/**
 * Upload multiple photos
 * @param files - Array of files to upload
 * @param path - Storage path
 * @returns Array of data URLs
 */
export async function uploadPhotos(files: File[], path: string): Promise<string[]> {
  try {
    const uploadPromises = files.map((file) => uploadPhoto(file, path));
    return await Promise.all(uploadPromises);
  } catch (error) {
    console.error('Error uploading photos:', error);
    throw error;
  }
}

/**
 * Delete a photo (no-op for data URLs)
 * @param url - Data URL of the photo
 */
export async function deletePhoto(url: string): Promise<void> {
  return Promise.resolve();
}

/**
 * Convert File to base64 data URL
 * @param file - File to convert
 * @returns Promise with data URL
 */
function fileToDataUrl(file: File): Promise<string> {
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
