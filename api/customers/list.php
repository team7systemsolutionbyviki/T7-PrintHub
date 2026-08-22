<?php
/* ==========================================================================
   T7 PRINT HUB — CUSTOMERS LIST ENDPOINT (ADMIN)
   GET /api/customers/list.php
   ========================================================================== */

require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../response.php';
require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../auth/auth_middleware.php';
require_once __DIR__ . '/../auth/admin_middleware.php';

try {
    $admin = requireAdmin();
    $pdo = getDbConnection();

    $stmt = $pdo->prepare("
        SELECT c.*, COALESCE(u.name, 'Customer') AS name, COALESCE(u.email, '') AS email, COALESCE(u.phone, '') AS phone, COALESCE(u.status, 'ACTIVE') AS status, u.last_login_at
        FROM customers c
        LEFT JOIN users u ON c.user_id = u.id
        ORDER BY c.created_at DESC
    ");
    $stmt->execute();
    $customers = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];

    sendSuccess($customers);
} catch (Throwable $e) {
    error_log("[Customers List API Error]: " . $e->getMessage());
    sendError("Customers list error: " . $e->getMessage(), 500);
}

