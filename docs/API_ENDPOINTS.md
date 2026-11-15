# API Endpoints Specification

Base URL: `/api/v1`  
Authentication: HTTP Bearer Token (`Authorization: Bearer <JWT_TOKEN>`)  
All API responses return JSON with standard wrapper:
```json
{
  "success": true,
  "data": { ... },
  "message": "Optional message string"
}
```
Error response:
```json
{
  "success": false,
  "error": "Error message explanation",
  "details": [ ... ]
}
```

---

## 1. Authentication (`/api/v1/auth`)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/v1/auth/login` | Public | Authenticate user (email + password). Returns JWT token, role, and profile. |
| `GET` | `/api/v1/auth/me` | Authenticated | Fetch current logged-in user profile, permissions, and assigned batches. |

---

## 2. Batches (`/api/v1/batches`)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/v1/batches` | Teacher/Admin | List batches (Teachers see only their assigned batches; Admin sees all). |
| `GET` | `/api/v1/batches/:id` | Teacher/Admin | Get batch details and active student count. |
| `POST` | `/api/v1/batches` | Admin Only | Create a new batch (name, subject, timing, teacher_id). |
| `PUT` | `/api/v1/batches/:id` | Admin Only | Update batch details. |
| `PATCH` | `/api/v1/batches/:id/status` | Admin Only | Activate or deactivate a batch. |

---

## 3. Students (`/api/v1/students`)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/v1/students` | Teacher/Admin | List students. Filterable by `batch_id`, `status`, and `search`. |
| `GET` | `/api/v1/students/:id` | Teacher/Admin | Get detailed student profile. |
| `POST` | `/api/v1/students` | Admin Only | Create student (validates phone in international E.164 e.g. `+919876543210`). |
| `PUT` | `/api/v1/students/:id` | Admin Only | Update student information. |
| `PATCH` | `/api/v1/students/:id/status` | Admin Only | Mark active or inactive. |

---

## 4. Attendance (`/api/v1/attendance`)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/v1/attendance/batch-roster` | Teacher/Admin | Fetch students for batch with their existing attendance (P/A/null) for `?batch_id=&date=`. |
| `POST` | `/api/v1/attendance/submit` | Teacher/Admin | Submit or update batch attendance for date. Requires all active students to be marked 'P' or 'A'. Creates audit log if updated. |
| `GET` | `/api/v1/attendance/absent-list` | Teacher/Admin | Fetch summary (present count, absent count, list of absent students with parent phone & message delivery status) for `?batch_id=&date=`. |
| `GET` | `/api/v1/attendance/history` | Teacher/Admin | Query attendance history with date filters. |

---

## 5. WhatsApp Messaging (`/api/v1/messages`)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/v1/messages/send-absent-broadcast` | Teacher/Admin | One-tap send absence WhatsApp message to parents of absent students for a specific `batch_id` and `date`. Prevents duplicate sending if already sent. Returns student delivery statuses. |
| `POST` | `/api/v1/messages/retry-single` | Teacher/Admin | Retry sending message to a single student parent whose message failed. |
| `GET` | `/api/v1/messages/logs` | Teacher/Admin | Retrieve message logs for batch and date. |
| `POST` | `/api/v1/messages/webhook` | Public | Webhook endpoint for Meta / Provider delivery status receipts (`sent`, `delivered`, `read`, `failed`). |

---

## 6. Admin Dashboard (`/api/v1/dashboard`)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/v1/dashboard/stats` | Admin Only | Total students, total present today, total absent today, overall attendance %. Filterable by `?date=`. |
| `GET` | `/api/v1/dashboard/batch-summary` | Admin Only | Batch-wise table: Batch Name, Timing, Teacher, Marked Status, Present/Total, %. |
| `GET` | `/api/v1/dashboard/absent-grouped` | Admin Only | All absent students grouped by batch, with parent contact and message dispatch status. |

---

## 7. Teachers & Users Management (`/api/v1/teachers`)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/v1/teachers` | Admin Only | List all teachers with assigned batch counts. |
| `POST` | `/api/v1/teachers` | Admin Only | Add a new teacher (name, email, phone, password). |
| `PUT` | `/api/v1/teachers/:id` | Admin Only | Update teacher details. |

---

## 8. Institute Settings (`/api/v1/settings`)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/v1/settings` | Admin Only | Get institute name, WhatsApp template preview, provider info. |
| `PUT` | `/api/v1/settings` | Admin Only | Update settings. |
