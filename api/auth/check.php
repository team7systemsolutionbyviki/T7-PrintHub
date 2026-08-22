<?php
/* ==========================================================================
   T7 PRINT HUB — DIAGNOSTIC AUTH CHECK ENDPOINT
   GET /api/auth/check.php
   ========================================================================== */

require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../response.php';
require_once __DIR__ . '/../db.php';

try {
    $pdo = getDbConnection();
    $dbOk = true;

    $adminCount = 0;
    try {
        $stmtAdmin = $pdo->query("SELECT COUNT(*) FROM admin_users");
        $adminCount = (int)$stmtAdmin->fetchColumn();
    } catch (Throwable $e) {}

    $vikiRow = null;
    try {
        $chkViki = $pdo->query("SELECT id, name, email, role, status FROM users WHERE (LOWER(name) = 'viki' OR LOWER(email) LIKE '%viki%' OR role = 'ADMIN') LIMIT 1");
        $vikiRow = $chkViki->fetch(PDO::FETCH_ASSOC);
    } catch (Throwable $e) {}

    sendSuccess([
        'database' => $dbOk,
        'admin_count' => $adminCount,
        'admin_user_exists' => !empty($vikiRow),
        'admin_status' => strtoupper($vikiRow['status'] ?? 'ACTIVE'),
        'admin_role' => strtoupper($vikiRow['role'] ?? 'ADMIN')
    ]);
} catch (Throwable $e) {
    sendError("Auth check diagnostic warning: " . $e->getMessage(), 200);
}
