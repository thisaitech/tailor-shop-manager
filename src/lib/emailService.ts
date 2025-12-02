/**
 * Email Service for sending automated emails using EmailJS
 *
 * Setup Instructions:
 * 1. Create an account at https://www.emailjs.com/
 * 2. Create an email service (Gmail, Outlook, etc.)
 * 3. Create an email template with these variables:
 *    - to_email: {{to_email}}
 *    - employee_name: {{employee_name}}
 *    - login_id: {{login_id}}
 *    - temporary_password: {{temporary_password}}
 *    - company_name: {{company_name}}
 * 4. Get your Service ID, Template ID, and Public Key
 * 5. Add them to your environment variables or update below
 */

import emailjs from '@emailjs/browser';

export interface TailorCredentialsEmail {
  to: string; // Employee email
  employeeName: string;
  loginId: string; // Phone number
  temporaryPassword: string;
  companyName?: string;
}

// EmailJS Configuration
// TODO: Move these to environment variables (.env file)
const EMAILJS_SERVICE_ID = 'service_mcafiwp'; // EmailJS Service ID
const EMAILJS_TEMPLATE_ID = 'template_m9e5s77'; // EmailJS Template ID for Login Credentials
const EMAILJS_ORDER_READY_TEMPLATE_ID = 'template_mplk0h5'; // EmailJS Template ID for Order Ready
const EMAILJS_ORDER_REJECTION_TEMPLATE_ID = 'template_rbb1in8'; // EmailJS Template ID for Order Rejection
const EMAILJS_PUBLIC_KEY = 'TxNnIT-hcwiT9E4p7'; // EmailJS Public Key

// Initialize EmailJS with public key
emailjs.init(EMAILJS_PUBLIC_KEY);

/**
 * Send login credentials email to tailor using EmailJS
 * @param data - Email data containing credentials
 * @returns Promise<boolean> - true if email sent successfully
 */
export async function sendTailorCredentialsEmail(
  data: TailorCredentialsEmail
): Promise<boolean> {
  try {
    console.log('========================================');
    console.log('[Email Service] Sending Tailor Credentials Email via EmailJS');
    console.log('========================================');
    console.log('To:', data.to);
    console.log('Employee Name:', data.employeeName);
    console.log('Login ID (Phone):', data.loginId);
    console.log('Temporary Password:', data.temporaryPassword);
    if (data.companyName) {
      console.log('Company:', data.companyName);
    }
    console.log('========================================');

    // Check if EmailJS is configured (skip check - always send in production)
    if (false) {
      console.warn('[Email Service] ⚠️ EmailJS not configured. Email not sent.');
      console.log('[Email Service] To configure EmailJS:');
      console.log('1. Sign up at https://www.emailjs.com/');
      console.log('2. Create an email service and template');
      console.log('3. Update EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, and EMAILJS_PUBLIC_KEY in emailService.ts');
      console.log('');
      console.log('📧 Email Preview:');
      console.log('Subject: Your Tailor Login Credentials');
      console.log('');
      console.log(`Dear ${data.employeeName},`);
      console.log('');
      console.log('Welcome to the Tailor Management System!');
      console.log('');
      console.log('Your login details are:');
      console.log(`  Login ID (Phone Number): ${data.loginId}`);
      console.log(`  Temporary Password: ${data.temporaryPassword}`);
      console.log('');
      console.log('Please log in and change your password immediately.');
      console.log('');
      console.log(`Thank you,`);
      console.log(`${data.companyName || 'Management Team'}`);
      console.log('========================================');

      // Return true for development (so the flow continues)
      return true;
    }

    // Prepare template parameters for EmailJS
    const templateParams = {
      to_email: data.to,
      employee_name: data.employeeName,
      login_id: data.loginId,
      temporary_password: data.temporaryPassword,
      company_name: data.companyName || 'Tailor Management System',
    };

    // Send email using EmailJS
    const response = await emailjs.send(
      EMAILJS_SERVICE_ID,
      EMAILJS_TEMPLATE_ID,
      templateParams
    );

    if (response.status === 200) {
      console.log('[Email Service] ✅ Email sent successfully via EmailJS');
      console.log('[Email Service] Response:', response.text);
      return true;
    } else {
      console.error('[Email Service] ❌ EmailJS returned non-200 status:', response.status);
      return false;
    }
  } catch (error) {
    console.error('[Email Service] ❌ Error sending email via EmailJS:', error);
    return false;
  }
}

/**
 * Order Ready Email Interface
 */
export interface OrderReadyEmail {
  to: string; // Customer email
  customerName: string;
  orderNumber: string;
  companyName?: string;
}

/**
 * Send order ready email to customer using EmailJS
 * @param data - Email data
 * @returns Promise<boolean> - true if email sent successfully
 */
export async function sendOrderReadyEmail(
  data: OrderReadyEmail
): Promise<boolean> {
  try {
    console.log('========================================');
    console.log('[Email Service] Sending Order Ready Email via EmailJS');
    console.log('========================================');
    console.log('To:', data.to);
    console.log('Customer Name:', data.customerName);
    console.log('Order Number:', data.orderNumber);
    if (data.companyName) {
      console.log('Company:', data.companyName);
    }
    console.log('========================================');

    // Check if EmailJS is configured (skip check - always send in production)
    if (false) {
      console.warn('[Email Service] ⚠️ EmailJS Order Ready Template not configured. Email not sent.');
      console.log('[Email Service] To configure EmailJS for Order Ready notifications:');
      console.log('1. Go to https://www.emailjs.com/ and login');
      console.log('2. Create a new email template for "Order Ready for Pickup"');
      console.log('3. Copy the Template ID and update EMAILJS_ORDER_READY_TEMPLATE_ID in emailService.ts');
      console.log('');
      console.log('Template Variables to use in EmailJS:');
      console.log('  - {{to_email}} - Customer email address');
      console.log('  - {{customer_name}} - Customer name');
      console.log('  - {{order_number}} - Order number');
      console.log('  - {{company_name}} - Your company/shop name');
      console.log('');
      console.log('📧 Email Preview:');
      console.log('Subject: Your Order is Ready for Pickup');
      console.log('');
      console.log(`Dear ${data.customerName},`);
      console.log('');
      console.log('Great news! Your order is ready! 🎉');
      console.log('');
      console.log(`Order Number: ${data.orderNumber}`);
      console.log('');
      console.log('Your order has been completed and is ready for pickup.');
      console.log('Please visit us at your convenience to collect your order.');
      console.log('');
      console.log('We look forward to seeing you soon!');
      console.log('');
      console.log(`Thank you for choosing ${data.companyName || 'us'}!`);
      console.log('');
      console.log(`Best regards,`);
      console.log(`${data.companyName || 'Tailor Shop'} Team`);
      console.log('========================================');

      // Return true for development (so the flow continues)
      return true;
    }

    // Prepare template parameters for EmailJS
    const templateParams = {
      to_email: data.to,
      customer_name: data.customerName,
      order_number: data.orderNumber,
      company_name: data.companyName || 'Tailor Shop',
    };

    // Send email using EmailJS with Order Ready Template
    const response = await emailjs.send(
      EMAILJS_SERVICE_ID,
      EMAILJS_ORDER_READY_TEMPLATE_ID, // Use separate template for order ready
      templateParams
    );

    if (response.status === 200) {
      console.log('[Email Service] ✅ Order ready email sent successfully via EmailJS');
      console.log('[Email Service] Response:', response.text);
      return true;
    } else {
      console.error('[Email Service] ❌ EmailJS returned non-200 status:', response.status);
      return false;
    }
  } catch (error) {
    console.error('[Email Service] ❌ Error sending order ready email via EmailJS:', error);
    return false;
  }
}

/**
 * Order Rejection Email Interface
 */
export interface OrderRejectionEmail {
  to: string; // Admin email
  adminName?: string;
  orderNumber: string;
  jobWorkNo: string;
  vendorName: string;
  vendorPhone: string;
  customerName: string;
  dressType?: string;
  rejectionDate: string;
  companyName?: string;
}

/**
 * Send order rejection email to admin using EmailJS
 * @param data - Email data
 * @returns Promise<boolean> - true if email sent successfully
 */
export async function sendOrderRejectionEmail(
  data: OrderRejectionEmail
): Promise<boolean> {
  try {
    console.log('========================================');
    console.log('[Email Service] Sending Order Rejection Email via EmailJS');
    console.log('========================================');
    console.log('To:', data.to);
    console.log('Admin Name:', data.adminName || 'Admin');
    console.log('Order Number:', data.orderNumber);
    console.log('Job Work No:', data.jobWorkNo);
    console.log('Vendor:', data.vendorName);
    console.log('Customer:', data.customerName);
    console.log('Rejection Date:', data.rejectionDate);
    console.log('========================================');

    // Check if EmailJS is configured (skip check - always send in production)
    if (false) {
      console.warn('[Email Service] ⚠️ EmailJS Order Rejection Template not configured. Email not sent.');
      console.log('[Email Service] To configure EmailJS for Order Rejection notifications:');
      console.log('1. Go to https://www.emailjs.com/ and login');
      console.log('2. Create a new email template for "Order Rejection Notification"');
      console.log('3. Copy the Template ID and update EMAILJS_ORDER_REJECTION_TEMPLATE_ID in emailService.ts');
      console.log('');
      console.log('Template Variables to use in EmailJS:');
      console.log('  - {{to_email}} - Admin email address');
      console.log('  - {{admin_name}} - Admin name');
      console.log('  - {{order_number}} - Order number');
      console.log('  - {{job_work_no}} - Job work number');
      console.log('  - {{vendor_name}} - Vendor/Tailor name who rejected');
      console.log('  - {{vendor_phone}} - Vendor phone number');
      console.log('  - {{customer_name}} - Customer name');
      console.log('  - {{dress_type}} - Type of dress');
      console.log('  - {{rejection_date}} - Date of rejection');
      console.log('  - {{company_name}} - Your company/shop name');
      console.log('');
      console.log('📧 Email Preview:');
      console.log('Subject: ⚠️ Order Rejected by Tailor - Action Required');
      console.log('');
      console.log(`Dear ${data.adminName || 'Admin'},`);
      console.log('');
      console.log('An order has been rejected by the assigned tailor and requires your immediate attention.');
      console.log('');
      console.log('Order Details:');
      console.log(`  Order Number: ${data.orderNumber}`);
      console.log(`  Job Work No: ${data.jobWorkNo}`);
      console.log(`  Customer Name: ${data.customerName}`);
      console.log(`  Dress Type: ${data.dressType || 'N/A'}`);
      console.log('');
      console.log('Rejection Details:');
      console.log(`  Rejected By: ${data.vendorName}`);
      console.log(`  Tailor Phone: ${data.vendorPhone}`);
      console.log(`  Rejection Date: ${data.rejectionDate}`);
      console.log('');
      console.log('Please contact the tailor to understand the reason for rejection and reassign the order to another tailor.');
      console.log('');
      console.log(`Best regards,`);
      console.log(`${data.companyName || 'Tailor Shop'} System`);
      console.log('========================================');

      // Return true for development (so the flow continues)
      return true;
    }

    // Prepare template parameters for EmailJS
    const templateParams = {
      to_email: data.to,
      admin_name: data.adminName || 'Admin',
      order_number: data.orderNumber,
      job_work_no: data.jobWorkNo,
      vendor_name: data.vendorName,
      vendor_phone: data.vendorPhone,
      customer_name: data.customerName,
      dress_type: data.dressType || 'N/A',
      rejection_date: data.rejectionDate,
      company_name: data.companyName || 'Tailor Shop',
    };

    // Send email using EmailJS with Order Rejection Template
    const response = await emailjs.send(
      EMAILJS_SERVICE_ID,
      EMAILJS_ORDER_REJECTION_TEMPLATE_ID,
      templateParams
    );

    if (response.status === 200) {
      console.log('[Email Service] ✅ Order rejection email sent successfully via EmailJS');
      console.log('[Email Service] Response:', response.text);
      return true;
    } else {
      console.error('[Email Service] ❌ EmailJS returned non-200 status:', response.status);
      return false;
    }
  } catch (error) {
    console.error('[Email Service] ❌ Error sending order rejection email via EmailJS:', error);
    return false;
  }
}

/**
 * Get email HTML template for tailor credentials
 */
export function getTailorCredentialsEmailTemplate(data: TailorCredentialsEmail): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background-color: #4F46E5;
      color: white;
      padding: 20px;
      text-align: center;
      border-radius: 5px 5px 0 0;
    }
    .content {
      background-color: #f9f9f9;
      padding: 30px;
      border: 1px solid #ddd;
      border-top: none;
      border-radius: 0 0 5px 5px;
    }
    .credentials {
      background-color: white;
      padding: 15px;
      border-left: 4px solid #4F46E5;
      margin: 20px 0;
    }
    .credentials p {
      margin: 10px 0;
      font-size: 14px;
    }
    .credentials strong {
      color: #4F46E5;
      font-size: 16px;
    }
    .warning {
      background-color: #fff3cd;
      border-left: 4px solid #ffc107;
      padding: 10px;
      margin: 20px 0;
    }
    .footer {
      text-align: center;
      margin-top: 20px;
      font-size: 12px;
      color: #666;
    }
  </style>
</head>
<body>
  <div class="header">
    <h2>Welcome to ${data.companyName || 'Tailor Management System'}</h2>
  </div>
  <div class="content">
    <p>Dear <strong>${data.employeeName}</strong>,</p>

    <p>Your employee account has been successfully created. You can now access the Employee Portal using the credentials below:</p>

    <div class="credentials">
      <p><strong>Login ID (Phone Number):</strong> ${data.loginId}</p>
      <p><strong>Temporary Password:</strong> ${data.temporaryPassword}</p>
    </div>

    <div class="warning">
      <p><strong>⚠️ Important:</strong> Please log in and change your password immediately after your first login for security purposes.</p>
    </div>

    <p>If you have any questions or need assistance, please contact your administrator.</p>

    <p>Thank you,<br>${data.companyName || 'Management Team'}</p>
  </div>
  <div class="footer">
    <p>This is an automated message. Please do not reply to this email.</p>
  </div>
</body>
</html>
  `;
}

/**
 * Get email HTML template for order rejection notification
 */
export function getOrderRejectionEmailTemplate(data: OrderRejectionEmail): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background-color: #DC2626;
      color: white;
      padding: 20px;
      text-align: center;
      border-radius: 5px 5px 0 0;
    }
    .header h2 {
      margin: 0;
      font-size: 20px;
    }
    .content {
      background-color: #f9f9f9;
      padding: 30px;
      border: 1px solid #ddd;
      border-top: none;
      border-radius: 0 0 5px 5px;
    }
    .alert-box {
      background-color: #FEF2F2;
      border-left: 4px solid #DC2626;
      padding: 15px;
      margin: 20px 0;
    }
    .alert-box p {
      margin: 5px 0;
      color: #991B1B;
      font-weight: 500;
    }
    .details-section {
      background-color: white;
      padding: 20px;
      border: 1px solid #E5E7EB;
      border-radius: 5px;
      margin: 20px 0;
    }
    .details-section h3 {
      color: #1F2937;
      font-size: 16px;
      margin: 0 0 15px 0;
      border-bottom: 2px solid #DC2626;
      padding-bottom: 8px;
    }
    .detail-row {
      display: flex;
      padding: 8px 0;
      border-bottom: 1px solid #F3F4F6;
    }
    .detail-row:last-child {
      border-bottom: none;
    }
    .detail-label {
      font-weight: 600;
      color: #6B7280;
      min-width: 140px;
      font-size: 14px;
    }
    .detail-value {
      color: #1F2937;
      font-size: 14px;
    }
    .action-box {
      background-color: #FEF3C7;
      border-left: 4px solid #F59E0B;
      padding: 15px;
      margin: 20px 0;
    }
    .action-box p {
      margin: 5px 0;
      color: #78350F;
    }
    .action-box strong {
      color: #92400E;
    }
    .footer {
      text-align: center;
      margin-top: 20px;
      font-size: 12px;
      color: #666;
      padding-top: 20px;
      border-top: 1px solid #E5E7EB;
    }
  </style>
</head>
<body>
  <div class="header">
    <h2>⚠️ Order Rejection Alert - Action Required</h2>
  </div>
  <div class="content">
    <p>Dear <strong>${data.adminName || 'Admin'}</strong>,</p>

    <div class="alert-box">
      <p>An order has been <strong>REJECTED</strong> by the assigned tailor and requires your immediate attention.</p>
    </div>

    <div class="details-section">
      <h3>Order Information</h3>
      <div class="detail-row">
        <span class="detail-label">Order Number:</span>
        <span class="detail-value"><strong>${data.orderNumber}</strong></span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Job Work No:</span>
        <span class="detail-value"><strong>${data.jobWorkNo}</strong></span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Customer Name:</span>
        <span class="detail-value">${data.customerName}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Dress Type:</span>
        <span class="detail-value">${data.dressType || 'N/A'}</span>
      </div>
    </div>

    <div class="details-section">
      <h3>Rejection Details</h3>
      <div class="detail-row">
        <span class="detail-label">Rejected By:</span>
        <span class="detail-value"><strong>${data.vendorName}</strong></span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Tailor Phone:</span>
        <span class="detail-value">${data.vendorPhone}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Rejection Date:</span>
        <span class="detail-value">${data.rejectionDate}</span>
      </div>
    </div>

    <div class="action-box">
      <p><strong>Required Actions:</strong></p>
      <p>1. Contact the tailor at <strong>${data.vendorPhone}</strong> to understand the reason for rejection</p>
      <p>2. Review the order details and make necessary adjustments</p>
      <p>3. Reassign the order to another available tailor</p>
      <p>4. Inform the customer about any potential delays</p>
    </div>

    <p>You can view and manage this order from the <strong>Admin Dashboard → New Order → Rejected Orders</strong> section.</p>

    <p>Please address this issue promptly to avoid customer dissatisfaction.</p>

    <p>Best regards,<br><strong>${data.companyName || 'Tailor Shop'}</strong> Notification System</p>
  </div>
  <div class="footer">
    <p>This is an automated notification. Please do not reply to this email.</p>
    <p>&copy; ${new Date().getFullYear()} ${data.companyName || 'Tailor Shop'}. All rights reserved.</p>
  </div>
</body>
</html>
  `;
}
