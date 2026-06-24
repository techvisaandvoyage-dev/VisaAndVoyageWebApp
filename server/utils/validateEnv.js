/**
 * Validate required and recommended environment variables at startup.
 * Exits the process with a clear message when critical variables are missing.
 */

const logger = require('./logger');

const REQUIRED = ['MONGO_URI', 'JWT_SECRET'];
const RECOMMENDED = ['EMAIL_USER', 'EMAIL_PASS'];

/**
 * @returns {{ valid: boolean, missing: string[] }}
 */
const validateEnv = () => {
  logger.startup('Validating environment variables…');

  const missing = [];
  const warnings = [];

  for (const key of REQUIRED) {
    const value = (process.env[key] || '').trim();
    if (!value) {
      missing.push(key);
      logger.error(`Missing required env variable: ${key}`);
    } else {
      logger.startup(logger.maskSecret(key, value));
    }
  }

  for (const key of RECOMMENDED) {
    const value = (process.env[key] || '').trim();
    if (!value) {
      warnings.push(key);
      logger.warn(`Recommended env variable not set: ${key} — some features may not work.`);
    }
  }

  // Log the environment name
  logger.startup(`Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.startup(`Port: ${process.env.PORT || '5000 (default)'}`);

  if (missing.length) {
    logger.error(
      `Cannot start: ${missing.length} required env variable(s) missing: ${missing.join(', ')}. ` +
      'Please configure them in your Hostinger Node.js Dashboard Environment Variables.'
    );
    return { valid: false, missing };
  }

  if (warnings.length) {
    logger.warn(`${warnings.length} recommended env variable(s) not set: ${warnings.join(', ')}`);
  }

  logger.startup('Environment validation passed ✓');
  return { valid: true, missing: [] };
};

module.exports = validateEnv;
