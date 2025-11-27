# EmailJS Order Ready Template Setup Guide

## Overview
This guide will help you create a professional email template in EmailJS for "Order Ready for Pickup" notifications.

## Step 1: Login to EmailJS

1. Go to https://www.emailjs.com/
2. Login to your EmailJS account (you should already have one from the tailor credentials setup)

## Step 2: Create New Email Template

1. In EmailJS Dashboard, click **Email Templates** in the left sidebar
2. Click **Create New Template** button
3. You'll see a template editor

## Step 3: Copy This Email Template

### Subject Line:
```
Your Order {{order_number}} is Ready for Pickup! 🎉
```

### Email Body (HTML):
```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Order Ready for Pickup</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
    <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
            <td align="center" style="padding: 40px 0;">
                <table role="presentation" style="width: 600px; border-collapse: collapse; background-color: #ffffff; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">
                                Order Ready! 🎉
                            </h1>
                        </td>
                    </tr>

                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px 30px;">
                            <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #333333;">
                                Dear <strong>{{customer_name}}</strong>,
                            </p>

                            <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #333333;">
                                Great news! Your order is ready for pickup.
                            </p>

                            <!-- Order Details Box -->
                            <table role="presentation" style="width: 100%; border-collapse: collapse; margin: 30px 0; background-color: #f8f9fa; border-radius: 8px;">
                                <tr>
                                    <td style="padding: 20px; border-left: 4px solid #667eea;">
                                        <p style="margin: 0 0 10px; font-size: 14px; color: #666666; text-transform: uppercase; letter-spacing: 1px;">
                                            Order Number
                                        </p>
                                        <p style="margin: 0; font-size: 24px; font-weight: bold; color: #667eea;">
                                            {{order_number}}
                                        </p>
                                    </td>
                                </tr>
                            </table>

                            <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #333333;">
                                Your order has been completed and is ready for collection at your convenience.
                            </p>

                            <!-- Pickup Instructions -->
                            <table role="presentation" style="width: 100%; border-collapse: collapse; margin: 30px 0; background-color: #e8f5e9; border-radius: 8px;">
                                <tr>
                                    <td style="padding: 20px;">
                                        <p style="margin: 0 0 15px; font-size: 16px; font-weight: bold; color: #2e7d32;">
                                            📍 Pickup Instructions:
                                        </p>
                                        <ul style="margin: 0; padding-left: 20px; color: #333333; font-size: 14px; line-height: 1.8;">
                                            <li>Please bring your order number when collecting</li>
                                            <li>Visit us during business hours</li>
                                            <li>If you have any questions, feel free to contact us</li>
                                        </ul>
                                    </td>
                                </tr>
                            </table>

                            <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #333333;">
                                We look forward to seeing you soon!
                            </p>

                            <p style="margin: 0 0 10px; font-size: 16px; line-height: 1.6; color: #333333;">
                                Thank you for choosing <strong>{{company_name}}</strong>!
                            </p>

                            <p style="margin: 0; font-size: 16px; line-height: 1.6; color: #666666;">
                                Best regards,<br>
                                <strong>{{company_name}}</strong> Team
                            </p>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f8f9fa; padding: 30px; text-align: center; border-top: 1px solid #e0e0e0;">
                            <p style="margin: 0 0 10px; font-size: 14px; color: #666666;">
                                This is an automated notification from {{company_name}}
                            </p>
                            <p style="margin: 0; font-size: 12px; color: #999999;">
                                Please do not reply to this email
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
```

## Step 4: Configure Template Variables

Make sure these variables are defined in your template:

1. **{{to_email}}** - Automatically filled by EmailJS (recipient email)
2. **{{customer_name}}** - Customer's name
3. **{{order_number}}** - Order number (e.g., SO0001)
4. **{{company_name}}** - Your tailor shop name

## Step 5: Save and Get Template ID

1. Click **Save** button
2. You'll see your Template ID (e.g., `template_abc123xyz`)
3. Copy this Template ID

## Step 6: Update Your Code

1. Open `src/lib/emailService.ts`
2. Find this line:
   ```typescript
   const EMAILJS_ORDER_READY_TEMPLATE_ID = 'template_order_ready'; // UPDATE THIS!
   ```
3. Replace `'template_order_ready'` with your actual Template ID:
   ```typescript
   const EMAILJS_ORDER_READY_TEMPLATE_ID = 'template_abc123xyz'; // Your actual ID
   ```
4. Save the file

## Step 7: Test the Email

1. Create a test customer with an email address
2. Create a test order for that customer
3. Login as a tailor
4. Accept the order
5. Mark it as "Ready to Deliver"
6. Check the customer's email inbox

## Expected Result

The customer will receive a beautiful, professional email with:
- ✅ Subject: "Your Order SO0001 is Ready for Pickup! 🎉"
- ✅ Personalized greeting with customer name
- ✅ Order number prominently displayed
- ✅ Clear pickup instructions
- ✅ Professional branding with your company name
- ✅ Mobile-responsive design

## Troubleshooting

### Email not sending?
1. Check console logs for error messages
2. Verify Template ID is correct in emailService.ts
3. Verify customer has email address in their profile
4. Check EmailJS dashboard for quota limits (free tier: 200 emails/month)

### Wrong template being used?
- Make sure you updated `EMAILJS_ORDER_READY_TEMPLATE_ID` and NOT `EMAILJS_TEMPLATE_ID`
- `EMAILJS_TEMPLATE_ID` is for login credentials
- `EMAILJS_ORDER_READY_TEMPLATE_ID` is for order ready notifications

### Template variables not working?
- In EmailJS template editor, make sure you're using double curly braces: `{{variable}}`
- Variable names are case-sensitive
- Make sure there are no typos in variable names

## Customization Options

### Change Colors:
- Header gradient: Modify the `background` style in the header `<td>`
- Order box color: Change `border-left` color in order details table
- Pickup instructions box: Modify `background-color` in pickup instructions table

### Add Your Logo:
Add this inside the header `<td>` before the `<h1>`:
```html
<img src="YOUR_LOGO_URL" alt="Logo" style="max-width: 150px; margin-bottom: 20px;">
```

### Add Contact Information:
Add this in the footer section:
```html
<p style="margin: 10px 0 0; font-size: 14px; color: #666666;">
    📞 Phone: +91 1234567890<br>
    📍 Address: Your Shop Address
</p>
```

### Add Business Hours:
Add this in the pickup instructions:
```html
<li>Business Hours: Mon-Sat: 9:00 AM - 7:00 PM</li>
```

## Alternative: Simple Text Template

If you prefer a simpler text-only email:

### Subject:
```
Your Order {{order_number}} is Ready - {{company_name}}
```

### Body (Plain Text):
```
Dear {{customer_name}},

Great news! Your order is ready for pickup! 🎉

Order Number: {{order_number}}

Your order has been completed and is ready for collection at your convenience.

Pickup Instructions:
• Please bring your order number when collecting
• Visit us during business hours
• If you have any questions, feel free to contact us

We look forward to seeing you soon!

Thank you for choosing {{company_name}}!

Best regards,
{{company_name}} Team

---
This is an automated notification from {{company_name}}
Please do not reply to this email
```

## EmailJS Quota

**Free Tier:**
- 200 emails per month
- Perfect for small tailor shops

**Paid Plans:**
- If you need more emails, upgrade in EmailJS dashboard
- Starting from $8/month for 1,000 emails

## Support

- EmailJS Documentation: https://www.emailjs.com/docs/
- EmailJS Support: https://www.emailjs.com/docs/support/

---

**Your current configuration:**
- Service ID: `service_ht4eaid` ✅
- Login Template ID: `template_m9e5s77` ✅
- Order Ready Template ID: `template_order_ready` ⚠️ **UPDATE THIS!**
- Public Key: `F8J6cBceIuPl-P8K_` ✅
