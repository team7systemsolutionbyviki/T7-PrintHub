<?php
/* ==========================================================================
   T7 PRINT HUB — GET CUSTOMER DETAILS ENDPOINT
   GET /api/customers/get.php?id=123
   ========================================================================== */

require_once __DIR__ . '/../auth/auth_middleware.php';

$user = requireAuth();

$id = (int)($_GET['id'] ?? 0);
if ($id <= 0) {
    sendError('Valid Customer ID is required.');
}

$pdo = getDbConnection();
$stmt = $pdo->prepare("
    SELECT c.*, u.name, u.email, u.phone, u.status, u.last_login_at
    FROM customers c
    JOIN users u ON c.user_id = u.id
    WHERE c.id = ?
");
$stmt->execute([$id]);
$customer = $stmt->fetch();

if (!$customer) {
    sendError('Customer record not found.', 404);
}

$isAdmin = in_array(strtoupper($user['role'] ?? ''), ['ADMIN', 'SUPER_ADMIN'], true);
if (!$isAdmin && (int)$customer['user_id'] !== (int)$user['id']) {
    sendError('Forbidden: Access denied.', 403);
}

sendSuccess($customer);
