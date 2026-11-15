const express = require('express');
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { sendAbsenceAlert, retryMessage } = require('../services/whatsapp');
const { getWhatsAppDirectLink } = require('../utils/phoneValidator');
const config = require('../config');

const router = express.Router();

/**
 * POST /api/v1/messages/send-absent-broadcast
 * One-tap WhatsApp message to all absent students' parents for a batch & date
 */
router.post('/send-absent-broadcast', authenticateToken, async (req, res, next) => {
  try {
    const { batch_id, date, force } = req.body;

    if (!batch_id || !date) {
      return res.status(400).json({ success: false, error: 'batch_id and date are required.' });
    }

    const batchId = parseInt(batch_id, 10);

    // Batch and teacher permission check
    const batchRes = await db.query('SELECT * FROM batches WHERE id = $1', [batchId]);
    if (!batchRes.rows.length) {
      return res.status(404).json({ success: false, error: 'Batch not found.' });
    }
    const batch = batchRes.rows[0];
    if (req.user.role === 'TEACHER' && batch.teacher_id !== req.user.id) {
      return res.status(403).json({ success: false, error: 'You are not assigned to this batch.' });
    }

    // Check if duplicate prevention applies
    if (!force) {
      const existingLogsRes = await db.query(
        `SELECT COUNT(*) as count FROM message_logs WHERE batch_id = $1 AND date = $2 AND status IN ('Sent', 'Delivered')`,
        [batchId, date]
      );
      const sentCount = parseInt(existingLogsRes.rows[0]?.count || 0, 10);
      if (sentCount > 0) {
        return res.status(409).json({
          success: false,
          alreadySent: true,
          error: `Messages have already been sent to ${sentCount} parent(s) for this batch today. Duplicate sending is prevented.`
        });
      }
    }

    // Find all absent students for this batch and date
    const absenteesRes = await db.query(
      `SELECT s.*
       FROM attendance a
       JOIN students s ON a.student_id = s.id
       WHERE a.batch_id = $1 AND a.date = $2 AND a.status = 'A'`,
      [batchId, date]
    );

    const absentStudents = absenteesRes.rows;

    if (absentStudents.length === 0) {
      return res.json({
        success: true,
        message: 'No absent students found for this batch and date.',
        data: {
          totalAbsent: 0,
          sentCount: 0,
          failedCount: 0,
          results: []
        }
      });
    }

    // Concurrently dispatch messages to all absent students' parents
    const dispatchPromises = absentStudents.map(student =>
      sendAbsenceAlert({
        student,
        batch,
        date,
        senderUser: req.user
      })
    );

    const settledResults = await Promise.allSettled(dispatchPromises);

    const results = settledResults.map((outcome, idx) => {
      const student = absentStudents[idx];
      if (outcome.status === 'fulfilled') {
        return outcome.value;
      } else {
        const fallbackText = `Dear ${student.parent_name || 'Parent'}, ${student.name} was absent from ${batch.name} on ${date}. - ${config.institute.name}`;
        return {
          studentId: student.id,
          studentName: student.name,
          rollNo: student.roll_no,
          parentName: student.parent_name,
          parentPhone: student.parent_phone,
          status: 'Failed',
          error: outcome.reason?.message || 'Dispatch encountered an unexpected exception',
          directLink: getWhatsAppDirectLink(student.parent_phone, fallbackText)
        };
      }
    });

    const sentCount = results.filter(r => r.status === 'Sent' || r.status === 'Delivered').length;
    const failedCount = results.filter(r => r.status === 'Failed').length;

    res.json({
      success: true,
      message: `Dispatched WhatsApp alerts: ${sentCount} succeeded, ${failedCount} failed.`,
      data: {
        batchId,
        date,
        totalAbsent: absentStudents.length,
        sentCount,
        failedCount,
        results
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/messages/retry-single
 * Retry sending failed message for a student
 */
router.post('/retry-single', authenticateToken, async (req, res, next) => {
  try {
    const { student_id, batch_id, date, log_id } = req.body;

    let targetStudentId = student_id;
    let targetBatchId = batch_id;
    let targetDate = date;

    if (log_id) {
      const logRes = await db.query('SELECT * FROM message_logs WHERE id = $1', [parseInt(log_id, 10)]);
      if (!logRes.rows.length) {
        return res.status(404).json({ success: false, error: 'Message log not found.' });
      }
      const log = logRes.rows[0];
      targetStudentId = log.student_id;
      targetBatchId = log.batch_id;
      targetDate = log.date;
    }

    const studentRes = await db.query('SELECT * FROM students WHERE id = $1', [targetStudentId]);
    const batchRes = await db.query('SELECT * FROM batches WHERE id = $1', [targetBatchId]);

    if (!studentRes.rows.length || !batchRes.rows.length) {
      return res.status(404).json({ success: false, error: 'Student or batch not found.' });
    }

    const result = await sendAbsenceAlert({
      student: studentRes.rows[0],
      batch: batchRes.rows[0],
      date: targetDate,
      senderUser: req.user
    });

    res.json({
      success: true,
      message: result.status === 'Sent' ? 'Message sent successfully.' : 'Retry failed.',
      data: result
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/messages/logs?batch_id=&date=
 */
router.get('/logs', authenticateToken, async (req, res, next) => {
  try {
    const { batch_id, date } = req.query;
    let sql = `
      SELECT m.*, s.name as student_name, s.roll_no, s.parent_name
      FROM message_logs m
      JOIN students s ON m.student_id = s.id
      WHERE 1=1
    `;
    const params = [];

    if (batch_id) {
      params.push(parseInt(batch_id, 10));
      sql += ` AND m.batch_id = $${params.length}`;
    }
    if (date) {
      params.push(date);
      sql += ` AND m.date = $${params.length}`;
    }

    sql += ` ORDER BY m.id DESC`;

    const result = await db.query(sql, params);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    next(err);
  }
});

/**
 * Public Webhook for WhatsApp Provider delivery receipts
 */
router.post('/webhook', async (req, res) => {
  try {
    // Acknowledge quickly
    const body = req.body;
    console.log('[WhatsApp Webhook Received]:', JSON.stringify(body, null, 2));

    // Handle Meta WhatsApp delivery status update
    const entry = body?.entry?.[0];
    const changes = entry?.changes?.[0];
    const statuses = changes?.value?.statuses;

    if (Array.isArray(statuses) && statuses.length > 0) {
      for (const st of statuses) {
        const providerMessageId = st.id;
        const statusMap = {
          sent: 'Sent',
          delivered: 'Delivered',
          read: 'Delivered',
          failed: 'Failed'
        };
        const mappedStatus = statusMap[st.status] || 'Sent';
        const errorReason = st.errors ? JSON.stringify(st.errors) : null;

        await db.query(
          `UPDATE message_logs SET status = $1, error_reason = $2 WHERE provider_message_id = $3`,
          [mappedStatus, errorReason, providerMessageId]
        );
      }
    }

    res.status(200).send('EVENT_RECEIVED');
  } catch (err) {
    console.error('[WhatsApp Webhook Error]:', err.message);
    res.status(200).send('OK');
  }
});

module.exports = router;
