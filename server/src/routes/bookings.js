/* ==========================================================================
   T7 PRINT HUB — BOOKINGS API ROUTES
   ========================================================================== */

const express = require('express');
const router = express.Router();
const { query, queryOne } = require('../config/db');
const { authenticateFirebaseToken } = require('../middleware/firebase-auth');
const { requireAdmin } = require('../middleware/admin-auth');

/**
 * Helper to format booking number e.g. BK-20260822-001
 */
function generateBookingNumber() {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.floor(100 + Math.random() * 900);
  return `BK-${dateStr}-${rand}`;
}

/**
 * GET /api/bookings
 * Customer gets own bookings; Admin gets all bookings
 */
router.get('/', authenticateFirebaseToken, async (req, res, next) => {
  try {
    const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(req.user.role);
    let sql, params;

    if (isAdmin) {
      sql = `SELECT b.*, u.name AS user_name, u.email AS user_email, u.phone AS user_phone
             FROM bookings b
             JOIN users u ON b.user_id = u.id
             ORDER BY b.created_at DESC`;
      params = [];
    } else {
      sql = `SELECT b.*, u.name AS user_name, u.email AS user_email, u.phone AS user_phone
             FROM bookings b
             JOIN users u ON b.user_id = u.id
             WHERE b.user_id = ?
             ORDER BY b.created_at DESC`;
      params = [req.user.id];
    }

    const bookings = await query(sql, params);

    // Fetch attached files for each booking
    for (const b of bookings) {
      b.files = await query(
        `SELECT id, original_name, stored_name, storage_path, mime_type, file_size, status, created_at
         FROM booking_files WHERE booking_id = ?`,
        [b.id]
      );
    }

    res.json({ success: true, bookings });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/bookings/:id
 * Get single booking by ID or booking_number
 */
router.get('/:id', authenticateFirebaseToken, async (req, res, next) => {
  try {
    const param = req.params.id;
    const isNum = /^\d+$/.test(param);
    const sql = isNum
      ? `SELECT b.*, u.name AS user_name, u.email AS user_email, u.phone AS user_phone FROM bookings b JOIN users u ON b.user_id = u.id WHERE b.id = ?`
      : `SELECT b.*, u.name AS user_name, u.email AS user_email, u.phone AS user_phone FROM bookings b JOIN users u ON b.user_id = u.id WHERE b.booking_number = ?`;

    const booking = await queryOne(sql, [param]);
    if (!booking) return res.status(404).json({ error: 'Booking not found.' });

    const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(req.user.role);
    if (!isAdmin && booking.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden: Access denied.' });
    }

    booking.files = await query(
      `SELECT id, original_name, stored_name, storage_path, mime_type, file_size, status, created_at
       FROM booking_files WHERE booking_id = ?`,
      [booking.id]
    );

    res.json({ success: true, booking });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/bookings
 * Create a new service booking (PRINTING or HARDWARE)
 */
router.post('/', authenticateFirebaseToken, async (req, res, next) => {
  try {
    const {
      service_id,
      service_name,
      type, // 'PRINTING' or 'HARDWARE'
      total_amount,
      advance_amount,
      notes,
      printing_details,
      hardware_details,
      scheduled_at,
      file_ids
    } = req.body;

    if (!service_name) {
      return res.status(400).json({ error: 'Service name is required.' });
    }

    const bookingType = type === 'HARDWARE' ? 'HARDWARE' : 'PRINTING';
    const bookingNumber = generateBookingNumber();
    const customerRow = await queryOne(`SELECT id FROM customers WHERE user_id = ?`, [req.user.id]);

    const numTotal = Number(total_amount) || 0;
    const numAdvance = Number(advance_amount) || 0;

    const result = await query(
      `INSERT INTO bookings (
        booking_number, customer_id, user_id, service_id, service_name, type, status,
        total_amount, advance_amount, payment_status, notes, printing_details, hardware_details, scheduled_at
      ) VALUES (?, ?, ?, ?, ?, ?, 'PENDING', ?, ?, ?, ?, ?, ?, ?)`,
      [
        bookingNumber,
        customerRow ? customerRow.id : null,
        req.user.id,
        service_id || null,
        service_name,
        bookingType,
        numTotal,
        numAdvance,
        numAdvance >= numTotal && numTotal > 0 ? 'PAID' : (numAdvance > 0 ? 'PARTIAL' : 'UNPAID'),
        notes || '',
        printing_details ? JSON.stringify(printing_details) : null,
        hardware_details ? JSON.stringify(hardware_details) : null,
        scheduled_at || null
      ]
    );

    const newBookingId = result.insertId;

    // Associate pre-uploaded files with this booking
    if (Array.isArray(file_ids) && file_ids.length > 0) {
      for (const fid of file_ids) {
        await query(
          `UPDATE booking_files SET booking_id = ? WHERE id = ? AND customer_id = ?`,
          [newBookingId, fid, req.user.id]
        );
      }
    }

    const newBooking = await queryOne(`SELECT * FROM bookings WHERE id = ?`, [newBookingId]);
    newBooking.files = await query(`SELECT * FROM booking_files WHERE booking_id = ?`, [newBookingId]);

    res.status(201).json({ success: true, booking: newBooking });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/bookings/:id/status (Admin)
 * Update booking status or advance payment
 */
router.put('/:id/status', authenticateFirebaseToken, requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, payment_status, advance_amount, notes } = req.body;

    const booking = await queryOne(`SELECT * FROM bookings WHERE id = ?`, [id]);
    if (!booking) return res.status(404).json({ error: 'Booking not found.' });

    const newStatus = status || booking.status;
    const newPaymentStatus = payment_status || booking.payment_status;
    const newAdvance = advance_amount !== undefined ? Number(advance_amount) : booking.advance_amount;

    await query(
      `UPDATE bookings
       SET status = ?, payment_status = ?, advance_amount = ?, notes = COALESCE(?, notes)
       WHERE id = ?`,
      [newStatus, newPaymentStatus, newAdvance, notes || null, id]
    );

    const updated = await queryOne(`SELECT * FROM bookings WHERE id = ?`, [id]);
    res.json({ success: true, booking: updated });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
