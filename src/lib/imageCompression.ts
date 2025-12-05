/**
 * Image Compression Utility for Mobile App
 * Compresses images before upload to reduce bandwidth and storage costs
 * Mobile camera photos can be 5-10MB - this reduces them to <500KB
 */

export interface CompressionOptions {
  /** Maximum width in pixels (default: 1920) */
  maxWidth?: number;
  /** Maximum height in pixels (default: 1080) */
  maxHeight?: number;
  /** JPEG quality 0-1 (default: 0.8) */
  quality?: number;
  /** Output format (default: 'jpeg') */
  format?: 'jpeg' | 'png' | 'webp';
  /** Maximum file size in bytes (default: 500KB) */
  maxSizeBytes?: number;
}

export interface CompressionResult {
  /** Compressed image as Blob */
  blob: Blob;
  /** Compressed image as base64 data URL */
  dataUrl: string;
  /** Original file size in bytes */
  originalSize: number;
  /** Compressed file size in bytes */
  compressedSize: number;
  /** Compression ratio (e.g., 0.2 = 80% reduction) */
  compressionRatio: number;
  /** Final dimensions */
  width: number;
  height: number;
}

const DEFAULT_OPTIONS: Required<CompressionOptions> = {
  maxWidth: 1920,
  maxHeight: 1080,
  quality: 0.8,
  format: 'jpeg',
  maxSizeBytes: 500 * 1024, // 500KB
};

/**
 * Load an image from a File or Blob
 */
function loadImage(file: File | Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(img.src);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      reject(new Error('Failed to load image'));
    };
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Calculate new dimensions while maintaining aspect ratio
 */
function calculateDimensions(
  originalWidth: number,
  originalHeight: number,
  maxWidth: number,
  maxHeight: number
): { width: number; height: number } {
  let width = originalWidth;
  let height = originalHeight;

  // Calculate aspect ratio
  const aspectRatio = width / height;

  // Scale down if exceeds max dimensions
  if (width > maxWidth) {
    width = maxWidth;
    height = width / aspectRatio;
  }

  if (height > maxHeight) {
    height = maxHeight;
    width = height * aspectRatio;
  }

  return {
    width: Math.round(width),
    height: Math.round(height),
  };
}

/**
 * Convert canvas to Blob with specified format and quality
 */
function canvasToBlob(
  canvas: HTMLCanvasElement,
  format: string,
  quality: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to convert canvas to blob'));
        }
      },
      `image/${format}`,
      quality
    );
  });
}

/**
 * Compress a single image file
 * @param file - Image file to compress
 * @param options - Compression options
 * @returns Compressed image data
 */
export async function compressImage(
  file: File | Blob,
  options: CompressionOptions = {}
): Promise<CompressionResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const originalSize = file.size;

  // Load the image
  const img = await loadImage(file);

  // Calculate new dimensions
  const { width, height } = calculateDimensions(
    img.naturalWidth,
    img.naturalHeight,
    opts.maxWidth,
    opts.maxHeight
  );

  // Create canvas for compression
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }

  // Draw image on canvas (this also resizes it)
  ctx.drawImage(img, 0, 0, width, height);

  // Try compression with decreasing quality until target size is met
  let quality = opts.quality;
  let blob: Blob;
  let attempts = 0;
  const maxAttempts = 5;

  do {
    blob = await canvasToBlob(canvas, opts.format, quality);

    // If still too large, reduce quality
    if (blob.size > opts.maxSizeBytes && attempts < maxAttempts) {
      quality *= 0.8;
      attempts++;
    } else {
      break;
    }
  } while (blob.size > opts.maxSizeBytes);

  // Generate data URL
  const dataUrl = canvas.toDataURL(`image/${opts.format}`, quality);

  return {
    blob,
    dataUrl,
    originalSize,
    compressedSize: blob.size,
    compressionRatio: blob.size / originalSize,
    width,
    height,
  };
}

/**
 * Compress multiple images in parallel
 * @param files - Array of image files
 * @param options - Compression options
 * @returns Array of compression results
 */
export async function compressImages(
  files: (File | Blob)[],
  options: CompressionOptions = {}
): Promise<CompressionResult[]> {
  return Promise.all(files.map((file) => compressImage(file, options)));
}

/**
 * Compress image from data URL
 * @param dataUrl - Base64 data URL
 * @param options - Compression options
 * @returns Compressed image data
 */
export async function compressDataUrl(
  dataUrl: string,
  options: CompressionOptions = {}
): Promise<CompressionResult> {
  // Convert data URL to Blob
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  return compressImage(blob, options);
}

/**
 * Check if a file needs compression
 * @param file - File to check
 * @param maxSizeBytes - Maximum size threshold (default: 500KB)
 * @returns true if file should be compressed
 */
export function needsCompression(file: File | Blob, maxSizeBytes: number = 500 * 1024): boolean {
  return file.size > maxSizeBytes;
}

/**
 * Get human-readable file size
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Compress image for thumbnail (smaller, lower quality)
 * Good for list views and previews
 */
export async function createThumbnail(
  file: File | Blob,
  maxSize: number = 200
): Promise<CompressionResult> {
  return compressImage(file, {
    maxWidth: maxSize,
    maxHeight: maxSize,
    quality: 0.7,
    format: 'jpeg',
    maxSizeBytes: 50 * 1024, // 50KB for thumbnails
  });
}

/**
 * Compress image specifically for Firebase Storage upload
 * Optimized settings for mobile app
 */
export async function compressForUpload(file: File | Blob): Promise<Blob> {
  // Skip compression for small files
  if (!needsCompression(file)) {
    return file;
  }

  const result = await compressImage(file, {
    maxWidth: 1920,
    maxHeight: 1080,
    quality: 0.85,
    format: 'jpeg',
    maxSizeBytes: 500 * 1024,
  });

  console.log(
    `[Image Compression] ${formatFileSize(result.originalSize)} → ${formatFileSize(result.compressedSize)} ` +
    `(${Math.round((1 - result.compressionRatio) * 100)}% reduction)`
  );

  return result.blob;
}

/**
 * Convert File to compressed Blob with progress tracking
 * Useful for showing upload progress
 */
export async function compressWithProgress(
  file: File,
  options: CompressionOptions = {},
  onProgress?: (progress: number) => void
): Promise<CompressionResult> {
  onProgress?.(10); // Loading started

  const img = await loadImage(file);
  onProgress?.(30); // Image loaded

  const opts = { ...DEFAULT_OPTIONS, ...options };
  const { width, height } = calculateDimensions(
    img.naturalWidth,
    img.naturalHeight,
    opts.maxWidth,
    opts.maxHeight
  );

  onProgress?.(50); // Dimensions calculated

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0, width, height);

  onProgress?.(70); // Canvas drawn

  const blob = await canvasToBlob(canvas, opts.format, opts.quality);
  const dataUrl = canvas.toDataURL(`image/${opts.format}`, opts.quality);

  onProgress?.(100); // Complete

  return {
    blob,
    dataUrl,
    originalSize: file.size,
    compressedSize: blob.size,
    compressionRatio: blob.size / file.size,
    width,
    height,
  };
}
