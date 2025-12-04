import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import jsPDF from 'jspdf';

/**
 * Check if running inside a Capacitor native app
 */
export function isCapacitorNative(): boolean {
  try {
    return !!(
      typeof window !== 'undefined' &&
      (window as any).Capacitor &&
      (window as any).Capacitor.isNativePlatform &&
      (window as any).Capacitor.isNativePlatform()
    );
  } catch {
    return false;
  }
}

/**
 * Check if running on Android
 */
export function isAndroid(): boolean {
  try {
    return isCapacitorNative() && (window as any).Capacitor.getPlatform() === 'android';
  } catch {
    return false;
  }
}

/**
 * Check if running on iOS
 */
export function isIOS(): boolean {
  try {
    return isCapacitorNative() && (window as any).Capacitor.getPlatform() === 'ios';
  } catch {
    return false;
  }
}

/**
 * Convert jsPDF document to base64 string
 */
function getBase64FromPdf(doc: jsPDF): string {
  const dataUri = doc.output('datauristring');
  // Extract base64 data from data URI (format: "data:application/pdf;base64,...")
  const base64Data = dataUri.split(',')[1];
  return base64Data;
}

/**
 * Save PDF and share/open it on mobile, or trigger browser download on web
 * @param doc - jsPDF document instance
 * @param filename - Filename for the PDF
 * @returns Promise<boolean> - true if successful
 */
export async function savePdfMobile(doc: jsPDF, filename: string): Promise<boolean> {
  // Ensure filename has .pdf extension
  if (!filename.toLowerCase().endsWith('.pdf')) {
    filename = `${filename}.pdf`;
  }

  // Sanitize filename for file system
  const safeFilename = filename.replace(/[^a-zA-Z0-9_\-\.]/g, '_');

  if (isCapacitorNative()) {
    try {
      // Get PDF as base64
      const pdfBase64 = getBase64FromPdf(doc);
      
      // Save to device cache directory
      const result = await Filesystem.writeFile({
        path: safeFilename,
        data: pdfBase64,
        directory: Directory.Cache,
      });

      console.log('[PDF] File saved to:', result.uri);

      // Check if Share is available
      const canShare = await Share.canShare();
      
      if (canShare.value) {
        // Share the file (opens share dialog / PDF viewer)
        await Share.share({
          title: filename.replace('.pdf', ''),
          text: 'Here is your document',
          url: result.uri,
          dialogTitle: 'Save or Share PDF',
        });
      } else {
        // If sharing not available, try to open the file directly
        console.log('[PDF] Share not available, file saved to:', result.uri);
      }

      return true;
    } catch (error) {
      console.error('[PDF] Error saving/sharing PDF on mobile:', error);
      
      // Fallback: Try to open as data URI in a new window
      try {
        const pdfDataUri = doc.output('datauristring');
        // Try opening the data URI directly
        const link = document.createElement('a');
        link.href = pdfDataUri;
        link.download = safeFilename;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        return true;
      } catch (fallbackError) {
        console.error('[PDF] Fallback also failed:', fallbackError);
        throw new Error('Unable to save or open PDF on this device');
      }
    }
  } else {
    // Web browser - use standard jsPDF save
    try {
      doc.save(filename);
      return true;
    } catch (error) {
      console.error('[PDF] Error saving PDF in browser:', error);
      throw error;
    }
  }
}

/**
 * Share PDF directly without saving to permanent storage
 * @param doc - jsPDF document instance
 * @param filename - Filename for the PDF
 * @param title - Title for the share dialog
 */
export async function sharePdfMobile(
  doc: jsPDF, 
  filename: string, 
  title?: string
): Promise<boolean> {
  if (!filename.toLowerCase().endsWith('.pdf')) {
    filename = `${filename}.pdf`;
  }

  // Sanitize filename for file system
  const safeFilename = filename.replace(/[^a-zA-Z0-9_\-\.]/g, '_');

  if (isCapacitorNative()) {
    try {
      const pdfBase64 = getBase64FromPdf(doc);
      
      // Save to cache first
      const result = await Filesystem.writeFile({
        path: safeFilename,
        data: pdfBase64,
        directory: Directory.Cache,
      });

      // Share
      await Share.share({
        title: title || filename.replace('.pdf', ''),
        url: result.uri,
        dialogTitle: 'Share PDF',
      });

      return true;
    } catch (error) {
      console.error('[PDF] Error sharing PDF:', error);
      throw error;
    }
  } else {
    // Web - just download
    doc.save(filename);
    return true;
  }
}

/**
 * Save PDF to device Downloads folder (Android only)
 * Falls back to share dialog on iOS or if save fails
 */
export async function savePdfToDownloads(doc: jsPDF, filename: string): Promise<boolean> {
  if (!filename.toLowerCase().endsWith('.pdf')) {
    filename = `${filename}.pdf`;
  }

  const safeFilename = filename.replace(/[^a-zA-Z0-9_\-\.]/g, '_');

  if (isCapacitorNative()) {
    try {
      const pdfBase64 = getBase64FromPdf(doc);
      
      // On Android, try to save to Documents directory (accessible to user)
      if (isAndroid()) {
        try {
          const result = await Filesystem.writeFile({
            path: `Download/${safeFilename}`,
            data: pdfBase64,
            directory: Directory.ExternalStorage,
            recursive: true,
          });
          console.log('[PDF] Saved to Downloads:', result.uri);
          return true;
        } catch (downloadError) {
          console.log('[PDF] Could not save to Downloads, using share:', downloadError);
        }
      }

      // Fallback to share dialog
      return await sharePdfMobile(doc, filename);
    } catch (error) {
      console.error('[PDF] Error saving PDF to downloads:', error);
      throw error;
    }
  } else {
    // Web - just download
    doc.save(filename);
    return true;
  }
}

/**
 * Open PDF in a new window/tab (for printing/viewing on web)
 * On mobile, this will open the PDF viewer instead of sharing
 */
export async function openPdfForPrint(doc: jsPDF, filename: string): Promise<void> {
  if (isCapacitorNative()) {
    // On mobile, open PDF viewer instead of share dialog
    try {
      if (!filename.toLowerCase().endsWith('.pdf')) {
        filename = `${filename}.pdf`;
      }
      const safeFilename = filename.replace(/[^a-zA-Z0-9_\-\.]/g, '_');
      
      const pdfBase64 = getBase64FromPdf(doc);
      
      // Save to cache directory
      const result = await Filesystem.writeFile({
        path: safeFilename,
        data: pdfBase64,
        directory: Directory.Cache,
      });

      console.log('[PDF] File saved for viewing:', result.uri);

      // Open the PDF in the default viewer by navigating to it
      // This opens the file in a PDF viewer instead of the share dialog
      window.open(result.uri, '_system');
      
    } catch (error) {
      console.error('[PDF] Error opening PDF on mobile:', error);
      
      // Fallback: Try data URI
      try {
        const pdfDataUri = doc.output('datauristring');
        window.open(pdfDataUri, '_blank');
      } catch (fallbackError) {
        console.error('[PDF] Fallback also failed:', fallbackError);
        throw new Error('Unable to open PDF on this device');
      }
    }
  } else {
    // Web browser
    const pdfBlob = doc.output('blob');
    const pdfUrl = URL.createObjectURL(pdfBlob);
    const printWindow = window.open(pdfUrl, '_blank');
    
    if (printWindow) {
      printWindow.onload = () => {
        printWindow.print();
      };
    }
  }
}

/**
 * Get PDF as base64 data URI string
 */
export function getPdfAsDataUri(doc: jsPDF): string {
  return doc.output('datauristring');
}

/**
 * Get PDF as Blob
 */
export function getPdfAsBlob(doc: jsPDF): Blob {
  return doc.output('blob');
}

