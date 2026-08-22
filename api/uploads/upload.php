<?php
/* ==========================================================================
   T7 PRINT HUB — HOSTINGER FILE UPLOAD ENDPOINT
   POST /api/uploads/upload.php
   ========================================================================== */

require_once __DIR__ . '/../auth/auth_middleware.php';

$user = requireAuth();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendError('Method not allowed.', 405);
}

if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
    $errCode = isset($_FILES['file']) ? $_FILES['file']['error'] : UPLOAD_ERR_NO_FILE;
    sendError("File upload error code: {$errCode}", 400);
}

$file = $_FILES['file'];
$originalName = basename($file['name']);
$fileSize = (int)$file['size'];
$tmpPath = $file['tmp_name'];

if ($fileSize > MAX_UPLOAD_SIZE) {
    sendError('File exceeds maximum allowed upload size of 100MB.', 400);
}

$ext = strtolower(pathinfo($originalName, PATHINFO_EXTENSION));

// Explicitly reject executable / script extensions for security
$prohibitedExts = ['php', 'php3', 'php4', 'php5', 'phtml', 'phar', 'cgi', 'pl', 'py', 'js', 'sh', 'exe', 'bat', 'cmd', 'vbs', 'scr', 'jar', 'apk', 'msi'];
if (in_array($ext, $prohibitedExts, true)) {
    sendError('Executable files and server scripts are strictly prohibited.', 400);
}

$allowedExts = ['pdf', 'jpg', 'jpeg', 'png', 'webp', 'doc', 'docx', 'xls', 'xlsx'];
if (!in_array($ext, $allowedExts, true)) {
    sendError('Unsupported file type. Allowed formats: PDF, JPG, PNG, WEBP, DOC, DOCX, XLS, XLSX.', 400);
}

// Generate random safe server filename
$randomHash = bin2hex(random_bytes(6));
$datePrefix = date('Ymd');
$bookingPrefix = isset($_POST['bookingId']) && !empty($_POST['bookingId']) ? 'BK-' . preg_replace('/[^A-Za-z0-9_-]/', '', $_POST['bookingId']) : 'BK';
$storedName = "{$bookingPrefix}-{$datePrefix}-{$randomHash}.{$ext}";

$targetDir = UPLOAD_DIR;
if (!is_dir($targetDir)) {
    mkdir($targetDir, 0755, true);
}

$storagePath = $targetDir . $storedName;

if (!move_uploaded_file($tmpPath, $storagePath)) {
    sendError('Failed to save file to server storage.', 500);
}

$mimeType = mime_content_type($storagePath) ?: $file['type'] ?: 'application/octet-stream';
$bookingId = isset($_POST['bookingId']) && ctype_digit($_POST['bookingId']) ? (int)$_POST['bookingId'] : null;
$orderId = isset($_POST['orderId']) && ctype_digit($_POST['orderId']) ? (int)$_POST['orderId'] : null;

$pdo = getDbConnection();
$stmt = $pdo->prepare("
    INSERT INTO uploads (user_uid, original_name, stored_name, mime_type, file_size, storage_path, order_id, booking_id, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'UPLOADED')
");
$stmt->execute([
    $user['firebase_uid'],
    $originalName,
    $storedName,
    $mimeType,
    $fileSize,
    $storagePath,
    $orderId,
    $bookingId
]);

$uploadId = (int)$pdo->lastInsertId();

sendSuccess([
    'id' => $uploadId,
    'fileId' => $uploadId,
    'originalName' => $originalName,
    'storedName' => $storedName,
    'mimeType' => $mimeType,
    'fileSize' => $fileSize,
    'downloadURL' => "/api/uploads/download.php?id={$uploadId}",
    'url' => "/api/uploads/download.php?id={$uploadId}",
    'status' => 'UPLOADED',
    'createdAt' => date('c')
], 201, 'File uploaded successfully.');
