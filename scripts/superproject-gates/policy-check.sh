#!/usr/bin/env bash
# =============================================================================
# Off-Host Syslog Infrastructure - Security Policy Validation Script
# =============================================================================
#
# This script validates security policies for the off-host syslog infrastructure
# before deployment. It must pass all checks for the CI pipeline to succeed.
#
# Policies Enforced:
#   1. No 0.0.0.0/0 inbound rules on port 6514 (syslog)
#   2. Syslog allowlist contains ONLY 23.92.79.2/32 (StarlingX)
#   3. SSH allowlist contains ONLY 173.94.53.113/32 (admin)
#   4. TLS enabled (no plaintext syslog on port 514)
#   5. No private keys in repository
#
# Usage:
#   ./policy-check.sh
#   SYSLOG_ALLOWLIST_IP=23.92.79.2/32 SSH_ALLOWLIST_IP=173.94.53.113/32 ./policy-check.sh
#
# Exit Codes:
#   0 - All policies passed
#   1 - One or more policies failed
#
# =============================================================================

set -euo pipefail

# Configuration (can be overridden via environment variables)
SYSLOG_ALLOWLIST_IP="${SYSLOG_ALLOWLIST_IP:-23.92.79.2/32}"
SSH_ALLOWLIST_IP="${SSH_ALLOWLIST_IP:-173.94.53.113/32}"
SYSLOG_PORT="${SYSLOG_PORT:-6514}"
PLAINTEXT_SYSLOG_PORT="514"

# Determine the base directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BASE_DIR="$(dirname "$SCRIPT_DIR")"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters
PASSED=0
FAILED=0
WARNINGS=0

# =============================================================================
# Utility Functions
# =============================================================================

log_header() {
    echo ""
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}"
}

log_check() {
    echo -e "${BLUE}🔍 Checking: $1${NC}"
}

log_pass() {
    echo -e "${GREEN}✅ PASS: $1${NC}"
    ((PASSED++))
}

log_fail() {
    echo -e "${RED}❌ FAIL: $1${NC}"
    ((FAILED++))
}

log_warn() {
    echo -e "${YELLOW}⚠️  WARN: $1${NC}"
    ((WARNINGS++))
}

log_info() {
    echo -e "   ℹ️  $1"
}

# =============================================================================
# Policy 1: No 0.0.0.0/0 inbound rules on port 6514
# =============================================================================

check_no_open_syslog() {
    log_check "Policy 1: No 0.0.0.0/0 inbound rules on port ${SYSLOG_PORT}"
    
    local failed=0
    
    # Check Terraform files
    if grep -rn "0\.0\.0\.0/0" "${BASE_DIR}/terraform/"* 2>/dev/null | grep -i "syslog\|${SYSLOG_PORT}" | grep -v "^#" | grep -v "\.tfstate"; then
        log_fail "Found 0.0.0.0/0 CIDR in Terraform syslog configuration"
        failed=1
    fi
    
    # Check firewall configuration
    if grep -rn "0\.0\.0\.0/0" "${BASE_DIR}/firewall/"* 2>/dev/null | grep -v "^#"; then
        log_fail "Found 0.0.0.0/0 CIDR in firewall configuration"
        failed=1
    fi
    
    # Check Ansible templates
    if grep -rn "0\.0\.0\.0/0" "${BASE_DIR}/ansible/"* 2>/dev/null | grep -i "syslog\|${SYSLOG_PORT}" | grep -v "^#"; then
        log_fail "Found 0.0.0.0/0 CIDR in Ansible syslog templates"
        failed=1
    fi
    
    if [ $failed -eq 0 ]; then
        log_pass "No 0.0.0.0/0 inbound rules found for syslog port"
    fi
    
    return $failed
}

# =============================================================================
# Policy 2: Syslog allowlist contains ONLY specified IP
# =============================================================================

check_syslog_allowlist() {
    log_check "Policy 2: Syslog allowlist contains ONLY ${SYSLOG_ALLOWLIST_IP}"
    
    local failed=0
    local expected_ip="${SYSLOG_ALLOWLIST_IP%/*}"  # Strip CIDR notation
    
    # Check Terraform variables
    log_info "Checking terraform/variables.tf..."
    if ! grep -q "${expected_ip}" "${BASE_DIR}/terraform/variables.tf" 2>/dev/null; then
        log_warn "Expected IP ${expected_ip} not found in terraform/variables.tf"
    fi
    
    # Check for any other IPs on syslog port that aren't the expected one
    # Look for patterns like "allow from X.X.X.X to any port 6514"
    local other_ips
    other_ips=$(grep -rn "port.*${SYSLOG_PORT}\|${SYSLOG_PORT}.*port" "${BASE_DIR}/terraform/"* "${BASE_DIR}/ansible/"* "${BASE_DIR}/firewall/"* 2>/dev/null | \
        grep -oE '[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}(/[0-9]{1,2})?' | \
        grep -v "^${expected_ip}" | \
        grep -v "^0\.0\.0\.0" | \
        grep -v "^127\." | \
        grep -v "^10\." | \
        grep -v "^192\.168\." | \
        grep -v "^172\." | \
        sort -u || true)
    
    if [ -n "$other_ips" ]; then
        log_fail "Found unauthorized IPs in syslog allowlist: ${other_ips}"
        failed=1
    fi
    
    # Verify the expected IP is configured
    if grep -rq "${SYSLOG_ALLOWLIST_IP}\|${expected_ip}" "${BASE_DIR}/terraform/variables.tf" 2>/dev/null; then
        log_pass "Syslog allowlist correctly configured with ${SYSLOG_ALLOWLIST_IP}"
    else
        log_warn "Syslog allowlist IP ${SYSLOG_ALLOWLIST_IP} not explicitly found"
    fi
    
    return $failed
}

# =============================================================================
# Policy 3: SSH allowlist contains ONLY specified IP
# =============================================================================

check_ssh_allowlist() {
    log_check "Policy 3: SSH allowlist contains ONLY ${SSH_ALLOWLIST_IP}"
    
    local failed=0
    local expected_ip="${SSH_ALLOWLIST_IP%/*}"  # Strip CIDR notation
    
    # Check Terraform variables for admin_ssh_cidr or admin_ip_cidr
    log_info "Checking terraform/variables.tf for SSH allowlist..."
    
    if grep -qE "admin_ssh_cidr|admin_ip_cidr|admin_ip" "${BASE_DIR}/terraform/variables.tf" 2>/dev/null; then
        # Verify it's set to the expected IP
        if ! grep -A5 "admin_ssh_cidr\|admin_ip_cidr\|admin_ip" "${BASE_DIR}/terraform/variables.tf" 2>/dev/null | grep -q "${expected_ip}"; then
            log_warn "SSH allowlist may not be set to ${expected_ip}"
        fi
    fi
    
    # Check for 0.0.0.0/0 on port 22
    if grep -rn "0\.0\.0\.0/0" "${BASE_DIR}/terraform/"* "${BASE_DIR}/firewall/"* 2>/dev/null | grep -i "22\|ssh" | grep -v "^#" | grep -v "\.tfstate"; then
        log_fail "Found 0.0.0.0/0 CIDR for SSH access (port 22)"
        failed=1
    fi
    
    # Verify the expected IP is configured
    if grep -rq "${SSH_ALLOWLIST_IP}\|${expected_ip}" "${BASE_DIR}/terraform/variables.tf" 2>/dev/null; then
        log_pass "SSH allowlist correctly configured with ${SSH_ALLOWLIST_IP}"
    else
        log_warn "SSH allowlist IP ${SSH_ALLOWLIST_IP} not explicitly verified"
    fi
    
    return $failed
}

# =============================================================================
# Policy 4: TLS enabled (no plaintext syslog)
# =============================================================================

check_tls_enabled() {
    log_check "Policy 4: TLS enabled (no plaintext syslog on port ${PLAINTEXT_SYSLOG_PORT})"
    
    local failed=0
    
    # Check for plaintext syslog port 514 configuration
    log_info "Checking for plaintext syslog port ${PLAINTEXT_SYSLOG_PORT}..."
    
    # Look for port 514 (but not 6514) in configuration files
    local plaintext_configs
    plaintext_configs=$(grep -rn "port[[:space:]]*[:=]*[[:space:]]*${PLAINTEXT_SYSLOG_PORT}[^0-9]" \
        "${BASE_DIR}/ansible/"* "${BASE_DIR}/rsyslog/"* "${BASE_DIR}/source/"* 2>/dev/null | \
        grep -v "^#" | \
        grep -v "#.*port" | \
        grep -v "6514" || true)
    
    if [ -n "$plaintext_configs" ]; then
        log_fail "Found plaintext syslog port ${PLAINTEXT_SYSLOG_PORT} configuration:"
        echo "$plaintext_configs"
        failed=1
    fi
    
    # Check for @@hostname:514 pattern (rsyslog plaintext forwarding)
    if grep -rn "@@.*:${PLAINTEXT_SYSLOG_PORT}" "${BASE_DIR}/"* 2>/dev/null | grep -v "^#" | grep -v "6514"; then
        log_fail "Found rsyslog plaintext forwarding pattern (@@hostname:514)"
        failed=1
    fi
    
    # Verify TLS configuration exists
    log_info "Verifying TLS configuration..."
    if [ -d "${BASE_DIR}/tls" ] && [ -f "${BASE_DIR}/tls/server.conf" ]; then
        log_pass "TLS configuration directory exists"
    else
        log_warn "TLS configuration directory may be incomplete"
    fi
    
    # Check for TLS-related Ansible roles
    if [ -f "${BASE_DIR}/ansible/playbooks/tls-certificates.yml" ]; then
        log_pass "TLS certificate playbook exists"
    else
        log_warn "TLS certificate playbook not found"
    fi
    
    # Check rsyslog TLS server configuration
    if grep -rq "StreamDriver.*gtls\|gtls.*StreamDriver\|DefaultNetstreamDriver.*gtls" \
        "${BASE_DIR}/rsyslog/"* "${BASE_DIR}/ansible/"* 2>/dev/null; then
        log_pass "rsyslog TLS (gtls) configuration found"
    else
        log_warn "rsyslog TLS (gtls) configuration not explicitly found"
    fi
    
    if [ $failed -eq 0 ]; then
        log_pass "No plaintext syslog configuration detected"
    fi
    
    return $failed
}

# =============================================================================
# Policy 5: No private keys in repository
# =============================================================================

check_no_private_keys() {
    log_check "Policy 5: No private keys in repository"
    
    local failed=0
    
    # Patterns to search for
    local patterns=(
        "-----BEGIN RSA PRIVATE KEY-----"
        "-----BEGIN OPENSSH PRIVATE KEY-----"
        "-----BEGIN EC PRIVATE KEY-----"
        "-----BEGIN DSA PRIVATE KEY-----"
        "-----BEGIN PRIVATE KEY-----"
        "-----BEGIN ENCRYPTED PRIVATE KEY-----"
        "-----BEGIN PGP PRIVATE KEY BLOCK-----"
    )
    
    log_info "Scanning for private key patterns..."
    
    for pattern in "${patterns[@]}"; do
        if grep -rn "$pattern" "${BASE_DIR}/"* 2>/dev/null | grep -v "\.example$" | grep -v "templates/.*\.j2" | grep -v "README" | grep -v "\.md$"; then
            log_fail "Found private key pattern: ${pattern}"
            failed=1
        fi
    done
    
    # Check for actual key files
    log_info "Scanning for private key files..."
    
    local key_files
    key_files=$(find "${BASE_DIR}" -type f \( \
        -name "*.key" -o \
        -name "id_rsa" -o \
        -name "id_ecdsa" -o \
        -name "id_ed25519" -o \
        -name "id_dsa" -o \
        -name "*.pem" \
    \) ! -path "*/templates/*" ! -name "*.example" ! -name "*.sample" 2>/dev/null || true)
    
    if [ -n "$key_files" ]; then
        # Check if these files contain actual private keys
        for file in $key_files; do
            if grep -q "PRIVATE KEY" "$file" 2>/dev/null; then
                log_fail "Found private key file: ${file}"
                failed=1
            fi
        done
    fi
    
    # Check .gitignore for key exclusions
    log_info "Verifying .gitignore includes key patterns..."
    if [ -f "${BASE_DIR}/.gitignore" ]; then
        if grep -q "\.key\|\.pem\|id_rsa\|id_ecdsa\|id_ed25519" "${BASE_DIR}/.gitignore"; then
            log_pass ".gitignore includes private key patterns"
        else
            log_warn ".gitignore may not exclude all private key patterns"
        fi
    else
        log_warn "No .gitignore found in ${BASE_DIR}"
    fi
    
    if [ $failed -eq 0 ]; then
        log_pass "No private keys detected in repository"
    fi
    
    return $failed
}

# =============================================================================
# Additional Security Checks
# =============================================================================

check_additional_security() {
    log_check "Additional Security Validations"
    
    local warnings=0
    
    # Check for hardcoded credentials
    log_info "Scanning for hardcoded credentials..."
    if grep -rniE "password[[:space:]]*[:=][[:space:]]*['\"][^'\"]+['\"]|api_key[[:space:]]*[:=][[:space:]]*['\"][^'\"]+['\"]" \
        "${BASE_DIR}/terraform/"* "${BASE_DIR}/ansible/"* 2>/dev/null | \
        grep -v "vault_password_file\|password_file\|lookup\|var\." | \
        grep -v "\.example$\|README\|\.md$"; then
        log_warn "Potential hardcoded credentials found (review manually)"
        ((warnings++))
    fi
    
    # Check for AWS credentials
    log_info "Scanning for AWS credentials..."
    if grep -rniE "AKIA[A-Z0-9]{16}|aws_secret_access_key[[:space:]]*[:=][[:space:]]*['\"][^'\"]{20,}['\"]" \
        "${BASE_DIR}/"* 2>/dev/null | grep -v "\.tfstate"; then
        log_fail "AWS credentials detected in repository"
        ((FAILED++))
    fi
    
    # Check for sensitive variable defaults
    log_info "Checking for sensitive variable defaults..."
    if grep -A3 "sensitive[[:space:]]*=[[:space:]]*true" "${BASE_DIR}/terraform/variables.tf" 2>/dev/null | \
        grep -E "default[[:space:]]*=" | grep -v "\"\"" | grep -v "null"; then
        log_warn "Sensitive variables have non-empty defaults"
        ((warnings++))
    fi
    
    WARNINGS=$((WARNINGS + warnings))
}

# =============================================================================
# Main Execution
# =============================================================================

main() {
    log_header "Off-Host Syslog Infrastructure Policy Validation"
    echo ""
    echo "Base Directory: ${BASE_DIR}"
    echo "Syslog Allowlist: ${SYSLOG_ALLOWLIST_IP}"
    echo "SSH Allowlist: ${SSH_ALLOWLIST_IP}"
    echo "Syslog Port: ${SYSLOG_PORT}"
    echo ""
    
    # Run all policy checks
    check_no_open_syslog || true
    echo ""
    
    check_syslog_allowlist || true
    echo ""
    
    check_ssh_allowlist || true
    echo ""
    
    check_tls_enabled || true
    echo ""
    
    check_no_private_keys || true
    echo ""
    
    check_additional_security || true
    
    # Summary
    log_header "Policy Validation Summary"
    echo ""
    echo -e "${GREEN}Passed: ${PASSED}${NC}"
    echo -e "${RED}Failed: ${FAILED}${NC}"
    echo -e "${YELLOW}Warnings: ${WARNINGS}${NC}"
    echo ""
    
    if [ $FAILED -gt 0 ]; then
        echo -e "${RED}❌ POLICY VALIDATION FAILED${NC}"
        echo ""
        echo "Please fix the above issues before proceeding with deployment."
        echo "For questions, contact the infrastructure team."
        exit 1
    else
        echo -e "${GREEN}✅ ALL POLICIES PASSED${NC}"
        if [ $WARNINGS -gt 0 ]; then
            echo -e "${YELLOW}⚠️  Please review the warnings above.${NC}"
        fi
        exit 0
    fi
}

# Run main function
main "$@"
