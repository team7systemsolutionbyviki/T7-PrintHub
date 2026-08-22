<?php
/* ==========================================================================
   SAFE MYSQL DATABASE DIAGNOSTIC ENDPOINT (NO PASSWORDS EXPOSED)
   GET /api/db_test.php
   ========================================================================== */

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/response.php';

$diag = [
    'DB_HOST' => defined('DB_HOST') ? DB_HOST : 'not_defined',
    'DB_PORT' => defined('DB_PORT') ? DB_PORT : 'not_defined',
    'DB_NAME' => defined('DB_NAME') ? DB_NAME : 'not_defined',
    'DB_USER' => defined('DB_USER') ? DB_USER : 'not_defined',
    'connected' => false,
    'error' => null
];

try {
    require_once __DIR__ . '/db.php';
    $pdo = getDbConnection();
    if ($pdo) {
        $diag['connected'] = true;
        $stmt = $pdo->query("SELECT DATABASE() AS db_name, USER() AS db_user, VERSION() AS db_version");
        $info = $stmt->fetch(PDO::FETCH_ASSOC);
        $diag['connected_database'] = $info['db_name'] ?? DB_NAME;
        $diag['connected_user'] = $info['db_user'] ?? DB_USER;
        $diag['mysql_version'] = $info['db_version'] ?? 'unknown';
    }
} catch (Throwable $e) {
    $diag['connected'] = false;
    $msg = $e->getMessage();
    if (defined('DB_PASSWORD') && !empty(DB_PASSWORD)) {
        $msg = str_replace(DB_PASSWORD, '***HIDDEN***', $msg);
    }
    $diag['error'] = $msg;
}

sendSuccess($diag);
