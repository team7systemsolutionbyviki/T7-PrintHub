/* ==========================================================================
   T7 PRINT HUB — EXPRESS APPLICATION SETUP
   ========================================================================== */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const errorHandler = require('./middleware/error-handler');

// Route Imports
const authRoutes = require('./routes/auth');
const serviceRoutes = require('./routes/services');
const productRoutes = require('./routes/products');
const bookingRoutes = require('./routes/bookings');
const orderRoutes = require('./routes/orders');
const storageRoutes = require('./routes/storage');
const settingRoutes = require('./routes/settings');
const statRoutes = require('./routes/stats');

const app = express();

// Security Headers
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// CORS Setup
app.use(cors({
  origin: true,
  credentials: true
}));

// Rate Limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // Limit each IP to 500 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests from this IP, please try again later.' }
});

app.use('/api', apiLimiter);

// Body Parsing
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Health Check Endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'T7 PrintHub Express API',
    architecture: 'Firebase Auth + Node.js + MySQL + Hostinger Storage'
  });
});

// API Routes Mount
app.use('/api/auth', authRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/products', productRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/storage', storageRoutes);
app.use('/api/settings', settingRoutes);
app.use('/api/stats', statRoutes);

// Static frontend serving if hosted together
const rootDir = path.join(__dirname, '../../');
app.use(express.static(rootDir));

// Unified Error Handler
app.use(errorHandler);

module.exports = app;
