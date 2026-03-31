#!/bin/bash
# AWS Security Audit Script
# Purpose: Audit AWS account for unauthorized activity after key compromise
# Date: 2025-12-09
# Incident: Exposed key ******************** (admin-user)

set -euo pipefail

# Configuration
REPORT_DIR="security-audit-$(date +%Y%m%d-%H%M%S)"
INCIDENT_DATE="2025-12-09T00:00:00Z"
EXPOSED_KEY="********************"
ACCOUNT_ID="795657522511"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "=================================================="
echo "AWS Security Audit Report"
echo "Account: ${ACCOUNT_ID}"
echo "Incident Date: ${INCIDENT_DATE}"
echo "Report Time: $(date)"
echo "=================================================="
echo ""

# Create report directory
mkdir -p "${REPORT_DIR}"

# Function to log section
log_section() {
    echo ""
    echo -e "${GREEN}[$(date +%T)] $1${NC}"
    echo "---"
}

# Function to log warning
log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Function to log error
log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# 1. Verify AWS CLI access
log_section "Step 1: Verifying AWS CLI Access"
if aws sts get-caller-identity > "${REPORT_DIR}/caller-identity.json" 2>&1; then
    echo "✅ AWS CLI access verified"
    cat "${REPORT_DIR}/caller-identity.json"
else
    log_error "Cannot access AWS. Please configure credentials first."
    exit 1
fi

# 2. List all IAM users and their access keys
log_section "Step 2: Auditing IAM Users and Access Keys"
aws iam list-users > "${REPORT_DIR}/iam-users.json"
echo "Total IAM users: $(jq '.Users | length' "${REPORT_DIR}/iam-users.json")"

echo "" > "${REPORT_DIR}/access-keys-audit.txt"
for user in $(jq -r '.Users[].UserName' "${REPORT_DIR}/iam-users.json"); do
    echo "Checking user: ${user}"
    aws iam list-access-keys --user-name "${user}" > "${REPORT_DIR}/keys-${user}.json"
    
    # Check if exposed key exists
    if grep -q "${EXPOSED_KEY}" "${REPORT_DIR}/keys-${user}.json" 2>/dev/null; then
        log_error "EXPOSED KEY FOUND for user: ${user}"
        echo "EXPOSED_KEY_FOUND: ${user} - ${EXPOSED_KEY}" >> "${REPORT_DIR}/access-keys-audit.txt"
    fi
    
    # List all keys for this user
    jq -r '.AccessKeyMetadata[] | "\(.UserName),\(.AccessKeyId),\(.Status),\(.CreateDate)"' \
        "${REPORT_DIR}/keys-${user}.json" >> "${REPORT_DIR}/access-keys-audit.txt"
done

echo "Access keys saved to: ${REPORT_DIR}/access-keys-audit.txt"

# 3. Generate IAM credential report
log_section "Step 3: Generating IAM Credential Report"
aws iam generate-credential-report > /dev/null
sleep 5
aws iam get-credential-report --query 'Content' --output text | base64 --decode > "${REPORT_DIR}/iam-credential-report.csv"
echo "✅ Credential report saved to: ${REPORT_DIR}/iam-credential-report.csv"

# 4. Check for recently created IAM resources
log_section "Step 4: Checking Recently Created IAM Resources"

# Recent users
aws iam list-users --query "Users[?CreateDate>='${INCIDENT_DATE}']" > "${REPORT_DIR}/recent-iam-users.json"
echo "Recently created users: $(jq '. | length' "${REPORT_DIR}/recent-iam-users.json")"
if [ "$(jq '. | length' "${REPORT_DIR}/recent-iam-users.json")" -gt 0 ]; then
    log_warning "New users created since incident date!"
    jq -r '.[].UserName' "${REPORT_DIR}/recent-iam-users.json"
fi

# Recent roles
aws iam list-roles > "${REPORT_DIR}/iam-roles.json"
aws iam list-roles --query "Roles[?CreateDate>='${INCIDENT_DATE}']" > "${REPORT_DIR}/recent-iam-roles.json"
echo "Recently created roles: $(jq '. | length' "${REPORT_DIR}/recent-iam-roles.json")"
if [ "$(jq '. | length' "${REPORT_DIR}/recent-iam-roles.json")" -gt 0 ]; then
    log_warning "New roles created since incident date!"
    jq -r '.[].RoleName' "${REPORT_DIR}/recent-iam-roles.json"
fi

# Recent policies
aws iam list-policies --scope Local > "${REPORT_DIR}/iam-policies.json"
echo "Total customer-managed policies: $(jq '.Policies | length' "${REPORT_DIR}/iam-policies.json")"

# 5. CloudTrail Event History (last 90 days)
log_section "Step 5: Auditing CloudTrail Events Since Incident"
echo "Fetching CloudTrail events since ${INCIDENT_DATE}..."

# Check for suspicious IAM events
aws cloudtrail lookup-events \
    --start-time "${INCIDENT_DATE}" \
    --lookup-attributes AttributeKey=EventName,AttributeValue=CreateUser \
    > "${REPORT_DIR}/cloudtrail-createuser.json" 2>&1 || true

aws cloudtrail lookup-events \
    --start-time "${INCIDENT_DATE}" \
    --lookup-attributes AttributeKey=EventName,AttributeValue=CreateAccessKey \
    > "${REPORT_DIR}/cloudtrail-createaccesskey.json" 2>&1 || true

aws cloudtrail lookup-events \
    --start-time "${INCIDENT_DATE}" \
    --lookup-attributes AttributeKey=EventName,AttributeValue=CreateRole \
    > "${REPORT_DIR}/cloudtrail-createrole.json" 2>&1 || true

aws cloudtrail lookup-events \
    --start-time "${INCIDENT_DATE}" \
    --lookup-attributes AttributeKey=EventName,AttributeValue=PutUserPolicy \
    > "${REPORT_DIR}/cloudtrail-putuserpolicy.json" 2>&1 || true

aws cloudtrail lookup-events \
    --start-time "${INCIDENT_DATE}" \
    --lookup-attributes AttributeKey=EventName,AttributeValue=AttachUserPolicy \
    > "${REPORT_DIR}/cloudtrail-attachuserpolicy.json" 2>&1 || true

echo "✅ CloudTrail events saved"

# Count suspicious events
create_user_count=$(jq '.Events | length' "${REPORT_DIR}/cloudtrail-createuser.json" 2>/dev/null || echo "0")
create_key_count=$(jq '.Events | length' "${REPORT_DIR}/cloudtrail-createaccesskey.json" 2>/dev/null || echo "0")
create_role_count=$(jq '.Events | length' "${REPORT_DIR}/cloudtrail-createrole.json" 2>/dev/null || echo "0")

echo "CreateUser events: ${create_user_count}"
echo "CreateAccessKey events: ${create_key_count}"
echo "CreateRole events: ${create_role_count}"

if [ "${create_user_count}" -gt 0 ] || [ "${create_key_count}" -gt 0 ] || [ "${create_role_count}" -gt 0 ]; then
    log_warning "Suspicious IAM activity detected! Review CloudTrail logs."
fi

# 6. Check EC2 resources across all regions
log_section "Step 6: Auditing EC2 Resources Across All Regions"
regions=$(aws ec2 describe-regions --query 'Regions[].RegionName' --output text)

echo "" > "${REPORT_DIR}/ec2-instances-all-regions.txt"
for region in $regions; do
    echo "Checking region: ${region}"
    instances=$(aws ec2 describe-instances --region "${region}" \
        --query 'Reservations[].Instances[].[InstanceId,State.Name,InstanceType,LaunchTime,Tags[?Key==`Name`].Value|[0]]' \
        --output text 2>/dev/null || echo "")
    
    if [ -n "$instances" ]; then
        echo "Region: ${region}" >> "${REPORT_DIR}/ec2-instances-all-regions.txt"
        echo "$instances" >> "${REPORT_DIR}/ec2-instances-all-regions.txt"
        echo "" >> "${REPORT_DIR}/ec2-instances-all-regions.txt"
        log_warning "EC2 instances found in ${region}!"
        echo "$instances"
    fi
done

# 7. Check Lambda functions
log_section "Step 7: Auditing Lambda Functions"
echo "" > "${REPORT_DIR}/lambda-functions-all-regions.txt"
for region in $regions; do
    functions=$(aws lambda list-functions --region "${region}" \
        --query 'Functions[].[FunctionName,Runtime,LastModified]' \
        --output text 2>/dev/null || echo "")
    
    if [ -n "$functions" ]; then
        echo "Region: ${region}" >> "${REPORT_DIR}/lambda-functions-all-regions.txt"
        echo "$functions" >> "${REPORT_DIR}/lambda-functions-all-regions.txt"
        echo "" >> "${REPORT_DIR}/lambda-functions-all-regions.txt"
        echo "Lambda functions in ${region}: $(echo "$functions" | wc -l | tr -d ' ')"
    fi
done

# 8. Check S3 buckets
log_section "Step 8: Auditing S3 Buckets"
aws s3api list-buckets > "${REPORT_DIR}/s3-buckets.json"
echo "Total S3 buckets: $(jq '.Buckets | length' "${REPORT_DIR}/s3-buckets.json")"
jq -r '.Buckets[] | "\(.Name),\(.CreationDate)"' "${REPORT_DIR}/s3-buckets.json" > "${REPORT_DIR}/s3-buckets.csv"

# Check for recently created buckets
recent_buckets=$(jq -r ".Buckets[] | select(.CreationDate >= \"${INCIDENT_DATE}\") | .Name" "${REPORT_DIR}/s3-buckets.json")
if [ -n "$recent_buckets" ]; then
    log_warning "Recently created S3 buckets:"
    echo "$recent_buckets"
fi

# 9. Check billing/cost
log_section "Step 9: Checking Recent Costs"
START_DATE=$(date -u -v-7d +%Y-%m-%d 2>/dev/null || date -u -d '7 days ago' +%Y-%m-%d)
END_DATE=$(date -u +%Y-%m-%d)

aws ce get-cost-and-usage \
    --time-period Start="${START_DATE}",End="${END_DATE}" \
    --granularity DAILY \
    --metrics "UnblendedCost" \
    > "${REPORT_DIR}/cost-last-7-days.json" 2>&1 || log_error "Cannot fetch cost data (may need Cost Explorer enabled)"

if [ -f "${REPORT_DIR}/cost-last-7-days.json" ]; then
    echo "✅ Cost data saved to: ${REPORT_DIR}/cost-last-7-days.json"
fi

# 10. Generate summary report
log_section "Step 10: Generating Summary Report"

cat > "${REPORT_DIR}/SUMMARY.txt" << EOF
========================================
AWS Security Audit Summary
========================================
Account ID: ${ACCOUNT_ID}
Incident Date: ${INCIDENT_DATE}
Exposed Key: ${EXPOSED_KEY}
Report Generated: $(date)

FINDINGS:
---------
IAM Users: $(jq '.Users | length' "${REPORT_DIR}/iam-users.json")
Recent Users Created: $(jq '. | length' "${REPORT_DIR}/recent-iam-users.json")
Recent Roles Created: $(jq '. | length' "${REPORT_DIR}/recent-iam-roles.json")
CloudTrail CreateUser Events: ${create_user_count}
CloudTrail CreateAccessKey Events: ${create_key_count}
CloudTrail CreateRole Events: ${create_role_count}
S3 Buckets: $(jq '.Buckets | length' "${REPORT_DIR}/s3-buckets.json")

NEXT STEPS:
-----------
1. Review all files in ${REPORT_DIR}/
2. Check for exposed key in access-keys-audit.txt
3. Review CloudTrail events for unauthorized actions
4. Verify all EC2 instances and Lambda functions are authorized
5. Check cost report for unexpected charges
6. Delete exposed key if still active
7. Respond to AWS Support case confirming remediation

CRITICAL ACTIONS REQUIRED:
--------------------------
- If exposed key ${EXPOSED_KEY} is still active: DELETE IT NOW
- Review and delete any unauthorized IAM users/roles
- Terminate any unauthorized EC2 instances
- Enable MFA on root and admin users
- Contact AWS Support to confirm remediation complete
EOF

cat "${REPORT_DIR}/SUMMARY.txt"

echo ""
log_section "Audit Complete"
echo "✅ Full report saved to: ${REPORT_DIR}/"
echo ""
echo "Next: Review ${REPORT_DIR}/SUMMARY.txt and all report files"
echo ""

# Check if exposed key still exists
if grep -q "EXPOSED_KEY_FOUND" "${REPORT_DIR}/access-keys-audit.txt" 2>/dev/null; then
    log_error "⚠️  CRITICAL: EXPOSED KEY STILL ACTIVE! DELETE IT IMMEDIATELY!"
    echo ""
    echo "To delete the exposed key, run:"
    echo "aws iam delete-access-key --user-name admin-user --access-key-id ${EXPOSED_KEY}"
fi
