const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const config = require('../config');

let pool = null;
let useLocalStore = false;

// Local fallback store (for quick zero-config running when Postgres is offline)
const localDataFile = path.join(__dirname, '../../data/store.json');
let localStore = {
  users: [],
  batches: [],
  students: [],
  attendance: [],
  message_logs: [],
  fees: [],
  fee_payments: [],
  audit_logs: [],
  institute_settings: []
};

function ensureLocalDir() {
  const dir = path.dirname(localDataFile);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function loadLocalStore() {
  ensureLocalDir();
  if (fs.existsSync(localDataFile)) {
    try {
      const data = fs.readFileSync(localDataFile, 'utf8');
      localStore = JSON.parse(data);
    } catch (err) {
      console.warn('⚠️ Could not parse local store, initializing default.');
    }
  }
}

function saveLocalStore() {
  ensureLocalDir();
  fs.writeFileSync(localDataFile, JSON.stringify(localStore, null, 2), 'utf8');
}

// Initialize PostgreSQL Pool
function initPgPool() {
  try {
    pool = new Pool({
      connectionString: config.db.connectionString,
      host: config.db.host,
      port: config.db.port,
      user: config.db.user,
      password: config.db.password,
      database: config.db.database,
      connectionTimeoutMillis: 3000,
      idleTimeoutMillis: 10000
    });

    pool.on('error', (err) => {
      console.error('Unexpected error on idle PostgreSQL client:', err.message);
    });
  } catch (err) {
    console.warn('PostgreSQL pool creation failed, will use local fallback:', err.message);
  }
}

initPgPool();
loadLocalStore();

/**
 * Universal Query Runner
 * Uses PostgreSQL if connected; falls back smoothly to local storage emulator if Postgres is unavailable
 */
async function query(text, params = []) {
  if (pool && !useLocalStore) {
    try {
      const client = await pool.connect();
      try {
        const result = await client.query(text, params);
        return result;
      } finally {
        client.release();
      }
    } catch (err) {
      if (config.db.useFallback) {
        console.warn(`[DB] PostgreSQL unavailable (${err.code || err.message}). Operating in Embedded DB Fallback mode.`);
        useLocalStore = true;
      } else {
        throw err;
      }
    }
  }

  // Local Store Query Emulator for rapid zero-dependency prototyping & offline execution
  return executeLocalQuery(text, params);
}

/**
 * Lightweight local query engine to handle CRUD operations on localStore
 */
function executeLocalQuery(sql, params = []) {
  const normalizedSql = sql.trim();
  const lowerSql = normalizedSql.toLowerCase();

  // 1. SELECT queries
  if (lowerSql.startsWith('select')) {
    // USERS by email
    if (lowerSql.includes('from users') && lowerSql.includes('email = $1')) {
      const user = localStore.users.find(u => u.email.toLowerCase() === (params[0] || '').toLowerCase());
      return { rows: user ? [user] : [], rowCount: user ? 1 : 0 };
    }
    // USERS by id
    if (lowerSql.includes('from users') && lowerSql.includes('id = $1')) {
      const user = localStore.users.find(u => u.id === parseInt(params[0], 10));
      return { rows: user ? [user] : [], rowCount: user ? 1 : 0 };
    }
    // ALL TEACHERS
    if (lowerSql.includes('from users') && lowerSql.includes("role = 'teacher'")) {
      const teachers = localStore.users.filter(u => u.role === 'TEACHER');
      return { rows: teachers, rowCount: teachers.length };
    }
    // BATCHES
    if (lowerSql.includes('from batches')) {
      let batches = [...localStore.batches];
      if (lowerSql.includes('teacher_id = $1')) {
        batches = batches.filter(b => b.teacher_id === parseInt(params[0], 10));
      }
      if (lowerSql.includes('where id = $1')) {
        batches = batches.filter(b => b.id === parseInt(params[0], 10));
      }
      return { rows: batches, rowCount: batches.length };
    }
    // STUDENTS
    if (lowerSql.includes('from students')) {
      let students = [...localStore.students];
      if (lowerSql.includes('batch_id = $1')) {
        students = students.filter(s => s.batch_id === parseInt(params[0], 10));
      }
      if (lowerSql.includes('id = $1')) {
        students = students.filter(s => s.id === parseInt(params[0], 10));
      }
      return { rows: students, rowCount: students.length };
    }
    // ATTENDANCE for batch and date
    if (lowerSql.includes('from attendance') && lowerSql.includes('batch_id = $1') && lowerSql.includes('date = $2')) {
      const batchId = parseInt(params[0], 10);
      const dateStr = params[1];
      const att = localStore.attendance.filter(a => a.batch_id === batchId && a.date === dateStr);
      return { rows: att, rowCount: att.length };
    }
    // ATTENDANCE for specific date
    if (lowerSql.includes('from attendance') && lowerSql.includes('date = $1')) {
      const dateStr = params[0];
      const att = localStore.attendance.filter(a => a.date === dateStr);
      return { rows: att, rowCount: att.length };
    }
    // MESSAGE LOGS for batch and date
    if (lowerSql.includes('from message_logs') && lowerSql.includes('batch_id = $1') && lowerSql.includes('date = $2')) {
      const batchId = parseInt(params[0], 10);
      const dateStr = params[1];
      const msgs = localStore.message_logs.filter(m => m.batch_id === batchId && m.date === dateStr);
      return { rows: msgs, rowCount: msgs.length };
    }
    // SETTINGS
    if (lowerSql.includes('from institute_settings')) {
      return { rows: localStore.institute_settings, rowCount: localStore.institute_settings.length };
    }
    // FEES (all or by student_id)
    if (lowerSql.includes('from fees')) {
      let feesList = [...(localStore.fees || [])];
      if (lowerSql.includes('student_id = $1')) {
        feesList = feesList.filter(f => f.student_id === parseInt(params[0], 10));
      }
      return { rows: feesList, rowCount: feesList.length };
    }
    // FEE PAYMENTS
    if (lowerSql.includes('from fee_payments')) {
      let payments = [...(localStore.fee_payments || [])];
      if (lowerSql.includes('student_id = $1')) {
        payments = payments.filter(p => p.student_id === parseInt(params[0], 10));
      }
      if (lowerSql.includes('receipt_number = $1')) {
        payments = payments.filter(p => p.receipt_number === params[0]);
      }
      return { rows: payments, rowCount: payments.length };
    }
  }

  // 2. INSERT queries
  if (lowerSql.startsWith('insert into attendance')) {
    // Upsert or insert attendance record
    const [student_id, batch_id, date, status, marked_by] = params;
    const existingIndex = localStore.attendance.findIndex(
      a => a.student_id === parseInt(student_id, 10) && a.batch_id === parseInt(batch_id, 10) && a.date === date
    );

    const record = {
      id: existingIndex >= 0 ? localStore.attendance[existingIndex].id : Date.now() + Math.floor(Math.random() * 1000),
      student_id: parseInt(student_id, 10),
      batch_id: parseInt(batch_id, 10),
      date,
      status,
      marked_by: parseInt(marked_by, 10),
      updated_at: new Date().toISOString()
    };

    if (existingIndex >= 0) {
      localStore.attendance[existingIndex] = { ...localStore.attendance[existingIndex], ...record };
    } else {
      record.created_at = new Date().toISOString();
      localStore.attendance.push(record);
    }
    saveLocalStore();
    return { rows: [record], rowCount: 1 };
  }

  if (lowerSql.startsWith('insert into message_logs')) {
    const [student_id, batch_id, date, recipient_phone, template_used, message_body, status, provider, provider_message_id, error_reason, sent_by] = params;
    const record = {
      id: Date.now() + Math.floor(Math.random() * 1000),
      student_id: parseInt(student_id, 10),
      batch_id: parseInt(batch_id, 10),
      date,
      recipient_phone,
      template_used,
      message_body,
      status,
      provider,
      provider_message_id,
      error_reason,
      sent_by: parseInt(sent_by, 10),
      created_at: new Date().toISOString()
    };
    localStore.message_logs.push(record);
    saveLocalStore();
    return { rows: [record], rowCount: 1 };
  }

  if (lowerSql.startsWith('insert into audit_logs')) {
    const [entity_type, entity_id, action, old_values, new_values, user_id] = params;
    const record = {
      id: Date.now(),
      entity_type,
      entity_id: parseInt(entity_id, 10),
      action,
      old_values,
      new_values,
      user_id: user_id ? parseInt(user_id, 10) : null,
      created_at: new Date().toISOString()
    };
    localStore.audit_logs.push(record);
    saveLocalStore();
    return { rows: [record], rowCount: 1 };
  }

  if (lowerSql.startsWith('insert into students')) {
    const [name, roll_no, parent_name, parent_phone, batch_id, joining_date, status] = params;
    const record = {
      id: Date.now(),
      name,
      roll_no,
      parent_name,
      parent_phone,
      batch_id: parseInt(batch_id, 10),
      joining_date: joining_date || new Date().toISOString().split('T')[0],
      status: status || 'active',
      created_at: new Date().toISOString()
    };
    localStore.students.push(record);
    saveLocalStore();
    return { rows: [record], rowCount: 1 };
  }

  if (lowerSql.startsWith('insert into batches')) {
    const [name, subject, timing, teacher_id, status] = params;
    const record = {
      id: Date.now(),
      name,
      subject,
      timing,
      teacher_id: parseInt(teacher_id, 10),
      status: status || 'active',
      created_at: new Date().toISOString()
    };
    localStore.batches.push(record);
    saveLocalStore();
    return { rows: [record], rowCount: 1 };
  }

  if (lowerSql.startsWith('insert into users')) {
    const [name, email, phone, password_hash, role, status] = params;
    const record = {
      id: Date.now(),
      name,
      email,
      phone,
      password_hash,
      role,
      status: status || 'active',
      created_at: new Date().toISOString()
    };
    localStore.users.push(record);
    saveLocalStore();
    return { rows: [record], rowCount: 1 };
  }

  if (lowerSql.startsWith('insert into fee_payments')) {
    const [student_id, amount, payment_date, payment_mode, receipt_number, notes, recorded_by] = params;
    const record = {
      id: Date.now() + Math.floor(Math.random() * 1000),
      student_id: parseInt(student_id, 10),
      amount: parseFloat(amount),
      payment_date: payment_date || new Date().toISOString().split('T')[0],
      payment_mode,
      receipt_number,
      notes: notes || '',
      recorded_by: recorded_by ? parseInt(recorded_by, 10) : null,
      created_at: new Date().toISOString()
    };
    if (!localStore.fee_payments) localStore.fee_payments = [];
    localStore.fee_payments.push(record);
    saveLocalStore();
    return { rows: [record], rowCount: 1 };
  }

  if (lowerSql.startsWith('insert into fees')) {
    const [student_id, total_fee, installments, amount_paid, due_date, status] = params;
    const record = {
      id: Date.now() + Math.floor(Math.random() * 1000),
      student_id: parseInt(student_id, 10),
      total_fee: parseFloat(total_fee || 0),
      installments: parseInt(installments || 1, 10),
      amount_paid: parseFloat(amount_paid || 0),
      due_date: due_date || null,
      status: status || 'Pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    if (!localStore.fees) localStore.fees = [];
    localStore.fees.push(record);
    saveLocalStore();
    return { rows: [record], rowCount: 1 };
  }

  // 3. UPDATE queries
  if (lowerSql.startsWith('update fees')) {
    const student_id = parseInt(params[params.length - 1], 10);
    if (!localStore.fees) localStore.fees = [];
    const index = localStore.fees.findIndex(f => f.student_id === student_id);
    if (index >= 0) {
      if (lowerSql.includes('amount_paid = $1') && lowerSql.includes('status = $2')) {
        localStore.fees[index].amount_paid = parseFloat(params[0]);
        localStore.fees[index].status = params[1];
        localStore.fees[index].updated_at = new Date().toISOString();
      } else if (lowerSql.includes('total_fee = $1')) {
        localStore.fees[index].total_fee = parseFloat(params[0]);
        localStore.fees[index].due_date = params[1];
        localStore.fees[index].status = params[2];
        localStore.fees[index].updated_at = new Date().toISOString();
      }
      saveLocalStore();
      return { rows: [localStore.fees[index]], rowCount: 1 };
    }
  }
  if (lowerSql.startsWith('update students')) {
    const id = parseInt(params[params.length - 1], 10);
    const index = localStore.students.findIndex(s => s.id === id);
    if (index >= 0) {
      if (lowerSql.includes('status = $1')) {
        localStore.students[index].status = params[0];
      }
      saveLocalStore();
      return { rows: [localStore.students[index]], rowCount: 1 };
    }
  }

  if (lowerSql.startsWith('update message_logs')) {
    const id = parseInt(params[params.length - 1], 10);
    const index = localStore.message_logs.findIndex(m => m.id === id);
    if (index >= 0) {
      localStore.message_logs[index].status = params[0];
      localStore.message_logs[index].error_reason = params[1] || null;
      localStore.message_logs[index].updated_at = new Date().toISOString();
      saveLocalStore();
      return { rows: [localStore.message_logs[index]], rowCount: 1 };
    }
  }

  return { rows: [], rowCount: 0 };
}

module.exports = {
  query,
  pool,
  getStore: () => localStore,
  setStore: (s) => { localStore = s; saveLocalStore(); },
  isUsingFallback: () => useLocalStore
};
