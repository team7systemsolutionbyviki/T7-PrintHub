<?php
/* ==========================================================================
   T7 PRINT HUB — ORDERS LIST ENDPOINT
   GET /api/orders/list.php
   ========================================================================== */

require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../response.php';
require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../auth/auth_middleware.php';

try {
    $user = requireAuth();
    $isAdmin = in_array(strtoupper($user['role'] ?? ''), ['ADMIN', 'SUPER_ADMIN'], true);
    $pdo = getDbConnection();

    if ($isAdmin) {
        $stmt = $pdo->prepare("
            SELECT o.*, COALESCE(u.name, 'Customer') AS user_name, COALESCE(u.email, '') AS user_email, COALESCE(u.phone, '') AS user_phone
            FROM orders o
            LEFT JOIN users u ON o.user_id = u.id
            ORDER BY o.created_at DESC
        ");
        $stmt->execute();
    } else {
        $stmt = $pdo->prepare("
            SELECT o.*, COALESCE(u.name, 'Customer') AS user_name, COALESCE(u.email, '') AS user_email, COALESCE(u.phone, '') AS user_phone
            FROM orders o
            LEFT JOIN users u ON o.user_id = u.id
            WHERE o.user_id = ?
            ORDER BY o.created_at DESC
        ");
        $stmt->execute([$user['id']]);
    }

    $orders = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];

    try {
        $stmtItems = $pdo->prepare("SELECT * FROM order_items WHERE order_id = ?");
        foreach ($orders as &$o) {
            $o['id'] = (int)($o['id'] ?? 0);
            $o['total_amount'] = (float)($o['total_amount'] ?? 0);
            $stmtItems->execute([$o['id']]);
            $o['items'] = $stmtItems->fetchAll(PDO::FETCH_ASSOC) ?: [];
        }
    } catch (Throwable $t) {
        foreach ($orders as &$o) {
            $o['items'] = [];
        }
    }

    sendSuccess($orders);
} catch (Throwable $e) {
    error_log("[Orders List API Error]: " . $e->getMessage());
    sendError("Orders list error: " . $e->getMessage(), 500);
}

