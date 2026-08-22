<?php
/* ==========================================================================
   T7 PRINT HUB — GET SINGLE ORDER ENDPOINT
   GET /api/orders/get.php?id=123
   ========================================================================== */

require_once __DIR__ . '/../auth/auth_middleware.php';

$user = requireAuth();

$idOrNum = trim($_GET['id'] ?? $_GET['order_number'] ?? '');
if (empty($idOrNum)) {
    sendError('Order ID or Order Number is required.');
}

$pdo = getDbConnection();
$isNum = ctype_digit($idOrNum);

$sql = $isNum
    ? "SELECT o.*, u.name AS user_name, u.email AS user_email, u.phone AS user_phone FROM orders o JOIN users u ON o.user_id = u.id WHERE o.id = ?"
    : "SELECT o.*, u.name AS user_name, u.email AS user_email, u.phone AS user_phone FROM orders o JOIN users u ON o.user_id = u.id WHERE o.order_number = ?";

$stmt = $pdo->prepare($sql);
$stmt->execute([$idOrNum]);
$order = $stmt->fetch();

if (!$order) {
    sendError('Order not found.', 404);
}

$isAdmin = in_array(strtoupper($user['role'] ?? ''), ['ADMIN', 'SUPER_ADMIN'], true);
if (!$isAdmin && (int)$order['user_id'] !== (int)$user['id']) {
    sendError('Forbidden: Access denied.', 403);
}

$stmtItems = $pdo->prepare("SELECT * FROM order_items WHERE order_id = ?");
$stmtItems->execute([$order['id']]);
$order['items'] = $stmtItems->fetchAll();

sendSuccess($order);
