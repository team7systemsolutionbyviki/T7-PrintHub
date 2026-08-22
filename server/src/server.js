/* ==========================================================================
   T7 PRINT HUB — NODE.JS API SERVER ENTRY POINT
   ========================================================================== */

const dotenv = require('dotenv');
dotenv.config();

const app = require('./app');
const { pool } = require('./config/db');
const { initFirebaseAdmin } = require('./config/firebase');

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    // 1. Initialize Firebase Admin SDK
    initFirebaseAdmin();

    // 2. Test MySQL Connection
    const connection = await pool.getConnection();
    console.log('✅ Connected to MySQL database successfully.');
    connection.release();

    // 3. Start Express Server
    app.listen(PORT, () => {
      console.log(`🚀 T7 PrintHub API Server running on port ${PORT}`);
      console.log(`🌐 Architecture: Firebase Auth (Auth Only) -> Node.js Express -> MySQL & Hostinger Storage`);
    });
  } catch (err) {
    console.error('❌ Failed to start server:', err.message);
    process.exit(1);
  }
}

startServer();
