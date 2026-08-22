/* ==========================================================================
   T7 PRINT HUB — ADMIN AUTHORIZATION MIDDLEWARE
   Verifies backend req.user.role is ADMIN or SUPER_ADMIN.
   ========================================================================== */

function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized: Authentication required.' });
  }

  const role = String(req.user.role || '').toUpperCase();
  if (!['ADMIN', 'SUPER_ADMIN'].includes(role)) {
    return res.status(403).json({ error: 'Forbidden: Admin authorization required for this resource.' });
  }

  next();
}

function requireSuperAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized: Authentication required.' });
  }

  const role = String(req.user.role || '').toUpperCase();
  if (role !== 'SUPER_ADMIN') {
    return res.status(403).json({ error: 'Forbidden: Super Admin authorization required.' });
  }

  next();
}

module.exports = {
  requireAdmin,
  requireSuperAdmin
};
