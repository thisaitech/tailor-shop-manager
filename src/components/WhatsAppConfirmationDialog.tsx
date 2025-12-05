import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { WhatsappLogo, PaperPlaneTilt, X } from '@phosphor-icons/react';

// Check if running on native platform using Capacitor
const isNativePlatform = (): boolean => {
  try {
    // Check for Capacitor on window object (set by Capacitor runtime)
    // @ts-ignore - Capacitor types
    return typeof window !== 'undefined' && window.Capacitor?.isNativePlatform?.() === true;
  } catch {
    return false;
  }
};

// Open URL using Capacitor's bridge (for native platforms)
const openUrlNative = async (url: string): Promise<boolean> => {
  try {
    // Use Capacitor's Plugins bridge directly to avoid import issues
    // @ts-ignore - Capacitor runtime
    const Plugins = window.Capacitor?.Plugins;
    if (Plugins?.App?.openUrl) {
      await Plugins.App.openUrl({ url });
      return true;
    }
    // Fallback: Try using Browser plugin if App plugin is not available
    if (Plugins?.Browser?.open) {
      await Plugins.Browser.open({ url });
      return true;
    }
    return false;
  } catch (error) {
    console.warn('[WhatsApp] Native openUrl failed:', error);
    return false;
  }
};

export interface WhatsAppMessageData {
  customerName: string;
  customerPhone: string;
  message: string;
}

interface WhatsAppConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  messageData: WhatsAppMessageData;
  onSend: () => void;
  onSkip: () => void;
  sendButtonText?: string;
  skipButtonText?: string;
}

/**
 * Format phone number for WhatsApp URL
 * Removes all non-digits and adds India country code if not present
 */
function formatPhoneForWhatsApp(phone: string): string {
  if (!phone) return '';
  const cleanPhone = phone.replace(/[^0-9]/g, '');
  // Add India country code if not present
  if (cleanPhone.startsWith('91') && cleanPhone.length >= 12) {
    return cleanPhone;
  }
  return `91${cleanPhone}`;
}

/**
 * Open WhatsApp with pre-filled message
 * Works on both web and mobile (Capacitor) platforms
 */
async function openWhatsApp(phone: string, message: string): Promise<void> {
  try {
    const formattedPhone = formatPhoneForWhatsApp(phone);
    if (!formattedPhone) {
      console.error('[WhatsApp] Invalid phone number');
      return;
    }

    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodedMessage}`;

    // Check if running on native mobile platform
    if (isNativePlatform()) {
      // Use WhatsApp deep link for mobile - this opens WhatsApp app directly
      const whatsappDeepLink = `whatsapp://send?phone=${formattedPhone}&text=${encodedMessage}`;

      // Try deep link first
      const deepLinkOpened = await openUrlNative(whatsappDeepLink);
      if (deepLinkOpened) {
        console.log('[WhatsApp] Opened via deep link on mobile');
        return;
      }

      // Fallback to wa.me URL on native
      const urlOpened = await openUrlNative(whatsappUrl);
      if (urlOpened) {
        console.log('[WhatsApp] Opened via wa.me URL on mobile');
        return;
      }

      // Final fallback - window.open
      window.open(whatsappUrl, '_blank');
      console.log('[WhatsApp] Opened via window.open fallback on mobile');
    } else {
      // Web platform - use standard wa.me URL
      window.open(whatsappUrl, '_blank');
      console.log('[WhatsApp] Opened via wa.me URL on web');
    }
  } catch (error) {
    console.error('[WhatsApp] Error opening WhatsApp:', error);
    // Last resort fallback - try standard window.open
    try {
      const formattedPhone = formatPhoneForWhatsApp(phone);
      const encodedMessage = encodeURIComponent(message);
      const whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodedMessage}`;
      window.open(whatsappUrl, '_blank');
    } catch (fallbackError) {
      console.error('[WhatsApp] Fallback also failed:', fallbackError);
    }
  }
}

export function WhatsAppConfirmationDialog({
  open,
  onOpenChange,
  title,
  description,
  messageData,
  onSend,
  onSkip,
  sendButtonText = 'Send via WhatsApp',
  skipButtonText = 'Skip',
}: WhatsAppConfirmationDialogProps) {
  const [message, setMessage] = useState(messageData.message);

  // Update message when messageData changes
  useEffect(() => {
    setMessage(messageData.message);
  }, [messageData.message]);

  const handleSend = async () => {
    try {
      await openWhatsApp(messageData.customerPhone, message);
    } catch (error) {
      console.error('[WhatsAppDialog] Error sending:', error);
    }
    onSend();
  };

  const handleSkip = () => {
    onSkip();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <WhatsappLogo size={24} weight="fill" className="text-green-500" />
            {title}
          </DialogTitle>
          {description && (
            <DialogDescription>{description}</DialogDescription>
          )}
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Customer Info */}
          <div className="bg-muted/50 rounded-lg p-3 space-y-1">
            <p className="text-sm">
              <span className="font-medium">Customer:</span> {messageData.customerName}
            </p>
            <p className="text-sm">
              <span className="font-medium">Phone:</span> {messageData.customerPhone}
            </p>
          </div>

          {/* Editable Message */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Message Preview</label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={10}
              className="resize-none text-sm font-mono"
              placeholder="WhatsApp message..."
            />
            <p className="text-xs text-muted-foreground">
              You can edit the message before sending
            </p>
          </div>
        </div>

        <DialogFooter className="flex gap-2 sm:gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleSkip}
            className="flex-1 sm:flex-none"
          >
            <X size={16} className="mr-1" />
            {skipButtonText}
          </Button>
          <Button
            type="button"
            onClick={handleSend}
            className="flex-1 sm:flex-none bg-green-600 hover:bg-green-700 text-white"
          >
            <PaperPlaneTilt size={16} className="mr-1" />
            {sendButtonText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================
// Message Generation Helpers
// ============================================

// Measurement type for WhatsApp message
export interface MeasurementData {
  garmentType: string;
  measurements: Record<string, number | string | undefined>;
}

export interface OrderConfirmationMessageData {
  customerName: string;
  orderNumber: string;
  orderDate: string;
  deliveryDate: string;
  totalAmount?: number;
  advanceAmount?: number;
  balanceAmount?: number;
  dressItems?: Array<{ dressName: string; quantity: number }>;
  garmentTypes?: string[]; // e.g., ['Shirt', 'Pant']
  measurements?: MeasurementData[]; // Measurements for each garment
  companyName?: string;
  orderCategory?: string; // Men/Women/Kids
}

// Measurement field labels for display
const MEASUREMENT_LABELS: Record<string, string> = {
  length: 'Length',
  shoulder: 'Shoulder',
  sleeveType: 'Sleeve Type',
  sleeveLength: 'Sleeve Length',
  sleeveLoose: 'Sleeve Loose',
  body: 'Body',
  waist: 'Waist',
  neck: 'Neck',
  bodyLooseFront: 'Body Loose (Front)',
  bodyLooseBack: 'Body Loose (Back)',
  pocket: 'Pocket',
  bottomCut: 'Bottom Cut',
  chest: 'Chest',
  kneeLength: 'Knee Length',
  seat: 'Seat',
  fly: 'Fly (Zip)',
  fork: 'Fork',
  thighLoose: 'Thigh Loose',
  kneeLoose: 'Knee Loose',
  bottom: 'Bottom',
  neckDepthFront: 'Neck Depth (Front)',
  neckDepthBack: 'Neck Depth (Back)',
  armhole: 'Armhole',
  halfSleeve: 'Half Sleeve',
  fullSleeve: 'Full Sleeve',
  bust: 'Bust',
  hip: 'Hip',
};

/**
 * Format measurements for display in WhatsApp message
 */
function formatMeasurements(measurements: Record<string, number | string | undefined>): string {
  const entries = Object.entries(measurements)
    .filter(([key, value]) => value !== undefined && value !== null && value !== '' && value !== 0 && key !== 'options' && key !== 'specialNote')
    .map(([key, value]) => {
      const label = MEASUREMENT_LABELS[key] || key.replace(/([A-Z])/g, ' $1').trim();
      if (typeof value === 'number') {
        return `  • ${label}: ${value}"`;
      }
      return `  • ${label}: ${value}`;
    });
  return entries.join('\n');
}

/**
 * Generate order confirmation message for WhatsApp
 */
export function generateOrderConfirmationMessage(data: OrderConfirmationMessageData): string {
  const { 
    customerName, 
    orderNumber, 
    orderDate, 
    deliveryDate, 
    totalAmount, 
    advanceAmount, 
    balanceAmount,
    dressItems,
    garmentTypes,
    measurements,
    companyName,
    orderCategory
  } = data;

  let message = `🧵 *ORDER CONFIRMATION*\n`;
  message += `━━━━━━━━━━━━━━━━━━━━━\n\n`;
  message += `Dear *${customerName}*,\n\n`;
  message += `Thank you for your order! ✨\n\n`;
  
  message += `📋 *Order Details*\n`;
  message += `• Order No: *${orderNumber}*\n`;
  message += `• Order Date: ${orderDate}\n`;
  message += `• Delivery Date: *${deliveryDate}*\n`;
  if (orderCategory) {
    const categoryLabel = orderCategory === 'male' ? 'Men' : orderCategory === 'female' ? 'Women' : 'Kids';
    message += `• Category: ${categoryLabel}\n`;
  }

  // Add garment types if available
  if (garmentTypes && garmentTypes.length > 0) {
    message += `\n👔 *Garments*\n`;
    message += `• ${garmentTypes.join(', ')}\n`;
  }

  // Add dress items if available (with quantities)
  if (dressItems && dressItems.length > 0) {
    message += `\n📦 *Items Ordered*\n`;
    dressItems.forEach((item, index) => {
      message += `${index + 1}. ${item.dressName} × ${item.quantity}\n`;
    });
  }

  // Add measurements if available
  if (measurements && measurements.length > 0) {
    message += `\n📏 *Measurements*\n`;
    measurements.forEach((m) => {
      const formattedMeasurements = formatMeasurements(m.measurements);
      if (formattedMeasurements) {
        message += `\n*${m.garmentType}:*\n`;
        message += formattedMeasurements + '\n';
      }
    });
  }

  // Add payment details if available
  if (totalAmount !== undefined && totalAmount > 0) {
    message += `\n💰 *Payment Summary*\n`;
    message += `• Total Amount: *₹${totalAmount.toLocaleString('en-IN')}*\n`;
    if (advanceAmount !== undefined && advanceAmount > 0) {
      message += `• Advance Paid: ₹${advanceAmount.toLocaleString('en-IN')}\n`;
    }
    if (balanceAmount !== undefined && balanceAmount > 0) {
      message += `• Balance Due: *₹${balanceAmount.toLocaleString('en-IN')}*\n`;
    }
  }

  message += `\n━━━━━━━━━━━━━━━━━━━━━\n`;
  message += `We will notify you when your order is ready for pickup. 📱\n\n`;
  message += `Thank you for choosing us! 🙏\n`;
  message += `*${companyName || 'Tailor Shop'}*`;

  return message;
}

/**
 * Generate order ready message for WhatsApp (simple version)
 */
export function generateOrderReadyMessage(
  customerName: string,
  orderNumber: string,
  companyName?: string
): string {
  return `Dear ${customerName},\n\n🎉 *Great News!*\n\nYour order *${orderNumber}* is ready for delivery!\n\nPlease visit us to collect your order at your convenience.\n\nThank you for your patience! 🙏\n${companyName || 'Tailor Shop'}`;
}

/**
 * Data structure for order ready message with full details
 */
export interface OrderReadyMessageData {
  customerName: string;
  orderNumber: string;
  orderDate: string;
  deliveryDate: string;
  totalAmount?: number;
  advanceAmount?: number;
  balanceAmount?: number;
  dressItems?: Array<{ dressName: string; quantity: number }>;
  garmentTypes?: string[]; // e.g., ['Shirt', 'Pant']
  measurements?: MeasurementData[]; // Measurements for each garment
  companyName?: string;
  orderCategory?: string; // Men/Women/Kids
}

/**
 * Generate order ready message with full order details for WhatsApp
 */
export function generateOrderReadyMessageWithDetails(data: OrderReadyMessageData): string {
  const {
    customerName,
    orderNumber,
    orderDate,
    deliveryDate,
    totalAmount,
    advanceAmount,
    balanceAmount,
    dressItems,
    garmentTypes,
    measurements,
    companyName,
    orderCategory
  } = data;

  let message = `🎉 *ORDER READY FOR DELIVERY*\n`;
  message += `━━━━━━━━━━━━━━━━━━━━━\n\n`;
  message += `Dear *${customerName}*,\n\n`;
  message += `Great news! Your order is ready for pickup! ✨\n\n`;

  message += `📋 *Order Details*\n`;
  message += `• Order No: *${orderNumber}*\n`;
  message += `• Order Date: ${orderDate}\n`;
  message += `• Delivery Date: *${deliveryDate}*\n`;
  if (orderCategory) {
    const categoryLabel = orderCategory === 'male' ? 'Men' : orderCategory === 'female' ? 'Women' : 'Kids';
    message += `• Category: ${categoryLabel}\n`;
  }

  // Add garment types if available
  if (garmentTypes && garmentTypes.length > 0) {
    message += `\n👔 *Garments*\n`;
    message += `• ${garmentTypes.join(', ')}\n`;
  }

  // Add dress items if available (with quantities)
  if (dressItems && dressItems.length > 0) {
    message += `\n📦 *Items*\n`;
    dressItems.forEach((item, index) => {
      message += `${index + 1}. ${item.dressName} × ${item.quantity}\n`;
    });
  }

  // Add measurements if available
  if (measurements && measurements.length > 0) {
    message += `\n📏 *Measurements*\n`;
    measurements.forEach((m) => {
      const formattedMeasurements = formatMeasurements(m.measurements);
      if (formattedMeasurements) {
        message += `\n*${m.garmentType}:*\n`;
        message += formattedMeasurements + '\n';
      }
    });
  }

  // Add payment details if available
  if (totalAmount !== undefined && totalAmount > 0) {
    message += `\n💰 *Payment Summary*\n`;
    message += `• Total Amount: *₹${totalAmount.toLocaleString('en-IN')}*\n`;
    if (advanceAmount !== undefined && advanceAmount > 0) {
      message += `• Advance Paid: ₹${advanceAmount.toLocaleString('en-IN')}\n`;
    }
    if (balanceAmount !== undefined && balanceAmount > 0) {
      message += `• Balance Due: *₹${balanceAmount.toLocaleString('en-IN')}*\n`;
    }
  }

  message += `\n━━━━━━━━━━━━━━━━━━━━━\n`;
  message += `Please visit us to collect your order at your convenience. 📍\n\n`;
  message += `Thank you for your patience! 🙏\n`;
  message += `*${companyName || 'Tailor Shop'}*`;

  return message;
}

