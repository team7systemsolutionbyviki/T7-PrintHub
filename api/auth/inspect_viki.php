<?php
/* ==========================================================================
   SAFE ADMIN USER INSPECTION ENDPOINT (NO PASSWORDS EXPOSED)
   ========================================================================== */

require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../response.php';
require_once __DIR__ . '/../db.php';

try {
    $pdo = getDbConnection();

    // Check columns in admin_users table
    $colStmt = $pdo->query("SHOW COLUMNS FROM admin_users");
    $adminCols = $colStmt->fetchAll(PDO::FETCH_COLUMN);

    // Check columns in users table
    $uColStmt = $pdo->query("SHOW COLUMNS FROM users");
    $userCols = $uColStmt->fetchAll(PDO::FETCH_COLUMN);

    // Query admin_users
    $adminRow = null;
    $hasUsernameInAdmin = in_array('username', $adminCols, true);
    $hasEmailInAdmin = in_array('email', $adminCols, true);

    $sql = "SELECT * FROM admin_users WHERE 1=1 ";
    $params = [];
    if ($hasUsernameInAdmin && $hasEmailInAdmin) {
        $sql .= "AND (LOWER(username) = LOWER(?) OR LOWER(email) = LOWER(?) OR LOWER(email) LIKE '%viki%') ";
        $params = ['viki', 'viki'];
    } elseif ($hasEmailInAdmin) {
        $sql .= "AND (LOWER(email) = LOWER(?) OR LOWER(email) LIKE '%viki%') ";
        $params = ['viki@t7hub.in'];
    }
    $sql .= "LIMIT 1";

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $adminRow = $stmt->fetch(PDO::FETCH_ASSOC);

    $adminResult = null;
    if ($adminRow) {
        $pwdVal = $adminRow['password'] ?? $adminRow['password_hash'] ?? '';
        $storageType = 'none/unknown';
        if (strpos($pwdVal, '$2y$') === 0 || strpos($pwdVal, '$2a$') === 0 || strpos($pwdVal, '$2b$') === 0) {
            $storageType = 'hashed (bcrypt)';
        } elseif (!empty($pwdVal)) {
            $storageType = 'plain text or unhashed';
        }

        $adminResult = [
            'exists' => true,
            'id' => (int)($adminRow['id'] ?? 0),
            'username' => $adminRow['username'] ?? $adminRow['name'] ?? 'VIKI',
            'email' => $adminRow['email'] ?? '',
            'role' => strtoupper($adminRow['role'] ?? 'ADMIN'),
            'status' => strtoupper($adminRow['status'] ?? 'ACTIVE'),
            'passwordStorageType' => $storageType
        ];
    } else {
        $adminResult = [
            'exists' => false
        ];
    }

    // Query users table
    $userStmt = $pdo->prepare("SELECT id, name, email, role, status FROM users WHERE LOWER(name) = 'viki' OR LOWER(email) LIKE '%viki%' LIMIT 1");
    $userStmt->execute();
    $userRow = $userStmt->fetch(PDO::FETCH_ASSOC);

    sendSuccess([
        'admin_users_columns' => $adminCols,
        'users_columns' => $userCols,
        'viki_in_admin_users' => $adminResult,
        'viki_in_users' => $userRow ? [
            'exists' => true,
            'id' => (int)$userRow['id'],
            'name' => $userRow['name'],
            'email' => $userRow['email'],
            'role' => $userRow['role'],
            'status' => $userRow['status']
        ] : ['exists' => false]
    ]);

} catch (Throwable $e) {
    sendError('Inspection failed: ' . $e->getMessage(), 500);
}
