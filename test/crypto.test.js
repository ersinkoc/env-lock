/**
 * Comprehensive test suite for crypto.js
 * Tests all encryption/decryption functionality with edge cases
 */

const { describe, it } = require('node:test');
const assert = require('node:assert');
const crypto = require('../src/crypto.js');

describe('crypto.js - Key Generation', () => {
  it('should generate a 64-character hex key', () => {
    const key = crypto.generateKey();
    assert.strictEqual(key.length, 64);
    assert.match(key, /^[0-9a-f]{64}$/);
  });

  it('should generate unique keys', () => {
    const key1 = crypto.generateKey();
    const key2 = crypto.generateKey();
    assert.notStrictEqual(key1, key2);
  });

  it('should generate cryptographically random keys', () => {
    const keys = new Set();
    for (let i = 0; i < 100; i++) {
      keys.add(crypto.generateKey());
    }
    assert.strictEqual(keys.size, 100);
  });
});

describe('crypto.js - Encryption', () => {
  const validKey = crypto.generateKey();

  it('should encrypt plaintext successfully', () => {
    const plaintext = 'Hello World';
    const encrypted = crypto.encrypt(plaintext, validKey);
    assert.ok(encrypted);
    assert.notStrictEqual(encrypted, plaintext);
  });

  it('should return encrypted data in correct v1 format', () => {
    const plaintext = 'Test data';
    const encrypted = crypto.encrypt(plaintext, validKey);

    // Verify v1 format: v1|timestamp|checksum|IV:TAG:DATA
    assert.ok(encrypted.startsWith('v1|'));

    const metaParts = encrypted.split('|');
    assert.strictEqual(metaParts.length, 4);
    assert.strictEqual(metaParts[0], 'v1');
    assert.match(metaParts[1], /^\d+$/); // timestamp
    assert.match(metaParts[2], /^[0-9a-f]{64}$/); // SHA-256 checksum

    // Verify payload format
    const payload = metaParts[3];
    const parts = payload.split(':');
    assert.strictEqual(parts.length, 3); // IV:TAG:DATA
  });

  it('should generate different IVs for same plaintext', () => {
    const plaintext = 'Same text';
    const encrypted1 = crypto.encrypt(plaintext, validKey);
    const encrypted2 = crypto.encrypt(plaintext, validKey);
    assert.notStrictEqual(encrypted1, encrypted2);
  });

  it('should encrypt empty string', () => {
    const encrypted = crypto.encrypt('', validKey);
    assert.ok(encrypted);
    const parts = encrypted.split(':');
    assert.strictEqual(parts.length, 3);
  });

  it('should encrypt multiline text', () => {
    const plaintext = 'Line 1\nLine 2\nLine 3';
    const encrypted = crypto.encrypt(plaintext, validKey);
    assert.ok(encrypted);
  });

  it('should encrypt special characters', () => {
    const plaintext = '!@#$%^&*(){}[]|\\:";\'<>?,./`~';
    const encrypted = crypto.encrypt(plaintext, validKey);
    assert.ok(encrypted);
  });

  it('should encrypt unicode characters', () => {
    const plaintext = 'こんにちは 世界 🌍 مرحبا العالم';
    const encrypted = crypto.encrypt(plaintext, validKey);
    assert.ok(encrypted);
  });

  it('should encrypt large text', () => {
    const plaintext = 'A'.repeat(10000);
    const encrypted = crypto.encrypt(plaintext, validKey);
    assert.ok(encrypted);
  });

  it('should throw error for invalid key length', () => {
    const plaintext = 'Test';
    const shortKey = '123456';
    assert.throws(
      () => crypto.encrypt(plaintext, shortKey),
      /Key must be 32 bytes/
    );
  });

  it('should throw error for non-hex key', () => {
    const plaintext = 'Test';
    const invalidKey = 'z'.repeat(64);
    assert.throws(
      () => crypto.encrypt(plaintext, invalidKey)
    );
  });

  it('should throw error for null text', () => {
    assert.throws(
      () => crypto.encrypt(null, validKey),
      /Text to encrypt must be a string/
    );
  });

  it('should throw error for undefined text', () => {
    assert.throws(
      () => crypto.encrypt(undefined, validKey),
      /Text to encrypt must be a string/
    );
  });

  it('should throw error for non-string text', () => {
    assert.throws(
      () => crypto.encrypt(123, validKey),
      /Text to encrypt must be a string/
    );
  });

  it('should throw error for null key', () => {
    assert.throws(
      () => crypto.encrypt('test', null),
      /Encryption key must be a non-empty string/
    );
  });

  it('should throw error for undefined key', () => {
    assert.throws(
      () => crypto.encrypt('test', undefined),
      /Encryption key must be a non-empty string/
    );
  });
});

describe('crypto.js - Decryption', () => {
  const validKey = crypto.generateKey();
  const plaintext = 'Test message for decryption';
  const encrypted = crypto.encrypt(plaintext, validKey);

  it('should decrypt encrypted data successfully', () => {
    const decrypted = crypto.decrypt(encrypted, validKey);
    assert.strictEqual(decrypted, plaintext);
  });

  it('should decrypt empty string', () => {
    const emptyEncrypted = crypto.encrypt('', validKey);
    const decrypted = crypto.decrypt(emptyEncrypted, validKey);
    assert.strictEqual(decrypted, '');
  });

  it('should decrypt multiline text', () => {
    const multiline = 'Line 1\nLine 2\nLine 3';
    const encrypted = crypto.encrypt(multiline, validKey);
    const decrypted = crypto.decrypt(encrypted, validKey);
    assert.strictEqual(decrypted, multiline);
  });

  it('should decrypt special characters', () => {
    const special = '!@#$%^&*(){}[]|\\:";\'<>?,./`~';
    const encrypted = crypto.encrypt(special, validKey);
    const decrypted = crypto.decrypt(encrypted, validKey);
    assert.strictEqual(decrypted, special);
  });

  it('should decrypt unicode characters', () => {
    const unicode = 'こんにちは 世界 🌍 مرحبا العالم';
    const encrypted = crypto.encrypt(unicode, validKey);
    const decrypted = crypto.decrypt(encrypted, validKey);
    assert.strictEqual(decrypted, unicode);
  });

  it('should decrypt large text', () => {
    const large = 'A'.repeat(10000);
    const encrypted = crypto.encrypt(large, validKey);
    const decrypted = crypto.decrypt(encrypted, validKey);
    assert.strictEqual(decrypted, large);
  });

  it('should throw error for wrong key', () => {
    const wrongKey = crypto.generateKey();
    assert.throws(
      () => crypto.decrypt(encrypted, wrongKey),
      /Decryption failed: Invalid or corrupted data/
    );
  });

  it('should throw error for tampered data', () => {
    const parts = encrypted.split(':');
    parts[2] = 'ff' + parts[2].substring(2); // Tamper with encrypted data
    const tampered = parts.join(':');
    assert.throws(
      () => crypto.decrypt(tampered, validKey),
      /Decryption failed/
    );
  });

  it('should throw error for tampered auth tag', () => {
    const parts = encrypted.split(':');
    parts[1] = 'ff' + parts[1].substring(2); // Tamper with auth tag
    const tampered = parts.join(':');
    assert.throws(
      () => crypto.decrypt(tampered, validKey),
      /Decryption failed/
    );
  });

  it('should throw error for tampered IV', () => {
    const parts = encrypted.split(':');
    parts[0] = 'ff' + parts[0].substring(2); // Tamper with IV
    const tampered = parts.join(':');
    assert.throws(
      () => crypto.decrypt(tampered, validKey),
      /Decryption failed/
    );
  });

  it('should throw error for invalid format (missing parts)', () => {
    assert.throws(
      () => crypto.decrypt('invalid:format', validKey),
      /Decryption failed: Invalid or corrupted data/
    );
  });

  it('should throw error for invalid format (too many parts)', () => {
    assert.throws(
      () => crypto.decrypt('a:b:c:d:e', validKey),
      /Decryption failed: Invalid or corrupted data/
    );
  });

  it('should throw error for empty cipher text', () => {
    assert.throws(
      () => crypto.decrypt('', validKey),
      /Cipher text must be a non-empty string/
    );
  });

  it('should throw error for null cipher text', () => {
    assert.throws(
      () => crypto.decrypt(null, validKey),
      /Cipher text must be a non-empty string/
    );
  });

  it('should throw error for undefined cipher text', () => {
    assert.throws(
      () => crypto.decrypt(undefined, validKey),
      /Cipher text must be a non-empty string/
    );
  });

  it('should throw error for invalid key length', () => {
    assert.throws(
      () => crypto.decrypt(encrypted, '123'),
      /Key must be 32 bytes/
    );
  });

  it('should throw error for null key', () => {
    assert.throws(
      () => crypto.decrypt(encrypted, null),
      /Decryption key must be a non-empty string/
    );
  });

  it('should throw error for invalid IV length', () => {
    const parts = encrypted.split(':');
    parts[0] = 'ff'; // Invalid IV
    const invalid = parts.join(':');
    assert.throws(
      () => crypto.decrypt(invalid, validKey),
      /Decryption failed: Invalid or corrupted data/
    );
  });

  it('should throw error for invalid auth tag length', () => {
    const parts = encrypted.split(':');
    parts[1] = 'ff'; // Invalid auth tag
    const invalid = parts.join(':');
    assert.throws(
      () => crypto.decrypt(invalid, validKey),
      /Decryption failed/
    );
  });
});

describe('crypto.js - Backward Compatibility', () => {
  const validKey = crypto.generateKey();
  const plaintext = 'Legacy format test';

  it('should decrypt legacy format (without v1 metadata)', () => {
    // Create a legacy format encrypted string by manually constructing it
    const nodeCrypto = require('node:crypto');
    const keyBuffer = Buffer.from(validKey, 'hex');
    const iv = nodeCrypto.randomBytes(12);
    const cipher = nodeCrypto.createCipheriv('aes-256-gcm', keyBuffer, iv);
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag();

    // Legacy format: IV:AUTH_TAG:ENCRYPTED_DATA (no v1| prefix)
    const legacyFormat = `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;

    // Should be able to decrypt legacy format
    const decrypted = crypto.decrypt(legacyFormat, validKey);
    assert.strictEqual(decrypted, plaintext);
  });

  it('should decrypt v1 format (with metadata)', () => {
    // New v1 format with metadata
    const encrypted = crypto.encrypt(plaintext, validKey);

    // Verify it has v1 prefix
    assert.ok(encrypted.startsWith('v1|'));

    // Should be able to decrypt v1 format
    const decrypted = crypto.decrypt(encrypted, validKey);
    assert.strictEqual(decrypted, plaintext);
  });

  it('should maintain backward compatibility for old .env.lock files', () => {
    // Simulate an old .env.lock file content
    const oldContent = 'DATABASE_URL=postgresql://localhost/test\nAPI_KEY=old_key_123';

    // Create legacy format encryption
    const nodeCrypto = require('node:crypto');
    const keyBuffer = Buffer.from(validKey, 'hex');
    const iv = nodeCrypto.randomBytes(12);
    const cipher = nodeCrypto.createCipheriv('aes-256-gcm', keyBuffer, iv);
    let encrypted = cipher.update(oldContent, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag();
    const legacyEncrypted = `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;

    // Should decrypt successfully
    const decrypted = crypto.decrypt(legacyEncrypted, validKey);
    assert.strictEqual(decrypted, oldContent);
  });

  it('should reject corrupted v1 format (invalid checksum)', () => {
    const encrypted = crypto.encrypt(plaintext, validKey);

    // Tamper with checksum (second field in v1|timestamp|checksum|payload)
    const parts = encrypted.split('|');
    parts[2] = 'aaaa' + parts[2].substring(4); // Corrupt checksum
    const corrupted = parts.join('|');

    assert.throws(
      () => crypto.decrypt(corrupted, validKey),
      /Decryption failed: Invalid or corrupted data/
    );
  });
});

describe('crypto.js - Encrypt/Decrypt Round Trip', () => {
  it('should maintain data integrity through multiple encrypt/decrypt cycles', () => {
    const key = crypto.generateKey();
    const original = 'Test data for round trip';

    let current = original;
    for (let i = 0; i < 10; i++) {
      const encrypted = crypto.encrypt(current, key);
      current = crypto.decrypt(encrypted, key);
    }

    assert.strictEqual(current, original);
  });

  it('should work with different keys for same plaintext', () => {
    const plaintext = 'Same plaintext';
    const key1 = crypto.generateKey();
    const key2 = crypto.generateKey();

    const encrypted1 = crypto.encrypt(plaintext, key1);
    const encrypted2 = crypto.encrypt(plaintext, key2);

    assert.notStrictEqual(encrypted1, encrypted2);
    assert.strictEqual(crypto.decrypt(encrypted1, key1), plaintext);
    assert.strictEqual(crypto.decrypt(encrypted2, key2), plaintext);
  });
});

describe('crypto.js - Input Size Validation', () => {
  const validKey = crypto.generateKey();

  it('should reject encryption input larger than 10MB', () => {
    // Create a string larger than 10MB (10 * 1024 * 1024 bytes)
    const largeInput = 'a'.repeat(10 * 1024 * 1024 + 1);
    assert.throws(
      () => crypto.encrypt(largeInput, validKey),
      /Input too large/
    );
  });

  it('should successfully encrypt input exactly at 10MB limit', () => {
    // Create a string exactly 10MB
    const maxInput = 'a'.repeat(10 * 1024 * 1024);
    const encrypted = crypto.encrypt(maxInput, validKey);
    assert.ok(encrypted);
    assert.strictEqual(typeof encrypted, 'string');
  });

  it('should successfully encrypt small input', () => {
    const smallInput = 'small text';
    const encrypted = crypto.encrypt(smallInput, validKey);
    assert.ok(encrypted);
    const decrypted = crypto.decrypt(encrypted, validKey);
    assert.strictEqual(decrypted, smallInput);
  });
});

describe('crypto.js - Constants', () => {
  it('should export correct algorithm', () => {
    assert.strictEqual(crypto.ALGORITHM, 'aes-256-gcm');
  });

  it('should export correct key length', () => {
    assert.strictEqual(crypto.KEY_LENGTH, 32);
  });

  it('should export correct IV length', () => {
    assert.strictEqual(crypto.IV_LENGTH, 12);
  });

  it('should export correct auth tag length', () => {
    assert.strictEqual(crypto.AUTH_TAG_LENGTH, 16);
  });
});
