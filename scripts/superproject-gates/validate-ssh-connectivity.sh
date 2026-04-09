#!/bin/bash

################################################################################
# OBS-3 SSH Connectivity Validation Script
#
# Purpose: Automated SSH connectivity validation for OBS-3 deployment
# Usage: ./scripts/monitoring/validate-ssh-connectivity.sh
#         SSH_AUTH_MODE=password HIVELOCITY_SSH_PASSWORD=your_password ./scripts/monitoring/validate-ssh-connectivity.sh
# Exit Codes:
#   0 - All tests passed
#   1 - One or more tests failed
#
# Author: DevOps Team
# Created: 2026-01-02
# Version: 1.1.0 - Added password authentication support
################################################################################

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_DIR="${SCRIPT_DIR}/../../logs"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
LOG_FILE="${LOG_DIR}/ssh-validation-${TIMESTAMP}.log"
SUMMARY_FILE="${LOG_DIR}/ssh-validation-summary-${TIMESTAMP}.txt"

# Host configurations
SYSLOG_SINK_IP="23.92.79.2"
SYSLOG_SINK_PORT="2222"
SYSLOG_SINK_USER="ubuntu"
SYSLOG_SINK_KEY="${HOME}/.ssh/syslog-sink-keypair.pem"
SYSLOG_SINK_PASSWORD="${HIVELOCITY_SSH_PASSWORD:-}"

SYSLOG_CLIENT_IP="23.92.79.2"
SYSLOG_CLIENT_PORT="2222"
SYSLOG_CLIENT_USER="ubuntu"
SYSLOG_CLIENT_KEY="${HOME}/pem/stx-aio-0.pem"
SYSLOG_CLIENT_PASSWORD="${HIVELOCITY_SSH_PASSWORD:-}"

# Authentication mode: 'key' or 'password'
AUTH_MODE="${SSH_AUTH_MODE:-key}"

# Test counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

################################################################################
# Logging Functions
################################################################################

log() {
    local level=$1
    shift
    local message="$@"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[${timestamp}] [${level}] ${message}" | tee -a "${LOG_FILE}"
}

log_info() {
    log "INFO" "$@"
}

log_success() {
    log "SUCCESS" "$@"
    echo -e "${GREEN}✓${NC} $@"
}

log_error() {
    log "ERROR" "$@"
    echo -e "${RED}✗${NC} $@"
}

log_warning() {
    log "WARNING" "$@"
    echo -e "${YELLOW}⚠${NC} $@"
}

log_test() {
    log "TEST" "$@"
    echo -e "${BLUE}▶${NC} $@"
}

################################################################################
# Test Functions
################################################################################

increment_test() {
    ((TOTAL_TESTS++))
}

record_pass() {
    ((PASSED_TESTS++))
    log_success "$1"
}

record_fail() {
    ((FAILED_TESTS++))
    log_error "$1"
}

################################################################################
# Validation Functions
################################################################################

validate_key_file() {
    local key_path=$1
    local key_name=$2
    
    log_test "Validating SSH key: ${key_name}"
    increment_test
    
    if [ ! -f "${key_path}" ]; then
        record_fail "SSH key not found: ${key_path}"
        return 1
    fi
    
    local key_perms=$(stat -f %Lp "${key_path}" 2>/dev/null || stat -c %a "${key_path}" 2>/dev/null)
    
    if [ "${key_perms}" != "600" ]; then
        record_fail "SSH key has incorrect permissions (${key_perms}): ${key_path} (expected 600)"
        return 1
    fi
    
    record_pass "SSH key valid: ${key_name}"
    return 0
}

test_ssh_connectivity() {
    local host_ip=$1
    local port=$2
    local user=$3
    local key_path=$4
    local password=$5
    local host_name=$6
    
    log_test "Testing SSH connectivity to ${host_name} (${host_ip}:${port}) using ${AUTH_MODE} authentication"
    increment_test
    
    local ssh_cmd=""
    
    if [ "${AUTH_MODE}" = "password" ]; then
        if [ -z "${password}" ]; then
            record_fail "SSH password not provided for ${host_name}"
            return 1
        fi
        ssh_cmd="sshpass -p '${password}' ssh -p ${port} -o StrictHostKeyChecking=no -o ConnectTimeout=10 ${user}@${host_ip}"
    else
        ssh_cmd="ssh -i ${key_path} -p ${port} -o StrictHostKeyChecking=no -o ConnectTimeout=10 -o IdentitiesOnly=yes -o BatchMode=yes ${user}@${host_ip}"
    fi
    
    if ${ssh_cmd} "echo 'SSH connection successful'" >> "${LOG_FILE}" 2>&1; then
        record_pass "SSH connectivity to ${host_name} successful"
        return 0
    else
        record_fail "SSH connectivity to ${host_name} failed"
        return 1
    fi
}

test_remote_command() {
    local host_ip=$1
    local port=$2
    local user=$3
    local key_path=$4
    local password=$5
    local host_name=$6
    local command=$7
    
    log_test "Testing remote command execution on ${host_name}: ${command}"
    increment_test
    
    local ssh_cmd=""
    
    if [ "${AUTH_MODE}" = "password" ]; then
        if [ -z "${password}" ]; then
            record_fail "SSH password not provided for ${host_name}"
            return 1
        fi
        ssh_cmd="sshpass -p '${password}' ssh -p ${port} -o StrictHostKeyChecking=no -o ConnectTimeout=10 ${user}@${host_ip}"
    else
        ssh_cmd="ssh -i ${key_path} -p ${port} -o StrictHostKeyChecking=no -o ConnectTimeout=10 -o IdentitiesOnly=yes ${user}@${host_ip}"
    fi
    
    if ${ssh_cmd} "${command}" >> "${LOG_FILE}" 2>&1; then
        record_pass "Remote command execution on ${host_name} successful"
        return 0
    else
        record_fail "Remote command execution on ${host_name} failed"
        return 1
    fi
}

test_scp_transfer() {
    local host_ip=$1
    local port=$2
    local user=$3
    local key_path=$4
    local password=$5
    local host_name=$6
    
    log_test "Testing SCP file transfer to ${host_name}"
    increment_test
    
    local test_file="/tmp/ssh-validation-test-${TIMESTAMP}.txt"
    echo "SSH validation test file - ${TIMESTAMP}" > "${test_file}"
    
    local scp_cmd=""
    local ssh_cmd=""
    
    if [ "${AUTH_MODE}" = "password" ]; then
        if [ -z "${password}" ]; then
            record_fail "SSH password not provided for ${host_name}"
            rm -f "${test_file}"
            return 1
        fi
        scp_cmd="sshpass -p '${password}' scp -P ${port} -o StrictHostKeyChecking=no -o ConnectTimeout=10 ${test_file} ${user}@${host_ip}:/tmp/"
        ssh_cmd="sshpass -p '${password}' ssh -p ${port} -o StrictHostKeyChecking=no -o ConnectTimeout=10 ${user}@${host_ip}"
    else
        scp_cmd="scp -i ${key_path} -P ${port} -o StrictHostKeyChecking=no -o ConnectTimeout=10 -o IdentitiesOnly=yes ${test_file} ${user}@${host_ip}:/tmp/"
        ssh_cmd="ssh -i ${key_path} -p ${port} -o StrictHostKeyChecking=no -o ConnectTimeout=10 -o IdentitiesOnly=yes ${user}@${host_ip}"
    fi
    
    if ${scp_cmd} >> "${LOG_FILE}" 2>&1; then
        record_pass "SCP file transfer to ${host_name} successful"
        
        # Clean up remote file
        ${ssh_cmd} "rm -f /tmp/ssh-validation-test-${TIMESTAMP}.txt" >> "${LOG_FILE}" 2>&1 || true
        
        # Clean up local file
        rm -f "${test_file}"
        
        return 0
    else
        record_fail "SCP file transfer to ${host_name} failed"
        rm -f "${test_file}"
        return 1
    fi
}

test_network_connectivity() {
    local host_ip=$1
    local port=$2
    local host_name=$3
    
    log_test "Testing network connectivity to ${host_name} (${host_ip}:${port})"
    increment_test
    
    if nc -zv -w 10 "${host_ip}" "${port}" >> "${LOG_FILE}" 2>&1; then
        record_pass "Network connectivity to ${host_name} successful"
        return 0
    else
        record_fail "Network connectivity to ${host_name} failed"
        return 1
    fi
}

test_ssh_version() {
    local host_ip=$1
    local port=$2
    local user=$3
    local key_path=$4
    local password=$5
    local host_name=$6
    
    log_test "Testing SSH version on ${host_name}"
    increment_test
    
    local ssh_cmd=""
    
    if [ "${AUTH_MODE}" = "password" ]; then
        if [ -z "${password}" ]; then
            record_fail "SSH password not provided for ${host_name}"
            return 1
        fi
        ssh_cmd="sshpass -p '${password}' ssh -p ${port} -o StrictHostKeyChecking=no -o ConnectTimeout=10 ${user}@${host_ip}"
    else
        ssh_cmd="ssh -i ${key_path} -p ${port} -o StrictHostKeyChecking=no -o ConnectTimeout=10 -o IdentitiesOnly=yes ${user}@${host_ip}"
    fi
    
    if ${ssh_cmd} "uname -a" >> "${LOG_FILE}" 2>&1; then
        record_pass "SSH version check on ${host_name} successful"
        return 0
    else
        record_fail "SSH version check on ${host_name} failed"
        return 1
    fi
}

test_user_permissions() {
    local host_ip=$1
    local port=$2
    local user=$3
    local key_path=$4
    local password=$5
    local host_name=$6
    
    log_test "Testing user permissions on ${host_name}"
    increment_test
    
    local ssh_cmd=""
    
    if [ "${AUTH_MODE}" = "password" ]; then
        if [ -z "${password}" ]; then
            record_fail "SSH password not provided for ${host_name}"
            return 1
        fi
        ssh_cmd="sshpass -p '${password}' ssh -p ${port} -o StrictHostKeyChecking=no -o ConnectTimeout=10 ${user}@${host_ip}"
    else
        ssh_cmd="ssh -i ${key_path} -p ${port} -o StrictHostKeyChecking=no -o ConnectTimeout=10 -o IdentitiesOnly=yes ${user}@${host_ip}"
    fi
    
    if ${ssh_cmd} "whoami && id" >> "${LOG_FILE}" 2>&1; then
        record_pass "User permissions check on ${host_name} successful"
        return 0
    else
        record_fail "User permissions check on ${host_name} failed"
        return 1
    fi
}

################################################################################
# Main Validation Logic
################################################################################

main() {
    # Create log directory if it doesn't exist
    mkdir -p "${LOG_DIR}"
    
    # Check for sshpass if using password authentication
    if [ "${AUTH_MODE}" = "password" ]; then
        if ! command -v sshpass &> /dev/null; then
            echo -e "${RED}Error: sshpass is required for password authentication but is not installed.${NC}"
            echo "Install with: brew install sshpass (macOS) or apt-get install sshpass (Ubuntu/Debian)"
            exit 1
        fi
    fi
    
    # Initialize log files
    echo "OBS-3 SSH Connectivity Validation Report" > "${LOG_FILE}"
    echo "========================================" >> "${LOG_FILE}"
    echo "" >> "${LOG_FILE}"
    echo "Validation Started: $(date)" >> "${LOG_FILE}"
    echo "Local System: $(uname -a)" >> "${LOG_FILE}"
    echo "Authentication Mode: ${AUTH_MODE}" >> "${LOG_FILE}"
    echo "" >> "${LOG_FILE}"
    
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}OBS-3 SSH Connectivity Validation${NC}"
    echo -e "${BLUE}========================================${NC}"
    echo ""
    echo "Validation Started: $(date)"
    echo "Local System: $(uname -a)"
    echo "Authentication Mode: ${AUTH_MODE}"
    echo ""
    echo "Log File: ${LOG_FILE}"
    echo ""
    
    # Test 1: Validate SSH key files (only if using key authentication)
    if [ "${AUTH_MODE}" = "key" ]; then
        echo -e "${BLUE}========================================${NC}"
        echo -e "${BLUE}Phase 1: SSH Key Validation${NC}"
        echo -e "${BLUE}========================================${NC}"
        echo ""
        
        validate_key_file "${SYSLOG_SINK_KEY}" "syslog-sink-keypair.pem"
        validate_key_file "${SYSLOG_CLIENT_KEY}" "stx-aio-0.pem"
        
        echo ""
    else
        echo -e "${YELLOW}========================================${NC}"
        echo -e "${YELLOW}Phase 1: SSH Key Validation (SKIPPED - using password auth)${NC}"
        echo -e "${YELLOW}========================================${NC}"
        echo ""
    fi
    
    # Test 2: Network connectivity
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}Phase 2: Network Connectivity${NC}"
    echo -e "${BLUE}========================================${NC}"
    echo ""
    
    test_network_connectivity "${SYSLOG_SINK_IP}" "${SYSLOG_SINK_PORT}" "syslog-sink"
    test_network_connectivity "${SYSLOG_CLIENT_IP}" "${SYSLOG_CLIENT_PORT}" "stx-aio-0"
    
    echo ""
    
    # Test 3: SSH connectivity to syslog-sink
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}Phase 3: SSH Connectivity - Syslog Sink${NC}"
    echo -e "${BLUE}========================================${NC}"
    echo ""
    
    test_ssh_connectivity "${SYSLOG_SINK_IP}" "${SYSLOG_SINK_PORT}" "${SYSLOG_SINK_USER}" "${SYSLOG_SINK_KEY}" "${SYSLOG_SINK_PASSWORD}" "syslog-sink"
    test_ssh_version "${SYSLOG_SINK_IP}" "${SYSLOG_SINK_PORT}" "${SYSLOG_SINK_USER}" "${SYSLOG_SINK_KEY}" "${SYSLOG_SINK_PASSWORD}" "syslog-sink"
    test_user_permissions "${SYSLOG_SINK_IP}" "${SYSLOG_SINK_PORT}" "${SYSLOG_SINK_USER}" "${SYSLOG_SINK_KEY}" "${SYSLOG_SINK_PASSWORD}" "syslog-sink"
    test_remote_command "${SYSLOG_SINK_IP}" "${SYSLOG_SINK_PORT}" "${SYSLOG_SINK_USER}" "${SYSLOG_SINK_KEY}" "${SYSLOG_SINK_PASSWORD}" "syslog-sink" "uname -a && whoami && pwd && uptime"
    test_scp_transfer "${SYSLOG_SINK_IP}" "${SYSLOG_SINK_PORT}" "${SYSLOG_SINK_USER}" "${SYSLOG_SINK_KEY}" "${SYSLOG_SINK_PASSWORD}" "syslog-sink"
    
    echo ""
    
    # Test 4: SSH connectivity to stx-aio-0
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}Phase 4: SSH Connectivity - stx-aio-0${NC}"
    echo -e "${BLUE}========================================${NC}"
    echo ""
    
    test_ssh_connectivity "${SYSLOG_CLIENT_IP}" "${SYSLOG_CLIENT_PORT}" "${SYSLOG_CLIENT_USER}" "${SYSLOG_CLIENT_KEY}" "${SYSLOG_CLIENT_PASSWORD}" "stx-aio-0"
    test_ssh_version "${SYSLOG_CLIENT_IP}" "${SYSLOG_CLIENT_PORT}" "${SYSLOG_CLIENT_USER}" "${SYSLOG_CLIENT_KEY}" "${SYSLOG_CLIENT_PASSWORD}" "stx-aio-0"
    test_user_permissions "${SYSLOG_CLIENT_IP}" "${SYSLOG_CLIENT_PORT}" "${SYSLOG_CLIENT_USER}" "${SYSLOG_CLIENT_KEY}" "${SYSLOG_CLIENT_PASSWORD}" "stx-aio-0"
    test_remote_command "${SYSLOG_CLIENT_IP}" "${SYSLOG_CLIENT_PORT}" "${SYSLOG_CLIENT_USER}" "${SYSLOG_CLIENT_KEY}" "${SYSLOG_CLIENT_PASSWORD}" "stx-aio-0" "uname -a && whoami && pwd && uptime"
    test_scp_transfer "${SYSLOG_CLIENT_IP}" "${SYSLOG_CLIENT_PORT}" "${SYSLOG_CLIENT_USER}" "${SYSLOG_CLIENT_KEY}" "${SYSLOG_CLIENT_PASSWORD}" "stx-aio-0"
    
    echo ""
    
    # Generate summary
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}Validation Summary${NC}"
    echo -e "${BLUE}========================================${NC}"
    echo ""
    
    echo "Total Tests: ${TOTAL_TESTS}"
    echo -e "Passed: ${GREEN}${PASSED_TESTS}${NC}"
    echo -e "Failed: ${RED}${FAILED_TESTS}${NC}"
    echo ""
    
    # Write summary to log file
    echo "" >> "${LOG_FILE}"
    echo "========================================" >> "${LOG_FILE}"
    echo "Validation Summary" >> "${LOG_FILE}"
    echo "========================================" >> "${LOG_FILE}"
    echo "" >> "${LOG_FILE}"
    echo "Total Tests: ${TOTAL_TESTS}" >> "${LOG_FILE}"
    echo "Passed: ${PASSED_TESTS}" >> "${LOG_FILE}"
    echo "Failed: ${FAILED_TESTS}" >> "${LOG_FILE}"
    echo "" >> "${LOG_FILE}"
    echo "Validation Completed: $(date)" >> "${LOG_FILE}"
    
    # Create summary file
    cat > "${SUMMARY_FILE}" << EOF
OBS-3 SSH Connectivity Validation Summary
==========================================

Validation Date: $(date)
Local System: $(uname -a)
Authentication Mode: ${AUTH_MODE}

Test Results:
-----------
Total Tests: ${TOTAL_TESTS}
Passed: ${PASSED_TESTS}
Failed: ${FAILED_TESTS}

Exit Code: $([ ${FAILED_TESTS} -eq 0 ] && echo "0 (SUCCESS)" || echo "1 (FAILURE)")

Log File: ${LOG_FILE}
EOF
    
    echo "Summary File: ${SUMMARY_FILE}"
    echo ""
    
    # Determine exit code
    if [ ${FAILED_TESTS} -eq 0 ]; then
        echo -e "${GREEN}========================================${NC}"
        echo -e "${GREEN}All Tests Passed!${NC}"
        echo -e "${GREEN}========================================${NC}"
        echo ""
        echo "SSH connectivity validation successful."
        echo "Deployment readiness confirmed."
        echo ""
        exit 0
    else
        echo -e "${RED}========================================${NC}"
        echo -e "${RED}Validation Failed!${NC}"
        echo -e "${RED}========================================${NC}"
        echo ""
        echo "SSH connectivity validation failed."
        echo "Deployment readiness not confirmed."
        echo ""
        echo "Please review the log file for details:"
        echo "  ${LOG_FILE}"
        echo ""
        exit 1
    fi
}

# Run main function
main "$@"
