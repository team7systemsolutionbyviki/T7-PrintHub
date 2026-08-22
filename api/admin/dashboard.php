<?php
/* ==========================================================================
   T7 PRINT HUB — ADMIN DASHBOARD METRICS ENDPOINT
   GET /api/admin/dashboard.php
   ========================================================================== */

require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../response.php';
require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../auth/auth_middleware.php';
require_once __DIR__ . '/../auth/admin_middleware.php';

try {
    $admin = requireAdmin();
    $pdo = getDbConnection();

    $totalUsers = 0;
    try { $totalUsers = (int)$pdo->query("SELECT COUNT(*) FROM users")->fetchColumn(); } catch (Throwable $t) {}

    $totalCustomers = 0;
    try { $totalCustomers = (int)$pdo->query("SELECT COUNT(*) FROM customers")->fetchColumn(); } catch (Throwable $t) {}

    $totalBookings = 0;
    try { $totalBookings = (int)$pdo->query("SELECT COUNT(*) FROM bookings")->fetchColumn(); } catch (Throwable $t) {}

    $pendingBookings = 0;
    try { $pendingBookings = (int)$pdo->query("SELECT COUNT(*) FROM bookings WHERE UPPER(status) = 'PENDING'")->fetchColumn(); } catch (Throwable $t) {}

    $totalOrders = 0;
    try { $totalOrders = (int)$pdo->query("SELECT COUNT(*) FROM orders")->fetchColumn(); } catch (Throwable $t) {}

    $pendingOrders = 0;
    try { $pendingOrders = (int)$pdo->query("SELECT COUNT(*) FROM orders WHERE UPPER(status) = 'PENDING'")->fetchColumn(); } catch (Throwable $t) {}

    $orderRevenue = 0.0;
    try { $orderRevenue = (float)$pdo->query("SELECT COALESCE(SUM(total_amount), 0) FROM orders WHERE UPPER(payment_status) = 'PAID'")->fetchColumn(); } catch (Throwable $t) {}

    $bookingRevenue = 0.0;
    try { $bookingRevenue = (float)$pdo->query("SELECT COALESCE(SUM(advance_amount), 0) FROM bookings WHERE UPPER(payment_status) IN ('PAID', 'PARTIAL')")->fetchColumn(); } catch (Throwable $t) {}

    $totalRevenue = $orderRevenue + $bookingRevenue;

    sendSuccess([
        'totalUsers' => $totalUsers,
        'totalCustomers' => $totalCustomers,
        'totalBookings' => $totalBookings,
        'pendingBookings' => $pendingBookings,
        'totalOrders' => $totalOrders,
        'pendingOrders' => $pendingOrders,
        'totalRevenue' => $totalRevenue
    ]);
} catch (Throwable $e) {
    error_log("[Admin Dashboard API Error]: " . $e->getMessage());
    sendError("Admin dashboard error: " . $e->getMessage(), 500);
}

