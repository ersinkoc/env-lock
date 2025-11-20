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

// Constants
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 12 bytes (96 bits) for GCM mode
const KEY_LENGTH = 32; // 32 bytes (256 bits) for AES-256
const AUTH_TAG_LENGTH = 16; // 16 bytes (128 bits) for GCM auth tag

/**
 * Generates a cryptographically secure random encryption key
 * @returns {string} A 32-byte key encoded as hexadecimal string (64 characters)
 */
function generateKey() {
  return crypto.randomBytes(KEY_LENGTH).toString('hex');
}

/**
 * Encrypts plaintext using AES-256-GCM
 *
 * @param {string} text - The plaintext to encrypt
 * @param {string} keyHex - The 32-byte encryption key as hex string (64 characters)
 * @returns {string} Encrypted data in format: IV_HEX:AUTH_TAG_HEX:ENCRYPTED_DATA_HEX
 * @throws {Error} If key length is invalid or encryption fails
 */
function encrypt(text, keyHex) {
  // Validate input
  if (!text || typeof text !== 'string') {
    throw new Error('Text to encrypt must be a non-empty string');
  }

  if (!keyHex || typeof keyHex !== 'string') {
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

    // Return format: IV:AUTH_TAG:ENCRYPTED_DATA (all in hex)
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  } catch (error) {
    throw new Error(`Encryption failed: ${error.message}`);
  }
}

/**
 * Decrypts ciphertext using AES-256-GCM
 *
 * @param {string} cipherText - Encrypted data in format: IV_HEX:AUTH_TAG_HEX:ENCRYPTED_DATA_HEX
 * @param {string} keyHex - The 32-byte decryption key as hex string (64 characters)
 * @returns {string} The decrypted plaintext
 * @throws {Error} If decryption fails (wrong key, tampered data, or invalid format)
 */
function decrypt(cipherText, keyHex) {
  // Validate input
  if (!cipherText || typeof cipherText !== 'string') {
    throw new Error('Cipher text must be a non-empty string');
  }

  if (!keyHex || typeof keyHex !== 'string') {
    throw new Error('Decryption key must be a non-empty string');
  }

  // Convert hex key to buffer
  const keyBuffer = Buffer.from(keyHex, 'hex');

  if (keyBuffer.length !== KEY_LENGTH) {
    throw new Error(`Key must be ${KEY_LENGTH} bytes (${KEY_LENGTH * 2} hex characters), got ${keyBuffer.length} bytes`);
  }

  try {
    // Parse the cipher text format: IV:AUTH_TAG:ENCRYPTED_DATA
    const parts = cipherText.split(':');

    if (parts.length !== 3) {
      throw new Error('Invalid cipher text format. Expected format: IV_HEX:AUTH_TAG_HEX:ENCRYPTED_DATA_HEX');
    }

    const [ivHex, authTagHex, encryptedDataHex] = parts;

    // Convert hex strings to buffers
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const encryptedData = Buffer.from(encryptedDataHex, 'hex');

    // Validate lengths
    if (iv.length !== IV_LENGTH) {
      throw new Error(`Invalid IV length: expected ${IV_LENGTH} bytes, got ${iv.length} bytes`);
    }

    if (authTag.length !== AUTH_TAG_LENGTH) {
      throw new Error(`Invalid auth tag length: expected ${AUTH_TAG_LENGTH} bytes, got ${authTag.length} bytes`);
    }

    // Create decipher
    const decipher = crypto.createDecipheriv(ALGORITHM, keyBuffer, iv);

    // Set authentication tag (MUST be called before update())
    decipher.setAuthTag(authTag);

    // Decrypt the data
    let decrypted = decipher.update(encryptedData, undefined, 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    // Provide more user-friendly error messages
    if (error.message.includes('Unsupported state') ||
        error.message.includes('auth') ||
        error.message.includes('tag')) {
      throw new Error('Decryption failed: Invalid key or tampered data detected');
    }
    throw new Error(`Decryption failed: ${error.message}`);
  }
}

module.exports = {
  generateKey,
  encrypt,
  decrypt,
  // Export constants for testing/documentation purposes
  ALGORITHM,
  KEY_LENGTH,
  IV_LENGTH,
  AUTH_TAG_LENGTH
};
