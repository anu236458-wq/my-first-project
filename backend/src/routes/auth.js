const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config');
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

/**
 * POST /api/v1/auth/login
 * Public authentication
 */
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required.'
      });
    }

    const result = await db.query('SELECT * FROM users WHERE email = $1', [email.trim().toLowerCase()]);

    if (!result.rows.length) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials. Please verify your email and password.'
      });
    }

    const user = result.rows[0];

    if (user.status !== 'active') {
      return res.status(403).json({
        success: false,
        error: 'Account has been deactivated. Please contact the administrator.'
      });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials. Please verify your email and password.'
      });
    }

    // Sign JWT
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn }
    );

    res.json({
      success: true,
      message: 'Login successful.',
      data: {
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role
        }
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/auth/me
 * Returns profile of current logged-in user
 */
router.get('/me', authenticateToken, async (req, res, next) => {
  try {
    // If teacher, fetch their assigned batches
    let assignedBatches = [];
    if (req.user.role === 'TEACHER') {
      const batchRes = await db.query(
        'SELECT id, name, subject, timing, status FROM batches WHERE teacher_id = $1 AND status = $2',
        [req.user.id, 'active']
      );
      assignedBatches = batchRes.rows;
    }

    res.json({
      success: true,
      data: {
        user: req.user,
        assignedBatches
      }
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
