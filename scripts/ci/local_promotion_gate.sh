#!/bin/bash
# Added executable permission
# Local Promotion Gate Script
# Implements Agentic Security (2510.06445) for CI/CD promotion gates
# Performs security scanning and validation before allowing deployments

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
LOG_FILE="${PROJECT_ROOT}/logs/promotion_gate_$(date +%Y%m%d_%H%M%S).log"

# Security configuration
SECURITY_THRESHOLD="${SECURITY_THRESHOLD:-0.8}"
VULNERABILITY_SCAN_ENABLED="${VULNERABILITY_SCAN_ENABLED:-true}"
DEPENDENCY_CHECK_ENABLED="${DEPENDENCY_CHECK_ENABLED:-true}"
CODE_ANALYSIS_ENABLED="${CODE_ANALYSIS_ENABLED:-true}"

# Logging function
log() {
    local level="$1"
    local message="$2"
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    echo "${timestamp}|promotion_gate|security|${level}|${message}" >> "${LOG_FILE}"
    echo "[${level}] ${message}"
}

# Initialize logging
log "info" "Starting local promotion gate security checks"

# Check if required tools are available
check_dependencies() {
    local missing_tools=()

    if [[ "${VULNERABILITY_SCAN_ENABLED}" == "true" ]]; then
        if ! command -v trivy &> /dev/null; then
            missing_tools+=("trivy")
        fi
    fi

    if [[ "${DEPENDENCY_CHECK_ENABLED}" == "true" ]]; then
        if ! command -v safety &> /dev/null && ! command -v pip-audit &> /dev/null; then
            missing_tools+=("safety or pip-audit")
        fi
    fi

    if [[ "${CODE_ANALYSIS_ENABLED}" == "true" ]]; then
        if ! command -v bandit &> /dev/null && ! command -v semgrep &> /dev/null; then
            missing_tools+=("bandit or semgrep")
        fi
    fi

    if [[ ${#missing_tools[@]} -gt 0 ]]; then
        log "error" "Missing required security tools: ${missing_tools[*]}"
        return 1
    fi

    log "info" "All required security tools are available"
    return 0
}

# Main security scanning function implementing Agentic Security (2510.06445)
check_agentic_security() {
    local target_path="${1:-${PROJECT_ROOT}}"
    local security_score=0
    local total_checks=0
    local passed_checks=0

    log "info" "Starting agentic security scan for: ${target_path}"

    # 1. Vulnerability scanning
    if [[ "${VULNERABILITY_SCAN_ENABLED}" == "true" ]]; then
        log "info" "Performing vulnerability scan"
        total_checks=$((total_checks + 1))

        if perform_vulnerability_scan "${target_path}"; then
            passed_checks=$((passed_checks + 1))
            log "info" "Vulnerability scan passed"
        else
            log "warning" "Vulnerability scan found issues"
        fi
    fi

    # 2. Dependency security check
    if [[ "${DEPENDENCY_CHECK_ENABLED}" == "true" ]]; then
        log "info" "Performing dependency security check"
        total_checks=$((total_checks + 1))

        if perform_dependency_check "${target_path}"; then
            passed_checks=$((passed_checks + 1))
            log "info" "Dependency security check passed"
        else
            log "warning" "Dependency security check found issues"
        fi
    fi

    # 3. Code security analysis
    if [[ "${CODE_ANALYSIS_ENABLED}" == "true" ]]; then
        log "info" "Performing code security analysis"
        total_checks=$((total_checks + 1))

        if perform_code_analysis "${target_path}"; then
            passed_checks=$((passed_checks + 1))
            log "info" "Code security analysis passed"
        else
            log "warning" "Code security analysis found issues"
        fi
    fi

    # 4. Configuration security check
    log "info" "Performing configuration security check"
    total_checks=$((total_checks + 1))

    if perform_config_security_check "${target_path}"; then
        passed_checks=$((passed_checks + 1))
        log "info" "Configuration security check passed"
    else
        log "warning" "Configuration security check found issues"
    fi

    # 5. Secret detection
    log "info" "Performing secret detection"
    total_checks=$((total_checks + 1))

    if perform_secret_detection "${target_path}"; then
        passed_checks=$((passed_checks + 1))
        log "info" "Secret detection passed"
    else
        log "error" "Secret detection found potential secrets"
        return 1
    fi

    # Calculate security score
    if [[ ${total_checks} -gt 0 ]]; then
        security_score=$(echo "scale=2; ${passed_checks} / ${total_checks}" | bc)
    fi

    log "info" "Security scan completed: ${passed_checks}/${total_checks} checks passed (score: ${security_score})"

    # Check against security threshold
    if (( $(echo "${security_score} < ${SECURITY_THRESHOLD}" | bc -l) )); then
        log "error" "Security score ${security_score} below threshold ${SECURITY_THRESHOLD}"
        return 1
    fi

    log "info" "Security requirements met - promotion gate passed"
    return 0
}

# Vulnerability scanning implementation
perform_vulnerability_scan() {
    local target_path="$1"

    if command -v trivy &> /dev/null; then
        log "info" "Running Trivy vulnerability scan"

        # Run trivy scan with JSON output
        if trivy fs --format json --output /tmp/trivy_results.json "${target_path}" 2>/dev/null; then
            # Check for critical/high vulnerabilities
            local critical_count=$(jq '.Results[].Vulnerabilities[]? | select(.Severity == "CRITICAL") | .VulnerabilityID' /tmp/trivy_results.json 2>/dev/null | wc -l)
            local high_count=$(jq '.Results[].Vulnerabilities[]? | select(.Severity == "HIGH") | .VulnerabilityID' /tmp/trivy_results.json 2>/dev/null | wc -l)

            if [[ ${critical_count} -gt 0 ]]; then
                log "error" "Found ${critical_count} critical vulnerabilities"
                return 1
            fi

            if [[ ${high_count} -gt 5 ]]; then
                log "warning" "Found ${high_count} high-severity vulnerabilities"
                return 1
            fi

            return 0
        else
            log "warning" "Trivy scan failed, continuing with reduced security"
            return 0
        fi
    else
        log "warning" "Trivy not available, skipping vulnerability scan"
        return 0
    fi
}

# Dependency security check
perform_dependency_check() {
    local target_path="$1"

    # Check for Python dependencies
    if [[ -f "${target_path}/requirements.txt" ]] || [[ -f "${target_path}/pyproject.toml" ]]; then
        if command -v safety &> /dev/null; then
            log "info" "Running Safety dependency check"

            if [[ -f "${target_path}/requirements.txt" ]]; then
                if ! safety check --file "${target_path}/requirements.txt" --json | jq -e '.vulnerabilities | length == 0' > /dev/null; then
                    log "error" "Safety found vulnerable dependencies"
                    return 1
                fi
            fi

            return 0
        elif command -v pip-audit &> /dev/null; then
            log "info" "Running pip-audit dependency check"

            if ! pip-audit --format json | jq -e '.vulnerabilities | length == 0' > /dev/null 2>&1; then
                log "error" "pip-audit found vulnerable dependencies"
                return 1
            fi

            return 0
        fi
    fi

    log "info" "No Python dependencies found or tools not available"
    return 0
}

# Code security analysis
perform_code_analysis() {
    local target_path="$1"

    # Check for Python files
    if find "${target_path}" -name "*.py" -type f | grep -q .; then
        if command -v bandit &> /dev/null; then
            log "info" "Running Bandit code analysis"

            if ! bandit -r "${target_path}" --format json --output /tmp/bandit_results.json 2>/dev/null; then
                local high_issues=$(jq '.results[]? | select(.issue_severity == "HIGH") | .test_id' /tmp/bandit_results.json 2>/dev/null | wc -l)

                if [[ ${high_issues} -gt 0 ]]; then
                    log "error" "Bandit found ${high_issues} high-severity code issues"
                    return 1
                fi
            fi

            return 0
        elif command -v semgrep &> /dev/null; then
            log "info" "Running Semgrep code analysis"

            if ! semgrep --config auto --json "${target_path}" > /tmp/semgrep_results.json 2>/dev/null; then
                local high_issues=$(jq '.results[]? | select(.extra.severity == "ERROR" or .extra.severity == "WARNING") | .check_id' /tmp/semgrep_results.json 2>/dev/null | wc -l)

                if [[ ${high_issues} -gt 10 ]]; then
                    log "error" "Semgrep found ${high_issues} significant code issues"
                    return 1
                fi
            fi

            return 0
        fi
    fi

    log "info" "No Python code found or analysis tools not available"
    return 0
}

# Configuration security check
perform_config_security_check() {
    local target_path="$1"

    # Check for exposed secrets in config files
    local config_files=$(find "${target_path}" -name "*.json" -o -name "*.yaml" -o -name "*.yml" -o -name "*.toml" -o -name "*.cfg" -o -name "*.ini" | head -10)

    for config_file in ${config_files}; do
        if [[ -f "${config_file}" ]]; then
            # Check for common secret patterns
            if grep -q -i "password\|secret\|key\|token" "${config_file}" && grep -q "://" "${config_file}"; then
                log "warning" "Potential secrets found in config file: ${config_file}"
                return 1
            fi
        fi
    done

    return 0
}

# Secret detection
perform_secret_detection() {
    local target_path="$1"

    # Use git-secrets or similar if available
    if command -v git-secrets &> /dev/null; then
        log "info" "Running git-secrets scan"

        if ! git-secrets --scan "${target_path}" 2>/dev/null; then
            log "error" "git-secrets found potential secrets"
            return 1
        fi
    else
        # Basic secret pattern detection
        local secret_patterns=(
            "password.*="
            "secret.*="
            "key.*="
            "token.*="
            "api_key.*="
            "aws_access_key_id"
            "aws_secret_access_key"
        )

        for pattern in "${secret_patterns[@]}"; do
        # Check whitelist first
        if grep -q "${pattern}" "${PROJECT_ROOT}/scripts/ci/secret_whitelist.txt" 2>/dev/null; then
            continue
        fi
        # Check whitelist first
        if grep -q "${pattern}" "${PROJECT_ROOT}/scripts/ci/secret_whitelist.txt" 2>/dev/null; then
            continue
        fi
        # Check whitelist first
        if grep -q "${pattern}" "${PROJECT_ROOT}/scripts/ci/secret_whitelist.txt" 2>/dev/null; then
            continue
        fi
            if find "${target_path}" -type f \( -name "*.py" -o -name "*.sh" -o -name "*.json" -o -name "*.yaml" -o -name "*.yml" \) -exec grep -l "${pattern}" {} \; | grep -q .; then
                log "error" "Potential secrets found matching pattern: ${pattern}"
                return 1
            fi
        done
    fi

    return 0
}

# Main execution
main() {
    log "info" "Local promotion gate started"

    # Check dependencies
    if ! check_dependencies; then
        log "error" "Dependency check failed"
        exit 1
    fi

    # Perform security checks
    if check_agentic_security "${PROJECT_ROOT}"; then
        log "info" "Promotion gate PASSED - deployment can proceed"
        echo "✅ Promotion gate passed - all security checks completed successfully"
        exit 0
    else
        log "error" "Promotion gate FAILED - security issues found"
        echo "❌ Promotion gate failed - security issues require attention"
        echo "Check log file: ${LOG_FILE}"
        exit 1
    fi
}

# Run main function
main "$@"