const express = require('express');
const db = require('../db');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { logAudit } = require('../services/auditService');
const { getWhatsAppProvider } = require('../services/whatsapp');
const { formatWhatsAppNumber, getWhatsAppDirectLink } = require('../utils/phoneValidator');
const config = require('../config');

const router = express.Router();

/**
 * Format currency in Indian Rupees
 */
function formatCurrency(num) {
  return '₹' + Number(num || 0).toLocaleString('en-IN');
}

/**
 * GET /api/v1/fees
 * List all students with fee records, balances, and filter by batch/status
 */
router.get('/', authenticateToken, requireRole(['ADMIN']), async (req, res, next) => {
  try {
    const { batch_id, status, search } = req.query;

    let studentsRes;
    if (db.isUsingFallback()) {
      const store = db.getStore();
      let students = store.students || [];
      if (batch_id) students = students.filter(s => s.batch_id === parseInt(batch_id, 10));
      if (search) {
        const q = search.toLowerCase();
        students = students.filter(s => s.name.toLowerCase().includes(q) || s.roll_no.toLowerCase().includes(q));
      }

      const rows = students.map(s => {
        const batch = (store.batches || []).find(b => b.id === s.batch_id) || {};
        const fee = (store.fees || []).find(f => f.student_id === s.id) || {
          total_fee: 25000,
          amount_paid: 0,
          status: 'Pending',
          due_date: '2026-11-20',
          installments: 2
        };
        const total = parseFloat(fee.total_fee || 0);
        const paid = parseFloat(fee.amount_paid || 0);
        const balance = Math.max(0, total - paid);

        // Last payment
        const payments = (store.fee_payments || []).filter(p => p.student_id === s.id);
        const lastPayment = payments.length > 0 ? payments[payments.length - 1] : null;

        return {
          student_id: s.id,
          name: s.name,
          roll_no: s.roll_no,
          parent_name: s.parent_name,
          parent_phone: s.parent_phone,
          batch_id: s.batch_id,
          batch_name: batch.name || 'Class',
          batch_timing: batch.timing || '',
          total_fee: total,
          amount_paid: paid,
          balance,
          due_date: fee.due_date,
          status: fee.status || (balance === 0 ? 'Paid' : 'Pending'),
          installments: fee.installments || 1,
          last_receipt_number: lastPayment?.receipt_number || null,
          last_payment_date: lastPayment?.payment_date || null
        };
      });

      let filtered = rows;
      if (status && status !== 'All') {
        filtered = filtered.filter(r => r.status.toLowerCase() === status.toLowerCase());
      }

      return res.json({ success: true, data: filtered });
    }

    // PostgreSQL Query
    let sql = `
      SELECT s.id as student_id, s.name, s.roll_no, s.parent_name, s.parent_phone, s.batch_id,
             b.name as batch_name, b.timing as batch_timing,
             COALESCE(f.total_fee, 25000) as total_fee,
             COALESCE(f.amount_paid, 0) as amount_paid,
             (COALESCE(f.total_fee, 25000) - COALESCE(f.amount_paid, 0)) as balance,
             COALESCE(f.status, 'Pending') as status,
             f.due_date, f.installments,
             lp.receipt_number as last_receipt_number,
             lp.payment_date as last_payment_date
      FROM students s
      JOIN batches b ON s.batch_id = b.id
      LEFT JOIN fees f ON f.student_id = s.id
      LEFT JOIN LATERAL (
        SELECT receipt_number, payment_date
        FROM fee_payments
        WHERE student_id = s.id
        ORDER BY id DESC LIMIT 1
      ) lp ON true
      WHERE s.status = 'active'
    `;
    const params = [];

    if (batch_id) {
      params.push(parseInt(batch_id, 10));
      sql += ` AND s.batch_id = $${params.length}`;
    }
    if (status && status !== 'All') {
      params.push(status);
      sql += ` AND f.status = $${params.length}`;
    }
    if (search) {
      params.push(`%${search.trim().toLowerCase()}%`);
      sql += ` AND (LOWER(s.name) LIKE $${params.length} OR LOWER(s.roll_no) LIKE $${params.length})`;
    }

    sql += ` ORDER BY s.batch_id ASC, s.roll_no ASC`;

    const result = await db.query(sql, params);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/fees/summary
 * Summary cards: total collected, total pending, total overdue, defaulters count
 */
router.get('/summary', authenticateToken, requireRole(['ADMIN']), async (req, res, next) => {
  try {
    let feesList = [];
    if (db.isUsingFallback()) {
      feesList = db.getStore().fees || [];
    } else {
      const result = await db.query('SELECT total_fee, amount_paid, status, due_date FROM fees');
      feesList = result.rows;
    }

    let totalCollected = 0;
    let totalPending = 0;
    let totalOverdue = 0;
    let paidCount = 0;
    let partialCount = 0;
    let pendingCount = 0;
    let overdueCount = 0;

    feesList.forEach(f => {
      const total = parseFloat(f.total_fee || 0);
      const paid = parseFloat(f.amount_paid || 0);
      const bal = Math.max(0, total - paid);

      totalCollected += paid;

      if (f.status === 'Paid') {
        paidCount++;
      } else if (f.status === 'Partial') {
        partialCount++;
        totalPending += bal;
      } else if (f.status === 'Overdue') {
        overdueCount++;
        totalOverdue += bal;
      } else {
        pendingCount++;
        totalPending += bal;
      }
    });

    res.json({
      success: true,
      data: {
        totalStudents: feesList.length,
        totalCollected,
        totalPending,
        totalOverdue,
        defaultersCount: overdueCount,
        paidCount,
        partialCount,
        pendingCount,
        overdueCount
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/fees/defaulters
 * Defaulters list (students with status Overdue or past due date with remaining balance)
 */
router.get('/defaulters', authenticateToken, requireRole(['ADMIN']), async (req, res, next) => {
  try {
    const { batch_id } = req.query;

    let defaulters = [];
    if (db.isUsingFallback()) {
      const store = db.getStore();
      const overdueFees = (store.fees || []).filter(f => f.status === 'Overdue' || (f.status === 'Partial' && new Date(f.due_date) < new Date()));

      defaulters = overdueFees.map(f => {
        const student = (store.students || []).find(s => s.id === f.student_id);
        if (!student) return null;
        if (batch_id && student.batch_id !== parseInt(batch_id, 10)) return null;

        const batch = (store.batches || []).find(b => b.id === student.batch_id) || {};
        const total = parseFloat(f.total_fee || 0);
        const paid = parseFloat(f.amount_paid || 0);
        const balance = Math.max(0, total - paid);

        // Check last fee reminder in message_logs
        const reminders = (store.message_logs || []).filter(m => m.student_id === student.id && m.template_used === 'fee_due_reminder');
        const lastReminder = reminders.length > 0 ? reminders[reminders.length - 1] : null;

        return {
          student_id: student.id,
          name: student.name,
          roll_no: student.roll_no,
          parent_name: student.parent_name,
          parent_phone: student.parent_phone,
          batch_id: student.batch_id,
          batch_name: batch.name || 'Class',
          total_fee: total,
          amount_paid: paid,
          balance,
          due_date: f.due_date,
          status: f.status,
          reminder_status: lastReminder?.status || 'Not Sent',
          reminder_sent_at: lastReminder?.created_at || null
        };
      }).filter(Boolean);

      return res.json({ success: true, data: defaulters });
    }

    // PostgreSQL query
    let sql = `
      SELECT s.id as student_id, s.name, s.roll_no, s.parent_name, s.parent_phone, s.batch_id,
             b.name as batch_name,
             f.total_fee, f.amount_paid, (f.total_fee - f.amount_paid) as balance,
             f.due_date, f.status,
             lr.status as reminder_status, lr.created_at as reminder_sent_at
      FROM fees f
      JOIN students s ON f.student_id = s.id
      JOIN batches b ON s.batch_id = b.id
      LEFT JOIN LATERAL (
        SELECT status, created_at
        FROM message_logs
        WHERE student_id = s.id AND template_used = 'fee_due_reminder'
        ORDER BY id DESC LIMIT 1
      ) lr ON true
      WHERE f.status = 'Overdue' OR (f.total_fee > f.amount_paid AND f.due_date < CURRENT_DATE)
    `;
    const params = [];
    if (batch_id) {
      params.push(parseInt(batch_id, 10));
      sql += ` AND s.batch_id = $${params.length}`;
    }
    sql += ` ORDER BY (f.total_fee - f.amount_paid) DESC`;

    const result = await db.query(sql, params);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/fees/record-payment
 * Record an installment payment (amount, date, mode) & generate receipt
 */
router.post('/record-payment', authenticateToken, requireRole(['ADMIN']), async (req, res, next) => {
  try {
    const { student_id, amount, payment_date, payment_mode, notes } = req.body;

    if (!student_id || !amount || !payment_mode) {
      return res.status(400).json({
        success: false,
        error: 'Student ID, payment amount, and payment mode are required.'
      });
    }

    const payAmount = parseFloat(amount);
    if (isNaN(payAmount) || payAmount <= 0) {
      return res.status(400).json({ success: false, error: 'Payment amount must be greater than 0.' });
    }

    const studentId = parseInt(student_id, 10);

    // Fetch student & fee record
    const studentRes = await db.query('SELECT * FROM students WHERE id = $1', [studentId]);
    if (!studentRes.rows.length) {
      return res.status(404).json({ success: false, error: 'Student not found.' });
    }
    const student = studentRes.rows[0];

    const batchRes = await db.query('SELECT * FROM batches WHERE id = $1', [student.batch_id]);
    const batch = batchRes.rows[0] || { name: 'Class' };

    // Fetch existing fee record or create one if not existing
    let feeRes = await db.query('SELECT * FROM fees WHERE student_id = $1', [studentId]);
    let currentFee = feeRes.rows[0];

    if (!currentFee) {
      const insFee = await db.query(
        `INSERT INTO fees (student_id, total_fee, installments, amount_paid, due_date, status)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [studentId, 25000, 2, 0, '2026-11-30', 'Pending']
      );
      currentFee = insFee.rows[0];
    }

    const totalFee = parseFloat(currentFee.total_fee);
    const prevPaid = parseFloat(currentFee.amount_paid);
    const currentRemaining = Math.max(0, totalFee - prevPaid);

    if (payAmount > currentRemaining) {
      return res.status(400).json({
        success: false,
        error: `Payment amount (${formatCurrency(payAmount)}) cannot exceed remaining balance (${formatCurrency(currentRemaining)}).`
      });
    }

    // Generate unique sequential receipt number e.g. REC-2026-0008
    const receiptCountRes = await db.query('SELECT COUNT(*) as count FROM fee_payments');
    const seqNum = parseInt(receiptCountRes.rows[0]?.count || 0, 10) + 1;
    const receiptNumber = `REC-${new Date().getFullYear()}-${String(seqNum).padStart(4, '0')}`;

    const paymentDate = payment_date || new Date().toISOString().split('T')[0];

    // Insert into fee_payments
    const payRes = await db.query(
      `INSERT INTO fee_payments (student_id, amount, payment_date, payment_mode, receipt_number, notes, recorded_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [studentId, payAmount, paymentDate, payment_mode, receiptNumber, notes || null, req.user.id]
    );

    // Update fees table
    const newPaid = prevPaid + payAmount;
    const newStatus = newPaid >= totalFee ? 'Paid' : 'Partial';

    await db.query(
      `UPDATE fees SET amount_paid = $1, status = $2, updated_at = CURRENT_TIMESTAMP WHERE student_id = $3`,
      [newPaid, newStatus, studentId]
    );

    // Audit log
    await logAudit({
      entityType: 'FEES',
      entityId: payRes.rows[0]?.id || studentId,
      action: 'PAYMENT_RECORDED',
      oldValues: { amount_paid: prevPaid, status: currentFee.status },
      newValues: { amount_paid: newPaid, status: newStatus, receipt: receiptNumber, paid: payAmount },
      userId: req.user.id,
      req
    });

    res.status(201).json({
      success: true,
      message: `Payment of ${formatCurrency(payAmount)} recorded successfully. Receipt generated: ${receiptNumber}`,
      data: {
        receiptNumber,
        studentName: student.name,
        rollNo: student.roll_no,
        batchName: batch.name,
        parentName: student.parent_name,
        parentPhone: student.parent_phone,
        amount: payAmount,
        paymentDate,
        paymentMode: payment_mode,
        totalFee,
        totalPaid: newPaid,
        balanceRemaining: totalFee - newPaid,
        status: newStatus,
        notes: notes || ''
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/fees/receipt/:receipt_number
 * Fetch printable receipt
 */
router.get('/receipt/:receipt_number', authenticateToken, async (req, res, next) => {
  try {
    const { receipt_number } = req.params;

    let payment;
    let student;
    let batch;
    let fee;

    if (db.isUsingFallback()) {
      const store = db.getStore();
      payment = (store.fee_payments || []).find(p => p.receipt_number === receipt_number);
      if (!payment) return res.status(404).json({ success: false, error: 'Receipt not found.' });

      student = (store.students || []).find(s => s.id === payment.student_id);
      batch = (store.batches || []).find(b => b.id === student?.batch_id);
      fee = (store.fees || []).find(f => f.student_id === payment.student_id);
    } else {
      const result = await db.query(
        `SELECT p.*, s.name as student_name, s.roll_no, s.parent_name, s.parent_phone,
                b.name as batch_name, f.total_fee, f.amount_paid
         FROM fee_payments p
         JOIN students s ON p.student_id = s.id
         JOIN batches b ON s.batch_id = b.id
         LEFT JOIN fees f ON f.student_id = s.id
         WHERE p.receipt_number = $1`,
        [receipt_number]
      );
      if (!result.rows.length) return res.status(404).json({ success: false, error: 'Receipt not found.' });
      const row = result.rows[0];
      payment = row;
      student = { name: row.student_name, roll_no: row.roll_no, parent_name: row.parent_name, parent_phone: row.parent_phone };
      batch = { name: row.batch_name };
      fee = { total_fee: row.total_fee, amount_paid: row.amount_paid };
    }

    const totalFee = parseFloat(fee?.total_fee || 25000);
    const amountPaidSoFar = parseFloat(fee?.amount_paid || payment.amount);

    res.json({
      success: true,
      data: {
        instituteName: config.institute.name,
        institutePhone: config.institute.phone,
        receiptNumber: payment.receipt_number,
        paymentDate: payment.payment_date,
        studentName: student?.name,
        rollNo: student?.roll_no,
        batchName: batch?.name,
        parentName: student?.parent_name,
        parentPhone: student?.parent_phone,
        paymentMode: payment.payment_mode,
        amount: parseFloat(payment.amount),
        totalFee,
        amountPaidSoFar,
        balanceRemaining: Math.max(0, totalFee - amountPaidSoFar),
        notes: payment.notes || ''
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/fees/send-reminder-broadcast
 * One-tap WhatsApp fee reminder to all defaulters
 */
router.post('/send-reminder-broadcast', authenticateToken, requireRole(['ADMIN']), async (req, res, next) => {
  try {
    const { batch_id, force } = req.body;
    const provider = getWhatsAppProvider();
    const instituteName = config.institute.name;

    // Fetch defaulters
    let defaultersList = [];
    if (db.isUsingFallback()) {
      const store = db.getStore();
      defaultersList = (store.fees || [])
        .filter(f => f.status === 'Overdue' || (f.status === 'Partial' && new Date(f.due_date) < new Date()))
        .map(f => {
          const student = (store.students || []).find(s => s.id === f.student_id);
          if (!student) return null;
          if (batch_id && student.batch_id !== parseInt(batch_id, 10)) return null;
          const batch = (store.batches || []).find(b => b.id === student.batch_id) || {};
          return {
            ...student,
            balance: Math.max(0, parseFloat(f.total_fee) - parseFloat(f.amount_paid)),
            due_date: f.due_date,
            batch_name: batch.name
          };
        }).filter(Boolean);
    } else {
      let sql = `
        SELECT s.*, (f.total_fee - f.amount_paid) as balance, f.due_date, b.name as batch_name
        FROM fees f
        JOIN students s ON f.student_id = s.id
        JOIN batches b ON s.batch_id = b.id
        WHERE f.status = 'Overdue' OR (f.total_fee > f.amount_paid AND f.due_date < CURRENT_DATE)
      `;
      const params = [];
      if (batch_id) {
        params.push(parseInt(batch_id, 10));
        sql += ` AND s.batch_id = $${params.length}`;
      }
      const result = await db.query(sql, params);
      defaultersList = result.rows;
    }

    if (defaultersList.length === 0) {
      return res.json({
        success: true,
        message: 'No fee defaulters found.',
        data: { totalDefaulters: 0, sentCount: 0, failedCount: 0, results: [] }
      });
    }

    const todayStr = new Date().toISOString().split('T')[0];

    // Dispatch fee reminder to each defaulter
    const dispatchPromises = defaultersList.map(async (student) => {
      const cleanPhone = formatWhatsAppNumber(student.parent_phone);
      const balanceStr = Number(student.balance).toLocaleString('en-IN');
      const dueDateFormatted = student.due_date ? new Date(student.due_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : 'immediate';

      const reminderText = `Dear ${student.parent_name || 'Parent'}, this is a gentle reminder that a pending fee of Rs. ${balanceStr} for ${student.name} (${student.batch_name}) was due on ${dueDateFormatted}. Kindly clear the dues at your earliest convenience. - ${instituteName}`;
      const directLink = cleanPhone ? getWhatsAppDirectLink(cleanPhone, reminderText) : null;

      if (!cleanPhone) {
        await db.query(
          `INSERT INTO message_logs (student_id, batch_id, date, recipient_phone, template_used, message_body, status, provider, error_reason, sent_by)
           VALUES ($1, $2, $3, $4, 'fee_due_reminder', $5, 'Failed', $6, 'Invalid phone number', $7)`,
          [student.id, student.batch_id, todayStr, student.parent_phone || 'None', reminderText, provider.name, req.user.id]
        );
        return {
          studentId: student.id,
          studentName: student.name,
          rollNo: student.roll_no,
          parentName: student.parent_name,
          parentPhone: student.parent_phone,
          balance: student.balance,
          status: 'Failed',
          error: 'Invalid phone format',
          directLink: null
        };
      }

      let sendResult;
      try {
        sendResult = await provider.sendTemplateMessage({
          to: cleanPhone,
          templateName: 'fee_due_reminder',
          languageCode: 'en_US',
          parameters: [
            student.parent_name || 'Parent',
            balanceStr,
            student.name,
            student.batch_name,
            dueDateFormatted,
            instituteName
          ],
          fallbackText: reminderText
        });
      } catch (err) {
        sendResult = { success: false, status: 'Failed', error: err.message };
      }

      await db.query(
        `INSERT INTO message_logs (student_id, batch_id, date, recipient_phone, template_used, message_body, status, provider, provider_message_id, error_reason, sent_by)
         VALUES ($1, $2, $3, $4, 'fee_due_reminder', $5, $6, $7, $8, $9, $10)`,
        [
          student.id,
          student.batch_id,
          todayStr,
          cleanPhone,
          reminderText,
          sendResult.status || (sendResult.success ? 'Sent' : 'Failed'),
          provider.name,
          sendResult.messageId || null,
          sendResult.error || null,
          req.user.id
        ]
      );

      return {
        studentId: student.id,
        studentName: student.name,
        rollNo: student.roll_no,
        parentName: student.parent_name,
        parentPhone: cleanPhone,
        balance: student.balance,
        status: sendResult.status || (sendResult.success ? 'Sent' : 'Failed'),
        error: sendResult.error || null,
        directLink
      };
    });

    const settled = await Promise.allSettled(dispatchPromises);
    const results = settled.map(s => s.status === 'fulfilled' ? s.value : { status: 'Failed', error: 'Dispatch error' });

    const sentCount = results.filter(r => r.status === 'Sent' || r.status === 'Delivered').length;
    const failedCount = results.filter(r => r.status === 'Failed').length;

    res.json({
      success: true,
      message: `Dispatched WhatsApp Fee Reminders: ${sentCount} sent successfully, ${failedCount} failed.`,
      data: {
        totalDefaulters: defaultersList.length,
        sentCount,
        failedCount,
        results
      }
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
