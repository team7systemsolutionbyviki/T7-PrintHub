<?php
/* ==========================================================================
   T7 PRINT HUB — PRODUCTS LIST ENDPOINT
   GET /api/products/list.php
   ========================================================================== */

require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../response.php';
require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../auth/auth_middleware.php';

try {
    $user = optionalAuth();
    $isAdmin = $user && in_array(strtoupper($user['role'] ?? ''), ['ADMIN', 'SUPER_ADMIN'], true);
    $showAll = isset($_GET['all']) && $_GET['all'] === '1' && $isAdmin;

    $pdo = getDbConnection();

    // Inspect actual columns in products table
    $colStmt = $pdo->query("SHOW COLUMNS FROM products");
    $rawCols = $colStmt->fetchAll(PDO::FETCH_COLUMN);
    $cols = array_map('strtolower', $rawCols);

    // Build dynamic select fields based on actual existing columns
    $selectFields = [];
    $selectFields[] = in_array('id', $cols) ? "p.id" : "0 AS id";
    $selectFields[] = in_array('category_id', $cols) ? "p.category_id" : "NULL AS category_id";
    $selectFields[] = in_array('category', $cols) ? "p.category" : "'' AS category";
    $selectFields[] = in_array('name', $cols) ? "p.name" : "'' AS name";
    $selectFields[] = in_array('slug', $cols) ? "p.slug" : "'' AS slug";
    $selectFields[] = in_array('description', $cols) ? "p.description" : "'' AS description";
    $selectFields[] = in_array('price', $cols) ? "p.price" : "0.00 AS price";
    $selectFields[] = in_array('sale_price', $cols) ? "p.sale_price" : "NULL AS sale_price";
    $selectFields[] = in_array('stock', $cols) ? "p.stock" : "0 AS stock";
    $selectFields[] = in_array('image', $cols) ? "p.image" : "'' AS image";
    $selectFields[] = in_array('active', $cols) ? "p.active" : "1 AS active";
    $selectFields[] = in_array('created_at', $cols) ? "p.created_at" : "NULL AS created_at";
    $selectFields[] = in_array('updated_at', $cols) ? "p.updated_at" : "NULL AS updated_at";

    // Category name resolution
    if (in_array('category', $cols)) {
        $selectFields[] = "p.category AS category_name";
    } elseif (in_array('category_id', $cols)) {
        $selectFields[] = "CAST(p.category_id AS CHAR) AS category_name";
    } else {
        $selectFields[] = "'General' AS category_name";
    }

    $fieldsSql = implode(", ", $selectFields);

    $whereSql = "";
    if (!$showAll && in_array('active', $cols)) {
        $whereSql = "WHERE p.active = 1";
    }

    $orderSql = in_array('name', $cols) ? "ORDER BY p.name ASC" : (in_array('id', $cols) ? "ORDER BY p.id ASC" : "");

    $query = "SELECT {$fieldsSql} FROM products p {$whereSql} {$orderSql}";

    $stmt = $pdo->prepare($query);
    $stmt->execute();
    $products = $stmt->fetchAll(PDO::FETCH_ASSOC);

    foreach ($products as &$p) {
        $p['id'] = (int)($p['id'] ?? 0);
        $p['category_id'] = isset($p['category_id']) && $p['category_id'] !== null ? (int)$p['category_id'] : null;
        $p['category_name'] = !empty($p['category_name']) ? $p['category_name'] : (!empty($p['category']) ? $p['category'] : 'General');
        $p['price'] = (float)($p['price'] ?? 0);
        $p['salePrice'] = isset($p['sale_price']) && $p['sale_price'] !== null ? (float)$p['sale_price'] : null;
        $p['stock'] = (int)($p['stock'] ?? 0);
        $p['active'] = isset($p['active']) ? (bool)$p['active'] : true;
    }

    sendSuccess($products);
} catch (PDOException $e) {
    error_log("[Products List PDO Error]: " . $e->getMessage());
    sendError("Database error: " . $e->getMessage(), 500);
} catch (Throwable $e) {
    error_log("[Products List Fatal Error]: " . $e->getMessage() . " at " . $e->getFile() . ":" . $e->getLine());
    sendError("Server error: " . $e->getMessage(), 500);
}


