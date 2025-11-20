/**
 * Basic Usage Example for @oxog/env-lock
 *
 * This example demonstrates the simplest way to use env-lock
 * in your Node.js application.
 */

// Step 1: Load environment variables from .env.lock
require('@oxog/env-lock').config();

// Step 2: Use environment variables as normal
console.log('Database URL:', process.env.DATABASE_URL);
console.log('API Key:', process.env.API_KEY);
console.log('Debug Mode:', process.env.DEBUG);

// Your application code
const port = process.env.PORT || 3000;
console.log(`Server would run on port ${port}`);
