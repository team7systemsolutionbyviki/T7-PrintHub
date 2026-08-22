/* ==========================================================================
   T7 PRINT HUB — UNIFIED ERROR HANDLER MIDDLEWARE
   ========================================================================== */

function errorHandler(err, req, res, next) {
  console.error('[API Error]:', err.stack || err.message || err);

  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Payload too large. Maximum size exceeded.' });
  }

  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || 'Internal Server Error';

  res.status(statusCode).json({
    error: message,
    ...(process.env.NODE_ENV === 'development' ? { stack: err.stack } : {})
  });
}

module.exports = errorHandler;
