/**
 * @oxog/env-lock - Cryptography Module
 *
 * Provides AES-256-GCM encryption and decryption functionality
 * for securing environment variable files.
 *
 * @author Ersin Koc
 * @license MIT
 */

const crypto = require('node:crypto');

/**
 * Forces V8 to retain buffer in memory after zeroing
 * Prevents dead store elimination optimization
 * BUG-004 fix: Improved to access multiple points in buffer
 * @param {Buffer} buffer - Buffer to verify
 */
function volatileRead(buffer) {
  // Volatile read to prevent optimization
  // This forces V8 to keep the buffer and not optimize away the fill(0)
  if (buffer && buffer.length > 0) {
    // Access multiple points in the buffer to ensure entire buffer is retained
    // Use XOR to combine values without branching (prevents optimization)
    let volatileAccumulator = 0;

    // Sample at start, middle, and end
    volatileAccumulator ^= buffer[0];
    if (buffer.length > 1) {
      volatileAccumulator ^= buffer[Math.floor(buffer.length / 2)];
      volatileAccumulator ^= buffer[buffer.length - 1];
    }

    // Use the accumulator in a way that appears meaningful to the optimizer
    // but actually does nothing (XOR with itself always equals 0)
    if (volatileAccumulator !== (volatileAccumulator ^ volatileAccumulator)) {
      // This branch never executes, but prevents dead code elimination
      throw new Error('Volatile read validation failed');
    }
  }
}

// Constants
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 12 bytes (96 bits) for GCM mode
const KEY_LENGTH = 32; // 32 bytes (256 bits) for AES-256
const AUTH_TAG_LENGTH = 16; // 16 bytes (128 bits) for GCM auth tag
const MAX_INPUT_SIZE = 10 * 1024 * 1024; // 10MB max input size for DoS prevention

// Rate limiting for decryption attempts
const RATE_LIMIT_WINDOW = 60000; // 1 minute window
const MAX_FAILED_ATTEMPTS = 10; // Max failed attempts per window
const failedAttempts = new Map(); // Track failed attempts by key hash

// Cleanup interval for failed attempts (prevents memory leak)
const CLEANUP_INTERVAL = 300000; // 5 minutes
let lastCleanup = Date.now();

/**
 * Validates that a value is a valid non-empty string
 * @param {*} value - Value to validate
 * @param {boolean} allowEmpty - Whether to allow empty strings (default: false)
 * @returns {boolean} True if valid string
 */
function isValidString(value, allowEmpty = false) {
  if (value === null || value === undefined || typeof value !== 'string') {
    return false;
  }
  if (!allowEmpty && value.length === 0) {
    return false;
  }
  return true;
}

/**
 * Clears rate limit tracking for a key
 * @param {string} keyHash - Hash of the key
 */
function clearRateLimit(keyHash) {
  failedAttempts.delete(keyHash);
}

/**
 * Cleans up old entries from failedAttempts Map to prevent memory leak
 * Removes entries older than RATE_LIMIT_WINDOW
 */
function cleanupFailedAttempts() {
  const now = Date.now();
  const cutoff = now - RATE_LIMIT_WINDOW;

  // Iterate and remove old entries
  for (const [keyHash, attempts] of failedAttempts.entries()) {
    if (attempts.firstAttempt < cutoff) {
      failedAttempts.delete(keyHash);
    }
  }

  lastCleanup = now;
}

/**
 * Checks if decryption should be rate limited
 * @param {string} keyHex - The encryption key
 * @returns {boolean} True if rate limited
 */
function isRateLimited(keyHex) {
  // Periodic cleanup to prevent memory leak (BUG-001 fix)
  const now = Date.now();
  if (now - lastCleanup > CLEANUP_INTERVAL) {
    cleanupFailedAttempts();
  }

  // Hash the key to track attempts without storing actual key
  const keyHash = crypto.createHash('sha256').update(keyHex).digest('hex');
  const attempts = failedAttempts.get(keyHash) || { count: 0, firstAttempt: now };

  // Reset if outside window
  if (now - attempts.firstAttempt > RATE_LIMIT_WINDOW) {
    failedAttempts.set(keyHash, { count: 0, firstAttempt: now });
    return false;
  }

  // Check if rate limited
  if (attempts.count >= MAX_FAILED_ATTEMPTS) {
    return true;
  }

  return false;
}

/**
 * Records a failed decryption attempt
 * @param {string} keyHex - The encryption key
 */
function recordFailedAttempt(keyHex) {
  const keyHash = crypto.createHash('sha256').update(keyHex).digest('hex');
  const now = Date.now();
  const attempts = failedAttempts.get(keyHash) || { count: 0, firstAttempt: now };

  // Reset if outside window
  if (now - attempts.firstAttempt > RATE_LIMIT_WINDOW) {
    failedAttempts.set(keyHash, { count: 1, firstAttempt: now });
  } else {
    attempts.count++;
    failedAttempts.set(keyHash, attempts);
  }
}

/**
 * Generates a cryptographically secure random encryption key
 * @returns {string} A 32-byte key encoded as hexadecimal string (64 characters)
 */
function generateKey() {
  return crypto.randomBytes(KEY_LENGTH).toString('hex');
}

/**
 * Encrypts plaintext using AES-256-GCM with integrity verification
 *
 * @param {string} text - The plaintext to encrypt
 * @param {string} keyHex - The 32-byte encryption key as hex string (64 characters)
 * @returns {string} Encrypted data in format: v1|timestamp|checksum|IV:TAG:DATA
 * @throws {Error} If key length is invalid or encryption fails
 */
function encrypt(text, keyHex) {
  // Validate input - allow empty strings for text
  if (!isValidString(text, true)) {
    throw new Error('Text to encrypt must be a string');
  }

  // Validate input size to prevent DoS
  const textSize = Buffer.byteLength(text, 'utf8');
  if (textSize > MAX_INPUT_SIZE) {
    throw new Error(`Input too large: maximum size is ${MAX_INPUT_SIZE} bytes (${(MAX_INPUT_SIZE / 1024 / 1024).toFixed(1)}MB), got ${textSize} bytes`);
  }

  if (!isValidString(keyHex)) {
    throw new Error('Encryption key must be a non-empty string');
  }

  // Convert hex key to buffer
  const keyBuffer = Buffer.from(keyHex, 'hex');

  if (keyBuffer.length !== KEY_LENGTH) {
    throw new Error(`Key must be ${KEY_LENGTH} bytes (${KEY_LENGTH * 2} hex characters), got ${keyBuffer.length} bytes`);
  }

  try {
    // Generate random IV for this encryption operation
    const iv = crypto.randomBytes(IV_LENGTH);

    // Create cipher
    const cipher = crypto.createCipheriv(ALGORITHM, keyBuffer, iv);

    // Encrypt the text
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    // Get authentication tag (MUST be called after final())
    const authTag = cipher.getAuthTag();

    // Create encrypted payload: IV:AUTH_TAG:ENCRYPTED_DATA (all in hex)
    const encryptedPayload = `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;

    // Add integrity metadata (v1 format with timestamp and checksum)
    const timestamp = Date.now();
    const checksum = crypto.createHash('sha256').update(encryptedPayload).digest('hex');
    const result = `v1|${timestamp}|${checksum}|${encryptedPayload}`;

    // Clear sensitive data from memory
    keyBuffer.fill(0);
    volatileRead(keyBuffer);  // Prevent optimization
    iv.fill(0);
    volatileRead(iv);  // Prevent optimization
    authTag.fill(0);
    volatileRead(authTag);  // Prevent optimization

    return result;
  } catch (error) {
    // Clear sensitive data even on error
    keyBuffer.fill(0);
    volatileRead(keyBuffer);  // Prevent optimization
    throw new Error(`Encryption failed: ${error.message}`);
  }
}

/**
 * Decrypts ciphertext using AES-256-GCM with integrity verification
 * Supports both v1 format (with metadata) and legacy format (backward compatible)
 *
 * @param {string} cipherText - Encrypted data in format v1|timestamp|checksum|IV:TAG:DATA or IV:TAG:DATA
 * @param {string} keyHex - The 32-byte decryption key as hex string (64 characters)
 * @returns {string} The decrypted plaintext
 * @throws {Error} If decryption fails (wrong key, tampered data, or invalid format)
 */
function decrypt(cipherText, keyHex) {
  // Validate input - cipher text cannot be empty
  if (!isValidString(cipherText)) {
    throw new Error('Cipher text must be a non-empty string');
  }

  // Validate input size to prevent DoS
  const cipherSize = Buffer.byteLength(cipherText, 'utf8');
  if (cipherSize > MAX_INPUT_SIZE * 2) { // Encrypted data is larger due to hex encoding
    throw new Error(`Input too large: maximum size is ${MAX_INPUT_SIZE * 2} bytes, got ${cipherSize} bytes`);
  }

  if (!isValidString(keyHex)) {
    throw new Error('Decryption key must be a non-empty string');
  }

  // Check rate limiting
  if (isRateLimited(keyHex)) {
    throw new Error('Too many failed decryption attempts. Please wait before trying again.');
  }

  // Convert hex key to buffer
  const keyBuffer = Buffer.from(keyHex, 'hex');

  if (keyBuffer.length !== KEY_LENGTH) {
    throw new Error(`Key must be ${KEY_LENGTH} bytes (${KEY_LENGTH * 2} hex characters), got ${keyBuffer.length} bytes`);
  }

  // Declare variables outside try block for proper cleanup in catch
  let iv, authTag, encryptedData;
  let encryptedPayload;

  try {
    // Detect format: v1 (with metadata) or legacy (backward compatible)
    if (cipherText.startsWith('v1|')) {
      // Parse v1 format: v1|timestamp|checksum|IV:TAG:DATA
      const metaParts = cipherText.split('|');
      if (metaParts.length !== 4) {
        throw new Error('Decryption failed: Invalid or corrupted data');
      }

      const [version, timestamp, expectedChecksum, payload] = metaParts;

      // Verify integrity checksum
      const actualChecksum = crypto.createHash('sha256').update(payload).digest('hex');
      if (actualChecksum !== expectedChecksum) {
        throw new Error('Decryption failed: Invalid or corrupted data');
      }

      encryptedPayload = payload;
      // Note: Timestamp can be used for rollback detection in application layer
    } else {
      // Legacy format: IV:TAG:DATA (backward compatible)
      encryptedPayload = cipherText;
    }

    // Parse the encrypted payload format: IV:AUTH_TAG:ENCRYPTED_DATA
    const parts = encryptedPayload.split(':');

    if (parts.length !== 3) {
      throw new Error('Decryption failed: Invalid or corrupted data');
    }

    const [ivHex, authTagHex, encryptedDataHex] = parts;

    // Convert hex strings to buffers
    iv = Buffer.from(ivHex, 'hex');
    authTag = Buffer.from(authTagHex, 'hex');
    encryptedData = Buffer.from(encryptedDataHex, 'hex');

    // Validate lengths - use constant-time comparison where possible
    if (iv.length !== IV_LENGTH) {
      throw new Error('Decryption failed: Invalid or corrupted data');
    }

    if (authTag.length !== AUTH_TAG_LENGTH) {
      throw new Error('Decryption failed: Invalid or corrupted data');
    }

    // Create decipher
    const decipher = crypto.createDecipheriv(ALGORITHM, keyBuffer, iv);

    // Set authentication tag (MUST be called before update())
    decipher.setAuthTag(authTag);

    // Decrypt the data
    let decrypted = decipher.update(encryptedData, undefined, 'utf8');
    decrypted += decipher.final('utf8');

    // Clear sensitive data from memory
    keyBuffer.fill(0);
    volatileRead(keyBuffer);  // Prevent optimization
    iv.fill(0);
    volatileRead(iv);  // Prevent optimization
    authTag.fill(0);
    volatileRead(authTag);  // Prevent optimization
    encryptedData.fill(0);
    volatileRead(encryptedData);  // Prevent optimization

    return decrypted;
  } catch (error) {
    // Clear sensitive data even on error
    if (keyBuffer) {
      keyBuffer.fill(0);
      volatileRead(keyBuffer);  // Prevent optimization
    }
    if (iv) {
      iv.fill(0);
      volatileRead(iv);  // Prevent optimization
    }
    if (authTag) {
      authTag.fill(0);
      volatileRead(authTag);  // Prevent optimization
    }
    if (encryptedData) {
      encryptedData.fill(0);
      volatileRead(encryptedData);  // Prevent optimization
    }

    // Record failed attempt for rate limiting
    recordFailedAttempt(keyHex);

    // Always return the same generic error message to prevent timing attacks
    // Do not leak information about what went wrong
    throw new Error('Decryption failed: Invalid or corrupted data');
  }
}

module.exports = {
  generateKey,
  encrypt,
  decrypt,
  clearRateLimit,
  // Export constants for testing/documentation purposes
  ALGORITHM,
  KEY_LENGTH,
  IV_LENGTH,
  AUTH_TAG_LENGTH,
  MAX_INPUT_SIZE,
  RATE_LIMIT_WINDOW,
  MAX_FAILED_ATTEMPTS
};
