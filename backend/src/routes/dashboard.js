const express = require('express');
const db = require('../db');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

/**
 * GET /api/v1/dashboard/stats?date=YYYY-MM-DD
 * High level institute attendance metrics
 */
router.get('/stats', authenticateToken, requireRole(['ADMIN']), async (req, res, next) => {
  try {
    const date = req.query.date || new Date().toISOString().split('T')[0];

    // Total active students in institute
    const totalStudentsRes = await db.query(`SELECT COUNT(*) as count FROM students WHERE status = 'active'`);
    const totalStudents = parseInt(totalStudentsRes.rows[0]?.count || 0, 10);

    // Total batches
    const totalBatchesRes = await db.query(`SELECT COUNT(*) as count FROM batches WHERE status = 'active'`);
    const totalBatches = parseInt(totalBatchesRes.rows[0]?.count || 0, 10);

    // Attendance breakdown for the selected date
    const attendanceRes = await db.query(
      `SELECT status, COUNT(*) as count FROM attendance WHERE date = $1 GROUP BY status`,
      [date]
    );

    let totalPresent = 0;
    let totalAbsent = 0;

    attendanceRes.rows.forEach(r => {
      if (r.status === 'P') totalPresent = parseInt(r.count, 10);
      if (r.status === 'A') totalAbsent = parseInt(r.count, 10);
    });

    const totalMarked = totalPresent + totalAbsent;
    const attendancePercentage = totalMarked > 0 ? Math.round((totalPresent / totalMarked) * 100) : 0;

    res.json({
      success: true,
      data: {
        date,
        totalStudents,
        totalBatches,
        totalMarked,
        totalPresent,
        totalAbsent,
        attendancePercentage
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/dashboard/batch-summary?date=YYYY-MM-DD
 * Batch-wise attendance table
 */
router.get('/batch-summary', authenticateToken, requireRole(['ADMIN']), async (req, res, next) => {
  try {
    const date = req.query.date || new Date().toISOString().split('T')[0];

    // Fetch all active batches
    const batchesRes = await db.query(`
      SELECT b.id, b.name, b.subject, b.timing, u.name as teacher_name,
             (SELECT COUNT(*) FROM students s WHERE s.batch_id = b.id AND s.status = 'active') as student_count
      FROM batches b
      LEFT JOIN users u ON b.teacher_id = u.id
      WHERE b.status = 'active'
      ORDER BY b.id ASC
    `);

    // Fetch attendance for the date
    const attendanceRes = await db.query(
      `SELECT batch_id, status, COUNT(*) as count FROM attendance WHERE date = $1 GROUP BY batch_id, status`,
      [date]
    );

    const countsMap = new Map();
    attendanceRes.rows.forEach(r => {
      const bId = r.batch_id;
      if (!countsMap.has(bId)) countsMap.set(bId, { P: 0, A: 0 });
      countsMap.get(bId)[r.status] = parseInt(r.count, 10);
    });

    const summary = batchesRes.rows.map(batch => {
      const counts = countsMap.get(batch.id) || { P: 0, A: 0 };
      const studentCount = parseInt(batch.student_count, 10);
      const markedCount = counts.P + counts.A;
      const isMarked = markedCount > 0 && markedCount >= studentCount;
      const percentage = markedCount > 0 ? Math.round((counts.P / markedCount) * 100) : 0;

      return {
        batchId: batch.id,
        batchName: batch.name,
        subject: batch.subject,
        timing: batch.timing,
        teacherName: batch.teacher_name || 'Unassigned',
        totalStudents: studentCount,
        presentCount: counts.P,
        absentCount: counts.A,
        isMarked,
        attendancePercentage: percentage
      };
    });

    res.json({
      success: true,
      data: summary
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/dashboard/absent-grouped?date=YYYY-MM-DD
 * Absent students grouped by batch with WhatsApp status
 */
router.get('/absent-grouped', authenticateToken, requireRole(['ADMIN']), async (req, res, next) => {
  try {
    const date = req.query.date || new Date().toISOString().split('T')[0];

    const absenteesRes = await db.query(
      `SELECT a.batch_id, b.name as batch_name, b.timing,
              s.id as student_id, s.name as student_name, s.roll_no, s.parent_name, s.parent_phone,
              m.id as message_log_id, m.status as message_status, m.error_reason, m.created_at as message_sent_at
       FROM attendance a
       JOIN batches b ON a.batch_id = b.id
       JOIN students s ON a.student_id = s.id
       LEFT JOIN LATERAL (
         SELECT id, status, error_reason, created_at
         FROM message_logs
         WHERE student_id = s.id AND batch_id = a.batch_id AND date = a.date
         ORDER BY id DESC LIMIT 1
       ) m ON true
       WHERE a.date = $1 AND a.status = 'A'
       ORDER BY b.id ASC, s.roll_no ASC`,
      [date]
    );

    // Group by batch
    const groupedMap = new Map();

    absenteesRes.rows.forEach(item => {
      if (!groupedMap.has(item.batch_id)) {
        groupedMap.set(item.batch_id, {
          batchId: item.batch_id,
          batchName: item.batch_name,
          timing: item.timing,
          absentCount: 0,
          students: []
        });
      }

      const group = groupedMap.get(item.batch_id);
      group.absentCount++;
      group.students.push({
        studentId: item.student_id,
        studentName: item.student_name,
        rollNo: item.roll_no,
        parentName: item.parent_name,
        parentPhone: item.parent_phone,
        messageLogId: item.message_log_id,
        messageStatus: item.message_status || 'Not Sent',
        errorReason: item.error_reason,
        messageSentAt: item.message_sent_at
      });
    });

    res.json({
      success: true,
      data: Array.from(groupedMap.values())
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
