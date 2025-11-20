# Complete Workflow Guide

This guide demonstrates the complete workflow for using `@oxog/env-lock` from development to production.

## Table of Contents

1. [Initial Setup](#initial-setup)
2. [Development Workflow](#development-workflow)
3. [Team Collaboration](#team-collaboration)
4. [CI/CD Integration](#cicd-integration)
5. [Production Deployment](#production-deployment)
6. [Key Rotation](#key-rotation)

---

## Initial Setup

### Step 1: Install the Package

```bash
npm install @oxog/env-lock
```

### Step 2: Create Your .env File

```bash
# .env (never commit this!)
DATABASE_URL=postgresql://localhost:5432/mydb
API_KEY=sk_test_1234567890
SECRET_TOKEN=my_super_secret_token
STRIPE_KEY=sk_live_abc123xyz
AWS_ACCESS_KEY=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
```

### Step 3: Generate Encryption Key

```bash
npx env-lock generate-key
```

Output:
```
======================================================================
Generated new encryption key:
======================================================================

OXOG_ENV_KEY=9eb8f2c44cf801f70c0ec77412671dbe00804b589c7771b766e685b875318df7

======================================================================
```

### Step 4: Encrypt Your .env File

```bash
npx env-lock encrypt
```

This creates `.env.lock` (safe to commit!) and displays the encryption key.

### Step 5: Update .gitignore

```bash
# .gitignore
.env
.env.local
.env.*.local
*.key

# Keep .env.lock (it's encrypted!)
# .env.lock  ← DO NOT add this line
```

### Step 6: Commit Encrypted File

```bash
git add .env.lock
git commit -m "Add encrypted environment variables"
git push
```

---

## Development Workflow

### Local Development

#### Option 1: Use .env.lock (Recommended for Teams)

```bash
# Set encryption key in your shell
export OXOG_ENV_KEY=9eb8f2c44cf801f70c0ec77412671dbe00804b589c7771b766e685b875318df7

# Or add to your shell profile (~/.bashrc, ~/.zshrc)
echo 'export OXOG_ENV_KEY=9eb8f2c44cf801f70c0ec77412671dbe00804b589c7771b766e685b875318df7' >> ~/.bashrc
source ~/.bashrc

# Run your app
npm start
```

#### Option 2: Use Regular .env (For Solo Development)

```bash
# Keep using .env for development
# Use .env.lock only for production/staging
npm start
```

### Updating Environment Variables

```bash
# 1. Update your .env file
echo "NEW_VARIABLE=new_value" >> .env

# 2. Re-encrypt
npx env-lock encrypt

# 3. Commit updated .env.lock
git add .env.lock
git commit -m "Update environment variables"
git push
```

### Viewing Encrypted Variables

```bash
# Decrypt and view (doesn't modify files)
npx env-lock decrypt
```

---

## Team Collaboration

### Sharing the Encryption Key

**NEVER commit the key to Git!** Share it securely:

#### Method 1: Password Manager (Recommended)
- Store the key in 1Password, LastPass, or Bitwarden
- Share the entry with team members

#### Method 2: Encrypted Communication
- Send via encrypted email or Signal
- Delete the message after confirmation

#### Method 3: Secrets Management Service
- Store in HashiCorp Vault
- Store in AWS Secrets Manager
- Store in Azure Key Vault

### New Team Member Onboarding

```bash
# 1. Clone repository
git clone https://github.com/your-org/your-project.git
cd your-project

# 2. Install dependencies
npm install

# 3. Get encryption key from team (via password manager)
export OXOG_ENV_KEY=<key_from_team>

# 4. Verify decryption works
npx env-lock decrypt

# 5. Run the application
npm start
```

### Multi-Environment Setup

```bash
# Create separate encrypted files for each environment
npx env-lock encrypt --input .env.development --output .env.development.lock
npx env-lock encrypt --input .env.staging --output .env.staging.lock
npx env-lock encrypt --input .env.production --output .env.production.lock

# Commit all encrypted files
git add .env.*.lock
git commit -m "Add environment-specific encrypted files"
```

Load the appropriate file in your code:

```javascript
const envLock = require('@oxog/env-lock');

const environment = process.env.NODE_ENV || 'development';
envLock.config({
  path: `.env.${environment}.lock`
});
```

---

## CI/CD Integration

### GitHub Actions

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm test
        env:
          OXOG_ENV_KEY: ${{ secrets.OXOG_ENV_KEY }}
      - run: npm run deploy
        env:
          OXOG_ENV_KEY: ${{ secrets.OXOG_ENV_KEY }}
```

**Add key to GitHub Secrets:**
1. Go to repository Settings → Secrets and variables → Actions
2. Click "New repository secret"
3. Name: `OXOG_ENV_KEY`
4. Value: (paste your key)

### GitLab CI

Create `.gitlab-ci.yml`:

```yaml
deploy:
  stage: deploy
  script:
    - npm ci
    - npm test
    - npm run deploy
  variables:
    OXOG_ENV_KEY: $OXOG_ENV_KEY
  only:
    - main
```

**Add key to GitLab CI/CD Variables:**
1. Go to Settings → CI/CD → Variables
2. Add variable: `OXOG_ENV_KEY`
3. Mark as "Protected" and "Masked"

### CircleCI

Create `.circleci/config.yml`:

```yaml
version: 2.1
jobs:
  deploy:
    docker:
      - image: node:18
    steps:
      - checkout
      - run: npm ci
      - run: npm test
      - run: npm run deploy
workflows:
  deploy:
    jobs:
      - deploy:
          filters:
            branches:
              only: main
```

**Add key to CircleCI Environment Variables:**
1. Go to Project Settings → Environment Variables
2. Add variable: `OXOG_ENV_KEY`

---

## Production Deployment

### AWS (EC2, ECS, Lambda)

#### EC2 Instance

```bash
# SSH into instance
ssh user@your-instance

# Set environment variable
echo 'export OXOG_ENV_KEY=your_key' >> ~/.bashrc
source ~/.bashrc

# Deploy app
git clone https://github.com/your-org/your-project.git
cd your-project
npm install
npm start
```

#### ECS (Elastic Container Service)

In task definition:

```json
{
  "containerDefinitions": [{
    "environment": [{
      "name": "OXOG_ENV_KEY",
      "value": "your_key_from_secrets_manager"
    }]
  }]
}
```

#### Lambda

```bash
# Set environment variable via AWS CLI
aws lambda update-function-configuration \
  --function-name my-function \
  --environment Variables={OXOG_ENV_KEY=your_key}
```

### Heroku

```bash
# Set config var
heroku config:set OXOG_ENV_KEY=your_key

# Deploy
git push heroku main
```

### Vercel

```bash
# Add environment variable
vercel env add OXOG_ENV_KEY

# Deploy
vercel --prod
```

### Docker

See `Dockerfile.example` and `docker-compose.example.yml` in this directory.

---

## Key Rotation

Regularly rotate your encryption keys for security:

### Step 1: Generate New Key

```bash
npx env-lock generate-key > new-key.txt
```

### Step 2: Re-encrypt with New Key

```bash
# Use new key to encrypt
npx env-lock encrypt --key $(cat new-key.txt)
```

### Step 3: Update All Environments

- Update GitHub/GitLab CI/CD secrets
- Update production environment variables
- Update team's password manager
- Notify team members

### Step 4: Commit and Deploy

```bash
git add .env.lock
git commit -m "Rotate encryption key"
git push
```

### Step 5: Verify

```bash
# Test decryption with new key
OXOG_ENV_KEY=$(cat new-key.txt) npx env-lock decrypt
```

### Step 6: Cleanup

```bash
# Securely delete old key files
rm new-key.txt
```

---

## Best Practices

### DO ✅

- ✅ Commit `.env.lock` to version control
- ✅ Store encryption keys in password managers
- ✅ Use different keys for different environments
- ✅ Rotate keys periodically (every 90 days)
- ✅ Use environment-specific `.env.lock` files
- ✅ Test decryption in CI/CD pipelines
- ✅ Document key rotation procedures

### DON'T ❌

- ❌ Commit `.env` files to Git
- ❌ Commit encryption keys to Git
- ❌ Share keys via unencrypted channels
- ❌ Use the same key across environments
- ❌ Forget to re-encrypt after updating .env
- ❌ Skip key rotation
- ❌ Store keys in application code

---

## Troubleshooting

### "OXOG_ENV_KEY environment variable is not set"

```bash
# Set the key before running
export OXOG_ENV_KEY=your_key_here
npm start
```

### "Decryption failed: Invalid key or tampered data"

- Wrong encryption key
- `.env.lock` was modified or corrupted
- Re-encrypt with correct key

### "Input file not found"

```bash
# Create .env file first
echo "KEY=value" > .env
npx env-lock encrypt
```

### Variables not loading in application

```javascript
// Ensure env-lock is loaded FIRST
require('@oxog/env-lock').config();

// Then load other modules
const express = require('express');
```

---

## Summary

1. **Development**: Create `.env` → Encrypt → Commit `.env.lock`
2. **Team**: Share key securely → Team clones repo → Set `OXOG_ENV_KEY` → Run app
3. **CI/CD**: Add key to secrets → Pipeline uses encrypted vars
4. **Production**: Set `OXOG_ENV_KEY` → Deploy → App auto-decrypts
5. **Maintenance**: Update `.env` → Re-encrypt → Commit → Deploy

This workflow ensures your secrets are:
- ✅ Encrypted at rest (in Git)
- ✅ Decrypted at runtime (in memory only)
- ✅ Shared securely (via password managers)
- ✅ Versioned safely (`.env.lock` in Git)
