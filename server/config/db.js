const mongoose = require('mongoose');
const logger = require('../utils/logger');

// ── Configuration ─────────────────────────────────────────────────────────────
const MAX_RETRIES = 5;
const INITIAL_DELAY_MS = 2000; // 2 s → 4 s → 8 s → 16 s → 32 s

// ── Mongoose Connection Event Listeners ───────────────────────────────────────
let listenersAttached = false;

const attachListeners = () => {
  if (listenersAttached) return;
  listenersAttached = true;

  mongoose.connection.on('connected', () => {
    logger.db(`MongoDB connected: ${mongoose.connection.host || 'unknown host'}`);
  });

  mongoose.connection.on('disconnected', () => {
    logger.db('MongoDB disconnected. Mongoose will attempt to reconnect automatically.');
  });

  mongoose.connection.on('reconnected', () => {
    logger.db('MongoDB reconnected ✓');
  });

  mongoose.connection.on('error', (err) => {
    logger.error('MongoDB connection error', err);
  });
};

// ── Connect with Retry ────────────────────────────────────────────────────────

/**
 * Connects to MongoDB with exponential-backoff retry.
 * Resolves when connected, rejects only after all retries are exhausted.
 */
const connectDB = async () => {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    logger.error('CRITICAL: MONGO_URI is missing from environment variables!');
    logger.error('Configure MONGO_URI in your Hostinger Node.js Dashboard Environment Variables.');
    process.exit(1);
  }

  attachListeners();

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      logger.db(`Connection attempt ${attempt}/${MAX_RETRIES}…`);
      await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 10000, // 10 s (fail fast on shared hosting)
        socketTimeoutMS: 45000,          // 45 s
      });
      logger.db('MongoDB connection established ✓');
      return; // success
    } catch (err) {
      logger.error(`MongoDB connection attempt ${attempt}/${MAX_RETRIES} failed: ${err.message}`);

      if (attempt === MAX_RETRIES) {
        logger.error('All MongoDB connection attempts exhausted. Exiting.');
        process.exit(1);
      }

      const delay = INITIAL_DELAY_MS * Math.pow(2, attempt - 1);
      logger.db(`Retrying in ${delay / 1000}s…`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
};

// ── Helper: current DB status string ──────────────────────────────────────────
const DB_STATES = ['disconnected', 'connected', 'connecting', 'disconnecting'];

const getDbStatus = () => {
  const state = mongoose.connection.readyState;
  return DB_STATES[state] || 'unknown';
};

module.exports = connectDB;
module.exports.getDbStatus = getDbStatus;