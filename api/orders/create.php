<?php
/* ==========================================================================
   T7 PRINT HUB — CREATE ORDER ENDPOINT
   POST /api/orders/create.php
   ========================================================================== */

require_once __DIR__ . '/../auth/auth_middleware.php';

$user = requireAuth();

$raw = file_get_contents('php://input');
$data = json_decode($raw, true) ?: $_POST;

$items = isset($data['items']) && is_array($data['items']) ? $data['items'] : [];
if (empty($items)) {
    sendError('Order must contain at least one item.');
}

$pdo = getDbConnection();

// Get customer record ID
$stmtCust = $pdo->prepare("SELECT id FROM customers WHERE user_id = ?");
$stmtCust->execute([$user['id']]);
$customerRow = $stmtCust->fetch();
$customerId = $customerRow ? $customerRow['id'] : null;

$orderNumber = 'ORD-' . date('Ymd') . '-' . rand(1000, 9999);
$paymentMethod = trim($data['payment_method'] ?? 'ONLINE');
$shippingAddress = isset($data['shipping_address']) ? json_encode($data['shipping_address']) : null;
$notes = trim($data['notes'] ?? '');

$subtotal = (float)($data['subtotal'] ?? 0);
$tax = (float)($data['tax'] ?? 0);
$discount = (float)($data['discount'] ?? 0);
$totalAmount = (float)($data['total_amount'] ?? ($subtotal + $tax - $discount));

$stmtOrder = $pdo->prepare("
    INSERT INTO orders (order_number, customer_id, user_id, status, payment_status, payment_method, subtotal, tax, discount, total_amount, shipping_address, notes)
    VALUES (?, ?, ?, 'PENDING', 'UNPAID', ?, ?, ?, ?, ?, ?, ?)
");
$stmtOrder->execute([$orderNumber, $customerId, $user['id'], $paymentMethod, $subtotal, $tax, $discount, $totalAmount, $shippingAddress, $notes]);

$orderId = $pdo->lastInsertId();

$stmtItem = $pdo->prepare("
    INSERT INTO order_items (order_id, product_id, product_name, price, quantity, total_price, metadata)
    VALUES (?, ?, ?, ?, ?, ?, ?)
");

$stmtStock = $pdo->prepare("UPDATE products SET stock = GREATEST(0, stock - ?) WHERE id = ?");

foreach ($items as $item) {
    $productId = isset($item['product_id']) ? (int)$item['product_id'] : null;
    $productName = trim($item['product_name'] ?? $item['name'] ?? 'Product');
    $price = (float)($item['price'] ?? 0);
    $qty = (int)($item['quantity'] ?? 1);
    $totalPrice = (float)($item['total_price'] ?? ($price * $qty));
    $metadata = isset($item['metadata']) ? json_encode($item['metadata']) : null;

    $stmtItem->execute([$orderId, $productId, $productName, $price, $qty, $totalPrice, $metadata]);

    if ($productId) {
        $stmtStock->execute([$qty, $productId]);
    }
}

// Fetch created order with items
$fetchOrder = $pdo->prepare("SELECT * FROM orders WHERE id = ?");
$fetchOrder->execute([$orderId]);
$order = $fetchOrder->fetch();

$fetchItems = $pdo->prepare("SELECT * FROM order_items WHERE order_id = ?");
$fetchItems->execute([$orderId]);
$order['items'] = $fetchItems->fetchAll();

sendSuccess($order, 201, 'Order placed successfully.');
