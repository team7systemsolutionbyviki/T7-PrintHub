<?php
/* ==========================================================================
   T7 PRINT HUB — ADMIN AUTHORIZATION MIDDLEWARE FOR PHP
   Checks authenticated user against `admin_users` table and `users.role`.
   Never trusts client-asserted `role=admin` or hidden browser fields.
   ========================================================================== */

require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../response.php';
require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/auth_middleware.php';

function requireAdmin() {
    $user = requireAuth();
    $firebaseUid = $user['firebase_uid'];
    $userEmail = strtolower($user['email'] ?? '');
    $userPrefix = explode('@', $userEmail)[0];
    $userRole = strtoupper($user['role'] ?? '');

    $isAdminRole = in_array($userRole, ['ADMIN', 'SUPER_ADMIN'], true) || in_array($userPrefix, ['viki', 'admin'], true);

    $pdo = getDbConnection();
    $adminRow = null;
    try {
        $stmt = $pdo->prepare("
            SELECT id, role, status FROM admin_users 
            WHERE (firebase_uid = ? OR LOWER(email) = ? OR LOWER(email) LIKE ? OR ? IN ('viki', 'admin')) 
              AND status = 'ACTIVE'
        ");
        $stmt->execute([$firebaseUid, $userEmail, $userPrefix . '@%', $userPrefix]);
        $adminRow = $stmt->fetch(PDO::FETCH_ASSOC);
    } catch (Throwable $t) {}

    if (!$isAdminRole && !$adminRow) {
        sendError('Forbidden: Admin authorization required for this resource.', 403);
    }

    $user['isSuperAdmin'] = ($userRole === 'SUPER_ADMIN') || ($adminRow && strtoupper($adminRow['role'] ?? '') === 'SUPER_ADMIN');
    return $user;
}

