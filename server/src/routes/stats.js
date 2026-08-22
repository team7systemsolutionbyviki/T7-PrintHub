/* ==========================================================================
   T7 PRINT HUB — STATS & DASHBOARD API ROUTES
   ========================================================================== */

const express = require('express');
const router = express.Router();
const { queryOne } = require('../config/db');
const { authenticateFirebaseToken } = require('../middleware/firebase-auth');
const { requireAdmin } = require('../middleware/admin-auth');

/**
 * GET /api/stats/dashboard
 * Admin dashboard analytics summary
 */
router.get('/dashboard', authenticateFirebaseToken, requireAdmin, async (req, res, next) => {
  try {
    const totalUsers = await queryOne(`SELECT COUNT(*) AS count FROM users`);
    const totalCustomers = await queryOne(`SELECT COUNT(*) AS count FROM customers`);
    const totalBookings = await queryOne(`SELECT COUNT(*) AS count FROM bookings`);
    const pendingBookings = await queryOne(`SELECT COUNT(*) AS count FROM bookings WHERE status = 'PENDING'`);
    const totalOrders = await queryOne(`SELECT COUNT(*) AS count FROM orders`);
    const pendingOrders = await queryOne(`SELECT COUNT(*) AS count FROM orders WHERE status = 'PENDING'`);
    const revenueRow = await queryOne(`SELECT SUM(total_amount) AS revenue FROM orders WHERE payment_status = 'PAID'`);
    const bookingRevenueRow = await queryOne(`SELECT SUM(advance_amount) AS revenue FROM bookings WHERE payment_status IN ('PAID', 'PARTIAL')`);

    const totalRevenue = (Number(revenueRow?.revenue) || 0) + (Number(bookingRevenueRow?.revenue) || 0);

    res.json({
      success: true,
      stats: {
        totalUsers: totalUsers?.count || 0,
        totalCustomers: totalCustomers?.count || 0,
        totalBookings: totalBookings?.count || 0,
        pendingBookings: pendingBookings?.count || 0,
        totalOrders: totalOrders?.count || 0,
        pendingOrders: pendingOrders?.count || 0,
        totalRevenue
      }
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
