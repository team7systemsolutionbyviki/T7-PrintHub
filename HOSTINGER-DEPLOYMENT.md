# T7 PrintHub — Hostinger Premium Web Hosting Deployment Guide

This guide details the step-by-step deployment procedure for running T7 PrintHub on **Hostinger Premium Web Hosting** (Shared Hosting) using **PHP 8.x + MySQL** and **Firebase Authentication ONLY**.

---

## 📌 Step-by-Step Deployment Procedure

### 1. Open Hostinger hPanel
- Log in to your [Hostinger Dashboard](https://hpanel.hostinger.com/).
- Select your Hosting account and click **Manage**.

### 2. Create MySQL Database
- Go to **Databases** → **Management**.
- Create a new database:
  - **MySQL Database Name**: `u123456789_t7printhub` (Note Hostinger's prefix).
  - **MySQL Username**: `u123456789_t7user`
  - **Password**: `YourStrongPassword123!`
- Click **Create**.

### 3. Import MySQL Schema & Seed Data
- Click **Enter phpMyAdmin** next to your new database.
- Select your database from the left sidebar.
- Click the **Import** tab at the top.
- Import `/database/schema.sql` first.
- Next, import `/database/seed.sql`.

### 4. Upload Project Files via File Manager
- In hPanel, go to **Files** → **File Manager**.
- Access the `public_html` directory.
- Upload all project files (`index.html`, `assets/`, `css/`, `js/`, `api/`, `database/`, `uploads/`, `sw.js`, `manifest.json`).

### 5. Configure Database Credentials in PHP
- Inside File Manager, navigate to `public_html/api/`.
- Copy `config.example.php` to `config.local.php` (or edit `config.php`).
- Update database settings:
  ```php
  <?php
  define('DB_HOST', 'localhost');
  define('DB_PORT', '3306');
  define('DB_NAME', 'u123456789_t7printhub');
  define('DB_USER', 'u123456789_t7user');
  define('DB_PASSWORD', 'YourStrongPassword123!');
  define('FIREBASE_PROJECT_ID', 'printing-app-9a63f');
  ```

### 6. Set Up Uploads Directory Permissions & Security
- Ensure `public_html/uploads/` directory exists and has `0755` permissions.
- Verify `public_html/uploads/.htaccess` is present to block script execution.

### 7. Configure Firebase Authorized Domains
- Open [Firebase Console](https://console.firebase.google.com/).
- Navigate to **Authentication** → **Settings** → **Authorized Domains**.
- Click **Add Domain**.
- Add your custom domain (e.g. `yourdomain.com` and `www.yourdomain.com`).

---

## 🔒 Security Best Practices
- **No Direct Upload Execution**: The `/uploads/.htaccess` prevents execution of `.php`, `.phtml`, `.js`, or executable files.
- **Private Document Access**: Private customer files are downloaded via `/api/uploads/download.php?id=123` which verifies Firebase token & ownership.
- **Parameterized SQL**: All PHP endpoints use PDO prepared statements to prevent SQL injection.
- **Firebase Token Verification**: Protected endpoints verify JWT signature, expiration, audience, and issuer.
