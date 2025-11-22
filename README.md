# @oxog/env-lock

[![npm version](https://badge.fury.io/js/%40oxog%2Fenv-lock.svg)](https://www.npmjs.com/package/@oxog/env-lock)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**Zero-dependency tool to encrypt `.env` files into secure `.env.lock` files using AES-256-GCM encryption.**

Safely commit encrypted environment variables to version control while keeping sensitive data secure. Perfect for teams that want to share environment configurations without exposing secrets.

📚 **[View Full Documentation & Examples](https://ersinkoc.github.io/env-lock/)** (Website will be available after enabling GitHub Pages)

## Features

### Core Features
- **🔐 Military-Grade Encryption**: AES-256-GCM authenticated encryption
- **🚀 Zero Dependencies**: Uses only native Node.js modules
- **📦 Lightweight**: Minimal footprint, maximum security
- **🔑 Key Management**: Secure key generation and management
- **🛠️ CLI & Runtime API**: Flexible usage patterns
- **✨ Simple API**: Drop-in replacement for dotenv
- **🔒 Tamper Detection**: GCM authentication prevents data tampering

### 🔒 Security Features (v1.1.0+)
- **⚡ Async Operations**: Non-blocking I/O for production servers
- **🛡️ Rate Limiting**: Prevents brute force attacks (10 attempts/min)
- **🚫 Input Validation**: 10MB size limits prevent DoS attacks
- **🔐 Memory Security**: Automatic buffer cleanup after crypto operations
- **🛑 Path Protection**: Prevents directory traversal attacks in CLI
- **🔑 Key Validation**: Blocks dangerous environment variable names
- **⏱️ Timing Attack Prevention**: Constant-time error responses
- **🏃 Race Condition Fixes**: Atomic file operations (TOCTOU prevention)

**Security Posture:** 9.0/10 - Production ready ✅

## Installation

```bash
npm install @oxog/env-lock
```

Or use directly with npx:

```bash
npx @oxog/env-lock encrypt
```

## Quick Start

### 1. Encrypt Your .env File

```bash
# Encrypt .env file (generates a new encryption key)
npx @oxog/env-lock encrypt

# Output:
# ✓ Encrypted .env → .env.lock
#
# ======================================================================
# IMPORTANT: Save this encryption key securely!
# ======================================================================
#
# OXOG_ENV_KEY=abcd1234567890abcd1234567890abcd1234567890abcd1234567890abcd
#
# ======================================================================
```

**Important**: Save the `OXOG_ENV_KEY` in a secure location:
- Add it to your CI/CD environment variables
- Store it in a password manager
- Share it securely with your team (e.g., 1Password, LastPass)

### 2. Commit .env.lock to Version Control

```bash
git add .env.lock
git commit -m "Add encrypted environment variables"
git push
```

The `.env.lock` file is encrypted and safe to commit. Your actual `.env` file should remain in `.gitignore`.

### 3. Load Variables at Runtime

#### Synchronous (CLI tools, scripts)

```javascript
// Load as early as possible in your application
require('@oxog/env-lock').config();

// Now use environment variables as normal
console.log(process.env.DATABASE_URL);
console.log(process.env.API_KEY);
```

#### Asynchronous (Recommended for servers) ⭐ New

```javascript
// For production servers - non-blocking I/O
const envLock = require('@oxog/env-lock');

async function startServer() {
  // Load environment variables without blocking
  await envLock.configAsync();

  // Now start your server
  const app = require('./app');
  app.listen(process.env.PORT || 3000);
}

startServer();
```

**Why use async?**
- ✅ Non-blocking I/O for better performance
- ✅ Ideal for Express, Fastify, Koa servers
- ✅ Prevents event loop blocking
- ✅ Safe for high-concurrency applications

### 4. Set the Encryption Key in Production

```bash
# On your server or CI/CD platform
export OXOG_ENV_KEY=abcd1234567890abcd1234567890abcd1234567890abcd1234567890abcd

# Then start your application
node index.js
```

## CLI Usage

### Commands

#### `encrypt` - Encrypt .env to .env.lock

```bash
# Encrypt with auto-generated key
env-lock encrypt

# Encrypt with existing key
env-lock encrypt --key abcd1234...

# Encrypt custom files
env-lock encrypt --input .env.production --output .env.production.lock
```

**Options:**
- `--key, -k`: Encryption key (hex). If not provided, generates a new one
- `--input, -i`: Input file path (default: `.env`)
- `--output, -o`: Output file path (default: `.env.lock`)

#### `decrypt` - Decrypt .env.lock to stdout

```bash
# Decrypt and view contents (key from environment variable)
OXOG_ENV_KEY=abcd1234... env-lock decrypt

# Decrypt with key option
env-lock decrypt --key abcd1234...

# Decrypt custom file
env-lock decrypt --input .env.production.lock
```

**Options:**
- `--key, -k`: Decryption key (hex). Can also use `OXOG_ENV_KEY` env var
- `--input, -i`: Input file path (default: `.env.lock`)

#### `generate-key` - Generate a new encryption key

```bash
env-lock generate-key

# Output:
# ======================================================================
# Generated new encryption key:
# ======================================================================
#
# OXOG_ENV_KEY=abcd1234567890abcd1234567890abcd1234567890abcd1234567890abcd
#
# ======================================================================
```

#### `help` - Show help information

```bash
env-lock help
```

## Runtime API

### `config([options])`

Loads and decrypts `.env.lock` file, injecting variables into `process.env`.

```javascript
const envLock = require('@oxog/env-lock');

// Load with defaults
envLock.config();

// Load with options
envLock.config({
  path: '/custom/path/to/.env.lock',
  override: false,  // Don't override existing env vars (default)
  silent: false     // Show warnings and errors (default)
});
```

**Options:**
- `path` (string): Path to `.env.lock` file (default: `.env.lock` in current directory)
- `encoding` (string): File encoding (default: `utf8`)
- `override` (boolean): Whether to override existing env variables (default: `false`)
- `silent` (boolean): Suppress warnings and errors (default: `false`)

**Returns:** Object containing parsed environment variables (empty object if failed)

### Advanced Usage

#### Direct Encryption/Decryption

```javascript
const { encrypt, decrypt, generateKey } = require('@oxog/env-lock');

// Generate a key
const key = generateKey();
console.log(key); // 64-character hex string

// Encrypt data
const plaintext = 'SECRET_KEY=my-secret-value';
const encrypted = encrypt(plaintext, key);
console.log(encrypted); // IV:AUTH_TAG:ENCRYPTED_DATA

// Decrypt data
const decrypted = decrypt(encrypted, key);
console.log(decrypted); // SECRET_KEY=my-secret-value
```

#### Custom .env Parsing

```javascript
const { parse, stringify } = require('@oxog/env-lock');

// Parse .env content
const content = 'KEY=value\nOTHER_KEY=other value';
const parsed = parse(content);
console.log(parsed); // { KEY: 'value', OTHER_KEY: 'other value' }

// Stringify to .env format
const obj = { KEY: 'value', OTHER_KEY: 'other value' };
const content = stringify(obj);
console.log(content); // KEY=value\nOTHER_KEY=other value
```

> **⚠️ Important:** Unquoted values are truncated at the first `#` character (inline comment support). Values containing `#` (like color codes or URLs with fragments) must be quoted:
> ```
> COLOR=#ff0000          # ❌ Truncated to empty string
> COLOR="#ff0000"        # ✅ Preserved as #ff0000
> URL="https://ex.com#" # ✅ Quotes preserve # character
> ```

## How It Works

### Encryption Process

1. **Key Generation**: A 32-byte (256-bit) encryption key is randomly generated
2. **IV Generation**: A unique 12-byte initialization vector is created for each encryption
3. **AES-256-GCM Encryption**: Content is encrypted using authenticated encryption
4. **Output Format**: Result is stored as `IV:AUTH_TAG:ENCRYPTED_DATA` (all in hex)

### Decryption Process

1. **Key Retrieval**: Reads `OXOG_ENV_KEY` from environment variables
2. **File Reading**: Reads the `.env.lock` file
3. **Format Parsing**: Splits the content into IV, auth tag, and encrypted data
4. **Authentication**: Verifies data integrity using GCM auth tag
5. **Decryption**: Decrypts content using AES-256-GCM
6. **Injection**: Parses and injects variables into `process.env`

### Security Features

- **AES-256-GCM**: Industry-standard authenticated encryption
- **Random IVs**: Each encryption uses a unique initialization vector
- **Tamper Detection**: GCM authentication tag prevents data modification
- **No Dependencies**: Zero third-party dependencies reduces attack surface
- **Secure Key Storage**: Keys are never stored in the codebase

## Best Practices

### 1. Key Management

- **Never commit the encryption key** to version control
- Store keys in secure locations (password managers, secrets management services)
- Use different keys for different environments (dev, staging, production)
- Rotate keys periodically

### 2. Environment Setup

```bash
# Development
export OXOG_ENV_KEY=dev_key_here

# CI/CD (GitHub Actions example)
# Set OXOG_ENV_KEY as a repository secret

# Production (Docker example)
docker run -e OXOG_ENV_KEY=prod_key_here myapp
```

### 3. Multi-Environment Setup

```bash
# Encrypt different environment files
env-lock encrypt --input .env.development --output .env.development.lock
env-lock encrypt --input .env.production --output .env.production.lock

# Load appropriate file at runtime
envLock.config({ path: `.env.${process.env.NODE_ENV}.lock` });
```

### 4. Rotation Strategy

```bash
# Generate new key
env-lock generate-key

# Re-encrypt with new key
env-lock encrypt --key NEW_KEY_HERE

# Update OXOG_ENV_KEY in all environments
# Deploy updated .env.lock file
```

## Comparison with dotenv

| Feature | @oxog/env-lock | dotenv |
|---------|----------------|--------|
| Load .env files | ✅ | ✅ |
| Zero dependencies | ✅ | ❌ |
| Encryption support | ✅ | ❌ |
| Safe for version control | ✅ | ❌ |
| Tamper detection | ✅ | ❌ |
| CLI tool included | ✅ | ❌ |

## FAQ

### Q: Can I commit .env.lock to Git?

**A:** Yes! The `.env.lock` file is encrypted and safe to commit. This is the main advantage of using env-lock.

### Q: What happens if I lose the encryption key?

**A:** The encrypted data cannot be recovered without the key. Always back up your keys securely.

### Q: Can I use this with Docker?

**A:** Yes! Pass the encryption key as an environment variable:

```dockerfile
FROM node:18
WORKDIR /app
COPY . .
RUN npm install
ENV OXOG_ENV_KEY=your_key_here
CMD ["node", "index.js"]
```

### Q: Is this compatible with dotenv?

**A:** Yes! The API is designed to be a drop-in replacement. Just replace `require('dotenv')` with `require('@oxog/env-lock')`.

### Q: How do I share keys with my team?

**A:** Use secure methods like:
- Password managers (1Password, LastPass)
- Secrets management services (HashiCorp Vault, AWS Secrets Manager)
- Encrypted messaging (Signal, secure email)

### Q: What if OXOG_ENV_KEY is not set?

**A:** The library will skip decryption silently and log a warning. Your app will continue to run with existing environment variables.

## Security Considerations

- **Algorithm**: AES-256-GCM (authenticated encryption with associated data)
- **Key Size**: 256 bits (32 bytes)
- **IV Size**: 96 bits (12 bytes), randomly generated per encryption
- **Auth Tag**: 128 bits (16 bytes) for tamper detection
- **Dependencies**: Zero external dependencies to minimize attack surface

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT © Ersin Koc

## Support

- **Issues**: [GitHub Issues](https://github.com/ersinkoc/env-lock/issues)
- **Repository**: [github.com/ersinkoc/env-lock](https://github.com/ersinkoc/env-lock)

## Changelog

### v1.0.0 (Initial Release)

- AES-256-GCM encryption for .env files
- Zero dependencies
- CLI tool for encrypt/decrypt operations
- Runtime API for loading encrypted environment variables
- Custom .env parser
- Comprehensive documentation

---

Made with ❤️ by Ersin Koc
