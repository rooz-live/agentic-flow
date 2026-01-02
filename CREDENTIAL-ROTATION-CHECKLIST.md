# Credential Rotation Checklist

**Incident Date:** December 9, 2025 00:14 UTC  
**Exposed File:** `.snapshots/dry-run-test/environment.txt`  
**Git Commit:** 961a2b6d80afcf0963856db0f7360bc9a9c3f0db

## Critical Actions Required

### ✅ Completed

1. **Git History Cleanup**
   - ✅ Removed file from working tree
   - ✅ Added to `.gitignore`
   - ✅ Purged from entire git history using git-filter-repo
   - ✅ Force-pushed to GitHub (all branches and tags)
   - ⏳ NEXT: Request GitHub cache purge at https://support.github.com/contact

2. **AWS Credentials**
   - ✅ Created IAM admin user `admin-user`
   - ✅ Generated new IAM access keys
   - ⏳ MANUAL ACTION REQUIRED: Sign into AWS Console as root
   - ⏳ Navigate to: Account Menu > Security Credentials > Access Keys
   - ⏳ Delete both root access keys:
     - AKIAQRPZDOHMGXL2AAUN (created 2022-12-03)
     - Second key (created 2025-06-29)
   - ⏳ Enable MFA on root account

3. **Anthropic API Key**
   - ✅ Automatically revoked by Anthropic (Key ID: 6158336, Key Name: Antigravity)
   - ⏳ Create new key at: https://platform.claude.com/settings/keys
   - ⏳ Update environment variables and secrets manager

### ⏳ In Progress - Rotate Immediately

4. **OpenAI API Key**
   - Exposed Key: `sk-svcacct-UOIYY4NtUzDFMpl7VwaO3GCC...` (truncated for security)
   - Action Required:
     1. Go to: https://platform.openai.com/api-keys
     2. Revoke: `sk-svcacct-UOIYY4NtUzDFMpl7VwaO3GCC...`
     3. Create new API key
     4. Update in:
        - Environment variables
        - CI/CD secrets
        - Application configurations
        - Secrets manager

5. **Stripe Test Keys**
   - Exposed Keys:
     - Public: `pk_test_0VP4TIfGV9J8mmD6duzAkFxh00hCNBlV73`
     - Secret: `sk_test_2wPMWmzr3bEXzPEv4K9x1jLd00mb1SIPJT`
     - Webhook Secret: `whsec_PrYWP6g5kMkPMK6yYHPb3JuGA6usphhD`
   - Action Required:
     1. Go to: https://dashboard.stripe.com/test/apikeys
     2. Roll all test keys
     3. Go to: https://dashboard.stripe.com/test/webhooks
     4. Recreate webhook endpoint and get new signing secret
     5. Update in:
        - Environment variables
        - Application configurations
        - Payment processing modules

6. **Slack Webhook URL**
   - Exposed: `https://hooks.slack.com/services/dev/webhook/url`
   - Action Required:
     1. Go to: https://api.slack.com/apps
     2. Find your app
     3. Regenerate incoming webhook URL
     4. Update in:
        - Environment variables
        - Notification services
        - Monitoring systems

7. **Passbolt Credentials**
   - Exposed:
     - API Key: `dev-passbolt-key-placeholder`
     - API Token: `7928220d6dede6c8d3f2b19e64eca0bc1c71b044bb308854effa8069e92dd71e`
     - Base URL: `https://passbolt.your-domain.com`
   - Action Required:
     1. Log into Passbolt
     2. Revoke exposed API token
     3. Generate new API token
     4. Update in:
        - Environment variables
        - Secret management systems

8. **Gemini API Key**
   - Exposed: (Partially masked in file)
   - Action Required:
     1. Go to: https://makersuite.google.com/app/apikey
     2. Revoke exposed key
     3. Create new API key
     4. Update in environment variables

9. **OpenRouter API Key**
   - Exposed: (Partially masked in file)
   - Action Required:
     1. Go to: https://openrouter.ai/keys
     2. Revoke exposed key
     3. Create new API key
     4. Update in environment variables

### Configuration Updates Required

After rotating all credentials, update in:

1. **Local Environment**
   ```bash
   # Update ~/.bashrc or ~/.zshrc
   export AWS_ACCESS_KEY_ID="{{NEW_AWS_ACCESS_KEY_ID}}"
   export AWS_SECRET_ACCESS_KEY="{{NEW_AWS_SECRET_ACCESS_KEY}}"
   export ANTHROPIC_API_KEY="{{NEW_ANTHROPIC_API_KEY}}"
   export OPENAI_API_KEY="{{NEW_OPENAI_API_KEY}}"
   export STRIPE_TEST_PUBLIC_KEY="{{NEW_STRIPE_PUBLIC_KEY}}"
   export STRIPE_TEST_SECRET_KEY="{{NEW_STRIPE_SECRET_KEY}}"
   export STRIPE_WEBHOOK_SECRET="{{NEW_STRIPE_WEBHOOK_SECRET}}"
   export SLACK_WEBHOOK_URL="{{NEW_SLACK_WEBHOOK_URL}}"
   export PASSBOLT_API_TOKEN="{{NEW_PASSBOLT_TOKEN}}"
   export GEMINI_API_KEY="{{NEW_GEMINI_API_KEY}}"
   export OPENROUTER_API_KEY="{{NEW_OPENROUTER_API_KEY}}"
   ```

2. **CI/CD Secrets** (GitHub Actions, GitLab CI, etc.)
   - Update all secrets in repository settings
   - Update organization-level secrets if used

3. **Application Configuration Files**
   - Search for any hardcoded references (should be none)
   - Verify all apps use environment variables

4. **Secrets Manager** (AWS Secrets Manager, HashiCorp Vault, etc.)
   - Update all stored credentials
   - Rotate any derived secrets

5. **Docker/Container Configs**
   - Update any Docker Compose files
   - Update Kubernetes secrets
   - Rebuild and redeploy containers if needed

### Verification Steps

After rotation:

1. ✅ Test AWS access with new IAM credentials
2. ⏳ Test Anthropic API with new key
3. ⏳ Test OpenAI API with new key
4. ⏳ Test Stripe with new keys (test mode transaction)
5. ⏳ Test Slack notifications with new webhook
6. ⏳ Verify Passbolt access with new token
7. ⏳ Test Gemini API with new key
8. ⏳ Test OpenRouter API with new key

### Post-Rotation Security Hardening

1. **Secrets Management**
   - ⏳ Never commit `.env` files
   - ⏳ Add `*.env*` to `.gitignore` (if not already)
   - ⏳ Use AWS Secrets Manager or similar for production
   - ⏳ Implement secret scanning in CI/CD

2. **GitHub Security**
   - ⏳ Enable Secret Scanning
   - ⏳ Enable Push Protection
   - ⏳ Review Dependabot alerts
   - ⏳ Consider making repository Private

3. **Monitoring**
   - ⏳ Set up AWS CloudTrail alerts for suspicious activity
   - ⏳ Enable GuardDuty for threat detection
   - ⏳ Set up billing alerts

### GitHub Cache Purge Request

After completing rotation, submit this form to GitHub:
https://support.github.com/contact

**Subject:** Request to purge cached repository content

**Message:**
```
Repository: rooz-live/agentic-flow
Commit: 961a2b6d80afcf0963856db0f7360bc9a9c3f0db
File: .snapshots/dry-run-test/environment.txt

We have removed sensitive credentials from our git history using git-filter-repo
and force-pushed the cleaned history. Please purge all cached versions of this 
commit and file from GitHub's CDN and caches.

All exposed credentials have been rotated.

Thank you.
```

---

**Last Updated:** December 9, 2025 00:44 UTC  
**Status:** 3/9 Complete - HIGH PRIORITY
