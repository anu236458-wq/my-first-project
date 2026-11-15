const express = require('express');
const db = require('../db');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { logAudit } = require('../services/auditService');

const router = express.Router();

/**
 * GET /api/v1/batches
 * List batches according to role permissions
 */
router.get('/', authenticateToken, async (req, res, next) => {
  try {
    let sql;
    let params = [];

    if (req.user.role === 'TEACHER') {
      sql = `
        SELECT b.*, u.name as teacher_name,
               (SELECT COUNT(*) FROM students s WHERE s.batch_id = b.id AND s.status = 'active') as active_student_count
        FROM batches b
        LEFT JOIN users u ON b.teacher_id = u.id
        WHERE b.teacher_id = $1 AND b.status = 'active'
        ORDER BY b.id ASC
      `;
      params = [req.user.id];
    } else {
      sql = `
        SELECT b.*, u.name as teacher_name,
               (SELECT COUNT(*) FROM students s WHERE s.batch_id = b.id AND s.status = 'active') as active_student_count
        FROM batches b
        LEFT JOIN users u ON b.teacher_id = u.id
        ORDER BY b.id ASC
      `;
    }

    const result = await db.query(sql, params);
    res.json({
      success: true,
      data: result.rows
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/batches/:id
 */
router.get('/:id', authenticateToken, async (req, res, next) => {
  try {
    const batchId = parseInt(req.params.id, 10);
    const result = await db.query(
      `SELECT b.*, u.name as teacher_name FROM batches b LEFT JOIN users u ON b.teacher_id = u.id WHERE b.id = $1`,
      [batchId]
    );

    if (!result.rows.length) {
      return res.status(404).json({ success: false, error: 'Batch not found.' });
    }

    const batch = result.rows[0];

    // Enforce teacher access
    if (req.user.role === 'TEACHER' && batch.teacher_id !== req.user.id) {
      return res.status(403).json({ success: false, error: 'You are not assigned to this batch.' });
    }

    res.json({ success: true, data: batch });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/batches (Admin only)
 */
router.post('/', authenticateToken, requireRole(['ADMIN']), async (req, res, next) => {
  try {
    const { name, subject, timing, teacher_id } = req.body;

    if (!name || !subject || !timing || !teacher_id) {
      return res.status(400).json({
        success: false,
        error: 'Batch name, subject, timing, and assigned teacher are required.'
      });
    }

    const result = await db.query(
      `INSERT INTO batches (name, subject, timing, teacher_id, status)
       VALUES ($1, $2, $3, $4, 'active') RETURNING *`,
      [name.trim(), subject.trim(), timing.trim(), parseInt(teacher_id, 10)]
    );

    await logAudit({
      entityType: 'BATCH',
      entityId: result.rows[0].id,
      action: 'CREATE',
      newValues: result.rows[0],
      userId: req.user.id,
      req
    });

    res.status(201).json({
      success: true,
      message: 'Batch created successfully.',
      data: result.rows[0]
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/v1/batches/:id (Admin only)
 */
router.put('/:id', authenticateToken, requireRole(['ADMIN']), async (req, res, next) => {
  try {
    const batchId = parseInt(req.params.id, 10);
    const { name, subject, timing, teacher_id, status } = req.body;

    const existingRes = await db.query('SELECT * FROM batches WHERE id = $1', [batchId]);
    if (!existingRes.rows.length) {
      return res.status(404).json({ success: false, error: 'Batch not found.' });
    }

    const existing = existingRes.rows[0];

    const result = await db.query(
      `UPDATE batches
       SET name = $1, subject = $2, timing = $3, teacher_id = $4, status = $5, updated_at = CURRENT_TIMESTAMP
       WHERE id = $6 RETURNING *`,
      [
        name || existing.name,
        subject || existing.subject,
        timing || existing.timing,
        teacher_id ? parseInt(teacher_id, 10) : existing.teacher_id,
        status || existing.status,
        batchId
      ]
    );

    await logAudit({
      entityType: 'BATCH',
      entityId: batchId,
      action: 'UPDATE',
      oldValues: existing,
      newValues: result.rows[0],
      userId: req.user.id,
      req
    });

    res.json({
      success: true,
      message: 'Batch updated successfully.',
      data: result.rows[0]
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
