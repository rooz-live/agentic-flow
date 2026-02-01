# Environment Variable Setup Guide

**Date**: 2026-01-17  
**Purpose**: Configure missing credentials for YOLIFE deployments  
**Priority**: P1 (High) - Required for remote deployments

---

## 🎯 Quick Setup

### 1. Copy Template to Active .env

```bash
# Option A: Use comprehensive template (recommended)
cp .env.example .env

# Option B: Use simplified template
cp .env.template .env
```

### 2. Set Critical Missing Variables

**Required for test fixes and deployments**:

```bash
# Edit .env file
nano .env  # or vim, code, etc.

# Set these MINIMUM values:

# cPanel (for cPanel API deployments)
CPANEL_HOST="cpanel.rooz.live"              # Your cPanel hostname
CPANEL_API_KEY="your_cpanel_api_key"        # cPanel API token
CPANEL_USERNAME="your_cpanel_username"      # cPanel username

# GitLab (for CI/CD and code management)
GITLAB_HOST="dev.interface.tag.ooo"         # Your GitLab instance
GITLAB_TOKEN="glpat-your_gitlab_token"      # GitLab personal access token

# Hivelocity (for bare metal deployments)
HIVELOCITY_API_KEY="your_hivelocity_key"    # Device 24460 management
```

### 3. Verify Setup

```bash
# Check variables are set
source .env
echo "cPanel: ${CPANEL_HOST:-NOT SET}"
echo "GitLab: ${GITLAB_HOST:-NOT SET}"
echo "Hivelocity: ${HIVELOCITY_API_KEY:0:10}... (${#HIVELOCITY_API_KEY} chars)"
```

---

## 📋 Detailed Configuration

### Where to Find Credentials

#### cPanel Credentials

**Location**: cPanel control panel  
**Access**: https://$CPANEL_HOST:2083

1. Log into cPanel
2. Navigate to **Security** → **Manage API Tokens**
3. Create new token named "agentic-flow-deploy"
4. Set expiration (recommend 90 days)
5. Copy token → Add to .env as `CPANEL_API_KEY`

**Hostname Sources**:
- From existing rule: `YOLIFE_CPANEL_HOST=**************`
- Format: `cpanel.yourdomain.com` or IP address
- Port: Usually 2083 (HTTPS) or 2082 (HTTP)

#### GitLab Token

**Location**: GitLab instance  
**Access**: https://$GITLAB_HOST (AWS EC2 instance)

1. Log into GitLab at https://dev.interface.tag.ooo
2. Click avatar → **Preferences**
3. Left sidebar → **Access Tokens**
4. Create token with scopes:
   - `api` - Access API
   - `read_repository` - Read repositories
   - `write_repository` - Write repositories
5. Copy token → Add to .env as `GITLAB_TOKEN`

**Hostname**:
- From existing rules: `YOLIFE_GITLAB_HOST=*************`
- Running on AWS i-097706d9355b9f1b2
- Probably: `dev.interface.tag.ooo` or similar

#### Hivelocity API Key

**Location**: Hivelocity Portal  
**Access**: https://portal.hivelocity.net

1. Log into Hivelocity Portal
2. Navigate to **Account** → **API Keys**
3. Create new API key named "agentic-flow"
4. Set permissions: Read + Write on devices
5. Copy key → Add to .env as `HIVELOCITY_API_KEY`

**Context**:
- Managing device 24460 (bare metal server)
- Used for staging/production deployments
- Required for Hivelocity failover in multi-cloud setup

---

## 🔒 Security Best Practices

### 1. Verify .gitignore

```bash
# Ensure .env is ignored
grep "^\.env$" .gitignore || echo ".env" >> .gitignore
grep "^\.env\.local$" .gitignore || echo ".env.local" >> .gitignore
```

### 2. Never Commit Credentials

```bash
# Check for accidental commits
git log --all --full-history -- .env

# If found, remove from history (DANGEROUS - coordinate with team)
# git filter-branch --force --index-filter \
#   'git rm --cached --ignore-unmatch .env' \
#   --prune-empty --tag-name-filter cat -- --all
```

### 3. Rotate Regularly

- **cPanel tokens**: Every 90 days
- **GitLab tokens**: Every 180 days  
- **Hivelocity keys**: Every year
- **After team changes**: Immediately

### 4. Use Secret Manager (Production)

For production, consider:
- **1Password** - Team secret management
- **AWS Secrets Manager** - Cloud-native
- **HashiCorp Vault** - Self-hosted
- **Passbolt** - Already configured (PASSBOLT_API_TOKEN)

---

## 🧪 Testing Your Setup

### Test cPanel Connection

```bash
# Test API connectivity
curl -H "Authorization: cpanel username:$CPANEL_API_KEY" \
     "https://$CPANEL_HOST:2083/execute/CpanelApi/version"

# Should return JSON with version info
```

### Test GitLab Connection

```bash
# Test API connectivity  
curl -H "PRIVATE-TOKEN: $GITLAB_TOKEN" \
     "https://$GITLAB_HOST/api/v4/user"

# Should return JSON with your user info
```

### Test Hivelocity Connection

```bash
# Test API connectivity
curl -H "X-API-KEY: $HIVELOCITY_API_KEY" \
     "https://core.hivelocity.net/api/v2/device/"

# Should return JSON with device list
```

### Run Connectivity Tests

```bash
# Run full connectivity test suite
npm test -- --testPathPattern="connectivity"

# Should now pass cPanel and GitLab tests
```

---

## 📊 Environment Variables Reference

### Critical (P0) - Required Now

| Variable | Purpose | Where Used | Example |
|----------|---------|------------|---------|
| `CPANEL_HOST` | cPanel hostname | Deploy scripts | `cpanel.rooz.live` |
| `CPANEL_API_KEY` | cPanel authentication | API calls | `ABC123...` |
| `GITLAB_HOST` | GitLab instance | CI/CD integration | `dev.interface.tag.ooo` |
| `GITLAB_TOKEN` | GitLab authentication | Git operations | `glpat-...` |
| `HIVELOCITY_API_KEY` | Device management | Bare metal deploy | `hive_...` |

### Important (P1) - Needed Soon

| Variable | Purpose | Where Used | Example |
|----------|---------|------------|---------|
| `AWS_ACCESS_KEY_ID` | AWS authentication | Multi-cloud deploy | `AKIA...` |
| `AWS_SECRET_ACCESS_KEY` | AWS authentication | Multi-cloud deploy | `secret...` |
| `ANTHROPIC_API_KEY` | Claude AI | LLM operations | `sk-ant-...` |
| `POSTGRES_PASSWORD` | Database access | Data persistence | `secure_pw` |

### Nice-to-Have (P2) - Optional

| Variable | Purpose | Where Used | Example |
|----------|---------|------------|---------|
| `CLOUDFLARE_API_TOKEN` | DNS/CDN management | Domain automation | `token...` |
| `HOSTBILL_API_KEY` | Billing integration | Payment processing | `hb_...` |
| `STRIPE_SECRET_KEY` | Payment processing | Affiliate system | `sk_live_...` |

---

## 🚀 Quick Start Checklist

- [ ] Copy .env template: `cp .env.example .env`
- [ ] Set CPANEL_HOST
- [ ] Set CPANEL_API_KEY  
- [ ] Set GITLAB_HOST
- [ ] Set GITLAB_TOKEN
- [ ] Set HIVELOCITY_API_KEY
- [ ] Verify .env in .gitignore
- [ ] Test cPanel connection
- [ ] Test GitLab connection
- [ ] Test Hivelocity connection
- [ ] Run connectivity tests: `npm test -- --testPathPattern="connectivity"`
- [ ] Deploy to dev: `./tooling/cli/ay yolife stx`

---

## 🔧 Troubleshooting

### "Command not found: curl"

Install curl:
```bash
# macOS
brew install curl

# Ubuntu/Debian
sudo apt-get install curl
```

### "Permission denied" on API calls

1. Check token hasn't expired
2. Verify token has correct permissions
3. Ensure firewall allows API access
4. Check IP whitelist (if configured)

### "Cannot connect to host"

1. Verify hostname is correct
2. Check DNS resolution: `nslookup $CPANEL_HOST`
3. Test port connectivity: `nc -zv $CPANEL_HOST 2083`
4. Verify VPN/network access

### Tests Still Failing

```bash
# Check which variables are actually set
./tooling/cli/ay assess

# Should show:
# ✓ ROAM tracker current
# ✓ Environment variables set
```

---

## 📝 SSH Key Setup (Bonus)

For SSH-based deployments to STX/cPanel/GitLab:

```bash
# Ensure SSH keys exist and are referenced
ls -la ~/.ssh/starlingx_key      # For STX
ls -la ~/pem/rooz.pem              # For cPanel/GitLab

# If missing, you'll need to:
# 1. Generate keys: ssh-keygen -t ed25519 -f ~/.ssh/starlingx_key
# 2. Add public key to remote: ssh-copy-id -i ~/.ssh/starlingx_key.pub ubuntu@stx-host
# 3. Update YOLIFE env vars
```

---

## 💾 Backup Your .env

```bash
# Create encrypted backup (recommended)
gpg -c .env  # Creates .env.gpg
# Store .env.gpg in secure location (1Password, etc.)

# Or simple copy (less secure)
cp .env .env.backup.$(date +%Y%m%d)
chmod 600 .env.backup.*
```

---

## ✅ Validation Complete

Once setup is complete, you should see:

```bash
./tooling/cli/ay status
```

Output:
```
AY v1.0.0 | Mode: auto | Circles: 2/6 | Episodes: 5 | Success: 80.0% | AISP: 72/100

Circle Status:
  ● orchestrator: 2 episodes, 100.0% success
  ● assessor: 3 episodes, 66.7% success
  ○ analyst: inactive
  ○ planner: inactive
  ○ executor: inactive
  ○ validator: inactive

AISP Status: CONTINUE (72/100)
```

**Next Steps**:
1. ✅ Environment variables set
2. ⏳ Continuous improvement running (1-2 hours)
3. 📋 Fix remaining test failures
4. 🚀 Deploy to dev environment

---

**Document Owner**: Operations Team  
**Last Updated**: 2026-01-17  
**Next Review**: After deployment validation
