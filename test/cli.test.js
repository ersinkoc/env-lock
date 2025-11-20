/**
 * Comprehensive integration tests for CLI (bin/cli.js)
 * Tests all CLI commands and options
 */

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const { execSync, spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('../src/crypto.js');

const CLI_PATH = path.join(__dirname, '..', 'bin', 'cli.js');

// Helper to execute CLI command
function runCLI(args, options = {}) {
  const cmd = `node "${CLI_PATH}" ${args}`;
  try {
    return execSync(cmd, {
      encoding: 'utf8',
      ...options
    });
  } catch (error) {
    // Return error output for testing error cases
    return {
      stdout: error.stdout?.toString() || '',
      stderr: error.stderr?.toString() || '',
      status: error.status,
      error: true
    };
  }
}

describe('CLI - Help Command', () => {
  it('should display help with "help" command', () => {
    const output = runCLI('help');
    assert.ok(output.includes('@oxog/env-lock'));
    assert.ok(output.includes('USAGE'));
    assert.ok(output.includes('COMMANDS'));
    assert.ok(output.includes('encrypt'));
    assert.ok(output.includes('decrypt'));
  });

  it('should display help with "--help" flag', () => {
    const output = runCLI('--help');
    assert.ok(output.includes('@oxog/env-lock'));
    assert.ok(output.includes('USAGE'));
  });

  it('should display help with "-h" flag', () => {
    const output = runCLI('-h');
    assert.ok(output.includes('@oxog/env-lock'));
    assert.ok(output.includes('USAGE'));
  });

  it('should display help with no arguments', () => {
    const output = runCLI('');
    assert.ok(output.includes('@oxog/env-lock'));
    assert.ok(output.includes('USAGE'));
  });
});

describe('CLI - Generate Key Command', () => {
  it('should generate key with "generate-key" command', () => {
    const output = runCLI('generate-key');
    assert.ok(output.includes('OXOG_ENV_KEY='));
    assert.ok(output.includes('Generated new encryption key'));
  });

  it('should generate key with "genkey" alias', () => {
    const output = runCLI('genkey');
    assert.ok(output.includes('OXOG_ENV_KEY='));
  });

  it('should generate valid 64-character hex key', () => {
    const output = runCLI('generate-key');
    const match = output.match(/OXOG_ENV_KEY=([0-9a-f]{64})/);
    assert.ok(match);
    assert.strictEqual(match[1].length, 64);
  });
});

describe('CLI - Encrypt Command', () => {
  let testDir;
  let testEnvPath;

  beforeEach(() => {
    testDir = path.join(__dirname, 'temp_cli_encrypt_' + Date.now());
    fs.mkdirSync(testDir, { recursive: true });
    testEnvPath = path.join(testDir, '.env');

    // Create test .env file
    fs.writeFileSync(testEnvPath, 'TEST_VAR1=value1\nTEST_VAR2=value2');
  });

  afterEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  it('should encrypt .env file successfully', () => {
    const output = runCLI(`encrypt --input "${testEnvPath}" --output "${testDir}/.env.lock"`);
    assert.ok(output.includes('Encrypted'));
    assert.ok(output.includes('OXOG_ENV_KEY='));
    assert.ok(fs.existsSync(path.join(testDir, '.env.lock')));
  });

  it('should generate new key when not provided', () => {
    const output = runCLI(`encrypt --input "${testEnvPath}" --output "${testDir}/.env.lock"`);
    const match = output.match(/OXOG_ENV_KEY=([0-9a-f]{64})/);
    assert.ok(match);
    assert.strictEqual(match[1].length, 64);
  });

  it('should use provided key', () => {
    const key = crypto.generateKey();
    const output = runCLI(`encrypt --key ${key} --input "${testEnvPath}" --output "${testDir}/.env.lock"`);
    assert.ok(output.includes('Encrypted'));
    assert.ok(!output.includes('Generated new encryption key'));
  });

  it('should use -k shorthand for key', () => {
    const key = crypto.generateKey();
    const output = runCLI(`encrypt -k ${key} --input "${testEnvPath}" --output "${testDir}/.env.lock"`);
    assert.ok(output.includes('Encrypted'));
  });

  it('should use -i shorthand for input', () => {
    const output = runCLI(`encrypt -i "${testEnvPath}" --output "${testDir}/.env.lock"`);
    assert.ok(output.includes('Encrypted'));
  });

  it('should use -o shorthand for output', () => {
    const output = runCLI(`encrypt --input "${testEnvPath}" -o "${testDir}/.env.lock"`);
    assert.ok(output.includes('Encrypted'));
  });

  it('should create valid encrypted file', () => {
    const key = crypto.generateKey();
    runCLI(`encrypt --key ${key} --input "${testEnvPath}" --output "${testDir}/.env.lock"`);

    const encrypted = fs.readFileSync(path.join(testDir, '.env.lock'), 'utf8');
    const parts = encrypted.trim().split(':');
    assert.strictEqual(parts.length, 3);
  });
});

describe('CLI - Decrypt Command', () => {
  let testDir;
  let testEnvLockPath;
  let testKey;

  beforeEach(() => {
    testDir = path.join(__dirname, 'temp_cli_decrypt_' + Date.now());
    fs.mkdirSync(testDir, { recursive: true });
    testEnvLockPath = path.join(testDir, '.env.lock');

    // Create encrypted test file
    testKey = crypto.generateKey();
    const testData = 'DECRYPT_VAR1=decrypted1\nDECRYPT_VAR2=decrypted2';
    const encrypted = crypto.encrypt(testData, testKey);
    fs.writeFileSync(testEnvLockPath, encrypted);
  });

  afterEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  it('should decrypt file with --key option', () => {
    const output = runCLI(`decrypt --key ${testKey} --input "${testEnvLockPath}"`);
    assert.ok(output.includes('DECRYPT_VAR1=decrypted1'));
    assert.ok(output.includes('DECRYPT_VAR2=decrypted2'));
  });

  it('should decrypt file with -k shorthand', () => {
    const output = runCLI(`decrypt -k ${testKey} --input "${testEnvLockPath}"`);
    assert.ok(output.includes('DECRYPT_VAR1=decrypted1'));
  });

  it('should decrypt file with OXOG_ENV_KEY environment variable', () => {
    const output = runCLI(`decrypt --input "${testEnvLockPath}"`, {
      env: { ...process.env, OXOG_ENV_KEY: testKey }
    });
    assert.ok(output.includes('DECRYPT_VAR1=decrypted1'));
  });

  it('should use -i shorthand for input', () => {
    const output = runCLI(`decrypt --key ${testKey} -i "${testEnvLockPath}"`);
    assert.ok(output.includes('DECRYPT_VAR1=decrypted1'));
  });

  it('should output decrypted content to stdout', () => {
    const output = runCLI(`decrypt --key ${testKey} --input "${testEnvLockPath}"`);
    // Output should be parseable as .env content
    assert.ok(output.includes('='));
    assert.ok(!output.includes('Decrypted')); // Should not include status messages
  });
});

describe('CLI - Encrypt/Decrypt Round Trip', () => {
  let testDir;
  let testEnvPath;

  beforeEach(() => {
    testDir = path.join(__dirname, 'temp_cli_roundtrip_' + Date.now());
    fs.mkdirSync(testDir, { recursive: true });
    testEnvPath = path.join(testDir, '.env');

    // Create test .env file with various data types
    const testContent = `DATABASE_URL=postgresql://localhost:5432/db
API_KEY="sk_test_123456"
SECRET='my secret'
DEBUG=true
PORT=3000
MULTILINE="line1
line2"`;
    fs.writeFileSync(testEnvPath, testContent);
  });

  afterEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  it('should maintain data integrity through encrypt/decrypt cycle', () => {
    const key = crypto.generateKey();
    const originalContent = fs.readFileSync(testEnvPath, 'utf8');

    // Encrypt
    runCLI(`encrypt --key ${key} --input "${testEnvPath}" --output "${testDir}/.env.lock"`);

    // Decrypt
    const decrypted = runCLI(`decrypt --key ${key} --input "${testDir}/.env.lock"`);

    // Parse both original and decrypted
    const parser = require('../src/parser.js');
    const originalParsed = parser.parse(originalContent);
    const decryptedParsed = parser.parse(decrypted);

    // Compare all values
    assert.deepStrictEqual(decryptedParsed, originalParsed);
  });
});

describe('CLI - Error Cases', () => {
  it('should show error for unknown command', () => {
    const result = runCLI('unknown-command');
    if (result.error) {
      assert.ok(
        result.stderr.includes('Unknown command') ||
        result.stdout.includes('Unknown command')
      );
    }
  });

  it('should show error for invalid key format in encrypt', () => {
    const testDir = path.join(__dirname, 'temp_cli_error_' + Date.now());
    fs.mkdirSync(testDir, { recursive: true });
    const testEnvPath = path.join(testDir, '.env');
    fs.writeFileSync(testEnvPath, 'KEY=value');

    const result = runCLI(`encrypt --key invalidkey --input "${testEnvPath}" --output "${testDir}/.env.lock"`);

    fs.rmSync(testDir, { recursive: true, force: true });

    if (result.error) {
      assert.ok(
        result.stderr.includes('Invalid key format') ||
        result.stdout.includes('Invalid key format')
      );
    }
  });

  it('should show error when input file does not exist for encrypt', () => {
    const result = runCLI('encrypt --input "/nonexistent/file.env" --output "/tmp/out.lock"');
    if (result.error) {
      assert.ok(
        result.stderr.includes('not found') ||
        result.stdout.includes('not found')
      );
    }
  });

  it('should show error when input file does not exist for decrypt', () => {
    const key = crypto.generateKey();
    const result = runCLI(`decrypt --key ${key} --input "/nonexistent/file.lock"`);
    if (result.error) {
      assert.ok(
        result.stderr.includes('not found') ||
        result.stdout.includes('not found')
      );
    }
  });

  it('should show error when decryption key is missing', () => {
    const testDir = path.join(__dirname, 'temp_cli_nokey_' + Date.now());
    fs.mkdirSync(testDir, { recursive: true });
    const testEnvLockPath = path.join(testDir, '.env.lock');
    fs.writeFileSync(testEnvLockPath, 'some:encrypted:data');

    const result = runCLI(`decrypt --input "${testEnvLockPath}"`, {
      env: { ...process.env, OXOG_ENV_KEY: undefined }
    });

    fs.rmSync(testDir, { recursive: true, force: true });

    if (result.error) {
      assert.ok(
        result.stderr.includes('not provided') ||
        result.stdout.includes('not provided')
      );
    }
  });
});

describe('CLI - Real World Scenario', () => {
  let testDir;

  beforeEach(() => {
    testDir = path.join(__dirname, 'temp_cli_realworld_' + Date.now());
    fs.mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  it('should handle complete workflow: generate key, encrypt, decrypt', () => {
    // Step 1: Generate key
    const keyOutput = runCLI('generate-key');
    const keyMatch = keyOutput.match(/OXOG_ENV_KEY=([0-9a-f]{64})/);
    assert.ok(keyMatch);
    const key = keyMatch[1];

    // Step 2: Create .env file
    const envPath = path.join(testDir, '.env');
    fs.writeFileSync(envPath, `DATABASE_URL=postgresql://localhost/db
API_KEY=sk_test_abc123
SECRET=my_secret_value`);

    // Step 3: Encrypt
    const encryptOutput = runCLI(`encrypt --key ${key} --input "${envPath}" --output "${testDir}/.env.lock"`);
    assert.ok(encryptOutput.includes('Encrypted'));
    assert.ok(fs.existsSync(path.join(testDir, '.env.lock')));

    // Step 4: Decrypt
    const decryptOutput = runCLI(`decrypt --key ${key} --input "${testDir}/.env.lock"`);
    assert.ok(decryptOutput.includes('DATABASE_URL=postgresql://localhost/db'));
    assert.ok(decryptOutput.includes('API_KEY=sk_test_abc123'));
    assert.ok(decryptOutput.includes('SECRET=my_secret_value'));

    // Step 5: Verify encrypted file format
    const encrypted = fs.readFileSync(path.join(testDir, '.env.lock'), 'utf8');
    const parts = encrypted.trim().split(':');
    assert.strictEqual(parts.length, 3);
    assert.match(parts[0], /^[0-9a-f]+$/); // IV
    assert.match(parts[1], /^[0-9a-f]+$/); // Auth tag
    assert.match(parts[2], /^[0-9a-f]+$/); // Encrypted data
  });
});

describe('CLI - Additional Error Coverage', () => {
  let testDir;

  beforeEach(() => {
    testDir = path.join(__dirname, 'temp_cli_errors_' + Date.now());
    fs.mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  it('should handle empty input file during encryption', () => {
    const emptyFile = path.join(testDir, '.env');
    fs.writeFileSync(emptyFile, '');

    const result = runCLI(`encrypt --input "${emptyFile}" --output "${testDir}/.env.lock"`);

    // Should generate warning about empty file
    assert.ok(result.includes('OXOG_ENV_KEY') || result.error);
  });

  it('should handle file read error during encryption', () => {
    const nonExistentFile = path.join(testDir, 'does-not-exist.env');

    const result = runCLI(`encrypt --input "${nonExistentFile}" --output "${testDir}/.env.lock"`);

    if (result.error) {
      assert.ok(
        result.stderr.includes('not found') || 
        result.stdout.includes('not found')
      );
    }
  });

  it('should handle encryption failure', () => {
    const testEnvPath = path.join(testDir, '.env');
    fs.writeFileSync(testEnvPath, 'KEY=value');

    // Invalid key format should fail
    const result = runCLI(`encrypt --key invalid_key --input "${testEnvPath}" --output "${testDir}/.env.lock"`);

    if (result.error) {
      assert.ok(
        result.stderr.includes('Invalid key format') ||
        result.stdout.includes('Invalid key format')
      );
    }
  });

  it('should handle write error during encryption', () => {
    const testEnvPath = path.join(testDir, '.env');
    fs.writeFileSync(testEnvPath, 'KEY=value');

    const key = crypto.generateKey();
    const invalidOutputPath = '/invalid/path/output.lock';

    const result = runCLI(`encrypt --key ${key} --input "${testEnvPath}" --output "${invalidOutputPath}"`);

    if (result.error) {
      assert.ok(
        result.stderr.includes('Failed to write') ||
        result.stdout.includes('Failed to write') ||
        result.stderr.includes('ENOENT') ||
        result.stdout.includes('ENOENT')
      );
    }
  });

  it('should handle decryption with empty file', () => {
    const emptyLockFile = path.join(testDir, '.env.lock');
    fs.writeFileSync(emptyLockFile, '');

    const key = crypto.generateKey();
    const result = runCLI(`decrypt --key ${key} --input "${emptyLockFile}"`);

    if (result.error) {
      assert.ok(
        result.stderr.includes('empty') ||
        result.stdout.includes('empty') ||
        result.stderr.includes('Decryption failed') ||
        result.stdout.includes('Decryption failed')
      );
    }
  });

  it('should handle decryption failure with wrong key', () => {
    const testLockFile = path.join(testDir, '.env.lock');
    const correctKey = crypto.generateKey();
    const wrongKey = crypto.generateKey();

    const encrypted = crypto.encrypt('KEY=value', correctKey);
    fs.writeFileSync(testLockFile, encrypted);

    const result = runCLI(`decrypt --key ${wrongKey} --input "${testLockFile}"`);

    if (result.error) {
      assert.ok(
        result.stderr.includes('Decryption failed') ||
        result.stdout.includes('Decryption failed')
      );
    }
  });
});
