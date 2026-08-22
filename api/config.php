<?php

// T7 PRINT HUB — DATABASE CONFIGURATION

if (file_exists(__DIR__ . '/config.local.php')) {
    require_once __DIR__ . '/config.local.php';
}

// IMPORTANT:
// Put your REAL Hostinger MySQL values in config.local.php.
// Do not use root / empty password on Hostinger.

if (!defined('DB_HOST')) {
    define('DB_HOST', 'YOUR_HOSTINGER_DB_HOST');
}

if (!defined('DB_PORT')) {
    define('DB_PORT', '3306');
}

if (!defined('DB_NAME')) {
    define('DB_NAME', 'YOUR_HOSTINGER_DATABASE_NAME');
}

if (!defined('DB_USER')) {
    define('DB_USER', 'YOUR_HOSTINGER_DATABASE_USERNAME');
}

if (!defined('DB_PASSWORD')) {
    define('DB_PASSWORD', 'YOUR_HOSTINGER_DATABASE_PASSWORD');
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