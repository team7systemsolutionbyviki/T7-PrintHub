<?php
/* ==========================================================================
   T7 PRINT HUB — PROTECTED PRIVATE FILE DOWNLOAD ENDPOINT
   GET /api/uploads/download.php?id=123
   ========================================================================== */

require_once __DIR__ . '/../auth/auth_middleware.php';

$user = requireAuth();

$id = (int)($_GET['id'] ?? 0);
if ($id <= 0) {
    sendError('Valid File ID is required.');
}

$pdo = getDbConnection();
$stmt = $pdo->prepare("SELECT * FROM uploads WHERE id = ?");
$stmt->execute([$id]);
$fileRecord = $stmt->fetch();

if (!$fileRecord) {
    sendError('File record not found.', 404);
}

// Ownership & Authorization check
$isOwner = ($fileRecord['user_uid'] === $user['firebase_uid']);
$isAdmin = in_array(strtoupper($user['role'] ?? ''), ['ADMIN', 'SUPER_ADMIN'], true);

if (!$isOwner && !$isAdmin) {
    sendError('Forbidden: Access denied to private customer file.', 403);
}

$filePath = $fileRecord['storage_path'];
if (!file_exists($filePath)) {
    sendError('File missing from server storage.', 404);
}

$isDownload = isset($_GET['download']) && $_GET['download'] === '1';
$disposition = $isDownload ? 'attachment' : 'inline';
$encodedName = rawurlencode($fileRecord['original_name']);

header('Content-Type: ' . ($fileRecord['mime_type'] ?: 'application/octet-stream'));
header('Content-Disposition: ' . $disposition . '; filename="' . $encodedName . '"');
header('Content-Length: ' . $fileRecord['file_size']);
header('Cache-Control: private, max-age=3600');

readfile($filePath);
exit;
