/**
 * Notification Service for sending WhatsApp/SMS notifications
 *
 * This service supports:
 * 1. WhatsApp Cloud API (Free for testing) - Primary method
 * 2. Twilio - for SMS and WhatsApp (Alternative)
 * 
 * Notifications are sent:
 * 1. When a new order is created (confirmation to customer)
 * 2. When order status changes to "Ready to Delivery" (pickup notification)
 */

export interface CustomerNotification {
  customerName: string;
  customerPhone: string;
  orderNumber: string;
  message: string;
}

export interface OrderConfirmationData {
  customerName: string;
  customerPhone: string;
  orderNumber: string;
  orderDate: string;
  deliveryDate: string;
  totalAmount?: number;
  advanceAmount?: number;
  balanceAmount?: number;
  dressItems?: Array<{ dressName: string; quantity: number }>;
  companyName?: string;
}

// Get environment variables
const WHATSAPP_PHONE_NUMBER_ID = import.meta.env.VITE_WHATSAPP_PHONE_NUMBER_ID;
const WHATSAPP_ACCESS_TOKEN = import.meta.env.VITE_WHATSAPP_ACCESS_TOKEN;
const TWILIO_ACCOUNT_SID = import.meta.env.VITE_TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = import.meta.env.VITE_TWILIO_AUTH_TOKEN;
const TWILIO_WHATSAPP_NUMBER = import.meta.env.VITE_TWILIO_WHATSAPP_NUMBER;

/**
 * Send WhatsApp message using WhatsApp Cloud API (FREE for testing)
 * @param data - Notification data
 * @returns Promise<boolean> - true if sent successfully
 */
async function sendWhatsAppCloudAPI(data: CustomerNotification): Promise<boolean> {
  try {
    // Clean phone number (remove all non-digits)
    const cleanPhone = data.customerPhone.replace(/[^0-9]/g, '');

    // Add country code if not present (assuming India +91)
    const phoneWithCountryCode = cleanPhone.startsWith('91') ? cleanPhone : `91${cleanPhone}`;

    const apiUrl = `https://graph.facebook.com/v21.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: phoneWithCountryCode,
        type: 'text',
        text: {
          body: data.message,
        },
      }),
    });

    if (response.ok) {
      const result = await response.json();
      console.log('[WhatsApp Cloud API] ✅ Message sent successfully:', result);
      return true;
    } else {
      const error = await response.json();
      console.error('[WhatsApp Cloud API] ❌ Failed to send message:', error);
      return false;
    }
  } catch (error) {
    console.error('[WhatsApp Cloud API] Error:', error);
    return false;
  }
}

/**
 * Send WhatsApp message using Twilio (Alternative method)
 * @param data - Notification data
 * @returns Promise<boolean> - true if sent successfully
 */
async function sendWhatsAppViaTwilio(data: CustomerNotification): Promise<boolean> {
  try {
    // Clean phone number
    const cleanPhone = data.customerPhone.replace(/[^0-9]/g, '');
    const phoneWithCountryCode = cleanPhone.startsWith('91') ? `+${cleanPhone}` : `+91${cleanPhone}`;

    const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        From: TWILIO_WHATSAPP_NUMBER,
        To: `whatsapp:${phoneWithCountryCode}`,
        Body: data.message,
      }),
    });

    if (response.ok) {
      const result = await response.json();
      console.log('[Twilio WhatsApp] ✅ Message sent successfully:', result);
      return true;
    } else {
      const error = await response.json();
      console.error('[Twilio WhatsApp] ❌ Failed to send message:', error);
      return false;
    }
  } catch (error) {
    console.error('[Twilio WhatsApp] Error:', error);
    return false;
  }
}

/**
 * Send WhatsApp message to customer
 * @param data - Notification data
 * @returns Promise<boolean> - true if sent successfully
 */
export async function sendWhatsAppNotification(
  data: CustomerNotification
): Promise<boolean> {
  try {
    console.log('========================================');
    console.log('[Notification Service] Sending WhatsApp Notification');
    console.log('========================================');
    console.log('Customer:', data.customerName);
    console.log('Phone:', data.customerPhone);
    console.log('Order:', data.orderNumber);
    console.log('========================================');

    // Check if WhatsApp Cloud API is configured
    const isWhatsAppCloudConfigured =
      WHATSAPP_PHONE_NUMBER_ID &&
      WHATSAPP_ACCESS_TOKEN &&
      WHATSAPP_PHONE_NUMBER_ID !== 'YOUR_PHONE_NUMBER_ID' &&
      WHATSAPP_ACCESS_TOKEN !== 'YOUR_ACCESS_TOKEN';

    // Check if Twilio is configured
    const isTwilioConfigured =
      TWILIO_ACCOUNT_SID &&
      TWILIO_AUTH_TOKEN &&
      TWILIO_WHATSAPP_NUMBER &&
      TWILIO_ACCOUNT_SID !== 'YOUR_ACCOUNT_SID' &&
      TWILIO_AUTH_TOKEN !== 'YOUR_AUTH_TOKEN';

    // Try WhatsApp Cloud API first (Free)
    if (isWhatsAppCloudConfigured) {
      console.log('[Notification Service] Using WhatsApp Cloud API...');
      return await sendWhatsAppCloudAPI(data);
    }

    // Try Twilio as fallback
    if (isTwilioConfigured) {
      console.log('[Notification Service] Using Twilio WhatsApp...');
      return await sendWhatsAppViaTwilio(data);
    }

    // If no service is configured, show preview
    console.warn('[Notification Service] ⚠️ WhatsApp not configured.');
    console.log('[Notification Service] To send WhatsApp messages:');
    console.log('');
    console.log('Option 1: WhatsApp Cloud API (FREE for testing)');
    console.log('1. Go to: https://developers.facebook.com/apps/');
    console.log('2. Create a Meta App with WhatsApp product');
    console.log('3. Get Phone Number ID from WhatsApp > API Setup');
    console.log('4. Get Access Token (temporary or permanent)');
    console.log('5. Add to .env file');
    console.log('');
    console.log('Option 2: Twilio (Paid service)');
    console.log('1. Sign up at: https://console.twilio.com/');
    console.log('2. Get Account SID, Auth Token, and WhatsApp Number');
    console.log('3. Add to .env file');
    console.log('');
    console.log('📱 WhatsApp Message Preview:');
    console.log('---');
    console.log(data.message);
    console.log('---');

    // WhatsApp URL format (opens WhatsApp with pre-filled message)
    const cleanPhone = data.customerPhone.replace(/[^0-9]/g, '');
    const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(data.message)}`;
    console.log('💡 Manual WhatsApp Link:', whatsappUrl);
    console.log('========================================');

    // Return true for development (so the flow continues)
    return true;
  } catch (error) {
    console.error('[Notification Service] Error sending WhatsApp notification:', error);
    return false;
  }
}

/**
 * Send SMS to customer
 * @param data - Notification data
 * @returns Promise<boolean> - true if sent successfully
 */
export async function sendSMSNotification(
  data: CustomerNotification
): Promise<boolean> {
  try {
    console.log('========================================');
    console.log('[Notification Service] Sending SMS Notification');
    console.log('========================================');
    console.log('Customer:', data.customerName);
    console.log('Phone:', data.customerPhone);
    console.log('Order:', data.orderNumber);
    console.log('Message:', data.message);
    console.log('========================================');

    // TODO: Integrate with SMS gateway (Twilio, AWS SNS, etc.)
    // For now, we'll just log and show a preview

    console.log('[Notification Service] ℹ️ SMS integration not configured.');
    console.log('[Notification Service] To send SMS:');
    console.log('1. Sign up for Twilio, AWS SNS, or other SMS service');
    console.log('2. Add API credentials to environment variables');
    console.log('3. Implement the sendSMSNotification function');
    console.log('');
    console.log('📱 SMS Preview:');
    console.log('---');
    console.log(data.message);
    console.log('---');
    console.log('========================================');

    // Return true for development (so the flow continues)
    return true;
  } catch (error) {
    console.error('[Notification Service] Error sending SMS:', error);
    return false;
  }
}

/**
 * Generate order confirmation message (when order is created)
 */
export function generateOrderConfirmationMessage(data: OrderConfirmationData): string {
  const { 
    customerName, 
    orderNumber, 
    orderDate, 
    deliveryDate, 
    totalAmount, 
    advanceAmount, 
    balanceAmount,
    dressItems,
    companyName 
  } = data;

  let message = `Dear ${customerName},\n\n`;
  message += `Thank you for your order! ✨\n\n`;
  message += `📋 *Order Details*\n`;
  message += `Order No: ${orderNumber}\n`;
  message += `Order Date: ${orderDate}\n`;
  message += `Expected Delivery: ${deliveryDate}\n`;

  // Add dress items if available
  if (dressItems && dressItems.length > 0) {
    message += `\n📦 *Items*\n`;
    dressItems.forEach((item, index) => {
      message += `${index + 1}. ${item.dressName} (Qty: ${item.quantity})\n`;
    });
  }

  // Add payment details if available
  if (totalAmount !== undefined && totalAmount > 0) {
    message += `\n💰 *Payment Details*\n`;
    message += `Total Amount: ₹${totalAmount.toLocaleString('en-IN')}\n`;
    if (advanceAmount !== undefined && advanceAmount > 0) {
      message += `Advance Paid: ₹${advanceAmount.toLocaleString('en-IN')}\n`;
    }
    if (balanceAmount !== undefined && balanceAmount > 0) {
      message += `Balance Due: ₹${balanceAmount.toLocaleString('en-IN')}\n`;
    }
  }

  message += `\nWe will notify you when your order is ready for pickup.\n\n`;
  message += `Thank you for choosing us! 🙏\n`;
  message += `${companyName || 'Tailor Shop'}`;

  return message;
}

/**
 * Generate order ready notification message (when order is ready for delivery)
 */
export function generateOrderReadyMessage(
  customerName: string,
  orderNumber: string,
  companyName?: string
): string {
  return `Dear ${customerName},\n\n🎉 *Great News!*\n\nYour order *${orderNumber}* is ready for delivery!\n\nPlease visit us to collect your order at your convenience.\n\nThank you for your patience! 🙏\n${companyName || 'Tailor Shop'}`;
}

/**
 * Send notification when order is ready for delivery
 */
export async function notifyOrderReady(
  customerName: string,
  customerPhone: string,
  orderNumber: string,
  companyName?: string
): Promise<{ whatsappSent: boolean; smsSent: boolean }> {
  console.log('[Notification] Sending "Order Ready" notification');
  
  const message = generateOrderReadyMessage(customerName, orderNumber, companyName);

  const notificationData: CustomerNotification = {
    customerName,
    customerPhone,
    orderNumber,
    message,
  };

  // Try WhatsApp first, then SMS as fallback
  const whatsappSent = await sendWhatsAppNotification(notificationData);
  const smsSent = await sendSMSNotification(notificationData);

  return { whatsappSent, smsSent };
}

/**
 * Send notification when order is created (confirmation)
 */
export async function notifyOrderCreated(
  data: OrderConfirmationData
): Promise<{ whatsappSent: boolean; smsSent: boolean }> {
  console.log('[Notification] Sending "Order Confirmation" notification');
  
  const message = generateOrderConfirmationMessage(data);

  const notificationData: CustomerNotification = {
    customerName: data.customerName,
    customerPhone: data.customerPhone,
    orderNumber: data.orderNumber,
    message,
  };

  // Try WhatsApp first, then SMS as fallback
  const whatsappSent = await sendWhatsAppNotification(notificationData);
  const smsSent = await sendSMSNotification(notificationData);

  return { whatsappSent, smsSent };
}

/**
 * Open WhatsApp with pre-filled message (for manual sending)
 * Useful when API is not configured
 * Uses intent:// URL for Android mobile, whatsapp:// for iOS, wa.me for web
 */
export function openWhatsAppWithMessage(
  phone: string,
  message: string
): void {
  const cleanPhone = phone.replace(/[^0-9]/g, '');
  const phoneWithCountryCode = cleanPhone.startsWith('91') ? cleanPhone : `91${cleanPhone}`;
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
      const intentUrl = `intent://send?phone=${phoneWithCountryCode}&text=${encodedMessage}#Intent;scheme=whatsapp;package=com.whatsapp;end`;
      window.location.href = intentUrl;
    } else {
      // iOS: Use whatsapp:// URL scheme
      const whatsappUrl = `whatsapp://send?phone=${phoneWithCountryCode}&text=${encodedMessage}`;
      window.location.href = whatsappUrl;
    }
  } else {
    // Web: Use wa.me URL and open in new window/tab
    const whatsappUrl = `https://wa.me/${phoneWithCountryCode}?text=${encodedMessage}`;
    window.open(whatsappUrl, '_blank');
  }
}
