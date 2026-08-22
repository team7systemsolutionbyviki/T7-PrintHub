<?php
/* ==========================================================================
   T7 PRINT HUB — CONFIGURATION TEMPLATE
   Rename this file to `config.php` and fill in your actual Hostinger MySQL details.
   ========================================================================== */

define('DB_HOST', 'localhost');
define('DB_PORT', '3306');
define('DB_NAME', 't7_printhub');
define('DB_USER', 'your_db_username');
define('DB_PASSWORD', 'your_db_password');

define('FIREBASE_PROJECT_ID', 'printing-app-9a63f');
define('UPLOAD_DIR', __DIR__ . '/../uploads/');
define('MAX_UPLOAD_SIZE', 100 * 1024 * 1024); // 100MB
