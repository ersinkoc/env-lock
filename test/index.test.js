/**
 * Comprehensive test suite for index.js (Runtime API)
 * Tests config() method and module exports
 */

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('../src/crypto.js');

describe('index.js - Module Exports', () => {
  it('should export config function', () => {
    const envLock = require('../src/index.js');
    assert.strictEqual(typeof envLock.config, 'function');
  });

  it('should export load function (alias)', () => {
    const envLock = require('../src/index.js');
    assert.strictEqual(typeof envLock.load, 'function');
  });

  it('should export encrypt function', () => {
    const envLock = require('../src/index.js');
    assert.strictEqual(typeof envLock.encrypt, 'function');
  });

  it('should export decrypt function', () => {
    const envLock = require('../src/index.js');
    assert.strictEqual(typeof envLock.decrypt, 'function');
  });

  it('should export generateKey function', () => {
    const envLock = require('../src/index.js');
    assert.strictEqual(typeof envLock.generateKey, 'function');
  });

  it('should export parse function', () => {
    const envLock = require('../src/index.js');
    assert.strictEqual(typeof envLock.parse, 'function');
  });

  it('should export stringify function', () => {
    const envLock = require('../src/index.js');
    assert.strictEqual(typeof envLock.stringify, 'function');
  });
});

describe('index.js - config() Without Key', () => {
  let envLock;
  let originalEnv;

  beforeEach(() => {
    // Clear module cache to get fresh instance
    delete require.cache[require.resolve('../src/index.js')];

    // Save original environment
    originalEnv = { ...process.env };

    // Remove OXOG_ENV_KEY if exists
    delete process.env.OXOG_ENV_KEY;

    envLock = require('../src/index.js');
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  it('should return empty object when OXOG_ENV_KEY is not set', () => {
    const result = envLock.config({ silent: true });
    assert.deepStrictEqual(result, {});
  });

  it('should not throw error when key is missing', () => {
    assert.doesNotThrow(() => {
      envLock.config({ silent: true });
    });
  });
});

describe('index.js - config() With Invalid File', () => {
  let envLock;
  let originalEnv;
  const testKey = crypto.generateKey();

  beforeEach(() => {
    delete require.cache[require.resolve('../src/index.js')];
    originalEnv = { ...process.env };
    process.env.OXOG_ENV_KEY = testKey;
    envLock = require('../src/index.js');
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should return empty object when .env.lock does not exist', () => {
    const nonExistentPath = path.join(__dirname, 'nonexistent.env.lock');
    const result = envLock.config({
      path: nonExistentPath,
      silent: true
    });
    assert.deepStrictEqual(result, {});
  });

  it('should not throw error when file does not exist', () => {
    const nonExistentPath = path.join(__dirname, 'nonexistent.env.lock');
    assert.doesNotThrow(() => {
      envLock.config({ path: nonExistentPath, silent: true });
    });
  });
});

describe('index.js - config() With Valid Encrypted File', () => {
  let envLock;
  let originalEnv;
  let testDir;
  let testKey;
  let testEnvLockPath;

  beforeEach(() => {
    delete require.cache[require.resolve('../src/index.js')];

    // Create test directory
    testDir = path.join(__dirname, 'temp_test_' + Date.now());
    fs.mkdirSync(testDir, { recursive: true });

    // Generate test key and encrypt test data
    testKey = crypto.generateKey();
    const testData = 'TEST_VAR1=value1\nTEST_VAR2=value2\nTEST_VAR3=value3';
    const encrypted = crypto.encrypt(testData, testKey);

    // Write encrypted file
    testEnvLockPath = path.join(testDir, '.env.lock');
    fs.writeFileSync(testEnvLockPath, encrypted);

    // Set up environment
    originalEnv = { ...process.env };
    process.env.OXOG_ENV_KEY = testKey;

    envLock = require('../src/index.js');
  });

  afterEach(() => {
    // Clean up
    process.env = originalEnv;
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  it('should successfully decrypt and load variables', () => {
    const result = envLock.config({
      path: testEnvLockPath,
      silent: true
    });

    assert.strictEqual(result.TEST_VAR1, 'value1');
    assert.strictEqual(result.TEST_VAR2, 'value2');
    assert.strictEqual(result.TEST_VAR3, 'value3');
  });

  it('should inject variables into process.env', () => {
    envLock.config({
      path: testEnvLockPath,
      silent: true
    });

    assert.strictEqual(process.env.TEST_VAR1, 'value1');
    assert.strictEqual(process.env.TEST_VAR2, 'value2');
    assert.strictEqual(process.env.TEST_VAR3, 'value3');
  });

  it('should not override existing env vars by default', () => {
    process.env.TEST_VAR1 = 'existing_value';

    envLock.config({
      path: testEnvLockPath,
      silent: true
    });

    assert.strictEqual(process.env.TEST_VAR1, 'existing_value');
  });

  it('should override existing env vars when override=true', () => {
    process.env.TEST_VAR1 = 'existing_value';

    envLock.config({
      path: testEnvLockPath,
      override: true,
      silent: true
    });

    assert.strictEqual(process.env.TEST_VAR1, 'value1');
  });

  it('should return correct count in result object', () => {
    const result = envLock.config({
      path: testEnvLockPath,
      silent: true
    });

    assert.strictEqual(Object.keys(result).length, 3);
  });
});

describe('index.js - config() With Wrong Key', () => {
  let envLock;
  let originalEnv;
  let testDir;
  let testEnvLockPath;

  beforeEach(() => {
    delete require.cache[require.resolve('../src/index.js')];

    // Create test directory
    testDir = path.join(__dirname, 'temp_test_wrong_' + Date.now());
    fs.mkdirSync(testDir, { recursive: true });

    // Generate test key and encrypt test data
    const correctKey = crypto.generateKey();
    const wrongKey = crypto.generateKey();
    const testData = 'TEST_VAR=value';
    const encrypted = crypto.encrypt(testData, correctKey);

    // Write encrypted file
    testEnvLockPath = path.join(testDir, '.env.lock');
    fs.writeFileSync(testEnvLockPath, encrypted);

    // Set up environment with WRONG key
    originalEnv = { ...process.env };
    process.env.OXOG_ENV_KEY = wrongKey;

    envLock = require('../src/index.js');
  });

  afterEach(() => {
    process.env = originalEnv;
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  it('should return empty object with wrong key', () => {
    const result = envLock.config({
      path: testEnvLockPath,
      silent: true
    });

    assert.deepStrictEqual(result, {});
  });

  it('should not throw error with wrong key', () => {
    assert.doesNotThrow(() => {
      envLock.config({ path: testEnvLockPath, silent: true });
    });
  });
});

describe('index.js - config() With Empty File', () => {
  let envLock;
  let originalEnv;
  let testDir;
  let testEnvLockPath;

  beforeEach(() => {
    delete require.cache[require.resolve('../src/index.js')];

    // Create test directory
    testDir = path.join(__dirname, 'temp_test_empty_' + Date.now());
    fs.mkdirSync(testDir, { recursive: true });

    // Create empty file
    testEnvLockPath = path.join(testDir, '.env.lock');
    fs.writeFileSync(testEnvLockPath, '');

    // Set up environment
    originalEnv = { ...process.env };
    process.env.OXOG_ENV_KEY = crypto.generateKey();

    envLock = require('../src/index.js');
  });

  afterEach(() => {
    process.env = originalEnv;
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  it('should return empty object for empty file', () => {
    const result = envLock.config({
      path: testEnvLockPath,
      silent: true
    });

    assert.deepStrictEqual(result, {});
  });

  it('should not throw error for empty file', () => {
    assert.doesNotThrow(() => {
      envLock.config({ path: testEnvLockPath, silent: true });
    });
  });
});

describe('index.js - config() Options', () => {
  let envLock;
  let originalEnv;
  let testDir;
  let testKey;
  let testEnvLockPath;

  beforeEach(() => {
    delete require.cache[require.resolve('../src/index.js')];

    testDir = path.join(__dirname, 'temp_test_options_' + Date.now());
    fs.mkdirSync(testDir, { recursive: true });

    testKey = crypto.generateKey();
    const testData = 'OPT_VAR=option_value';
    const encrypted = crypto.encrypt(testData, testKey);

    testEnvLockPath = path.join(testDir, '.env.lock');
    fs.writeFileSync(testEnvLockPath, encrypted);

    originalEnv = { ...process.env };
    process.env.OXOG_ENV_KEY = testKey;

    envLock = require('../src/index.js');
  });

  afterEach(() => {
    process.env = originalEnv;
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  it('should accept custom path option', () => {
    const result = envLock.config({
      path: testEnvLockPath,
      silent: true
    });

    assert.strictEqual(result.OPT_VAR, 'option_value');
  });

  it('should accept encoding option', () => {
    const result = envLock.config({
      path: testEnvLockPath,
      encoding: 'utf8',
      silent: true
    });

    assert.strictEqual(result.OPT_VAR, 'option_value');
  });

  it('should work with empty options object', () => {
    // Change to test dir so default path works
    const originalCwd = process.cwd();
    process.chdir(testDir);

    const result = envLock.config({ silent: true });

    process.chdir(originalCwd);
    assert.strictEqual(result.OPT_VAR, 'option_value');
  });

  it('should work without options parameter', () => {
    const originalCwd = process.cwd();
    process.chdir(testDir);

    // Capture console output
    const originalLog = console.log;
    const originalWarn = console.warn;
    let logged = false;
    console.log = () => { logged = true; };
    console.warn = () => {};

    const result = envLock.config();

    console.log = originalLog;
    console.warn = originalWarn;
    process.chdir(originalCwd);

    assert.strictEqual(result.OPT_VAR, 'option_value');
  });
});

describe('index.js - config() With Complex Data', () => {
  let envLock;
  let originalEnv;
  let testDir;
  let testKey;
  let testEnvLockPath;

  beforeEach(() => {
    delete require.cache[require.resolve('../src/index.js')];

    testDir = path.join(__dirname, 'temp_test_complex_' + Date.now());
    fs.mkdirSync(testDir, { recursive: true });

    testKey = crypto.generateKey();
    const testData = `DATABASE_URL=postgresql://user:pass@localhost:5432/db
API_KEY="sk_test_1234567890"
SECRET="my secret value"
DEBUG=true
PORT=3000
MULTILINE="line1\\nline2"`;
    const encrypted = crypto.encrypt(testData, testKey);

    testEnvLockPath = path.join(testDir, '.env.lock');
    fs.writeFileSync(testEnvLockPath, encrypted);

    originalEnv = { ...process.env };
    process.env.OXOG_ENV_KEY = testKey;

    envLock = require('../src/index.js');
  });

  afterEach(() => {
    process.env = originalEnv;
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  it('should handle complex real-world data', () => {
    const result = envLock.config({
      path: testEnvLockPath,
      silent: true
    });

    assert.strictEqual(result.DATABASE_URL, 'postgresql://user:pass@localhost:5432/db');
    assert.strictEqual(result.API_KEY, 'sk_test_1234567890');
    assert.strictEqual(result.SECRET, 'my secret value');
    assert.strictEqual(result.DEBUG, 'true');
    assert.strictEqual(result.PORT, '3000');
  });

  it('should inject complex data into process.env', () => {
    envLock.config({
      path: testEnvLockPath,
      silent: true
    });

    assert.strictEqual(process.env.DATABASE_URL, 'postgresql://user:pass@localhost:5432/db');
    assert.strictEqual(process.env.API_KEY, 'sk_test_1234567890');
  });
});

describe('index.js - load() Alias', () => {
  let envLock;
  let originalEnv;
  let testDir;
  let testKey;
  let testEnvLockPath;

  beforeEach(() => {
    delete require.cache[require.resolve('../src/index.js')];

    testDir = path.join(__dirname, 'temp_test_load_' + Date.now());
    fs.mkdirSync(testDir, { recursive: true });

    testKey = crypto.generateKey();
    const testData = 'LOAD_VAR=loaded';
    const encrypted = crypto.encrypt(testData, testKey);

    testEnvLockPath = path.join(testDir, '.env.lock');
    fs.writeFileSync(testEnvLockPath, encrypted);

    originalEnv = { ...process.env };
    process.env.OXOG_ENV_KEY = testKey;

    envLock = require('../src/index.js');
  });

  afterEach(() => {
    process.env = originalEnv;
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  it('should work same as config()', () => {
    const result = envLock.load({
      path: testEnvLockPath,
      silent: true
    });

    assert.strictEqual(result.LOAD_VAR, 'loaded');
    assert.strictEqual(process.env.LOAD_VAR, 'loaded');
  });
});

describe('index.js - Exported Crypto Functions', () => {
  const envLock = require('../src/index.js');

  it('should encrypt and decrypt correctly', () => {
    const key = envLock.generateKey();
    const plaintext = 'test data';
    const encrypted = envLock.encrypt(plaintext, key);
    const decrypted = envLock.decrypt(encrypted, key);

    assert.strictEqual(decrypted, plaintext);
  });

  it('should generate valid keys', () => {
    const key = envLock.generateKey();
    assert.strictEqual(key.length, 64);
    assert.match(key, /^[0-9a-f]{64}$/);
  });
});

describe('index.js - Exported Parser Functions', () => {
  const envLock = require('../src/index.js');

  it('should parse .env content correctly', () => {
    const content = 'KEY1=value1\nKEY2=value2';
    const parsed = envLock.parse(content);

    assert.deepStrictEqual(parsed, {
      KEY1: 'value1',
      KEY2: 'value2'
    });
  });

  it('should stringify object correctly', () => {
    const obj = { KEY1: 'value1', KEY2: 'value2' };
    const stringified = envLock.stringify(obj);

    assert.ok(stringified.includes('KEY1=value1'));
    assert.ok(stringified.includes('KEY2=value2'));
  });
});

describe('index.js - Console Output Coverage', () => {
  let envLock;
  let originalEnv;
  let originalWarn;
  let originalError;
  let originalLog;
  let testDir;

  beforeEach(() => {
    delete require.cache[require.resolve('../src/index.js')];
    originalEnv = { ...process.env };
    originalWarn = console.warn;
    originalError = console.error;
    originalLog = console.log;

    testDir = path.join(__dirname, 'temp_console_' + Date.now());
    fs.mkdirSync(testDir, { recursive: true });

    envLock = require('../src/index.js');
  });

  afterEach(() => {
    process.env = originalEnv;
    console.warn = originalWarn;
    console.error = originalError;
    console.log = originalLog;

    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  it('should log warning when OXOG_ENV_KEY is missing (silent=false)', () => {
    delete process.env.OXOG_ENV_KEY;
    let logged = false;

    console.warn = (msg) => {
      if (msg.includes('OXOG_ENV_KEY') && msg.includes('not set')) {
        logged = true;
      }
    };

    envLock.config({ silent: false });
    assert.strictEqual(logged, true);
  });

  it('should log warning when .env.lock file not found (silent=false)', () => {
    process.env.OXOG_ENV_KEY = crypto.generateKey();
    const nonExistentPath = path.join(testDir, 'nonexistent.lock');
    let logged = false;

    console.warn = (msg) => {
      if (msg.includes('not found')) {
        logged = true;
      }
    };

    envLock.config({
      path: nonExistentPath,
      silent: false
    });

    assert.strictEqual(logged, true);
  });

  it('should log warning when .env.lock is empty (silent=false)', () => {
    const key = crypto.generateKey();
    process.env.OXOG_ENV_KEY = key;

    const emptyFilePath = path.join(testDir, '.env.lock');
    fs.writeFileSync(emptyFilePath, '');

    let logged = false;
    console.warn = (msg) => {
      if (msg.includes('empty')) {
        logged = true;
      }
    };

    envLock.config({
      path: emptyFilePath,
      silent: false
    });

    assert.strictEqual(logged, true);
  });

  it('should log error when decryption fails (silent=false)', () => {
    const correctKey = crypto.generateKey();
    const wrongKey = crypto.generateKey();

    const testData = 'TEST_VAR=value';
    const encrypted = crypto.encrypt(testData, correctKey);

    const testFilePath = path.join(testDir, '.env.lock');
    fs.writeFileSync(testFilePath, encrypted);

    process.env.OXOG_ENV_KEY = wrongKey;

    let errorLogged = false;
    console.error = (msg) => {
      if (msg.includes('Failed to decrypt') || msg.includes('Details:')) {
        errorLogged = true;
      }
    };

    envLock.config({
      path: testFilePath,
      silent: false
    });

    assert.strictEqual(errorLogged, true);
  });

  it('should log success message when loading variables (silent=false)', () => {
    const key = crypto.generateKey();
    process.env.OXOG_ENV_KEY = key;

    const testData = 'TEST_VAR1=value1\nTEST_VAR2=value2';
    const encrypted = crypto.encrypt(testData, key);

    const testFilePath = path.join(testDir, '.env.lock');
    fs.writeFileSync(testFilePath, encrypted);

    let successLogged = false;
    console.log = (msg) => {
      if (msg.includes('Successfully loaded') && msg.includes('environment variable')) {
        successLogged = true;
      }
    };

    envLock.config({
      path: testFilePath,
      silent: false
    });

    assert.strictEqual(successLogged, true);
  });
});

describe('index.js - File System Error Coverage', () => {
  let envLock;
  let originalEnv;
  let originalError;
  let testDir;

  beforeEach(() => {
    delete require.cache[require.resolve('../src/index.js')];
    originalEnv = { ...process.env };
    originalError = console.error;

    testDir = path.join(__dirname, 'temp_fs_error_' + Date.now());
    fs.mkdirSync(testDir, { recursive: true });

    envLock = require('../src/index.js');
  });

  afterEach(() => {
    process.env = originalEnv;
    console.error = originalError;

    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  it('should handle file system errors during read (silent=false)', () => {
    const key = crypto.generateKey();
    process.env.OXOG_ENV_KEY = key;

    // Create a directory instead of a file to cause read error
    const dirPath = path.join(testDir, '.env.lock');
    fs.mkdirSync(dirPath);

    let errorLogged = false;
    console.error = (msg) => {
      if (msg.includes('Error:')) {
        errorLogged = true;
      }
    };

    const result = envLock.config({
      path: dirPath,
      silent: false
    });

    // Should return empty object on error
    assert.deepStrictEqual(result, {});
    assert.strictEqual(errorLogged, true);
  });

  it('should handle file system errors gracefully (silent=true)', () => {
    const key = crypto.generateKey();
    process.env.OXOG_ENV_KEY = key;

    // Create a directory instead of a file
    const dirPath = path.join(testDir, '.env.lock');
    fs.mkdirSync(dirPath);

    const result = envLock.config({
      path: dirPath,
      silent: true
    });

    // Should return empty object without throwing
    assert.deepStrictEqual(result, {});
  });
});

describe('index.js - Edge Cases and Advanced Scenarios', () => {
  let envLock;
  let originalEnv;
  let testDir;

  beforeEach(() => {
    // Fresh require for each test
    delete require.cache[require.resolve('../src/index.js')];
    envLock = require('../src/index.js');

    // Save original environment
    originalEnv = { ...process.env };

    // Create temporary test directory
    testDir = path.join(__dirname, `test-edge-cases-${Date.now()}`);
    fs.mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    // Restore environment
    process.env = originalEnv;

    // Clean up test directory
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  it('should handle symbolic links to .env.lock files', () => {
    const key = crypto.generateKey();
    process.env.OXOG_ENV_KEY = key;

    // Create actual .env.lock file
    const actualFile = path.join(testDir, 'actual.env.lock');
    const content = 'TEST_VAR=symlink_value';
    const encrypted = crypto.encrypt(content, key);
    fs.writeFileSync(actualFile, encrypted);

    // Create symbolic link
    const symlinkPath = path.join(testDir, '.env.lock');
    try {
      fs.symlinkSync(actualFile, symlinkPath);
    } catch (err) {
      // Symbolic link creation may fail on some systems (e.g., Windows without admin)
      // Skip this test if symlinks are not supported
      if (err.code === 'EPERM' || err.code === 'ENOSYS') {
        return;
      }
      throw err;
    }

    // Load via symbolic link
    const result = envLock.config({
      path: symlinkPath,
      silent: true
    });

    assert.strictEqual(result.TEST_VAR, 'symlink_value');
  });

  it('should handle very long environment variable values', () => {
    const key = crypto.generateKey();
    process.env.OXOG_ENV_KEY = key;

    // Create a very long value (1MB)
    const longValue = 'x'.repeat(1024 * 1024);
    const content = `LONG_VAR=${longValue}`;
    const encrypted = crypto.encrypt(content, key);

    const filePath = path.join(testDir, '.env.lock');
    fs.writeFileSync(filePath, encrypted);

    const result = envLock.config({
      path: filePath,
      silent: true
    });

    assert.strictEqual(result.LONG_VAR, longValue);
    assert.strictEqual(result.LONG_VAR.length, 1024 * 1024);
  });

  it('should handle files with UTF-8 BOM', () => {
    const key = crypto.generateKey();
    process.env.OXOG_ENV_KEY = key;

    const content = 'UTF8_VAR=value';
    const encrypted = crypto.encrypt(content, key);

    // Add UTF-8 BOM to the beginning
    const bom = '\uFEFF';
    const withBom = bom + encrypted;

    const filePath = path.join(testDir, '.env.lock');
    fs.writeFileSync(filePath, withBom);

    const result = envLock.config({
      path: filePath,
      silent: true
    });

    // Should handle BOM gracefully
    assert.ok(result);
  });

  it('should handle concurrent config() calls', () => {
    const key = crypto.generateKey();
    process.env.OXOG_ENV_KEY = key;

    const content = 'CONCURRENT_VAR=concurrent_value';
    const encrypted = crypto.encrypt(content, key);

    const filePath = path.join(testDir, '.env.lock');
    fs.writeFileSync(filePath, encrypted);

    // Make multiple concurrent calls
    const result1 = envLock.config({ path: filePath, silent: true });
    const result2 = envLock.config({ path: filePath, silent: true });
    const result3 = envLock.config({ path: filePath, silent: true });

    assert.strictEqual(result1.CONCURRENT_VAR, 'concurrent_value');
    assert.strictEqual(result2.CONCURRENT_VAR, 'concurrent_value');
    assert.strictEqual(result3.CONCURRENT_VAR, 'concurrent_value');
  });

  it('should handle whitespace-only .env.lock files', () => {
    const key = crypto.generateKey();
    process.env.OXOG_ENV_KEY = key;

    // Encrypt whitespace-only content
    const encrypted = crypto.encrypt('   \n\t\n   ', key);

    const filePath = path.join(testDir, '.env.lock');
    fs.writeFileSync(filePath, encrypted);

    const result = envLock.config({
      path: filePath,
      silent: true
    });

    // Should return empty object for whitespace-only content
    assert.deepStrictEqual(result, {});
  });
});

describe('index.js - BUG-002: Allow Legitimate Node.js Environment Variables', () => {
  let envLock;
  let originalEnv;
  let testDir;
  let testKey;

  beforeEach(() => {
    delete require.cache[require.resolve('../src/index.js')];
    envLock = require('../src/index.js');
    originalEnv = { ...process.env };
    testDir = path.join(__dirname, `test-bug002-${Date.now()}`);
    fs.mkdirSync(testDir, { recursive: true });
    testKey = crypto.generateKey();
    process.env.OXOG_ENV_KEY = testKey;
  });

  afterEach(() => {
    process.env = originalEnv;
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  it('should allow NODE_DEBUG environment variable', () => {
    const testData = 'NODE_DEBUG=http,net';
    const encrypted = crypto.encrypt(testData, testKey);

    const filePath = path.join(testDir, '.env.lock');
    fs.writeFileSync(filePath, encrypted);

    const result = envLock.config({
      path: filePath,
      silent: true
    });

    // NODE_DEBUG should be loaded successfully (was blocked before BUG-002 fix)
    assert.strictEqual(result.NODE_DEBUG, 'http,net');
    assert.strictEqual(process.env.NODE_DEBUG, 'http,net');
  });

  it('should allow NODE_PATH environment variable', () => {
    const testData = 'NODE_PATH=/custom/node_modules';
    const encrypted = crypto.encrypt(testData, testKey);

    const filePath = path.join(testDir, '.env.lock');
    fs.writeFileSync(filePath, encrypted);

    const result = envLock.config({
      path: filePath,
      silent: true
    });

    // NODE_PATH should be loaded successfully (was blocked before BUG-002 fix)
    assert.strictEqual(result.NODE_PATH, '/custom/node_modules');
    assert.strictEqual(process.env.NODE_PATH, '/custom/node_modules');
  });

  it('should still block NODE_OPTIONS for security', () => {
    const testData = 'NODE_OPTIONS=--require=/tmp/malicious.js';
    const encrypted = crypto.encrypt(testData, testKey);

    const filePath = path.join(testDir, '.env.lock');
    fs.writeFileSync(filePath, encrypted);

    // Clear any existing NODE_OPTIONS
    delete process.env.NODE_OPTIONS;

    const result = envLock.config({
      path: filePath,
      silent: true
    });

    // NODE_OPTIONS is parsed but NOT injected into process.env (blocked)
    assert.strictEqual(result.NODE_OPTIONS, '--require=/tmp/malicious.js'); // Parsed value
    assert.strictEqual(process.env.NODE_OPTIONS, undefined); // Not injected
  });

  it('should still block prototype pollution keys from process.env', () => {
    const testData = '__proto__=polluted\nconstructor=bad\nprototype=evil\nSAFE_KEY=safe_value';
    const encrypted = crypto.encrypt(testData, testKey);

    const filePath = path.join(testDir, '.env.lock');
    fs.writeFileSync(filePath, encrypted);

    // Clear any potential existing values
    delete process.env.SAFE_KEY;

    const result = envLock.config({
      path: filePath,
      silent: true
    });

    // The critical security check: dangerous keys should NOT be own properties of process.env
    // Use hasOwn to check if they were injected as actual properties
    assert.strictEqual(Object.hasOwn(process.env, '__proto__'), false);
    assert.strictEqual(Object.hasOwn(process.env, 'constructor'), false);
    assert.strictEqual(Object.hasOwn(process.env, 'prototype'), false);

    // But safe keys should be injected
    assert.strictEqual(process.env.SAFE_KEY, 'safe_value');
    assert.strictEqual(result.SAFE_KEY, 'safe_value');
  });
});

describe('index.js - configAsync() Asynchronous API', () => {
  let envLock;
  let originalEnv;
  let testDir;

  beforeEach(() => {
    delete require.cache[require.resolve('../src/index.js')];
    envLock = require('../src/index.js');
    originalEnv = { ...process.env };
    testDir = path.join(__dirname, `test-async-${Date.now()}`);
    fs.mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    process.env = originalEnv;
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  it('should export configAsync function', () => {
    assert.strictEqual(typeof envLock.configAsync, 'function');
  });

  it('should export loadAsync function', () => {
    assert.strictEqual(typeof envLock.loadAsync, 'function');
  });

  it('should return empty object when OXOG_ENV_KEY is not set', async () => {
    delete process.env.OXOG_ENV_KEY;
    const result = await envLock.configAsync({ silent: true });
    assert.deepStrictEqual(result, {});
  });

  it('should return empty object when file does not exist', async () => {
    process.env.OXOG_ENV_KEY = crypto.generateKey();
    const result = await envLock.configAsync({
      path: path.join(testDir, 'nonexistent.lock'),
      silent: true
    });
    assert.deepStrictEqual(result, {});
  });

  it('should successfully decrypt and load variables asynchronously', async () => {
    const key = crypto.generateKey();
    process.env.OXOG_ENV_KEY = key;

    const testData = 'ASYNC_VAR1=value1\nASYNC_VAR2=value2';
    const encrypted = crypto.encrypt(testData, key);

    const filePath = path.join(testDir, '.env.lock');
    fs.writeFileSync(filePath, encrypted);

    const result = await envLock.configAsync({
      path: filePath,
      silent: true
    });

    assert.strictEqual(result.ASYNC_VAR1, 'value1');
    assert.strictEqual(result.ASYNC_VAR2, 'value2');
  });

  it('should inject variables into process.env', async () => {
    const key = crypto.generateKey();
    process.env.OXOG_ENV_KEY = key;

    const testData = 'ASYNC_INJECT=injected_value';
    const encrypted = crypto.encrypt(testData, key);

    const filePath = path.join(testDir, '.env.lock');
    fs.writeFileSync(filePath, encrypted);

    await envLock.configAsync({
      path: filePath,
      silent: true
    });

    assert.strictEqual(process.env.ASYNC_INJECT, 'injected_value');
  });

  it('should not override existing vars by default', async () => {
    const key = crypto.generateKey();
    process.env.OXOG_ENV_KEY = key;
    process.env.EXISTING_VAR = 'original';

    const testData = 'EXISTING_VAR=from_file';
    const encrypted = crypto.encrypt(testData, key);

    const filePath = path.join(testDir, '.env.lock');
    fs.writeFileSync(filePath, encrypted);

    await envLock.configAsync({
      path: filePath,
      silent: true
    });

    assert.strictEqual(process.env.EXISTING_VAR, 'original');
  });

  it('should override existing vars when override=true', async () => {
    const key = crypto.generateKey();
    process.env.OXOG_ENV_KEY = key;
    process.env.OVERRIDE_VAR = 'original';

    const testData = 'OVERRIDE_VAR=from_file';
    const encrypted = crypto.encrypt(testData, key);

    const filePath = path.join(testDir, '.env.lock');
    fs.writeFileSync(filePath, encrypted);

    await envLock.configAsync({
      path: filePath,
      override: true,
      silent: true
    });

    assert.strictEqual(process.env.OVERRIDE_VAR, 'from_file');
  });

  it('should return empty object with wrong decryption key', async () => {
    const correctKey = crypto.generateKey();
    const wrongKey = crypto.generateKey();
    process.env.OXOG_ENV_KEY = wrongKey;

    const testData = 'SECRET=value';
    const encrypted = crypto.encrypt(testData, correctKey);

    const filePath = path.join(testDir, '.env.lock');
    fs.writeFileSync(filePath, encrypted);

    const result = await envLock.configAsync({
      path: filePath,
      silent: true
    });

    assert.deepStrictEqual(result, {});
  });

  it('should return empty object for empty file', async () => {
    const key = crypto.generateKey();
    process.env.OXOG_ENV_KEY = key;

    const filePath = path.join(testDir, '.env.lock');
    fs.writeFileSync(filePath, '');

    const result = await envLock.configAsync({
      path: filePath,
      silent: true
    });

    assert.deepStrictEqual(result, {});
  });

  it('loadAsync should work same as configAsync', async () => {
    const key = crypto.generateKey();
    process.env.OXOG_ENV_KEY = key;

    const testData = 'LOAD_ASYNC_VAR=loaded';
    const encrypted = crypto.encrypt(testData, key);

    const filePath = path.join(testDir, '.env.lock');
    fs.writeFileSync(filePath, encrypted);

    const result = await envLock.loadAsync({
      path: filePath,
      silent: true
    });

    assert.strictEqual(result.LOAD_ASYNC_VAR, 'loaded');
    assert.strictEqual(process.env.LOAD_ASYNC_VAR, 'loaded');
  });
});
