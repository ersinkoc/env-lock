# Testing & Validation Guide

This document provides comprehensive testing procedures to validate the @oxog/env-lock package.

---

## Quick Validation

### Run All Tests
```bash
npm test
# Expected: ✅ 175/175 tests passing
```

### Test Coverage
```bash
npm run test:coverage
# Expected: High coverage across all modules
```

---

## Manual Testing Procedures

### 1. Basic Encryption/Decryption

```bash
# Generate a key
./bin/cli.js generate-key
# Save the key output

# Create a test .env file
cat > test.env << 'EOF'
DATABASE_URL=postgresql://localhost:5432/db
API_KEY=sk_test_1234567890
SECRET="my secret value"
EOF

# Encrypt
./bin/cli.js encrypt --key YOUR_KEY --input test.env --output test.env.lock

# Decrypt
./bin/cli.js decrypt --key YOUR_KEY --input test.env.lock

# Verify output matches original
```

### 2. Runtime Loading

```javascript
// test-runtime.js
process.env.OXOG_ENV_KEY = 'YOUR_KEY_HERE';
const { config } = require('@oxog/env-lock');

config({ path: '.env.lock' });

console.log('Loaded:', process.env.DATABASE_URL);
```

### 3. Edge Case Testing

#### Multiline Values
```bash
cat > multiline.env << 'EOF'
CERT="-----BEGIN CERTIFICATE-----
Line 2
Line 3
-----END CERTIFICATE-----"
EOF
# Encrypt and decrypt, verify all lines preserved
```

#### Special Characters
```bash
cat > special.env << 'EOF'
EMOJI=🔐
UNICODE=中文العربية
QUOTES="He said \"hello\""
BACKSLASH=C:\\Program Files\\App
EOF
# Verify all special chars handled correctly
```

#### Trailing Whitespace (Bug Fix Verification)
```bash
# Create file with trailing spaces after closing quote
printf 'KEY="value"   \nOTHER=test' > whitespace.env
# Should parse KEY as "value" (no quote or spaces)
```

---

## Security Testing

### 1. Wrong Key Rejection
```bash
# Try to decrypt with wrong key
./bin/cli.js decrypt --key WRONG_KEY --input .env.lock
# Expected: Error message about invalid key
```

### 2. Tamper Detection
```bash
# Manually corrupt .env.lock file
# Try to decrypt
# Expected: Error about tampered data
```

### 3. Key Format Validation
```bash
# Try invalid key formats
./bin/cli.js encrypt --key "tooshort"
# Expected: Error about key format

./bin/cli.js encrypt --key "notahexstring"
# Expected: Error about key format
```

---

## Performance Testing

### Large File Handling
```javascript
// Generate 1MB test file
const fs = require('fs');
const content = 'KEY=' + 'x'.repeat(1024 * 1024);
fs.writeFileSync('large.env', content);

// Time encryption/decryption
const { encrypt, decrypt, generateKey } = require('./src/crypto');
const key = generateKey();

console.time('encrypt');
const encrypted = encrypt(content, key);
console.timeEnd('encrypt');
// Expected: < 100ms

console.time('decrypt');
const decrypted = decrypt(encrypted, key);
console.timeEnd('decrypt');
// Expected: < 100ms
```

---

## Regression Testing

### Bug Fix Verification

#### BUG-001: Dead Code (Fixed)
```bash
# Run unknown command
./bin/cli.js unknown-command
# Should show: Error message + help text + exit
```

#### BUG-002: Multiline Trailing Whitespace (Fixed)
```javascript
const { parse } = require('./src/parser');
const result = parse('KEY="line1\nline2"   \nOTHER=value');
console.assert(result.KEY === 'line1\nline2', 'Multiline bug present');
console.assert(result.OTHER === 'value', 'Other key lost');
```

#### BUG-003: Unclosed Quote Warning (Fixed)
```javascript
const { parse } = require('./src/parser');
const warnings = [];
console.warn = (msg) => warnings.push(msg);
parse('KEY="unclosed');
console.assert(warnings.length === 1, 'Should warn');
console.assert(warnings[0].includes('Unclosed'), 'Wrong warning');
```

#### BUG-004: CLI Argument Validation (Fixed)
```bash
# Test missing value
./bin/cli.js encrypt --key
# Expected: Error about required value

# Test flag as value
./bin/cli.js encrypt --key --input file.env
# Expected: Error about required value
```

---

## Integration Testing

### Full Workflow Test
```bash
# 1. Generate key
KEY=$(./bin/cli.js generate-key | grep OXOG_ENV_KEY | cut -d= -f2)

# 2. Create .env
echo "TEST=value" > .env

# 3. Encrypt
./bin/cli.js encrypt --key $KEY

# 4. Remove original
rm .env

# 5. Load at runtime
OXOG_ENV_KEY=$KEY node -e "
  require('./src/index').config();
  console.log('TEST:', process.env.TEST);
"
# Expected: TEST: value
```

### Express.js Integration
```javascript
// app.js
require('@oxog/env-lock').config();
const express = require('express');
const app = express();

app.get('/', (req, res) => {
  res.json({
    loaded: !!process.env.DATABASE_URL
  });
});

app.listen(3000);
```

---

## Continuous Integration

### GitHub Actions Example
```yaml
name: Test
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm test
      - run: npm run test:coverage
```

---

## Test Checklist

Before merging changes, verify:

- [ ] All unit tests pass (175/175)
- [ ] No new security vulnerabilities
- [ ] Performance benchmarks acceptable
- [ ] Edge cases covered
- [ ] Integration tests pass
- [ ] CLI commands work correctly
- [ ] Runtime loading works
- [ ] Error messages are clear
- [ ] Documentation updated
- [ ] No breaking changes (or documented)

---

## Common Issues & Solutions

### Tests Failing on Windows
- Issue: Line ending differences (CRLF vs LF)
- Solution: Configure git to use LF: `git config core.autocrlf false`

### Performance Degradation
- Issue: Large files taking too long
- Check: File size, consider chunking for very large files
- Expected: 1MB file should encrypt in < 100ms

### Decryption Fails
- Check: Correct key is being used
- Check: File hasn't been corrupted
- Check: Node.js version >= 16

---

## Reporting Issues

When reporting bugs, include:
1. Node.js version (`node --version`)
2. Package version
3. Minimal reproduction case
4. Expected vs actual behavior
5. Error messages (full stack trace)

---

## Development Testing

### Adding New Features
1. Write failing test first (TDD)
2. Implement feature
3. Ensure test passes
4. Run full test suite
5. Add integration test
6. Update documentation

### Before Publishing
```bash
# Run all checks
npm test
npm run test:coverage
npm run lint  # if available

# Test in isolated environment
npm pack
cd /tmp && npm install /path/to/tarball
node -e "console.log(require('@oxog/env-lock'))"
```

---

## Performance Benchmarks

### Encryption Speed
| Data Size | Expected Time | Status |
|-----------|--------------|--------|
| 1KB       | < 1ms        | ✅     |
| 10KB      | < 5ms        | ✅     |
| 100KB     | < 20ms       | ✅     |
| 1MB       | < 100ms      | ✅     |

### Memory Usage
- Should not hold large files in memory longer than necessary
- No memory leaks after 1000 encrypt/decrypt cycles

---

## Security Testing Checklist

- [ ] AES-256-GCM algorithm verified
- [ ] IV randomness verified (different each time)
- [ ] Authentication tag verified
- [ ] Wrong key detection working
- [ ] Tamper detection working
- [ ] No timing attack vulnerabilities
- [ ] Input validation comprehensive
- [ ] No injection vulnerabilities

---

**Last Updated:** 2025-11-21
**Test Suite Version:** 175 tests
**All Tests Status:** ✅ PASSING
