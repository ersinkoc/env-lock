/**
 * @oxog/env-lock - Runtime Entry Point
 *
 * Provides the config() method to load and decrypt .env.lock files
 * at runtime, injecting environment variables into process.env
 *
 * @author Ersin Koc
 * @license MIT
 */

const fs = require('node:fs');
const path = require('node:path');
const { decrypt } = require('./crypto');
const { parse } = require('./parser');

/**
 * Configuration options for the config() method
 * @typedef {Object} ConfigOptions
 * @property {string} [path] - Path to .env.lock file (default: .env.lock in current directory)
 * @property {string} [encoding] - File encoding (default: utf8)
 * @property {boolean} [override] - Whether to override existing env variables (default: false)
 * @property {boolean} [silent] - Suppress warnings and errors (default: false)
 */

/**
 * Loads and decrypts .env.lock file, injecting variables into process.env
 *
 * Behavior:
 * 1. Checks if OXOG_ENV_KEY environment variable exists
 * 2. If missing, returns early (silent mode by default)
 * 3. Reads .env.lock file
 * 4. Decrypts content using OXOG_ENV_KEY
 * 5. Parses decrypted content
 * 6. Injects variables into process.env (doesn't override by default)
 *
 * @param {ConfigOptions} [options={}] - Configuration options
 * @returns {Object} Object containing parsed environment variables (empty if failed)
 */
function config(options = {}) {
  // Default options
  const {
    path: envLockPath = path.resolve(process.cwd(), '.env.lock'),
    encoding = 'utf8',
    override = false,
    silent = false
  } = options;

  // Check if encryption key is available
  const encryptionKey = process.env.OXOG_ENV_KEY;

  if (!encryptionKey) {
    if (!silent) {
      console.warn(
        '[env-lock] Warning: OXOG_ENV_KEY environment variable is not set. ' +
        'Skipping .env.lock decryption.'
      );
    }
    return {};
  }

  // Check if .env.lock file exists
  if (!fs.existsSync(envLockPath)) {
    if (!silent) {
      console.warn(
        `[env-lock] Warning: .env.lock file not found at ${envLockPath}. ` +
        'Skipping decryption.'
      );
    }
    return {};
  }

  try {
    // Read encrypted file
    const encryptedContent = fs.readFileSync(envLockPath, encoding).trim();

    if (!encryptedContent) {
      if (!silent) {
        console.warn('[env-lock] Warning: .env.lock file is empty.');
      }
      return {};
    }

    // Decrypt content
    let decryptedContent;
    try {
      decryptedContent = decrypt(encryptedContent, encryptionKey);
    } catch (error) {
      if (!silent) {
        console.error(
          '[env-lock] Error: Failed to decrypt .env.lock. ' +
          'Please verify that OXOG_ENV_KEY is correct.'
        );
        console.error(`[env-lock] Details: ${error.message}`);
      }
      return {};
    }

    // Parse decrypted content
    const parsed = parse(decryptedContent);

    // Inject variables into process.env
    let injectedCount = 0;
    for (const [key, value] of Object.entries(parsed)) {
      // Skip if key already exists and override is false
      if (!override && Object.prototype.hasOwnProperty.call(process.env, key)) {
        continue;
      }

      process.env[key] = value;
      injectedCount++;
    }

    if (!silent) {
      console.log(
        `[env-lock] Successfully loaded ${injectedCount} environment variable(s) from .env.lock`
      );
    }

    return parsed;
  } catch (error) {
    if (!silent) {
      console.error(`[env-lock] Error: ${error.message}`);
    }
    return {};
  }
}

/**
 * Legacy dotenv-compatible method
 * Alias for config()
 */
function load(options) {
  return config(options);
}

module.exports = {
  config,
  load,
  // Export internal modules for advanced usage
  encrypt: require('./crypto').encrypt,
  decrypt: require('./crypto').decrypt,
  generateKey: require('./crypto').generateKey,
  parse: require('./parser').parse,
  stringify: require('./parser').stringify
};
