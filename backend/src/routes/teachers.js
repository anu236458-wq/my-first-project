const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { formatWhatsAppNumber } = require('../utils/phoneValidator');

const router = express.Router();

/**
 * GET /api/v1/teachers (Admin only)
 */
router.get('/', authenticateToken, requireRole(['ADMIN']), async (req, res, next) => {
  try {
    const result = await db.query(`
      SELECT u.id, u.name, u.email, u.phone, u.status, u.created_at,
             COUNT(b.id) as assigned_batch_count
      FROM users u
      LEFT JOIN batches b ON b.teacher_id = u.id AND b.status = 'active'
      WHERE u.role = 'TEACHER'
      GROUP BY u.id
      ORDER BY u.name ASC
    `);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/teachers (Admin only)
 */
router.post('/', authenticateToken, requireRole(['ADMIN']), async (req, res, next) => {
  try {
    const { name, email, phone, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Teacher name, email, and initial password are required.'
      });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    const cleanPhone = phone ? formatWhatsAppNumber(phone) : null;

    const result = await db.query(
      `INSERT INTO users (name, email, phone, password_hash, role, status)
       VALUES ($1, $2, $3, $4, 'TEACHER', 'active') RETURNING id, name, email, phone, role, status, created_at`,
      [name.trim(), email.trim().toLowerCase(), cleanPhone, passwordHash]
    );

    res.status(201).json({
      success: true,
      message: 'Teacher account created successfully.',
      data: result.rows[0]
    });
  } catch (err) {
    if (err.message && err.message.includes('unique')) {
      return res.status(409).json({ success: false, error: 'Email already exists.' });
    }
    next(err);
  }
});

module.exports = router;
