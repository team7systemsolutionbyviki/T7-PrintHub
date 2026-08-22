/* ==========================================================================
   T7 PRINT HUB — PRODUCTS API ROUTES
   ========================================================================== */

const express = require('express');
const router = express.Router();
const { query, queryOne } = require('../config/db');
const { authenticateFirebaseToken, optionalFirebaseToken } = require('../middleware/firebase-auth');
const { requireAdmin } = require('../middleware/admin-auth');

/**
 * GET /api/products/categories
 */
router.get('/categories', async (req, res, next) => {
  try {
    const categories = await query(`SELECT * FROM product_categories WHERE active = 1 ORDER BY sort_order ASC, name ASC`);
    res.json({ success: true, categories });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/products
 * List products
 */
router.get('/', optionalFirebaseToken, async (req, res, next) => {
  try {
    const isAdminRequest = req.query.all === '1' && req.user && ['ADMIN', 'SUPER_ADMIN'].includes(req.user.role);
    const whereClause = isAdminRequest ? '' : 'WHERE p.active = 1';

    const products = await query(
      `SELECT p.id, p.category_id, pc.name AS category_name, p.name, p.slug, p.description, p.category,
              p.price, p.sale_price, p.stock, p.image, p.active, p.created_at, p.updated_at
       FROM products p
       LEFT JOIN product_categories pc ON p.category_id = pc.id
       ${whereClause}
       ORDER BY p.name ASC`
    );

    res.json({ success: true, products });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/products/:idOrSlug
 */
router.get('/:idOrSlug', async (req, res, next) => {
  try {
    const param = req.params.idOrSlug;
    const isId = /^\d+$/.test(param);
    const sql = isId
      ? `SELECT p.*, pc.name AS category_name FROM products p LEFT JOIN product_categories pc ON p.category_id = pc.id WHERE p.id = ?`
      : `SELECT p.*, pc.name AS category_name FROM products p LEFT JOIN product_categories pc ON p.category_id = pc.id WHERE p.slug = ?`;

    const product = await queryOne(sql, [param]);
    if (!product) return res.status(404).json({ error: 'Product not found.' });

    res.json({ success: true, product });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/products (Admin)
 */
router.post('/', authenticateFirebaseToken, requireAdmin, async (req, res, next) => {
  try {
    const { category_id, name, description, category, price, sale_price, stock, image, active } = req.body;
    if (!name) return res.status(400).json({ error: 'Product name is required.' });

    const numPrice = Number(price) || 0;
    const numSalePrice = sale_price !== undefined && sale_price !== null && sale_price !== '' ? Number(sale_price) : null;
    const numStock = Number(stock) || 0;
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Date.now();

    const result = await query(
      `INSERT INTO products (category_id, name, slug, description, category, price, sale_price, stock, image, active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [category_id || 1, name, slug, description || '', category || 'General', numPrice, numSalePrice, numStock, image || null, active !== false ? 1 : 0]
    );

    const newProduct = await queryOne(`SELECT * FROM products WHERE id = ?`, [result.insertId]);
    res.status(201).json({ success: true, product: newProduct });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/products/:id (Admin)
 */
router.put('/:id', authenticateFirebaseToken, requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { category_id, name, description, category, price, sale_price, stock, image, active } = req.body;

    const existing = await queryOne(`SELECT id FROM products WHERE id = ?`, [id]);
    if (!existing) return res.status(404).json({ error: 'Product not found.' });

    const numPrice = Number(price) || 0;
    const numSalePrice = sale_price !== undefined && sale_price !== null && sale_price !== '' ? Number(sale_price) : null;
    const numStock = Number(stock) || 0;

    await query(
      `UPDATE products
       SET category_id = ?, name = ?, description = ?, category = ?, price = ?, sale_price = ?, stock = ?, image = ?, active = ?
       WHERE id = ?`,
      [category_id || 1, name, description, category, numPrice, numSalePrice, numStock, image, active !== false ? 1 : 0, id]
    );

    const updated = await queryOne(`SELECT * FROM products WHERE id = ?`, [id]);
    res.json({ success: true, product: updated });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/products/:id (Admin)
 */
router.delete('/:id', authenticateFirebaseToken, requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    await query(`DELETE FROM products WHERE id = ?`, [id]);
    res.json({ success: true, message: 'Product deleted successfully.' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
