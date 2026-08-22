/* ==========================================================================
   T7 PRINT HUB — MYSQL DATABASE CONNECTION POOL
   ========================================================================== */

const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 't7_printhub',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  decimalNumbers: true
});

/**
 * Execute parameterized query
 */
async function query(sql, params = []) {
  try {
    const [rows] = await pool.execute(sql, params);
    return rows;
  } catch (err) {
    console.error('[MySQL Error]:', err.message, '| SQL:', sql);
    throw err;
  }
}

/**
 * Execute parameterized query and return first row
 */
async function queryOne(sql, params = []) {
  const rows = await query(sql, params);
  return rows && rows.length > 0 ? rows[0] : null;
}

module.exports = {
  pool,
  query,
  queryOne
};
