/**
 * Email Service for sending automated emails using EmailJS
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
const EMAILJS_SERVICE_ID = 'service_mcafiwp';
const EMAILJS_TEMPLATE_ID = 'template_m9e5s77';
const EMAILJS_ORDER_READY_TEMPLATE_ID = 'template_mplk0h5';
const EMAILJS_ORDER_REJECTION_TEMPLATE_ID = 'template_rbb1in8';
const EMAILJS_PUBLIC_KEY = 'TxNnIT-hcwiT9E4p7';

// Initialize EmailJS with public key
// Note: In React Native, this might need to be called inside useEffect or component
try {
    emailjs.init(EMAILJS_PUBLIC_KEY);
} catch (e) {
    console.warn('[EmailService] Failed to init EmailJS (might be non-browser env):', e);
}

export async function sendTailorCredentialsEmail(
    data: TailorCredentialsEmail
): Promise<boolean> {
    try {
        console.log('[Email Service] Sending Tailor Credentials Email via EmailJS');

        const templateParams = {
            to_email: data.to,
            employee_name: data.employeeName,
            login_id: data.loginId,
            temporary_password: data.temporaryPassword,
            company_name: data.companyName || 'Tailor Management System',
        };

        const response = await emailjs.send(
            EMAILJS_SERVICE_ID,
            EMAILJS_TEMPLATE_ID,
            templateParams
        );

        if (response.status === 200) {
            console.log('[Email Service] ✅ Email sent successfully');
            return true;
        } else {
            console.error('[Email Service] ❌ EmailJS returned non-200 status:', response.status);
            return false;
        }
    } catch (error) {
        console.error('[Email Service] ❌ Error sending email:', error);
        return false;
    }
}

export interface OrderReadyEmail {
    to: string;
    customerName: string;
    orderNumber: string;
    companyName?: string;
}

export async function sendOrderReadyEmail(
    data: OrderReadyEmail
): Promise<boolean> {
    try {
        console.log('[Email Service] Sending Order Ready Email via EmailJS');

        const templateParams = {
            to_email: data.to,
            customer_name: data.customerName,
            order_number: data.orderNumber,
            company_name: data.companyName || 'Tailor Shop',
        };

        const response = await emailjs.send(
            EMAILJS_SERVICE_ID,
            EMAILJS_ORDER_READY_TEMPLATE_ID,
            templateParams
        );

        if (response.status === 200) {
            console.log('[Email Service] ✅ Order ready email sent successfully');
            return true;
        } else {
            console.error('[Email Service] ❌ EmailJS returned non-200 status:', response.status);
            return false;
        }
    } catch (error) {
        console.error('[Email Service] ❌ Error sending order ready email:', error);
        return false;
    }
}

export interface OrderRejectionEmail {
    to: string;
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

export async function sendOrderRejectionEmail(
    data: OrderRejectionEmail
): Promise<boolean> {
    try {
        console.log('[Email Service] Sending Order Rejection Email via EmailJS');

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

        const response = await emailjs.send(
            EMAILJS_SERVICE_ID,
            EMAILJS_ORDER_REJECTION_TEMPLATE_ID,
            templateParams
        );

        if (response.status === 200) {
            console.log('[Email Service] ✅ Order rejection email sent successfully');
            return true;
        } else {
            console.error('[Email Service] ❌ EmailJS returned non-200 status:', response.status);
            return false;
        }
    } catch (error) {
        console.error('[Email Service] ❌ Error sending order rejection email:', error);
        return false;
    }
}
