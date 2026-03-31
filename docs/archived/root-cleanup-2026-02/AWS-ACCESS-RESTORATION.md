# AWS Access Restoration Guide

## Current Situation
- ✅ Root access keys successfully deleted from AWS Console
- ❌ IAM admin-user credentials (AKIAQRPZDOHMFRJK7YQP) are invalid
- Need to create new IAM credentials via AWS Console

## Steps to Restore AWS CLI Access

### Option 1: Use Existing IAM User (admin-user)

1. **Sign into AWS Console as Root**
   - Go to: https://console.aws.amazon.com/
   - Use root email and password (NOT access keys)

2. **Navigate to IAM User**
   - Services → IAM → Users → admin-user
   - Or go directly to: https://console.aws.amazon.com/iam/home#/users/admin-user

3. **Create New Access Keys**
   - Click "Security credentials" tab
   - Scroll to "Access keys" section
   - Click "Create access key"
   - Select "Command Line Interface (CLI)"
   - Check the confirmation box
   - Click "Create access key"
   - **IMPORTANT:** Download the CSV or copy both keys immediately

4. **Update Local Credentials**
   ```bash
   aws configure set aws_access_key_id YOUR_NEW_ACCESS_KEY_ID
   aws configure set aws_secret_access_key YOUR_NEW_SECRET_ACCESS_KEY
   aws configure set region us-west-1
   ```

5. **Verify Access**
   ```bash
   aws sts get-caller-identity
   ```
   
   Should show:
   ```json
   {
       "UserId": "AIDXXXXXXXXXXXXXXXXXX",
       "Account": "795657522511",
       "Arn": "arn:aws:iam::795657522511:user/admin-user"
   }
   ```

### Option 2: Create New IAM User (Recommended)

If admin-user doesn't exist or has issues:

1. **Sign into AWS Console as Root**

2. **Create New IAM User**
   - Services → IAM → Users → Add users
   - Username: `cli-admin` (or your preferred name)
   - Click "Next"

3. **Set Permissions**
   - Select "Attach policies directly"
   - Search and select: `AdministratorAccess`
   - Click "Next"

4. **Enable MFA (Highly Recommended)**
   - After user is created, click on the username
   - Security credentials tab → Assigned MFA device → Manage
   - Choose "Virtual MFA device" (like Google Authenticator)
   - Follow the setup wizard

5. **Create Access Keys**
   - In "Security credentials" tab
   - Scroll to "Access keys"
   - Click "Create access key"
   - Select "Command Line Interface (CLI)"
   - Click "Create access key"
   - Download the CSV

6. **Update Local Credentials**
   ```bash
   aws configure set aws_access_key_id YOUR_NEW_ACCESS_KEY_ID
   aws configure set aws_secret_access_key YOUR_NEW_SECRET_ACCESS_KEY
   aws configure set region us-west-1
   ```

### After Restoring Access

1. **Run Security Audit**
   ```bash
   ./security-audit-cloudtrail.sh > security-audit-$(date +%Y%m%d-%H%M%S).log 2>&1
   ```

2. **List All IAM Users and Keys**
   ```bash
   aws iam list-users
   aws iam generate-credential-report
   sleep 5
   aws iam get-credential-report --query 'Content' --output text | base64 --decode > iam-credentials-report.csv
   ```

3. **Check for Old/Invalid Keys**
   Review `iam-credentials-report.csv` and delete any:
   - Keys from deleted users
   - Keys older than 90 days (best practice)
   - Inactive keys
   - The old invalid admin-user keys if they still exist

4. **Delete Invalid admin-user Keys**
   ```bash
   # List keys for admin-user
   aws iam list-access-keys --user-name admin-user
   
   # Delete the invalid key
   aws iam delete-access-key --user-name admin-user --access-key-id AKIAQRPZDOHMFRJK7YQP
   ```

## Security Best Practices Going Forward

1. **Never Use Root Access Keys**
   - Root account should ONLY be used for:
     - Billing/account management
     - Emergency access
   - Always use IAM users/roles for daily work

2. **Enable MFA Everywhere**
   - Root account: MUST have MFA
   - IAM admin users: MUST have MFA
   - Consider: Require MFA for sensitive operations via IAM policies

3. **Rotate Access Keys Regularly**
   - Recommended: Every 90 days
   - AWS will warn at 90 days
   - Use IAM credential report to track key age

4. **Use IAM Roles for Applications**
   - EC2: Use instance profiles
   - Lambda: Use execution roles
   - ECS/EKS: Use task/pod roles
   - Avoid embedding access keys in code

5. **Enable CloudTrail Logging**
   - Log all API calls
   - Send to S3 with lifecycle policy
   - Enable S3 Object Lock for immutability
   - Set up alerts for suspicious activity

## Current Credentials File Location

Your AWS credentials are stored at:
- `~/.aws/credentials` (access keys)
- `~/.aws/config` (region and profile settings)

**NEVER commit these files to git!**

## Environment Variables

If you set AWS credentials in environment variables, update them:
```bash
export AWS_ACCESS_KEY_ID="your-new-key-id"
export AWS_SECRET_ACCESS_KEY="your-new-secret-key"
export AWS_DEFAULT_REGION="us-west-1"
```

Add to `~/.bashrc` or `~/.zshrc` if needed for persistence.

---

## 🔥 INCIDENT RESPONSE CHECKLIST (Deadline: Dec 14, 2025)

### Priority 1: Key Rotation (CRITICAL)
- [ ] Sign into AWS Console as root (web browser, email/password)
- [ ] Navigate to IAM → Users → admin-user → Security credentials
- [ ] Create NEW access key for CLI use
- [ ] Update local AWS credentials with new key
- [ ] Test new credentials work: `aws sts get-caller-identity`
- [ ] Make OLD exposed key (******************** ) INACTIVE
- [ ] Verify applications still work
- [ ] DELETE the exposed key ********************

### Priority 2: Security Audit
- [ ] Run security audit script: `./aws-security-audit.sh`
- [ ] Review CloudTrail for unauthorized IAM user creation
- [ ] Review CloudTrail for unauthorized access key creation
- [ ] Review CloudTrail for unauthorized policy/role creation
- [ ] Check for users with AWSCompromisedKeyQuarantineV2 policy
- [ ] Delete any unauthorized IAM users/roles/policies

### Priority 3: Resource Audit (Check ALL Regions)
- [ ] EC2 instances (including stopped)
- [ ] Lambda functions
- [ ] S3 buckets (check creation dates)
- [ ] ECS/ECR containers
- [ ] Auto Scaling groups
- [ ] Spot instances
- [ ] Route 53 domains
- [ ] EBS volumes/snapshots
- [ ] Review billing for unexpected charges
- [ ] Terminate/delete any unauthorized resources

### Priority 4: Enable MFA (REQUIRED)
- [ ] Enable MFA on root account (virtual MFA device)
- [ ] Enable MFA on admin-user (or new IAM user)
- [ ] Document MFA backup codes securely

### Priority 5: Confirm with AWS Support
- [ ] Respond to existing support case OR create new one
- [ ] Confirm completion of Steps 1-3 from AWS notification
- [ ] Request full account access restoration
- [ ] Request billing adjustment for unauthorized charges (if any)
- [ ] Provide security audit report summary

### Follow-up Required?
**YES** - You must respond to AWS Support to:
1. Confirm all remediation steps completed
2. Request full service restoration
3. Request billing adjustments if unauthorized charges exist

If you already contacted them once, follow up in the SAME support case to confirm remediation is complete.

---

## Quick Commands for Immediate Action

```bash
# 1. Run full security audit
./aws-security-audit.sh

# 2. Quick check - verify current identity
aws sts get-caller-identity

# 3. List all access keys for admin-user
aws iam list-access-keys --user-name admin-user

# 4. Check if exposed key is still active
aws iam list-access-keys --user-name admin-user | grep "********************"

# 5. Delete exposed key (AFTER creating new one)
aws iam delete-access-key --user-name admin-user --access-key-id ********************

# 6. Check CloudTrail for suspicious activity since Dec 9
aws cloudtrail lookup-events --start-time 2025-12-09T00:00:00Z --max-results 50

# 7. List EC2 instances in us-west-1
aws ec2 describe-instances --region us-west-1 --query 'Reservations[].Instances[].[InstanceId,State.Name,LaunchTime]'

# 8. Check recent costs
aws ce get-cost-and-usage --time-period Start=2025-12-01,End=2025-12-09 --granularity DAILY --metrics "UnblendedCost"
```

---

**Status:** Root keys deleted ✅ | AWS Support contacted ✅ | IAM key rotation pending ⏳ | Audit pending ⏳
