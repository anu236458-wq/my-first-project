const express = require('express');
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { logAudit } = require('../services/auditService');

const router = express.Router();

/**
 * Validate teacher permissions on a batch
 */
async function verifyBatchAccess(batchId, user) {
  const batchRes = await db.query('SELECT * FROM batches WHERE id = $1', [batchId]);
  if (!batchRes.rows.length) {
    return { error: 'Batch not found', status: 404 };
  }
  const batch = batchRes.rows[0];
  if (user.role === 'TEACHER' && batch.teacher_id !== user.id) {
    return { error: 'You are not assigned to this batch', status: 403 };
  }
  return { batch };
}

/**
 * GET /api/v1/attendance/batch-roster?batch_id=&date=
 * Fetch student roster with any existing attendance for the selected date
 */
router.get('/batch-roster', authenticateToken, async (req, res, next) => {
  try {
    const { batch_id, date } = req.query;

    if (!batch_id || !date) {
      return res.status(400).json({ success: false, error: 'batch_id and date are required.' });
    }

    const batchId = parseInt(batch_id, 10);
    const { batch, error, status } = await verifyBatchAccess(batchId, req.user);
    if (error) return res.status(status).json({ success: false, error });

    // Fetch active students for this batch
    const studentsRes = await db.query(
      `SELECT id, name, roll_no, parent_name, parent_phone, status
       FROM students
       WHERE batch_id = $1 AND status = 'active'
       ORDER BY roll_no ASC`,
      [batchId]
    );

    // Fetch existing attendance records for this date
    const attendanceRes = await db.query(
      `SELECT student_id, status, marked_by, updated_at
       FROM attendance
       WHERE batch_id = $1 AND date = $2`,
      [batchId, date]
    );

    const attendanceMap = new Map();
    attendanceRes.rows.forEach(r => attendanceMap.set(r.student_id, r.status));

    const roster = studentsRes.rows.map(student => ({
      id: student.id,
      name: student.name,
      roll_no: student.roll_no,
      parent_name: student.parent_name,
      parent_phone: student.parent_phone,
      // If already marked previously, populate status; otherwise null (unselected)
      status: attendanceMap.get(student.id) || null
    }));

    const totalStudents = roster.length;
    const presentCount = roster.filter(s => s.status === 'P').length;
    const absentCount = roster.filter(s => s.status === 'A').length;
    const unmarkedCount = roster.filter(s => s.status === null).length;
    const isSubmitted = attendanceRes.rows.length === totalStudents && totalStudents > 0;

    res.json({
      success: true,
      data: {
        batch,
        date,
        totalStudents,
        presentCount,
        absentCount,
        unmarkedCount,
        isSubmitted,
        roster
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/attendance/submit
 * Submit complete batch attendance for date.
 * Enforces: Every active student must be marked 'P' or 'A'.
 */
router.post('/submit', authenticateToken, async (req, res, next) => {
  try {
    const { batch_id, date, records } = req.body;

    if (!batch_id || !date || !Array.isArray(records)) {
      return res.status(400).json({
        success: false,
        error: 'batch_id, date, and records array are required.'
      });
    }

    const batchId = parseInt(batch_id, 10);
    const { batch, error, status } = await verifyBatchAccess(batchId, req.user);
    if (error) return res.status(status).json({ success: false, error });

    // Fetch all active students in batch
    const studentsRes = await db.query(
      `SELECT id, name, roll_no, parent_name, parent_phone FROM students WHERE batch_id = $1 AND status = 'active'`,
      [batchId]
    );

    const activeStudentIds = new Set(studentsRes.rows.map(s => s.id));
    const activeStudentsMap = new Map(studentsRes.rows.map(s => [s.id, s]));

    if (activeStudentIds.size === 0) {
      return res.status(400).json({
        success: false,
        error: 'Cannot submit attendance for a batch with 0 active students.'
      });
    }

    // Validation: Every active student MUST have a valid status 'P' or 'A'
    const recordMap = new Map();
    for (const rec of records) {
      if (!rec.student_id || !['P', 'A'].includes(rec.status)) {
        return res.status(400).json({
          success: false,
          error: `Invalid attendance record for student ID ${rec.student_id}. Status must be strictly 'P' or 'A'.`
        });
      }
      recordMap.set(parseInt(rec.student_id, 10), rec.status);
    }

    // Check if any student was left unmarked
    const unmarked = [];
    for (const studentId of activeStudentIds) {
      if (!recordMap.has(studentId)) {
        const st = activeStudentsMap.get(studentId);
        unmarked.push(`${st.name} (Roll: ${st.roll_no})`);
      }
    }

    if (unmarked.length > 0) {
      return res.status(400).json({
        success: false,
        error: `Submission blocked: All students must be marked. ${unmarked.length} student(s) unmarked: ${unmarked.slice(0, 3).join(', ')}${unmarked.length > 3 ? '...' : ''}`
      });
    }

    // Upsert each record
    const savedRecords = [];
    let presentCount = 0;
    let absentCount = 0;
    const absentStudents = [];

    for (const student of studentsRes.rows) {
      const studentStatus = recordMap.get(student.id);

      if (studentStatus === 'P') presentCount++;
      if (studentStatus === 'A') {
        absentCount++;
        absentStudents.push(student);
      }

      // Check if updating existing record for audit log
      const prevRes = await db.query(
        `SELECT status FROM attendance WHERE student_id = $1 AND batch_id = $2 AND date = $3`,
        [student.id, batchId, date]
      );

      const isUpdate = prevRes.rows.length > 0;
      const oldStatus = isUpdate ? prevRes.rows[0].status : null;

      // Upsert query
      let upsertSql;
      if (db.isUsingFallback()) {
        upsertSql = `INSERT INTO attendance (student_id, batch_id, date, status, marked_by) VALUES ($1, $2, $3, $4, $5) RETURNING *`;
      } else {
        upsertSql = `
          INSERT INTO attendance (student_id, batch_id, date, status, marked_by, updated_at)
          VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
          ON CONFLICT (student_id, batch_id, date)
          DO UPDATE SET status = EXCLUDED.status, marked_by = EXCLUDED.marked_by, updated_at = CURRENT_TIMESTAMP
          RETURNING *
        `;
      }

      const upsertRes = await db.query(upsertSql, [
        student.id,
        batchId,
        date,
        studentStatus,
        req.user.id
      ]);

      savedRecords.push(upsertRes.rows[0]);

      if (isUpdate && oldStatus !== studentStatus) {
        await logAudit({
          entityType: 'ATTENDANCE',
          entityId: upsertRes.rows[0]?.id || student.id,
          action: 'UPDATE',
          oldValues: { status: oldStatus, date, student_id: student.id },
          newValues: { status: studentStatus, date, student_id: student.id },
          userId: req.user.id,
          req
        });
      }
    }

    res.json({
      success: true,
      message: `Attendance saved successfully. Present: ${presentCount}, Absent: ${absentCount}.`,
      data: {
        batch,
        date,
        totalStudents: studentsRes.rows.length,
        presentCount,
        absentCount,
        absentStudents
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/attendance/absent-list?batch_id=&date=
 * Fetch absent students and their message dispatch status
 */
router.get('/absent-list', authenticateToken, async (req, res, next) => {
  try {
    const { batch_id, date } = req.query;

    if (!batch_id || !date) {
      return res.status(400).json({ success: false, error: 'batch_id and date are required.' });
    }

    const batchId = parseInt(batch_id, 10);
    const { batch, error, status } = await verifyBatchAccess(batchId, req.user);
    if (error) return res.status(status).json({ success: false, error });

    // Fetch absent records with student details and message dispatch status
    const result = await db.query(
      `SELECT s.id as student_id, s.name as student_name, s.roll_no, s.parent_name, s.parent_phone,
              a.status as attendance_status,
              m.id as message_log_id, m.status as message_status, m.error_reason, m.provider_message_id, m.created_at as message_sent_at
       FROM attendance a
       JOIN students s ON a.student_id = s.id
       LEFT JOIN LATERAL (
         SELECT id, status, error_reason, provider_message_id, created_at
         FROM message_logs
         WHERE student_id = s.id AND batch_id = a.batch_id AND date = a.date
         ORDER BY id DESC LIMIT 1
       ) m ON true
       WHERE a.batch_id = $1 AND a.date = $2 AND a.status = 'A'
       ORDER BY s.roll_no ASC`,
      [batchId, date]
    );

    // Also get totals
    const countsRes = await db.query(
      `SELECT status, COUNT(*) as count FROM attendance WHERE batch_id = $1 AND date = $2 GROUP BY status`,
      [batchId, date]
    );

    let presentCount = 0;
    let absentCount = 0;
    countsRes.rows.forEach(r => {
      if (r.status === 'P') presentCount = parseInt(r.count, 10);
      if (r.status === 'A') absentCount = parseInt(r.count, 10);
    });

    res.json({
      success: true,
      data: {
        batch,
        date,
        totalStudents: presentCount + absentCount,
        presentCount,
        absentCount,
        absentList: result.rows
      }
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
