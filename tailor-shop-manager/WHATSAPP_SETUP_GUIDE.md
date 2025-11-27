# WhatsApp Notification Setup Guide

## Overview
Your tailor shop application now supports sending WhatsApp notifications automatically when orders are marked as "Ready to Deliver". The system automatically sends both email and WhatsApp messages to customers.

## Setup Options

### Option 1: WhatsApp Cloud API (FREE - Recommended)

Meta's WhatsApp Cloud API is **100% FREE for testing** and perfect for your tailor shop!

#### Step-by-Step Setup:

1. **Go to Meta for Developers**
   - Visit: https://developers.facebook.com/apps/
   - Log in with your Facebook account

2. **Create a New App**
   - Click "Create App"
   - Select "Business" as app type
   - Fill in app details (name, email, etc.)

3. **Add WhatsApp Product**
   - In your app dashboard, find "Add Products"
   - Click "Set Up" on WhatsApp
   - Follow the setup wizard

4. **Get Your Credentials**
   - Go to WhatsApp > API Setup
   - You'll see:
     - **Phone Number ID** (looks like: 123456789012345)
     - **Access Token** (temporary token provided for testing)

   📝 **Important**: The temporary access token expires. For production, create a permanent token:
   - Go to WhatsApp > API Setup > Generate Token
   - Copy the permanent access token

5. **Add Test Phone Number**
   - In WhatsApp > API Setup, scroll to "To" section
   - Click "Manage phone number list"
   - Add your test phone numbers (customers' numbers)
   - Verify them with OTP sent via WhatsApp

6. **Update .env File**
   ```bash
   VITE_WHATSAPP_PHONE_NUMBER_ID="your_phone_number_id_here"
   VITE_WHATSAPP_ACCESS_TOKEN="your_access_token_here"
   ```

7. **Restart Your Application**
   ```bash
   npm run dev
   ```

#### Testing:
1. Login as a tailor
2. Accept an order
3. Mark it as "Ready to Deliver"
4. Check console logs for WhatsApp API response
5. Customer should receive WhatsApp message!

#### Limitations (Free Testing):
- Can send to up to 5 verified phone numbers
- Limited to text messages (can add templates later)
- Perfect for testing and small shops

#### For Production (Scale Up):
- Complete Business Verification with Meta
- Get approved for unlimited messaging
- Create message templates for faster delivery
- Still free for the first 1,000 conversations/month!

---

### Option 2: Twilio WhatsApp (Paid Service)

If you need more features or can't use Meta's API:

#### Step-by-Step Setup:

1. **Sign Up for Twilio**
   - Visit: https://console.twilio.com/
   - Create a free trial account ($15 credit)

2. **Get WhatsApp Sandbox**
   - Go to Messaging > Try it out > Send a WhatsApp message
   - Follow instructions to join sandbox
   - Get your sandbox number: `whatsapp:+14155238886`

3. **Get Your Credentials**
   - From Twilio Console homepage, copy:
     - **Account SID** (starts with AC...)
     - **Auth Token** (click to reveal)

4. **Update .env File**
   ```bash
   VITE_TWILIO_ACCOUNT_SID="your_account_sid_here"
   VITE_TWILIO_AUTH_TOKEN="your_auth_token_here"
   VITE_TWILIO_WHATSAPP_NUMBER="whatsapp:+14155238886"
   ```

5. **Restart Your Application**
   ```bash
   npm run dev
   ```

#### Pricing:
- Free trial: $15 credit
- After trial: ~$0.005 per message
- Good for high-volume shops

---

## How It Works

### Automatic Flow:
1. **Tailor marks order as ready** → System triggers notification
2. **System checks configuration** → Tries WhatsApp Cloud API first, then Twilio
3. **Sends WhatsApp message** → Customer receives notification
4. **Sends email** → Customer receives email confirmation
5. **Updates dashboard** → Order appears in "Ready to Deliver" section

### Message Format:
```
Dear [Customer Name],

Your order [Order Number] is ready for delivery! 🎉

Please visit us to collect your order at your convenience.

Thank you,
[Your Shop Name]
```

## Troubleshooting

### WhatsApp message not sending?
1. Check console logs for error messages
2. Verify phone numbers are in correct format (with country code)
3. For WhatsApp Cloud API: Ensure phone numbers are verified in Meta dashboard
4. For Twilio: Ensure customers have joined your sandbox

### Getting errors?
- Check .env file has correct credentials
- Restart the dev server after changing .env
- Check if access token has expired (WhatsApp Cloud API)

### Phone number format:
- System automatically adds India country code (+91)
- Customers can enter: 9876543210 or +919876543210
- System cleans and formats correctly

## Configuration Check

Run your app and check the console when marking an order as ready:

**If configured correctly:**
```
[Notification Service] Using WhatsApp Cloud API...
[WhatsApp Cloud API] ✅ Message sent successfully
```

**If not configured:**
```
⚠️ WhatsApp not configured.
📱 WhatsApp Message Preview:
[Shows message that would be sent]
💡 Manual WhatsApp Link: https://wa.me/...
```

## Support

- **WhatsApp Cloud API**: https://developers.facebook.com/docs/whatsapp/cloud-api/
- **Twilio**: https://www.twilio.com/docs/whatsapp
- **Your Implementation**: Check `src/lib/notificationService.ts`

---

## Quick Start (Recommended)

1. Go to https://developers.facebook.com/apps/
2. Create app → Add WhatsApp
3. Copy Phone Number ID and Access Token
4. Paste in `.env` file
5. Add test phone numbers in Meta dashboard
6. Restart app and test!

**Total setup time: 10-15 minutes** ⏱️
