# 🎓 Apex Coaching Institute Manager (PWA)

A mobile-responsive web application (installable as a PWA) designed for coaching institutes to manage student attendance, parent notifications via **WhatsApp Business Cloud API**, and fee tracking.

---

## 📌 Deliverables Overview

| Document / Component | Location | Description |
|---|---|---|
| **Database Schema** | [`docs/DATABASE_SCHEMA.md`](docs/DATABASE_SCHEMA.md) | PostgreSQL DDL with tables, indexes, constraints, and audit logs |
| **API Endpoints** | [`docs/API_ENDPOINTS.md`](docs/API_ENDPOINTS.md) | RESTful API specification with JWT auth and role protection |
| **Wireframes & UX** | [`docs/WIREFRAMES.md`](docs/WIREFRAMES.md) | Mobile layouts, sticky counters, large P/A touch targets |
| **WhatsApp Setup Guide** | [`docs/WHATSAPP_SETUP_GUIDE.md`](docs/WHATSAPP_SETUP_GUIDE.md) | Step-by-step Meta Cloud API setup, template approval, and provider swapping |
| **Backend (Node.js)** | [`backend/`](backend/) | Express, JWT, bcrypt, pluggable WhatsApp service layer, Postgres/SQLite fallback |
| **Frontend (React PWA)**| [`frontend/`](frontend/) | Mobile-first React PWA, large P/A buttons, live counter, Hindi/EN toggle |

---

## 🚀 Key Features Implemented in Phase 1

1. **Role-Based Authentication**:
   - **Admin/Owner**: Full control over batches, students, teachers, attendance records, settings, and dashboard.
   - **Teacher**: Restricted to assigned batches only; marks attendance and dispatches parent absence messages.
   - Passwords hashed with `bcryptjs`, sessions secured with JWT.

2. **Ultra-Fast Attendance Marking (Teacher)**:
   - Optimized for mobile thumb reach and low-end smartphones.
   - Batch selector & Date picker (defaults to today).
   - Student list with Roll Number and Student Name.
   - **Two Large Physical Buttons**: `P` (turns vibrant green) and `A` (turns vibrant red). **No toggle switch**.
   - **No student is pre-selected**. Submit button stays disabled until **every student** is marked.
   - **Sticky Live Counter**: Displays `Present: X | Absent: Y | Unmarked: Z`.
   - Prevents duplicate attendance for the same batch and date; allows same-day edits with audit trail.

3. **Post-Submission Absent Summary & One-Tap WhatsApp Broadcast**:
   - Displays summary: Batch name, Date, Total Present, Total Absent, and list of absent students.
   - Prominent **"Send WhatsApp to All Parents"** button.
   - Confirmation step with rendered template preview:
     > *"Dear {{parent_name}}, {{student_name}} was absent from {{batch}} on {{date}}. - {{institute_name}}"*
   - Sends automated messages directly through WhatsApp Business API **without opening WhatsApp**.
   - Automatically **disables button after sending** to prevent duplicate dispatches for the same batch and date.
   - Real-time delivery status per student (`Sent`, `Delivered`, `Failed`) with a **"Retry failed"** button.
   - **Fallback mechanism**: Small **"Send via WhatsApp app"** (`wa.me`) click-to-chat link per student for manual backup.
   - Resilient error handling (invalid phone numbers, API downtime) that **never crashes** the attendance workflow.

4. **Admin Dashboard**:
   - Date picker (default today).
   - Stat cards: Total Students, Total Present, Total Absent, Attendance Rate %.
   - **Absent students grouped by batch** (expandable cards) with parent contact and message status.
   - **Batch-wise attendance summary table** (Batch, Timing, Teacher, Marked Status, Present/Total, %).

5. **Management Screens (Admin)**:
   - Batches: Create, list, edit, assign teachers.
   - Students: Enroll students with **E.164 parent phone validation** (`+91XXXXXXXXXX`), search & filter.
   - Teachers: Create and list faculty accounts.
   - Settings: Institute display name, WhatsApp template preview, provider credentials status.
   - English & Hindi language toggle (`🇮🇳 हिंदी` / `🇬🇧 EN`).

---

## 🛠️ Tech Stack & Architecture

- **Frontend**: React 18, Vite, Mobile-first responsive CSS, PWA Service Worker + Web Manifest.
- **Backend**: Node.js, Express, JWT, bcryptjs.
- **Database**: PostgreSQL (with automated embedded local fallback store for instant zero-config testing when Postgres is offline).
- **WhatsApp Service Layer**: Pluggable provider architecture (`WhatsAppProvider` base class) with support for:
  - **Meta WhatsApp Business Cloud API** (Direct Meta Graph API)
  - **Mock Dev Provider** (Simulates sending in logs for zero-cost local dev)
  - **Gupshup**, **WATI**, **Interakt**, and **AiSensy** providers pre-architected.

---

## 🔑 Default Login Credentials

| Role | Email | Password | Access Scope |
|---|---|---|---|
| **Admin / Director** | `admin@apex.com` | `admin123` | Full institute access, dashboard, settings |
| **Teacher (Rahul)** | `rahul@apex.com` | `teacher123` | Assigned batches (Class 10 Physics morning & evening) |
| **Teacher (Priya)** | `priya@apex.com` | `teacher123` | Assigned batches (Class 11 & 12 Chemistry) |

*(One-tap quick login buttons are provided on the login screen for instant testing!)*

---

## ⚡ Quick Start Instructions

### Prerequisites
- Node.js LTS installed (v18 or higher) - [Download from nodejs.org](https://nodejs.org)
- (Optional) PostgreSQL installed and running on port 5432. If not running, the application automatically uses an embedded local database so you can start testing immediately!

### Option A: One-Click Windows Setup (Recommended)
1. Double-click `setup.bat` (installs dependencies and initializes seed data).
2. Double-click `start.bat` (starts backend and frontend, opens browser at `http://localhost:3000`).

### Option B: Manual Terminal Execution

#### 1. Backend Setup
```bash
cd "backend"

# Install dependencies
npm install

# Initialize database schema and default seed data
npm run db:migrate

# Start backend server
npm run dev
# Server starts on http://localhost:5000
```

#### 2. Frontend Setup
```bash
cd "frontend"

# Install dependencies
npm install

# Start Vite development server
npm run dev
# App opens on http://localhost:3000
```

---

## 📲 How to Configure WhatsApp API Credentials

### 1. In Development (Default Mock Mode)
In `backend/.env`:
```ini
WHATSAPP_PROVIDER=mock
```
- Messages will be simulated and logged to the server console with zero external setup.
- You can test error handling and the `wa.me` fallback link by marking an absent student with a phone ending in `0000`.

### 2. In Production (Meta WhatsApp Business Cloud API)
1. Go to [developers.facebook.com](https://developers.facebook.com) > Create App > WhatsApp.
2. In **WhatsApp Manager** > **Message Templates**, create and approve template:
   - **Template Name**: `student_absence_alert`
   - **Category**: `Utility`
   - **Body**: `Dear {{1}}, {{2}} was absent from {{3}} on {{4}}. - {{5}}`
3. Edit `backend/.env`:
```ini
WHATSAPP_PROVIDER=meta
META_PHONE_NUMBER_ID=your_meta_phone_number_id
META_WHATSAPP_TOKEN=your_permanent_system_user_token
META_WHATSAPP_TEMPLATE_NAME=student_absence_alert
META_WHATSAPP_LANGUAGE_CODE=en_US
INSTITUTE_NAME=Apex Coaching Institute
```
4. Restart backend: `npm run dev`.

---

## 🗺️ Project Roadmap

- [x] **Phase 1 (Delivered & Complete)**:
  - Role-based login (Admin/Teacher)
  - Batch and Student directory with phone validation
  - Fast mobile attendance marking with large P/A buttons and sticky live counter
  - Absent list summary with One-tap WhatsApp Business broadcast
  - Prevent duplicate dispatches & allow same-day updates
  - Delivery status tracking (Sent/Delivered/Failed), Retry button, and `wa.me` direct fallback
  - Admin dashboard with batch summary table & expandable absentee groups
  - PWA support & English/Hindi bilingual toggle
- [ ] **Phase 2**:
  - Full fee installment recording (Cash, UPI, Card)
  - Printable fee receipts
  - Defaulters tracking and one-tap fee reminder WhatsApp broadcast
- [ ] **Phase 3**:
  - Monthly attendance and fee collection reports
  - Excel and PDF exports
  - Bulk student import from CSV/Excel with phone normalization
