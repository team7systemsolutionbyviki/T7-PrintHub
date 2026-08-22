<?php
/* ==========================================================================
   T7 PRINT HUB — UPDATE PRODUCT (ADMIN)
   POST / PUT /api/products/update.php
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
$check = $pdo->prepare("SELECT id FROM products WHERE id = ?");
$check->execute([$id]);
if (!$check->fetch()) {
    sendError('Product not found.', 404);
}

$categoryId = isset($data['category_id']) ? (int)$data['category_id'] : 3;
$name = trim($data['name'] ?? '');
$description = trim($data['description'] ?? '');
$category = trim($data['category'] ?? 'Paper & Stationery');
$price = (float)($data['price'] ?? 0);
$salePrice = isset($data['sale_price']) && $data['sale_price'] !== '' ? (float)$data['sale_price'] : null;
$stock = (int)($data['stock'] ?? 0);
$image = trim($data['image'] ?? '');
$active = isset($data['active']) && $data['active'] === false ? 0 : 1;

$stmt = $pdo->prepare("
    UPDATE products
    SET category_id = ?, name = COALESCE(NULLIF(?, ''), name), description = ?, category = ?, price = ?, sale_price = ?, stock = ?, image = ?, active = ?
    WHERE id = ?
");
$stmt->execute([$categoryId, $name, $description, $category, $price, $salePrice, $stock, $image, $active, $id]);

$fetch = $pdo->prepare("SELECT * FROM products WHERE id = ?");
$fetch->execute([$id]);
$product = $fetch->fetch();

sendSuccess($product, 200, 'Product updated successfully.');
