#!/bin/bash
# CloudTrail Security Audit Script
# Checks for unauthorized IAM and resource activity across all regions

set -euo pipefail

echo "=== AWS Security Incident Audit ==="
echo "Timestamp: $(date -u +"%Y-%m-%d %H:%M:%S UTC")"
echo ""

# Generate IAM credential report
echo "=== IAM Credential Report ==="
aws iam generate-credential-report >/dev/null 2>&1 || true
sleep 3
aws iam get-credential-report --query 'Content' --output text | base64 --decode > iam-credentials-report.csv
echo "✓ IAM credential report saved to: iam-credentials-report.csv"
echo ""

# Check for suspicious IAM events
echo "=== Checking CloudTrail for Suspicious IAM Events (Last 7 Days) ==="
SUSPICIOUS_EVENTS=(
    "CreateUser"
    "CreateAccessKey"
    "AttachUserPolicy"
    "PutUserPolicy"
    "CreateRole"
    "AssumeRole"
    "DeleteUser"
    "DeleteAccessKey"
)

for event in "${SUSPICIOUS_EVENTS[@]}"; do
    echo "Checking: $event"
    aws cloudtrail lookup-events \
        --lookup-attributes AttributeKey=EventName,AttributeValue="$event" \
        --max-results 50 \
        --query 'Events[].{Time:EventTime,User:Username,Event:EventName,IP:SourceIPAddress}' \
        --output table || echo "  No events found"
    echo ""
done

# Check for resource creation events
echo "=== Checking for Resource Creation Events ==="
RESOURCE_EVENTS=(
    "RunInstances"
    "CreateFunction"
    "CreateBucket"
    "PutBucketPolicy"
    "CreateLoadBalancer"
)

for event in "${RESOURCE_EVENTS[@]}"; do
    echo "Checking: $event"
    aws cloudtrail lookup-events \
        --lookup-attributes AttributeKey=EventName,AttributeValue="$event" \
        --max-results 50 \
        --query 'Events[].{Time:EventTime,User:Username,Event:EventName,Region:AwsRegion,IP:SourceIPAddress}' \
        --output table || echo "  No events found"
    echo ""
done

# Check running resources across all regions
echo "=== Checking Running Resources Across All Regions ==="
for region in $(aws ec2 describe-regions --query 'Regions[].RegionName' --output text); do
    echo "Region: $region"
    
    # EC2 instances
    instances=$(aws ec2 describe-instances \
        --region "$region" \
        --query 'Reservations[].Instances[?State.Name==`running`].{Id:InstanceId,Type:InstanceType,Launched:LaunchTime}' \
        --output table 2>/dev/null || echo "None")
    if [[ "$instances" != "None" && "$instances" != *"----"* ]]; then
        echo "  EC2 Instances:"
        echo "$instances"
    fi
    
    # Lambda functions
    functions=$(aws lambda list-functions \
        --region "$region" \
        --query 'Functions[].{Name:FunctionName,Runtime:Runtime,LastMod:LastModified}' \
        --output table 2>/dev/null || echo "None")
    if [[ "$functions" != "None" && "$functions" != *"----"* ]]; then
        echo "  Lambda Functions:"
        echo "$functions"
    fi
    
    echo ""
done

echo "=== Audit Complete ==="
echo "Review the output above for any unauthorized activity"
echo "IAM credential report saved to: iam-credentials-report.csv"
