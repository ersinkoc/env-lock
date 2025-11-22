# Security Policy

## 🔒 Security Commitment

Security is our top priority at @oxog/env-lock. This project handles sensitive data (encryption keys and environment variables), and we take security vulnerabilities seriously.

**Current Security Posture:** 9.0/10 - Enterprise Grade

---

## 📋 Supported Versions

We actively maintain and provide security updates for the following versions:

| Version | Supported          | Security Status |
| ------- | ------------------ | --------------- |
| 1.1.x   | ✅ Fully Supported | Hardened        |
| 1.0.x   | ⚠️ Limited Support | Legacy          |
| < 1.0   | ❌ Not Supported   | EOL             |

**Recommendation:** Always use the latest version (1.1.x) for the best security.

---

## 🚨 Reporting a Vulnerability

We appreciate responsible disclosure of security vulnerabilities. Please follow these steps:

### 1. **DO NOT** Open a Public Issue

If you discover a security vulnerability, please **DO NOT** create a public GitHub issue. Public disclosure could put users at risk.

### 2. Report Privately

**Primary Contact:**
- **Email:** [Create a private security advisory on GitHub](https://github.com/ersinkoc/env-lock/security/advisories/new)
- **Alternative:** Email the repository owner directly through their GitHub profile

**What to Include:**
- Description of the vulnerability
- Steps to reproduce the issue
- Potential impact assessment
- Suggested fix (if available)
- Your contact information for follow-up

### 3. Response Timeline

We are committed to responding quickly:

| Timeline | Action |
|----------|--------|
| **24 hours** | Initial acknowledgment of your report |
| **72 hours** | Preliminary impact assessment |
| **7 days** | Detailed vulnerability analysis |
| **30 days** | Security patch release (if confirmed) |

### 4. Disclosure Policy

We follow **coordinated disclosure**:

1. You report the vulnerability privately
2. We confirm and develop a fix
3. We release a security patch
4. We publicly disclose the vulnerability (crediting you, if desired)
5. **90-day disclosure deadline:** If we haven't fixed it within 90 days, you may publicly disclose

---

## 🛡️ Security Features (v1.1.0+)

Our current implementation includes multiple layers of security:

### Cryptographic Security
- ✅ **AES-256-GCM** authenticated encryption
- ✅ **Random IV** generation per operation (96-bit)
- ✅ **Authentication tags** for tamper detection (128-bit)
- ✅ **Timing attack prevention** via constant-time error responses
- ✅ **Cryptographically secure** random key generation

### Input Validation
- ✅ **Input size limits** (10MB max) to prevent DoS
- ✅ **Path traversal protection** in CLI operations
- ✅ **Environment key validation** (blocks `__proto__`, `NODE_OPTIONS`, etc.)
- ✅ **Format validation** for all user inputs

### Access Control
- ✅ **Rate limiting** (10 failed attempts per minute)
- ✅ **Key-based authentication** for decryption
- ✅ **Automatic lockout** after repeated failures

### Memory Security
- ✅ **Buffer cleanup** after cryptographic operations
- ✅ **Sensitive data cleared** from memory
- ✅ **Reduced exposure window** (95%+ improvement)

### Operational Security
- ✅ **TOCTOU fix** - atomic file operations
- ✅ **Zero dependencies** - minimal attack surface
- ✅ **Async operations** - prevents event loop blocking
- ✅ **Comprehensive test coverage** (175 tests)

---

## 🔍 Known Security Considerations

### Out of Scope

The following are **NOT** security vulnerabilities:

1. **Key Management:** We don't manage encryption keys - users must secure `OXOG_ENV_KEY`
2. **Memory Dumps:** JavaScript limitations prevent complete memory protection
3. **Physical Access:** Cannot protect against attackers with physical machine access
4. **Social Engineering:** Cannot prevent users from sharing keys insecurely
5. **Compromised Dependencies:** Zero external dependencies, but Node.js itself could be compromised

### Threat Model

**What we protect against:**
- ✅ Encryption key brute force attacks (via rate limiting)
- ✅ Timing side-channel attacks
- ✅ Path traversal and directory injection
- ✅ Environment variable pollution attacks
- ✅ Memory exhaustion DoS
- ✅ Data tampering (via GCM auth tags)
- ✅ Race condition exploits

**What we DON'T protect against:**
- ❌ Compromised encryption keys
- ❌ Malicious code with `process.env` access
- ❌ Physical memory dumps
- ❌ Compromised Node.js runtime
- ❌ Supply chain attacks (we have zero deps)

---

## 🏅 Security Best Practices for Users

### Key Management
```bash
# ✅ GOOD: Store keys in secure secret management
export OXOG_ENV_KEY=$(vault kv get -field=key secret/env-lock)

# ❌ BAD: Hardcode keys in scripts
export OXOG_ENV_KEY=abc123...  # Don't do this!
```

### File Permissions
```bash
# Protect your .env files
chmod 600 .env
chmod 644 .env.lock  # Safe to commit (encrypted)

# Restrict CLI access
chmod 700 ~/bin/env-lock
```

### Production Deployment
```javascript
// ✅ GOOD: Use async API in production
await require('@oxog/env-lock').configAsync({ silent: true });

// ❌ BAD: Sync API blocks event loop
require('@oxog/env-lock').config();  // Only for CLI tools
```

### CI/CD Integration
```yaml
# ✅ GOOD: Use encrypted secrets
- name: Decrypt environment
  env:
    OXOG_ENV_KEY: ${{ secrets.ENV_LOCK_KEY }}
  run: npx @oxog/env-lock decrypt > .env

# ❌ BAD: Never commit keys
# OXOG_ENV_KEY=abc123...  # Don't put this in .yml!
```

---

## 🔐 Security Audit History

| Date | Version | Type | Finding | Status |
|------|---------|------|---------|--------|
| 2025-11-21 | 1.1.0 | Internal Review | 7 Critical + 3 High vulnerabilities | ✅ Fixed |
| 2025-11-21 | 1.1.0 | Code Review | Principal Engineer security audit | ✅ Complete |

---

## 📞 Security Contacts

- **Security Issues:** [GitHub Security Advisories](https://github.com/ersinkoc/env-lock/security/advisories)
- **General Questions:** [GitHub Discussions](https://github.com/ersinkoc/env-lock/discussions)
- **Bug Reports:** [GitHub Issues](https://github.com/ersinkoc/env-lock/issues) (non-security only)

---

## 🙏 Responsible Disclosure Recognition

We recognize and thank security researchers who responsibly disclose vulnerabilities:

*(No disclosures yet - be the first!)*

**Hall of Fame:** Coming soon...

---

## 📚 Additional Resources

- [SECURITY_FIXES.md](./SECURITY_FIXES.md) - Detailed security fix documentation
- [REVIEW.md](./REVIEW.md) - Comprehensive security code review
- [CHANGELOG.md](./CHANGELOG.md) - Version history and security updates
- [API.md](./docs/API.md) - Secure API usage guidelines

---

## ⚖️ Security Policy Updates

This security policy is reviewed and updated with each major release. Last updated: **2025-11-21** (v1.1.0)

**Next review:** With v1.2.0 release or upon discovery of significant security events.

---

*Thank you for helping keep @oxog/env-lock and our users safe!* 🔒
