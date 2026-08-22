<?php
/* ==========================================================================
   T7 PRINT HUB — RESOLVE USERNAME TO AUTH EMAIL ENDPOINT
   POST /api/auth/resolve.php
   ========================================================================== */

require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../response.php';
require_once __DIR__ . '/../db.php';

try {
    $raw = file_get_contents('php://input');
    if (empty($raw) && isset($GLOBALS['HTTP_RAW_POST_DATA'])) {
        $raw = $GLOBALS['HTTP_RAW_POST_DATA'];
    }

    $json = !empty($raw) ? json_decode($raw, true) : null;
    $data = is_array($json) ? array_merge($_POST, $_REQUEST, $json) : array_merge($_POST, $_REQUEST);

    $username = trim($data['username'] ?? $data['user'] ?? $data['email'] ?? '');

    if (empty($username)) {
        sendError('Username or email is required.', 400);
    }

    $pdo = getDbConnection();

    // Ensure VIKI exists in users and admin_users table
    $vikiEmail = 'viki@t7hub.in';
    $vikiUid = 'viki-admin-uid-101';

    try {
        $chk = $pdo->prepare("SELECT id FROM users WHERE firebase_uid = ? OR LOWER(email) = ? OR LOWER(name) = 'viki'");
        $chk->execute([$vikiUid, $vikiEmail]);
        if (!$chk->fetch()) {
            $pdo->prepare("
                INSERT INTO users (firebase_uid, name, email, role, status)
                VALUES (?, 'VIKI', ?, 'ADMIN', 'ACTIVE')
                ON DUPLICATE KEY UPDATE role = 'ADMIN', status = 'ACTIVE'
            ")->execute([$vikiUid, $vikiEmail]);

            $pdo->prepare("
                INSERT INTO admin_users (firebase_uid, email, role, status)
                VALUES (?, ?, 'ADMIN', 'ACTIVE')
                ON DUPLICATE KEY UPDATE role = 'ADMIN', status = 'ACTIVE'
            ")->execute([$vikiUid, $vikiEmail]);
        }
    } catch (Throwable $t) {}

    // Search users and admin_users table for matching username/email
    $stmt = $pdo->prepare("
        SELECT u.id, u.name, u.email, u.status, COALESCE(a.role, u.role) AS role
        FROM users u
        LEFT JOIN admin_users a ON (u.firebase_uid = a.firebase_uid OR LOWER(u.email) = LOWER(a.email))
        WHERE (LOWER(u.name) = LOWER(?) OR LOWER(u.email) = LOWER(?) OR LOWER(u.email) LIKE ?)
        LIMIT 1
    ");
    $stmt->execute([$username, $username, strtolower($username) . '@%']);
    $userRow = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$userRow && in_array(strtolower($username), ['viki', 'admin'], true)) {
        $userRow = [
            'id' => 1,
            'name' => 'VIKI',
            'email' => $vikiEmail,
            'status' => 'ACTIVE',
            'role' => 'ADMIN'
        ];
    }

    if (!$userRow) {
        sendError('Invalid username or password.', 401);
    }

    if (strtoupper($userRow['status'] ?? '') === 'INACTIVE') {
        sendError('Admin account is inactive.', 403);
    }

    $role = strtoupper($userRow['role'] ?? 'CUSTOMER');

    sendSuccess([
        'email' => $userRow['email'],
        'username' => $userRow['name'] ?: $username,
        'role' => $role,
        'status' => strtoupper($userRow['status'] ?? 'ACTIVE')
    ]);

} catch (Throwable $e) {
    error_log("[Auth Resolve Error]: " . $e->getMessage());
    sendError('Unable to connect to authentication server.', 500);
}
