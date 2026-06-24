/**
 * Lightweight structured logger for production.
 * Outputs timestamped, prefixed messages that are easy to grep in Hostinger logs.
 * No external dependencies — wraps console internally.
 */

const isProd = () => (process.env.NODE_ENV || 'development') === 'production';

const ts = () => new Date().toISOString();

const fmt = (level, msg) => `[${level}] [${ts()}] ${msg}`;

const logger = {
  info(msg) {
    console.log(fmt('INFO', msg));
  },

  warn(msg) {
    console.warn(fmt('WARN', msg));
  },

  error(msg, err) {
    console.error(fmt('ERROR', msg));
    if (err?.stack) console.error(err.stack);
    else if (err) console.error(err);
  },

  startup(msg) {
    console.log(fmt('STARTUP', msg));
  },

  db(msg) {
    console.log(fmt('DB', msg));
  },

  request(method, url, statusCode, durationMs) {
    console.log(fmt('REQUEST', `${method} ${url} → ${statusCode} (${durationMs}ms)`));
  },

  /** Log a value with the secret masked (shows first 4 chars + ****). */
  maskSecret(label, value) {
    const s = String(value || '').trim();
    if (!s) return `${label}: (empty)`;
    if (s.length <= 4) return `${label}: ****`;
    return `${label}: ${s.slice(0, 4)}${'*'.repeat(Math.min(s.length - 4, 12))}`;
  },
};

module.exports = logger;
