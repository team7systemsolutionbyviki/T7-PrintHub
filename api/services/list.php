<?php
/* ==========================================================================
   T7 PRINT HUB — SERVICES LIST ENDPOINT
   GET /api/services/list.php
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

    // Inspect actual columns in services table
    $colStmt = $pdo->query("SHOW COLUMNS FROM services");
    $rawCols = $colStmt->fetchAll(PDO::FETCH_COLUMN);
    $cols = array_map('strtolower', $rawCols);

    $selectFields = [];
    $selectFields[] = in_array('id', $cols) ? "s.id" : "0 AS id";
    $selectFields[] = in_array('category_id', $cols) ? "s.category_id" : "NULL AS category_id";
    $selectFields[] = in_array('name', $cols) ? "s.name" : "'' AS name";
    $selectFields[] = in_array('slug', $cols) ? "s.slug" : "'' AS slug";
    $selectFields[] = in_array('description', $cols) ? "s.description" : "'' AS description";
    $selectFields[] = in_array('price', $cols) ? "s.price" : "0.00 AS price";
    $selectFields[] = in_array('starting_price', $cols) ? "s.starting_price" : "s.price AS starting_price";
    $selectFields[] = in_array('price_label', $cols) ? "s.price_label" : "'' AS price_label";
    $selectFields[] = in_array('image', $cols) ? "s.image" : "'' AS image";
    $selectFields[] = in_array('active', $cols) ? "s.active" : "1 AS active";
    $selectFields[] = in_array('sort_order', $cols) ? "s.sort_order" : "0 AS sort_order";
    $selectFields[] = in_array('created_at', $cols) ? "s.created_at" : "NULL AS created_at";
    $selectFields[] = in_array('updated_at', $cols) ? "s.updated_at" : "NULL AS updated_at";

    $fieldsSql = implode(", ", $selectFields);

    $whereSql = "";
    if (!$showAll && in_array('active', $cols)) {
        $whereSql = "WHERE s.active = 1";
    }

    $orderSql = in_array('sort_order', $cols) ? "ORDER BY s.sort_order ASC, s.name ASC" : "ORDER BY s.name ASC";

    $query = "SELECT {$fieldsSql} FROM services s {$whereSql} {$orderSql}";
    $stmt = $pdo->prepare($query);
    $stmt->execute();
    $services = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];

    foreach ($services as &$s) {
        $s['id'] = (int)($s['id'] ?? 0);
        $s['price'] = (float)($s['price'] ?? 0);
        $s['startingPrice'] = isset($s['starting_price']) ? (float)$s['starting_price'] : $s['price'];
        $s['priceLabel'] = !empty($s['price_label']) ? $s['price_label'] : ('Starting from ₹' . number_format($s['startingPrice'], 2));
        $s['active'] = isset($s['active']) ? (bool)$s['active'] : true;
    }

    sendSuccess($services);
} catch (Throwable $e) {
    error_log("[Services List API Warning]: " . $e->getMessage());
    sendSuccess([]);
}

