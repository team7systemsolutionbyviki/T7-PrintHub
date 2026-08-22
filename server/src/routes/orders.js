/* ==========================================================================
   T7 PRINT HUB — ORDERS API ROUTES
   ========================================================================== */

const express = require('express');
const router = express.Router();
const { query, queryOne } = require('../config/db');
const { authenticateFirebaseToken } = require('../middleware/firebase-auth');
const { requireAdmin } = require('../middleware/admin-auth');

function generateOrderNumber() {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `ORD-${dateStr}-${rand}`;
}

/**
 * GET /api/orders
 * Customer sees own orders; Admin sees all orders
 */
router.get('/', authenticateFirebaseToken, async (req, res, next) => {
  try {
    const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(req.user.role);
    let sql, params;

    if (isAdmin) {
      sql = `SELECT o.*, u.name AS user_name, u.email AS user_email, u.phone AS user_phone
             FROM orders o
             JOIN users u ON o.user_id = u.id
             ORDER BY o.created_at DESC`;
      params = [];
    } else {
      sql = `SELECT o.*, u.name AS user_name, u.email AS user_email, u.phone AS user_phone
             FROM orders o
             JOIN users u ON o.user_id = u.id
             WHERE o.user_id = ?
             ORDER BY o.created_at DESC`;
      params = [req.user.id];
    }

    const orders = await query(sql, params);
    for (const o of orders) {
      o.items = await query(`SELECT * FROM order_items WHERE order_id = ?`, [o.id]);
    }

    res.json({ success: true, orders });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/orders/:id
 */
router.get('/:id', authenticateFirebaseToken, async (req, res, next) => {
  try {
    const param = req.params.id;
    const isNum = /^\d+$/.test(param);
    const sql = isNum
      ? `SELECT o.*, u.name AS user_name, u.email AS user_email, u.phone AS user_phone FROM orders o JOIN users u ON o.user_id = u.id WHERE o.id = ?`
      : `SELECT o.*, u.name AS user_name, u.email AS user_email, u.phone AS user_phone FROM orders o JOIN users u ON o.user_id = u.id WHERE o.order_number = ?`;

    const order = await queryOne(sql, [param]);
    if (!order) return res.status(404).json({ error: 'Order not found.' });

    const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(req.user.role);
    if (!isAdmin && order.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden: Access denied.' });
    }

    order.items = await query(`SELECT * FROM order_items WHERE order_id = ?`, [order.id]);
    res.json({ success: true, order });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/orders
 * Create new store order
 */
router.post('/', authenticateFirebaseToken, async (req, res, next) => {
  try {
    const { items, shipping_address, payment_method, notes, subtotal, tax, discount, total_amount } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Order must contain at least one product item.' });
    }

    const orderNumber = generateOrderNumber();
    const customerRow = await queryOne(`SELECT id FROM customers WHERE user_id = ?`, [req.user.id]);

    const numSubtotal = Number(subtotal) || 0;
    const numTax = Number(tax) || 0;
    const numDiscount = Number(discount) || 0;
    const numTotal = Number(total_amount) || (numSubtotal + numTax - numDiscount);

    const result = await query(
      `INSERT INTO orders (
        order_number, customer_id, user_id, status, payment_status, payment_method,
        subtotal, tax, discount, total_amount, shipping_address, notes
      ) VALUES (?, ?, ?, 'PENDING', 'UNPAID', ?, ?, ?, ?, ?, ?, ?)`,
      [
        orderNumber,
        customerRow ? customerRow.id : null,
        req.user.id,
        payment_method || 'ONLINE',
        numSubtotal,
        numTax,
        numDiscount,
        numTotal,
        shipping_address ? JSON.stringify(shipping_address) : null,
        notes || ''
      ]
    );

    const orderId = result.insertId;

    for (const item of items) {
      const pPrice = Number(item.price) || 0;
      const pQty = Number(item.quantity) || 1;
      const pTot = Number(item.total_price) || (pPrice * pQty);

      await query(
        `INSERT INTO order_items (order_id, product_id, product_name, price, quantity, total_price, metadata)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [orderId, item.product_id || null, item.product_name || 'Product', pPrice, pQty, pTot, item.metadata ? JSON.stringify(item.metadata) : null]
      );

      // Decrement product stock if product_id provided
      if (item.product_id) {
        await query(`UPDATE products SET stock = GREATEST(0, stock - ?) WHERE id = ?`, [pQty, item.product_id]);
      }
    }

    const newOrder = await queryOne(`SELECT * FROM orders WHERE id = ?`, [orderId]);
    newOrder.items = await query(`SELECT * FROM order_items WHERE order_id = ?`, [orderId]);

    res.status(201).json({ success: true, order: newOrder });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/orders/:id/status (Admin)
 */
router.put('/:id/status', authenticateFirebaseToken, requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, payment_status } = req.body;

    const order = await queryOne(`SELECT * FROM orders WHERE id = ?`, [id]);
    if (!order) return res.status(404).json({ error: 'Order not found.' });

    await query(
      `UPDATE orders SET status = COALESCE(?, status), payment_status = COALESCE(?, payment_status) WHERE id = ?`,
      [status || null, payment_status || null, id]
    );

    const updated = await queryOne(`SELECT * FROM orders WHERE id = ?`, [id]);
    res.json({ success: true, order: updated });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
