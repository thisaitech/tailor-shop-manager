import jsPDF from 'jspdf';
import { format } from 'date-fns';
import { savePdfMobile, openPdfForPrint, isCapacitorNative } from './mobilePdfUtils';

// Professional Proforma Invoice Data Interface
export interface ProformaInvoiceData {
  // Company Info
  companyName?: string;
  companyAddress?: string;
  companyPhone?: string;
  companyEmail?: string;
  companyGSTIN?: string;

  // Invoice Info
  proformaInvoiceNo: string;
  invoiceDate: Date | number;
  serviceOrderNo?: string;

  // Customer Info
  customerName: string;
  customerId: string;
  customerPhone?: string;
  customerAddress?: string;

  // Order Details
  orderCategory: 'male' | 'female' | 'kids';
  expectedDeliveryDate: Date | number;

  // Line Items
  items: ProformaInvoiceItem[];

  // Payment Summary
  subtotal: number;
  taxAmount?: number;
  taxPercent?: number;
  advanceAmount: number;
  balanceDue: number;
  paymentMode: string;
}

export interface ProformaInvoiceItem {
  name: string;
  quantity: number;
  rate: number;
  amount: number;
}

// Brand Colors - Professional Purple Theme
const COLORS = {
  primary: '#6A64F2',       // Purple
  primaryDark: '#5048C8',   // Darker Purple
  secondary: '#F4F3FF',     // Light Purple
  accent: '#10B981',        // Green for positive values
  danger: '#EF4444',        // Red for alerts
  text: '#1F2937',          // Dark gray
  textMuted: '#6B7280',     // Muted gray
  border: '#E5E7EB',        // Border gray
  white: '#FFFFFF',
  background: '#FAF8FF',    // Very light purple background
};

/**
 * Format date consistently
 */
function formatDate(date: Date | number): string {
  const d = typeof date === 'number' ? new Date(date) : date;
  return format(d, 'dd MMM yyyy');
}

/**
 * Format currency in Indian Rupees
 */
function formatCurrency(amount: number): string {
  return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

/**
 * Get category display name
 */
function getCategoryDisplay(category: 'male' | 'female' | 'kids'): string {
  switch (category) {
    case 'male': return 'Men';
    case 'female': return 'Women';
    case 'kids': return 'Kids';
    default: return category;
  }
}

/**
 * Generate HTML for Proforma Invoice (for Print Preview)
 */
export function generateProformaInvoiceHtml(data: ProformaInvoiceData): string {
  const invoiceDate = formatDate(data.invoiceDate);
  const deliveryDate = formatDate(data.expectedDeliveryDate);

  const itemsHtml = data.items.map((item, index) => `
    <tr style="background: ${index % 2 === 0 ? COLORS.background : COLORS.white};">
      <td style="padding: 12px 16px; border-bottom: 1px solid ${COLORS.border};">${item.name}</td>
      <td style="padding: 12px 16px; text-align: center; border-bottom: 1px solid ${COLORS.border};">${item.quantity}</td>
      <td style="padding: 12px 16px; text-align: right; border-bottom: 1px solid ${COLORS.border};">${formatCurrency(item.rate)}</td>
      <td style="padding: 12px 16px; text-align: right; border-bottom: 1px solid ${COLORS.border}; font-weight: 600;">${formatCurrency(item.amount)}</td>
    </tr>
  `).join('');

  return `<!DOCTYPE html>
<html>
<head>
  <title>Proforma Invoice - ${data.proformaInvoiceNo}</title>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif;
      max-width: 800px;
      margin: 0 auto;
      background: ${COLORS.white};
      color: ${COLORS.text};
      line-height: 1.5;
    }

    .invoice-container {
      border: 2px solid ${COLORS.primary};
      border-radius: 12px;
      overflow: hidden;
      margin: 20px;
      box-shadow: 0 4px 20px rgba(106, 100, 242, 0.15);
    }

    .header {
      background: linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.primaryDark} 100%);
      color: ${COLORS.white};
      padding: 24px 30px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .header-left h1 {
      font-size: 26px;
      font-weight: 700;
      letter-spacing: 1px;
      margin-bottom: 4px;
    }

    .header-left .subtitle {
      font-size: 12px;
      opacity: 0.9;
      font-weight: 400;
    }

    .header-right {
      text-align: right;
    }

    .pi-badge {
      background: rgba(255,255,255,0.2);
      padding: 8px 16px;
      border-radius: 20px;
      font-size: 14px;
      font-weight: 600;
      margin-bottom: 8px;
      display: inline-block;
    }

    .header-date {
      font-size: 12px;
      opacity: 0.9;
    }

    .content {
      padding: 24px 30px;
    }

    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-bottom: 24px;
    }

    .info-box {
      background: ${COLORS.background};
      border: 1px solid ${COLORS.primary};
      border-radius: 10px;
      padding: 16px 20px;
    }

    .info-box h3 {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: ${COLORS.primary};
      font-weight: 700;
      margin-bottom: 10px;
      border-bottom: 1px dashed ${COLORS.primary};
      padding-bottom: 6px;
    }

    .info-box .name {
      font-size: 16px;
      font-weight: 600;
      color: ${COLORS.text};
      margin-bottom: 6px;
    }

    .info-box .detail {
      font-size: 12px;
      color: ${COLORS.textMuted};
      line-height: 1.6;
    }

    .items-section h3 {
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: ${COLORS.primary};
      font-weight: 700;
      margin-bottom: 12px;
    }

    .items-table {
      width: 100%;
      border-collapse: collapse;
      border-radius: 8px;
      overflow: hidden;
      border: 1px solid ${COLORS.border};
    }

    .items-table th {
      background: ${COLORS.primary};
      color: ${COLORS.white};
      padding: 12px 16px;
      text-align: left;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      font-weight: 600;
    }

    .items-table th:nth-child(2),
    .items-table th:nth-child(3),
    .items-table th:nth-child(4) {
      text-align: center;
    }

    .items-table th:last-child {
      text-align: right;
    }

    .summary-section {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-top: 24px;
      gap: 30px;
    }

    .payment-info {
      flex: 1;
    }

    .payment-info p {
      font-size: 12px;
      color: ${COLORS.textMuted};
      margin-bottom: 4px;
    }

    .payment-info strong {
      color: ${COLORS.text};
    }

    .totals-box {
      background: ${COLORS.background};
      border: 2px solid ${COLORS.primary};
      border-radius: 10px;
      padding: 16px 20px;
      min-width: 220px;
    }

    .totals-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 6px 0;
      font-size: 13px;
    }

    .totals-row.subtotal {
      border-bottom: 1px dashed ${COLORS.border};
      padding-bottom: 10px;
      margin-bottom: 6px;
    }

    .totals-row.advance {
      color: ${COLORS.accent};
    }

    .totals-row.balance {
      font-size: 16px;
      font-weight: 700;
      color: ${COLORS.primary};
      border-top: 2px solid ${COLORS.primary};
      padding-top: 10px;
      margin-top: 6px;
    }

    .footer {
      background: ${COLORS.background};
      border-top: 1px solid ${COLORS.border};
      padding: 16px 30px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .footer-left {
      font-size: 11px;
      color: ${COLORS.textMuted};
    }

    .footer-right {
      text-align: right;
    }

    .footer-right .thanks {
      font-size: 14px;
      font-weight: 600;
      color: ${COLORS.primary};
      margin-bottom: 2px;
    }

    .footer-right .note {
      font-size: 10px;
      color: ${COLORS.textMuted};
    }

    @media print {
      body { margin: 0; }
      .invoice-container {
        margin: 0;
        border-radius: 0;
        box-shadow: none;
      }
      .header { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .items-table th { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .totals-box { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .info-box { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  <div class="invoice-container">
    <div class="header">
      <div class="header-left">
        <h1>PROFORMA INVOICE</h1>
        <div class="subtitle">${data.companyName || 'Tailor Shop Manager'}</div>
      </div>
      <div class="header-right">
        <div class="pi-badge">${data.proformaInvoiceNo}</div>
        <div class="header-date">${invoiceDate}</div>
      </div>
    </div>

    <div class="content">
      <div class="info-grid">
        <div class="info-box">
          <h3>Bill To</h3>
          <div class="name">${data.customerName}</div>
          <div class="detail">
            ${data.customerPhone ? `Phone: ${data.customerPhone}<br>` : ''}
            Customer ID: ${data.customerId}
            ${data.customerAddress ? `<br>${data.customerAddress}` : ''}
          </div>
        </div>
        <div class="info-box">
          <h3>Order Details</h3>
          <div class="detail">
            ${data.serviceOrderNo ? `<strong>Order No:</strong> ${data.serviceOrderNo}<br>` : ''}
            <strong>Category:</strong> ${getCategoryDisplay(data.orderCategory)}<br>
            <strong>Expected Delivery:</strong> ${deliveryDate}
          </div>
        </div>
      </div>

      <div class="items-section">
        <h3>Order Items</h3>
        <table class="items-table">
          <thead>
            <tr>
              <th style="width: 45%;">Description</th>
              <th style="width: 15%;">Qty</th>
              <th style="width: 20%;">Rate</th>
              <th style="width: 20%;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>
      </div>

      <div class="summary-section">
        <div class="payment-info">
          <p><strong>Payment Mode:</strong> ${data.paymentMode}</p>
          ${data.companyGSTIN ? `<p><strong>GSTIN:</strong> ${data.companyGSTIN}</p>` : ''}
        </div>
        <div class="totals-box">
          <div class="totals-row subtotal">
            <span>Subtotal</span>
            <span>${formatCurrency(data.subtotal)}</span>
          </div>
          ${data.taxAmount && data.taxAmount > 0 ? `
          <div class="totals-row">
            <span>Tax (${data.taxPercent || 0}%)</span>
            <span>${formatCurrency(data.taxAmount)}</span>
          </div>
          ` : ''}
          <div class="totals-row advance">
            <span>Advance Paid</span>
            <span>- ${formatCurrency(data.advanceAmount)}</span>
          </div>
          <div class="totals-row balance">
            <span>Balance Due</span>
            <span>${formatCurrency(data.balanceDue)}</span>
          </div>
        </div>
      </div>
    </div>

    <div class="footer">
      <div class="footer-left">
        ${data.companyAddress ? data.companyAddress : ''}
        ${data.companyPhone ? ` | Tel: ${data.companyPhone}` : ''}
        ${data.companyEmail ? ` | ${data.companyEmail}` : ''}
      </div>
      <div class="footer-right">
        <div class="thanks">Thank you for your business!</div>
        <div class="note">This is a computer-generated proforma invoice</div>
      </div>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Generate PDF for Proforma Invoice using jsPDF
 */
export function generateProformaInvoicePdf(data: ProformaInvoiceData): jsPDF {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  let y = 0;

  const invoiceDate = formatDate(data.invoiceDate);
  const deliveryDate = formatDate(data.expectedDeliveryDate);

  // Helper: Set colors from hex
  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 };
  };

  const primary = hexToRgb(COLORS.primary);
  const primaryDark = hexToRgb(COLORS.primaryDark);
  const accent = hexToRgb(COLORS.accent);
  const text = hexToRgb(COLORS.text);
  const textMuted = hexToRgb(COLORS.textMuted);
  const background = hexToRgb(COLORS.background);

  // ========================================
  // HEADER - Purple gradient background
  // ========================================
  doc.setFillColor(primary.r, primary.g, primary.b);
  doc.rect(0, 0, pageWidth, 38, 'F');

  // Header Title
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('PROFORMA INVOICE', margin, 18);

  // Company name subtitle
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(data.companyName || 'Tailor Shop Manager', margin, 28);

  // PI Badge (right side)
  doc.setFillColor(255, 255, 255, 0.2);
  const piWidth = doc.getTextWidth(data.proformaInvoiceNo) + 16;
  doc.roundedRect(pageWidth - margin - piWidth, 10, piWidth, 12, 2, 2, 'F');
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(data.proformaInvoiceNo, pageWidth - margin - piWidth / 2, 18, { align: 'center' });

  // Date
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(invoiceDate, pageWidth - margin, 30, { align: 'right' });

  y = 48;

  // ========================================
  // INFO BOXES - Customer & Order Details
  // ========================================
  const boxWidth = (pageWidth - margin * 3) / 2;
  const boxHeight = 42;

  // Customer Box
  doc.setFillColor(background.r, background.g, background.b);
  doc.setDrawColor(primary.r, primary.g, primary.b);
  doc.roundedRect(margin, y, boxWidth, boxHeight, 3, 3, 'FD');

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(primary.r, primary.g, primary.b);
  doc.text('BILL TO', margin + 8, y + 10);

  doc.setFontSize(12);
  doc.setTextColor(text.r, text.g, text.b);
  doc.text(data.customerName, margin + 8, y + 20);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(textMuted.r, textMuted.g, textMuted.b);
  let customerY = y + 28;
  if (data.customerPhone) {
    doc.text(`Phone: ${data.customerPhone}`, margin + 8, customerY);
    customerY += 6;
  }
  doc.text(`Customer ID: ${data.customerId}`, margin + 8, customerY);

  // Order Box
  const orderBoxX = margin * 2 + boxWidth;
  doc.setFillColor(background.r, background.g, background.b);
  doc.setDrawColor(primary.r, primary.g, primary.b);
  doc.roundedRect(orderBoxX, y, boxWidth, boxHeight, 3, 3, 'FD');

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(primary.r, primary.g, primary.b);
  doc.text('ORDER DETAILS', orderBoxX + 8, y + 10);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(text.r, text.g, text.b);
  let orderY = y + 20;
  if (data.serviceOrderNo) {
    doc.text(`Order No: ${data.serviceOrderNo}`, orderBoxX + 8, orderY);
    orderY += 7;
  }
  doc.text(`Category: ${getCategoryDisplay(data.orderCategory)}`, orderBoxX + 8, orderY);
  orderY += 7;
  doc.text(`Delivery: ${deliveryDate}`, orderBoxX + 8, orderY);

  y += boxHeight + 15;

  // ========================================
  // ITEMS TABLE
  // ========================================
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(primary.r, primary.g, primary.b);
  doc.text('ORDER ITEMS', margin, y);
  y += 8;

  // Table Header
  const tableWidth = pageWidth - margin * 2;
  doc.setFillColor(primary.r, primary.g, primary.b);
  doc.rect(margin, y, tableWidth, 10, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('DESCRIPTION', margin + 5, y + 7);
  doc.text('QTY', margin + 100, y + 7);
  doc.text('RATE', margin + 125, y + 7);
  doc.text('AMOUNT', pageWidth - margin - 5, y + 7, { align: 'right' });

  y += 12;

  // Table Rows
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(text.r, text.g, text.b);
  doc.setFontSize(9);

  data.items.forEach((item, index) => {
    if (index % 2 === 0) {
      doc.setFillColor(background.r, background.g, background.b);
      doc.rect(margin, y - 2, tableWidth, 10, 'F');
    }

    doc.text(item.name.substring(0, 40), margin + 5, y + 5);
    doc.text(String(item.quantity), margin + 100, y + 5);
    doc.text(formatCurrency(item.rate), margin + 125, y + 5);
    doc.setFont('helvetica', 'bold');
    doc.text(formatCurrency(item.amount), pageWidth - margin - 5, y + 5, { align: 'right' });
    doc.setFont('helvetica', 'normal');

    y += 10;
  });

  // Table border
  doc.setDrawColor(200, 200, 200);
  doc.rect(margin, y - (data.items.length * 10) - 2, tableWidth, data.items.length * 10, 'S');

  y += 10;

  // ========================================
  // PAYMENT INFO & TOTALS
  // ========================================
  // Payment mode (left side)
  doc.setFontSize(9);
  doc.setTextColor(textMuted.r, textMuted.g, textMuted.b);
  doc.text(`Payment Mode: ${data.paymentMode}`, margin, y + 5);

  // Totals Box (right side)
  const totalsWidth = 85;
  const totalsX = pageWidth - margin - totalsWidth;
  const totalsHeight = data.taxAmount && data.taxAmount > 0 ? 55 : 48;

  doc.setFillColor(background.r, background.g, background.b);
  doc.setDrawColor(primary.r, primary.g, primary.b);
  doc.setLineWidth(0.5);
  doc.roundedRect(totalsX, y - 5, totalsWidth, totalsHeight, 3, 3, 'FD');

  let totalsY = y + 5;

  // Subtotal
  doc.setFontSize(9);
  doc.setTextColor(text.r, text.g, text.b);
  doc.text('Subtotal:', totalsX + 5, totalsY);
  doc.text(formatCurrency(data.subtotal), totalsX + totalsWidth - 5, totalsY, { align: 'right' });
  totalsY += 8;

  // Tax (if applicable)
  if (data.taxAmount && data.taxAmount > 0) {
    doc.text(`Tax (${data.taxPercent || 0}%):`, totalsX + 5, totalsY);
    doc.text(formatCurrency(data.taxAmount), totalsX + totalsWidth - 5, totalsY, { align: 'right' });
    totalsY += 8;
  }

  // Advance
  doc.setTextColor(accent.r, accent.g, accent.b);
  doc.text('Advance Paid:', totalsX + 5, totalsY);
  doc.text(`- ${formatCurrency(data.advanceAmount)}`, totalsX + totalsWidth - 5, totalsY, { align: 'right' });
  totalsY += 4;

  // Divider line
  doc.setDrawColor(primary.r, primary.g, primary.b);
  doc.setLineWidth(0.3);
  doc.line(totalsX + 5, totalsY, totalsX + totalsWidth - 5, totalsY);
  totalsY += 8;

  // Balance Due
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(primary.r, primary.g, primary.b);
  doc.text('Balance Due:', totalsX + 5, totalsY);
  doc.text(formatCurrency(data.balanceDue), totalsX + totalsWidth - 5, totalsY, { align: 'right' });

  // ========================================
  // FOOTER
  // ========================================
  const footerY = pageHeight - 25;

  doc.setDrawColor(200, 200, 200);
  doc.line(margin, footerY, pageWidth - margin, footerY);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(primary.r, primary.g, primary.b);
  doc.text('Thank you for your business!', pageWidth / 2, footerY + 8, { align: 'center' });

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(textMuted.r, textMuted.g, textMuted.b);
  doc.text('This is a computer-generated proforma invoice', pageWidth / 2, footerY + 14, { align: 'center' });

  // Company details at bottom left
  if (data.companyAddress || data.companyPhone) {
    const footerText = [
      data.companyAddress,
      data.companyPhone ? `Tel: ${data.companyPhone}` : null,
      data.companyEmail
    ].filter(Boolean).join(' | ');

    doc.setFontSize(7);
    doc.text(footerText, pageWidth / 2, footerY + 20, { align: 'center' });
  }

  return doc;
}

/**
 * Download Proforma Invoice as PDF (mobile-compatible)
 */
export async function downloadProformaInvoicePdf(data: ProformaInvoiceData): Promise<void> {
  const doc = generateProformaInvoicePdf(data);
  const filename = `Proforma_Invoice_${data.proformaInvoiceNo}_${data.customerName.replace(/\s+/g, '_')}.pdf`;
  await savePdfMobile(doc, filename);
}

/**
 * Print Proforma Invoice (mobile-compatible)
 */
export async function printProformaInvoice(data: ProformaInvoiceData): Promise<void> {
  if (isCapacitorNative()) {
    // On mobile, share the PDF instead of opening print dialog
    const doc = generateProformaInvoicePdf(data);
    const filename = `Proforma_Invoice_${data.proformaInvoiceNo}_${data.customerName.replace(/\s+/g, '_')}.pdf`;
    await openPdfForPrint(doc, filename);
  } else {
    // On web, use HTML print for better quality
    const html = generateProformaInvoiceHtml(data);
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.onload = () => {
        printWindow.print();
      };
    }
  }
}

/**
 * Get Proforma Invoice as base64 string (for storage)
 */
export function getProformaInvoiceBase64(data: ProformaInvoiceData): string {
  const doc = generateProformaInvoicePdf(data);
  return doc.output('datauristring');
}
