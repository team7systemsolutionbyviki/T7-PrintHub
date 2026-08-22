<?php
/* ==========================================================================
   T7 PRINT HUB — UPDATE BOOKING STATUS (ADMIN)
   POST / PUT /api/bookings/update.php
   ========================================================================== */

require_once __DIR__ . '/../auth/admin_middleware.php';

$admin = requireAdmin();

$raw = file_get_contents('php://input');
$data = json_decode($raw, true) ?: $_POST;

$id = (int)($data['id'] ?? $_GET['id'] ?? 0);
if ($id <= 0) {
    sendError('Valid Booking ID is required.');
}

$pdo = getDbConnection();
$check = $pdo->prepare("SELECT id, status, payment_status, advance_amount FROM bookings WHERE id = ?");
$check->execute([$id]);
$booking = $check->fetch();
if (!$booking) {
    sendError('Booking not found.', 404);
}

$status = isset($data['status']) ? trim($data['status']) : $booking['status'];
$paymentStatus = isset($data['payment_status']) ? trim($data['payment_status']) : $booking['payment_status'];
$advanceAmount = isset($data['advance_amount']) ? (float)$data['advance_amount'] : (float)$booking['advance_amount'];

$stmt = $pdo->prepare("UPDATE bookings SET status = ?, payment_status = ?, advance_amount = ? WHERE id = ?");
$stmt->execute([$status, $paymentStatus, $advanceAmount, $id]);

$fetch = $pdo->prepare("SELECT * FROM bookings WHERE id = ?");
$fetch->execute([$id]);
$updated = $fetch->fetch();

sendSuccess($updated, 200, 'Booking status updated successfully.');
