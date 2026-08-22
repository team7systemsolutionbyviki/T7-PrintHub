<?php
/* ==========================================================================
   T7 PRINT HUB — PDO MYSQL DATABASE CONNECTION FACTORY
   ========================================================================== */

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/response.php';

function getDbConnection() {
    static $pdo = null;

    if ($pdo === null) {
        try {
            $dsn = "mysql:host=" . DB_HOST . ";port=" . DB_PORT . ";dbname=" . DB_NAME . ";charset=utf8mb4";
            $options = [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES   => false,
                PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4"
            ];
            $pdo = new PDO($dsn, DB_USER, DB_PASSWORD, $options);
        } catch (PDOException $e) {
            error_log("[Database Connection Error]: " . $e->getMessage());
            sendError('Database connection failed. Please check hostinger MySQL configuration.', 500);
        }
    }

    return $pdo;
}
