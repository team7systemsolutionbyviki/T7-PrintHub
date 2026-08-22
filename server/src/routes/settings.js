/* ==========================================================================
   T7 PRINT HUB — SETTINGS API ROUTES
   ========================================================================== */

const express = require('express');
const router = express.Router();
const { query, queryOne } = require('../config/db');
const { authenticateFirebaseToken, optionalFirebaseToken } = require('../middleware/firebase-auth');
const { requireAdmin } = require('../middleware/admin-auth');

/**
 * GET /api/settings
 * Public/User: Get general shop settings
 */
router.get('/', async (req, res, next) => {
  try {
    const row = await queryOne(`SELECT setting_value FROM settings WHERE setting_key = 'general'`);
    const settings = row && row.setting_value ? (typeof row.setting_value === 'string' ? JSON.parse(row.setting_value) : row.setting_value) : {};
    res.json({ success: true, settings });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/settings
 * Admin: Update shop settings
 */
router.put('/', authenticateFirebaseToken, requireAdmin, async (req, res, next) => {
  try {
    const newSettings = req.body;
    await query(
      `INSERT INTO settings (setting_key, setting_value)
       VALUES ('general', ?)
       ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
      [JSON.stringify(newSettings)]
    );

    res.json({ success: true, settings: newSettings });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
