# Examples

This directory contains practical examples demonstrating various use cases for `@oxog/env-lock`.

## Quick Reference

| File | Description |
|------|-------------|
| [`basic-usage.js`](./basic-usage.js) | Simplest way to use env-lock in a Node.js app |
| [`advanced-usage.js`](./advanced-usage.js) | Advanced features and options |
| [`express-integration.js`](./express-integration.js) | Integration with Express.js web framework |
| [`github-actions.yml`](./github-actions.yml) | CI/CD pipeline with GitHub Actions |
| [`Dockerfile.example`](./Dockerfile.example) | Docker container configuration |
| [`docker-compose.example.yml`](./docker-compose.example.yml) | Docker Compose multi-service setup |
| [`WORKFLOW.md`](./WORKFLOW.md) | Complete development-to-production workflow guide |

## Getting Started

### 1. Basic Usage

The simplest way to get started:

```javascript
// index.js
require('@oxog/env-lock').config();
console.log(process.env.DATABASE_URL);
```

Run with:
```bash
OXOG_ENV_KEY=your_key node index.js
```

See [`basic-usage.js`](./basic-usage.js) for complete example.

### 2. Advanced Features

Learn about custom paths, override options, and direct crypto operations:

```bash
node examples/advanced-usage.js
```

See [`advanced-usage.js`](./advanced-usage.js) for details.

### 3. Web Framework Integration

Example Express.js application showing best practices:

```bash
npm install express
OXOG_ENV_KEY=your_key node examples/express-integration.js
```

See [`express-integration.js`](./express-integration.js) for full implementation.

### 4. Docker Deployment

Build and run containerized application:

```bash
# Build image
docker build -f examples/Dockerfile.example -t myapp .

# Run with encryption key
docker run -e OXOG_ENV_KEY=your_key -p 3000:3000 myapp
```

See [`Dockerfile.example`](./Dockerfile.example) for configuration details.

### 5. Docker Compose

Multi-service application with database:

```bash
# Copy example files
cp examples/docker-compose.example.yml docker-compose.yml

# Create .env with encryption key
echo "OXOG_ENV_KEY=your_key" > .env

# Start services
docker-compose up -d
```

See [`docker-compose.example.yml`](./docker-compose.example.yml) for full setup.

### 6. CI/CD Pipeline

GitHub Actions workflow for automated deployment:

```bash
# Copy workflow file
mkdir -p .github/workflows
cp examples/github-actions.yml .github/workflows/deploy.yml

# Add OXOG_ENV_KEY to GitHub Secrets
# Repository Settings → Secrets and variables → Actions
```

See [`github-actions.yml`](./github-actions.yml) for complete workflow.

### 7. Complete Workflow

End-to-end guide from development to production:

```bash
less examples/WORKFLOW.md
```

See [`WORKFLOW.md`](./WORKFLOW.md) for comprehensive guide.

## Common Patterns

### Pattern 1: Environment-Specific Configuration

```javascript
const envLock = require('@oxog/env-lock');

// Load environment-specific file
const env = process.env.NODE_ENV || 'development';
envLock.config({
  path: `.env.${env}.lock`
});
```

### Pattern 2: Graceful Fallback

```javascript
const envLock = require('@oxog/env-lock');

// Try encrypted file first
const result = envLock.config({ silent: true });

// Fall back to regular .env if no key
if (Object.keys(result).length === 0) {
  require('dotenv').config();
}
```

### Pattern 3: Runtime Decryption

```javascript
const { decrypt } = require('@oxog/env-lock');
const fs = require('fs');

const encrypted = fs.readFileSync('.env.lock', 'utf8');
const decrypted = decrypt(encrypted, process.env.OXOG_ENV_KEY);

// Use decrypted content
console.log(decrypted);
```

### Pattern 4: Custom Validation

```javascript
const envLock = require('@oxog/env-lock');

envLock.config();

// Validate required variables
const required = ['DATABASE_URL', 'API_KEY', 'SECRET_TOKEN'];
const missing = required.filter(key => !process.env[key]);

if (missing.length > 0) {
  console.error(`Missing required variables: ${missing.join(', ')}`);
  process.exit(1);
}
```

## Testing Examples

Each example can be tested:

```bash
# Install @oxog/env-lock
npm install @oxog/env-lock

# Create test .env file
cat > .env << EOF
DATABASE_URL=postgresql://localhost:5432/testdb
API_KEY=sk_test_123456
SECRET_TOKEN=test_secret
DEBUG=true
PORT=3000
EOF

# Encrypt it
npx env-lock encrypt

# Set the key (from encrypt command output)
export OXOG_ENV_KEY=<your_generated_key>

# Run examples
node examples/basic-usage.js
node examples/advanced-usage.js
```

## Real-World Scenarios

### Scenario 1: Solo Developer

1. Use regular `.env` for local development
2. Encrypt before deploying to production
3. Set `OXOG_ENV_KEY` on production server

### Scenario 2: Small Team

1. Encrypt `.env` and commit `.env.lock`
2. Share key via password manager (1Password, LastPass)
3. Team members set `OXOG_ENV_KEY` locally
4. Everyone uses same encrypted file

### Scenario 3: Large Organization

1. Separate `.env.lock` files per environment
2. Different keys for dev/staging/production
3. Keys stored in enterprise secret manager
4. CI/CD automatically decrypts for each environment

### Scenario 4: Open Source Project

1. Commit `.env.lock` with dummy values
2. Contributors use their own keys for testing
3. Production keys never shared publicly
4. Clear documentation in README

## Troubleshooting

### Example doesn't work?

```bash
# Check Node.js version (must be 16+)
node --version

# Verify @oxog/env-lock is installed
npm list @oxog/env-lock

# Check if encryption key is set
echo $OXOG_ENV_KEY

# Test decryption
npx env-lock decrypt
```

### Need help?

- Read the main [README](../README.md)
- Check [TESTING.md](../TESTING.md) for validation
- Review [WORKFLOW.md](./WORKFLOW.md) for complete guide
- Open an issue on [GitHub](https://github.com/ersinkoc/env-lock/issues)

## Contributing Examples

Have a useful example? Contributions welcome!

1. Create example file
2. Add documentation
3. Test thoroughly
4. Submit pull request

## License

All examples are provided under the same MIT license as the main package.
