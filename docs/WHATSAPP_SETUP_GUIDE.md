# WhatsApp Integration & Setup Guide

This app implements a modular WhatsApp Provider Service layer. You can use:
1. **Meta WhatsApp Business Cloud API** (Direct official Meta API - recommended for production)
2. **Mock Provider** (Default in development, simulates sending and delivery logs with zero external dependencies)
3. **Third-Party Providers** (Gupshup, WATI, Interakt, AiSensy - pre-architected in the provider service layer)

---

## 1. Setting Up Meta WhatsApp Business Cloud API

### Step 1: Create Meta Developer Account & App
1. Go to [developers.facebook.com](https://developers.facebook.com) and sign in.
2. Click **My Apps** > **Create App**.
3. Select **Other** > **Business** application type.
4. Name your app (e.g., `Apex Institute WhatsApp Alert`) and link your Meta Business Account.

### Step 2: Add WhatsApp Product
1. Under **Add products to your app**, locate **WhatsApp** and click **Set up**.
2. Under the WhatsApp menu on the left sidebar, click **API Setup** (or **Getting Started**).
3. You will see:
   - **Temporary access token** (valid for 24h for initial testing) or create a **System User Permanent Access Token**.
   - **Phone number ID** (e.g., `105938472910293`).
   - **WhatsApp Business Account ID** (e.g., `109283746192834`).
   - A **Test Phone Number** provided by Meta to send test messages to up to 5 verified numbers.

### Step 3: Register an Approved Message Template in Meta
WhatsApp requires pre-approved templates for business-initiated outbound alerts to parents.

1. Go to **WhatsApp Manager** > **Account Tools** > **Message Templates**.
2. Click **Create Template**.
3. Fill in the details:
   - **Category**: `Utility`
   - **Name**: `student_absence_alert`
   - **Language**: `English (US)` or `Hindi`
   - **Body**:
     ```text
     Dear {{1}}, {{2}} was absent from {{3}} on {{4}}. - {{5}}
     ```
     Where:
     - `{{1}}` = Parent Name (e.g., Ramesh Verma)
     - `{{2}}` = Student Name (e.g., Ananya Verma)
     - `{{3}}` = Batch Name (e.g., Class 10 Physics)
     - `{{4}}` = Date (e.g., 15 Nov 2026)
     - `{{5}}` = Institute Name (e.g., Apex Coaching)
4. Submit for review (Utility templates are usually auto-approved within 1-5 minutes).

### Step 4: Configure Backend Environment Variables
In `backend/.env`:
```ini
# WhatsApp Provider: 'meta' | 'gupshup' | 'wati' | 'interakt' | 'aisensy' | 'mock'
WHATSAPP_PROVIDER=meta

# Meta Cloud API Credentials
META_WHATSAPP_TOKEN=EAABwz...your_system_user_access_token_here...
META_PHONE_NUMBER_ID=105938472910293
META_WHATSAPP_TEMPLATE_NAME=student_absence_alert
META_WHATSAPP_LANGUAGE_CODE=en_US

# Institute details for message footer
INSTITUTE_NAME=Apex Coaching Institute
```

---

## 2. Using the Mock Provider for Local Development / Testing
To test the entire workflow without needing real WhatsApp credentials:
In `backend/.env`:
```ini
WHATSAPP_PROVIDER=mock
```
- In `mock` mode, the server logs every sent message in the database with status `Sent` and a simulated provider message ID.
- Test failures can be simulated by adding `+910000000000` to a student, allowing you to test the "Retry failed" button and the "Send via WhatsApp App (`wa.me`)" manual fallback!

---

## 3. Provider Architecture (Pluggable Service Layer)

All WhatsApp logic is decoupled behind the `WhatsAppProvider` interface:
```text
                  +-------------------------+
                  |    WhatsAppService      |
                  +-------------------------+
                               |
            +------------------+------------------+
            |                  |                  |
+----------------------+ +-----------------+ +-------------------+
|  MetaCloudProvider   | |  MockProvider   | | Gupshup / WATI /  |
|  (WhatsApp Cloud)    | |  (Dev & Test)   | | Interakt / AiSensy|
+----------------------+ +-----------------+ +-------------------+
```

Each provider implements:
```javascript
sendTemplateMessage({ to, templateName, languageCode, parameters, fallbackText })
```

To switch providers, simply change `WHATSAPP_PROVIDER=<provider_name>` in `.env`.
