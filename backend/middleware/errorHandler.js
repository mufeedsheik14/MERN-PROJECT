/**
 * Central error handler middleware.
 * Must be registered LAST in Express middleware chain.
 *
 * Catches all errors passed via next(err) and formats them
 * into a consistent JSON response shape.
 */
const errorHandler = (err, req, res, next) => { // eslint-disable-line no-unused-vars
  // Log the full error in development for debugging
  if (process.env.NODE_ENV !== 'production') {
    console.error(`[ERROR] ${req.method} ${req.originalUrl}`, err);
  }

  let statusCode = err.statusCode || err.status || 500;
  let message = err.message || 'Internal Server Error';

  // ── Mongoose: duplicate key (unique constraint) ───────────
  if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    const value = err.keyValue?.[field];
    message = `${field} '${value}' is already in use`;
  }

  // ── Mongoose: validation error ────────────────────────────
  if (err.name === 'ValidationError') {
    statusCode = 422;
    const messages = Object.values(err.errors).map((e) => e.message);
    message = messages.join('. ');
  }

  // ── Mongoose: bad ObjectId cast ───────────────────────────
  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid value for field '${err.path}': ${err.value}`;
  }

  // ── JWT errors ────────────────────────────────────────────
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
  }

  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token has expired';
  }

  res.status(statusCode).json({
    success: false,
    message,
    // Only include stack trace in development
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
};

module.exports = errorHandler;
