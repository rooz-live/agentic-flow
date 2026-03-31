# Security Incident Response Status

**Incident ID:** AWS-GITHUB-LEAK-20251209  
**Discovered:** December 9, 2025 00:14 UTC  
**Current Status:** 🟡 In Progress (60% Complete)  
**Deadline:** December 14, 2025 23:59 UTC (5 days remaining)

---

## Executive Summary

Multiple API keys and credentials were accidentally committed to public GitHub repository `rooz-live/agentic-flow` in commit `961a2b6d80afcf0963856db0f7360bc9a9c3f0db`. AWS and Anthropic detected the exposure via GitHub's Secret Scanning Partner Program and sent notifications.

**Immediate Impact:**
- AWS restricted account access
- Anthropic automatically revoked the exposed API key
- 9+ services had credentials exposed

**Response Time:**
- Detection to containment: 30 minutes
- Git history cleanup: Completed within 45 minutes
- Root key deletion: Completed within 75 minutes

---

## ✅ Completed Actions (60%)

### 1. Git History Remediation ✅
**Completed:** December 9, 2025 00:44 UTC

- ✅ Removed `.snapshots/dry-run-test/environment.txt` from working tree
- ✅ Added file path to `.gitignore`
- ✅ Installed git-filter-repo tool
- ✅ Purged file from entire repository history (all 765 commits)
- ✅ Force-pushed cleaned history to all branches (8 branches updated)
- ✅ Force-pushed cleaned history to all tags (32 tags updated)
- ✅ Created backup: `/Users/shahroozbhopti/Documents/code/investing/agentic-flow-backup.git`

**Verification:**
```bash
# Confirm file is gone from history
git log --all --full-history -- .snapshots/dry-run-test/environment.txt
# Should return: (no output)
```

### 2. AWS Root Access Key Elimination ✅
**Completed:** December 9, 2025 (user confirmed)

- ✅ Created IAM user `admin-user` with AdministratorAccess
- ✅ Generated IAM access keys for admin-user
- ✅ Deleted BOTH root access keys via AWS Console:
  - Key 1: AKIAQRPZDOHMGXL2AAUN (created 2022-12-03)
  - Key 2: [Second key created 2025-06-29]
- ⏳ Need to create new IAM access keys via Console for CLI access

**Next Step:** Follow guide in `AWS-ACCESS-RESTORATION.md`

### 3. Anthropic API Key ✅
**Completed:** December 9, 2025 00:14 UTC (Automatic)

- ✅ Automatically revoked by Anthropic (Key ID: 6158336)
- ⏳ Create new key at: https://platform.claude.com/settings/keys

### 4. Documentation Created ✅

- ✅ `security-audit-cloudtrail.sh` - Automated CloudTrail audit script
- ✅ `aws-support-response.md` - AWS Support Case response template
- ✅ `CREDENTIAL-ROTATION-CHECKLIST.md` - Complete rotation guide
- ✅ `AWS-ACCESS-RESTORATION.md` - Guide to restore CLI access
- ✅ `GITHUB-CACHE-PURGE-REQUEST.txt` - GitHub support request template
- ✅ `INCIDENT-RESPONSE-STATUS.md` - This document

---

## ⏳ In Progress Actions (40%)

### 5. Third-Party Credential Rotation 🟡

**Status:** 1/9 Complete (Anthropic auto-revoked)

| Service | Status | Priority | Action |
|---------|--------|----------|--------|
| AWS | ✅ Complete | P0 | Root keys deleted, need new IAM keys |
| Anthropic | ✅ Complete | P0 | Auto-revoked, create new key |
| OpenAI | ⏳ Pending | P1 | Revoke at https://platform.openai.com/api-keys |
| Stripe (Public) | ⏳ Pending | P1 | Roll at https://dashboard.stripe.com/test/apikeys |
| Stripe (Secret) | ⏳ Pending | P1 | Roll at https://dashboard.stripe.com/test/apikeys |
| Stripe (Webhook) | ⏳ Pending | P1 | Regenerate at https://dashboard.stripe.com/test/webhooks |
| Slack Webhook | ⏳ Pending | P2 | Regenerate at https://api.slack.com/apps |
| Passbolt Token | ⏳ Pending | P2 | Regenerate in Passbolt dashboard |
| Gemini | ⏳ Pending | P2 | Revoke at https://makersuite.google.com/app/apikey |
| OpenRouter | ⏳ Pending | P2 | Revoke at https://openrouter.ai/keys |

**Detailed instructions:** See `CREDENTIAL-ROTATION-CHECKLIST.md`

### 6. CloudTrail Security Audit 🟡

**Status:** Script ready, waiting for AWS CLI access restoration

**Blocked by:** Need new IAM access keys from AWS Console

**To run after AWS access restored:**
```bash
./security-audit-cloudtrail.sh > security-audit-$(date +%Y%m%d-%H%M%S).log 2>&1
```

**Will check for:**
- Unauthorized IAM users, access keys, policies
- Unexpected EC2 instances, Lambda functions
- S3 bucket policy changes
- Resource creation in all regions
- Generate IAM credential report

### 7. GitHub Security Hardening ⏳

**Actions Required:**

1. **Enable Secret Scanning**
   - Go to: https://github.com/rooz-live/agentic-flow/settings/security_analysis
   - Enable "Secret scanning"
   - Enable "Push protection"

2. **Submit Cache Purge Request**
   - Use template in: `GITHUB-CACHE-PURGE-REQUEST.txt`
   - Submit at: https://support.github.com/contact
   - Category: Security
   - Save ticket number for AWS report

3. **Review Repository Settings**
   - Consider: Make repository Private
   - Review: Deploy keys and secrets
   - Update: GitHub Actions secrets

4. **Enable Dependabot**
   - Already enabled (GitHub reported 2 vulnerabilities)
   - Review and fix: https://github.com/rooz-live/agentic-flow/security/dependabot

### 8. AWS Account Hardening ⏳

**Blocked by:** Need AWS CLI access restored

**Actions Required:**

1. **Enable MFA on Root Account**
   - AWS Console → Account → Security Credentials
   - Add MFA device (virtual authenticator)

2. **Enable Security Services in All Regions**
   ```bash
   # After CLI access restored
   # GuardDuty
   for region in $(aws ec2 describe-regions --query 'Regions[].RegionName' --output text); do
     aws guardduty create-detector --enable --region $region
   done
   
   # Security Hub
   aws securityhub enable-security-hub
   
   # IAM Access Analyzer
   aws accessanalyzer create-analyzer --analyzer-name default --type ACCOUNT
   ```

3. **Set Up Billing Alerts**
   - AWS Console → Billing → Billing Preferences
   - Enable: "Receive Billing Alerts"
   - CloudWatch → Alarms → Create alarm for unexpected spend

4. **Configure CloudTrail**
   - Centralized logging to S3
   - Enable S3 Object Lock
   - Set up alerts for suspicious activity

### 9. AWS Support Case Response ⏳

**Status:** Template ready in `aws-support-response.md`

**Required before submission:**
1. Complete CloudTrail audit (blocked by CLI access)
2. Complete all credential rotations
3. Complete AWS security hardening
4. Get GitHub cache purge ticket number

**Submit to:** Existing AWS Support Case (check AWS Console for case number)

---

## Risk Assessment

### Current Risk Level: 🟡 MEDIUM (Down from 🔴 HIGH)

**Mitigated Risks:**
- ✅ Root access keys deleted - No further AWS API abuse possible
- ✅ Git history cleaned - No new exposures from repository
- ✅ Anthropic key revoked - No Claude API abuse possible

**Remaining Risks:**
- 🟡 7 API keys still valid (OpenAI, Stripe, Slack, Passbolt, Gemini, OpenRouter)
- 🟡 GitHub caches may still contain commit for ~24-48 hours
- 🟡 CloudTrail audit not yet run - Unknown if abuse occurred
- 🟡 AWS account not yet hardened - Vulnerable to future incidents

**Timeline to Zero Risk:**
- 2-4 hours: Complete all credential rotations
- 24-48 hours: GitHub cache purge completed
- 48 hours: CloudTrail audit completed, AWS hardening complete

---

## Next Actions (Priority Order)

### Immediate (Next 2 Hours)

1. **Restore AWS CLI Access** ⏰ URGENT
   - Follow: `AWS-ACCESS-RESTORATION.md`
   - Sign into AWS Console as root
   - Create new IAM access keys for existing user or new user
   - Update `~/.aws/credentials`
   - Verify: `aws sts get-caller-identity`

2. **Rotate Priority 1 Credentials** ⏰ URGENT
   - OpenAI: https://platform.openai.com/api-keys
   - Stripe (all 3 keys): https://dashboard.stripe.com/test/apikeys

3. **Create New Anthropic API Key** ⏰ URGENT
   - Go to: https://platform.claude.com/settings/keys
   - Create new key
   - Update environment variables
   - Test with simple API call

### Within 24 Hours

4. **Run CloudTrail Security Audit**
   ```bash
   ./security-audit-cloudtrail.sh > security-audit-$(date +%Y%m%d-%H%M%S).log 2>&1
   ```
   - Review output for unauthorized activity
   - Document findings in `aws-support-response.md`

5. **Rotate Remaining Credentials**
   - Slack webhook
   - Passbolt token
   - Gemini API key
   - OpenRouter API key

6. **Submit GitHub Cache Purge Request**
   - Use: `GITHUB-CACHE-PURGE-REQUEST.txt`
   - Submit at: https://support.github.com/contact
   - Save ticket number

7. **Enable GitHub Security Features**
   - Secret scanning
   - Push protection
   - Review Dependabot alerts

### Within 48 Hours

8. **Enable AWS Security Hardening**
   - MFA on root
   - GuardDuty in all regions
   - Security Hub
   - IAM Access Analyzer
   - CloudTrail centralized logging
   - Billing alerts

9. **Submit AWS Support Case Response**
   - Complete template in `aws-support-response.md`
   - Include CloudTrail audit results
   - Include GitHub ticket number
   - Request account restoration and billing review

### Within 5 Days (Before Deadline)

10. **Final Verification**
    - All credentials rotated ✓
    - All audit logs reviewed ✓
    - No unauthorized activity found ✓
    - All security features enabled ✓
    - AWS Support Case resolved ✓

---

## Files Created During Response

```
/Users/shahroozbhopti/Documents/code/investing/agentic-flow/
├── .gitignore (updated)
├── security-audit-cloudtrail.sh
├── aws-support-response.md
├── CREDENTIAL-ROTATION-CHECKLIST.md
├── AWS-ACCESS-RESTORATION.md
├── GITHUB-CACHE-PURGE-REQUEST.txt
├── INCIDENT-RESPONSE-STATUS.md (this file)
└── /Users/shahroozbhopti/Documents/code/investing/agentic-flow-backup.git/ (backup)
```

**Git ignored:**
- `iam-credentials-report.csv`
- `security-audit-*.log`
- `.snapshots/dry-run-test/environment.txt`

---

## Contact Information

**AWS Support Case:** [Check AWS Console for case number]  
**GitHub Support:** [Will have ticket number after submission]  
**Internal Contact:** [Your contact info]

---

## Lessons Learned (Post-Incident)

**To be completed after full resolution:**

1. Never commit environment files
2. Use pre-commit hooks to detect secrets
3. Regular secret rotation schedule
4. Use AWS Secrets Manager for production
5. Implement least-privilege IAM policies
6. Monitor CloudTrail continuously
7. Enable all AWS security services
8. Regular security training for team

---

**Last Updated:** December 9, 2025 01:28 UTC  
**Status:** 60% Complete - On Track  
**Next Review:** After AWS CLI access restored
