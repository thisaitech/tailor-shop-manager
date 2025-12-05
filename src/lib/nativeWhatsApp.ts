/**
 * Native WhatsApp Integration for Mobile Apps
 * Opens WhatsApp directly to a specific chat with a pre-filled message
 * NO WebView navigation - uses native Android intents
 */

/**
 * Format phone number for WhatsApp
 * Removes all non-digits and adds India country code if not present
 */
function formatPhoneNumber(phone: string): string {
  const cleanPhone = phone.replace(/[^0-9]/g, '');
  // Add India country code if not present
  if (cleanPhone.startsWith('91') && cleanPhone.length >= 12) {
    return cleanPhone;
  }
  return `91${cleanPhone}`;
}

/**
 * Check if running in Capacitor native app
 */
function isNativeApp(): boolean {
  return !!(
    typeof window !== 'undefined' &&
    (window as any).Capacitor &&
    (window as any).Capacitor.isNativePlatform &&
    (window as any).Capacitor.isNativePlatform()
  );
}

/**
 * Open WhatsApp chat with pre-filled message
 * Uses native Android intent - DOES NOT navigate WebView
 */
export async function openWhatsAppChat(phone: string, message: string): Promise<void> {
  const formattedPhone = formatPhoneNumber(phone);
  const encodedMessage = encodeURIComponent(message);
  
  if (isNativeApp()) {
    try {
      // Import Capacitor App plugin
      const { App } = await import('@capacitor/app');
      
      // Create WhatsApp URL - will be opened by Android system
      const whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodedMessage}`;
      
      // Open URL externally using Capacitor App plugin
      // This launches the URL outside the WebView
      await App.openUrl({ url: whatsappUrl });
      
      console.log('[WhatsApp] Opened chat successfully');
    } catch (error) {
      console.error('[WhatsApp] Failed to open chat:', error);
      throw new Error('Failed to open WhatsApp. Please ensure WhatsApp is installed.');
    }
  } else {
    // Web fallback - open in new tab
    const whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodedMessage}`;
    window.open(whatsappUrl, '_blank');
  }
}


