const express = require('express');
const db = require('../db');
const config = require('../config');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { getWhatsAppProvider } = require('../services/whatsapp');

const router = express.Router();

/**
 * GET /api/v1/settings (Admin only)
 */
router.get('/', authenticateToken, requireRole(['ADMIN']), async (req, res, next) => {
  try {
    const provider = getWhatsAppProvider();
    const health = await provider.checkHealth();

    const settingsRes = await db.query('SELECT key, value, description FROM institute_settings');
    const settingsObj = {};
    settingsRes.rows.forEach(r => {
      settingsObj[r.key] = r.value;
    });

    res.json({
      success: true,
      data: {
        institute: {
          name: settingsObj.institute_name || config.institute.name,
          phone: config.institute.phone
        },
        whatsapp: {
          activeProvider: config.whatsapp.provider,
          providerName: provider.name,
          status: health,
          templateName: settingsObj.whatsapp_template_name || config.whatsapp.meta.templateName,
          templateText: settingsObj.whatsapp_template_text || 'Dear {{parent_name}}, {{student_name}} was absent from {{batch}} on {{date}}. - {{institute_name}}',
          metaConfigured: Boolean(config.whatsapp.meta.phoneNumberId && config.whatsapp.meta.token && config.whatsapp.meta.token !== 'mock_access_token')
        }
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/v1/settings (Admin only)
 */
router.put('/', authenticateToken, requireRole(['ADMIN']), async (req, res, next) => {
  try {
    const { institute_name, whatsapp_template_name, whatsapp_template_text } = req.body;

    if (institute_name) {
      await db.query(
        `INSERT INTO institute_settings (key, value, description)
         VALUES ('institute_name', $1, 'Display name on parent notifications')
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
        [institute_name.trim()]
      );
      config.institute.name = institute_name.trim();
    }

    if (whatsapp_template_text) {
      await db.query(
        `INSERT INTO institute_settings (key, value, description)
         VALUES ('whatsapp_template_text', $1, 'Standard template format')
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
        [whatsapp_template_text.trim()]
      );
    }

    if (whatsapp_template_name) {
      await db.query(
        `INSERT INTO institute_settings (key, value, description)
         VALUES ('whatsapp_template_name', $1, 'Approved WhatsApp template')
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
        [whatsapp_template_name.trim()]
      );
    }

    res.json({
      success: true,
      message: 'Settings updated successfully.'
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
