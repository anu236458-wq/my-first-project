const jwt = require('jsonwebtoken');
const config = require('../config');
const db = require('../db');

async function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Access token required. Please log in.'
    });
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    const userRes = await db.query('SELECT id, name, email, role, status FROM users WHERE id = $1', [decoded.id]);

    if (!userRes.rows.length || userRes.rows[0].status !== 'active') {
      return res.status(403).json({
        success: false,
        error: 'User account is invalid or deactivated.'
      });
    }

    req.user = userRes.rows[0];
    next();
  } catch (err) {
    return res.status(403).json({
      success: false,
      error: 'Invalid or expired session token. Please log in again.'
    });
  }
}

function requireRole(allowedRoles = []) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized.' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: `Access denied. Requires one of roles: ${allowedRoles.join(', ')}`
      });
    }

    next();
  };
}

module.exports = {
  authenticateToken,
  requireRole
};
