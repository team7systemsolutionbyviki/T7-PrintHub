<?php
/* ==========================================================================
   T7 PRINT HUB — UPDATE STORE SETTINGS (ADMIN)
   POST / PUT /api/settings/update.php
   ========================================================================== */

require_once __DIR__ . '/../auth/admin_middleware.php';

$admin = requireAdmin();

$raw = file_get_contents('php://input');
$data = json_decode($raw, true) ?: $_POST;

if (empty($data)) {
    sendError('Settings payload cannot be empty.');
}

$jsonVal = json_encode($data);

$pdo = getDbConnection();
$stmt = $pdo->prepare("
    INSERT INTO settings (setting_key, setting_value)
    VALUES ('general', ?)
    ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)
");
$stmt->execute([$jsonVal]);

sendSuccess($data, 200, 'Settings updated successfully.');
