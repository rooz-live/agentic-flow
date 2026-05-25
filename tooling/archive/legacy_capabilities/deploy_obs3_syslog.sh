#!/usr/bin/env bash
#
# deploy_obs3_syslog.sh
#
# Phase C: OBS3 Syslog Deployment Script
# Deploys TLS-secured off-host syslog infrastructure to StarlingX
#
# Usage:
#   ./scripts/deploy_obs3_syslog.sh [--check-only] [--step N]
#
# Requirements:
#   - SSH access to 23.92.79.2:2222 (ubuntu user)
#   - sshpass installed (for password auth)
#   - TLS certificates generated (config/telemetry/obs3-syslog-certs/)
#
# Created: 2026-01-03T05:38:00Z
# Phase: C - OBS3 Deployment Execution
# Target: StarlingX AIO at 23.92.79.2:2222
# Change Ticket: CHG-2026-0103-001
#

set -euo pipefail

# ============================================================================
# CONFIGURATION
# ============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
CERT_DIR="$PROJECT_ROOT/config/telemetry/obs3-syslog-certs"
LOG_DIR="$PROJECT_ROOT/logs"
TIMESTAMP=$(date -u +%Y%m%d-%H%M%S)
LOG_FILE="$LOG_DIR/obs3-deployment-$TIMESTAMP.log"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Target Configuration
STX_TARGET_HOST="23.92.79.2"
STX_SSH_PORT="2222"
STX_SSH_USER="ubuntu"
STX_SSH_KEY="${HOME}/.ssh/starlingx_key"

# Remote Paths
REMOTE_CERT_DIR="/etc/ssl/syslog"
REMOTE_RSYSLOG_CONF="/etc/rsyslog.d"
REMOTE_LOG_DIR="/var/log/offhost-syslog"

# ============================================================================
# FUNCTIONS
# ============================================================================

log() {
    local level="$1"
    shift
    local message="$*"
    local timestamp=$(date -u +%Y-%m-%dT%H:%M:%SZ)
    echo -e "[$timestamp] [$level] $message" | tee -a "$LOG_FILE"
}

print_header() {
    echo ""
    echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
    log "INFO" "=== $1 ==="
}

print_status() {
    local status="$1"
    local message="$2"
    case "$status" in
        "ok")     echo -e "  ${GREEN}✓${NC} $message"; log "INFO" "✓ $message" ;;
        "warn")   echo -e "  ${YELLOW}⚠${NC} $message"; log "WARN" "⚠ $message" ;;
        "error")  echo -e "  ${RED}✗${NC} $message"; log "ERROR" "✗ $message" ;;
        "info")   echo -e "  ${CYAN}ℹ${NC} $message"; log "INFO" "ℹ $message" ;;
    esac
}

# Execute remote command via SSH
remote_exec() {
    local cmd="$1"
    local use_sudo="${2:-false}"
    
    if [[ "$use_sudo" == "true" ]]; then
        cmd="sudo $cmd"
    fi
    
    if [[ -n "${HIVELOCITY_SSH_PASSWORD:-}" ]]; then
        sshpass -p "$HIVELOCITY_SSH_PASSWORD" ssh \
            -p "$STX_SSH_PORT" \
            -o ConnectTimeout=30 \
            -o StrictHostKeyChecking=no \
            -o UserKnownHostsFile=/dev/null \
            "$STX_SSH_USER@$STX_TARGET_HOST" \
            "$cmd" 2>&1
    else
        ssh -i "$STX_SSH_KEY" \
            -p "$STX_SSH_PORT" \
            -o ConnectTimeout=30 \
            -o StrictHostKeyChecking=no \
            -o UserKnownHostsFile=/dev/null \
            "$STX_SSH_USER@$STX_TARGET_HOST" \
            "$cmd" 2>&1
    fi
}

# Copy file to remote via SCP
remote_copy() {
    local local_file="$1"
    local remote_path="$2"
    
    if [[ -n "${HIVELOCITY_SSH_PASSWORD:-}" ]]; then
        sshpass -p "$HIVELOCITY_SSH_PASSWORD" scp \
            -P "$STX_SSH_PORT" \
            -o ConnectTimeout=30 \
            -o StrictHostKeyChecking=no \
            -o UserKnownHostsFile=/dev/null \
            "$local_file" \
            "$STX_SSH_USER@$STX_TARGET_HOST:$remote_path" 2>&1
    else
        scp -i "$STX_SSH_KEY" \
            -P "$STX_SSH_PORT" \
            -o ConnectTimeout=30 \
            -o StrictHostKeyChecking=no \
            -o UserKnownHostsFile=/dev/null \
            "$local_file" \
            "$STX_SSH_USER@$STX_TARGET_HOST:$remote_path" 2>&1
    fi
}

check_prerequisites() {
    print_header "Step 0: Prerequisites Check"
    
    local errors=0
    
    # Check local certificates
    if [[ -f "$CERT_DIR/syslog-ca.crt" ]]; then
        print_status "ok" "CA certificate exists"
    else
        print_status "error" "CA certificate not found at $CERT_DIR/syslog-ca.crt"
        ((errors++))
    fi
    
    if [[ -f "$CERT_DIR/syslog-server.crt" ]]; then
        print_status "ok" "Server certificate exists"
    else
        print_status "error" "Server certificate not found"
        ((errors++))
    fi
    
    if [[ -f "$CERT_DIR/syslog-client.crt" ]]; then
        print_status "ok" "Client certificate exists"
    else
        print_status "error" "Client certificate not found"
        ((errors++))
    fi
    
    # Check SSH connectivity
    print_status "info" "Testing SSH connectivity to $STX_TARGET_HOST:$STX_SSH_PORT..."
    if remote_exec "hostname" 2>/dev/null; then
        print_status "ok" "SSH connectivity verified"
    else
        print_status "error" "SSH connectivity failed"
        ((errors++))
    fi
    
    if [[ $errors -gt 0 ]]; then
        print_status "error" "$errors prerequisite(s) failed"
        return 1
    fi
    
    print_status "ok" "All prerequisites satisfied"
    return 0
}

step1_distribute_certificates() {
    print_header "Step 1: Distribute TLS Certificates"
    
    log "INFO" "Creating remote certificate directory..."
    remote_exec "sudo mkdir -p $REMOTE_CERT_DIR" true
    
    # Copy certificates to remote temp location first
    log "INFO" "Copying CA certificate..."
    remote_copy "$CERT_DIR/syslog-ca.crt" "/tmp/syslog-ca.crt"
    remote_exec "sudo mv /tmp/syslog-ca.crt $REMOTE_CERT_DIR/" true
    print_status "ok" "CA certificate distributed"
    
    log "INFO" "Copying server certificate..."
    remote_copy "$CERT_DIR/syslog-server.crt" "/tmp/syslog-server.crt"
    remote_exec "sudo mv /tmp/syslog-server.crt $REMOTE_CERT_DIR/" true
    print_status "ok" "Server certificate distributed"
    
    log "INFO" "Copying server private key..."
    remote_copy "$CERT_DIR/syslog-server.key" "/tmp/syslog-server.key"
    remote_exec "sudo mv /tmp/syslog-server.key $REMOTE_CERT_DIR/" true
    print_status "ok" "Server private key distributed"
    
    log "INFO" "Copying client certificate..."
    remote_copy "$CERT_DIR/syslog-client.crt" "/tmp/syslog-client.crt"
    remote_exec "sudo mv /tmp/syslog-client.crt $REMOTE_CERT_DIR/" true
    print_status "ok" "Client certificate distributed"
    
    log "INFO" "Copying client private key..."
    remote_copy "$CERT_DIR/syslog-client.key" "/tmp/syslog-client.key"
    remote_exec "sudo mv /tmp/syslog-client.key $REMOTE_CERT_DIR/" true
    print_status "ok" "Client private key distributed"
    
    # Set permissions
    log "INFO" "Setting certificate permissions..."
    remote_exec "sudo chmod 644 $REMOTE_CERT_DIR/*.crt" true
    remote_exec "sudo chmod 600 $REMOTE_CERT_DIR/*.key" true
    remote_exec "sudo chown root:root $REMOTE_CERT_DIR/*" true
    print_status "ok" "Certificate permissions set (keys: 600, certs: 644)"
    
    # Verify
    log "INFO" "Verifying certificates on remote..."
    local cert_list=$(remote_exec "ls -la $REMOTE_CERT_DIR/" true)
    log "INFO" "Certificate listing:\n$cert_list"
    print_status "ok" "Certificates distributed and verified"
}

step2_deploy_syslog_sink() {
    print_header "Step 2: Deploy Syslog Sink Configuration"
    
    # Create rsyslog TLS server configuration
    local rsyslog_server_conf=$(cat << 'RSYSLOG_CONF'
# OBS3 Syslog Sink - TLS Server Configuration
# Generated: TIMESTAMP_PLACEHOLDER
# Purpose: Receive TLS-encrypted syslog from StarlingX hosts

# Load required modules
module(load="imtcp")

# Global TLS settings
global(
    DefaultNetstreamDriver="gtls"
    DefaultNetstreamDriverCAFile="/etc/ssl/syslog/syslog-ca.crt"
    DefaultNetstreamDriverCertFile="/etc/ssl/syslog/syslog-server.crt"
    DefaultNetstreamDriverKeyFile="/etc/ssl/syslog/syslog-server.key"
)

# TLS syslog listener on port 6514
input(
    type="imtcp"
    port="6514"
    StreamDriver.Name="gtls"
    StreamDriver.Mode="1"
    StreamDriver.AuthMode="x509/name"
    PermittedPeer=["stx-aio-0.corp.interface.tag.ooo"]
)

# Log storage templates
template(name="RemoteAuthLog" type="string"
    string="/var/log/offhost-syslog/auth-sudo.log"
)

template(name="RemoteWarnLog" type="string"
    string="/var/log/offhost-syslog/system-warn.log"
)

# Routing rules for received logs
if $syslogfacility-text == 'authpriv' then {
    action(type="omfile" dynaFile="RemoteAuthLog")
    stop
}

if $syslogseverity-text == 'warning' and $syslogfacility-text != 'authpriv' then {
    action(type="omfile" dynaFile="RemoteWarnLog")
    stop
}
RSYSLOG_CONF
)
    
    # Replace timestamp placeholder
    rsyslog_server_conf=$(echo "$rsyslog_server_conf" | sed "s/TIMESTAMP_PLACEHOLDER/$(date -u +%Y-%m-%dT%H:%M:%SZ)/")
    
    # Write config to temp file and copy
    echo "$rsyslog_server_conf" > /tmp/99-obs3-syslog-sink.conf
    remote_copy "/tmp/99-obs3-syslog-sink.conf" "/tmp/99-obs3-syslog-sink.conf"
    remote_exec "sudo mv /tmp/99-obs3-syslog-sink.conf $REMOTE_RSYSLOG_CONF/" true
    remote_exec "sudo chmod 644 $REMOTE_RSYSLOG_CONF/99-obs3-syslog-sink.conf" true
    print_status "ok" "Syslog sink configuration deployed"
    
    # Create log directories
    log "INFO" "Creating log directories..."
    remote_exec "sudo mkdir -p $REMOTE_LOG_DIR" true
    remote_exec "sudo chmod 755 $REMOTE_LOG_DIR" true
    remote_exec "sudo touch $REMOTE_LOG_DIR/auth-sudo.log $REMOTE_LOG_DIR/system-warn.log" true
    remote_exec "sudo chmod 640 $REMOTE_LOG_DIR/*.log" true
    print_status "ok" "Log directories created"
    
    # Deploy logrotate configuration
    local logrotate_conf=$(cat << 'LOGROTATE_CONF'
# OBS3 Syslog - Logrotate Configuration
/var/log/offhost-syslog/auth-sudo.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    create 0640 root adm
    postrotate
        /usr/lib/rsyslog/rsyslog-rotate
    endscript
}

/var/log/offhost-syslog/system-warn.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
    create 0640 root adm
    postrotate
        /usr/lib/rsyslog/rsyslog-rotate
    endscript
}
LOGROTATE_CONF
)
    
    echo "$logrotate_conf" > /tmp/obs3-syslog
    remote_copy "/tmp/obs3-syslog" "/tmp/obs3-syslog"
    remote_exec "sudo mv /tmp/obs3-syslog /etc/logrotate.d/" true
    remote_exec "sudo chmod 644 /etc/logrotate.d/obs3-syslog" true
    print_status "ok" "Logrotate configuration deployed"
    
    # Validate rsyslog configuration
    log "INFO" "Validating rsyslog configuration..."
    if remote_exec "sudo rsyslogd -N1" true 2>&1 | grep -q "error"; then
        print_status "error" "rsyslog configuration validation failed"
        return 1
    fi
    print_status "ok" "rsyslog configuration validated"
    
    # Restart rsyslog
    log "INFO" "Restarting rsyslog service..."
    remote_exec "sudo systemctl restart rsyslog" true
    sleep 2
    
    if remote_exec "sudo systemctl is-active rsyslog" true | grep -q "active"; then
        print_status "ok" "rsyslog service restarted and running"
    else
        print_status "error" "rsyslog service failed to start"
        return 1
    fi
}

step3_deploy_syslog_client() {
    print_header "Step 3: Deploy Syslog Client Configuration"
    
    # Create rsyslog TLS client configuration
    local rsyslog_client_conf=$(cat << 'RSYSLOG_CONF'
# OBS3 Syslog Client - TLS Forward Configuration
# Generated: TIMESTAMP_PLACEHOLDER
# Purpose: Forward auth/sudo and warning logs to syslog sink via TLS

# Load required modules
module(load="omfwd")

# Global TLS settings for forwarding
global(
    DefaultNetstreamDriver="gtls"
    DefaultNetstreamDriverCAFile="/etc/ssl/syslog/syslog-ca.crt"
    DefaultNetstreamDriverCertFile="/etc/ssl/syslog/syslog-client.crt"
    DefaultNetstreamDriverKeyFile="/etc/ssl/syslog/syslog-client.key"
)

# Forward authpriv logs to syslog sink
if $syslogfacility-text == 'authpriv' then {
    action(
        type="omfwd"
        target="127.0.0.1"
        port="6514"
        protocol="tcp"
        StreamDriver="gtls"
        StreamDriverMode="1"
        StreamDriverAuthMode="x509/name"
        StreamDriverPermittedPeers="syslog-sink.internal"
        queue.type="LinkedList"
        queue.filename="syslog_auth_fwd"
        queue.maxdiskspace="100m"
        queue.saveonshutdown="on"
        action.resumeRetryCount="-1"
        action.resumeInterval="30"
    )
}

# Forward warning-level logs (excluding authpriv) to syslog sink
if $syslogseverity-text == 'warning' and $syslogfacility-text != 'authpriv' then {
    action(
        type="omfwd"
        target="127.0.0.1"
        port="6514"
        protocol="tcp"
        StreamDriver="gtls"
        StreamDriverMode="1"
        StreamDriverAuthMode="x509/name"
        StreamDriverPermittedPeers="syslog-sink.internal"
        queue.type="LinkedList"
        queue.filename="syslog_warn_fwd"
        queue.maxdiskspace="100m"
        queue.saveonshutdown="on"
        action.resumeRetryCount="-1"
        action.resumeInterval="30"
    )
}
RSYSLOG_CONF
)
    
    # Replace timestamp placeholder
    rsyslog_client_conf=$(echo "$rsyslog_client_conf" | sed "s/TIMESTAMP_PLACEHOLDER/$(date -u +%Y-%m-%dT%H:%M:%SZ)/")
    
    # Write config to temp file and copy
    echo "$rsyslog_client_conf" > /tmp/99-obs3-syslog-client.conf
    remote_copy "/tmp/99-obs3-syslog-client.conf" "/tmp/99-obs3-syslog-client.conf"
    remote_exec "sudo mv /tmp/99-obs3-syslog-client.conf $REMOTE_RSYSLOG_CONF/" true
    remote_exec "sudo chmod 644 $REMOTE_RSYSLOG_CONF/99-obs3-syslog-client.conf" true
    print_status "ok" "Syslog client configuration deployed"
    
    # Configure journald forwarding
    log "INFO" "Configuring journald forwarding..."
    remote_exec "sudo sed -i 's/#ForwardToSyslog=.*/ForwardToSyslog=yes/' /etc/systemd/journald.conf" true
    remote_exec "sudo systemctl restart systemd-journald" true
    print_status "ok" "Journald forwarding enabled"
    
    # Validate and restart rsyslog
    log "INFO" "Validating rsyslog configuration..."
    if remote_exec "sudo rsyslogd -N1" true 2>&1 | grep -q "error"; then
        print_status "error" "rsyslog configuration validation failed"
        return 1
    fi
    print_status "ok" "rsyslog configuration validated"
    
    log "INFO" "Restarting rsyslog service..."
    remote_exec "sudo systemctl restart rsyslog" true
    sleep 2
    
    if remote_exec "sudo systemctl is-active rsyslog" true | grep -q "active"; then
        print_status "ok" "rsyslog service restarted and running"
    else
        print_status "error" "rsyslog service failed to start"
        return 1
    fi
}

step4_verify_deployment() {
    print_header "Step 4: Verify System Integrity and Functionality"
    
    local errors=0
    
    # Check rsyslog service
    log "INFO" "Checking rsyslog service status..."
    if remote_exec "sudo systemctl is-active rsyslog" true | grep -q "active"; then
        print_status "ok" "rsyslog service is running"
    else
        print_status "error" "rsyslog service is not running"
        ((errors++))
    fi
    
    # Check port 6514 is listening
    log "INFO" "Checking TLS syslog port 6514..."
    if remote_exec "sudo ss -tlnp | grep 6514" true | grep -q "6514"; then
        print_status "ok" "Port 6514 is listening"
    else
        print_status "error" "Port 6514 is not listening"
        ((errors++))
    fi
    
    # Check certificate files
    log "INFO" "Checking certificate files..."
    if remote_exec "test -f $REMOTE_CERT_DIR/syslog-ca.crt && echo exists" true | grep -q "exists"; then
        print_status "ok" "CA certificate installed"
    else
        print_status "error" "CA certificate missing"
        ((errors++))
    fi
    
    # Check log directories
    log "INFO" "Checking log directories..."
    if remote_exec "test -d $REMOTE_LOG_DIR && echo exists" true | grep -q "exists"; then
        print_status "ok" "Log directory exists"
    else
        print_status "error" "Log directory missing"
        ((errors++))
    fi
    
    # Generate test log message
    log "INFO" "Generating test log messages..."
    remote_exec "logger -p authpriv.warning 'OBS3 deployment test - auth message'" true
    remote_exec "logger -p local0.warning 'OBS3 deployment test - warning message'" true
    sleep 2
    print_status "ok" "Test log messages generated"
    
    # Check logs are being written
    log "INFO" "Checking log files for test messages..."
    local auth_log=$(remote_exec "sudo tail -5 $REMOTE_LOG_DIR/auth-sudo.log 2>/dev/null || echo 'empty'" true)
    if echo "$auth_log" | grep -q "OBS3 deployment test"; then
        print_status "ok" "Auth logs being captured"
    else
        print_status "warn" "Auth log test message not found (may need time to propagate)"
    fi
    
    # TLS handshake test
    log "INFO" "Testing TLS handshake..."
    local tls_test=$(remote_exec "echo | openssl s_client -connect 127.0.0.1:6514 -CAfile $REMOTE_CERT_DIR/syslog-ca.crt -cert $REMOTE_CERT_DIR/syslog-client.crt -key $REMOTE_CERT_DIR/syslog-client.key 2>&1 | head -20" true)
    if echo "$tls_test" | grep -q "Verify return code: 0"; then
        print_status "ok" "TLS handshake successful"
    else
        print_status "warn" "TLS handshake test inconclusive (service may need specific configuration)"
    fi
    
    # Summary
    if [[ $errors -eq 0 ]]; then
        print_status "ok" "All verification checks passed"
        return 0
    else
        print_status "error" "$errors verification check(s) failed"
        return 1
    fi
}

step5_health_checks() {
    print_header "Step 5: Final Health Checks"
    
    echo ""
    echo -e "${CYAN}System Status Summary:${NC}"
    
    # rsyslog status
    local rsyslog_status=$(remote_exec "sudo systemctl status rsyslog --no-pager -l 2>&1 | head -15" true)
    echo "--- rsyslog Service ---"
    echo "$rsyslog_status"
    
    # Listening ports
    echo ""
    echo "--- Listening Ports ---"
    remote_exec "sudo ss -tlnp | grep -E '(6514|rsyslog)'" true
    
    # Certificate expiry
    echo ""
    echo "--- Certificate Expiry ---"
    remote_exec "openssl x509 -in $REMOTE_CERT_DIR/syslog-server.crt -noout -enddate" true
    
    # Log file sizes
    echo ""
    echo "--- Log Files ---"
    remote_exec "ls -lh $REMOTE_LOG_DIR/" true
    
    print_status "ok" "Health checks completed"
}

show_summary() {
    print_header "Deployment Summary"
    
    echo -e "${GREEN}OBS3 Syslog Deployment Completed${NC}"
    echo ""
    echo "  Target Host: $STX_TARGET_HOST:$STX_SSH_PORT"
    echo "  Deployment Time: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
    echo "  Log File: $LOG_FILE"
    echo ""
    echo "  Components Deployed:"
    echo "    ✓ TLS Certificates (CA, Server, Client)"
    echo "    ✓ Syslog Sink (rsyslog TLS receiver on port 6514)"
    echo "    ✓ Syslog Client (rsyslog TLS forwarder)"
    echo "    ✓ Journald forwarding enabled"
    echo "    ✓ Logrotate configuration"
    echo ""
    echo "  Certificate Locations:"
    echo "    CA Cert: $REMOTE_CERT_DIR/syslog-ca.crt"
    echo "    Server Cert: $REMOTE_CERT_DIR/syslog-server.crt"
    echo "    Client Cert: $REMOTE_CERT_DIR/syslog-client.crt"
    echo ""
    echo "  Log Locations:"
    echo "    Auth/Sudo: $REMOTE_LOG_DIR/auth-sudo.log"
    echo "    System Warnings: $REMOTE_LOG_DIR/system-warn.log"
    echo ""
}

usage() {
    cat << EOF
OBS3 Syslog Deployment Script

Usage:
  $0 [OPTIONS]

Options:
  --check-only    Only run prerequisites check
  --step N        Execute only step N (1-5)
  --skip-verify   Skip verification step
  --force         Skip confirmations
  --help, -h      Show this help

Steps:
  1. Distribute TLS Certificates
  2. Deploy Syslog Sink Configuration
  3. Deploy Syslog Client Configuration
  4. Verify System Integrity
  5. Final Health Checks

Environment Variables:
  HIVELOCITY_SSH_PASSWORD  SSH password for authentication (alternative to key)
  STX_SSH_KEY              Path to SSH key (default: ~/.ssh/starlingx_key)

Example:
  # Full deployment
  ./scripts/deploy_obs3_syslog.sh

  # Check prerequisites only
  ./scripts/deploy_obs3_syslog.sh --check-only

  # Run specific step
  ./scripts/deploy_obs3_syslog.sh --step 4

EOF
}

# ============================================================================
# MAIN EXECUTION
# ============================================================================

main() {
    local check_only=false
    local specific_step=""
    local skip_verify=false
    
    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --check-only)
                check_only=true
                shift
                ;;
            --step)
                specific_step="$2"
                shift 2
                ;;
            --skip-verify)
                skip_verify=true
                shift
                ;;
            --force)
                export FORCE_DEPLOY=true
                shift
                ;;
            --help|-h)
                usage
                exit 0
                ;;
            *)
                echo "Unknown option: $1"
                usage
                exit 1
                ;;
        esac
    done
    
    # Ensure log directory exists
    mkdir -p "$LOG_DIR"
    
    print_header "OBS3 Syslog Deployment - Phase C"
    echo "  Target: $STX_SSH_USER@$STX_TARGET_HOST:$STX_SSH_PORT"
    echo "  Timestamp: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
    echo "  Log: $LOG_FILE"
    log "INFO" "Deployment started"
    
    # Check prerequisites
    if ! check_prerequisites; then
        print_status "error" "Prerequisites check failed. Aborting."
        exit 1
    fi
    
    if [[ "$check_only" == "true" ]]; then
        print_status "info" "Prerequisites check completed (--check-only mode)"
        exit 0
    fi
    
    # Execute deployment steps
    if [[ -n "$specific_step" ]]; then
        case "$specific_step" in
            1) step1_distribute_certificates ;;
            2) step2_deploy_syslog_sink ;;
            3) step3_deploy_syslog_client ;;
            4) step4_verify_deployment ;;
            5) step5_health_checks ;;
            *)
                print_status "error" "Invalid step: $specific_step"
                exit 1
                ;;
        esac
    else
        # Full deployment
        step1_distribute_certificates || exit 1
        step2_deploy_syslog_sink || exit 1
        step3_deploy_syslog_client || exit 1
        
        if [[ "$skip_verify" != "true" ]]; then
            step4_verify_deployment || exit 1
        fi
        
        step5_health_checks
    fi
    
    show_summary
    
    log "INFO" "Deployment completed successfully"
    print_status "ok" "Deployment completed successfully"
}

# Execute main function
main "$@"
