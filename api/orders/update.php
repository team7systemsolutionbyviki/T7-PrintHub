<?php
/* ==========================================================================
   T7 PRINT HUB — UPDATE ORDER STATUS (ADMIN)
   POST / PUT /api/orders/update.php
   ========================================================================== */

require_once __DIR__ . '/../auth/admin_middleware.php';

$admin = requireAdmin();

$raw = file_get_contents('php://input');
$data = json_decode($raw, true) ?: $_POST;

$id = (int)($data['id'] ?? $_GET['id'] ?? 0);
if ($id <= 0) {
    sendError('Valid Order ID is required.');
}

$pdo = getDbConnection();
$check = $pdo->prepare("SELECT id, status, payment_status FROM orders WHERE id = ?");
$check->execute([$id]);
$order = $check->fetch();
if (!$order) {
    sendError('Order not found.', 404);
}

$status = isset($data['status']) ? trim($data['status']) : $order['status'];
$paymentStatus = isset($data['payment_status']) ? trim($data['payment_status']) : $order['payment_status'];

$stmt = $pdo->prepare("UPDATE orders SET status = ?, payment_status = ? WHERE id = ?");
$stmt->execute([$status, $paymentStatus, $id]);

$fetch = $pdo->prepare("SELECT * FROM orders WHERE id = ?");
$fetch->execute([$id]);
$updated = $fetch->fetch();

sendSuccess($updated, 200, 'Order status updated successfully.');
