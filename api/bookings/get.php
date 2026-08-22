<?php
/* ==========================================================================
   T7 PRINT HUB — GET SINGLE BOOKING ENDPOINT
   GET /api/bookings/get.php?id=123
   ========================================================================== */

require_once __DIR__ . '/../auth/auth_middleware.php';

$user = requireAuth();

$idOrNum = trim($_GET['id'] ?? $_GET['booking_number'] ?? '');
if (empty($idOrNum)) {
    sendError('Booking ID or Booking Number is required.');
}

$pdo = getDbConnection();
$isNum = ctype_digit($idOrNum);

$sql = $isNum
    ? "SELECT b.*, u.name AS user_name, u.email AS user_email, u.phone AS user_phone FROM bookings b JOIN users u ON b.user_id = u.id WHERE b.id = ?"
    : "SELECT b.*, u.name AS user_name, u.email AS user_email, u.phone AS user_phone FROM bookings b JOIN users u ON b.user_id = u.id WHERE b.booking_number = ?";

$stmt = $pdo->prepare($sql);
$stmt->execute([$idOrNum]);
$booking = $stmt->fetch();

if (!$booking) {
    sendError('Booking not found.', 404);
}

$isAdmin = in_array(strtoupper($user['role'] ?? ''), ['ADMIN', 'SUPER_ADMIN'], true);
if (!$isAdmin && (int)$booking['user_id'] !== (int)$user['id']) {
    sendError('Forbidden: Access denied.', 403);
}

$stmtFiles = $pdo->prepare("SELECT id, original_name, stored_name, mime_type, file_size, created_at FROM uploads WHERE booking_id = ?");
$stmtFiles->execute([$booking['id']]);
$booking['files'] = $stmtFiles->fetchAll();

sendSuccess($booking);
