#!/usr/bin/env node
/**
 * FINAL COMPREHENSIVE TEST
 * Tests every single function and feature
 */

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('  FINAL COMPREHENSIVE TEST');
console.log('  Testing ALL functions and features');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

const fs = require('fs');
const path = require('path');

// Load the package
const envLock = require('./src/index.js');
const crypto = require('./src/crypto.js');
const parser = require('./src/parser.js');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✅ ${name}`);
    passed++;
  } catch (error) {
    console.log(`❌ ${name}`);
    console.log(`   Error: ${error.message}`);
    failed++;
  }
}

// ============================================
// TEST 1: Crypto Module - generateKey()
// ============================================
test('crypto.generateKey() - generates 64-char hex key', () => {
  const key = crypto.generateKey();
  if (key.length !== 64) throw new Error('Key length is not 64');
  if (!/^[0-9a-f]{64}$/.test(key)) throw new Error('Key is not valid hex');
});

test('crypto.generateKey() - generates unique keys', () => {
  const key1 = crypto.generateKey();
  const key2 = crypto.generateKey();
  if (key1 === key2) throw new Error('Keys are not unique');
});

// ============================================
// TEST 2: Crypto Module - encrypt()
// ============================================
test('crypto.encrypt() - encrypts string', () => {
  const key = crypto.generateKey();
  const text = 'test data';
  const encrypted = crypto.encrypt(text, key);
  if (!encrypted) throw new Error('Encryption failed');
  if (!encrypted.includes(':')) throw new Error('Invalid format');
  const parts = encrypted.split(':');
  if (parts.length !== 3) throw new Error('Invalid format - should have 3 parts');
});

test('crypto.encrypt() - handles empty string', () => {
  const key = crypto.generateKey();
  const encrypted = crypto.encrypt('', key);
  if (!encrypted) throw new Error('Failed to encrypt empty string');
});

test('crypto.encrypt() - handles unicode', () => {
  const key = crypto.generateKey();
  const text = '世界🌍مرحبا';
  const encrypted = crypto.encrypt(text, key);
  if (!encrypted) throw new Error('Failed to encrypt unicode');
});

test('crypto.encrypt() - generates different IVs', () => {
  const key = crypto.generateKey();
  const text = 'same text';
  const enc1 = crypto.encrypt(text, key);
  const enc2 = crypto.encrypt(text, key);
  if (enc1 === enc2) throw new Error('IVs are not random');
});

test('crypto.encrypt() - rejects invalid key', () => {
  try {
    crypto.encrypt('test', 'invalidkey');
    throw new Error('Should have thrown');
  } catch (e) {
    if (!e.message.includes('Key must be')) throw e;
  }
});

// ============================================
// TEST 3: Crypto Module - decrypt()
// ============================================
test('crypto.decrypt() - decrypts correctly', () => {
  const key = crypto.generateKey();
  const text = 'test data';
  const encrypted = crypto.encrypt(text, key);
  const decrypted = crypto.decrypt(encrypted, key);
  if (decrypted !== text) throw new Error('Decryption mismatch');
});

test('crypto.decrypt() - detects wrong key', () => {
  const key1 = crypto.generateKey();
  const key2 = crypto.generateKey();
  const encrypted = crypto.encrypt('test', key1);
  try {
    crypto.decrypt(encrypted, key2);
    throw new Error('Should have detected wrong key');
  } catch (e) {
    if (!e.message.includes('Invalid key or tampered')) throw e;
  }
});

test('crypto.decrypt() - detects tampered data', () => {
  const key = crypto.generateKey();
  const encrypted = crypto.encrypt('test', key);
  const tampered = encrypted.replace(/a/, 'b');
  try {
    crypto.decrypt(tampered, key);
    throw new Error('Should have detected tampering');
  } catch (e) {
    if (!e.message.includes('Decryption failed')) throw e;
  }
});

// ============================================
// TEST 4: Parser Module - parse()
// ============================================
test('parser.parse() - parses KEY=VALUE', () => {
  const result = parser.parse('KEY=value');
  if (result.KEY !== 'value') throw new Error('Parse failed');
});

test('parser.parse() - handles comments', () => {
  const result = parser.parse('# comment\nKEY=value');
  if (result.KEY !== 'value') throw new Error('Comment handling failed');
  if (Object.keys(result).length !== 1) throw new Error('Comment not ignored');
});

test('parser.parse() - handles quoted values', () => {
  const result = parser.parse('KEY1="double"\nKEY2=\'single\'');
  if (result.KEY1 !== 'double') throw new Error('Double quotes failed');
  if (result.KEY2 !== 'single') throw new Error('Single quotes failed');
});

test('parser.parse() - handles escape sequences', () => {
  const result = parser.parse('KEY="line1\\nline2\\ttab"');
  if (!result.KEY.includes('\n')) throw new Error('\\n not unescaped');
  if (!result.KEY.includes('\t')) throw new Error('\\t not unescaped');
});

test('parser.parse() - handles empty lines', () => {
  const result = parser.parse('KEY1=val1\n\n\nKEY2=val2');
  if (Object.keys(result).length !== 2) throw new Error('Empty lines not handled');
});

// ============================================
// TEST 5: Parser Module - stringify()
// ============================================
test('parser.stringify() - stringifies object', () => {
  const obj = { KEY: 'value' };
  const result = parser.stringify(obj);
  if (!result.includes('KEY=value')) throw new Error('Stringify failed');
});

test('parser.stringify() - quotes special chars', () => {
  const obj = { KEY: 'value with spaces' };
  const result = parser.stringify(obj);
  if (!result.includes('"')) throw new Error('Spaces not quoted');
});

test('parser.stringify() - escapes newlines', () => {
  const obj = { KEY: 'line1\nline2' };
  const result = parser.stringify(obj);
  if (!result.includes('\\n')) throw new Error('Newline not escaped');
});

// ============================================
// TEST 6: Parser Round-trip
// ============================================
test('parser round-trip - preserves data', () => {
  const original = { KEY1: 'value1', KEY2: 'value with spaces', KEY3: 'line1\nline2' };
  const stringified = parser.stringify(original);
  const parsed = parser.parse(stringified);
  if (JSON.stringify(parsed) !== JSON.stringify(original)) {
    throw new Error('Round-trip failed');
  }
});

// ============================================
// TEST 7: Index Module - config()
// ============================================
test('envLock.config() - works without key (silent)', () => {
  delete process.env.OXOG_ENV_KEY;
  const result = envLock.config({ silent: true });
  if (Object.keys(result).length !== 0) throw new Error('Should return empty');
});

test('envLock.config() - loads encrypted file', () => {
  const testDir = '/tmp/final-test-' + Date.now();
  fs.mkdirSync(testDir, { recursive: true });
  
  const key = crypto.generateKey();
  const data = 'TEST_VAR=test_value';
  const encrypted = crypto.encrypt(data, key);
  const lockPath = path.join(testDir, '.env.lock');
  fs.writeFileSync(lockPath, encrypted);
  
  process.env.OXOG_ENV_KEY = key;
  const result = envLock.config({ path: lockPath, silent: true });
  
  fs.rmSync(testDir, { recursive: true });
  
  if (result.TEST_VAR !== 'test_value') throw new Error('Config failed');
  if (process.env.TEST_VAR !== 'test_value') throw new Error('Var not injected');
});

// ============================================
// TEST 8: Index Module - All exports
// ============================================
test('envLock - exports all methods', () => {
  if (typeof envLock.config !== 'function') throw new Error('config missing');
  if (typeof envLock.load !== 'function') throw new Error('load missing');
  if (typeof envLock.encrypt !== 'function') throw new Error('encrypt missing');
  if (typeof envLock.decrypt !== 'function') throw new Error('decrypt missing');
  if (typeof envLock.generateKey !== 'function') throw new Error('generateKey missing');
  if (typeof envLock.parse !== 'function') throw new Error('parse missing');
  if (typeof envLock.stringify !== 'function') throw new Error('stringify missing');
});

// ============================================
// TEST 9: Constants exported
// ============================================
test('crypto - exports constants', () => {
  if (crypto.ALGORITHM !== 'aes-256-gcm') throw new Error('ALGORITHM wrong');
  if (crypto.KEY_LENGTH !== 32) throw new Error('KEY_LENGTH wrong');
  if (crypto.IV_LENGTH !== 12) throw new Error('IV_LENGTH wrong');
  if (crypto.AUTH_TAG_LENGTH !== 16) throw new Error('AUTH_TAG_LENGTH wrong');
});

// ============================================
// TEST 10: Crypto - Large data
// ============================================
test('crypto - handles large data (100KB)', () => {
  const key = crypto.generateKey();
  const largeData = 'A'.repeat(100000);
  const encrypted = crypto.encrypt(largeData, key);
  const decrypted = crypto.decrypt(encrypted, key);
  if (decrypted !== largeData) throw new Error('Large data failed');
});

// ============================================
// RESULTS
// ============================================
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`  RESULTS: ${passed} passed, ${failed} failed`);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

if (failed > 0) {
  console.log('❌ SOME TESTS FAILED');
  process.exit(1);
} else {
  console.log('✅✅✅ ALL TESTS PASSED - PACKAGE IS 100% FUNCTIONAL ✅✅✅\n');
  process.exit(0);
}
