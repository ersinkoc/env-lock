#!/usr/bin/env node

/**
 * @oxog/env-lock - CLI Tool
 *
 * Command-line interface for encrypting and decrypting .env files
 *
 * Commands:
 *   encrypt - Encrypt .env file to .env.lock
 *   decrypt - Decrypt .env.lock file to stdout
 *   help    - Show help information
 *
 * @author Ersin Koc
 * @license MIT
 */

const fs = require('node:fs');
const path = require('node:path');
const { encrypt, decrypt, generateKey } = require('../src/crypto');

/**
 * Validates file path to prevent path traversal attacks
 * @param {string} filePath - File path to validate
 * @param {boolean} mustExist - If true, path must exist (for symlink resolution)
 * @returns {string} Validated absolute path
 * @throws {Error} If path is invalid or attempts traversal
 */
function validateFilePath(filePath, mustExist = false) {
  // Normalize the path to resolve any . or .. segments
  const normalizedPath = path.normalize(filePath);

  // Reject paths that escape current directory using ..
  // This checks if the normalized path tries to go up beyond current directory
  if (normalizedPath.startsWith('..') || normalizedPath.includes(path.sep + '..')) {
    throw new Error('Path traversal detected: paths containing ".." are not allowed');
  }

  // Resolve to absolute path
  let resolvedPath = path.resolve(process.cwd(), normalizedPath);

  // If file must exist, resolve symlinks to get real path
  // This prevents symlink-based directory traversal attacks
  if (mustExist) {
    try {
      resolvedPath = fs.realpathSync(resolvedPath);
    } catch (err) {
      if (err.code === 'ENOENT') {
        throw new Error(`File not found: ${filePath}`);
      }
      throw err;
    }
  }

  // Get real path of current working directory to handle symlinks in cwd itself
  const realCwd = fs.realpathSync(process.cwd());
  const cwdWithSep = realCwd + path.sep;
  const resolvedWithSep = resolvedPath + path.sep;

  // Ensure resolved path is within or equal to current working directory
  if (!resolvedWithSep.startsWith(cwdWithSep) && resolvedPath !== realCwd) {
    throw new Error(`Path must be within current directory: ${process.cwd()}`);
  }

  return resolvedPath;
}

// Constants
const SEPARATOR_LENGTH = 70;
const KEY_FORMAT_REGEX = /^[0-9a-fA-F]{64}$/;

// ANSI color codes for better CLI output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

/**
 * Validates encryption key format
 * @param {string} key - Key to validate
 * @throws {Error} If key format is invalid
 */
function validateKeyFormat(key) {
  if (!KEY_FORMAT_REGEX.test(key)) {
    throw new Error('Invalid key format. Key must be 64 hexadecimal characters (32 bytes)');
  }
}

/**
 * Prints colored output to console
 */
function print(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

/**
 * Prints error message and exits
 */
function error(message) {
  print(`✗ Error: ${message}`, 'red');
  process.exit(1);
}

/**
 * Prints success message
 */
function success(message) {
  print(`✓ ${message}`, 'green');
}

/**
 * Prints warning message
 */
function warn(message) {
  print(`⚠ ${message}`, 'yellow');
}

/**
 * Prints info message
 */
function info(message) {
  print(message, 'cyan');
}

/**
 * Shows help information
 */
function showHelp() {
  print('\n@oxog/env-lock - Secure environment variable encryption tool\n', 'bright');

  console.log('USAGE:');
  console.log('  env-lock <command> [options]\n');

  console.log('COMMANDS:');
  console.log('  encrypt [--key <key>] [--input <file>] [--output <file>]');
  console.log('    Encrypt .env file to .env.lock');
  console.log('    Options:');
  console.log('      --key, -k      Encryption key (hex). If not provided, generates a new one');
  console.log('      --input, -i    Input file path (default: .env)');
  console.log('      --output, -o   Output file path (default: .env.lock)');
  console.log('');
  console.log('  decrypt [--key <key>] [--input <file>]');
  console.log('    Decrypt .env.lock file and print to stdout');
  console.log('    Options:');
  console.log('      --key, -k      Decryption key (hex). Can also use OXOG_ENV_KEY env var');
  console.log('      --input, -i    Input file path (default: .env.lock)');
  console.log('');
  console.log('  generate-key');
  console.log('    Generate a new random encryption key');
  console.log('');
  console.log('  help, --help, -h');
  console.log('    Show this help message\n');

  console.log('EXAMPLES:');
  console.log('  # Encrypt .env file (generates new key)');
  console.log('  env-lock encrypt');
  console.log('');
  console.log('  # Encrypt with existing key');
  console.log('  env-lock encrypt --key abcd1234...');
  console.log('');
  console.log('  # Decrypt and view contents');
  console.log('  OXOG_ENV_KEY=abcd1234... env-lock decrypt');
  console.log('');
  console.log('  # Generate a new key');
  console.log('  env-lock generate-key\n');

  console.log('For more information, visit: https://github.com/ersinkoc/env-lock\n');
}

/**
 * Parses command-line arguments
 */
function parseArgs(args) {
  const result = {
    command: null,
    options: {}
  };

  if (args.length === 0) {
    return result;
  }

  // First argument is the command
  result.command = args[0];

  // Parse options
  for (let i = 1; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--key' || arg === '-k') {
      i++;
      if (i >= args.length || args[i].startsWith('-')) {
        error('Option --key requires a value');
      }
      result.options.key = args[i];
    } else if (arg === '--input' || arg === '-i') {
      i++;
      if (i >= args.length || args[i].startsWith('-')) {
        error('Option --input requires a value');
      }
      result.options.input = args[i];
    } else if (arg === '--output' || arg === '-o') {
      i++;
      if (i >= args.length || args[i].startsWith('-')) {
        error('Option --output requires a value');
      }
      result.options.output = args[i];
    } else if (arg.startsWith('-')) {
      // Unknown option
      error(`Unknown option: ${arg}\nRun 'env-lock help' for usage information`);
    }
  }

  return result;
}

/**
 * Encrypts .env file to .env.lock
 */
function commandEncrypt(options) {
  // Validate paths to prevent path traversal attacks
  // Input must exist (for symlink resolution), output doesn't need to exist yet
  let inputPath, outputPath;
  try {
    inputPath = validateFilePath(options.input || '.env', true);  // mustExist=true
    outputPath = validateFilePath(options.output || '.env.lock', false);  // mustExist=false
  } catch (err) {
    error(err.message);
  }

  // Read input file
  let content;
  try {
    content = fs.readFileSync(inputPath, 'utf8');
  } catch (err) {
    error(`Failed to read input file: ${err.message}`);
  }

  if (!content.trim()) {
    warn('Input file is empty');
  }

  // Get or generate encryption key
  let key = options.key || process.env.OXOG_ENV_KEY;
  let isNewKey = false;

  if (!key) {
    key = generateKey();
    isNewKey = true;
    info('No encryption key provided. Generated a new key.');
  }

  // Validate key format
  try {
    validateKeyFormat(key);
  } catch (err) {
    error(err.message);
  }

  // Encrypt content
  let encrypted;
  try {
    encrypted = encrypt(content, key);
  } catch (err) {
    error(`Encryption failed: ${err.message}`);
  }

  // Write output file
  try {
    fs.writeFileSync(outputPath, encrypted, 'utf8');
  } catch (err) {
    error(`Failed to write output file: ${err.message}`);
  }

  // Print success message
  success(`Encrypted ${inputPath} → ${outputPath}`);

  if (isNewKey) {
    print('\n' + '='.repeat(SEPARATOR_LENGTH), 'dim');
    print('IMPORTANT: Save this encryption key securely!', 'yellow');
    print('='.repeat(SEPARATOR_LENGTH), 'dim');
    print(`\nOXOG_ENV_KEY=${key}\n`, 'bright');
    print('='.repeat(SEPARATOR_LENGTH), 'dim');
    warn('You will need this key to decrypt the .env.lock file.');
    warn('Store it in a secure location (e.g., password manager, CI/CD secrets).');
    warn('Without this key, the encrypted data cannot be recovered!');
    print('='.repeat(SEPARATOR_LENGTH) + '\n', 'dim');
  }
}

/**
 * Decrypts .env.lock file and prints to stdout
 */
function commandDecrypt(options) {
  // Validate path to prevent path traversal attacks
  // Input must exist (for symlink resolution)
  let inputPath;
  try {
    inputPath = validateFilePath(options.input || '.env.lock', true);  // mustExist=true
  } catch (err) {
    error(err.message);
  }

  // Get decryption key
  const key = options.key || process.env.OXOG_ENV_KEY;

  if (!key) {
    error('Decryption key not provided. Set OXOG_ENV_KEY environment variable or use --key option');
  }

  // Validate key format
  try {
    validateKeyFormat(key);
  } catch (err) {
    error(err.message);
  }

  // Read encrypted file
  let encryptedContent;
  try {
    encryptedContent = fs.readFileSync(inputPath, 'utf8').trim();
  } catch (err) {
    error(`Failed to read input file: ${err.message}`);
  }

  if (!encryptedContent) {
    error('Input file is empty');
  }

  // Decrypt content
  let decrypted;
  try {
    decrypted = decrypt(encryptedContent, key);
  } catch (err) {
    error(`Decryption failed: ${err.message}`);
  }

  // Print decrypted content to stdout
  console.log(decrypted);
}

/**
 * Generates a new encryption key
 */
function commandGenerateKey() {
  const key = generateKey();
  print('\n' + '='.repeat(70), 'dim');
  print('Generated new encryption key:', 'green');
  print('='.repeat(70), 'dim');
  print(`\nOXOG_ENV_KEY=${key}\n`, 'bright');
  print('='.repeat(70), 'dim');
  info('Save this key securely. You will need it to encrypt/decrypt your .env files.');
  print('='.repeat(70) + '\n', 'dim');
}

/**
 * Main CLI entry point
 */
function main() {
  const args = process.argv.slice(2);
  const { command, options } = parseArgs(args);

  // Handle no command
  if (!command) {
    showHelp();
    process.exit(0);
  }

  // Handle commands
  switch (command.toLowerCase()) {
    case 'encrypt':
      commandEncrypt(options);
      break;

    case 'decrypt':
      commandDecrypt(options);
      break;

    case 'generate-key':
    case 'genkey':
      commandGenerateKey();
      break;

    case 'help':
    case '--help':
    case '-h':
      showHelp();
      break;

    default:
      print(`✗ Error: Unknown command: ${command}\n`, 'red');
      showHelp();
      process.exit(1);
  }
}

// Run CLI
main();
