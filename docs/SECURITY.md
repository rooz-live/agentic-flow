# Security & Secrets Management

## Overview

This document outlines the security practices and secrets management strategy for the Agentic Flow project. It covers credential management across local development, CI/CD, and production environments.

## Secrets Management Strategy

### Environment-Based Approach

Different environments require different security postures:

| Environment | Storage Method | Risk Level | Validation |
|-------------|---------------|------------|------------|
| **Local Development** | `.env` files (git-ignored) | Low | Development placeholders OK |
| **CI/CD** | GitHub Secrets | Medium | Required for automated tests |
| **Staging** | AWS Secrets Manager | Medium-High | Production-like credentials |
| **Production** | HashiCorp Vault / AWS Secrets Manager | High | Encrypted, rotated, audited |

### Local Development

**Storage**: `.env` files (NEVER committed to git)

**Setup**:
```bash
# 1. Copy template
cp .env.example .env

# 2. Fill in your credentials
vi .env

# 3. Verify .env is git-ignored
grep "^\.env$" .gitignore || echo ".env" >> .gitignore
```

**Best Practices**:
- Use development/sandbox API keys when available
- Keep local `.env` file permissions restrictive: `chmod 600 .env`
- Never share your `.env` file via Slack, email, or screenshots
- Use placeholder values for services you're not actively developing

**Validation**:
```bash
# Check for missing credentials
./scripts/validate-secrets.sh

# Verify no secrets in git history
git log -p | grep -E "(sk-ant|sk-|glpat-)" && echo "⚠️  Secrets found in git history!"
```

### CI/CD (GitHub Actions)

**Storage**: GitHub Repository Secrets

**Setup**:
1. Navigate to: Repository → Settings → Secrets and variables → Actions
2. Add secrets using "New repository secret"
3. Reference in workflows: `${{ secrets.ANTHROPIC_API_KEY }}`

**Required Secrets for CI**:
- `ANTHROPIC_API_KEY` - For LLM-based tests
- `AWS_ACCESS_KEY_ID` - For AWS integration tests
- `AWS_SECRET_ACCESS_KEY` - For AWS integration tests
- `GITHUB_TOKEN` - Auto-provided, for GitHub API access

**Optional Secrets** (skip tests if not set):
- `STRIPE_SECRET_KEY` - Payment integration tests
- `DISCORD_BOT_TOKEN` - Discord bot tests
- `HIVELOCITY_API_KEY` - Infrastructure tests

**Workflow Example**:
```yaml
name: Test Suite
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    env:
      ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
      AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
      AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
    steps:
      - uses: actions/checkout@v3
      - run: npm test
```

### Production Deployment

**Storage**: HashiCorp Vault or AWS Secrets Manager

**AWS Secrets Manager (Recommended)**:
```bash
# Store secret
aws secretsmanager create-secret \
  --name agentic-flow/prod/anthropic-api-key \
  --secret-string "sk-ant-xxxxx" \
  --region us-west-1

# Retrieve secret in application
aws secretsmanager get-secret-value \
  --secret-id agentic-flow/prod/anthropic-api-key \
  --region us-west-1 \
  --query SecretString \
  --output text
```

**HashiCorp Vault (Alternative)**:
```bash
# Write secret
vault kv put secret/agentic-flow/prod \
  anthropic_api_key="sk-ant-xxxxx" \
  stripe_secret_key="sk_live_xxxxx"

# Read secret
vault kv get -field=anthropic_api_key secret/agentic-flow/prod
```

## Credential Inventory

### Status Legend
- ✅ **SET**: Credential configured and validated
- ⚠️ **PLACEHOLDER**: Development placeholder in use
- ❌ **MISSING**: Not configured, blocking functionality
- 🔄 **ROTATION_NEEDED**: Credential should be rotated

### AWS (Infrastructure)
- `AWS_ACCESS_KEY_ID` - ✅ SET
- `AWS_SECRET_ACCESS_KEY` - ✅ SET  
- `AWS_REGION` - ✅ SET (us-west-1)

**Rotation Schedule**: Every 90 days  
**Last Rotated**: Check with `aws iam list-access-keys`

### AI/LLM Providers
- `ANTHROPIC_API_KEY` - ⚠️ PLACEHOLDER (some environments)
- `OPENAI_API_KEY` - ⚠️ PLACEHOLDER
- `OPENROUTER_API_KEY` - ⚠️ PLACEHOLDER
- `GEMINI_API_KEY` - ❌ MISSING

**Rotation Schedule**: API keys don't expire but should be rotated every 180 days
**Cost Monitoring**: Set up billing alerts at $50, $100, $500 thresholds

### Database
- `POSTGRES_PASSWORD` - ⚠️ PLACEHOLDER (local dev only)

**Rotation Schedule**: Every 60 days for production  
**Backup**: Encrypted daily backups to S3

### CI/CD
- `GITLAB_TOKEN` - ❌ MISSING
- `GITHUB_TOKEN` - ✅ AUTO-PROVIDED (in GitHub Actions)

**Rotation Schedule**: Personal access tokens every 90 days

### Security Tools
- `PASSBOLT_API_TOKEN` - ❌ MISSING

**Rotation Schedule**: Every 90 days

### Infrastructure & CDN
- `CLOUDFLARE_API_TOKEN` - ⚠️ PLACEHOLDER
- `CLOUDFLARE_API_KEY` - ⚠️ PLACEHOLDER
- `CLOUDFLARE_EMAIL` - ⚠️ PLACEHOLDER
- `CPANEL_API_KEY` - ❌ MISSING
- `HOSTBILL_API_KEY` - ❌ MISSING (Error: HOSTBILL_001)
- `HOSTBILL_API_ID` - ❌ MISSING
- `HOSTBILL_URL` - ❌ MISSING
- `HIVELOCITY_API_KEY` - ✅ SET

**Rotation Schedule**: Every 180 days

### Payment Gateways
- `STRIPE_SECRET_KEY` - ❌ MISSING
- `STRIPE_PUBLIC_KEY` - ❌ MISSING  
- `STRIPE_WEBHOOK_SECRET` - ❌ MISSING
- `PAYPAL_CLIENT_ID` - ❌ MISSING
- `PAYPAL_CLIENT_SECRET` - ❌ MISSING
- `KLARNA_USERNAME` - ❌ MISSING
- `KLARNA_PASSWORD` - ❌ MISSING
- `SQUARE_ACCESS_TOKEN` - ❌ MISSING

**Rotation Schedule**: Every 90 days  
**PCI Compliance**: Required for production payment processing

### Communication Services
- `DISCORD_BOT_TOKEN` - ❌ MISSING (blocking Discord integration)
- `PLIVO_AUTH_ID` - ❌ MISSING
- `PLIVO_AUTH_TOKEN` - ❌ MISSING
- `TELNYX_API_KEY` - ❌ MISSING

**Rotation Schedule**: Every 180 days

## Security Best Practices

### 1. Never Commit Secrets

**Prevention**:
```bash
# Install pre-commit hook
cat > .git/hooks/pre-commit << 'EOF'
#!/bin/bash
# Prevent committing secrets
if git diff --cached | grep -E "(sk-ant|sk-|API_KEY.*=.*[a-zA-Z0-9]{20,}|SECRET.*=.*[a-zA-Z0-9]{20,})"; then
  echo "⚠️  Potential secret detected in commit! Aborting."
  exit 1
fi
EOF
chmod +x .git/hooks/pre-commit
```

**Detection**:
```bash
# Scan for accidentally committed secrets
git log -p | grep -E "(sk-ant|sk-|glpat-|ghp_)" || echo "✅ No secrets found"

# Use git-secrets tool
git secrets --scan
```

### 2. Principle of Least Privilege

- Create service-specific IAM roles with minimal permissions
- Use read-only credentials for monitoring/observability
- Separate credentials for dev/staging/production

### 3. Credential Rotation

**Automated Rotation** (Production):
```bash
# AWS Secrets Manager automatic rotation
aws secretsmanager rotate-secret \
  --secret-id agentic-flow/prod/anthropic-api-key \
  --rotation-lambda-arn arn:aws:lambda:us-west-1:xxx:function:rotate-secret
```

**Manual Rotation Checklist**:
1. Generate new credential in provider dashboard
2. Update secret in secrets manager
3. Deploy updated configuration
4. Verify application works with new credential
5. Revoke old credential after 24-hour grace period
6. Document rotation in changelog

### 4. Audit & Monitoring

**CloudWatch Alarms** (AWS):
```bash
# Monitor API key usage
aws cloudwatch put-metric-alarm \
  --alarm-name agentic-flow-unusual-api-usage \
  --metric-name CallCount \
  --threshold 10000 \
  --comparison-operator GreaterThanThreshold
```

**Audit Logs**:
- GitHub Actions: View workflow runs for secret access
- AWS CloudTrail: Monitor Secrets Manager access
- Vault Audit: Review secret read operations

### 5. Emergency Procedures

**Compromised Credential Response**:

1. **Immediate** (< 5 minutes):
   ```bash
   # Revoke compromised credential
   aws iam delete-access-key --access-key-id AKIA...
   ```

2. **Short-term** (< 1 hour):
   - Generate replacement credential
   - Update secrets manager
   - Deploy emergency patch
   - Notify security team

3. **Post-incident** (< 24 hours):
   - Review access logs for unauthorized usage
   - Assess blast radius
   - Document incident in `.goalie/SECURITY_INCIDENTS.yaml`
   - Update rotation schedule

## Validation & Testing

### Validate Secrets Configuration

```bash
# Run validation script
./scripts/validate-secrets.sh

# Expected output:
# ✅ AWS credentials valid
# ⚠️  ANTHROPIC_API_KEY not set
# ❌ STRIPE_SECRET_KEY missing (required for payment tests)
```

### Skip External API Tests in CI

When credentials are not available in CI, tests requiring external APIs should be skipped:

```typescript
// In test file
describe('Stripe Integration', () => {
  beforeAll(() => {
    if (!process.env.STRIPE_SECRET_KEY) {
      console.log('⚠️  Skipping Stripe tests (STRIPE_SECRET_KEY not set)');
    }
  });

  it('should process payment', () => {
    if (!process.env.STRIPE_SECRET_KEY) {
      return; // Skip test
    }
    // Test implementation
  });
});
```

## Compliance & Regulations

### PCI DSS (Payment Card Industry)
- Required for: Stripe, PayPal, Klarna, Square integrations
- Key requirements:
  - Encrypt cardholder data at rest and in transit
  - Maintain secure network
  - Regular security testing
  - Access control measures

### GDPR (General Data Protection Regulation)
- Applies to: User data, analytics, EU customers
- Key requirements:
  - Data encryption
  - Right to deletion
  - Breach notification (72 hours)
  - Data processing agreements

### SOC 2 (Service Organization Control)
- Recommended for: Production SaaS deployment
- Key controls:
  - Access control
  - Change management
  - Incident response
  - Business continuity

## Tools & Resources

### Recommended Tools
- **git-secrets**: Prevent committing secrets ([GitHub](https://github.com/awslabs/git-secrets))
- **truffleHog**: Find secrets in git history ([GitHub](https://github.com/trufflesecurity/trufflehog))
- **detect-secrets**: Pre-commit hook for secrets ([GitHub](https://github.com/Yelp/detect-secrets))

### Documentation Links
- AWS Secrets Manager: https://docs.aws.amazon.com/secretsmanager/
- HashiCorp Vault: https://www.vaultproject.io/docs
- GitHub Actions Secrets: https://docs.github.com/en/actions/security-guides/encrypted-secrets

## Support & Contact

**Security Issues**: Create issue with `security` label in `.goalie/CONSOLIDATED_ACTIONS.yaml`

**Credential Requests**: Contact DevOps team with justification and least-privilege requirements

**Incident Response**: Follow emergency procedures above, notify security team immediately

---

**Last Updated**: 2025-12-01T00:17Z  
**Owner**: Seeker Circle (Exploration & Discovery Lead)  
**Review Schedule**: Quarterly (every 90 days)
