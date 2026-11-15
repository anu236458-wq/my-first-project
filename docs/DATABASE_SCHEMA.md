# Database Schema - Coaching Institute Management System

Designed for PostgreSQL (with SQLite / In-Memory adapter compatibility for rapid development).

---

## 1. Entity Relationship Overview

```text
+------------------+         1:N         +-------------------+
|      users       |-------------------->|      batches      |
| (Admin/Teacher)  |  (assigned teacher) | (Class & Timing)  |
+------------------+                     +-------------------+
        |                                          |
        | 1:N (marked_by)                          | 1:N
        v                                          v
+------------------+         N:1         +-------------------+
|    attendance    |<--------------------|     students      |
|  (P / A records) |                     | (Roll, Phone etc) |
+------------------+                     +-------------------+
        |                                          |
        | 1:N                                      | 1:N
        v                                          v
+------------------+                     +-------------------+
|   message_logs   |                     |       fees        |
| (WhatsApp logs)  |                     | (Status, Totals)  |
+------------------+                     +-------------------+
                                                   | 1:N
                                                   v
                                         +-------------------+
                                         |   fee_payments    |
                                         | (Receipts & Mode) |
+------------------+                     +-------------------+
|    audit_logs    |
| (Edits & History)|
+------------------+
```

---

## 2. Table Definitions (PostgreSQL DDL)

### 2.1 `users`
Stores login credentials and roles (Admin/Owner and Teachers).

```sql
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    email VARCHAR(180) UNIQUE NOT NULL,
    phone VARCHAR(20),
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('ADMIN', 'TEACHER')),
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_email ON users(email);
```

### 2.2 `batches`
Classes or subject batches with assigned timings and teacher.

```sql
CREATE TABLE IF NOT EXISTS batches (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    subject VARCHAR(100) NOT NULL,
    timing VARCHAR(80) NOT NULL,
    teacher_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_batches_teacher ON batches(teacher_id);
CREATE INDEX idx_batches_status ON batches(status);
```

### 2.3 `students`
Student master profile with international WhatsApp format for parents.

```sql
CREATE TABLE IF NOT EXISTS students (
    id SERIAL PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    roll_no VARCHAR(50) NOT NULL,
    parent_name VARCHAR(120) NOT NULL,
    parent_phone VARCHAR(25) NOT NULL, -- Format: +91XXXXXXXXXX (E.164)
    batch_id INTEGER NOT NULL REFERENCES batches(id) ON DELETE RESTRICT,
    joining_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_batch_roll_no UNIQUE (batch_id, roll_no)
);

CREATE INDEX idx_students_batch ON students(batch_id);
CREATE INDEX idx_students_status ON students(status);
CREATE INDEX idx_students_parent_phone ON students(parent_phone);
```

### 2.4 `attendance`
Stores single daily attendance record per student per batch.

```sql
CREATE TABLE IF NOT EXISTS attendance (
    id SERIAL PRIMARY KEY,
    student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    batch_id INTEGER NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    status VARCHAR(5) NOT NULL CHECK (status IN ('P', 'A')),
    marked_by INTEGER NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_student_batch_date UNIQUE (student_id, batch_id, date)
);

CREATE INDEX idx_attendance_lookup ON attendance(batch_id, date);
CREATE INDEX idx_attendance_student ON attendance(student_id);
CREATE INDEX idx_attendance_date ON attendance(date);
```

### 2.5 `message_logs`
Tracks every WhatsApp absence notification and fee reminder sent via WhatsApp API.

```sql
CREATE TABLE IF NOT EXISTS message_logs (
    id SERIAL PRIMARY KEY,
    student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    batch_id INTEGER REFERENCES batches(id) ON DELETE SET NULL,
    date DATE NOT NULL,
    recipient_phone VARCHAR(25) NOT NULL,
    template_used VARCHAR(80) NOT NULL,
    message_body TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'Queued' CHECK (status IN ('Queued', 'Sent', 'Delivered', 'Failed')),
    provider VARCHAR(40) NOT NULL DEFAULT 'meta',
    provider_message_id VARCHAR(120),
    error_reason TEXT,
    sent_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_msg_logs_batch_date ON message_logs(batch_id, date);
CREATE INDEX idx_msg_logs_student ON message_logs(student_id);
CREATE INDEX idx_msg_logs_status ON message_logs(status);
```

### 2.6 `fees` (Prepared for Phase 2)
Tracks fee dues and payment overview per student.

```sql
CREATE TABLE IF NOT EXISTS fees (
    id SERIAL PRIMARY KEY,
    student_id INTEGER UNIQUE NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    total_fee NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    installments INTEGER NOT NULL DEFAULT 1,
    amount_paid NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    due_date DATE,
    status VARCHAR(20) NOT NULL DEFAULT 'Pending' CHECK (status IN ('Paid', 'Partial', 'Pending', 'Overdue')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_fees_status ON fees(status);
```

### 2.7 `fee_payments` (Prepared for Phase 2)
Detailed payment transactions and receipt generation.

```sql
CREATE TABLE IF NOT EXISTS fee_payments (
    id SERIAL PRIMARY KEY,
    student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    amount NUMERIC(10, 2) NOT NULL,
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    payment_mode VARCHAR(30) NOT NULL CHECK (payment_mode IN ('Cash', 'UPI', 'Card', 'Bank Transfer', 'Cheque')),
    receipt_number VARCHAR(50) UNIQUE NOT NULL,
    notes TEXT,
    recorded_by INTEGER NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_fee_payments_student ON fee_payments(student_id);
CREATE INDEX idx_fee_payments_receipt ON fee_payments(receipt_number);
```

### 2.8 `audit_logs`
Tracks any subsequent edits or modifications to attendance, fees, and student records.

```sql
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    entity_type VARCHAR(40) NOT NULL, -- 'ATTENDANCE', 'FEES', 'STUDENT', 'BATCH'
    entity_id INTEGER NOT NULL,
    action VARCHAR(20) NOT NULL,      -- 'CREATE', 'UPDATE', 'DELETE'
    old_values JSONB,
    new_values JSONB,
    user_id INTEGER REFERENCES users(id),
    ip_address VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id);
```

### 2.9 `institute_settings`
Configurable institute information and WhatsApp templates.

```sql
CREATE TABLE IF NOT EXISTS institute_settings (
    key VARCHAR(60) PRIMARY KEY,
    value TEXT NOT NULL,
    description VARCHAR(255),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```
