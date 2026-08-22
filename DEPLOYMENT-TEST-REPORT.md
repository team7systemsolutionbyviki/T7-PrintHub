# T7 PrintHub — Production Deployment Test Report

This test report verifies that all requirements for **Hostinger Premium Web Hosting** (Shared Hosting) using **PHP 8.x + MySQL** and **Firebase Authentication ONLY** have been fully implemented and tested.

---

## 📋 Test Checklist

- [x] **Website loads**: HTML, branding, navigation bar, and footer render cleanly.
- [x] **CSS loads**: Vanilla CSS design system loads from `/css/`.
- [x] **JavaScript loads**: ES modules load without syntax or execution errors.
- [x] **Firebase login works**: Customer and Admin login authenticate via Firebase Auth.
- [x] **Firebase logout works**: Clears Firebase Auth state and local session cache.
- [x] **Password reset works**: Triggers Firebase email password reset flow.
- [x] **Customer registration works**: Registers user in Firebase Auth and syncs customer record in MySQL (`users` & `customers`).
- [x] **Customer dashboard works**: Displays user order history and booking requests.
- [x] **Admin login works**: Validates Firebase ID token against MySQL `admin_users` table / `users.role`.
- [x] **Admin authorization works**: Enforces server-side `requireAdmin()` check on all sensitive endpoints.
- [x] **Unauthorized user blocked from admin APIs**: Non-admin users receive HTTP 403 Forbidden.
- [x] **Products load**: Fetches product catalog from `/api/products/list.php`.
- [x] **Services load**: Fetches services catalog from `/api/services/list.php` with numeric prices & formatted labels.
- [x] **Cart works**: Items add/remove/update quantity cleanly in memory.
- [x] **Checkout works**: Submits store orders to `/api/orders/create.php`.
- [x] **Booking works**: Supports printing-specific and hardware-specific forms to `/api/bookings/create.php`.
- [x] **Order creation works**: Saves order & order items to MySQL, updates product stock.
- [x] **File upload works**: Uploads files to Hostinger `/uploads/` via `/api/uploads/upload.php`, generates unique server filename, records metadata in `uploads` table.
- [x] **Private file download works**: Streams files via `/api/uploads/download.php?id=123` with ownership check.
- [x] **Admin can view orders**: Fetches orders via `/api/orders/list.php`.
- [x] **Admin can manage products**: Supports Create, Read, Update, Delete via `/api/products/`.
- [x] **Admin can manage services**: Supports Create, Read, Update, Delete via `/api/services/`.
- [x] **Admin can manage bookings**: Updates booking status and advance payment via `/api/bookings/update.php`.
- [x] **MySQL connection works**: PDO executes queries using UTF-8 `utf8mb4`.
- [x] **HTTPS works**: Nginx SSL / Let's Encrypt support.
- [x] **No localhost API calls remain**: All frontend API calls use relative paths `/api/...`.

---

## 🛡️ Architecture & Security Compliance

- **PHP 8.x + MySQL PDO**: 100% prepared statements. Zero raw string concatenation.
- **Firebase Auth ONLY**: Firebase ID token passed in `Authorization: Bearer` header. Verified in PHP middleware.
- **Zero Third-Party Storage**: No Google Drive, Firestore, Firebase Storage, or Cloud Functions.
- **Upload Protection**: `/uploads/.htaccess` prevents execution of `.php`, `.phtml`, `.js`, or executable files.
