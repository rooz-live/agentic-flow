# Security Incident Response - Quick Reference

**⚠️ ACTIVE SECURITY INCIDENT - December 9, 2025**

## 📊 Current Status: 60% Complete

**Root keys deleted:** ✅  
**Git history cleaned:** ✅  
**AWS CLI access:** ⏳ Needs restoration  
**Credentials rotated:** 2/9 complete  
**Deadline:** December 14, 2025

---

## 🚀 Quick Actions - Do These NOW

### 1️⃣ Restore AWS CLI Access (10 minutes)
```bash
# Read this file first:
cat AWS-ACCESS-RESTORATION.md

# Then sign into AWS Console as root and create new IAM access keys
# Update your credentials:
aws configure set aws_access_key_id YOUR_NEW_KEY
aws configure set aws_secret_access_key YOUR_NEW_SECRET
aws configure set region us-west-1

# Verify it works:
aws sts get-caller-identity
```

### 2️⃣ Run Security Audit (15 minutes)
```bash
# After AWS CLI access is restored:
./security-audit-cloudtrail.sh > security-audit-$(date +%Y%m%d-%H%M%S).log 2>&1

# Review the log for unauthorized activity
```

### 3️⃣ Rotate Priority 1 Credentials (30 minutes)
Follow the detailed checklist:
```bash
cat CREDENTIAL-ROTATION-CHECKLIST.md
```

**Must rotate immediately:**
- Anthropic API (https://platform.claude.com/settings/keys)
- OpenAI API (https://platform.openai.com/api-keys)
- Stripe keys (https://dashboard.stripe.com/test/apikeys)

### 4️⃣ Submit GitHub Cache Purge (5 minutes)
```bash
# Read the template:
cat GITHUB-CACHE-PURGE-REQUEST.txt

# Then submit at: https://support.github.com/contact
```

---

## 📁 Documentation Files

| File | Purpose | Status |
|------|---------|--------|
| `INCIDENT-RESPONSE-STATUS.md` | **Master document** - Full status and timeline | ✅ Current |
| `AWS-ACCESS-RESTORATION.md` | Guide to restore AWS CLI access | ⏳ Action needed |
| `CREDENTIAL-ROTATION-CHECKLIST.md` | Complete guide for rotating all 9+ credentials | ⏳ In progress |
| `security-audit-cloudtrail.sh` | Automated CloudTrail audit script | ✅ Ready to run |
| `aws-support-response.md` | AWS Support Case response template | ⏳ Update after audit |
| `GITHUB-CACHE-PURGE-REQUEST.txt` | GitHub support request template | ⏳ Submit now |
| `SECURITY-INCIDENT-README.md` | This file - quick reference | ✅ Current |

---

## ✅ What's Been Done

1. **Git History Cleaned** (00:44 UTC)
   - File `.snapshots/dry-run-test/environment.txt` completely purged
   - All 8 branches force-pushed
   - All 32 tags force-pushed
   - Backup created at: `~/Documents/code/investing/agentic-flow-backup.git`

2. **Root Access Keys Deleted** (User confirmed)
   - Both root keys removed from AWS Console
   - IAM admin-user created (but needs new keys)

3. **Anthropic API Key** (Auto-revoked)
   - Automatically revoked by Anthropic at 00:14 UTC
   - Need to create new key

---

## ⏳ What Needs to Be Done

### Priority 0 - URGENT (Next 2 hours)
- [ ] Restore AWS CLI access
- [ ] Create new Anthropic API key
- [ ] Rotate OpenAI API key
- [ ] Rotate Stripe keys (3 keys)

### Priority 1 - Important (Within 24 hours)
- [ ] Run CloudTrail audit
- [ ] Rotate remaining credentials (Slack, Passbolt, Gemini, OpenRouter)
- [ ] Submit GitHub cache purge request
- [ ] Enable GitHub secret scanning
- [ ] Enable GitHub push protection

### Priority 2 - Follow-up (Within 48 hours)
- [ ] Enable AWS GuardDuty in all regions
- [ ] Enable AWS Security Hub
- [ ] Enable IAM Access Analyzer
- [ ] Set up AWS billing alerts
- [ ] Configure CloudTrail centralized logging
- [ ] Submit AWS Support Case response

---

## 🔍 How to Verify Everything is Fixed

### 1. Git History is Clean
```bash
# Should return nothing:
git log --all --full-history -- .snapshots/dry-run-test/environment.txt

# Should not show the old commit:
git log --all --oneline | grep 961a2b6
```

### 2. AWS Root Keys Deleted
```bash
# Sign into AWS Console as root
# Go to: Account Menu → Security Credentials
# Confirm: "Access keys" section shows 0 keys
```

### 3. All Credentials Rotated
Check each service dashboard - old keys should be deleted/revoked:
- AWS IAM: Old root keys gone
- Anthropic: Old key revoked (Key ID 6158336)
- OpenAI: Old key revoked
- Stripe: Old keys rolled
- Slack: Old webhook invalidated
- Etc.

### 4. No Unauthorized AWS Activity
```bash
# After running audit script, check for:
# - No unauthorized IAM users
# - No unexpected EC2 instances
# - No suspicious Lambda functions
# - No unusual billing charges
```

---

## 🆘 If You Need Help

### Documentation
1. Start with: `INCIDENT-RESPONSE-STATUS.md` (most comprehensive)
2. For specific tasks, check the relevant file from the table above

### AWS Support
- Check AWS Console for your support case number
- Reference incident: AWS-GITHUB-LEAK-20251209
- Deadline: December 14, 2025

### GitHub Support
- Will have ticket number after submitting cache purge request
- Use template in: `GITHUB-CACHE-PURGE-REQUEST.txt`

---

## 🎯 Success Criteria

**Incident is fully resolved when:**
- ✅ Git history completely cleaned (DONE)
- ✅ Root access keys deleted (DONE)
- ⏳ All 9+ credentials rotated
- ⏳ CloudTrail audit shows no unauthorized activity
- ⏳ GitHub cache purge request submitted
- ⏳ AWS security hardening completed
- ⏳ AWS Support Case resolved
- ⏳ Account access fully restored

---

## ⏰ Timeline

| Time | Event |
|------|-------|
| Dec 9, 00:14 UTC | Incident discovered (AWS + Anthropic alerts) |
| Dec 9, 00:44 UTC | Git history cleaned and force-pushed |
| Dec 9, 01:28 UTC | Root keys deleted, documentation complete |
| Dec 9, 03:00 UTC | **Target: AWS CLI restored, audit run** |
| Dec 10, 00:00 UTC | **Target: All credentials rotated** |
| Dec 11, 00:00 UTC | **Target: AWS hardening complete** |
| Dec 12, 00:00 UTC | **Target: Support cases submitted** |
| Dec 14, 23:59 UTC | **DEADLINE: AWS response required** |

---

**Current Time:** December 9, 2025 01:28 UTC  
**Hours Since Incident:** 1.25 hours  
**Hours Until Deadline:** 119.5 hours (5 days)  
**Status:** On track, 60% complete

**Next Action:** Restore AWS CLI access using `AWS-ACCESS-RESTORATION.md`
