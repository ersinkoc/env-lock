/**
 * Advanced Usage Example for @oxog/env-lock
 *
 * This example demonstrates advanced features and options.
 */

const envLock = require('@oxog/env-lock');

// Example 1: Load with custom path
console.log('Example 1: Custom path');
envLock.config({
  path: '/custom/path/to/.env.production.lock',
  silent: true
});

// Example 2: Load with override option
console.log('\nExample 2: Override existing variables');
envLock.config({
  override: true,  // Override existing env vars
  silent: false    // Show loading messages
});

// Example 3: Multi-environment setup
console.log('\nExample 3: Environment-specific loading');
const environment = process.env.NODE_ENV || 'development';
const result = envLock.config({
  path: `.env.${environment}.lock`,
  silent: true
});

console.log(`Loaded ${Object.keys(result).length} variables for ${environment}`);

// Example 4: Direct encryption/decryption
console.log('\nExample 4: Direct crypto operations');
const key = envLock.generateKey();
console.log('Generated key:', key.substring(0, 16) + '...');

const plaintext = 'SECRET_TOKEN=my_secret_value';
const encrypted = envLock.encrypt(plaintext, key);
console.log('Encrypted:', encrypted.substring(0, 50) + '...');

const decrypted = envLock.decrypt(encrypted, key);
console.log('Decrypted:', decrypted);

// Example 5: Parse and stringify
console.log('\nExample 5: Parse and stringify operations');
const envContent = `
DATABASE_URL=postgresql://localhost/mydb
API_KEY=sk_test_123
DEBUG=true
`.trim();

const parsed = envLock.parse(envContent);
console.log('Parsed:', parsed);

const stringified = envLock.stringify(parsed);
console.log('Stringified:', stringified);

// Example 6: Error handling
console.log('\nExample 6: Graceful error handling');
try {
  envLock.config({
    path: '/nonexistent/file.lock',
    silent: false
  });
} catch (error) {
  console.log('Handled error gracefully');
}

// Example 7: Conditional loading
console.log('\nExample 7: Conditional loading');
if (process.env.OXOG_ENV_KEY) {
  const vars = envLock.config({ silent: true });
  console.log(`Loaded ${Object.keys(vars).length} encrypted variables`);
} else {
  console.log('No encryption key found, skipping encrypted vars');
  // Fall back to regular .env file if needed
  // require('dotenv').config();
}
