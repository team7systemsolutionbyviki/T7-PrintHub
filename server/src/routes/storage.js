/* ==========================================================================
   T7 PRINT HUB — HOSTINGER VPS FILE STORAGE API
   Private File Uploads & Authorized File Streaming.
   Zero Google Drive or Firebase Storage dependency.
   ========================================================================== */

const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const crypto = require('crypto');
const { query, queryOne } = require('../config/db');
const { authenticateFirebaseToken } = require('../middleware/firebase-auth');

// Storage Directory Setup (Hostinger VPS Filesystem)
const BASE_STORAGE_DIR = process.env.STORAGE_DIR || path.join(__dirname, '../../storage');
const UPLOADS_DIR = path.join(BASE_STORAGE_DIR, 'uploads');

const CATEGORY_FOLDERS = {
  'certificates': 'certificates',
  'flyers': 'flyers',
  'visiting-cards': 'visiting-cards',
  'business-cards': 'business-cards',
  'brochures': 'brochures',
  'other': 'other'
};

// Ensure directories exist
Object.values(CATEGORY_FOLDERS).forEach(folder => {
  const p = path.join(UPLOADS_DIR, folder);
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
});
const completedDir = path.join(BASE_STORAGE_DIR, 'completed');
if (!fs.existsSync(completedDir)) fs.mkdirSync(completedDir, { recursive: true });

// Multer Storage Configuration
const storageEngine = multer.diskStorage({
  destination: (req, file, cb) => {
    const rawCategory = String(req.body.category || 'other').toLowerCase();
    const folderName = CATEGORY_FOLDERS[rawCategory] || 'other';
    const targetDir = path.join(UPLOADS_DIR, folderName);
    if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });
    cb(null, targetDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.bin';
    const datePrefix = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomHash = crypto.randomBytes(4).toString('hex');
    const bookingPrefix = req.body.bookingId ? `BK-${req.body.bookingId}` : 'BK';
    const uniqueFilename = `${bookingPrefix}-${datePrefix}-${randomHash}${ext}`;
    cb(null, uniqueFilename);
  }
});

// File validation filter
const fileFilter = (req, file, cb) => {
  const fileName = (file.originalname || '').toLowerCase();
  const rejectedExts = ['.exe', '.bat', '.cmd', '.js', '.vbs', '.ps1', '.scr', '.sh', '.jar', '.apk', '.com', '.pif', '.msi'];

  if (rejectedExts.some(ext => fileName.endsWith(ext))) {
    return cb(new Error('Executable files are strictly prohibited for security.'), false);
  }

  const allowedExts = ['.pdf', '.jpg', '.jpeg', '.png', '.webp', '.doc', '.docx', '.xls', '.xlsx'];
  const hasAllowedExt = allowedExts.some(ext => fileName.endsWith(ext));

  const allowedMIMEs = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp'
  ];
  const hasAllowedMIME = allowedMIMEs.includes(file.mimetype.toLowerCase()) || file.mimetype.startsWith('image/');

  if (!hasAllowedExt && !hasAllowedMIME) {
    return cb(new Error('Unsupported file format. Allowed: PDF, JPG, PNG, WEBP, DOC, DOCX, XLS, XLSX.'), false);
  }

  cb(null, true);
};

const upload = multer({
  storage: storageEngine,
  fileFilter,
  limits: { fileSize: 100 * 1024 * 1024 } // 100MB max size
});

/**
 * POST /api/storage/upload
 * Authenticated file upload to Hostinger VPS storage
 */
router.post('/upload', authenticateFirebaseToken, (req, res, next) => {
  upload.single('file')(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ error: err.message || 'File upload failed.' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded.' });
    }

    try {
      const { bookingId } = req.body;
      const originalName = req.file.originalname;
      const storedName = req.file.filename;
      const storagePath = req.file.path;
      const mimeType = req.file.mimetype;
      const fileSize = req.file.size;

      const result = await query(
        `INSERT INTO booking_files (booking_id, customer_id, original_name, stored_name, storage_path, mime_type, file_size, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'UPLOADED')`,
        [bookingId || null, req.user.id, originalName, storedName, storagePath, mimeType, fileSize]
      );

      const fileId = result.insertId;

      res.status(201).json({
        success: true,
        file: {
          id: fileId,
          fileId,
          bookingId: bookingId || null,
          originalName,
          storedName,
          mimeType,
          fileSize,
          downloadURL: `/api/storage/files/${fileId}`,
          url: `/api/storage/files/${fileId}`,
          status: 'UPLOADED',
          createdAt: new Date().toISOString()
        }
      });
    } catch (dbErr) {
      // Clean up uploaded file if DB record creation fails
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      next(dbErr);
    }
  });
});

/**
 * GET /api/storage/files/:fileId
 * Secure streaming access for uploaded private files with ownership authorization
 */
router.get('/files/:fileId', authenticateFirebaseToken, async (req, res, next) => {
  try {
    const { fileId } = req.params;
    const fileRecord = await queryOne(
      `SELECT * FROM booking_files WHERE id = ?`,
      [fileId]
    );

    if (!fileRecord) {
      return res.status(404).json({ error: 'File record not found.' });
    }

    // Ownership Authorization Check: Customer must be file owner, or User must be ADMIN / SUPER_ADMIN
    const isOwner = fileRecord.customer_id === req.user.id;
    const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(req.user.role);

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ error: 'Forbidden: Access denied to private file.' });
    }

    if (!fs.existsSync(fileRecord.storage_path)) {
      return res.status(404).json({ error: 'File content missing from server storage.' });
    }

    const isDownload = req.query.download === '1' || req.query.dl === 'true';
    res.setHeader('Content-Type', fileRecord.mime_type || 'application/octet-stream');
    res.setHeader('Content-Disposition', `${isDownload ? 'attachment' : 'inline'}; filename="${encodeURIComponent(fileRecord.original_name)}"`);
    res.setHeader('Content-Length', fileRecord.file_size);

    const stream = fs.createReadStream(fileRecord.storage_path);
    stream.pipe(res);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
