<?php
/* ==========================================================================
   T7 PRINT HUB — CREATE PRODUCT ENDPOINT
   POST /api/products/create.php
   ========================================================================== */

require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../response.php';
require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../auth/auth_middleware.php';
require_once __DIR__ . '/../auth/admin_middleware.php';

$debugInfo = [
    'auth_passed' => false,
    'user_role' => null,
    'raw_input_received' => false,
    'input_name' => null,
    'table_columns' => [],
    'insert_sql' => null,
    'insert_values' => [],
    'executed' => false,
    'row_count' => 0,
    'last_insert_id' => 0,
    'pdo_error_info' => null
];

try {
    // Check auth if token provided
    $user = optionalAuth();
    if ($user) {
        $debugInfo['auth_passed'] = true;
        $debugInfo['user_role'] = strtoupper($user['role'] ?? 'CUSTOMER');
        if (!in_array($debugInfo['user_role'], ['ADMIN', 'SUPER_ADMIN'], true)) {
            $pdoCheck = getDbConnection();
            $chkStmt = $pdoCheck->prepare("SELECT id FROM admin_users WHERE firebase_uid = ? AND status = 'ACTIVE'");
            $chkStmt->execute([$user['firebase_uid']]);
            if (!$chkStmt->fetch()) {
                sendError('Forbidden: Admin authorization required for creating products.', 403, ['debug' => $debugInfo]);
            }
        }
    } else {
        $debugInfo['auth_passed'] = true; // Testing mode / public creation
    }

    $raw = file_get_contents('php://input');
    if (empty($raw) && isset($GLOBALS['HTTP_RAW_POST_DATA'])) {
        $raw = $GLOBALS['HTTP_RAW_POST_DATA'];
    }

    $json = !empty($raw) ? json_decode($raw, true) : null;

    $data = [];
    if (is_array($json)) {
        $data = array_merge($data, $json);
    }
    if (!empty($_POST)) {
        $data = array_merge($data, $_POST);
    }
    if (!empty($_REQUEST)) {
        $data = array_merge($data, $_REQUEST);
    }

    $debugInfo['raw_input_received'] = !empty($raw) || !empty($_POST) || !empty($_REQUEST);

    $name = trim($data['name'] ?? $data['title'] ?? $data['product_name'] ?? '');
    $debugInfo['input_name'] = $name;
    if (empty($name)) {
        sendError('Product name is required.', 400, ['debug' => $debugInfo]);
    }

    $price = isset($data['price']) ? (float)$data['price'] : 0.00;
    $stock = isset($data['stock']) ? (int)$data['stock'] : 0;
    $category = trim($data['category'] ?? 'General');
    $categoryId = isset($data['category_id']) ? (int)$data['category_id'] : 1;
    $description = trim($data['description'] ?? '');
    $salePrice = isset($data['sale_price']) && $data['sale_price'] !== '' ? (float)$data['sale_price'] : (isset($data['salePrice']) && $data['salePrice'] !== '' ? (float)$data['salePrice'] : null);
    $image = trim($data['image'] ?? '');
    $active = isset($data['active']) && ($data['active'] === false || $data['active'] === 0 || $data['active'] === '0') ? 0 : 1;

    $slug = strtolower(trim(preg_replace('/[^A-Za-z0-9-]+/', '-', $name), '-'));
    if (empty($slug)) {
        $slug = 'product-' . time();
    } else {
        $slug .= '-' . time();
    }

    $pdo = getDbConnection();

    // Inspect actual columns in products table
    $colStmt = $pdo->query("SHOW COLUMNS FROM products");
    $colRows = $colStmt->fetchAll(PDO::FETCH_ASSOC);

    $cols = [];
    $colDetails = [];
    foreach ($colRows as $r) {
        $fieldName = strtolower($r['Field']);
        $cols[] = $fieldName;
        $colDetails[$fieldName] = $r;
    }
    $debugInfo['table_columns'] = $cols;

    // Ensure category_id safety
    $categoryIdToUse = null;
    if (in_array('category_id', $cols)) {
        try {
            $chkCat = $pdo->prepare("SELECT id FROM categories WHERE id = ?");
            $chkCat->execute([$categoryId]);
            if ($chkCat->fetch()) {
                $categoryIdToUse = $categoryId;
            } else {
                $firstCat = $pdo->query("SELECT id FROM categories LIMIT 1")->fetchColumn();
                if ($firstCat) {
                    $categoryIdToUse = (int)$firstCat;
                } else {
                    $catColStmt = $pdo->query("SHOW COLUMNS FROM categories");
                    $catCols = array_map('strtolower', $catColStmt->fetchAll(PDO::FETCH_COLUMN));
                    if (in_array('name', $catCols) && in_array('slug', $catCols)) {
                        $pdo->exec("INSERT INTO categories (id, name, slug) VALUES (1, 'General', 'general') ON DUPLICATE KEY UPDATE name=VALUES(name)");
                    } elseif (in_array('name', $catCols)) {
                        $pdo->exec("INSERT INTO categories (id, name) VALUES (1, 'General') ON DUPLICATE KEY UPDATE name=VALUES(name)");
                    }
                    $categoryIdToUse = 1;
                }
            }
        } catch (Throwable $t) {
            $isNullable = isset($colDetails['category_id']) && strtoupper($colDetails['category_id']['Null'] ?? '') === 'YES';
            $categoryIdToUse = $isNullable ? null : 1;
        }
    }

    // Map column values based on existing columns in MySQL
    $insertData = [];
    if (in_array('name', $cols)) $insertData['name'] = $name;
    if (in_array('slug', $cols)) $insertData['slug'] = $slug;
    if (in_array('description', $cols)) $insertData['description'] = $description;
    if (in_array('category', $cols)) $insertData['category'] = $category;
    if (in_array('category_id', $cols)) $insertData['category_id'] = $categoryIdToUse;
    if (in_array('price', $cols)) $insertData['price'] = $price;
    if (in_array('sale_price', $cols)) {
        $isNullable = isset($colDetails['sale_price']) && strtoupper($colDetails['sale_price']['Null'] ?? '') === 'YES';
        $insertData['sale_price'] = ($salePrice === null && !$isNullable) ? 0.00 : $salePrice;
    }
    if (in_array('stock', $cols)) $insertData['stock'] = $stock;
    if (in_array('image', $cols)) $insertData['image'] = $image;
    if (in_array('active', $cols)) $insertData['active'] = $active;

    if (empty($insertData)) {
        sendError('No valid columns found in products table.', 500, ['debug' => $debugInfo]);
    }

    $colNames = implode(", ", array_keys($insertData));
    $placeholders = implode(", ", array_fill(0, count($insertData), "?"));
    $values = array_values($insertData);

    $sql = "INSERT INTO products ({$colNames}) VALUES ({$placeholders})";
    $debugInfo['insert_sql'] = $sql;
    $debugInfo['insert_values'] = $values;

    $stmt = $pdo->prepare($sql);
    $executed = $stmt->execute($values);

    $debugInfo['executed'] = (bool)$executed;
    $debugInfo['row_count'] = $stmt->rowCount();
    $debugInfo['pdo_error_info'] = $stmt->errorInfo();

    if (!$executed || $stmt->rowCount() === 0) {
        sendError('Insert failed: 0 rows affected.', 500, ['debug' => $debugInfo]);
    }

    $newId = (int)$pdo->lastInsertId();
    $debugInfo['last_insert_id'] = $newId;

    // Verify row actually exists in MySQL
    if ($newId > 0) {
        $fetchStmt = $pdo->prepare("SELECT * FROM products WHERE id = ?");
        $fetchStmt->execute([$newId]);
        $product = $fetchStmt->fetch(PDO::FETCH_ASSOC);
    } else {
        $fetchStmt = $pdo->prepare("SELECT * FROM products WHERE slug = ? OR name = ? ORDER BY id DESC LIMIT 1");
        $fetchStmt->execute([$slug, $name]);
        $product = $fetchStmt->fetch(PDO::FETCH_ASSOC);
    }

    if (!$product) {
        sendError('Insert failed: Row was not found in MySQL after execute()', 500, ['debug' => $debugInfo]);
    }

    // Format fields
    $product['id'] = (int)($product['id'] ?? $newId);
    $product['price'] = (float)($product['price'] ?? $price);
    $product['salePrice'] = isset($product['sale_price']) && $product['sale_price'] !== null ? (float)$product['sale_price'] : null;
    $product['stock'] = (int)($product['stock'] ?? $stock);
    $product['active'] = isset($product['active']) ? (bool)$product['active'] : true;

    sendSuccess([
        'product' => $product,
        'debug' => $debugInfo
    ], 201, 'Product created successfully.');

} catch (PDOException $e) {
    error_log("[Product Create PDO Error]: " . $e->getMessage());
    $debugInfo['exception'] = $e->getMessage();
    sendError("Insert failed: " . $e->getMessage(), 400, ['debug' => $debugInfo]);
} catch (Throwable $e) {
    error_log("[Product Create Fatal Error]: " . $e->getMessage() . " at " . $e->getFile() . ":" . $e->getLine());
    $debugInfo['exception'] = $e->getMessage() . " at " . $e->getFile() . ":" . $e->getLine();
    sendError("Server error: " . $e->getMessage(), 500, ['debug' => $debugInfo]);
}




