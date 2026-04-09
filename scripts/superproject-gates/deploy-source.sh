#!/bin/bash
# =============================================================================
# Deploy Source Configuration to stx-aio-0
# =============================================================================
# Purpose: Configure StarlingX server (stx-aio-0) for off-host syslog forwarding
# Target: stx-aio-0.corp.interface.tag.ooo (23.92.79.2)
# 
# This script:
#   1. Deploys journald configuration (ForwardToSyslog=yes)
#   2. Deploys rsyslog TLS client configuration
#   3. Installs TLS certificates
#   4. Restarts services
#   5. Verifies connectivity
# =============================================================================

set -euo pipefail

# =============================================================================
# Configuration
# =============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CERTS_DIR="${SCRIPT_DIR}/../certs/generated"

# Target configuration
TARGET_HOST="${TARGET_HOST:-stx-aio-0.corp.interface.tag.ooo}"
TARGET_USER="${TARGET_USER:-sysadmin}"
VPS_IP="${VPS_IP:-}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}[INFO]${NC} $*"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $*"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $*"
}

log_step() {
    echo -e "${BLUE}[STEP]${NC} $*"
}

# =============================================================================
# Usage
# =============================================================================

usage() {
    cat << EOF
Usage: $0 [OPTIONS]

Deploy off-host syslog configuration to stx-aio-0.

OPTIONS:
    -h, --help          Show this help message
    -t, --target HOST   Target hostname (default: stx-aio-0.corp.interface.tag.ooo)
    -u, --user USER     SSH user (default: sysadmin)
    -v, --vps-ip IP     VPS syslog sink IP address (required)
    -c, --certs-dir DIR Certificate directory (default: ../certs/generated)
    -n, --dry-run       Show what would be done without making changes

EXAMPLES:
    $0 --vps-ip 203.0.113.50
    $0 --vps-ip 203.0.113.50 --target stx-aio-0 --user sysadmin
    $0 --vps-ip 203.0.113.50 --dry-run

PREREQUISITES:
    - SSH access to stx-aio-0 with sudo privileges
    - Certificates generated in ../certs/generated/
    - VPS syslog sink deployed and accessible
EOF
    exit 0
}

# =============================================================================
# Argument Parsing
# =============================================================================

DRY_RUN=false

while [[ $# -gt 0 ]]; do
    case "$1" in
        -h|--help)
            usage
            ;;
        -t|--target)
            TARGET_HOST="$2"
            shift 2
            ;;
        -u|--user)
            TARGET_USER="$2"
            shift 2
            ;;
        -v|--vps-ip)
            VPS_IP="$2"
            shift 2
            ;;
        -c|--certs-dir)
            CERTS_DIR="$2"
            shift 2
            ;;
        -n|--dry-run)
            DRY_RUN=true
            shift
            ;;
        *)
            log_error "Unknown option: $1"
            usage
            ;;
    esac
done

# =============================================================================
# Prerequisite Checks
# =============================================================================

check_prerequisites() {
    log_step "Checking prerequisites..."
    
    local errors=0
    
    # Check VPS_IP is set
    if [[ -z "${VPS_IP}" ]]; then
        log_error "VPS_IP is required. Use --vps-ip to specify."
        ((errors++))
    fi
    
    # Check certificate files exist
    if [[ ! -f "${CERTS_DIR}/ca.crt" ]]; then
        log_error "CA certificate not found: ${CERTS_DIR}/ca.crt"
        ((errors++))
    fi
    
    if [[ ! -f "${CERTS_DIR}/client.crt" ]]; then
        log_error "Client certificate not found: ${CERTS_DIR}/client.crt"
        ((errors++))
    fi
    
    if [[ ! -f "${CERTS_DIR}/client.key" ]]; then
        log_error "Client key not found: ${CERTS_DIR}/client.key"
        ((errors++))
    fi
    
    # Check source configuration files exist
    if [[ ! -f "${SCRIPT_DIR}/journald.conf.d/50-forward-syslog.conf" ]]; then
        log_error "journald config not found: ${SCRIPT_DIR}/journald.conf.d/50-forward-syslog.conf"
        ((errors++))
    fi
    
    if [[ ! -f "${SCRIPT_DIR}/rsyslog.d/99-offhost-tls.conf" ]]; then
        log_error "rsyslog config not found: ${SCRIPT_DIR}/rsyslog.d/99-offhost-tls.conf"
        ((errors++))
    fi
    
    # Check SSH connectivity
    if ! $DRY_RUN; then
        if ! ssh -o ConnectTimeout=5 -o BatchMode=yes "${TARGET_USER}@${TARGET_HOST}" "echo OK" &>/dev/null; then
            log_error "Cannot SSH to ${TARGET_USER}@${TARGET_HOST}"
            log_error "Ensure SSH key is configured and target is accessible"
            ((errors++))
        fi
    fi
    
    if [[ $errors -gt 0 ]]; then
        log_error "${errors} prerequisite check(s) failed"
        exit 1
    fi
    
    log_info "Prerequisites check passed"
}

# =============================================================================
# Remote Execution Helper
# =============================================================================

remote_exec() {
    local cmd="$1"
    if $DRY_RUN; then
        echo "[DRY-RUN] ssh ${TARGET_USER}@${TARGET_HOST} \"$cmd\""
    else
        ssh "${TARGET_USER}@${TARGET_HOST}" "$cmd"
    fi
}

remote_copy() {
    local src="$1"
    local dest="$2"
    if $DRY_RUN; then
        echo "[DRY-RUN] scp $src ${TARGET_USER}@${TARGET_HOST}:$dest"
    else
        scp "$src" "${TARGET_USER}@${TARGET_HOST}:$dest"
    fi
}

# =============================================================================
# Deployment Steps
# =============================================================================

deploy_certificates() {
    log_step "Deploying TLS certificates..."
    
    # Create temporary directory on target
    remote_exec "mkdir -p /tmp/offhost-syslog-certs"
    
    # Copy certificates
    remote_copy "${CERTS_DIR}/ca.crt" "/tmp/offhost-syslog-certs/"
    remote_copy "${CERTS_DIR}/client.crt" "/tmp/offhost-syslog-certs/"
    remote_copy "${CERTS_DIR}/client.key" "/tmp/offhost-syslog-certs/"
    
    # Install certificates with proper permissions
    remote_exec "sudo cp /tmp/offhost-syslog-certs/ca.crt /etc/ssl/certs/observability-ca.crt"
    remote_exec "sudo cp /tmp/offhost-syslog-certs/client.crt /etc/ssl/certs/stx-aio-0.crt"
    remote_exec "sudo cp /tmp/offhost-syslog-certs/client.key /etc/ssl/private/stx-aio-0.key"
    
    # Set permissions
    remote_exec "sudo chmod 644 /etc/ssl/certs/observability-ca.crt"
    remote_exec "sudo chmod 644 /etc/ssl/certs/stx-aio-0.crt"
    remote_exec "sudo chmod 600 /etc/ssl/private/stx-aio-0.key"
    remote_exec "sudo chown root:root /etc/ssl/certs/observability-ca.crt /etc/ssl/certs/stx-aio-0.crt /etc/ssl/private/stx-aio-0.key"
    
    # Cleanup
    remote_exec "rm -rf /tmp/offhost-syslog-certs"
    
    log_info "Certificates deployed"
}

deploy_journald_config() {
    log_step "Deploying journald configuration..."
    
    # Create directory if needed
    remote_exec "sudo mkdir -p /etc/systemd/journald.conf.d"
    
    # Copy configuration
    remote_copy "${SCRIPT_DIR}/journald.conf.d/50-forward-syslog.conf" "/tmp/"
    remote_exec "sudo cp /tmp/50-forward-syslog.conf /etc/systemd/journald.conf.d/"
    remote_exec "sudo chmod 644 /etc/systemd/journald.conf.d/50-forward-syslog.conf"
    remote_exec "rm /tmp/50-forward-syslog.conf"
    
    log_info "journald configuration deployed"
}

deploy_rsyslog_config() {
    log_step "Deploying rsyslog TLS configuration..."
    
    # Create processed config with VPS IP
    local tmp_config="/tmp/99-offhost-tls.conf.$$"
    sed "s/__VPS_IP__/${VPS_IP}/g" "${SCRIPT_DIR}/rsyslog.d/99-offhost-tls.conf" > "$tmp_config"
    
    # Copy to target
    remote_copy "$tmp_config" "/tmp/99-offhost-tls.conf"
    rm "$tmp_config"
    
    # Install
    remote_exec "sudo cp /tmp/99-offhost-tls.conf /etc/rsyslog.d/"
    remote_exec "sudo chmod 644 /etc/rsyslog.d/99-offhost-tls.conf"
    remote_exec "rm /tmp/99-offhost-tls.conf"
    
    # Ensure rsyslog-gnutls is installed (AlmaLinux 8)
    remote_exec "sudo dnf install -y rsyslog-gnutls 2>/dev/null || sudo yum install -y rsyslog-gnutls 2>/dev/null || true"
    
    log_info "rsyslog TLS configuration deployed"
}

restart_services() {
    log_step "Restarting services..."
    
    # Restart journald
    remote_exec "sudo systemctl restart systemd-journald"
    log_info "systemd-journald restarted"
    
    # Validate rsyslog config
    log_info "Validating rsyslog configuration..."
    remote_exec "sudo rsyslogd -N1" || {
        log_error "rsyslog configuration validation failed!"
        exit 1
    }
    
    # Restart rsyslog
    remote_exec "sudo systemctl restart rsyslog"
    log_info "rsyslog restarted"
    
    # Enable services on boot
    remote_exec "sudo systemctl enable rsyslog"
    
    log_info "Services restarted and enabled"
}

verify_deployment() {
    log_step "Verifying deployment..."
    
    # Check journald forwarding
    log_info "Checking journald ForwardToSyslog..."
    if remote_exec "grep -q 'ForwardToSyslog=yes' /etc/systemd/journald.conf.d/50-forward-syslog.conf"; then
        log_info "✓ journald forwarding enabled"
    else
        log_warn "✗ journald forwarding may not be configured"
    fi
    
    # Check rsyslog is running
    log_info "Checking rsyslog status..."
    if remote_exec "systemctl is-active rsyslog >/dev/null 2>&1"; then
        log_info "✓ rsyslog is running"
    else
        log_warn "✗ rsyslog is not running"
    fi
    
    # Check certificate files exist
    log_info "Checking certificate files..."
    if remote_exec "test -f /etc/ssl/certs/observability-ca.crt && test -f /etc/ssl/certs/stx-aio-0.crt && test -f /etc/ssl/private/stx-aio-0.key"; then
        log_info "✓ Certificates installed"
    else
        log_warn "✗ Some certificate files may be missing"
    fi
    
    # Check certificate permissions
    log_info "Checking certificate permissions..."
    local key_perms
    key_perms=$(remote_exec "stat -c '%a' /etc/ssl/private/stx-aio-0.key 2>/dev/null || echo 'unknown'")
    if [[ "$key_perms" == "600" ]]; then
        log_info "✓ Private key has correct permissions (0600)"
    else
        log_warn "✗ Private key permissions: $key_perms (expected: 600)"
    fi
    
    # Test TCP connectivity to VPS
    log_info "Testing TCP connectivity to VPS:6514..."
    if remote_exec "timeout 5 bash -c 'echo > /dev/tcp/${VPS_IP}/6514' 2>/dev/null"; then
        log_info "✓ TCP connection to ${VPS_IP}:6514 successful"
    else
        log_warn "✗ Cannot connect to ${VPS_IP}:6514 - VPS may not be ready"
    fi
}

# =============================================================================
# Main
# =============================================================================

main() {
    echo "=============================================="
    echo "Off-Host Syslog - Source Deployment"
    echo "=============================================="
    echo "Target: ${TARGET_HOST}"
    echo "User: ${TARGET_USER}"
    echo "VPS IP: ${VPS_IP:-<not set>}"
    echo "Dry Run: ${DRY_RUN}"
    echo "=============================================="
    echo ""
    
    check_prerequisites
    
    if $DRY_RUN; then
        log_warn "DRY RUN MODE - No changes will be made"
        echo ""
    fi
    
    deploy_certificates
    deploy_journald_config
    deploy_rsyslog_config
    
    if ! $DRY_RUN; then
        restart_services
        verify_deployment
    fi
    
    echo ""
    echo "=============================================="
    echo "Deployment Complete"
    echo "=============================================="
    echo ""
    echo "Next steps:"
    echo "  1. Test log forwarding: logger -p authpriv.info 'Test message'"
    echo "  2. Check VPS for received logs: tail -f /var/log/remote/auth.log"
    echo "  3. Verify with SSH login: ssh ${TARGET_USER}@${TARGET_HOST}"
    echo ""
}

main "$@"
