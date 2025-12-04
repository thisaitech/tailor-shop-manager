import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function sendWhatsAppMessage(phone: string, message: string) {
  const formattedPhone = phone.replace(/\D/g, '');
  const encodedMessage = encodeURIComponent(message);
  
  // Check if running on mobile (Capacitor)
  const isCapacitor = !!(
    typeof window !== 'undefined' &&
    (window as any).Capacitor &&
    (window as any).Capacitor.isNativePlatform &&
    (window as any).Capacitor.isNativePlatform()
  );
  
  if (isCapacitor) {
    // For mobile apps, use intent URL for Android or whatsapp:// for iOS
    const isAndroid = (window as any).Capacitor?.getPlatform() === 'android';
    
    if (isAndroid) {
      // Android: Use intent URL to open WhatsApp app directly
      const intentUrl = `intent://send?phone=${formattedPhone}&text=${encodedMessage}#Intent;scheme=whatsapp;package=com.whatsapp;end`;
      window.location.href = intentUrl;
    } else {
      // iOS: Use whatsapp:// URL scheme
      const whatsappUrl = `whatsapp://send?phone=${formattedPhone}&text=${encodedMessage}`;
      window.location.href = whatsappUrl;
    }
  } else {
    // Use api.whatsapp.com - prefers mobile app over web
    const whatsappUrl = `https://api.whatsapp.com/send?phone=${formattedPhone}&text=${encodedMessage}`;
    window.location.href = whatsappUrl;
  }
}
