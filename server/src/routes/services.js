/* ==========================================================================
   T7 PRINT HUB — SERVICES API ROUTES
   ========================================================================== */

const express = require('express');
const router = express.Router();
const { query, queryOne } = require('../config/db');
const { authenticateFirebaseToken, optionalFirebaseToken } = require('../middleware/firebase-auth');
const { requireAdmin } = require('../middleware/admin-auth');

/**
 * GET /api/services/categories
 * List all service categories
 */
router.get('/categories', async (req, res, next) => {
  try {
    const categories = await query(
      `SELECT * FROM service_categories WHERE active = 1 ORDER BY sort_order ASC, name ASC`
    );
    res.json({ success: true, categories });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/services
 * List all services (Public sees active only; Admin can pass ?all=1)
 */
router.get('/', optionalFirebaseToken, async (req, res, next) => {
  try {
    const isAdminRequest = req.query.all === '1' && req.user && ['ADMIN', 'SUPER_ADMIN'].includes(req.user.role);
    const whereClause = isAdminRequest ? '' : 'WHERE s.active = 1';

    const services = await query(
      `SELECT s.id, s.category_id, sc.name AS category_name, s.name, s.slug, s.description,
              s.price, s.starting_price, s.price_label, s.image, s.active, s.sort_order, s.created_at, s.updated_at
       FROM services s
       LEFT JOIN service_categories sc ON s.category_id = sc.id
       ${whereClause}
       ORDER BY s.sort_order ASC, s.name ASC`
    );

    res.json({ success: true, services });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/services/:idOrSlug
 * Get single service details
 */
router.get('/:idOrSlug', async (req, res, next) => {
  try {
    const param = req.params.idOrSlug;
    const isId = /^\d+$/.test(param);
    const sql = isId
      ? `SELECT s.*, sc.name AS category_name FROM services s LEFT JOIN service_categories sc ON s.category_id = sc.id WHERE s.id = ?`
      : `SELECT s.*, sc.name AS category_name FROM services s LEFT JOIN service_categories sc ON s.category_id = sc.id WHERE s.slug = ?`;

    const service = await queryOne(sql, [param]);
    if (!service) {
      return res.status(404).json({ error: 'Service not found.' });
    }
    res.json({ success: true, service });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/services
 * Admin: Create new service
 */
router.post('/', authenticateFirebaseToken, requireAdmin, async (req, res, next) => {
  try {
    const { category_id, name, description, price, starting_price, price_label, image, active, sort_order } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Service name is required.' });
    }

    const numPrice = Number(price) || 0;
    const numStartPrice = Number(starting_price) || numPrice;
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Date.now();
    const label = price_label || `Starting from ₹${numStartPrice.toFixed(2)}`;

    const result = await query(
      `INSERT INTO services (category_id, name, slug, description, price, starting_price, price_label, image, active, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [category_id || 1, name, slug, description || '', numPrice, numStartPrice, label, image || null, active !== false ? 1 : 0, sort_order || 0]
    );

    const newService = await queryOne(`SELECT * FROM services WHERE id = ?`, [result.insertId]);
    res.status(201).json({ success: true, service: newService });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/services/:id
 * Admin: Update service
 */
router.put('/:id', authenticateFirebaseToken, requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { category_id, name, description, price, starting_price, price_label, image, active, sort_order } = req.body;

    const existing = await queryOne(`SELECT id FROM services WHERE id = ?`, [id]);
    if (!existing) {
      return res.status(404).json({ error: 'Service not found.' });
    }

    const numPrice = Number(price) || 0;
    const numStartPrice = Number(starting_price) || numPrice;

    await query(
      `UPDATE services
       SET category_id = ?, name = ?, description = ?, price = ?, starting_price = ?, price_label = ?, image = ?, active = ?, sort_order = ?
       WHERE id = ?`,
      [category_id || 1, name, description, numPrice, numStartPrice, price_label, image, active !== false ? 1 : 0, sort_order || 0, id]
    );

    const updated = await queryOne(`SELECT * FROM services WHERE id = ?`, [id]);
    res.json({ success: true, service: updated });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/services/:id
 * Admin: Delete service
 */
router.delete('/:id', authenticateFirebaseToken, requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    await query(`DELETE FROM services WHERE id = ?`, [id]);
    res.json({ success: true, message: 'Service deleted successfully.' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
