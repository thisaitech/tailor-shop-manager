import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export async function sendWhatsAppMessage(phone: string, message: string) {
  // Clean phone number - remove all non-digits
  let formattedPhone = phone.replace(/\D/g, '');
  
  // Add country code if not present (assuming India +91)
  if (!formattedPhone.startsWith('91') && formattedPhone.length === 10) {
    formattedPhone = `91${formattedPhone}`;
  }
  
  // Check if running in Capacitor (Android)
  const isCapacitor = !!(
    typeof window !== 'undefined' &&
    (window as any).Capacitor &&
    (window as any).Capacitor.isNativePlatform &&
    (window as any).Capacitor.isNativePlatform()
  );
  
  if (isCapacitor) {
    // Use Share plugin - safest approach, opens native share dialog
    // User can select WhatsApp from the list
    try {
      const { Share } = await import('@capacitor/share');
      await Share.share({
        title: 'Order Details',
        text: message,
        dialogTitle: 'Share to WhatsApp',
      });
    } catch (error) {
      console.error('[WhatsApp] Share error:', error);
      // Don't fallback to window.open - it causes issues
    }
  } else {
    // Web - open in new tab
    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/${formattedPhone}?text=${encodedMessage}`, '_blank');
  }
}
