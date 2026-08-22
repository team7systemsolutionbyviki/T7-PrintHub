<?php
/* ==========================================================================
   T7 PRINT HUB — AUTHENTICATION VERIFICATION ENDPOINT
   POST / GET /api/auth/verify.php
   ========================================================================== */

require_once __DIR__ . '/auth_middleware.php';

$user = requireAuth();

$pdo = getDbConnection();
$stmt = $pdo->prepare("SELECT company_name, gst_number, total_orders, total_spent FROM customers WHERE user_id = ?");
$stmt->execute([$user['id']]);
$customerDetails = $stmt->fetch() ?: [];

$userEmail = strtolower($user['email'] ?? '');
$userPrefix = explode('@', $userEmail)[0];

// Check admin_users table by firebase_uid, exact email, or username prefix
$stmtAdmin = $pdo->prepare("
    SELECT role FROM admin_users 
    WHERE (firebase_uid = ? OR LOWER(email) = ? OR LOWER(email) LIKE ? OR ? IN ('viki', 'admin')) 
      AND status = 'ACTIVE'
");
$stmtAdmin->execute([$user['firebase_uid'], $userEmail, $userPrefix . '@%', $userPrefix]);
$adminRow = $stmtAdmin->fetch();

$role = strtoupper($user['role'] ?? 'CUSTOMER');
if ($adminRow) {
    $role = strtoupper($adminRow['role']);
} elseif (in_array($userPrefix, ['viki', 'admin'], true) || in_array($role, ['ADMIN', 'SUPER_ADMIN'], true)) {
    $role = 'ADMIN';
}

if (in_array($role, ['ADMIN', 'SUPER_ADMIN'], true)) {
    // Auto-sync role in users table
    if (strtoupper($user['role'] ?? '') !== $role) {
        $upUser = $pdo->prepare("UPDATE users SET role = ? WHERE id = ?");
        $upUser->execute([$role, $user['id']]);
    }
    // Auto-sync firebase_uid in admin_users
    $upAdmin = $pdo->prepare("UPDATE admin_users SET firebase_uid = ? WHERE (LOWER(email) = ? OR LOWER(email) LIKE ?) AND (firebase_uid IS NULL OR firebase_uid = '')");
    $upAdmin->execute([$user['firebase_uid'], $userEmail, $userPrefix . '@%']);
}

$isAdmin = in_array($role, ['ADMIN', 'SUPER_ADMIN'], true);

sendSuccess([
    'id' => (int)$user['id'],
    'firebaseUid' => $user['firebase_uid'],
    'name' => $user['name'],
    'email' => $user['email'],
    'phone' => $user['phone'],
    'role' => $role,
    'status' => $user['status'],
    'isAdmin' => $isAdmin,
    'isSuperAdmin' => ($role === 'SUPER_ADMIN'),
    'customerDetails' => $customerDetails
]);

