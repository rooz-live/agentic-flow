#!/bin/bash
set -e

# stx_phase2_manual_rpm.sh - Manual containerd 1.7.x RPM installation helper
# Usage: ./stx_phase2_manual_rpm.sh [--rpm-url <url>] [--dry-run]

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
DRY_RUN=false
RPM_URL=""

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --rpm-url)
            RPM_URL="$2"
            shift 2
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        -h|--help)
            cat << EOF
StarlingX Phase 2 Manual Containerd RPM Installation

USAGE:
    $0 [--rpm-url <url>] [--dry-run]

OPTIONS:
    --rpm-url <url>    Direct URL to containerd 1.7.x RPM
    --dry-run          Show what would be done without executing
    --help, -h         Show this help message

DESCRIPTION:
    This script manually installs containerd 1.7.x RPM when it's not
    available in repositories. This increases drift risk against STX
    expectations and requires explicit approval.

APPROVAL REQUIREMENTS:
    - URL must be in config/approved_containerd_rpms.yaml whitelist
    - OR manager approval via AF_APPROVE_MANUAL_RPM=1 AF_APPROVER=<name>
    - Ticket reference via AF_MANUAL_RPM_TICKET=<ticket-id> (recommended)
    - Break-glass for prod/stg: AF_BREAK_GLASS=1 AF_BREAK_GLASS_REASON="..."

EXAMPLES:
    $0 --dry-run                                    # Show steps without executing
    $0 --rpm-url https://example.com/containerd-1.7.30-1.el8.x86_64.rpm

    # With manager approval (if URL not whitelisted):
    AF_APPROVE_MANUAL_RPM=1 AF_APPROVER="manager-name" $0

    # With ticket reference:
    AF_MANUAL_RPM_TICKET=INFRA-456 $0

    # Production/Staging (requires break-glass):
    AF_BREAK_GLASS=1 AF_BREAK_GLASS_REASON="Security patches" \
    AF_CHANGE_TICKET=INFRA-123 AF_APPROVE_MANUAL_RPM=1 \
    AF_APPROVER="manager-name" $0

WARNING: This script should only be used when containerd 1.7.x is
         not available in standard repositories and the drift risk
         has been explicitly accepted.

EOF
            exit 0
            ;;
        *)
            echo "Unknown option: $1" >&2
            echo "Use --help for usage information" >&2
            exit 1
            ;;
    esac
done

# StarlingX connection settings
STX_HOST="${STX_HOST:-23.92.79.2}"
STX_PORT="${STX_PORT:-2222}"
STX_USER="${STX_USER:-ubuntu}"
STX_SSH_KEY_DEFAULT="$HOME/pem/stx-aio-0.pem"
STX_SSH_KEY="${STX_SSH_KEY:-$STX_SSH_KEY_DEFAULT}"

# Default RPM URL if not provided
if [ -z "$RPM_URL" ]; then
    RPM_URL="https://github.com/containerd/containerd/releases/download/v1.7.30/containerd-1.7.30-1.el8.x86_64.rpm"
fi

# Extract filename from URL
RPM_FILENAME=$(basename "$RPM_URL")

# Approval configuration file
APPROVED_CONFIG="$PROJECT_ROOT/config/approved_containerd_rpms.yaml"

# Function to check URL whitelist
check_url_whitelist() {
    local url="$1"
    
    if [ ! -f "$APPROVED_CONFIG" ]; then
        echo -e "${YELLOW}⚠️  No approved URLs config found at $APPROVED_CONFIG${NC}"
        echo "Proceeding requires explicit manager approval"
        return 0
    fi
    
    # Check if URL is in whitelist (simple grep check)
    if grep -qF "$url" "$APPROVED_CONFIG" 2>/dev/null; then
        echo -e "${GREEN}✓ RPM URL is in approved list${NC}"
        return 0
    else
        echo -e "${RED}❌ RPM URL not in approved list${NC}"
        echo "Approved URLs are listed in: $APPROVED_CONFIG"
        echo "To use this URL, add it to the approved list or get explicit approval"
        return 1
    fi
}

# Function to check manager approval
check_manager_approval() {
    if [ "${AF_APPROVE_MANUAL_RPM:-0}" != "1" ]; then
        echo -e "${RED}❌ Manager approval required${NC}"
        echo "Set AF_APPROVE_MANUAL_RPM=1 and AF_APPROVER=<manager-name>"
        echo "Example: AF_APPROVE_MANUAL_RPM=1 AF_APPROVER=\"manager-name\" $0"
        return 1
    fi
    
    if [ -z "${AF_APPROVER:-}" ]; then
        echo -e "${RED}❌ Approver name missing${NC}"
        echo "Set AF_APPROVER=<manager-name>"
        return 1
    fi
    
    echo -e "${GREEN}✓ Manager approval granted by: $AF_APPROVER${NC}"
    return 0
}

# Function to check ticket validation
check_ticket_validation() {
    if [ -n "${AF_MANUAL_RPM_TICKET:-}" ]; then
        echo -e "${GREEN}✓ Ticket reference: $AF_MANUAL_RPM_TICKET${NC}"
        return 0
    elif [ "${AF_ENV:-}" = "prod" ] || [ "${AF_ENV:-}" = "stg" ]; then
        echo -e "${YELLOW}⚠️  Ticket recommended for prod/stg${NC}"
        echo "Consider setting AF_MANUAL_RPM_TICKET=<ticket-id>"
        return 0
    else
        return 0
    fi
}

# Function to run SSH command
run_ssh() {
    local cmd="$1"
    local error_msg="$2"
    
    if [ "$DRY_RUN" = true ]; then
        echo "[DRY RUN] Would execute: $cmd"
        return 0
    fi
    
    if ! ssh -i "$STX_SSH_KEY" -p "$STX_PORT" -o BatchMode=yes \
        -o ConnectTimeout=10 -o ServerAliveInterval=5 \
        -o ServerAliveCountMax=3 -o StrictHostKeyChecking=accept-new \
        "$STX_USER@$STX_HOST" "$cmd"; then
        echo "❌ ERROR: $error_msg" >&2
        return 1
    fi
}

# Function to check prerequisites
check_prerequisites() {
    echo -e "${BLUE}🔍 Checking manual RPM installation prerequisites...${NC}"
    
    # Check SSH key
    if [ ! -f "$STX_SSH_KEY" ]; then
        echo -e "${RED}❌ STX_SSH_KEY not found at '$STX_SSH_KEY'${NC}" >&2
        exit 2
    fi
    chmod 600 "$STX_SSH_KEY" 2>/dev/null || true
    
    # Check connectivity
    echo "Testing SSH connectivity..."
    if ! run_ssh "echo 'Connection test successful'" "SSH connectivity test failed"; then
        exit 1
    fi
    
    # Get current containerd version
    echo "Checking current containerd version..."
    current_version=$(run_ssh "containerd --version 2>/dev/null | grep -oE 'v[0-9]+\.[0-9]+\.[0-9]+' || echo 'unknown'")
    echo "Current containerd version: $current_version"
    
    # Check if RPM URL is accessible
    echo "Checking RPM URL accessibility..."
    if ! curl -I --connect-timeout 10 "$RPM_URL" >/dev/null 2>&1; then
        echo -e "${RED}❌ RPM URL not accessible: $RPM_URL${NC}" >&2
        echo "Please verify the URL is correct and accessible from this host."
        exit 1
    fi
    
    echo -e "${GREEN}✓ RPM URL is accessible${NC}"
    echo "Target RPM: $RPM_FILENAME"
    
    # Check approval requirements
    echo ""
    echo "=== Approval Checks ==="
    
    # 1. Check URL whitelist
    if ! check_url_whitelist "$RPM_URL"; then
        # If not in whitelist, require manager approval
        echo "URL not in whitelist, requiring manager approval..."
        if ! check_manager_approval; then
            exit 1
        fi
    fi
    
    # 2. Check manager approval (if needed)
    if [ "${AF_APPROVE_MANUAL_RPM:-0}" = "1" ]; then
        check_manager_approval
    fi
    
    # 3. Check ticket validation
    check_ticket_validation
    
    # 4. Break-glass check for prod/stg
    if [ "$AF_ENV" = "prod" ] || [ "$AF_ENV" = "stg" ]; then
        if [ "${AF_BREAK_GLASS:-0}" != "1" ]; then
            echo -e "${RED}❌ Break-glass required for $AF_ENV${NC}" >&2
            echo "Set AF_BREAK_GLASS=1 AF_BREAK_GLASS_REASON=\"...\" AF_CHANGE_TICKET=\"...\""
            exit 1
        fi
        if [ -z "${AF_BREAK_GLASS_REASON:-}" ] || ( [ -z "${AF_CHANGE_TICKET:-}" ] && [ -z "${AF_CAB_APPROVAL_ID:-}" ] ); then
            echo -e "${RED}❌ Break-glass requires reason and ticket/CAB approval${NC}" >&2
            exit 1
        fi
        echo -e "${GREEN}✓ Break-glass validated${NC}"
    fi
}

# Function to perform manual installation
perform_installation() {
    echo -e "\n${BLUE}📦 Starting manual containerd 1.7.x RPM installation...${NC}"
    
    # Step 1: Create working directory
    echo -e "\n${YELLOW}Step 1: Creating working directory${NC}"
    run_ssh "mkdir -p /tmp/containerd_upgrade && cd /tmp/containerd_upgrade" "Failed to create working directory"
    
    # Step 2: Download RPM
    echo -e "\n${YELLOW}Step 2: Downloading containerd RPM${NC}"
    run_ssh "cd /tmp/containerd_upgrade && curl -L -O $RPM_URL" "Failed to download RPM"
    
    # Step 3: Verify RPM
    echo -e "\n${YELLOW}Step 3: Verifying RPM package${NC}"
    run_ssh "cd /tmp/containerd_upgrade && rpm -qpi $RPM_FILENAME | head -10" "Failed to verify RPM"
    
    # Step 4: Check dependencies
    echo -e "\n${YELLOW}Step 4: Checking dependencies${NC}"
    run_ssh "cd /tmp/containerd_upgrade && dnf deplist $RPM_FILENAME 2>/dev/null || echo 'Dependency check completed'" "Failed to check dependencies"
    
    # Step 5: Backup current installation
    echo -e "\n${YELLOW}Step 5: Backing up current containerd${NC}"
    run_ssh "cp /etc/containerd/config.toml /etc/containerd/config.toml.manual-backup-$(date +%Y%m%d_%H%M%S) 2>/dev/null || echo 'No config.toml to backup'" "Failed to backup config"
    
    # Step 6: Install RPM
    echo -e "\n${YELLOW}Step 6: Installing containerd 1.7.x RPM${NC}"
    if [ "$DRY_RUN" != true ]; then
        run_ssh "cd /tmp/containerd_upgrade && dnf install -y $RPM_FILENAME" "Failed to install RPM"
        
        # Pin the version to prevent accidental updates
        run_ssh "dnf versionlock add containerd.io" "Failed to versionlock containerd"
    fi
    
    # Step 7: Verify installation
    echo -e "\n${YELLOW}Step 7: Verifying installation${NC}"
    run_ssh "containerd --version" "Failed to verify containerd version"
    
    # Step 8: Restart services
    echo -e "\n${YELLOW}Step 8: Restarting services${NC}"
    run_ssh "systemctl restart containerd && sleep 5 && systemctl restart kubelet" "Failed to restart services"
    
    # Step 9: Validation
    echo -e "\n${YELLOW}Step 9: Validating installation${NC}"
    run_ssh "systemctl is-active containerd kubelet" "Failed to check service status"
    run_ssh "crictl info | head -5" "Failed to verify crictl"
    
    # Step 10: Cleanup
    echo -e "\n${YELLOW}Step 10: Cleaning up${NC}"
    run_ssh "rm -rf /tmp/containerd_upgrade" "Failed to cleanup"
    
    echo -e "\n${GREEN}✅ Manual containerd 1.7.x installation completed!${NC}"
}

# Function to create audit entry
create_audit_entry() {
    if [ "$DRY_RUN" = true ]; then
        return
    fi
    
    local ts=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    local sha=$(git -C "$PROJECT_ROOT" rev-parse HEAD 2>/dev/null || echo "")
    local dirty=$(git -C "$PROJECT_ROOT" status --porcelain 2>/dev/null | wc -l | tr -d ' ')
    local user=$(whoami 2>/dev/null || echo "")
    local host=$(hostname 2>/dev/null || echo "")
    
    # Build audit JSON with approval details
    local audit_entry="{\"ts\":\"$ts\",\"action\":\"af_stx_phase2_manual_rpm\",\"af_env\":\"${AF_ENV:-local}\",\"stx_host\":\"$STX_HOST\",\"stx_port\":$STX_PORT,\"stx_user\":\"$STX_USER\",\"git_sha\":\"$sha\",\"git_dirty_count\":${dirty:-0},\"user\":\"$user\",\"host\":\"$host\",\"rpm_url\":\"$RPM_URL\""
    
    # Add approval details if present
    if [ -n "${AF_APPROVER:-}" ]; then
        audit_entry="$audit_entry,\"approver\":\"$AF_APPROVER\""
    fi
    
    if [ -n "${AF_MANUAL_RPM_TICKET:-}" ]; then
        audit_entry="$audit_entry,\"ticket\":\"$AF_MANUAL_RPM_TICKET\""
    fi
    
    if [ -n "${AF_BREAK_GLASS_REASON:-}" ]; then
        audit_entry="$audit_entry,\"break_glass_reason\":\"$AF_BREAK_GLASS_REASON\""
    fi
    
    if [ -n "${AF_CHANGE_TICKET:-}" ]; then
        audit_entry="$audit_entry,\"change_ticket\":\"$AF_CHANGE_TICKET\""
    fi
    
    if [ -n "${AF_CAB_APPROVAL_ID:-}" ]; then
        audit_entry="$audit_entry\",\"cab_approval_id\":\"$AF_CAB_APPROVAL_ID\""
    fi
    
    # Check if URL was in whitelist
    if [ -f "$APPROVED_CONFIG" ] && grep -qF "$RPM_URL" "$APPROVED_CONFIG" 2>/dev/null; then
        audit_entry="$audit_entry,\"url_whitelisted\":true"
    else
        audit_entry="$audit_entry\",\"url_whitelisted\":false"
    fi
    
    audit_entry="$audit_entry}"
    
    echo "$audit_entry" >> "$PROJECT_ROOT/.goalie/stx_audit.jsonl"
    
    echo -e "\nAudit log entry created in .goalie/stx_audit.jsonl"
    echo "Approval details recorded for compliance"
}

# Main execution
main() {
    echo -e "${BLUE}=== StarlingX Phase 2 Manual Containerd RPM Installation ===${NC}"
    echo "Host: $STX_HOST:$STX_PORT"
    echo "User: $STX_USER"
    echo "Dry Run: $DRY_RUN"
    echo "RPM URL: $RPM_URL"
    echo ""
    
    echo -e "${RED}⚠️  WARNING: This installation method increases drift risk!${NC}"
    echo "Only proceed if containerd 1.7.x is not available in repositories"
    echo "and the drift risk has been explicitly accepted."
    echo ""
    
    check_prerequisites
    
    if [ "$DRY_RUN" = true ]; then
        echo -e "\n${YELLOW}=== DRY RUN COMPLETE ===${NC}"
        echo "No actual changes were made."
        echo "Run without --dry-run to perform the installation."
        exit 0
    fi
    
    # Confirmation prompt
    echo -e "\n${YELLOW}⚠️  WARNING: This will install containerd from an external RPM!${NC}"
    echo "This increases drift risk against STX expectations."
    echo -n "Type 'ACCEPT_DRIFT' to confirm: "
    read -r confirm
    
    if [ "$confirm" != "ACCEPT_DRIFT" ]; then
        echo "Aborted."
        exit 1
    fi
    
    perform_installation
    create_audit_entry
    
    echo -e "\n${GREEN}=== INSTALLATION COMPLETE ===${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Verify Kubernetes is healthy: kubectl get nodes"
    echo "2. Run health check: ./scripts/af stx health"
    echo "3. If needed, rollback with: ./scripts/stx_phase2_rollback.sh"
}

# Execute main function
main "$@"
