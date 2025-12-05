import { useState } from 'react';
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
import { openWhatsAppChat } from '@/lib/nativeWhatsApp';

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
  const [sending, setSending] = useState(false);

  // Update message when messageData changes
  useState(() => {
    setMessage(messageData.message);
  });

  const handleSend = async () => {
    try {
      setSending(true);
      await openWhatsAppChat(messageData.customerPhone, message);
      onSend();
    } catch (error) {
      console.error('[WhatsApp Dialog] Failed to send:', error);
      // Still call onSend to mark order as ready even if WhatsApp fails
      onSend();
    } finally {
      setSending(false);
    }
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
            disabled={sending}
          >
            <X size={16} className="mr-1" />
            {skipButtonText}
          </Button>
          <Button
            type="button"
            onClick={handleSend}
            className="flex-1 sm:flex-none bg-green-600 hover:bg-green-700 text-white"
            disabled={sending}
          >
            <PaperPlaneTilt size={16} className="mr-1" weight="fill" />
            {sending ? 'Opening...' : sendButtonText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Format phone number for WhatsApp URL
 * Removes all non-digits and adds India country code if not present
 */
function formatPhoneForWhatsApp(phone: string): string {
  const cleanPhone = phone.replace(/[^0-9]/g, '');
  // Add India country code if not present
  if (cleanPhone.startsWith('91') && cleanPhone.length >= 12) {
    return cleanPhone;
  }
  return `91${cleanPhone}`;
}

/**
 * Helper function to format measurements for WhatsApp message
 */
function formatMeasurements(measurements: Record<string, number | string | undefined>): string {
  let formatted = '';
  Object.entries(measurements).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '' && value !== 0) {
      // Convert camelCase to Title Case with spaces
      const label = key
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, (str) => str.toUpperCase())
        .trim();
      formatted += `  ${label}: ${value}\n`;
    }
  });
  return formatted;
}

export interface MeasurementData {
  garmentType: string;
  measurements: Record<string, number | string | undefined>;
}

/**
 * Message generation functions
 */

export interface OrderConfirmationMessageData {
  customerName: string;
  orderNumber: string;
  orderDate: string;
  deliveryDate: string;
  totalAmount?: number;
  advanceAmount?: number;
  balanceAmount?: number;
  dressItems?: Array<{ dressName: string; quantity: number }>;
  garmentTypes?: string[];
  measurements?: MeasurementData[];
  companyName?: string;
  orderCategory?: string;
}

export interface OrderReadyMessageData {
  customerName: string;
  orderNumber: string;
  orderDate: string;
  deliveryDate: string;
  totalAmount?: number;
  advanceAmount?: number;
  balanceAmount?: number;
  dressItems?: Array<{ dressName: string; quantity: number; price?: number }>;
  garmentTypes?: string[]; // e.g., ['Shirt', 'Pant']
  measurements?: MeasurementData[]; // Measurements for each garment
  companyName?: string;
  orderCategory?: string; // Men/Women/Kids
  jobWorkNo?: string; // Job Work Number
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
    orderCategory,
    jobWorkNo
  } = data;

  let message = `🎉 *ORDER READY FOR DELIVERY*\n`;
  message += `━━━━━━━━━━━━━━━━━━━━━\n\n`;
  message += `Dear *${customerName}*,\n\n`;
  message += `Great news! Your order is ready for pickup! ✨\n\n`;

  message += `📋 *ORDER DETAILS*\n`;
  message += `┌────────────────────\n`;
  message += `│ Order Code: *${orderNumber}*\n`;
  if (jobWorkNo) {
    message += `│ Job Work No: *${jobWorkNo}*\n`;
  }
  message += `│ Customer: *${customerName}*\n`;
  message += `│ Order Date: ${orderDate}\n`;
  message += `│ Delivery Date: *${deliveryDate}*\n`;
  if (orderCategory) {
    const categoryLabel = orderCategory === 'male' ? 'Men' : orderCategory === 'female' ? 'Women' : 'Kids';
    message += `│ Category: ${categoryLabel}\n`;
  }
  message += `└────────────────────\n`;

  // Add dress items (What was stitched) with details
  if (dressItems && dressItems.length > 0) {
    message += `\n👔 *ITEMS STITCHED*\n`;
    message += `┌────────────────────\n`;
    dressItems.forEach((item, index) => {
      message += `│ ${index + 1}. *${item.dressName}* × ${item.quantity}`;
      if (item.price) {
        message += ` - ₹${item.price.toLocaleString('en-IN')}`;
      }
      message += `\n`;
    });
    message += `└────────────────────\n`;
  }

  // Add garment types if available and different from dress items
  if (garmentTypes && garmentTypes.length > 0 && (!dressItems || dressItems.length === 0)) {
    message += `\n👔 *Garment Types*\n`;
    message += `• ${garmentTypes.join(', ')}\n`;
  }

  // Add measurements if available
  if (measurements && measurements.length > 0) {
    message += `\n📏 *MEASUREMENTS*\n`;
    measurements.forEach((m) => {
      const formattedMeasurements = formatMeasurements(m.measurements);
      if (formattedMeasurements) {
        message += `\n*${m.garmentType}:*\n`;
        message += formattedMeasurements + '\n';
      }
    });
  }

  // Add payment details
  message += `\n💰 *PAYMENT SUMMARY*\n`;
  message += `┌────────────────────\n`;
  if (totalAmount !== undefined && totalAmount > 0) {
    message += `│ Total Amount: *₹${totalAmount.toLocaleString('en-IN')}*\n`;
  }
  if (advanceAmount !== undefined && advanceAmount > 0) {
    message += `│ Advance Paid: ₹${advanceAmount.toLocaleString('en-IN')}\n`;
  }
  if (balanceAmount !== undefined && balanceAmount > 0) {
    message += `│ *Balance Due: ₹${balanceAmount.toLocaleString('en-IN')}*\n`;
  } else if (totalAmount && (!advanceAmount || advanceAmount >= totalAmount)) {
    message += `│ ✅ *FULLY PAID*\n`;
  }
  message += `└────────────────────\n`;

  message += `\n━━━━━━━━━━━━━━━━━━━━━\n`;
  message += `📍 Please visit us to collect your order.\n\n`;
  message += `Thank you for choosing us! 🙏\n`;
  message += `*${companyName || 'Tailor Shop'}*`;

  return message;
}

export function generateOrderConfirmationMessage(data: OrderConfirmationMessageData): string {
  // Simple confirmation message
  return `Order ${data.orderNumber} confirmed for ${data.customerName}. Delivery: ${data.deliveryDate}. Total: ₹${data.totalAmount}`;
}

export function generateOrderReadyMessage(data: Omit<OrderReadyMessageData, 'dressItems' | 'measurements' | 'garmentTypes'>): string {
  return `Order ${data.orderNumber} is ready for ${data.customerName}!`;
}
