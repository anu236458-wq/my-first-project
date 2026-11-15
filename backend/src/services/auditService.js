const db = require('../db');

async function logAudit({ entityType, entityId, action, oldValues = null, newValues = null, userId = null, req = null }) {
  try {
    const ipAddress = req?.ip || req?.socket?.remoteAddress || null;
    await db.query(
      `INSERT INTO audit_logs (entity_type, entity_id, action, old_values, new_values, user_id, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        entityType,
        entityId,
        action,
        oldValues ? JSON.stringify(oldValues) : null,
        newValues ? JSON.stringify(newValues) : null,
        userId,
        ipAddress
      ]
    );
  } catch (err) {
    console.error('[Audit Log] Failed to record audit log:', err.message);
  }
}

module.exports = {
  logAudit
};
