const express = require('express');
const db = require('../db');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { formatWhatsAppNumber, isValidPhone } = require('../utils/phoneValidator');
const { logAudit } = require('../services/auditService');

const router = express.Router();

/**
 * GET /api/v1/students
 * List students with filters
 */
router.get('/', authenticateToken, async (req, res, next) => {
  try {
    const { batch_id, status, search } = req.query;

    let sql = `
      SELECT s.*, b.name as batch_name
      FROM students s
      JOIN batches b ON s.batch_id = b.id
      WHERE 1=1
    `;
    const params = [];

    // If teacher, only allow viewing students of assigned batches
    if (req.user.role === 'TEACHER') {
      params.push(req.user.id);
      sql += ` AND b.teacher_id = $${params.length}`;
    }

    if (batch_id) {
      params.push(parseInt(batch_id, 10));
      sql += ` AND s.batch_id = $${params.length}`;
    }

    if (status) {
      params.push(status);
      sql += ` AND s.status = $${params.length}`;
    }

    if (search) {
      params.push(`%${search.trim().toLowerCase()}%`);
      sql += ` AND (LOWER(s.name) LIKE $${params.length} OR LOWER(s.roll_no) LIKE $${params.length} OR s.parent_phone LIKE $${params.length})`;
    }

    sql += ` ORDER BY s.batch_id ASC, s.roll_no ASC`;

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
 * POST /api/v1/students (Admin only)
 */
router.post('/', authenticateToken, requireRole(['ADMIN']), async (req, res, next) => {
  try {
    const {
      name, roll_no, parent_name, parent_phone, batch_id, joining_date,
      address, student_class, stream, board, subject_fees
    } = req.body;

    if (!name || !roll_no || !parent_name || !parent_phone || !batch_id) {
      return res.status(400).json({
        success: false,
        error: 'Name, roll number, parent name, parent phone, and batch are required.'
      });
    }

    const formattedPhone = formatWhatsAppNumber(parent_phone);
    if (!formattedPhone) {
      return res.status(400).json({
        success: false,
        error: 'Invalid parent phone number. Please provide a valid 10-digit number or international format (e.g. +919876543210).'
      });
    }

    // Compute total fee from subject_fees array
    const feesArr = Array.isArray(subject_fees) ? subject_fees : [];
    const totalFee = feesArr.reduce((acc, sf) => acc + parseFloat(sf.fee || 0), 0);

    const result = await db.query(
      `INSERT INTO students
         (name, roll_no, parent_name, parent_phone, batch_id, joining_date, status,
          address, student_class, stream, board, subject_fees, total_fee)
       VALUES ($1,$2,$3,$4,$5,$6,'active',$7,$8,$9,$10,$11,$12)
       RETURNING *`,
      [
        name.trim(),
        roll_no.trim(),
        parent_name.trim(),
        formattedPhone,
        parseInt(batch_id, 10),
        joining_date || new Date().toISOString().split('T')[0],
        (address || '').trim(),
        student_class || null,
        stream || null,
        board || null,
        JSON.stringify(feesArr),
        totalFee
      ]
    );

    await logAudit({
      entityType: 'STUDENT',
      entityId: result.rows[0].id,
      action: 'CREATE',
      newValues: result.rows[0],
      userId: req.user.id,
      req
    });

    res.status(201).json({
      success: true,
      message: 'Student created successfully.',
      data: result.rows[0]
    });
  } catch (err) {
    if (err.message && err.message.includes('uq_batch_roll_no')) {
      return res.status(409).json({
        success: false,
        error: `Roll number already exists in this batch.`
      });
    }
    next(err);
  }
});

/**
 * PUT /api/v1/students/:id (Admin only)
 */
router.put('/:id', authenticateToken, requireRole(['ADMIN']), async (req, res, next) => {
  try {
    const studentId = parseInt(req.params.id, 10);
    const { name, roll_no, parent_name, parent_phone, batch_id, status } = req.body;

    const existingRes = await db.query('SELECT * FROM students WHERE id = $1', [studentId]);
    if (!existingRes.rows.length) {
      return res.status(404).json({ success: false, error: 'Student not found.' });
    }

    const existing = existingRes.rows[0];

    let cleanPhone = existing.parent_phone;
    if (parent_phone) {
      cleanPhone = formatWhatsAppNumber(parent_phone);
      if (!cleanPhone) {
        return res.status(400).json({
          success: false,
          error: 'Invalid parent phone number format.'
        });
      }
    }

    const result = await db.query(
      `UPDATE students
       SET name = $1, roll_no = $2, parent_name = $3, parent_phone = $4, batch_id = $5, status = $6, updated_at = CURRENT_TIMESTAMP
       WHERE id = $7 RETURNING *`,
      [
        name || existing.name,
        roll_no || existing.roll_no,
        parent_name || existing.parent_name,
        cleanPhone,
        batch_id ? parseInt(batch_id, 10) : existing.batch_id,
        status || existing.status,
        studentId
      ]
    );

    await logAudit({
      entityType: 'STUDENT',
      entityId: studentId,
      action: 'UPDATE',
      oldValues: existing,
      newValues: result.rows[0],
      userId: req.user.id,
      req
    });

    res.json({
      success: true,
      message: 'Student updated successfully.',
      data: result.rows[0]
    });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/v1/students/:id (Admin only)
 * Soft-delete: sets status to 'inactive' to preserve attendance history.
 * Hard delete falls back for local JSON store (no foreign key constraints).
 */
router.delete('/:id', authenticateToken, requireRole(['ADMIN']), async (req, res, next) => {
  try {
    const studentId = parseInt(req.params.id, 10);

    const existingRes = await db.query('SELECT * FROM students WHERE id = $1', [studentId]);
    if (!existingRes.rows.length) {
      return res.status(404).json({ success: false, error: 'Student not found.' });
    }

    const existing = existingRes.rows[0];

    // Soft-delete: mark inactive so attendance history is preserved
    await db.query(
      `UPDATE students SET status = 'inactive', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [studentId]
    );

    await logAudit({
      entityType: 'STUDENT',
      entityId: studentId,
      action: 'DELETE',
      oldValues: existing,
      newValues: { status: 'inactive' },
      userId: req.user.id,
      req
    });

    res.json({
      success: true,
      message: `Student "${existing.name}" has been removed successfully.`
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
