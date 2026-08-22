<?php
/* ==========================================================================
   T7 PRINT HUB — DELETE PRODUCT (ADMIN)
   POST / DELETE /api/products/delete.php
   ========================================================================== */

require_once __DIR__ . '/../auth/admin_middleware.php';

$admin = requireAdmin();

$raw = file_get_contents('php://input');
$data = json_decode($raw, true) ?: $_POST;

$id = (int)($data['id'] ?? $_GET['id'] ?? 0);
if ($id <= 0) {
    sendError('Valid Product ID is required.');
}

$pdo = getDbConnection();
$stmt = $pdo->prepare("DELETE FROM products WHERE id = ?");
$stmt->execute([$id]);

sendSuccess(['id' => $id], 200, 'Product deleted successfully.');
