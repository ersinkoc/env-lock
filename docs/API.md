# API Reference

Complete API documentation for `@oxog/env-lock`.

## Table of Contents

- [Runtime API](#runtime-api)
  - [config()](#config)
  - [configAsync()](#configasync) ⭐ New
  - [load()](#load)
  - [loadAsync()](#loadasync) ⭐ New
- [Encryption API](#encryption-api)
  - [generateKey()](#generatekey)
  - [encrypt()](#encrypt)
  - [decrypt()](#decrypt)
  - [clearRateLimit()](#clearratelimit) ⭐ New
- [Parser API](#parser-api)
  - [parse()](#parse)
  - [stringify()](#stringify)
- [Security Features](#security-features) 🔒 New
  - [Input Validation](#input-validation)
  - [Rate Limiting](#rate-limiting)
  - [Memory Security](#memory-security)
  - [Path Security](#path-security)
- [Constants](#constants)
- [CLI Commands](#cli-commands)
  - [encrypt](#cli-encrypt)
  - [decrypt](#cli-decrypt)
  - [generate-key](#cli-generate-key)
  - [help](#cli-help)

---

## Runtime API

### config()

Loads and decrypts `.env.lock` file, injecting variables into `process.env`.

#### Syntax

```javascript
const result = config([options])
```

#### Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `options` | Object | `{}` | Configuration options |
| `options.path` | string | `.env.lock` | Path to encrypted file |
| `options.encoding` | string | `utf8` | File encoding |
| `options.override` | boolean | `false` | Override existing env vars |
| `options.silent` | boolean | `false` | Suppress console output |

#### Returns

- **Object**: Parsed environment variables (empty object on failure)

#### Behavior

1. Checks for `OXOG_ENV_KEY` environment variable
2. Returns empty object if key is missing
3. Reads and decrypts `.env.lock` file
4. Parses decrypted content
5. Injects variables into `process.env`
6. Does not override existing variables by default

#### Examples

```javascript
const envLock = require('@oxog/env-lock');

// Basic usage
envLock.config();

// Custom path
envLock.config({
  path: '/app/config/.env.production.lock'
});

// Override existing variables
envLock.config({
  override: true
});

// Silent mode (no console output)
envLock.config({
  silent: true
});

// Get loaded variables
const vars = envLock.config();
console.log(Object.keys(vars)); // ['DATABASE_URL', 'API_KEY', ...]
```

#### Error Handling

The method returns an empty object on any error:
- Missing `OXOG_ENV_KEY`
- File not found
- Decryption failure
- Invalid file format

Errors are logged to console unless `silent: true`.

---

### configAsync()

⭐ **New in v1.1.0** - Asynchronous version of `config()` for non-blocking I/O operations.

#### Syntax

```javascript
const result = await configAsync([options])
```

#### Parameters

Same as [`config()`](#config).

#### Returns

- **Promise\<Object\>**: Promise resolving to parsed environment variables

#### Behavior

Identical to `config()` but uses asynchronous file I/O operations, making it suitable for:
- Production web servers
- High-concurrency applications
- Event-driven architectures

#### Examples

```javascript
const envLock = require('@oxog/env-lock');

// Basic async usage
async function loadConfig() {
  const vars = await envLock.configAsync();
  console.log('Loaded:', Object.keys(vars));
}

// In Express.js
app.use(async (req, res, next) => {
  await envLock.configAsync({ silent: true });
  next();
});

// With error handling
try {
  const vars = await envLock.configAsync({
    path: '.env.production.lock',
    override: true
  });
  console.log('Config loaded successfully');
} catch (error) {
  console.error('Failed to load config:', error);
}
```

#### Performance

**Synchronous (config):**
- Blocks event loop during file I/O
- Suitable for CLI tools and startup scripts

**Asynchronous (configAsync):**
- Non-blocking I/O
- Recommended for production servers
- Enables concurrent request handling

---

### load()

Alias for [`config()`](#config). Provided for compatibility.

#### Syntax

```javascript
const result = load([options])
```

See [`config()`](#config) for details.

---

### loadAsync()

⭐ **New in v1.1.0** - Asynchronous version of `load()`.

#### Syntax

```javascript
const result = await loadAsync([options])
```

Alias for [`configAsync()`](#configasync). See above for details.

---

## Encryption API

### generateKey()

Generates a cryptographically secure random encryption key.

#### Syntax

```javascript
const key = generateKey()
```

#### Parameters

None.

#### Returns

- **string**: 64-character hexadecimal string (32 bytes)

#### Examples

```javascript
const { generateKey } = require('@oxog/env-lock');

const key = generateKey();
console.log(key);
// Output: '9eb8f2c44cf801f70c0ec77412671dbe00804b589c7771b766e685b875318df7'

console.log(key.length); // 64
```

#### Security Notes

- Uses `crypto.randomBytes(32)` for cryptographically secure randomness
- Each call generates a unique key
- Keys are suitable for AES-256-GCM encryption

---

### encrypt()

Encrypts plaintext using AES-256-GCM.

#### Syntax

```javascript
const encrypted = encrypt(text, keyHex)
```

#### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `text` | string | Plaintext to encrypt |
| `keyHex` | string | 64-character hex key (32 bytes) |

#### Returns

- **string**: Encrypted data in format `IV:AUTH_TAG:ENCRYPTED_DATA` (all hex)

#### Throws

- `Error`: If text is not a string
- `Error`: If key is invalid (wrong length or format)
- `Error`: If encryption fails

#### Examples

```javascript
const { encrypt, generateKey } = require('@oxog/env-lock');

const key = generateKey();
const plaintext = 'DATABASE_URL=postgresql://localhost/db';

const encrypted = encrypt(plaintext, key);
console.log(encrypted);
// Output: '0a1b2c3d...:4e5f6a...:7b8c9d...'

// Encrypt empty string (valid)
const emptyEncrypted = encrypt('', key);

// Encrypt large data
const largeData = 'X'.repeat(1000000);
const largeEncrypted = encrypt(largeData, key);
```

#### Security Features

- **AES-256-GCM**: Authenticated encryption
- **Random IV**: 12-byte unique IV per encryption
- **Auth Tag**: 16-byte tag for tamper detection
- **Format**: `IV_HEX:AUTH_TAG_HEX:ENCRYPTED_DATA_HEX`

---

### decrypt()

Decrypts ciphertext using AES-256-GCM.

#### Syntax

```javascript
const decrypted = decrypt(cipherText, keyHex)
```

#### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `cipherText` | string | Encrypted data from `encrypt()` |
| `keyHex` | string | 64-character hex key (32 bytes) |

#### Returns

- **string**: Decrypted plaintext

#### Throws

- `Error`: If cipherText is invalid
- `Error`: If key is invalid
- `Error`: If decryption fails (wrong key or tampered data)
- `Error`: If authentication fails

#### Examples

```javascript
const { encrypt, decrypt, generateKey } = require('@oxog/env-lock');

const key = generateKey();
const plaintext = 'SECRET=my_secret_value';

// Encrypt
const encrypted = encrypt(plaintext, key);

// Decrypt
const decrypted = decrypt(encrypted, key);
console.log(decrypted); // 'SECRET=my_secret_value'

// Wrong key throws error
const wrongKey = generateKey();
try {
  decrypt(encrypted, wrongKey);
} catch (error) {
  console.error('Decryption failed:', error.message);
  // Output: 'Decryption failed: Invalid key or tampered data detected'
}

// Tampered data throws error
const tampered = encrypted.replace('a', 'b');
try {
  decrypt(tampered, key);
} catch (error) {
  console.error('Tamper detected:', error.message);
}
```

#### Security Notes

- Validates authentication tag before decryption
- Detects any tampering with IV, auth tag, or encrypted data
- Throws error if authentication fails
- Constant-time comparison for tags (via Node.js crypto)

---

## Parser API

### parse()

Parses `.env` file content into a key-value object.

#### Syntax

```javascript
const parsed = parse(content)
```

#### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `content` | string | .env file content to parse |

#### Returns

- **Object**: Parsed key-value pairs (empty object on invalid input)

#### Features

- ✅ `KEY=VALUE` format
- ✅ Comments (`#` at line start)
- ✅ Single quotes (`'value'`)
- ✅ Double quotes (`"value"`)
- ✅ Escape sequences (`\n`, `\r`, `\t`, `\"`, `\\`)
- ✅ Multiline values (in quotes)
- ✅ Inline comments (`KEY=value # comment`)
- ✅ Empty values (`KEY=`)
- ✅ Whitespace trimming

#### Examples

```javascript
const { parse } = require('@oxog/env-lock');

// Basic parsing
const content = `
KEY1=value1
KEY2=value2
# This is a comment
KEY3=value3
`;
const parsed = parse(content);
// { KEY1: 'value1', KEY2: 'value2', KEY3: 'value3' }

// Quoted values
const quoted = `
SIMPLE='single quoted'
DOUBLE="double quoted"
SPACES="  value with spaces  "
`;
const quotedParsed = parse(quoted);
// {
//   SIMPLE: 'single quoted',
//   DOUBLE: 'double quoted',
//   SPACES: '  value with spaces  '
// }

// Escape sequences
const escaped = `
NEWLINE="line1\\nline2"
TAB="col1\\tcol2"
QUOTE="say \\"hello\\""
`;
const escapedParsed = parse(escaped);
// {
//   NEWLINE: 'line1\nline2',
//   TAB: 'col1\tcol2',
//   QUOTE: 'say "hello"'
// }

// Inline comments
const inline = `
KEY=value # this is ignored
OTHER="value # not ignored"
`;
const inlineParsed = parse(inline);
// { KEY: 'value', OTHER: 'value # not ignored' }
```

---

### stringify()

Serializes an object into `.env` file format.

#### Syntax

```javascript
const content = stringify(obj)
```

#### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `obj` | Object | Key-value pairs to serialize |

#### Returns

- **string**: Serialized .env content (empty string on invalid input)

#### Behavior

- Converts values to strings
- Quotes values containing special characters
- Escapes quotes and backslashes
- Handles multiline values
- Skips invalid keys

#### Examples

```javascript
const { stringify } = require('@oxog/env-lock');

// Basic serialization
const obj = {
  KEY1: 'value1',
  KEY2: 'value2',
  PORT: 3000  // number converted to string
};
const content = stringify(obj);
// Output:
// KEY1=value1
// KEY2=value2
// PORT=3000

// Values with special characters
const special = {
  SIMPLE: 'value',
  SPACES: '  value with spaces  ',
  NEWLINE: 'line1\nline2',
  QUOTE: 'say "hello"',
  BACKSLASH: 'path\\to\\file'
};
const specialContent = stringify(special);
// Output:
// SIMPLE=value
// SPACES="  value with spaces  "
// NEWLINE="line1\\nline2"
// QUOTE="say \\"hello\\""
// BACKSLASH="path\\\\to\\\\file"
```

---

## Constants

Cryptographic constants exported for reference.

```javascript
const {
  ALGORITHM,
  KEY_LENGTH,
  IV_LENGTH,
  AUTH_TAG_LENGTH
} = require('@oxog/env-lock');

console.log(ALGORITHM);       // 'aes-256-gcm'
console.log(KEY_LENGTH);      // 32 (bytes)
console.log(IV_LENGTH);       // 12 (bytes)
console.log(AUTH_TAG_LENGTH); // 16 (bytes)
```

---

## CLI Commands

### CLI: encrypt

Encrypts `.env` file to `.env.lock`.

#### Usage

```bash
env-lock encrypt [options]
```

#### Options

| Option | Alias | Description | Default |
|--------|-------|-------------|---------|
| `--key <key>` | `-k` | Encryption key (hex) | Auto-generated |
| `--input <file>` | `-i` | Input file path | `.env` |
| `--output <file>` | `-o` | Output file path | `.env.lock` |

#### Examples

```bash
# Encrypt with auto-generated key
env-lock encrypt

# Encrypt with existing key
env-lock encrypt --key 9eb8f2c44cf801f70c0ec77412671dbe...

# Encrypt custom files
env-lock encrypt --input .env.production --output .env.production.lock

# Short options
env-lock encrypt -k 9eb8f2c... -i .env.staging -o .env.staging.lock
```

#### Output

```
✓ Encrypted /path/to/.env → /path/to/.env.lock

======================================================================
IMPORTANT: Save this encryption key securely!
======================================================================

OXOG_ENV_KEY=9eb8f2c44cf801f70c0ec77412671dbe00804b589c7771b766e685b875318df7

======================================================================
⚠ You will need this key to decrypt the .env.lock file.
⚠ Store it in a secure location (e.g., password manager, CI/CD secrets).
⚠ Without this key, the encrypted data cannot be recovered!
======================================================================
```

---

### CLI: decrypt

Decrypts `.env.lock` file to stdout.

#### Usage

```bash
env-lock decrypt [options]
```

#### Options

| Option | Alias | Description | Default |
|--------|-------|-------------|---------|
| `--key <key>` | `-k` | Decryption key (hex) | `$OXOG_ENV_KEY` |
| `--input <file>` | `-i` | Input file path | `.env.lock` |

#### Examples

```bash
# Decrypt with key from environment variable
OXOG_ENV_KEY=9eb8f2c... env-lock decrypt

# Decrypt with key option
env-lock decrypt --key 9eb8f2c...

# Decrypt custom file
env-lock decrypt --input .env.production.lock

# Save to file
env-lock decrypt > .env.decrypted
```

#### Output

```
DATABASE_URL=postgresql://localhost:5432/mydb
API_KEY=sk_test_1234567890
SECRET_TOKEN=my_super_secret_token
DEBUG=true
PORT=3000
```

---

### CLI: generate-key

Generates a new encryption key.

#### Usage

```bash
env-lock generate-key
```

#### Examples

```bash
# Generate key
env-lock generate-key

# Save to file
env-lock generate-key > .env.key

# Use in script
KEY=$(env-lock generate-key | grep OXOG_ENV_KEY | cut -d'=' -f2)
```

#### Output

```
======================================================================
Generated new encryption key:
======================================================================

OXOG_ENV_KEY=493cb16b98a87ce1d968aace15fbb7404fdd2fa942cf1c76251bc4a71601d6c3

======================================================================
Save this key securely. You will need it to encrypt/decrypt your .env files.
======================================================================
```

---

### CLI: help

Shows help information.

#### Usage

```bash
env-lock help
env-lock --help
env-lock -h
```

---

## Type Definitions

```typescript
// Runtime API
interface ConfigOptions {
  path?: string;
  encoding?: string;
  override?: boolean;
  silent?: boolean;
}

function config(options?: ConfigOptions): Record<string, string>;
function load(options?: ConfigOptions): Record<string, string>;

// Encryption API
function generateKey(): string;
function encrypt(text: string, keyHex: string): string;
function decrypt(cipherText: string, keyHex: string): string;

// Parser API
function parse(content: string): Record<string, string>;
function stringify(obj: Record<string, any>): string;

// Constants
const ALGORITHM: 'aes-256-gcm';
const KEY_LENGTH: 32;
const IV_LENGTH: 12;
const AUTH_TAG_LENGTH: 16;
```

---

## Error Codes

| Error | Cause | Solution |
|-------|-------|----------|
| `Text to encrypt must be a string` | Invalid input to `encrypt()` | Pass string value |
| `Encryption key must be a non-empty string` | Missing or invalid key | Provide 64-char hex key |
| `Key must be 32 bytes` | Wrong key length | Use `generateKey()` |
| `Invalid cipher text format` | Corrupted encrypted data | Re-encrypt source |
| `Invalid key or tampered data detected` | Wrong key or modified data | Check key and file |
| `OXOG_ENV_KEY environment variable is not set` | Missing runtime key | Set environment variable |
| `.env.lock file not found` | Missing encrypted file | Run `encrypt` command |

---

## Security Considerations

### Key Management
- **Never commit keys** to version control
- Store keys securely (password managers, secret managers)
- Use different keys per environment
- Rotate keys periodically (every 90 days)

### Encryption
- AES-256-GCM provides authenticated encryption
- Random IVs prevent pattern analysis
- Authentication tags detect tampering
- Constant-time comparisons prevent timing attacks

### Best Practices
- ✅ Commit `.env.lock` (it's encrypted)
- ✅ Share keys via secure channels
- ✅ Test decryption in CI/CD
- ❌ Never commit `.env` files
- ❌ Never hardcode keys in code
- ❌ Never share keys via email/Slack

---

## Performance

| Operation | Throughput | Notes |
|-----------|------------|-------|
| Key generation | ~100,000/sec | Cryptographically secure |
| Encryption | ~50 MB/sec | Including IV generation |
| Decryption | ~60 MB/sec | Including auth verification |
| Parsing | ~10 MB/sec | Complex .env format |

*Benchmarks on Node.js 18, Intel i7, typical .env files (<10KB)*

---

## Browser Compatibility

`@oxog/env-lock` is designed for **Node.js only**. It uses:
- `node:crypto` (not available in browsers)
- `node:fs` (file system operations)
- `node:process` (environment variables)

For browser environments, use alternative solutions or build-time encryption.

---

## Version History

### v1.0.0 (Current)
- Initial release
- AES-256-GCM encryption
- Zero dependencies
- CLI tool
- Runtime API
- 99.5%+ test coverage

---

## License

MIT © Ersin Koc

## Support

- **Documentation**: [README.md](../README.md)
- **Examples**: [examples/](../examples/)
- **Issues**: [GitHub Issues](https://github.com/ersinkoc/env-lock/issues)
