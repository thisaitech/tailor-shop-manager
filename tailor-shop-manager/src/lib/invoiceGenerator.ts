import jsPDF from 'jspdf';
import { format } from 'date-fns';

export interface InvoiceData {
  // Company Info
  companyName: string;
  companyAddress?: string;
  companyPhone?: string;
  companyGSTIN?: string;

  // Invoice Info
  invoiceNo: string;
  invoiceDate: number;
  jobWorkNo: string;
  serviceOrderNo: string;

  // Customer Info
  customerName: string;
  customerId: string;
  customerPhone?: string;
  customerAddress?: string;

  // Order Details
  orderCategory: string;
  orderQty: number;
  uom: string;
  assignedTo: string;
  assignedName: string;
  expectedDeliveryDate: number;

  // Cost Breakdown
  materialCost: number;
  jobWorkCost: number;
  totalCost: number;
  advanceAmount: number;
  remainingAmount: number;
  modeOfPayment: string;
}

// Brand colors
const COLORS = {
  primary: { r: 220, g: 53, b: 69 },      // Red
  secondary: { r: 255, g: 193, b: 7 },    // Yellow
  dark: { r: 33, g: 37, b: 41 },          // Dark gray
  light: { r: 248, g: 249, b: 250 },      // Light gray
  success: { r: 40, g: 167, b: 69 },      // Green
  muted: { r: 108, g: 117, b: 125 },      // Muted gray
  white: { r: 255, g: 255, b: 255 },      // White
};

/**
 * Format currency without special characters that cause issues
 */
function formatCurrency(amount: number): string {
  return amount.toFixed(2);
}

/**
 * Generate a professional Proforma Invoice PDF
 */
export function generateInvoicePDF(data: InvoiceData): jsPDF {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  let yPos = margin;

  // Helper function to set color
  const setColor = (color: { r: number; g: number; b: number }) => {
    doc.setTextColor(color.r, color.g, color.b);
  };

  // Helper function to set fill color
  const setFillColor = (color: { r: number; g: number; b: number }) => {
    doc.setFillColor(color.r, color.g, color.b);
  };

  // Helper function to add text with proper alignment
  const addText = (
    text: string,
    x: number,
    y: number,
    options?: {
      fontSize?: number;
      fontStyle?: 'normal' | 'bold' | 'italic';
      align?: 'left' | 'center' | 'right';
      color?: { r: number; g: number; b: number };
    }
  ) => {
    const { fontSize = 10, fontStyle = 'normal', align = 'left', color = COLORS.dark } = options || {};
    doc.setFontSize(fontSize);
    doc.setFont('helvetica', fontStyle);
    setColor(color);

    let xPos = x;
    if (align === 'center') {
      xPos = pageWidth / 2;
    } else if (align === 'right') {
      xPos = pageWidth - margin;
    }

    doc.text(text, xPos, y, { align });
    return y + fontSize * 0.5;
  };

  // Helper function to draw a horizontal line
  const drawLine = (y: number, color = { r: 220, g: 220, b: 220 }, thickness = 0.5) => {
    doc.setDrawColor(color.r, color.g, color.b);
    doc.setLineWidth(thickness);
    doc.line(margin, y, pageWidth - margin, y);
    return y + 4;
  };

  // ============================================
  // HEADER SECTION WITH BRAND COLORS
  // ============================================

  // Red header bar
  setFillColor(COLORS.primary);
  doc.rect(0, 0, pageWidth, 35, 'F');

  // Company Name in header
  addText(data.companyName || 'Tailor Shop', pageWidth / 2, 15, {
    fontSize: 20,
    fontStyle: 'bold',
    align: 'center',
    color: COLORS.white,
  });

  // Tagline or contact in header
  if (data.companyPhone) {
    addText(`Tel: ${data.companyPhone}`, pageWidth / 2, 25, {
      fontSize: 9,
      align: 'center',
      color: COLORS.white,
    });
  }

  yPos = 45;

  // PROFORMA INVOICE title with yellow accent
  setFillColor(COLORS.secondary);
  doc.rect(margin, yPos - 5, pageWidth - margin * 2, 12, 'F');
  addText('PROFORMA INVOICE', pageWidth / 2, yPos + 2, {
    fontSize: 14,
    fontStyle: 'bold',
    align: 'center',
    color: COLORS.dark,
  });

  yPos += 15;

  // ============================================
  // INVOICE INFO & DATE (Two columns)
  // ============================================
  const col1X = margin;
  const col2X = pageWidth / 2 + 10;
  const labelWidth = 45;

  // Left side - Invoice details box
  setFillColor(COLORS.light);
  doc.rect(margin, yPos - 3, (pageWidth - margin * 2) / 2 - 5, 28, 'F');

  addText('Invoice No:', col1X + 3, yPos + 2, { fontSize: 9, fontStyle: 'bold', color: COLORS.muted });
  addText(data.invoiceNo, col1X + labelWidth, yPos + 2, { fontSize: 10, fontStyle: 'bold', color: COLORS.dark });

  addText('Date:', col1X + 3, yPos + 10, { fontSize: 9, fontStyle: 'bold', color: COLORS.muted });
  addText(format(data.invoiceDate, 'dd-MMM-yyyy'), col1X + labelWidth, yPos + 10, { fontSize: 10, color: COLORS.dark });

  addText('Job Work No:', col1X + 3, yPos + 18, { fontSize: 9, fontStyle: 'bold', color: COLORS.muted });
  addText(data.jobWorkNo, col1X + labelWidth, yPos + 18, { fontSize: 10, color: COLORS.dark });

  // Right side - Service order & delivery
  setFillColor(COLORS.light);
  doc.rect(col2X - 5, yPos - 3, (pageWidth - margin * 2) / 2 - 5, 28, 'F');

  addText('Service Order:', col2X, yPos + 2, { fontSize: 9, fontStyle: 'bold', color: COLORS.muted });
  addText(data.serviceOrderNo, col2X + labelWidth, yPos + 2, { fontSize: 10, color: COLORS.dark });

  addText('Expected:', col2X, yPos + 10, { fontSize: 9, fontStyle: 'bold', color: COLORS.muted });
  addText(format(data.expectedDeliveryDate, 'dd-MMM-yyyy'), col2X + labelWidth, yPos + 10, { fontSize: 10, color: COLORS.dark });

  addText('Assigned To:', col2X, yPos + 18, { fontSize: 9, fontStyle: 'bold', color: COLORS.muted });
  addText(data.assignedName, col2X + labelWidth, yPos + 18, { fontSize: 10, color: COLORS.dark });

  yPos += 35;

  // ============================================
  // CUSTOMER INFORMATION
  // ============================================
  addText('BILL TO', col1X, yPos, { fontSize: 10, fontStyle: 'bold', color: COLORS.primary });
  yPos += 7;

  // Customer box
  doc.setDrawColor(COLORS.primary.r, COLORS.primary.g, COLORS.primary.b);
  doc.setLineWidth(0.5);
  doc.rect(margin, yPos - 3, pageWidth - margin * 2, 22, 'S');

  addText(data.customerName, col1X + 3, yPos + 3, { fontSize: 11, fontStyle: 'bold', color: COLORS.dark });
  addText(`ID: ${data.customerId}`, col1X + 3, yPos + 11, { fontSize: 9, color: COLORS.muted });

  if (data.customerPhone) {
    addText(`Phone: ${data.customerPhone}`, col2X, yPos + 3, { fontSize: 9, color: COLORS.dark });
  }
  if (data.customerAddress) {
    addText(data.customerAddress, col2X, yPos + 11, { fontSize: 9, color: COLORS.muted });
  }

  yPos += 30;

  // ============================================
  // LINE ITEMS TABLE
  // ============================================
  addText('ORDER DETAILS', col1X, yPos, { fontSize: 10, fontStyle: 'bold', color: COLORS.primary });
  yPos += 8;

  // Table Header with dark background
  setFillColor(COLORS.dark);
  doc.rect(margin, yPos - 3, pageWidth - margin * 2, 10, 'F');

  const colPositions = [margin + 3, margin + 75, margin + 95, margin + 120, margin + 150];
  const headers = ['Item Description', 'Qty', 'UOM', 'Unit Price', 'Amount'];

  headers.forEach((header, index) => {
    const align = index >= 3 ? 'left' : 'left';
    addText(header, colPositions[index], yPos + 3, { fontSize: 9, fontStyle: 'bold', color: COLORS.white });
  });

  yPos += 12;

  // Table Rows with alternating colors
  const drawTableRow = (
    description: string,
    qty: string,
    uom: string,
    unitPrice: string,
    amount: string,
    isAlternate: boolean
  ) => {
    if (isAlternate) {
      setFillColor(COLORS.light);
      doc.rect(margin, yPos - 3, pageWidth - margin * 2, 8, 'F');
    }

    addText(description, colPositions[0], yPos + 1, { fontSize: 9, color: COLORS.dark });
    addText(qty, colPositions[1], yPos + 1, { fontSize: 9, color: COLORS.dark });
    addText(uom, colPositions[2], yPos + 1, { fontSize: 9, color: COLORS.dark });
    addText(unitPrice, colPositions[3], yPos + 1, { fontSize: 9, color: COLORS.dark });
    addText(amount, colPositions[4], yPos + 1, { fontSize: 9, fontStyle: 'bold', color: COLORS.dark });

    yPos += 10;
  };

  // Row 1: Material Cost
  drawTableRow(
    'Material Cost',
    '1',
    'Lot',
    formatCurrency(data.materialCost),
    formatCurrency(data.materialCost),
    true
  );

  // Row 2: Job Work Cost
  const unitPrice = data.orderQty > 0 ? data.jobWorkCost / data.orderQty : data.jobWorkCost;
  drawTableRow(
    `Stitching - ${data.orderCategory.charAt(0).toUpperCase() + data.orderCategory.slice(1)}`,
    data.orderQty.toString(),
    data.uom,
    formatCurrency(unitPrice),
    formatCurrency(data.jobWorkCost),
    false
  );

  // Table border
  doc.setDrawColor(200, 200, 200);
  doc.rect(margin, yPos - 22, pageWidth - margin * 2, 22, 'S');

  yPos += 5;

  // ============================================
  // TOTALS SECTION (Right-aligned)
  // ============================================
  const totalsX = pageWidth - margin - 85;
  const totalsValueX = pageWidth - margin - 5;

  // Subtotal
  addText('Subtotal:', totalsX, yPos, { fontSize: 10, color: COLORS.dark });
  addText(formatCurrency(data.totalCost), totalsValueX, yPos, { fontSize: 10, align: 'right', color: COLORS.dark });
  yPos += 7;

  // Tax (if applicable - showing 0% for now)
  addText('Tax (0%):', totalsX, yPos, { fontSize: 9, color: COLORS.muted });
  addText('0.00', totalsValueX, yPos, { fontSize: 9, align: 'right', color: COLORS.muted });
  yPos += 7;

  // Advance Payment
  if (data.advanceAmount > 0) {
    addText('Advance Paid:', totalsX, yPos, { fontSize: 10, color: COLORS.success });
    addText(`-${formatCurrency(data.advanceAmount)}`, totalsValueX, yPos, { fontSize: 10, align: 'right', color: COLORS.success });
    yPos += 5;
    addText(`(${data.modeOfPayment.toUpperCase()})`, totalsX + 35, yPos, { fontSize: 8, color: COLORS.muted });
    yPos += 7;
  }

  // Grand Total / Balance Due - Highlighted
  setFillColor(COLORS.secondary);
  doc.rect(totalsX - 5, yPos - 4, 90, 12, 'F');
  doc.setDrawColor(COLORS.dark.r, COLORS.dark.g, COLORS.dark.b);
  doc.rect(totalsX - 5, yPos - 4, 90, 12, 'S');

  addText('BALANCE DUE:', totalsX, yPos + 3, { fontSize: 11, fontStyle: 'bold', color: COLORS.dark });
  addText(formatCurrency(data.remainingAmount), totalsValueX, yPos + 3, { fontSize: 12, fontStyle: 'bold', align: 'right', color: COLORS.dark });

  yPos += 20;

  // ============================================
  // PAYMENT INFO BOX
  // ============================================
  setFillColor(COLORS.light);
  doc.rect(margin, yPos - 3, (pageWidth - margin * 2) / 2 - 5, 30, 'F');

  addText('PAYMENT DETAILS', col1X + 3, yPos + 2, { fontSize: 9, fontStyle: 'bold', color: COLORS.primary });
  addText(`Total Amount: Rs. ${formatCurrency(data.totalCost)}`, col1X + 3, yPos + 10, { fontSize: 9, color: COLORS.dark });
  addText(`Advance Paid: Rs. ${formatCurrency(data.advanceAmount)}`, col1X + 3, yPos + 18, { fontSize: 9, color: COLORS.success });
  addText(`Balance Due: Rs. ${formatCurrency(data.remainingAmount)}`, col1X + 3, yPos + 26, { fontSize: 9, fontStyle: 'bold', color: COLORS.primary });

  yPos += 38;

  // ============================================
  // TERMS & CONDITIONS
  // ============================================
  yPos = drawLine(yPos, COLORS.muted);

  addText('Terms & Conditions:', col1X, yPos, { fontSize: 9, fontStyle: 'bold', color: COLORS.dark });
  yPos += 6;

  const terms = [
    '1. Advance payment is non-refundable.',
    '2. Balance amount to be paid on delivery.',
    '3. Please collect your order on the expected delivery date.',
    '4. Alterations available within 7 days of delivery.',
  ];

  terms.forEach((term) => {
    addText(term, col1X, yPos, { fontSize: 8, color: COLORS.muted });
    yPos += 5;
  });

  yPos += 8;

  // ============================================
  // SIGNATURE LINE
  // ============================================
  addText('Authorized Signature:', pageWidth - margin - 60, yPos, { fontSize: 9, color: COLORS.muted });
  doc.line(pageWidth - margin - 60, yPos + 15, pageWidth - margin, yPos + 15);

  // ============================================
  // FOOTER
  // ============================================
  // Footer bar
  setFillColor(COLORS.dark);
  doc.rect(0, pageHeight - 20, pageWidth, 20, 'F');

  addText('Thank you for your business!', pageWidth / 2, pageHeight - 12, {
    fontSize: 10,
    fontStyle: 'italic',
    align: 'center',
    color: COLORS.white,
  });

  if (data.companyAddress) {
    addText(data.companyAddress, pageWidth / 2, pageHeight - 6, {
      fontSize: 8,
      align: 'center',
      color: COLORS.light,
    });
  }

  return doc;
}

/**
 * Download the invoice as PDF
 */
export function downloadInvoice(data: InvoiceData): void {
  const doc = generateInvoicePDF(data);
  const filename = `Invoice_${data.invoiceNo}_${data.customerName.replace(/\s+/g, '_')}.pdf`;
  doc.save(filename);
}

/**
 * Open the invoice in a new tab for printing
 */
export function printInvoice(data: InvoiceData): void {
  const doc = generateInvoicePDF(data);
  const pdfBlob = doc.output('blob');
  const pdfUrl = URL.createObjectURL(pdfBlob);

  const printWindow = window.open(pdfUrl, '_blank');
  if (printWindow) {
    printWindow.onload = () => {
      printWindow.print();
    };
  }
}

/**
 * Get invoice as base64 string (for storage)
 */
export function getInvoiceBase64(data: InvoiceData): string {
  const doc = generateInvoicePDF(data);
  return doc.output('datauristring');
}
