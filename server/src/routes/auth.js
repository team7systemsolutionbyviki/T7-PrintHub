/* ==========================================================================
   T7 PRINT HUB — AUTHENTICATION ROUTES
   ========================================================================== */

const express = require('express');
const router = express.Router();
const { authenticateFirebaseToken } = require('../middleware/firebase-auth');
const { queryOne } = require('../config/db');

/**
 * GET /api/auth/me
 * Returns authenticated user profile and MySQL role
 */
router.get('/me', authenticateFirebaseToken, async (req, res, next) => {
  try {
    const customer = await queryOne(
      `SELECT company_name, gst_number, total_orders, total_spent FROM customers WHERE user_id = ?`,
      [req.user.id]
    );

    res.json({
      success: true,
      user: {
        id: req.user.id,
        firebaseUid: req.user.firebaseUid,
        name: req.user.name,
        email: req.user.email,
        phone: req.user.phone,
        roleId: req.user.roleId,
        role: req.user.role,
        status: req.user.status,
        isSuperAdmin: req.user.role === 'SUPER_ADMIN',
        isAdmin: ['ADMIN', 'SUPER_ADMIN'].includes(req.user.role),
        customerDetails: customer || {}
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/auth/sync
 * Called after Firebase login to trigger/verify MySQL user sync
 */
router.post('/sync', authenticateFirebaseToken, async (req, res, next) => {
  try {
    res.json({
      success: true,
      user: req.user
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
