const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const db = require('./index');

async function migrate() {
  console.log('🔄 Initializing Database Migrations & Seeds...');

  const schemaPath = path.join(__dirname, 'schema.sql');
  const seedPath   = path.join(__dirname, 'seed.sql');

  const schemaSql = fs.readFileSync(schemaPath, 'utf8');
  const seedSql   = fs.readFileSync(seedPath,   'utf8');

  // Try PostgreSQL migration first
  if (db.pool && !db.isUsingFallback()) {
    try {
      console.log('📡 Connecting to PostgreSQL database...');
      await db.query(schemaSql);
      console.log('✅ PostgreSQL Schema applied successfully.');

      // ── Column additions (idempotent ALTER TABLE) ───────────────
      const alterStatements = [
        `ALTER TABLE students ADD COLUMN IF NOT EXISTS address       TEXT`,
        `ALTER TABLE students ADD COLUMN IF NOT EXISTS student_class VARCHAR(5)`,
        `ALTER TABLE students ADD COLUMN IF NOT EXISTS stream        VARCHAR(20)`,
        `ALTER TABLE students ADD COLUMN IF NOT EXISTS board         VARCHAR(20)`,
        `ALTER TABLE students ADD COLUMN IF NOT EXISTS subject_fees  JSONB DEFAULT '[]'`,
        `ALTER TABLE students ADD COLUMN IF NOT EXISTS total_fee     NUMERIC(12,2) DEFAULT 0`,
      ];
      for (const sql of alterStatements) {
        await db.query(sql).catch(() => {}); // ignore if column already exists
      }
      console.log('✅ Student extended columns ensured.');

      await db.query(seedSql);
      console.log('✅ PostgreSQL Seeds applied successfully.');
      return;
    } catch (err) {
      console.warn('⚠️ PostgreSQL connection failed, creating seed data in local fallback store:', err.message);
    }
  }

  // Populate local fallback store
  console.log('📁 Populating local store with seed records...');
  const salt = bcrypt.genSaltSync(10);
  const adminHash = bcrypt.hashSync('admin123', salt);
  const teacherHash = bcrypt.hashSync('teacher123', salt);

  const seedStore = {
    users: [
      { id: 1, name: 'Admin Director', email: 'admin@apex.com', phone: '+919876543200', password_hash: adminHash, role: 'ADMIN', status: 'active', created_at: new Date().toISOString() },
      { id: 2, name: 'Rahul Sharma (Physics)', email: 'rahul@apex.com', phone: '+919876543201', password_hash: teacherHash, role: 'TEACHER', status: 'active', created_at: new Date().toISOString() },
      { id: 3, name: 'Priya Singh (Chemistry)', email: 'priya@apex.com', phone: '+919876543202', password_hash: teacherHash, role: 'TEACHER', status: 'active', created_at: new Date().toISOString() }
    ],
    batches: [
      { id: 1, name: 'Class 10 - Morning Physics', subject: 'Physics', timing: '07:30 AM - 09:00 AM', teacher_id: 2, status: 'active', created_at: new Date().toISOString() },
      { id: 2, name: 'Class 10 - Evening Physics', subject: 'Physics', timing: '04:00 PM - 05:30 PM', teacher_id: 2, status: 'active', created_at: new Date().toISOString() },
      { id: 3, name: 'Class 11 - Chemistry JEE', subject: 'Chemistry', timing: '05:30 PM - 07:00 PM', teacher_id: 3, status: 'active', created_at: new Date().toISOString() },
      { id: 4, name: 'Class 12 - Advanced Chemistry', subject: 'Chemistry', timing: '07:00 PM - 08:30 PM', teacher_id: 3, status: 'active', created_at: new Date().toISOString() }
    ],
    students: [
      { id: 1, name: 'Aman Roy', roll_no: '01', parent_name: 'Sunil Roy', parent_phone: '+919876543210', batch_id: 1, joining_date: '2026-04-01', status: 'active', created_at: new Date().toISOString() },
      { id: 2, name: 'Riya Das', roll_no: '02', parent_name: 'Subhash Das', parent_phone: '+919876543211', batch_id: 1, joining_date: '2026-04-01', status: 'active', created_at: new Date().toISOString() },
      { id: 3, name: 'Karan Singh', roll_no: '03', parent_name: 'Gurpreet Singh', parent_phone: '+919876543212', batch_id: 1, joining_date: '2026-04-05', status: 'active', created_at: new Date().toISOString() },
      { id: 4, name: 'Neha Verma', roll_no: '04', parent_name: 'Ramesh Verma', parent_phone: '+919876543213', batch_id: 1, joining_date: '2026-04-07', status: 'active', created_at: new Date().toISOString() },
      { id: 5, name: 'Pooja Gupta', roll_no: '05', parent_name: 'Manoj Gupta', parent_phone: '+919876543214', batch_id: 1, joining_date: '2026-04-10', status: 'active', created_at: new Date().toISOString() },
      { id: 6, name: 'Aarav Sharma', roll_no: '06', parent_name: 'Rajesh Sharma', parent_phone: '+919876543215', batch_id: 1, joining_date: '2026-04-10', status: 'active', created_at: new Date().toISOString() },
      { id: 7, name: 'Diya Kapoor', roll_no: '07', parent_name: 'Vikram Kapoor', parent_phone: '+919876543216', batch_id: 1, joining_date: '2026-04-12', status: 'active', created_at: new Date().toISOString() },
      { id: 8, name: 'Ishaan Gupta', roll_no: '08', parent_name: 'Alok Gupta', parent_phone: '+919876543217', batch_id: 1, joining_date: '2026-04-15', status: 'active', created_at: new Date().toISOString() },
      { id: 9, name: 'Pranav Rao', roll_no: '09', parent_name: 'Naveen Rao', parent_phone: '+919876543218', batch_id: 2, joining_date: '2026-04-15', status: 'active', created_at: new Date().toISOString() },
      { id: 10, name: 'Rhea Sen', roll_no: '10', parent_name: 'Amit Sen', parent_phone: '+919876543219', batch_id: 2, joining_date: '2026-04-18', status: 'active', created_at: new Date().toISOString() },
      { id: 11, name: 'Tanmay Kulkarni', roll_no: '11', parent_name: 'Anand Kulkarni', parent_phone: '+919876543220', batch_id: 2, joining_date: '2026-04-20', status: 'active', created_at: new Date().toISOString() },
      { id: 12, name: 'Zoya Khan', roll_no: '12', parent_name: 'Farhan Khan', parent_phone: '+919876543221', batch_id: 3, joining_date: '2026-04-22', status: 'active', created_at: new Date().toISOString() }
    ],
    attendance: [],
    message_logs: [],
    fees: [
      { id: 1, student_id: 1, total_fee: 25000, installments: 2, amount_paid: 25000, due_date: '2026-10-15', status: 'Paid', created_at: new Date().toISOString() },
      { id: 2, student_id: 2, total_fee: 25000, installments: 2, amount_paid: 15000, due_date: '2026-11-20', status: 'Partial', created_at: new Date().toISOString() },
      { id: 3, student_id: 3, total_fee: 25000, installments: 2, amount_paid: 0, due_date: '2026-11-05', status: 'Overdue', created_at: new Date().toISOString() },
      { id: 4, student_id: 4, total_fee: 25000, installments: 2, amount_paid: 10000, due_date: '2026-11-01', status: 'Overdue', created_at: new Date().toISOString() },
      { id: 5, student_id: 5, total_fee: 25000, installments: 2, amount_paid: 0, due_date: '2026-11-28', status: 'Pending', created_at: new Date().toISOString() },
      { id: 6, student_id: 6, total_fee: 25000, installments: 2, amount_paid: 25000, due_date: '2026-10-10', status: 'Paid', created_at: new Date().toISOString() },
      { id: 7, student_id: 7, total_fee: 25000, installments: 2, amount_paid: 15000, due_date: '2026-12-01', status: 'Partial', created_at: new Date().toISOString() },
      { id: 8, student_id: 8, total_fee: 25000, installments: 2, amount_paid: 0, due_date: '2026-11-25', status: 'Pending', created_at: new Date().toISOString() },
      { id: 9, student_id: 9, total_fee: 25000, installments: 2, amount_paid: 25000, due_date: '2026-10-01', status: 'Paid', created_at: new Date().toISOString() },
      { id: 10, student_id: 10, total_fee: 25000, installments: 2, amount_paid: 12500, due_date: '2026-11-10', status: 'Overdue', created_at: new Date().toISOString() },
      { id: 11, student_id: 11, total_fee: 25000, installments: 2, amount_paid: 25000, due_date: '2026-10-05', status: 'Paid', created_at: new Date().toISOString() },
      { id: 12, student_id: 12, total_fee: 25000, installments: 2, amount_paid: 0, due_date: '2026-11-30', status: 'Pending', created_at: new Date().toISOString() }
    ],
    fee_payments: [
      { id: 1, student_id: 1, amount: 25000, payment_date: '2026-04-05', payment_mode: 'UPI', receipt_number: 'REC-2026-0001', notes: 'Full fee paid via Google Pay', recorded_by: 1, created_at: new Date().toISOString() },
      { id: 2, student_id: 2, amount: 15000, payment_date: '2026-04-10', payment_mode: 'Cash', receipt_number: 'REC-2026-0002', notes: 'First installment cash', recorded_by: 1, created_at: new Date().toISOString() },
      { id: 3, student_id: 4, amount: 10000, payment_date: '2026-04-15', payment_mode: 'UPI', receipt_number: 'REC-2026-0003', notes: 'First installment UPI', recorded_by: 1, created_at: new Date().toISOString() },
      { id: 4, student_id: 6, amount: 25000, payment_date: '2026-04-12', payment_mode: 'Bank Transfer', receipt_number: 'REC-2026-0004', notes: 'NEFT transfer', recorded_by: 1, created_at: new Date().toISOString() },
      { id: 5, student_id: 7, amount: 15000, payment_date: '2026-04-18', payment_mode: 'Card', receipt_number: 'REC-2026-0005', notes: 'Debit card POS', recorded_by: 1, created_at: new Date().toISOString() },
      { id: 6, student_id: 9, amount: 25000, payment_date: '2026-04-20', payment_mode: 'UPI', receipt_number: 'REC-2026-0006', notes: 'PhonePe', recorded_by: 1, created_at: new Date().toISOString() },
      { id: 7, student_id: 10, amount: 12500, payment_date: '2026-04-22', payment_mode: 'Cash', receipt_number: 'REC-2026-0007', notes: 'Half fee paid', recorded_by: 1, created_at: new Date().toISOString() }
    ],
    audit_logs: [],
    institute_settings: [
      { key: 'institute_name', value: 'Apex Coaching Institute', description: 'Display name on parent notifications' },
      { key: 'whatsapp_template_name', value: 'student_absence_alert', description: 'Approved Meta WhatsApp template' },
      { key: 'whatsapp_template_text', value: 'Dear {{parent_name}}, {{student_name}} was absent from {{batch}} on {{date}}. - {{institute_name}}', description: 'Standard template text' },
      { key: 'whatsapp_provider', value: 'mock', description: 'Active WhatsApp service provider' }
    ]
  };

  db.setStore(seedStore);
  console.log('✅ Local database initialized with default Admin, Teachers, Batches, and Students.');
}

if (require.main === module) {
  migrate().then(() => {
    console.log('🎉 Migration setup finished.');
    process.exit(0);
  }).catch((err) => {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  });
}

module.exports = migrate;
