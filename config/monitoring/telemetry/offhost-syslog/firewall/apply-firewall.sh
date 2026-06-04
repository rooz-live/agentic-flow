#!/bin/bash
# =============================================================================
# Off-Host Syslog Sink VPS - Firewall Apply Script with Rollback
# =============================================================================
# Purpose: Safely apply nftables rules with automatic rollback on failure
# Target: AWS Lightsail or Hivelocity VPS
# Phase: 3.2 - Firewall Rules and Network Security
# =============================================================================
#
# USAGE:
#   sudo ./apply-firewall.sh [--dry-run] [--rollback] [--force]
#
# OPTIONS:
#   --dry-run   Validate rules without applying
#   --rollback  Restore previous configuration
#   --force     Skip confirmation prompts
#
# SAFETY FEATURES:
#   1. Validates rules before applying
#   2. Creates timestamped backup of current rules
#   3. Automatic rollback after 60 seconds if not confirmed
#   4. SSH connectivity check before final commit
#
# =============================================================================

set -euo pipefail

# Configuration
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly NFTABLES_CONF="${SCRIPT_DIR}/nftables-sink.conf"
readonly BACKUP_DIR="/var/lib/nftables/backups"
readonly ROLLBACK_TIMEOUT=60
readonly LOG_FILE="/var/log/firewall-apply.log"

# Colors for output
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly NC='\033[0m' # No Color

# =============================================================================
# Logging Functions
# =============================================================================

log() {
    local level="$1"
    shift
    local message="$*"
    local timestamp
    timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "[${timestamp}] [${level}] ${message}" | tee -a "$LOG_FILE"
}

log_info() { log "INFO" "$@"; }
log_warn() { log "${YELLOW}WARN${NC}" "$@"; }
log_error() { log "${RED}ERROR${NC}" "$@"; }
log_success() { log "${GREEN}OK${NC}" "$@"; }

# =============================================================================
# Prerequisite Checks
# =============================================================================

check_root() {
    if [[ $EUID -ne 0 ]]; then
        log_error "This script must be run as root (use sudo)"
        exit 1
    fi
}

check_nftables() {
    if ! command -v nft &> /dev/null; then
        log_error "nftables is not installed. Install with: apt install nftables"
        exit 1
    fi
}

check_config_exists() {
    if [[ ! -f "$NFTABLES_CONF" ]]; then
        log_error "Configuration file not found: $NFTABLES_CONF"
        exit 1
    fi
}

# =============================================================================
# Backup Functions
# =============================================================================

create_backup() {
    local timestamp
    timestamp=$(date '+%Y%m%d_%H%M%S')
    local backup_file="${BACKUP_DIR}/nftables_backup_${timestamp}.conf"

    mkdir -p "$BACKUP_DIR"
    
    log_info "Creating backup of current rules..."
    if nft list ruleset > "$backup_file" 2>/dev/null; then
        log_success "Backup created: $backup_file"
        echo "$backup_file"
    else
        log_warn "No existing ruleset to backup (first time setup)"
        echo ""
    fi
}

get_latest_backup() {
    if [[ -d "$BACKUP_DIR" ]]; then
        find "$BACKUP_DIR" -name "nftables_backup_*.conf" -type f | sort -r | head -n1
    else
        echo ""
    fi
}

# =============================================================================
# Validation Functions
# =============================================================================

validate_rules() {
    log_info "Validating nftables configuration..."
    
    # Syntax check
    if ! nft -c -f "$NFTABLES_CONF" 2>&1; then
        log_error "Syntax validation failed!"
        return 1
    fi
    
    log_success "Configuration syntax is valid"
    return 0
}

check_ssh_connectivity() {
    local admin_ip="173.94.53.113"
    local ssh_port=22
    
    log_info "Verifying SSH port is accessible..."
    
    # Check if SSH is listening
    if ss -tlnp | grep -q ":${ssh_port}"; then
        log_success "SSH daemon is listening on port $ssh_port"
    else
        log_error "SSH daemon is not listening on port $ssh_port!"
        return 1
    fi
    
    # Verify the rules allow SSH from admin IP
    if nft list ruleset | grep -q "saddr ${admin_ip}.*dport ${ssh_port}.*accept"; then
        log_success "SSH access rule for $admin_ip is present"
    else
        log_warn "Cannot verify SSH access rule for $admin_ip - proceed with caution"
    fi
    
    return 0
}

# =============================================================================
# Apply Functions
# =============================================================================

apply_rules() {
    local backup_file="$1"
    
    log_info "Applying new firewall rules..."
    
    if nft -f "$NFTABLES_CONF" 2>&1; then
        log_success "Firewall rules applied successfully"
        return 0
    else
        log_error "Failed to apply firewall rules!"
        if [[ -n "$backup_file" && -f "$backup_file" ]]; then
            log_warn "Attempting automatic rollback..."
            rollback_rules "$backup_file"
        fi
        return 1
    fi
}

rollback_rules() {
    local backup_file="$1"
    
    if [[ -z "$backup_file" || ! -f "$backup_file" ]]; then
        log_error "No backup file available for rollback"
        log_warn "Flushing ruleset as fallback..."
        nft flush ruleset
        return 1
    fi
    
    log_info "Rolling back to: $backup_file"
    
    if nft -f "$backup_file" 2>&1; then
        log_success "Rollback completed successfully"
        return 0
    else
        log_error "Rollback failed! Manual intervention required."
        return 1
    fi
}

# =============================================================================
# Interactive Confirmation with Timeout
# =============================================================================

confirm_with_timeout() {
    local backup_file="$1"
    local timeout=$ROLLBACK_TIMEOUT
    
    echo ""
    log_warn "==================================================================="
    log_warn "IMPORTANT: New firewall rules are now active!"
    log_warn "==================================================================="
    echo ""
    echo -e "${YELLOW}Please verify you can still connect via SSH from 173.94.53.113${NC}"
    echo ""
    echo "The rules will be automatically rolled back in $timeout seconds"
    echo "unless you confirm they are working correctly."
    echo ""
    echo -n "Type 'CONFIRM' within $timeout seconds to keep the new rules: "
    
    local confirmed=false
    local start_time
    start_time=$(date +%s)
    
    while true; do
        local current_time
        current_time=$(date +%s)
        local elapsed=$((current_time - start_time))
        local remaining=$((timeout - elapsed))
        
        if [[ $remaining -le 0 ]]; then
            echo ""
            log_warn "Timeout reached! Rolling back..."
            rollback_rules "$backup_file"
            exit 1
        fi
        
        # Read with timeout
        if read -r -t 1 response; then
            if [[ "$response" == "CONFIRM" ]]; then
                confirmed=true
                break
            else
                echo -n "Invalid response. Type 'CONFIRM' ($remaining seconds remaining): "
            fi
        fi
    done
    
    if $confirmed; then
        log_success "Rules confirmed! Making changes permanent..."
        persist_rules
    fi
}

persist_rules() {
    log_info "Persisting rules to /etc/nftables.conf..."
    
    # Save current ruleset
    nft list ruleset > /etc/nftables.conf
    
    # Enable nftables service to load rules on boot
    if systemctl is-enabled nftables &>/dev/null; then
        log_info "nftables service is already enabled"
    else
        systemctl enable nftables
        log_success "nftables service enabled for boot persistence"
    fi
    
    log_success "Firewall configuration persisted successfully"
}

# =============================================================================
# Dry Run Mode
# =============================================================================

dry_run() {
    log_info "=== DRY RUN MODE ==="
    
    check_config_exists
    validate_rules
    
    echo ""
    log_info "Rules that would be applied:"
    echo "-------------------------------------------"
    cat "$NFTABLES_CONF"
    echo "-------------------------------------------"
    
    log_info "Current active rules:"
    echo "-------------------------------------------"
    nft list ruleset 2>/dev/null || echo "(no rules currently active)"
    echo "-------------------------------------------"
    
    log_success "Dry run completed. No changes were made."
}

# =============================================================================
# Rollback Mode
# =============================================================================

rollback_mode() {
    local backup_file
    backup_file=$(get_latest_backup)
    
    if [[ -z "$backup_file" ]]; then
        log_error "No backup found in $BACKUP_DIR"
        echo ""
        echo "Available options:"
        echo "  1. Flush all rules: sudo nft flush ruleset"
        echo "  2. Apply default config: sudo nft -f /etc/nftables.conf"
        exit 1
    fi
    
    log_info "Available backups:"
    ls -la "$BACKUP_DIR"/*.conf 2>/dev/null || true
    
    echo ""
    log_info "Rolling back to most recent backup: $backup_file"
    
    rollback_rules "$backup_file"
    persist_rules
}

# =============================================================================
# Main Function
# =============================================================================

main() {
    local dry_run_mode=false
    local rollback_mode_flag=false
    local force_mode=false
    
    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case "$1" in
            --dry-run)
                dry_run_mode=true
                shift
                ;;
            --rollback)
                rollback_mode_flag=true
                shift
                ;;
            --force)
                force_mode=true
                shift
                ;;
            --help|-h)
                echo "Usage: $0 [--dry-run] [--rollback] [--force]"
                echo ""
                echo "Options:"
                echo "  --dry-run   Validate rules without applying"
                echo "  --rollback  Restore previous configuration"
                echo "  --force     Skip confirmation prompts"
                exit 0
                ;;
            *)
                log_error "Unknown option: $1"
                exit 1
                ;;
        esac
    done
    
    # Create log file if needed
    mkdir -p "$(dirname "$LOG_FILE")"
    touch "$LOG_FILE"
    
    echo ""
    log_info "=========================================="
    log_info "Off-Host Syslog Firewall Management"
    log_info "=========================================="
    echo ""
    
    # Prerequisite checks
    check_root
    check_nftables
    
    # Handle modes
    if $dry_run_mode; then
        dry_run
        exit 0
    fi
    
    if $rollback_mode_flag; then
        rollback_mode
        exit 0
    fi
    
    # Normal apply mode
    check_config_exists
    validate_rules
    
    # Create backup
    local backup_file
    backup_file=$(create_backup)
    
    # Apply rules
    apply_rules "$backup_file"
    
    # Verify SSH connectivity
    check_ssh_connectivity
    
    # Confirmation (unless force mode)
    if $force_mode; then
        log_warn "Force mode: skipping confirmation timeout"
        persist_rules
    else
        confirm_with_timeout "$backup_file"
    fi
    
    echo ""
    log_success "=========================================="
    log_success "Firewall configuration complete!"
    log_success "=========================================="
    echo ""
    
    # Display current rules summary
    log_info "Active rules summary:"
    nft list ruleset | head -50
    echo "..."
    echo "(truncated - use 'nft list ruleset' for full output)"
}

# Run main function
main "$@"
