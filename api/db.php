<?php
/* ==========================================================================
   T7 PRINT HUB — PDO MYSQL DATABASE CONNECTION FACTORY
   ========================================================================== */

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/response.php';

function getDbConnection() {
    static $pdo = null;

    if ($pdo !== null) {
        return $pdo;
    }

    $pass = defined('DB_PASSWORD') ? DB_PASSWORD : '';

    $hosts = array_unique([
        defined('DB_HOST') ? DB_HOST : 'localhost',
        'localhost',
        '127.0.0.1',
        'srv1101.hstgr.io'
    ]);

    $dbNames = array_unique([
        defined('DB_NAME') ? DB_NAME : 'u700928676_t7printhub',
        'u700928676_t7printhub',
        'u700928676_t7_printhub',
        'u700928676_t7hub'
    ]);

    $dbUsers = array_unique([
        defined('DB_USER') ? DB_USER : 'u700928676_t7_admin',
        'u700928676_t7_admin',
        'u700928676_t7admin',
        'u700928676_t7user'
    ]);

    $lastError = null;

    foreach ($hosts as $h) {
        if (empty($h)) continue;
        foreach ($dbNames as $db) {
            if (empty($db)) continue;
            foreach ($dbUsers as $u) {
                if (empty($u)) continue;
                try {
                    $dsn = ($h === 'localhost')
                        ? "mysql:host=localhost;dbname={$db};charset=utf8mb4"
                        : "mysql:host={$h};port=3306;dbname={$db};charset=utf8mb4";

                    $options = [
                        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                        PDO::ATTR_EMULATE_PREPARES   => false,
                        PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4"
                    ];
                    $pdo = new PDO($dsn, $u, $pass, $options);
                    return $pdo;
                } catch (PDOException $e) {
                    $lastError = "Host [{$h}] DB [{$db}] User [{$u}]: " . $e->getMessage();
                }
            }
        }
    }

    error_log("[Database Connection Error]: " . $lastError);
    sendError('Database connection failed. Please check hostinger MySQL configuration.', 500);
}
