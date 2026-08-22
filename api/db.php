<?php
/* ==========================================================================
   T7 PRINT HUB — PDO MYSQL DATABASE CONNECTION FACTORY
   ========================================================================== */

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/response.php';

function getDbConnection() {
    static $pdo = null;

    if ($pdo === null) {
        $hosts = [];
        if (defined('DB_HOST') && DB_HOST !== 'YOUR_HOSTINGER_DB_HOST') {
            $hosts[] = DB_HOST;
        }
        $hosts[] = 'localhost';
        $hosts[] = '127.0.0.1';

        $lastError = null;

        foreach (array_unique($hosts) as $host) {
            if (empty($host)) continue;
            try {
                $dsn = "mysql:host=" . $host . ";port=" . (defined('DB_PORT') ? DB_PORT : '3306') . ";dbname=" . DB_NAME . ";charset=utf8mb4";
                $options = [
                    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                    PDO::ATTR_EMULATE_PREPARES   => false,
                    PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4"
                ];
                $pdo = new PDO($dsn, DB_USER, DB_PASSWORD, $options);
                break;
            } catch (PDOException $e) {
                $lastError = $e->getMessage();
            }
        }

        if ($pdo === null) {
            error_log("[Database Connection Error]: " . $lastError);
            sendError('Database connection failed. Please check hostinger MySQL configuration.', 500);
        }
    }

    return $pdo;
}
