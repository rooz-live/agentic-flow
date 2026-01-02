#!/bin/bash
set -e

# stx_phase2_rollback.sh - Rollback script for Phase 2 containerd upgrade
# Usage: ./stx_phase2_rollback.sh [--dry-run]

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

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        -h|--help)
            cat << EOF
StarlingX Phase 2 Containerd Upgrade Rollback Script

USAGE:
    $0 [--dry-run]

OPTIONS:
    --dry-run    Show what would be done without executing
    --help, -h   Show this help message

DESCRIPTION:
    This script rolls back a Phase 2 containerd upgrade by:
    1. Restoring the previous containerd.io version
    2. Restoring the saved containerd configuration
    3. Restarting containerd and kubelet services
    4. Re-enabling Docker if it was disabled
    5. Running validation checks

ENVIRONMENT VARIABLES:
    STX_HOST         StarlingX host (default: 23.92.79.2)
    STX_PORT         SSH port (default: 2222)
    STX_USER         SSH user (default: root)
    STX_SSH_KEY      Path to SSH key (default: \$HOME/pem/stx-aio-0.pem)

EXAMPLES:
    $0                           # Perform rollback
    $0 --dry-run                 # Show rollback steps without executing

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
STX_USER="${STX_USER:-root}"
STX_SSH_KEY_DEFAULT="$HOME/pem/stx-aio-0.pem"
STX_SSH_KEY="${STX_SSH_KEY:-$STX_SSH_KEY_DEFAULT}"

# Audit log
audit="$PROJECT_ROOT/.goalie/stx_audit.jsonl"

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

# Function to check rollback prerequisites
check_prerequisites() {
    echo -e "${BLUE}🔍 Checking rollback prerequisites...${NC}"
    
    # Check SSH key
    if [ ! -f "$STX_SSH_KEY" ]; then
        echo -e "${RED}❌ STX_SSH_KEY not found at '$STX_SSH_KEY'${NC}" >&2
        echo "Set STX_SSH_KEY to the absolute path of your pem key." >&2
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
    current_version=$(run_ssh "containerd --version 2>/dev/null | grep -oE 'containerd\sv[0-9]+\.[0-9]+\.[0-9]+' | cut -d' ' -f2" "Failed to get containerd version")
    echo "Current containerd version: $current_version"
    
    # Check if it's a 1.7.x version (rollback target)
    if echo "$current_version" | grep -qE "^v1\.7\."; then
        echo -e "${YELLOW}⚠️  Current version is 1.7.x - rollback candidate${NC}"
    else
        echo -e "${YELLOW}⚠️  Current version is not 1.7.x ($current_version)${NC}"
    fi
    
    # Find backup files
    echo "Looking for backup files..."
    backup_files=$(run_ssh "ls -la /etc/containerd/config.toml.phase2-backup-* 2>/dev/null | head -5" "Failed to list backup files")
    if [ -n "$backup_files" ]; then
        echo -e "${GREEN}✓ Found backup files:${NC}"
        echo "$backup_files"
    else
        echo -e "${YELLOW}⚠️  No backup files found${NC}"
    fi
    
    # Check available containerd versions
    echo "Checking available containerd versions..."
    run_ssh "dnf list --showduplicates containerd.io 2>/dev/null | grep -E '1\.6\.' | tail -5" "Failed to list containerd versions"
}

# Function to perform rollback
perform_rollback() {
    echo -e "\n${BLUE}🔄 Starting Phase 2 rollback...${NC}"
    
    # Step 1: Find the latest backup
    echo -e "\n${YELLOW}Step 1: Locating latest configuration backup${NC}"
    latest_backup=$(run_ssh "ls -t /etc/containerd/config.toml.phase2-backup-* 2>/dev/null | head -1" "Failed to find backup file")
    
    if [ -z "$latest_backup" ]; then
        echo -e "${RED}❌ No backup file found. Cannot rollback safely.${NC}" >&2
        exit 1
    fi
    
    echo "Found backup: $latest_backup"
    
    # Step 2: Find previous containerd version
    echo -e "\n${YELLOW}Step 2: Finding previous containerd version${NC}"
    previous_version=$(run_ssh "dnf list --showduplicates containerd.io 2>/dev/null | grep -E '1\.6\.' | tail -1 | awk '{print \$2}'" "Failed to find previous containerd version")
    
    if [ -z "$previous_version" ]; then
        echo -e "${RED}❌ No containerd 1.6.x version found in repositories${NC}" >&2
        exit 1
    fi
    
    echo "Previous version to restore: $previous_version"
    
    # Step 3: Restore containerd version
    echo -e "\n${YELLOW}Step 3: Restoring containerd version${NC}"
    if [ "$DRY_RUN" != true ]; then
        echo "Downgrading containerd to $previous_version..."
        run_ssh "dnf downgrade -y containerd.io-$previous_version" "Failed to downgrade containerd"
        
        # Remove versionlock if present
        run_ssh "dnf versionlock delete containerd.io 2>/dev/null || true" "Failed to remove versionlock"
    fi
    
    # Step 4: Restore configuration
    echo -e "\n${YELLOW}Step 4: Restoring containerd configuration${NC}"
    run_ssh "cp $latest_backup /etc/containerd/config.toml && echo 'Configuration restored'" "Failed to restore configuration"
    
    # Step 5: Restart services
    echo -e "\n${YELLOW}Step 5: Restarting services${NC}"
    run_ssh "systemctl restart containerd && sleep 5 && systemctl restart kubelet" "Failed to restart services"
    
    # Step 6: Re-enable Docker
    echo -e "\n${YELLOW}Step 6: Re-enabling Docker${NC}"
    run_ssh "systemctl enable --now docker && echo 'Docker re-enabled'" "Failed to re-enable Docker"
    
    # Step 7: Validation
    echo -e "\n${YELLOW}Step 7: Validating rollback${NC}"
    
    echo "Checking containerd version..."
    run_ssh "containerd --version" "Failed to check containerd version"
    
    echo "Checking service status..."
    run_ssh "systemctl is-active containerd kubelet docker" "Failed to check service status"
    
    echo "Checking Kubernetes nodes..."
    run_ssh "KUBECONFIG=/etc/kubernetes/admin.conf kubectl get nodes -o wide" "Failed to check Kubernetes nodes"
    
    # Step 8: Run af stx health
    echo -e "\n${YELLOW}Step 8: Running comprehensive health check${NC}"
    if [ "$DRY_RUN" != true ]; then
        echo "Running './scripts/af stx health'..."
        "$SCRIPT_DIR/af" stx health
    fi
    
    echo -e "\n${GREEN}✅ Rollback completed successfully!${NC}"
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
    
    echo "{\"ts\":\"$ts\",\"action\":\"af_stx_phase2_rollback\",\"af_env\":\"${AF_ENV:-local}\",\"stx_host\":\"$STX_HOST\",\"stx_port\":$STX_PORT,\"stx_user\":\"$STX_USER\",\"git_sha\":\"$sha\",\"git_dirty_count\":${dirty:-0},\"user\":\"$user\",\"host\":\"$host\"}" >> "$audit"
    
    echo -e "\nAudit log entry created in .goalie/stx_audit.jsonl"
}

# Main execution
main() {
    echo -e "${BLUE}=== StarlingX Phase 2 Containerd Rollback ===${NC}"
    echo "Host: $STX_HOST:$STX_PORT"
    echo "User: $STX_USER"
    echo "Dry Run: $DRY_RUN"
    echo ""
    
    check_prerequisites
    
    if [ "$DRY_RUN" = true ]; then
        echo -e "\n${YELLOW}=== DRY RUN COMPLETE ===${NC}"
        echo "No actual changes were made."
        echo "Run without --dry-run to perform the rollback."
        exit 0
    fi
    
    # Confirmation prompt
    echo -e "\n${YELLOW}⚠️  WARNING: This will rollback the containerd upgrade!${NC}"
    echo -n "Type 'ROLLBACK' to confirm: "
    read -r confirm
    
    if [ "$confirm" != "ROLLBACK" ]; then
        echo "Aborted."
        exit 1
    fi
    
    perform_rollback
    create_audit_entry
    
    echo -e "\n${GREEN}=== ROLLBACK COMPLETE ===${NC}"
    echo "Remember to uncordon the node if it was cordoned:"
    echo "  KUBECONFIG=/etc/kubernetes/admin.conf kubectl uncordon \$(hostname)"
}

# Execute main function
main "$@"
