#!/bin/bash
#
# create-backend.sh
# Creates AWS backend infrastructure for Terraform state management
# Creates S3 bucket for state and DynamoDB table for locks
#

set -e

# Configuration
BUCKET_NAME="offhost-syslog-terraform-state"
TABLE_NAME="offhost-syslog-terraform-locks"
REGION="us-east-1"
STATE_KEY="offhost-syslog/terraform.tfstate"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if AWS CLI is installed
check_aws_cli() {
    if ! command -v aws &> /dev/null; then
        log_error "AWS CLI is not installed. Please install it first."
        log_info "Visit: https://aws.amazon.com/cli/"
        exit 1
    fi
    log_info "AWS CLI found: $(aws --version)"
}

# Check AWS credentials
check_credentials() {
    log_info "Checking AWS credentials..."
    
    if ! aws sts get-caller-identity &> /dev/null; then
        log_error "AWS credentials not configured or invalid."
        log_info "Please configure credentials using: aws configure"
        log_info "Or set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY environment variables."
        exit 1
    fi
    
    IDENTITY=$(aws sts get-caller-identity)
    ACCOUNT_ID=$(echo "$IDENTITY" | jq -r '.Account')
    USER_ARN=$(echo "$IDENTITY" | jq -r '.Arn')
    
    log_info "Authenticated as: $USER_ARN"
    log_info "Account ID: $ACCOUNT_ID"
    log_info "Region: $REGION"
}

# Check if S3 bucket exists
bucket_exists() {
    aws s3api head-bucket --bucket "$BUCKET_NAME" --region "$REGION" 2>/dev/null
}

# Create S3 bucket
create_s3_bucket() {
    log_info "Creating S3 bucket: $BUCKET_NAME"
    
    if bucket_exists; then
        log_warn "Bucket $BUCKET_NAME already exists. Skipping creation."
        return
    fi
    
    # Create bucket (us-east-1 doesn't use LocationConstraint)
    if [ "$REGION" = "us-east-1" ]; then
        aws s3api create-bucket \
            --bucket "$BUCKET_NAME" \
            --region "$REGION" \
            --tagging "Key=Project,Value=offhost-syslog Key=Environment,Value=production Key=ManagedBy,Value=terraform" \
            2>&1 || {
                log_error "Failed to create S3 bucket"
                exit 1
            }
    else
        aws s3api create-bucket \
            --bucket "$BUCKET_NAME" \
            --region "$REGION" \
            --create-bucket-configuration "LocationConstraint=$REGION" \
            --tagging "Key=Project,Value=offhost-syslog Key=Environment,Value=production Key=ManagedBy,Value=terraform" \
            2>&1 || {
                log_error "Failed to create S3 bucket"
                exit 1
            }
    fi
    
    log_info "S3 bucket created successfully"
}

# Enable versioning on S3 bucket
enable_versioning() {
    log_info "Enabling versioning on bucket..."
    
    aws s3api put-bucket-versioning \
        --bucket "$BUCKET_NAME" \
        --versioning-configuration Status=Enabled \
        --region "$REGION" 2>&1 || {
        log_error "Failed to enable versioning"
        exit 1
    }
    
    log_info "Versioning enabled"
}

# Set server-side encryption
set_encryption() {
    log_info "Setting server-side encryption (AES-256)..."
    
    aws s3api put-bucket-encryption \
        --bucket "$BUCKET_NAME" \
        --server-side-encryption-configuration '{
            "Rules": [
                {
                    "ApplyServerSideEncryptionByDefault": {
                        "SSEAlgorithm": "AES256"
                    }
                }
            ]
        }' \
        --region "$REGION" 2>&1 || {
        log_error "Failed to set encryption"
        exit 1
    }
    
    log_info "Server-side encryption configured"
}

# Block public access
block_public_access() {
    log_info "Blocking public access..."
    
    aws s3api put-public-access-block \
        --bucket "$BUCKET_NAME" \
        --public-access-block-configuration '{
            "BlockPublicAcls": true,
            "IgnorePublicAcls": true,
            "BlockPublicPolicy": true,
            "RestrictPublicBuckets": true
        }' \
        --region "$REGION" 2>&1 || {
        log_error "Failed to block public access"
        exit 1
    }
    
    log_info "Public access blocked"
}

# Set lifecycle rules
set_lifecycle_rules() {
    log_info "Setting lifecycle rules (delete old versions after 90 days)..."
    
    aws s3api put-bucket-lifecycle-configuration \
        --bucket "$BUCKET_NAME" \
        --lifecycle-configuration '{
            "Rules": [
                {
                    "ID": "DeleteOldVersions",
                    "Status": "Enabled",
                    "Filter": {},
                    "NoncurrentVersionExpiration": {
                        "NoncurrentDays": 90
                    }
                }
            ]
        }' \
        --region "$REGION" 2>&1 || {
        log_error "Failed to set lifecycle rules"
        exit 1
    }
    
    log_info "Lifecycle rules configured"
}

# Verify S3 bucket configuration
verify_s3_bucket() {
    log_info "Verifying S3 bucket configuration..."
    
    # Check versioning
    VERSIONING=$(aws s3api get-bucket-versioning --bucket "$BUCKET_NAME" --region "$REGION" --query 'Status' --output text)
    if [ "$VERSIONING" = "Enabled" ]; then
        log_info "✓ Versioning: Enabled"
    else
        log_error "✗ Versioning: Not enabled"
        exit 1
    fi
    
    # Check encryption
    ENCRYPTION=$(aws s3api get-bucket-encryption --bucket "$BUCKET_NAME" --region "$REGION" --query 'ServerSideEncryptionConfiguration.Rules[0].ApplyServerSideEncryptionByDefault.SSEAlgorithm' --output text 2>/dev/null)
    if [ "$ENCRYPTION" = "AES256" ]; then
        log_info "✓ Encryption: AES-256"
    else
        log_error "✗ Encryption: Not configured correctly"
        exit 1
    fi
    
    # Check public access block
    PUBLIC_ACCESS=$(aws s3api get-public-access-block --bucket "$BUCKET_NAME" --region "$REGION" --query 'PublicAccessBlockConfiguration.BlockPublicAcls' --output text)
    if [ "$PUBLIC_ACCESS" = "true" ]; then
        log_info "✓ Public access: Blocked"
    else
        log_error "✗ Public access: Not blocked"
        exit 1
    fi
    
    log_info "S3 bucket verified successfully"
}

# Check if DynamoDB table exists
table_exists() {
    aws dynamodb describe-table \
        --table-name "$TABLE_NAME" \
        --region "$REGION" \
        --query 'Table.TableName' \
        --output text 2>/dev/null
}

# Create DynamoDB table
create_dynamodb_table() {
    log_info "Creating DynamoDB table: $TABLE_NAME"
    
    if [ "$(table_exists)" = "$TABLE_NAME" ]; then
        log_warn "Table $TABLE_NAME already exists. Skipping creation."
        return
    fi
    
    aws dynamodb create-table \
        --table-name "$TABLE_NAME" \
        --attribute-definitions \
            AttributeName=LockID,AttributeType=S \
            AttributeName=Info,AttributeType=S \
        --key-schema \
            AttributeName=LockID,KeyType=HASH \
            AttributeName=Info,KeyType=RANGE \
        --billing-mode PAY_PER_REQUEST \
        --tags \
            Key=Project,Value=offhost-syslog \
            Key=Environment,Value=production \
            Key=ManagedBy,Value=terraform \
        --region "$REGION" 2>&1 || {
        log_error "Failed to create DynamoDB table"
        exit 1
    }
    
    # Wait for table to be active
    log_info "Waiting for table to become active..."
    aws dynamodb wait table-exists \
        --table-name "$TABLE_NAME" \
        --region "$REGION" 2>&1 || {
        log_error "Timeout waiting for table to become active"
        exit 1
    }
    
    log_info "DynamoDB table created successfully"
}

# Verify DynamoDB table
verify_dynamodb_table() {
    log_info "Verifying DynamoDB table..."
    
    TABLE_STATUS=$(aws dynamodb describe-table \
        --table-name "$TABLE_NAME" \
        --region "$REGION" \
        --query 'Table.TableStatus' \
        --output text)
    
    if [ "$TABLE_STATUS" = "ACTIVE" ]; then
        log_info "✓ Table status: Active"
    else
        log_error "✗ Table status: $TABLE_STATUS"
        exit 1
    fi
    
    # Check schema
    HASH_KEY=$(aws dynamodb describe-table \
        --table-name "$TABLE_NAME" \
        --region "$REGION" \
        --query 'Table.KeySchema[?KeyType==`HASH`].AttributeName' \
        --output text)
    
    RANGE_KEY=$(aws dynamodb describe-table \
        --table-name "$TABLE_NAME" \
        --region "$REGION" \
        --query 'Table.KeySchema[?KeyType==`RANGE`].AttributeName' \
        --output text)
    
    if [ "$HASH_KEY" = "LockID" ]; then
        log_info "✓ Partition key: LockID"
    else
        log_error "✗ Partition key: $HASH_KEY (expected: LockID)"
        exit 1
    fi
    
    if [ "$RANGE_KEY" = "Info" ]; then
        log_info "✓ Sort key: Info"
    else
        log_error "✗ Sort key: $RANGE_KEY (expected: Info)"
        exit 1
    fi
    
    # Check billing mode
    BILLING_MODE=$(aws dynamodb describe-table \
        --table-name "$TABLE_NAME" \
        --region "$REGION" \
        --query 'Table.BillingModeSummary.BillingMode' \
        --output text 2>/dev/null)
    
    if [ "$BILLING_MODE" = "PAY_PER_REQUEST" ]; then
        log_info "✓ Billing mode: PAY_PER_REQUEST"
    else
        log_error "✗ Billing mode: $BILLING_MODE (expected: PAY_PER_REQUEST)"
        exit 1
    fi
    
    log_info "DynamoDB table verified successfully"
}

# Output Terraform backend configuration
output_backend_config() {
    log_info ""
    log_info "=========================================="
    log_info "Terraform Backend Configuration"
    log_info "=========================================="
    echo ""
    echo "Add the following to your main.tf file:"
    echo ""
    cat << 'EOF'
terraform {
  backend "s3" {
    bucket         = "offhost-syslog-terraform-state"
    key            = "offhost-syslog/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "offhost-syslog-terraform-locks"
  }
}
EOF
    echo ""
    log_info "=========================================="
}

# Main execution
main() {
    log_info "=========================================="
    log_info "Terraform Backend Infrastructure Setup"
    log_info "=========================================="
    echo ""
    
    check_aws_cli
    check_credentials
    echo ""
    
    # Create S3 bucket
    log_info "Step 1: Creating S3 bucket for Terraform state"
    create_s3_bucket
    enable_versioning
    set_encryption
    block_public_access
    set_lifecycle_rules
    verify_s3_bucket
    echo ""
    
    # Create DynamoDB table
    log_info "Step 2: Creating DynamoDB table for Terraform locks"
    create_dynamodb_table
    verify_dynamodb_table
    echo ""
    
    # Output configuration
    output_backend_config
    echo ""
    
    log_info "=========================================="
    log_info "Backend Infrastructure Created Successfully!"
    log_info "=========================================="
    echo ""
    log_info "Summary:"
    log_info "  - S3 Bucket: $BUCKET_NAME (Region: $REGION)"
    log_info "  - DynamoDB Table: $TABLE_NAME (Region: $REGION)"
    log_info "  - State Key: $STATE_KEY"
    echo ""
    log_info "You can now run 'terraform init' to initialize"
    log_info "the backend and proceed with deployment."
}

# Run main function
main "$@"
