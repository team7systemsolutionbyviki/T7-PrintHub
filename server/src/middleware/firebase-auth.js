/* ==========================================================================
   T7 PRINT HUB — FIREBASE AUTHENTICATION MIDDLEWARE
   Verifies Firebase ID Token via Admin SDK, extracts Firebase UID, and syncs
   with MySQL `users` table. Never trusts client-asserted roles or UIDs.
   ========================================================================== */

const { admin, initFirebaseAdmin } = require('../config/firebase');
const { queryOne, query } = require('../config/db');

initFirebaseAdmin();

async function authenticateFirebaseToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing or invalid Authorization header.' });
  }

  const idToken = authHeader.split('Bearer ')[1];
  if (!idToken) {
    return res.status(401).json({ error: 'Unauthorized: Empty token provided.' });
  }

  try {
    // 1. Verify token with Firebase Admin SDK
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const firebaseUid = decodedToken.uid;
    const email = decodedToken.email || `${firebaseUid}@t7printhub.local`;
    const name = decodedToken.name || decodedToken.email?.split('@')[0] || 'User';

    // 2. Find or safely create corresponding user record in MySQL
    let userRow = await queryOne(
      `SELECT u.id, u.firebase_uid, u.name, u.email, u.phone, u.role_id, u.status, r.code AS role
       FROM users u
       JOIN roles r ON u.role_id = r.id
       WHERE u.firebase_uid = ?`,
      [firebaseUid]
    );

    if (!userRow) {
      // Safe creation on first authenticated request
      const insertResult = await query(
        `INSERT INTO users (firebase_uid, name, email, phone, role_id, status, last_login_at)
         VALUES (?, ?, ?, ?, 4, 'ACTIVE', NOW())`,
        [firebaseUid, name, email, decodedToken.phone_number || null]
      );
      const newUserId = insertResult.insertId;

      // Create customer record
      await query(
        `INSERT INTO customers (user_id) VALUES (?) ON DUPLICATE KEY UPDATE user_id = VALUES(user_id)`,
        [newUserId]
      );

      userRow = await queryOne(
        `SELECT u.id, u.firebase_uid, u.name, u.email, u.phone, u.role_id, u.status, r.code AS role
         FROM users u
         JOIN roles r ON u.role_id = r.id
         WHERE u.id = ?`,
        [newUserId]
      );
    } else {
      // Update last login timestamp
      await query(`UPDATE users SET last_login_at = NOW() WHERE id = ?`, [userRow.id]);
    }

    if (userRow.status !== 'ACTIVE') {
      return res.status(403).json({ error: 'Account suspended or inactive. Please contact support.' });
    }

    // Attach validated user to request
    req.user = {
      id: userRow.id,
      firebaseUid: userRow.firebase_uid,
      name: userRow.name,
      email: userRow.email,
      phone: userRow.phone,
      roleId: userRow.role_id,
      role: userRow.role,
      status: userRow.status
    };

    next();
  } catch (err) {
    console.error('Authentication Error:', err.message);
    return res.status(401).json({ error: 'Unauthorized: Invalid or expired authentication token.' });
  }
}

/**
 * Optional authentication middleware: Populates req.user if token is valid, but does not block if missing
 */
async function optionalFirebaseToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    req.user = null;
    return next();
  }
  return authenticateFirebaseToken(req, res, next);
}

module.exports = {
  authenticateFirebaseToken,
  optionalFirebaseToken
};
