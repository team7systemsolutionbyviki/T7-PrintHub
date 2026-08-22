<?php
/* ==========================================================================
   T7 PRINT HUB — CREATE SERVICE (ADMIN)
   POST /api/services/create.php
   ========================================================================== */

require_once __DIR__ . '/../auth/admin_middleware.php';

$admin = requireAdmin();

$raw = file_get_contents('php://input');
$data = json_decode($raw, true) ?: $_POST;

$name = trim($data['name'] ?? '');
if (empty($name)) {
    sendError('Service name is required.');
}

$categoryId = isset($data['category_id']) ? (int)$data['category_id'] : 1;
$description = trim($data['description'] ?? '');
$price = (float)($data['price'] ?? 0);
$startingPrice = isset($data['starting_price']) ? (float)$data['starting_price'] : (isset($data['startingPrice']) ? (float)$data['startingPrice'] : $price);
$priceLabel = trim($data['price_label'] ?? $data['priceLabel'] ?? ('Starting from ₹' . number_format($startingPrice, 2)));
$image = trim($data['image'] ?? '');
$active = isset($data['active']) && $data['active'] === false ? 0 : 1;
$sortOrder = (int)($data['sort_order'] ?? 0);

$slug = strtolower(trim(preg_replace('/[^A-Za-z0-9-]+/', '-', $name), '-')) . '-' . time();

$pdo = getDbConnection();
$stmt = $pdo->prepare("
    INSERT INTO services (category_id, name, slug, description, price, starting_price, price_label, image, active, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
");
$stmt->execute([$categoryId, $name, $slug, $description, $price, $startingPrice, $priceLabel, $image, $active, $sortOrder]);

$newId = $pdo->lastInsertId();
$fetch = $pdo->prepare("SELECT * FROM services WHERE id = ?");
$fetch->execute([$newId]);
$service = $fetch->fetch();

sendSuccess($service, 201, 'Service created successfully.');
