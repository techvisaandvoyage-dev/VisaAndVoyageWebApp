/**
 * Global Express error-handling middleware.
 * Must be mounted LAST (after all routes).
 *
 * Catches Mongoose, JWT, and general errors and always returns JSON.
 */

const logger = require('../utils/logger');

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, _next) => {
  // Default to 500 unless the error or response already has a status code
  let statusCode = res.statusCode && res.statusCode >= 400 ? res.statusCode : 500;
  let message = err.message || 'Internal Server Error';

  // ── Mongoose ValidationError ────────────────────────────
  if (err.name === 'ValidationError') {
    statusCode = 400;
    const fields = Object.values(err.errors || {}).map((e) => e.message);
    message = fields.length ? fields.join('; ') : message;
  }

  // ── Mongoose CastError (bad ObjectId, etc.) ─────────────
  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid ${err.path}: ${err.value}`;
  }

  // ── Mongo duplicate-key error ───────────────────────────
  if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    message = `Duplicate value for "${field}". This ${field} already exists.`;
  }

  // ── JWT errors ──────────────────────────────────────────
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token. Please log in again.';
  }
  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Session expired. Please log in again.';
  }

  // ── Log the full error for debugging ────────────────────
  logger.error(`${req.method} ${req.originalUrl} → ${statusCode}: ${message}`, err);

  // ── Always respond with JSON ────────────────────────────
  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
};

module.exports = errorHandler;
