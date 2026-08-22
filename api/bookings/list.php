<?php
/* ==========================================================================
   T7 PRINT HUB — BOOKINGS LIST ENDPOINT
   GET /api/bookings/list.php
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
            SELECT b.*, COALESCE(u.name, 'Customer') AS user_name, COALESCE(u.email, '') AS user_email, COALESCE(u.phone, '') AS user_phone
            FROM bookings b
            LEFT JOIN users u ON b.user_id = u.id
            ORDER BY b.created_at DESC
        ");
        $stmt->execute();
    } else {
        $stmt = $pdo->prepare("
            SELECT b.*, COALESCE(u.name, 'Customer') AS user_name, COALESCE(u.email, '') AS user_email, COALESCE(u.phone, '') AS user_phone
            FROM bookings b
            LEFT JOIN users u ON b.user_id = u.id
            WHERE b.user_id = ?
            ORDER BY b.created_at DESC
        ");
        $stmt->execute([$user['id']]);
    }

    $bookings = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];

    try {
        $stmtFiles = $pdo->prepare("SELECT id, original_name, stored_name, mime_type, file_size, created_at FROM uploads WHERE booking_id = ?");
        foreach ($bookings as &$b) {
            $b['id'] = (int)($b['id'] ?? 0);
            $b['total_amount'] = (float)($b['total_amount'] ?? 0);
            $b['advance_amount'] = (float)($b['advance_amount'] ?? 0);
            $stmtFiles->execute([$b['id']]);
            $b['files'] = $stmtFiles->fetchAll(PDO::FETCH_ASSOC) ?: [];
        }
    } catch (Throwable $t) {
        foreach ($bookings as &$b) {
            $b['files'] = [];
        }
    }

    sendSuccess($bookings);
} catch (Throwable $e) {
    error_log("[Bookings List API Error]: " . $e->getMessage());
    sendError("Bookings list error: " . $e->getMessage(), 500);
}

