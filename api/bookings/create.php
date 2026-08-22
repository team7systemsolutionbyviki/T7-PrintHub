<?php
/* ==========================================================================
   T7 PRINT HUB — CREATE SERVICE BOOKING ENDPOINT
   POST /api/bookings/create.php
   ========================================================================== */

require_once __DIR__ . '/../auth/auth_middleware.php';

$user = requireAuth();

$raw = file_get_contents('php://input');
$data = json_decode($raw, true) ?: $_POST;

$serviceName = trim($data['service_name'] ?? $data['serviceName'] ?? '');
if (empty($serviceName)) {
    sendError('Service name is required.');
}

$serviceId = isset($data['service_id']) ? (int)$data['service_id'] : null;
$type = (isset($data['type']) && strtoupper($data['type']) === 'HARDWARE') ? 'HARDWARE' : 'PRINTING';

$totalAmount = (float)($data['total_amount'] ?? $data['totalAmount'] ?? 0);
$advanceAmount = (float)($data['advance_amount'] ?? $data['advanceAmount'] ?? 0);
$notes = trim($data['notes'] ?? '');

$printingDetails = isset($data['printing_details']) ? json_encode($data['printing_details']) : null;
$hardwareDetails = isset($data['hardware_details']) ? json_encode($data['hardware_details']) : null;
$scheduledAt = !empty($data['scheduled_at']) ? date('Y-m-d H:i:s', strtotime($data['scheduled_at'])) : null;

$bookingNumber = 'BK-' . date('Ymd') . '-' . rand(100, 999);

$pdo = getDbConnection();

// Get customer ID
$stmtCust = $pdo->prepare("SELECT id FROM customers WHERE user_id = ?");
$stmtCust->execute([$user['id']]);
$customerRow = $stmtCust->fetch();
$customerId = $customerRow ? $customerRow['id'] : null;

$paymentStatus = ($advanceAmount >= $totalAmount && $totalAmount > 0) ? 'PAID' : (($advanceAmount > 0) ? 'PARTIAL' : 'UNPAID');

$stmt = $pdo->prepare("
    INSERT INTO bookings (
        booking_number, customer_id, user_id, service_id, service_name, type, status,
        total_amount, advance_amount, payment_status, notes, printing_details, hardware_details, scheduled_at
    ) VALUES (?, ?, ?, ?, ?, ?, 'PENDING', ?, ?, ?, ?, ?, ?, ?)
");
$stmt->execute([
    $bookingNumber, $customerId, $user['id'], $serviceId, $serviceName, $type,
    $totalAmount, $advanceAmount, $paymentStatus, $notes, $printingDetails, $hardwareDetails, $scheduledAt
]);

$bookingId = $pdo->lastInsertId();

// Associate uploaded file IDs if passed
$fileIds = isset($data['file_ids']) && is_array($data['file_ids']) ? $data['file_ids'] : [];
if (!empty($fileIds)) {
    $stmtUpload = $pdo->prepare("UPDATE uploads SET booking_id = ? WHERE id = ? AND user_uid = ?");
    foreach ($fileIds as $fid) {
        $stmtUpload->execute([$bookingId, (int)$fid, $user['firebase_uid']]);
    }
}

$fetch = $pdo->prepare("SELECT * FROM bookings WHERE id = ?");
$fetch->execute([$bookingId]);
$booking = $fetch->fetch();

$fetchFiles = $pdo->prepare("SELECT id, original_name, stored_name, mime_type, file_size, created_at FROM uploads WHERE booking_id = ?");
$fetchFiles->execute([$bookingId]);
$booking['files'] = $fetchFiles->fetchAll();

sendSuccess($booking, 201, 'Booking submitted successfully.');
