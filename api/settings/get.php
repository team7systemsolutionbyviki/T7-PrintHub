<?php
/* ==========================================================================
   T7 PRINT HUB — GET STORE SETTINGS ENDPOINT
   GET /api/settings/get.php
   ========================================================================== */

require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../response.php';
require_once __DIR__ . '/../db.php';

try {
    $pdo = getDbConnection();
    $stmt = $pdo->prepare("SELECT setting_value FROM settings WHERE setting_key = 'general'");
    $stmt->execute();
    $row = $stmt->fetch(PDO::FETCH_ASSOC);

    $settings = [];
    if ($row && !empty($row['setting_value'])) {
        $settings = json_decode($row['setting_value'], true) ?: [];
    }

    sendSuccess($settings);
} catch (Throwable $e) {
    error_log("[Settings Get API Warning]: " . $e->getMessage());
    sendSuccess([]);
}

