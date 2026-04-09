#!/usr/bin/env bash
#
# setup_stx_deployment_env.sh
#
# Phase B: Environment Preparation Script for STX Deployment
# Configures environment variables, verifies dependencies, and validates connectivity
#
# Usage: source scripts/setup_stx_deployment_env.sh [--validate] [--break-glass]
#
# Requirements:
# - sshpass (for password authentication)
# - openstack-client (optional, for API operations)
# - 1Password CLI (op) for vault-based credential retrieval
#
# Created: 2026-01-03T05:25:00Z
# Phase: B - Environment Preparation
# Target: StarlingX AIO at 23.92.79.2:2222
#

set -euo pipefail

# ============================================================================
# CONFIGURATION
# ============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# ============================================================================
# STX TARGET CONFIGURATION
# ============================================================================

# Target Host Configuration
export STX_TARGET_HOST="23.92.79.2"
export STX_SSH_PORT="2222"
export STX_SSH_USER="ubuntu"
export STX_HOSTNAME="stx-aio--corp-interface-tag-ooo"

# Authentication Configuration
export SSH_AUTH_MODE="password"
# NOTE: Password retrieved from vault - NEVER hardcode
# export HIVELOCITY_SSH_PASSWORD="<PLACEHOLDER_VAULT_RETRIEVE>"

# OpenStack/Keystone Configuration
export STX_AUTH_URL="http://23.92.79.2:5000/v3"
export OS_USERNAME="admin"
export OS_PROJECT_NAME="admin"
export OS_IDENTITY_API_VERSION="3"
export OS_IMAGE_API_VERSION="2"
export OS_USER_DOMAIN_NAME="Default"
export OS_PROJECT_DOMAIN_NAME="Default"

# SSH Key Configuration (for future key-based auth migration)
export STX_SSH_KEY="${HOME}/.ssh/starlingx_key"

# Break-Glass Configuration
export BREAK_GLASS_ENABLED="${BREAK_GLASS_ENABLED:-false}"
export AF_BREAK_GLASS="${AF_BREAK_GLASS:-0}"
export AF_BREAK_GLASS_REASON="${AF_BREAK_GLASS_REASON:-}"
export AF_CHANGE_TICKET="${AF_CHANGE_TICKET:-}"

# Deployment Scripts
export STX_DEPLOY_SCRIPT="/tmp/consolidated_deploy_stx_greenfield.sh"

# ============================================================================
# FUNCTIONS
# ============================================================================

print_header() {
    echo ""
    echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
}

print_status() {
    local status="$1"
    local message="$2"
    case "$status" in
        "ok")     echo -e "  ${GREEN}✓${NC} $message" ;;
        "warn")   echo -e "  ${YELLOW}⚠${NC} $message" ;;
        "error")  echo -e "  ${RED}✗${NC} $message" ;;
        "info")   echo -e "  ${CYAN}ℹ${NC} $message" ;;
    esac
}

# Retrieve password from 1Password vault
retrieve_vault_password() {
    print_status "info" "Attempting to retrieve SSH password from vault..."
    
    if command -v op >/dev/null 2>&1; then
        if op whoami >/dev/null 2>&1; then
            local password
            password=$(op read "op://Private/AF-Prod/HIVELOCITY_SSH_PASSWORD" --no-newline 2>/dev/null || echo "")
            if [[ -n "$password" ]]; then
                export HIVELOCITY_SSH_PASSWORD="$password"
                print_status "ok" "Password retrieved from 1Password vault"
                return 0
            else
                print_status "warn" "Failed to retrieve password from vault"
                return 1
            fi
        else
            print_status "warn" "1Password CLI not authenticated (run: op signin)"
            return 1
        fi
    else
        print_status "warn" "1Password CLI (op) not installed"
        return 1
    fi
}

# Retrieve password from environment or prompt
ensure_password() {
    if [[ -n "${HIVELOCITY_SSH_PASSWORD:-}" ]]; then
        print_status "ok" "SSH password already set in environment"
        return 0
    fi
    
    # Try vault first
    if retrieve_vault_password; then
        return 0
    fi
    
    # Interactive prompt as fallback
    if [[ -t 0 ]]; then
        echo -e "${YELLOW}Enter SSH password for ubuntu@${STX_TARGET_HOST}:${NC}"
        read -rs HIVELOCITY_SSH_PASSWORD
        export HIVELOCITY_SSH_PASSWORD
        if [[ -n "$HIVELOCITY_SSH_PASSWORD" ]]; then
            print_status "ok" "Password set from interactive input"
            return 0
        fi
    fi
    
    print_status "error" "SSH password not available"
    return 1
}

# Check required dependencies
check_dependencies() {
    print_header "Dependency Check"
    
    local missing_deps=0
    
    # Required dependencies
    if command -v sshpass >/dev/null 2>&1; then
        print_status "ok" "sshpass installed: $(sshpass -V 2>&1 | head -1)"
    else
        print_status "error" "sshpass NOT installed (required for password auth)"
        echo "  Install: brew install hudochenkov/sshpass/sshpass"
        ((missing_deps++))
    fi
    
    if command -v ssh >/dev/null 2>&1; then
        print_status "ok" "ssh installed: $(ssh -V 2>&1)"
    else
        print_status "error" "ssh NOT installed"
        ((missing_deps++))
    fi
    
    if command -v nc >/dev/null 2>&1; then
        print_status "ok" "nc (netcat) installed"
    else
        print_status "warn" "nc (netcat) not installed (optional, for connectivity tests)"
    fi
    
    # Optional dependencies
    if command -v openstack >/dev/null 2>&1; then
        print_status "ok" "openstack-client installed"
    else
        print_status "warn" "openstack-client not installed (optional)"
    fi
    
    if command -v op >/dev/null 2>&1; then
        print_status "ok" "1Password CLI installed"
    else
        print_status "warn" "1Password CLI (op) not installed (recommended for secrets)"
    fi
    
    if command -v jq >/dev/null 2>&1; then
        print_status "ok" "jq installed"
    else
        print_status "warn" "jq not installed (optional, for JSON parsing)"
    fi
    
    if [[ $missing_deps -gt 0 ]]; then
        print_status "error" "Missing $missing_deps required dependencies"
        return 1
    else
        print_status "ok" "All required dependencies satisfied"
        return 0
    fi
}

# Validate SSH key permissions
check_ssh_key() {
    print_header "SSH Key Validation"
    
    if [[ -f "$STX_SSH_KEY" ]]; then
        local perms
        perms=$(stat -f "%Lp" "$STX_SSH_KEY" 2>/dev/null || stat -c "%a" "$STX_SSH_KEY" 2>/dev/null)
        
        if [[ "$perms" == "600" ]]; then
            print_status "ok" "SSH key exists with correct permissions (600)"
        else
            print_status "warn" "SSH key permissions are $perms (should be 600)"
            echo "  Fix: chmod 600 $STX_SSH_KEY"
        fi
        
        # Show key fingerprint
        local fingerprint
        fingerprint=$(ssh-keygen -l -f "$STX_SSH_KEY" 2>/dev/null | awk '{print $2}')
        print_status "info" "Key fingerprint: $fingerprint"
    else
        print_status "warn" "SSH key not found at $STX_SSH_KEY"
        print_status "info" "Using password authentication mode"
    fi
}

# Validate network connectivity
check_network_connectivity() {
    print_header "Network Connectivity"
    
    # Ping test
    if ping -c 1 -W 5 "$STX_TARGET_HOST" >/dev/null 2>&1; then
        print_status "ok" "Host $STX_TARGET_HOST is reachable (ping)"
    else
        print_status "warn" "Host $STX_TARGET_HOST not responding to ping (may be blocked)"
    fi
    
    # TCP port check
    if command -v nc >/dev/null 2>&1; then
        if nc -z -w 5 "$STX_TARGET_HOST" "$STX_SSH_PORT" 2>/dev/null; then
            print_status "ok" "SSH port $STX_SSH_PORT is open"
        else
            print_status "error" "SSH port $STX_SSH_PORT is not reachable"
            return 1
        fi
    else
        print_status "info" "Skipping port check (nc not available)"
    fi
    
    return 0
}

# Test SSH connectivity
test_ssh_connectivity() {
    print_header "SSH Connectivity Test"
    
    if ! ensure_password; then
        print_status "error" "Cannot test SSH - password not available"
        return 1
    fi
    
    print_status "info" "Testing SSH connection to $STX_SSH_USER@$STX_TARGET_HOST:$STX_SSH_PORT..."
    
    local ssh_output
    if ssh_output=$(sshpass -p "$HIVELOCITY_SSH_PASSWORD" ssh \
        -p "$STX_SSH_PORT" \
        -o ConnectTimeout=15 \
        -o StrictHostKeyChecking=no \
        -o UserKnownHostsFile=/dev/null \
        -o LogLevel=ERROR \
        "$STX_SSH_USER@$STX_TARGET_HOST" \
        "hostname && whoami && uname -a" 2>&1); then
        print_status "ok" "SSH connection successful"
        echo -e "  ${CYAN}Remote host info:${NC}"
        echo "$ssh_output" | sed 's/^/    /'
        return 0
    else
        print_status "error" "SSH connection failed"
        echo "$ssh_output" | sed 's/^/    /'
        return 1
    fi
}

# Check deployment script on remote host
check_remote_deployment_script() {
    print_header "Remote Deployment Script Check"
    
    if ! ensure_password; then
        print_status "error" "Cannot check remote script - password not available"
        return 1
    fi
    
    local remote_check
    if remote_check=$(sshpass -p "$HIVELOCITY_SSH_PASSWORD" ssh \
        -p "$STX_SSH_PORT" \
        -o ConnectTimeout=15 \
        -o StrictHostKeyChecking=no \
        -o UserKnownHostsFile=/dev/null \
        -o LogLevel=ERROR \
        "$STX_SSH_USER@$STX_TARGET_HOST" \
        "ls -la $STX_DEPLOY_SCRIPT 2>&1" 2>&1); then
        print_status "ok" "Deployment script found at $STX_DEPLOY_SCRIPT"
        echo "$remote_check" | sed 's/^/    /'
    else
        print_status "warn" "Deployment script not found at $STX_DEPLOY_SCRIPT"
    fi
}

# Display current environment configuration
show_environment_config() {
    print_header "Environment Configuration"
    
    echo -e "  ${CYAN}Target Host:${NC}"
    echo "    STX_TARGET_HOST=$STX_TARGET_HOST"
    echo "    STX_SSH_PORT=$STX_SSH_PORT"
    echo "    STX_SSH_USER=$STX_SSH_USER"
    echo "    STX_HOSTNAME=$STX_HOSTNAME"
    echo ""
    echo -e "  ${CYAN}Authentication:${NC}"
    echo "    SSH_AUTH_MODE=$SSH_AUTH_MODE"
    echo "    HIVELOCITY_SSH_PASSWORD=${HIVELOCITY_SSH_PASSWORD:+[SET]}"
    echo "    STX_SSH_KEY=$STX_SSH_KEY"
    echo ""
    echo -e "  ${CYAN}OpenStack/Keystone:${NC}"
    echo "    STX_AUTH_URL=$STX_AUTH_URL"
    echo "    OS_USERNAME=$OS_USERNAME"
    echo "    OS_PROJECT_NAME=$OS_PROJECT_NAME"
    echo "    OS_IDENTITY_API_VERSION=$OS_IDENTITY_API_VERSION"
    echo "    OS_IMAGE_API_VERSION=$OS_IMAGE_API_VERSION"
    echo ""
    echo -e "  ${CYAN}Break-Glass:${NC}"
    echo "    BREAK_GLASS_ENABLED=$BREAK_GLASS_ENABLED"
    echo "    AF_BREAK_GLASS=$AF_BREAK_GLASS"
    echo "    AF_BREAK_GLASS_REASON=${AF_BREAK_GLASS_REASON:-[NOT SET]}"
    echo "    AF_CHANGE_TICKET=${AF_CHANGE_TICKET:-[NOT SET]}"
}

# Enable break-glass mode
enable_break_glass() {
    print_header "Break-Glass Mode Activation"
    
    if [[ -z "${AF_BREAK_GLASS_REASON:-}" ]]; then
        if [[ -t 0 ]]; then
            echo -e "${YELLOW}Enter break-glass reason:${NC}"
            read -r AF_BREAK_GLASS_REASON
            export AF_BREAK_GLASS_REASON
        else
            print_status "error" "AF_BREAK_GLASS_REASON is required"
            return 1
        fi
    fi
    
    if [[ -z "${AF_CHANGE_TICKET:-}" ]]; then
        if [[ -t 0 ]]; then
            echo -e "${YELLOW}Enter change ticket ID (e.g., CHG-2026-0103-001):${NC}"
            read -r AF_CHANGE_TICKET
            export AF_CHANGE_TICKET
        else
            print_status "error" "AF_CHANGE_TICKET is required"
            return 1
        fi
    fi
    
    export BREAK_GLASS_ENABLED="true"
    export AF_BREAK_GLASS="1"
    
    print_status "ok" "Break-glass mode enabled"
    print_status "info" "Reason: $AF_BREAK_GLASS_REASON"
    print_status "info" "Ticket: $AF_CHANGE_TICKET"
    
    # Log break-glass activation
    local log_entry
    log_entry=$(cat <<EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "event": "break_glass_enabled",
  "reason": "$AF_BREAK_GLASS_REASON",
  "change_ticket": "$AF_CHANGE_TICKET",
  "user": "$(whoami)",
  "target_host": "$STX_TARGET_HOST"
}
EOF
)
    mkdir -p "$PROJECT_ROOT/.goalie"
    echo "$log_entry" >> "$PROJECT_ROOT/.goalie/break_glass_audit.jsonl"
    print_status "info" "Logged to .goalie/break_glass_audit.jsonl"
}

# Run full validation
run_full_validation() {
    print_header "Phase B Environment Validation"
    echo "  Started: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
    echo "  Target: $STX_SSH_USER@$STX_TARGET_HOST:$STX_SSH_PORT"
    
    local validation_errors=0
    
    check_dependencies || ((validation_errors++))
    check_ssh_key
    check_network_connectivity || ((validation_errors++))
    test_ssh_connectivity || ((validation_errors++))
    check_remote_deployment_script
    show_environment_config
    
    print_header "Validation Summary"
    
    if [[ $validation_errors -eq 0 ]]; then
        print_status "ok" "All validations passed"
        echo ""
        echo -e "  ${GREEN}Environment is ready for Phase C deployment${NC}"
        echo ""
        echo "  Next steps:"
        echo "    1. Enable break-glass mode: source setup_stx_deployment_env.sh --break-glass"
        echo "    2. Review deployment plan: docs/OBS3_DEPLOYMENT_EXECUTION_PLAN.md"
        echo "    3. Execute deployment: scripts/deploy_stx_greenfield.sh"
        return 0
    else
        print_status "error" "$validation_errors validation(s) failed"
        echo ""
        echo -e "  ${RED}Environment NOT ready for deployment${NC}"
        echo "  Please resolve the issues above before proceeding."
        return 1
    fi
}

# SSH helper function for remote commands
stx_ssh() {
    if ! ensure_password; then
        echo "Error: SSH password not available" >&2
        return 1
    fi
    
    sshpass -p "$HIVELOCITY_SSH_PASSWORD" ssh \
        -p "$STX_SSH_PORT" \
        -o ConnectTimeout=30 \
        -o StrictHostKeyChecking=no \
        -o UserKnownHostsFile=/dev/null \
        -o ServerAliveInterval=60 \
        "$STX_SSH_USER@$STX_TARGET_HOST" \
        "$@"
}

# Export the SSH helper function
export -f stx_ssh 2>/dev/null || true

# ============================================================================
# MAIN EXECUTION
# ============================================================================

main() {
    local validate_mode=false
    local break_glass_mode=false
    
    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --validate)
                validate_mode=true
                shift
                ;;
            --break-glass)
                break_glass_mode=true
                shift
                ;;
            --help|-h)
                echo "Usage: source $0 [--validate] [--break-glass]"
                echo ""
                echo "Options:"
                echo "  --validate     Run full environment validation"
                echo "  --break-glass  Enable break-glass mode for high-risk operations"
                echo ""
                echo "When sourced without options, sets up environment variables."
                return 0
                ;;
            *)
                echo "Unknown option: $1"
                return 1
                ;;
        esac
    done
    
    print_header "STX Deployment Environment Setup"
    echo "  Phase: B - Environment Preparation"
    echo "  Target: $STX_SSH_USER@$STX_TARGET_HOST:$STX_SSH_PORT"
    echo "  Time: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
    
    # Try to retrieve password from vault
    retrieve_vault_password 2>/dev/null || true
    
    if [[ "$break_glass_mode" == "true" ]]; then
        enable_break_glass
    fi
    
    if [[ "$validate_mode" == "true" ]]; then
        run_full_validation
    else
        show_environment_config
        echo ""
        print_status "info" "Environment variables configured"
        print_status "info" "Run with --validate for full validation"
        print_status "info" "Run with --break-glass to enable break-glass mode"
    fi
}

# Execute if run directly (not sourced)
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
