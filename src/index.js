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

// Dangerous environment variable keys that should never be set from .env files
const DANGEROUS_KEYS = new Set([
  '__proto__',
  'constructor',
  'prototype',
  'NODE_OPTIONS',
  'NODE_PATH',
  'NODE_DEBUG',
  'NODE_REPL_HISTORY'
]);

/**
 * Validates environment variable key name
 * @param {string} key - Key to validate
 * @returns {boolean} True if key is valid
 */
function isValidEnvKey(key) {
  // Check if key is dangerous
  if (DANGEROUS_KEYS.has(key)) {
    return false;
  }

  // Validate key format: must start with letter or underscore,
  // followed by letters, numbers, or underscores
  const validKeyPattern = /^[A-Za-z_][A-Za-z0-9_]*$/;
  return validKeyPattern.test(key);
}

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

  try {
    // Read encrypted file (no TOCTOU check - atomic operation)
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
    let skippedCount = 0;
    for (const [key, value] of Object.entries(parsed)) {
      // Validate key name for security
      if (!isValidEnvKey(key)) {
        if (!silent) {
          console.warn(`[env-lock] Warning: Skipping invalid or dangerous key: ${key}`);
        }
        skippedCount++;
        continue;
      }

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
    // Handle file not found error specifically
    if (error.code === 'ENOENT') {
      if (!silent) {
        console.warn(
          `[env-lock] Warning: .env.lock file not found at ${envLockPath}. ` +
          'Skipping decryption.'
        );
      }
      return {};
    }

    if (!silent) {
      console.error(`[env-lock] Error: ${error.message}`);
    }
    return {};
  }
}

/**
 * Async version of config() - loads and decrypts .env.lock file asynchronously
 *
 * @param {ConfigOptions} [options={}] - Configuration options
 * @returns {Promise<Object>} Promise resolving to object containing parsed environment variables
 */
async function configAsync(options = {}) {
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

  try {
    // Read encrypted file asynchronously (no TOCTOU check - atomic operation)
    const encryptedContent = (await fs.promises.readFile(envLockPath, encoding)).trim();

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
    let skippedCount = 0;
    for (const [key, value] of Object.entries(parsed)) {
      // Validate key name for security
      if (!isValidEnvKey(key)) {
        if (!silent) {
          console.warn(`[env-lock] Warning: Skipping invalid or dangerous key: ${key}`);
        }
        skippedCount++;
        continue;
      }

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
    // Handle file not found error specifically
    if (error.code === 'ENOENT') {
      if (!silent) {
        console.warn(
          `[env-lock] Warning: .env.lock file not found at ${envLockPath}. ` +
          'Skipping decryption.'
        );
      }
      return {};
    }

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

/**
 * Async version of load()
 * Alias for configAsync()
 */
function loadAsync(options) {
  return configAsync(options);
}

module.exports = {
  config,
  configAsync,
  load,
  loadAsync,
  // Export internal modules for advanced usage
  encrypt: require('./crypto').encrypt,
  decrypt: require('./crypto').decrypt,
  generateKey: require('./crypto').generateKey,
  parse: require('./parser').parse,
  stringify: require('./parser').stringify
};
