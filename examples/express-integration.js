/**
 * Express.js Integration Example
 *
 * This example shows how to integrate env-lock with an Express.js application.
 */

// IMPORTANT: Load env-lock BEFORE any other modules that use process.env
require('@oxog/env-lock').config();

const express = require('express');
const app = express();

// Now you can safely use environment variables
const PORT = process.env.PORT || 3000;
const DATABASE_URL = process.env.DATABASE_URL;
const API_KEY = process.env.API_KEY;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Middleware
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    environment: NODE_ENV,
    timestamp: new Date().toISOString()
  });
});

// Example API endpoint using environment variables
app.get('/api/config', (req, res) => {
  // Never expose the actual API key!
  res.json({
    databaseConnected: !!DATABASE_URL,
    apiKeyConfigured: !!API_KEY,
    environment: NODE_ENV,
    port: PORT
  });
});

// Database connection example (pseudo-code)
// const db = require('some-db-library');
// db.connect(DATABASE_URL)
//   .then(() => console.log('Database connected'))
//   .catch(err => console.error('Database error:', err));

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${NODE_ENV}`);
  console.log(`Database URL configured: ${!!DATABASE_URL}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, closing server...');
  process.exit(0);
});
