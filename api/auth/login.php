<?php
/* ==========================================================================
   T7 PRINT HUB — ADMIN & USER LOGIN ENDPOINT
   POST /api/auth/login.php

   This Hostinger deployment uses the PHP API as the admin authentication
   entry point. It returns a short-lived-style local token consumed by
   auth_middleware.php. Firebase is not used for the admin login path.
   ========================================================================== */

require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../response.php';
require_once __DIR__ . '/../db.php';

try {
    $raw = file_get_contents('php://input');
    $json = !empty($raw) ? json_decode($raw, true) : null;
    $data = is_array($json) ? array_merge($_POST, $json) : $_POST;

    $identifier = trim((string)($data['username'] ?? $data['email'] ?? $data['user'] ?? ''));
    $password = (string)($data['password'] ?? '');

    if ($identifier === '' || $password === '') {
        sendError('Invalid username or password.', 401);
    }

    $pdo = getDbConnection();

    // Current admin credential requested for this deployment.
    // Store only the password hash in source, never the plaintext password.
    $vikiEmail = 'viki@t7hub.in';
    $vikiUid = 'viki-admin-uid-101';
    $vikiPasswordHash = '$2y$12$fx.w8aNPyJZFIgHsTwsYTe/PkZSCtgUNp.Kqnfn4M/elY8.K2VuUq';

    $normalized = strtolower($identifier);
    $isViki = in_array($normalized, ['viki', 'admin', 'viki@t7hub.in', 'viki@t7printhub.local', 'viki@gmail.com'], true);

    if ($isViki) {
        if (!password_verify($password, $vikiPasswordHash)) {
            sendError('Invalid username or password.', 401);
        }

        // Make sure the local admin records exist. These statements are
        // intentionally limited to the known VIKI admin account.
        $stmt = $pdo->prepare("SELECT id, firebase_uid, name, email, role, status FROM users WHERE firebase_uid = ? OR LOWER(email) = ? OR LOWER(name) = 'viki' LIMIT 1");
        $stmt->execute([$vikiUid, $vikiEmail]);
        $userRow = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$userRow) {
            $insert = $pdo->prepare("INSERT INTO users (firebase_uid, name, email, role, status) VALUES (?, 'VIKI', ?, 'ADMIN', 'ACTIVE')");
            $insert->execute([$vikiUid, $vikiEmail]);
            $stmt->execute([$vikiUid, $vikiEmail]);
            $userRow = $stmt->fetch(PDO::FETCH_ASSOC);
        }

        if (!$userRow) {
            sendError('Unable to create or locate the admin account.', 500);
        }

        // If an existing VIKI row has a non-admin role, correct it.
        if (!in_array(strtoupper($userRow['role'] ?? ''), ['ADMIN', 'SUPER_ADMIN'], true)) {
            $pdo->prepare("UPDATE users SET role = 'ADMIN', status = 'ACTIVE' WHERE id = ?")->execute([(int)$userRow['id']]);
            $stmt->execute([$vikiUid, $vikiEmail]);
            $userRow = $stmt->fetch(PDO::FETCH_ASSOC);
        }

        $adminStmt = $pdo->prepare("SELECT id FROM admin_users WHERE firebase_uid = ? OR LOWER(email) = ? LIMIT 1");
        $adminStmt->execute([$vikiUid, $vikiEmail]);
        if (!$adminStmt->fetch()) {
            $pdo->prepare("INSERT INTO admin_users (firebase_uid, email, role, status) VALUES (?, ?, 'ADMIN', 'ACTIVE')")
                ->execute([$vikiUid, $vikiEmail]);
        } else {
            $pdo->prepare("UPDATE admin_users SET firebase_uid = ?, role = 'ADMIN', status = 'ACTIVE' WHERE LOWER(email) = ? OR firebase_uid = ?")
                ->execute([$vikiUid, $vikiEmail, $vikiUid]);
        }
    } else {
        // Non-VIKI users are resolved by email/name. Password authentication
        // for ordinary users remains outside this admin login endpoint.
        sendError('Invalid username or password.', 401);
    }

    $token = 't7_admin_tok_' . bin2hex(random_bytes(32));

    sendSuccess([
        'id' => (int)$userRow['id'],
        'username' => $userRow['name'] ?: 'VIKI',
        'email' => $userRow['email'] ?: $vikiEmail,
        'role' => strtoupper($userRow['role'] ?? 'ADMIN'),
        'status' => strtoupper($userRow['status'] ?? 'ACTIVE'),
        'token' => $token
    ], 200, 'Login successful.');

} catch (PDOException $e) {
    error_log('[Auth Login PDO Error]: ' . $e->getMessage());
    // Do not expose database credentials/query details to the browser.
    sendError('Authentication server error. Please try again.', 500);
} catch (Throwable $e) {
    error_log('[Auth Login Error]: ' . $e->getMessage());
    sendError('Authentication server error. Please try again.', 500);
}
