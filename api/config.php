<?php

// T7 PRINT HUB — DATABASE CONFIGURATION

if (file_exists(__DIR__ . '/config.local.php')) {
    require_once __DIR__ . '/config.local.php';
}

if (!defined('DB_HOST')) {
    define('DB_HOST', 'localhost');
}

if (!defined('DB_PORT')) {
    define('DB_PORT', '3306');
}

if (!defined('DB_NAME')) {
    define('DB_NAME', 'u700928676_t7_printhub');
}

if (!defined('DB_USER')) {
    define('DB_USER', 'u700928676_t7_admin');
}

if (!defined('DB_PASSWORD')) {
    define('DB_PASSWORD', 'viki1101@VIKI');
}

if (!defined('FIREBASE_PROJECT_ID')) {
    define('FIREBASE_PROJECT_ID', 'printing-app-9a63f');
}

if (!defined('UPLOAD_DIR')) {
    define('UPLOAD_DIR', __DIR__ . '/../uploads/');
}

if (!defined('MAX_UPLOAD_SIZE')) {
    define('MAX_UPLOAD_SIZE', 100 * 1024 * 1024);
}