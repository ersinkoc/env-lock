# Comprehensive Bug Analysis - @oxog/env-lock

## Analysis Date: 2025-12-25
## Package Version: 1.1.0

---

## Summary

| Category | Count |
|----------|-------|
| **CRITICAL** | 0 |
| **HIGH** | 1 |
| **MEDIUM** | 2 |
| **LOW** | 3 |
| **TOTAL BUGS FOUND** | 6 |

---

## BUG-001: Memory Leak in Rate Limiting Map

**Severity**: HIGH
**Category**: Memory Leak / Resource Management
**Location**: `src/crypto.js:38, 69-88, 94-106`

**Problem**:
The `failedAttempts` Map stores rate limiting data for failed decryption attempts but never cleans up old entries. Entries are only reset when the same key is tried again within the rate limit window. If an attacker tries many different encryption keys (or if different keys are used legitimately over time), the Map grows indefinitely, causing a memory leak.

**Proof**:
```javascript
// Current code (src/crypto.js:38)
const failedAttempts = new Map(); // Track failed attempts by key hash

// Rate limit check (lines 69-88)
function isRateLimited(keyHex) {
  const keyHash = crypto.createHash('sha256').update(keyHex).digest('hex');
  const now = Date.now();
  const attempts = failedAttempts.get(keyHash) || { count: 0, firstAttempt: now };

  // Reset if outside window
  if (now - attempts.firstAttempt > RATE_LIMIT_WINDOW) {
    failedAttempts.set(keyHash, { count: 0, firstAttempt: now });
    return false;
  }
  // ... but never deletes old entries
}

// Demonstration:
// Try 1000 different keys, each failing once:
for (let i = 0; i < 1000; i++) {
  const randomKey = generateKey();
  try {
    decrypt(someEncrypted, randomKey);
  } catch (e) {}
}
// Result: failedAttempts Map now has 1000 entries that will NEVER be cleaned up
```

**Root Cause**:
No automatic cleanup mechanism for entries older than `RATE_LIMIT_WINDOW`. The `clearRateLimit` function exists but is only called when manually invoked or when the same key is retried.

**Impact**:
Long-running Node.js processes (servers, daemons) that decrypt many files with different keys will experience unbounded memory growth.

---

## BUG-002: Overly Restrictive Environment Variable Key Blacklist

**Severity**: MEDIUM
**Category**: API Contract / Edge Case
**Location**: `src/index.js:17-29, 46`

**Problem**:
The `DANGEROUS_KEYS` Set blocks some legitimate environment variable names:
1. `NODE_DEBUG` - Legitimate Node.js debugging variable
2. `NODE_PATH` - Legitimate Node.js module path variable
3. `eval`, `require`, `module`, `exports` - These are JavaScript keywords, not dangerous as env var names

Setting `process.env.eval = "something"` doesn't affect the global `eval` function - it just sets a string property on `process.env`.

**Proof**:
```javascript
// Current code (src/index.js:17-29)
const DANGEROUS_KEYS = new Set([
  '__proto__',
  'constructor',
  'prototype',
  'NODE_OPTIONS',    // ✓ Correctly dangerous
  'NODE_PATH',       // ✗ Legitimate use case
  'NODE_DEBUG',      // ✗ Legitimate use case
  'NODE_REPL_HISTORY',
  'eval',            // ✗ Not dangerous as env var
  'require',         // ✗ Not dangerous as env var
  'module',          // ✗ Not dangerous as env var
  'exports'          // ✗ Not dangerous as env var
]);

// Demonstration:
const testEnv = 'NODE_DEBUG=http\nNODE_PATH=/custom/modules';
const encrypted = encrypt(testEnv, key);
const result = config({ path: testFile }); // silent: true

// Result: NODE_DEBUG and NODE_PATH are REJECTED even though they're valid
// User cannot use env-lock for legitimate Node.js debugging variables
```

**Root Cause**:
Overly cautious security approach that blocks legitimate environment variables. `NODE_OPTIONS` is dangerous (can inject `--require` for code execution), but `NODE_DEBUG` and `NODE_PATH` are safe. The JavaScript keywords (`eval`, `require`, etc.) have no security implications as env var names.

**Impact**:
Users cannot use env-lock to manage legitimate Node.js configuration like `NODE_DEBUG` or `NODE_PATH`, reducing the tool's utility.

---

## BUG-003: Significant Code Duplication Between config() and configAsync()

**Severity**: MEDIUM
**Category**: Code Quality / Maintainability
**Location**: `src/index.js:79-180, 188-289`

**Problem**:
The `config()` and `configAsync()` functions have nearly identical logic (110+ lines duplicated), differing only in sync vs async file reading. This violates DRY principle and creates maintenance burden - any bug fix must be applied twice.

**Proof**:
```javascript
// config() - lines 79-180 (102 lines)
function config(options = {}) {
  const { path: envLockPath = ..., encoding = 'utf8', override = false, silent = false } = options;
  const encryptionKey = process.env.OXOG_ENV_KEY;
  if (!encryptionKey) { /* ... */ return {}; }
  try {
    const encryptedContent = fs.readFileSync(envLockPath, encoding).trim(); // SYNC
    // ... 60+ lines of logic ...
  } catch (error) { /* ... */ }
}

// configAsync() - lines 188-289 (102 lines)
async function configAsync(options = {}) {
  const { path: envLockPath = ..., encoding = 'utf8', override = false, silent = false } = options;
  const encryptionKey = process.env.OXOG_ENV_KEY;
  if (!encryptionKey) { /* ... */ return {}; }
  try {
    const encryptedContent = (await fs.promises.readFile(envLockPath, encoding)).trim(); // ASYNC
    // ... 60+ lines of IDENTICAL logic ...
  } catch (error) { /* ... */ }
}

// Only difference is ONE LINE (sync vs async file read)
// Everything else is copy-pasted
```

**Root Cause**:
Functions were implemented separately instead of extracting common logic into a shared helper.

**Impact**:
- Maintenance burden: Bug fixes must be applied twice
- Risk of divergence: Changes to one function might not be applied to the other
- Code bloat: 100+ lines of unnecessary duplication

---

## BUG-004: Inefficient Volatile Read Implementation

**Severity**: LOW
**Category**: Code Quality / Performance
**Location**: `src/crypto.js:18-26`

**Problem**:
The `volatileRead` function uses `crypto.timingSafeEqual` to prevent dead code elimination of buffer zeroing, but only reads the first byte. This is inefficient and doesn't fully ensure the entire buffer is retained in memory by the optimizer.

**Proof**:
```javascript
// Current code (src/crypto.js:18-26)
function volatileRead(buffer) {
  if (buffer && buffer.length > 0) {
    const zero = Buffer.alloc(1, 0);
    crypto.timingSafeEqual(buffer.subarray(0, 1), zero);  // Only compares FIRST byte
  }
}

// For a 32-byte key buffer, only buffer[0] is accessed
// The optimizer might still eliminate fill(0) for buffer[1..31]
```

**Expected**:
Access multiple points in the buffer or use a checksum approach to ensure the entire buffer is retained.

**Root Cause**:
Incomplete implementation of volatile read pattern.

**Impact**:
Low - In practice, compilers rarely optimize away buffer.fill(0), but the volatile read doesn't provide the intended guarantee for the entire buffer.

---

## BUG-005: Multiline Quote Handling Preserves Leading Whitespace Inconsistently

**Severity**: LOW
**Category**: Edge Case / Parser Behavior
**Location**: `src/parser.js:104-108`

**Problem**:
When parsing multiline double-quoted values, the parser uses `trimEnd()` to detect closing quotes, which has unintuitive behavior for lines with only whitespace before the quote.

**Proof**:
```javascript
// Input .env file:
KEY="line 1
     "

// Parsing process:
// Line 1: value = "line 1"
// Line 2: nextLine = "     \""
// Line 104: trimmedNextLine = nextLine.trimEnd() = "     \"" (no change, quote isn't whitespace)
// Line 106: endsWith('"') = true
// Line 108: substring(0, length-1) = "     " (5 spaces)
// Result: KEY = "line 1\n     "

// Expected (arguably): KEY = "line 1\n" (no trailing spaces before closing quote)
```

**Expected**:
Debatable - current behavior is technically correct (preserves all content before the closing quote), but might be surprising to users who expect whitespace-only lines to be trimmed.

**Root Cause**:
The `trimEnd()` is meant to handle trailing whitespace AFTER the quote (e.g., `"   `), not whitespace BEFORE it.

**Impact**:
Low - Rare edge case, and current behavior is defensible (preserves exact content).

---

## BUG-006: Dangerous Keys List Includes Harmless JavaScript Keywords

**Severity**: LOW
**Category**: API Contract / Unnecessary Restriction
**Location**: `src/index.js:25-28`

**Problem**:
The dangerous keys blacklist includes `eval`, `require`, `module`, and `exports`, which are JavaScript keywords. Setting these as environment variable keys (e.g., `process.env.eval = "foo"`) has no security implications - they're just string keys in the `process.env` object.

**Proof**:
```javascript
// Setting these env vars is harmless:
process.env.eval = "something";     // Doesn't affect global eval()
process.env.require = "value";      // Doesn't affect global require()
process.env.module = "test";        // Doesn't affect current module object
process.env.exports = "data";       // Doesn't affect current exports object

// These are just strings in the process.env object, not the actual global functions

// But env-lock blocks them:
const content = 'eval=harmless_value';
const encrypted = encrypt(content, key);
config({ path: encryptedFile }); // Skips this variable unnecessarily
```

**Expected**:
Only block keys that have actual security implications (like `__proto__`, `constructor`, `NODE_OPTIONS`).

**Root Cause**:
Overly broad security filtering.

**Impact**:
Low - Unlikely that users would want env vars named `eval` or `require`, but the restriction is unnecessary.

---

## Recommended Fixes Priority

1. **HIGH** - BUG-001: Add periodic cleanup for failedAttempts Map
2. **MEDIUM** - BUG-002: Remove unnecessary keys from DANGEROUS_KEYS
3. **MEDIUM** - BUG-003: Refactor to eliminate code duplication
4. **LOW** - BUG-004: Improve volatileRead implementation
5. **LOW** - BUG-005: Document multiline whitespace behavior
6. **LOW** - BUG-006: Remove JavaScript keywords from blacklist

---

## Non-Issues (Verified as Correct)

✓ **Path traversal validation** in CLI - Correctly blocks `..` paths
✓ **Encryption format** - V1 format includes integrity checks
✓ **Multiline quote parsing** - Correctly throws error for unclosed quotes
✓ **Empty value handling** - Correctly parses `KEY=` as empty string
✓ **Unicode support** - Properly handles UTF-8 in all modules
✓ **Error sanitization** - Doesn't leak sensitive info in error messages
✓ **Input size limits** - Prevents DoS with MAX_INPUT_SIZE check
✓ **Escape sequence handling** - Correctly unescapes `\n`, `\t`, `\"`, `\\`

