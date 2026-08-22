<?php
/* ==========================================================================
   T7 PRINT HUB — UPDATE SERVICE (ADMIN)
   POST / PUT /api/services/update.php
   ========================================================================== */

require_once __DIR__ . '/../auth/admin_middleware.php';

$admin = requireAdmin();

$raw = file_get_contents('php://input');
$data = json_decode($raw, true) ?: $_POST;

$id = (int)($data['id'] ?? $_GET['id'] ?? 0);
if ($id <= 0) {
    sendError('Valid Service ID is required.');
}

$pdo = getDbConnection();
$check = $pdo->prepare("SELECT id FROM services WHERE id = ?");
$check->execute([$id]);
if (!$check->fetch()) {
    sendError('Service not found.', 404);
}

$categoryId = isset($data['category_id']) ? (int)$data['category_id'] : 1;
$name = trim($data['name'] ?? '');
$description = trim($data['description'] ?? '');
$price = (float)($data['price'] ?? 0);
$startingPrice = isset($data['starting_price']) ? (float)$data['starting_price'] : (isset($data['startingPrice']) ? (float)$data['startingPrice'] : $price);
$priceLabel = trim($data['price_label'] ?? $data['priceLabel'] ?? ('Starting from ₹' . number_format($startingPrice, 2)));
$image = trim($data['image'] ?? '');
$active = isset($data['active']) && $data['active'] === false ? 0 : 1;
$sortOrder = (int)($data['sort_order'] ?? 0);

$stmt = $pdo->prepare("
    UPDATE services
    SET category_id = ?, name = COALESCE(NULLIF(?, ''), name), description = ?, price = ?, starting_price = ?, price_label = ?, image = ?, active = ?, sort_order = ?
    WHERE id = ?
");
$stmt->execute([$categoryId, $name, $description, $price, $startingPrice, $priceLabel, $image, $active, $sortOrder, $id]);

$fetch = $pdo->prepare("SELECT * FROM services WHERE id = ?");
$fetch->execute([$id]);
$service = $fetch->fetch();

sendSuccess($service, 200, 'Service updated successfully.');
