#!/usr/bin/env bash
#
# Off-Host Syslog Black Box Recorder - Terraform Deployment Script
# WSJF-Selected: AWS Lightsail micro_2_0 (Score: 90.00 CRITICAL)
#
# Usage:
#   ./deploy.sh [plan|apply|destroy|validate]
#
# Prerequisites:
#   - AWS CLI configured with appropriate credentials
#   - Terraform >= 1.5.0 installed
#   - SSH public key available at ~/.ssh/id_rsa.pub or specified via TF_VAR_ssh_public_key
#
# Security:
#   - SSH key is injected via environment variable (never stored in code)
#   - AWS credentials via AWS CLI config or environment variables
#   - Budget alerts configured to prevent overspending

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ACTION="${1:-plan}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check Terraform
    if ! command -v terraform &> /dev/null; then
        log_error "Terraform is not installed. Install from https://www.terraform.io/downloads"
        exit 1
    fi
    
    TF_VERSION=$(terraform version -json | jq -r '.terraform_version' 2>/dev/null || terraform version | head -1 | awk '{print $2}' | tr -d 'v')
    log_info "Terraform version: $TF_VERSION"
    
    # Check AWS CLI
    if ! command -v aws &> /dev/null; then
        log_error "AWS CLI is not installed. Install from https://aws.amazon.com/cli/"
        exit 1
    fi
    
    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        log_error "AWS credentials not configured. Run 'aws configure' or set AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY"
        exit 1
    fi
    
    AWS_ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
    AWS_USER=$(aws sts get-caller-identity --query Arn --output text)
    log_info "AWS Account: $AWS_ACCOUNT"
    log_info "AWS Identity: $AWS_USER"
    
    # Check SSH key
    if [[ -z "${TF_VAR_ssh_public_key:-}" ]]; then
        if [[ -f "$HOME/.ssh/id_rsa.pub" ]]; then
            export TF_VAR_ssh_public_key="$(cat "$HOME/.ssh/id_rsa.pub")"
            log_info "SSH public key loaded from ~/.ssh/id_rsa.pub"
        elif [[ -f "$HOME/.ssh/id_ed25519.pub" ]]; then
            export TF_VAR_ssh_public_key="$(cat "$HOME/.ssh/id_ed25519.pub")"
            log_info "SSH public key loaded from ~/.ssh/id_ed25519.pub"
        else
            log_error "SSH public key not found. Set TF_VAR_ssh_public_key or create ~/.ssh/id_rsa.pub"
            exit 1
        fi
    else
        log_info "SSH public key provided via TF_VAR_ssh_public_key"
    fi
    
    log_success "All prerequisites satisfied"
}

# Initialize Terraform with local backend (skip S3 for initial setup)
init_terraform() {
    log_info "Initializing Terraform..."
    
    cd "$SCRIPT_DIR"
    
    # Check if we need to use local backend (S3 bucket might not exist)
    if ! aws s3 ls s3://offhost-syslog-terraform-state &> /dev/null 2>&1; then
        log_warn "S3 backend bucket not found, using local backend"
        
        # Create temporary backend override
        cat > backend_override.tf << 'EOF'
terraform {
  backend "local" {
    path = "terraform.tfstate"
  }
}
EOF
        
        terraform init -reconfigure
        rm -f backend_override.tf
    else
        terraform init -reconfigure
    fi
    
    log_success "Terraform initialized"
}

# Validate Terraform configuration
validate_terraform() {
    log_info "Validating Terraform configuration..."
    
    cd "$SCRIPT_DIR"
    
    # Format check
    if ! terraform fmt -check -recursive; then
        log_warn "Terraform formatting issues found. Run 'terraform fmt' to fix."
    fi
    
    # Validate
    terraform validate
    
    log_success "Terraform configuration is valid"
}

# Security policy checks
security_checks() {
    log_info "Running security policy checks..."
    
    cd "$SCRIPT_DIR"
    
    # Check for 0.0.0.0/0 on syslog port (not allowed)
    if grep -r "0.0.0.0/0" terraform.tfvars 2>/dev/null | grep -q "6514"; then
        log_error "SECURITY VIOLATION: 0.0.0.0/0 found for syslog port. Only 23.92.79.2/32 allowed."
        exit 1
    fi
    
    # Verify SSH allowlist is restricted
    ADMIN_CIDR=$(grep "admin_ssh_cidr" terraform.tfvars | cut -d'"' -f2)
    if [[ "$ADMIN_CIDR" != "173.94.53.113/32" ]]; then
        log_warn "SSH allowlist CIDR is not the expected value: $ADMIN_CIDR"
    fi
    
    # Verify StarlingX IP
    STX_IP=$(grep "starlingx_ip" terraform.tfvars | cut -d'"' -f2)
    if [[ "$STX_IP" != "23.92.79.2" ]]; then
        log_error "SECURITY VIOLATION: StarlingX IP is not 23.92.79.2: $STX_IP"
        exit 1
    fi
    
    log_success "Security policy checks passed"
}

# Plan Terraform changes
plan_terraform() {
    log_info "Planning Terraform changes..."
    
    cd "$SCRIPT_DIR"
    
    terraform plan -out=tfplan -detailed-exitcode || {
        exit_code=$?
        if [[ $exit_code -eq 2 ]]; then
            log_info "Changes detected"
        else
            log_error "Terraform plan failed"
            exit 1
        fi
    }
    
    log_success "Terraform plan completed. Review tfplan before applying."
    log_info "To apply: ./deploy.sh apply"
}

# Apply Terraform changes
apply_terraform() {
    log_info "Applying Terraform changes..."
    
    cd "$SCRIPT_DIR"
    
    # Check if plan exists
    if [[ ! -f tfplan ]]; then
        log_warn "No plan file found. Running plan first..."
        plan_terraform
    fi
    
    # Confirm before apply
    echo ""
    echo "=================================================="
    echo "   MANUAL APPROVAL REQUIRED"
    echo "=================================================="
    echo ""
    echo "You are about to provision:"
    echo "  - AWS Lightsail instance: syslog-sink-stx"
    echo "  - Bundle: micro_2_0 (\$10/month)"
    echo "  - Region: us-east-1"
    echo "  - SSH Access: 173.94.53.113/32 only"
    echo "  - Syslog Access: 23.92.79.2/32 only"
    echo ""
    read -p "Type 'yes' to proceed: " confirm
    
    if [[ "$confirm" != "yes" ]]; then
        log_warn "Deployment cancelled"
        exit 0
    fi
    
    terraform apply tfplan
    
    # Get outputs
    log_success "Terraform apply completed!"
    echo ""
    echo "=================================================="
    echo "   DEPLOYMENT SUMMARY"
    echo "=================================================="
    terraform output -json 2>/dev/null || terraform output
    
    # Clean up plan file
    rm -f tfplan
    
    log_info "Next steps:"
    echo "  1. Wait for instance to initialize (~2 minutes)"
    echo "  2. Generate TLS certificates: cd ../ansible && ./scripts/generate-certificates.sh"
    echo "  3. Deploy syslog configuration: ansible-playbook -i inventory/hosts.yml playbooks/syslog-sink.yml"
    echo "  4. Configure client: ansible-playbook -i inventory/hosts.yml playbooks/syslog-client.yml"
    echo "  5. Verify end-to-end: cd ../tests && ./verify-all.sh"
}

# Destroy infrastructure
destroy_terraform() {
    log_warn "This will DESTROY all infrastructure!"
    
    cd "$SCRIPT_DIR"
    
    echo ""
    read -p "Type 'destroy' to confirm deletion: " confirm
    
    if [[ "$confirm" != "destroy" ]]; then
        log_info "Destroy cancelled"
        exit 0
    fi
    
    terraform destroy -auto-approve
    
    log_success "Infrastructure destroyed"
}

# Show outputs
show_outputs() {
    cd "$SCRIPT_DIR"
    terraform output -json 2>/dev/null || terraform output
}

# Main execution
main() {
    echo ""
    echo "╔════════════════════════════════════════════════════════════════╗"
    echo "║  Off-Host Syslog Black Box Recorder - Deployment               ║"
    echo "║  WSJF Score: 90.00 (CRITICAL) - AWS Lightsail micro_2_0        ║"
    echo "╚════════════════════════════════════════════════════════════════╝"
    echo ""
    
    check_prerequisites
    
    case "$ACTION" in
        validate)
            init_terraform
            validate_terraform
            security_checks
            ;;
        plan)
            init_terraform
            validate_terraform
            security_checks
            plan_terraform
            ;;
        apply)
            init_terraform
            validate_terraform
            security_checks
            apply_terraform
            ;;
        destroy)
            init_terraform
            destroy_terraform
            ;;
        output)
            show_outputs
            ;;
        *)
            log_error "Unknown action: $ACTION"
            echo "Usage: $0 [validate|plan|apply|destroy|output]"
            exit 1
            ;;
    esac
}

main
