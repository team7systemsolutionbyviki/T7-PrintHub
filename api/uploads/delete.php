<?php
/* ==========================================================================
   T7 PRINT HUB — DELETE FILE ENDPOINT
   POST / DELETE /api/uploads/delete.php
   ========================================================================== */

require_once __DIR__ . '/../auth/auth_middleware.php';

$user = requireAuth();

$raw = file_get_contents('php://input');
$data = json_decode($raw, true) ?: $_POST;

$id = (int)($data['id'] ?? $_GET['id'] ?? 0);
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

$isOwner = ($fileRecord['user_uid'] === $user['firebase_uid']);
$isAdmin = in_array(strtoupper($user['role'] ?? ''), ['ADMIN', 'SUPER_ADMIN'], true);

if (!$isOwner && !$isAdmin) {
    sendError('Forbidden: Access denied.', 403);
}

if (file_exists($fileRecord['storage_path'])) {
    @unlink($fileRecord['storage_path']);
}

$del = $pdo->prepare("DELETE FROM uploads WHERE id = ?");
$del->execute([$id]);

sendSuccess(['id' => $id], 200, 'File deleted successfully.');
