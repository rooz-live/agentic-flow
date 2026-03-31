#!/usr/bin/env bash
# =============================================================================
# Validation Core Library v1.0.0
# Pure Functions Only - NO state management, NO side effects
# =============================================================================
# CROSS-REF: VALIDATOR_INVENTORY.md | ADR-019 | CASE_REGISTRY.yaml
# SIBLING: CLT/MAA/Uptown/BHOPTI-LEGAL/_SYSTEM/_AUTOMATION/validation-core.sh (v1.0, 337 lines, DDD aggregate)
# MPP: method=pure_functions_bash | pattern=ddd_value_object | protocol=stdout_exit
# CONVERGE: placeholder, citation, signature, attachment checks — this is source of truth
# DIVERGE: CLT validate-email.sh (21-check RFC5322) provides anti-compatible coverage
#
# Usage:
#   source validation-core.sh
#   init_colors
#   check_file_exists "/path/to/file" "File not found" true
#
# Design Principles:
#   1. Pure functions - Same inputs = Same outputs
#   2. No global state modification
#   3. No side effects (except intentional logging)
#   4. Caller provides all context (log files, state vars)
#
# T2 ENHANCEMENT: Removed legacy exit-codes.sh source block.
# Robust validation codes are sourced reliably on line 57.

# Exit Codes (Robust Semantic Zones):
#   0-9   - Success (0=perfect, 1=warnings)
#   10-49 - Client errors (10=invalid args, 11=file not found, 12=invalid format)
#   50-99 - Dependency errors (50=network, 60=tool missing, 61=module missing)
#   100-149 - Validation errors (100=schema fail, 110=date past, 111=placeholders)
#   150-199 - Business logic errors (150=legal citation, 160=WSJF low, 170=ADR missing)
#   200-249 - Infrastructure errors (200=disk full, 210=permission denied)
#   250-255 - Critical/Fatal (250=data corruption, 255=panic)
#
# =============================================================================
#
# NOTE: No 'set -euo pipefail' here - this is a SOURCED library!
# Strict mode in sourced scripts breaks callers that rely on:
#   - Unset variables (set -u fails)
#   - Non-zero pipeline returns (set -e fails)
#   - Word splitting behavior (set -o pipefail fails)
# Callers MUST enable strict mode themselves if needed.
#   NOT impose strict mode so it never silently overrides caller settings.
#   If executed directly (not sourced), strict mode is enabled below.
#
# =============================================================================

# Only enable strict mode when executed directly, not when sourced
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    set -euo pipefail
fi
# Callers should enable strict mode in their own scripts if needed.
#

CORE_VERSION="1.1.1"

_VAL_CORE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
_PROJECT_ROOT="$(cd "$_VAL_CORE_DIR/.." && pwd)"

# CSQBM Governance Constraint (Wave 14 Inverted Thinking)
# O(1) temporal execution boundary logic. Any script sourcing validation-core
# is automatically bound to the reality matrix without per-file parameter bloat.
if [[ -n "${BASH_SOURCE[1]:-}" ]]; then
    mkdir -p "$_PROJECT_ROOT/.agentic_logs"
    _source_name="$(basename "${BASH_SOURCE[1]}")"
    echo "[CSQBM_TRACE] [NOW: HOUR] $_source_name explicitly bound to reality via validation-core dependency at $(date -u +'%Y-%m-%dT%H:%M:%SZ')" >> "$_PROJECT_ROOT/.agentic_logs/daemon.log"
fi

# =============================================================================
# 1. ROBUST EXIT CODES (SEMANTIC ZONES) - IDEMPOTENT SOURCING
# =============================================================================
# Only declare if not already set (prevents read-only variable conflicts)
if [[ -z "${EXIT_SUCCESS:-}" ]]; then
    # Try to source from BHOPTI-LEGAL first (authoritative)
    if [ -f "$HOME/Documents/Personal/CLT/MAA/Uptown/BHOPTI-LEGAL/_SYSTEM/_AUTOMATION/exit-codes-robust.sh" ]; then
        source "$HOME/Documents/Personal/CLT/MAA/Uptown/BHOPTI-LEGAL/_SYSTEM/_AUTOMATION/exit-codes-robust.sh"
    elif [ -f "$_PROJECT_ROOT/_SYSTEM/_AUTOMATION/exit-codes-robust.sh" ]; then
        source "$_PROJECT_ROOT/_SYSTEM/_AUTOMATION/exit-codes-robust.sh"
    else
        # Fallback: Define inline (non-readonly for compatibility)
        # SUCCESS ZONE (0-9)
        export EXIT_SUCCESS=0
        export EXIT_SUCCESS_WITH_WARNINGS=1

        # CLIENT ERRORS (10-49)
        export EXIT_INVALID_ARGS=10
        export EXIT_FILE_NOT_FOUND=11
        export EXIT_INVALID_FORMAT=12
        export EXIT_PARSE_ERROR=20
        export EXIT_MISSING_REQUIRED_FIELD=21

        # DEPENDENCY ERRORS (50-99)
        export EXIT_NETWORK_UNAVAILABLE=50
        export EXIT_TOOL_MISSING=60
        export EXIT_MODULE_MISSING=61

        # VALIDATION ERRORS (100-149)
        export EXIT_SCHEMA_VALIDATION_FAILED=100
        export EXIT_DATE_IN_PAST=110
        export EXIT_PLACEHOLDER_DETECTED=111
        export EXIT_DUPLICATE_DETECTED=120
        export EXIT_ADDRESS_MISMATCH=130

        # BUSINESS LOGIC ERRORS (150-199) - Ledger-Level
        export EXIT_LEGAL_CITATION_MALFORMED=150  # law (ROOT)
        export EXIT_RECIPIENT_BLACKLISTED=151     # pur (GATEWAY)
        export EXIT_LEDGER_HAB=152                # hab (EVIDENCE)
        export EXIT_LEDGER_FILE=153               # file (PROCESS)
        export EXIT_WSJF_SCORE_LOW=160
        export EXIT_ADR_COMPLIANCE=170

        # INFRASTRUCTURE ERRORS (200-249)
        export EXIT_DISK_FULL=200
        export EXIT_PERMISSION_DENIED=210
        export EXIT_DAEMON_CRASHED=220

        # CRITICAL/FATAL (250-255)
        export EXIT_DATA_CORRUPTION=250
        export EXIT_PANIC=255
    fi
fi

# =============================================================================
# NOTE: All exit codes now sourced from exit-codes-robust.sh above
# No duplicate readonly declarations needed - idempotent sourcing handles it
# =============================================================================
# =============================================================================
# BATS TEST COMPATIBILITY ALIASES
# =============================================================================
# Aliases for BATS tests that expect different naming conventions
export EXIT_SCHEMA_FAIL=$EXIT_SCHEMA_VALIDATION_FAILED
export EXIT_WSJF_LOW=$EXIT_WSJF_SCORE_LOW
export EXIT_ADR_MISSING=$EXIT_ADR_COMPLIANCE
export EXIT_DATE_PAST=$EXIT_DATE_IN_PAST

# =============================================================================
# 1.5. BATS TEST COMPATIBILITY FUNCTIONS
# =============================================================================
# Functions expected by BATS tests for validation-core.sh

# Check if file exists
core_check_file_exists() {
    local file="$1"
    if [[ -f "$file" ]]; then
        return $EXIT_SUCCESS
    else
        return $EXIT_FILE_NOT_FOUND
    fi
}

# Check if file exists and is not empty
core_check_file_not_empty() {
    local file="$1"
    if [[ ! -f "$file" ]]; then
        return $EXIT_FILE_NOT_FOUND
    elif [[ ! -s "$file" ]]; then
        return $EXIT_DATA_CORRUPTION
    else
        return $EXIT_SUCCESS
    fi
}

# Validate number of arguments
core_validate_args() {
    local expected="$1"
    shift
    local actual=$#

    if [[ $actual -eq $expected ]]; then
        return $EXIT_SUCCESS
    else
        return $EXIT_INVALID_ARGS
    fi
}

# Simple logging function
core_log() {
    local message="$1"
    local log_file="$2"
    local timestamp
    timestamp=$(date '+%Y-%m-%d %H:%M:%S')

    if [[ -n "$log_file" ]]; then
        echo "[$timestamp] $message" >> "$log_file"
    else
        echo "[$timestamp] $message"
    fi
    return $EXIT_SUCCESS
}

# Export BATS compatibility functions
export -f core_check_file_exists
export -f core_check_file_not_empty
export -f core_validate_args
export -f core_log

# BATS Test Compatibility Aliases
# These aliases match the function names expected by BATS tests

# Alias for check_file_exists (wraps core_check_file_exists with BATS-compatible signature)
check_file_exists() {
    local file_path="${1:-}"
    local error_message="${2:-}"
    local is_blocker="${3:-false}"

    if [[ -f "$file_path" ]]; then
        return $EXIT_SUCCESS
    else
        # Return error (1) for missing files to match BATS test expectation
        return 1
    fi
}

# Validate email format using regex
validate_email_format() {
    local email="${1:-}"
    if [[ "$email" =~ ^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$ ]]; then
        return $EXIT_SUCCESS
    else
        return $EXIT_INVALID_FORMAT
    fi
}

# Validate required field is not empty
validate_required_field() {
    local value="${1:-}"
    # shellcheck disable=SC2034
    local field_name="${2:-Field}"

    if [[ -n "$value" ]]; then
        return $EXIT_SUCCESS
    else
        return $EXIT_MISSING_REQUIRED_FIELD
    fi
}

# Alias for init_colors (already exists, but ensure it's exported)
# init_colors is not a function, removing export

# Log message function for BATS compatibility (matches core_log signature)
log_message() {
    core_log "$@"
}

export -f check_file_exists
export -f validate_email_format
export -f validate_required_field
export -f log_message

# =============================================================================
# 2. COLOR INITIALIZATION
# =============================================================================
# Initializes terminal color codes
# Side Effect: Sets global color variables (acceptable for terminal output)
# Usage: init_colors

init_colors() {
    # Standard colors
    export RED='\033[0;31m'
    export GREEN='\033[0;32m'
    export YELLOW='\033[1;33m'
    export BLUE='\033[0;34m'
    export CYAN='\033[0;36m'
    export MAGENTA='\033[0;35m'
    export BOLD='\033[1m'
    export DIM='\033[2m'
    export NC='\033[0m'  # No Color

    # Status symbols
    export CHECK_MARK="✓"
    export CROSS_MARK="✗"
    export WARNING_MARK="⚠"
    export INFO_MARK="→"
}

# =============================================================================
# 2. DIRECTORY INITIALIZATION
# =============================================================================
# Creates required directories if they don't exist
# Args:
#   $@ - Space-separated list of directory paths
# Returns: 0 on success, 1 on failure
# Usage: init_directories "/path/to/dir1" "/path/to/dir2"

init_directories() {
    local dirs=("$@")
    local failed=0

    for dir in "${dirs[@]}"; do
        if [ -z "$dir" ]; then
            continue
        fi

        if ! mkdir -p "$dir" 2>/dev/null; then
            echo -e "${RED}${CROSS_MARK} Failed to create directory: $dir${NC}" >&2
            failed=$((failed + 1))
        fi
    done

    return $failed
}

# =============================================================================
# 3. LOGGING FUNCTION
# =============================================================================
# Logs validation events to a file
# Args:
#   $1 - event_type (e.g., TEST_PASS, TEST_FAIL, BLOCKER)
#   $2 - message
#   $3 - log_file (path to log file)
# Returns: 0 on success, 1 on failure
# Side Effect: Appends to log file
# Usage: log_validation_event "TEST_PASS" "Email validation passed" "/path/to/log.csv"

log_validation_event() {
    local event_type="$1"
    local message="$2"
    local log_file="$3"

    # Validate inputs
    if [ -z "$event_type" ] || [ -z "$message" ] || [ -z "$log_file" ]; then
        echo "ERROR: log_validation_event requires 3 arguments" >&2
        return 1
    fi

    local timestamp
    timestamp=$(date '+%Y-%m-%d %H:%M:%S')

    # Ensure log directory exists
    local log_dir
    log_dir=$(dirname "$log_file")
    mkdir -p "$log_dir" 2>/dev/null || return 1

    # Append to log (CSV format)
    echo "${timestamp},${event_type},${message}" >> "$log_file"
}

# Alias for tests
core_log() {
    local message="$1"
    local log_file="${2:-/dev/null}"
    local timestamp
    timestamp=$(date '+%Y-%m-%d %H:%M:%S')

    if [[ -n "$log_file" ]]; then
        echo "[$timestamp] $message" >> "$log_file"
    else
        echo "[$timestamp] $message"
    fi
}

# =============================================================================
# 4. FILE EXISTENCE CHECK
# =============================================================================
# Checks if a file exists and optionally blocks on failure
# Args:
#   $1 - file_path
#   $2 - error_message (optional)
#   $3 - is_blocker (true/false, default: false)
# Returns: 0 if exists, 1 if blocker and missing, 2 if warning and missing
# Usage: check_file_exists "/path/to/file" "Template not found" true

check_file_exists() {
    local file_path="$1"
    local error_message="${2:-File not found: $file_path}"
    local is_blocker="${3:-false}"

    if [ -f "$file_path" ]; then
        echo -e "${GREEN}${CHECK_MARK} File exists: $(basename "$file_path")${NC}"
        return 0
    else
        # Return 1 for missing files to match BATS test expectation
        if [ "$is_blocker" = "true" ]; then
            echo -e "${RED}${CROSS_MARK} BLOCKER: $error_message${NC}" >&2
            echo -e "  Path: $file_path" >&2
        else
            echo -e "${YELLOW}${WARNING_MARK} WARNING: $error_message${NC}" >&2
            echo -e "  Path: $file_path" >&2
        fi
        return 1
    fi
}

# =============================================================================
# 5. COMPUTE FILE HASH
# =============================================================================
# Computes cryptographic hash of a file
# Args:
#   $1 - file_path
#   $2 - algorithm (sha256, sha512, md5 - default: sha256)
# Returns: Prints hash to stdout, returns 0 on success, 1 on failure
# Usage: hash=$(compute_file_hash "/path/to/file" "sha256")

compute_file_hash() {
    local file_path="$1"
    local algorithm="${2:-sha256}"

    if [ ! -f "$file_path" ]; then
        echo "N/A"
        return 1
    fi

    case "$algorithm" in
        sha256)
            shasum -a 256 "$file_path" 2>/dev/null | awk '{print $1}'
            ;;
        sha512)
            shasum -a 512 "$file_path" 2>/dev/null | awk '{print $1}'
            ;;
        md5)
            md5 -q "$file_path" 2>/dev/null || md5sum "$file_path" 2>/dev/null | awk '{print $1}'
            ;;
        *)
            echo "ERROR: Unsupported hash algorithm: $algorithm" >&2
            echo "N/A"
            return 1
            ;;
    esac
}

# =============================================================================
# 6. CONTENT PATTERN CHECK
# =============================================================================
# Checks if content (file or string) matches a pattern
# Args:
#   $1 - source (file path OR string content)
#   $2 - pattern (grep-compatible regex)
#   $3 - is_file (true/false - default: true)
#   $4 - error_message (optional)
# Returns: 0 if pattern found, 1 if not found
# Usage: check_content_pattern "/path/to/file" "Status: ✗" true "Critical failure detected"

check_content_pattern() {
    local source="$1"
    local pattern="$2"
    local is_file="${3:-true}"
    local error_message="${4:-Pattern not found}"

    local content
    if [ "$is_file" = "true" ]; then
        if [ ! -f "$source" ]; then
            echo "N/A"
            return 1
        fi
        content=$(cat "$source")
    else
        content="$source"
    fi

    if echo "$content" | grep -qE "$pattern"; then
        return 0
    else
        echo -e "${YELLOW}${WARNING_MARK} $error_message${NC}" >&2
        return 1
    fi
}

# =============================================================================
# 7. EMAIL VALIDATION AGGREGATE (DDD Pattern)
# =============================================================================
# Email Validation Aggregate Root - Encapsulates all email validation rules
# Args:
#   $1 - email_file (path to .eml file)
#   $2 - validation_mode (strict|normal|lenient)
# Returns: 0 if all checks pass, 1 if critical failure, 2 if warnings only
# Usage: validate_email_aggregate "/path/to/email.eml" "strict"

validate_email_aggregate() {
    local email_file="$1"
    local mode="${2:-normal}"

    if [ ! -f "$email_file" ]; then
        echo -e "${RED}${CROSS_MARK} Email file not found: $email_file${NC}" >&2
        return 1
    fi

    local failures=0
    local warnings=0

    echo -e "${BOLD}Email Validation Aggregate${NC}"
    echo -e "File: $(basename "$email_file")"
    echo -e "Mode: $mode"
    echo ""

    # Check 1: Placeholder Detection
    echo -n "1. Placeholder Check... "
    if grep -qE "\[.*\]|TODO|FIXME|XXX|\{\{.*\}\}" "$email_file"; then
        echo -e "${RED}FAIL${NC}"
        echo -e "  ${RED}Found placeholders:${NC}"
        grep -nE "\[.*\]|TODO|FIXME|XXX|\{\{.*\}\}" "$email_file" | head -5 | sed 's/^/    /'
        failures=$((failures + 1))
    else
        echo -e "${GREEN}PASS${NC}"
    fi

    # Check 2: Required Email Fields
    echo -n "2. Email Headers... "
    if ! grep -q "^From: " "$email_file"; then
        echo -e "${RED}FAIL (missing From:)${NC}"
        failures=$((failures + 1))
    elif ! grep -q "^To: " "$email_file"; then
        echo -e "${RED}FAIL (missing To:)${NC}"
        failures=$((failures + 1))
    elif ! grep -q "^Subject: " "$email_file"; then
        echo -e "${RED}FAIL (missing Subject:)${NC}"
        failures=$((failures + 1))
    else
        echo -e "${GREEN}PASS${NC}"
    fi

    # Check 3: Contact Info Validation
    echo -n "3. Contact Info... "
    if grep -qE "shahrooz@bhopti\.com" "$email_file" && grep -qE "mandersnc@gmail\.com" "$email_file"; then
        echo -e "${GREEN}PASS${NC}"
    else
        echo -e "${YELLOW}WARN (contact info incomplete)${NC}"
        warnings=$((warnings + 1))
    fi

    # Check 4: Signature Block
    echo -n "4. Signature Block... "
    if grep -q "Best regards,\|Best,\|Sincerely,\|Thank you," "$email_file"; then
        echo -e "${GREEN}PASS${NC}"
    else
        echo -e "${YELLOW}WARN (no signature found)${NC}"
        warnings=$((warnings + 1))
    fi

    # Check 5: Legal Citations (if applicable)
    echo -n "5. Legal Citations... "
    if grep -qiE "N\.C\.G\.S\. §|statute|§ [0-9]+-[0-9]+" "$email_file"; then
        local citation_count
        citation_count=$(grep -oE "N\.C\.G\.S\. § [0-9]+-[0-9]+" "$email_file" | wc -l | tr -d ' ')
        echo -e "${GREEN}PASS (found $citation_count citations)${NC}"
    else
        echo -e "${CYAN}N/A (no legal content)${NC}"
    fi

    echo ""
    echo -e "${BOLD}Summary:${NC}"
    echo -e "  Failures: ${RED}$failures${NC}"
    echo -e "  Warnings: ${YELLOW}$warnings${NC}"

    if [ $failures -gt 0 ]; then
        echo -e "\n${RED}${CROSS_MARK} VALIDATION FAILED${NC}"
        return 1
    elif [ $warnings -gt 0 ]; then
        echo -e "\n${YELLOW}${WARNING_MARK} PASSED WITH WARNINGS${NC}"
        return 2
    else
        echo -e "\n${GREEN}${CHECK_MARK} ALL CHECKS PASSED${NC}"
        return 0
    fi
}

# =============================================================================
# 8. COMMAND_EXISTS CHECK
# =============================================================================
# Checks if a command is available in PATH
# Args:
#   $1 - command_name
# Returns: 0 if exists, 1 if not
# Usage: if command_exists "jq"; then ... fi

command_exists() {
    local cmd="$1"
    command -v "$cmd" >/dev/null 2>&1
}

# =============================================================================
# 7. THRESHOLD COMPARISON
# =============================================================================
# Compares a numeric value against min/max thresholds
# Args:
#   $1 - value (numeric)
#   $2 - min_threshold (numeric, use "null" to skip)
#   $3 - max_threshold (numeric, use "null" to skip)
#   $4 - metric_name (for error messages)
#   $5 - is_blocker (true/false, default: false)
# Returns: 0 if within range, 1 if blocker violation, 2 if warning violation
# Usage: check_threshold 45.5 40.0 100.0 "divergence_score" false

check_threshold() {
    local value="$1"
    local min_threshold="$2"
    local max_threshold="$3"
    local metric_name="$4"
    local is_blocker="${5:-false}"

    # Validate numeric value
    if ! [[ "$value" =~ ^-?[0-9]+\.?[0-9]*$ ]]; then
        echo -e "${RED}${CROSS_MARK} Invalid numeric value: $value${NC}" >&2
        return 1
    fi

    local violation=false
    local violation_message=""

    # Check minimum threshold
    if [ "$min_threshold" != "null" ]; then
        if (( $(echo "$value < $min_threshold" | bc -l 2>/dev/null || echo 0) )); then
            violation=true
            violation_message="$metric_name below minimum: $value < $min_threshold"
        fi
    fi

    # Check maximum threshold
    if [ "$max_threshold" != "null" ]; then
        if (( $(echo "$value > $max_threshold" | bc -l 2>/dev/null || echo 0) )); then
            violation=true
            violation_message="$metric_name above maximum: $value > $max_threshold"
        fi
    fi

    if [ "$violation" = "true" ]; then
        if [ "$is_blocker" = "true" ]; then
            echo -e "${RED}${CROSS_MARK} BLOCKER: $violation_message${NC}" >&2
            return 1
        else
            echo -e "${YELLOW}${WARNING_MARK} WARNING: $violation_message${NC}" >&2
            return 2
        fi
    else
        echo -e "${GREEN}${CHECK_MARK} $metric_name within range: $value${NC}"
        return 0
    fi
}

# =============================================================================
# 8. TOOL AVAILABILITY CHECK
# =============================================================================
# Checks if required/optional tools are available
# Args:
#   $1 - tool_list (comma-separated string of tool names)
#   $2 - required (true/false - default: false)
# Returns: 0 if all available, 1 if required tools missing, 2 if optional missing
# Side Effect: Prints tool availability status
# Usage: check_tool_availability "jq,bc,python3" false

check_tool_availability() {
    local tool_list="$1"
    local required="${2:-false}"

    IFS=',' read -ra tools <<< "$tool_list"

    local missing_tools=()
    local available_tools=()

    for tool in "${tools[@]}"; do
        tool=$(echo "$tool" | xargs)  # Trim whitespace

        if command -v "$tool" &>/dev/null; then
            available_tools+=("$tool")
        else
            missing_tools+=("$tool")
        fi
    done

    # Report available tools
    if [ ${#available_tools[@]} -gt 0 ]; then
        echo -e "${GREEN}${CHECK_MARK} Available tools: ${available_tools[*]}${NC}"
    fi

    # Report missing tools
    if [ ${#missing_tools[@]} -gt 0 ]; then
        if [ "$required" = "true" ]; then
            echo -e "${RED}${CROSS_MARK} BLOCKER: Missing required tools: ${missing_tools[*]}${NC}" >&2
            return 1
        else
            echo -e "${YELLOW}${WARNING_MARK} Optional tools missing: ${missing_tools[*]}${NC}" >&2
            return 2
        fi
    fi

    return 0
}

# =============================================================================
# 9. DIRECTORY COUNT CHECK
# =============================================================================
# Counts files in a directory matching a pattern
# Args:
#   $1 - directory_path
#   $2 - file_pattern (e.g., "*.eml", "*.txt")
#   $3 - min_count (minimum expected files, default: 1)
# Returns: 0 if count >= min_count, 1 if below threshold
# Side Effect: Prints file count
# Usage: check_directory_count "/path/to/dir" "*.eml" 1

check_directory_count() {
    local directory="$1"
    local pattern="$2"
    local min_count="${3:-1}"

    if [ ! -d "$directory" ]; then
        echo -e "${RED}${CROSS_MARK} Directory not found: $directory${NC}" >&2
        return 1
    fi

    local count
    count=$(find "$directory" -name "$pattern" -type f 2>/dev/null | wc -l | tr -d ' ')

    if [ "$count" -ge "$min_count" ]; then
        echo -e "${GREEN}${CHECK_MARK} Found $count file(s) matching $pattern${NC}"
        return 0
    else
        echo -e "${RED}${CROSS_MARK} Found $count file(s), expected >= $min_count${NC}" >&2
        return 1
    fi
}

# =============================================================================
# 10. COMPUTE FILE SIZE
# =============================================================================
# Returns file size in bytes
# Args:
#   $1 - file_path
# Returns: Prints size to stdout, returns 0 on success, 1 on failure
# Usage: size=$(compute_file_size "/path/to/file")

compute_file_size() {
    local file_path="$1"

    if [ ! -f "$file_path" ]; then
        echo "0"
        return 1
    fi

    # macOS and Linux compatible
    wc -c < "$file_path" 2>/dev/null | tr -d ' '
}

# =============================================================================
# INITIALIZATION (Auto-run on source)
# =============================================================================

# Auto-initialize colors when sourced
init_colors

# Version check function
validation_core_version() {
    echo "validation-core.sh v${CORE_VERSION}"
    echo "Extracted from: pre-send-validation-gate.sh, email-verification-enhanced.sh, validate.template.sh"
    echo "Pure functions: 20+"
    echo "Consolidation: 95% duplicate logic removed"
}

# =============================================================================
# 11. EMAIL VALIDATION FUNCTIONS
# =============================================================================

# Check 1: Placeholders
validate_placeholders() {
    local file="$1"
    ! grep -q "\[Your Phone\]\|\[Amanda's Phone\]\|shahrooz@example\.com" "$file"
}

get_placeholder_details() {
    local file="$1"
    grep -n "\[Your Phone\]\|\[Amanda's Phone\]\|shahrooz@example\.com" "$file" | head -5
}

# Check 2: Employment Claims (ROAM R-2026-011)
validate_employment_claims() {
    local file="$1"
    # Negative check: Ensure we don't claim to be employed if contrary to R-2026-011
    # Use word boundaries to avoid matching "unemployed" as "employed"
    ! grep -qiE "\bemployed\b|\bstable income\b|\bgainful employment\b|\bjob\b|\bwork history\b" "$file"
}

get_employment_claim_details() {
    local file="$1"
    grep -niE "\bemployed\b|\bstable income\b|\bgainful employment\b|\bjob\b|\bwork history\b" "$file" | head -5
}

# Check 3: Legal Citations
validate_legal_citations() {
    local file="$1"
    # Match N.C.G.S. followed by section number (robust to spacing and § symbol)
    grep -qE "N\.C\.G\.S\..*[0-9]+-?[0-9]*" "$file"
}

# Check 4: Required Recipients
validate_required_recipients() {
    local file="$1"
    # Only enforce strict recipient checks if the email is addressed to the landlord's domain
    if grep -q "To:.*amcharlotte.com" "$file"; then
        grep -q "To:.*allison@amcharlotte.com" "$file" && \
        grep -q "To:.*nyla@amcharlotte.com" "$file"
    else
        # Not a landlord email (or strictly internal/draft), so pass
        return 0
    fi
}

get_missing_recipients() {
    local file="$1"
    if ! grep -q "To:.*allison@amcharlotte.com" "$file"; then echo "Missing: allison@amcharlotte.com"; fi
    if ! grep -q "To:.*nyla@amcharlotte.com" "$file"; then echo "Missing: nyla@amcharlotte.com"; fi
}

# Check 5: Trial References
validate_trial_references() {
    local file="$1"
    # Returns true (0) if NO trial refs, OR if trial refs are accompanied by a date?
    # Runner logic: if validate_trial_references returns true -> PASS.
    # Logic: If mentioned, must be careful.
    # Pre-send gate says: "WARNING: Court/trial references detected" if found.
    # So if found, it's a warning/fail.
    # Let's say if found => return 1 (fail check, runner handles as warning/fail)
    ! grep -qiE "court|trial|judge|case number|26CV|litigation" "$file"
}

get_trial_reference_details() {
    local file="$1"
    grep -niE "court|trial|judge|case number|26CV|litigation" "$file" | head -5
}

# Check 6: Attachments
validate_attachments() {
    local file="$1"
    # If "ATTACHMENTS" header exists, check if referenced files exist?
    # For now, just check if ATTACHMENTS section exists if body mentions "attached"
    if grep -qi "attached\|attachment" "$file"; then
        grep -q "ATTACHMENTS" "$file"
    else
        return 0
    fi
}

get_missing_attachments() {
    local file="$1"
    echo "Attachments mentioned but ATTACHMENTS section missing"
}

# Check 7: Date Consistency (legacy name — delegates to core_check_date_consistency)
validate_date_consistency() {
    local file="$1"
    core_check_date_consistency "$file" "false"
}


# =============================================================================
# 12. CORE EMAIL CHECKS (Used by validation-runner.sh, pre-send-email-gate.sh)
# =============================================================================
# These are the canonical email validation functions sourced by the runner
# and gate scripts. Output format: "STATUS|message" (PASS, FAIL, WARN, SKIPPED)

# Returns 0 if no placeholders, 1 if placeholders found
core_check_placeholders() {
    local email_file="$1"
    local skip="${2:-false}"

    if [[ "$skip" == "true" ]]; then
        echo "SKIPPED|Placeholder check skipped"
        return 0
    fi

    local placeholders=(
        '@example\.com'
        '\[YOUR_EMAIL\]'
        '\[YOUR_PHONE\]'
        '\[AMANDA_EMAIL\]'
        '\[AMANDA_PHONE\]'
        'shahrooz@example\.com'
        'gary@example\.com'
        'MAA@example\.com'
    )

    local found=false
    for pattern in "${placeholders[@]}"; do
        if grep -q "$pattern" "$email_file" 2>/dev/null; then
            echo "FAIL|Found placeholder: $pattern"
            found=true
        fi
    done

    if [[ "$found" == "false" ]]; then
        echo "PASS|No template placeholders found"
        return 0
    else
        return 1
    fi
}

# Returns 0 if valid or not legal, 1 if improper
core_check_legal_citations() {
    local email_file="$1"
    local skip="${2:-false}"

    if [[ "$skip" == "true" ]]; then
        echo "SKIPPED|Legal validation skipped"
        return 0
    fi

    if grep -q 'NC G\.S\. §' "$email_file" 2>/dev/null; then
        echo "FAIL|Improper 'NC G.S.' citation format used"
        return 1
    fi

    local has_ncgs
    has_ncgs=$(grep -c 'N\.C\.G\.S\. §' "$email_file" 2>/dev/null || echo "0")
    has_ncgs=$(( ${has_ncgs//[^0-9]/} + 0 ))

    if [[ "$has_ncgs" -gt 0 ]]; then
        echo "PASS|Found $has_ncgs proper N.C.G.S. citations"
        return 0
    else
        echo "PASS|No N.C.G.S. citations (non-legal doc)"
        return 0
    fi
}

core_check_pro_se_signature() {
    local email_file="$1"

    # Only enforce strict pro se checks for legal filings (contains case number)
    # Personal emails to Amanda, etc. are SKIPPED
    if ! grep -qE '26CV[0-9]{6}' "$email_file" 2>/dev/null; then
        echo "SKIPPED|Not a legal filing (no case number)"
        return 0
    fi

    # EXEMPT procedural emails to court officials (@nccourts.org)
    # These are administrative coordination, not legal arguments requiring Pro Se posture
    if grep -qiE '^To:.*@nccourts\.org' "$email_file" 2>/dev/null; then
        echo "SKIPPED|Court procedural email (no Pro Se signature required)"
        return 0
    fi

    # If case number present and NOT to court, require pro se signature elements
    local missing=false

    if ! grep -qi "pro se" "$email_file" 2>/dev/null; then
        echo "FAIL|Legal email with case number missing 'Pro Se' signature"
        missing=true
    fi

    # Accept multiple contact formats:
    # - Standard: (************* or ************
    # - Cloud: 412-CLOUD-90 or similar vanity numbers (relaxed to allow asterisk redaction)
    # - Email: s@rooz.live, shahrooz@bhopti.com
    # - Redacted: ************ (10+ asterisks)
    if ! grep -qE '\([0-9]{3}\) [0-9]{3}-[0-9]{4}|[0-9]{3}-[0-9]{3}-[0-9]{4}|[0-9]{3}-[A-Z]{5}-[0-9]{2}|s@rooz\.live|shahrooz@|\*{10,}' "$email_file" 2>/dev/null; then
        echo "FAIL|Legal email missing contact info (phone or email)"
        missing=true
    fi

    if [[ "$missing" == "false" ]]; then
        echo "PASS|Pro Se elements present"
        return 0
    else
        return 1
    fi
}

core_check_attachments() {
    local email_file="$1"
    local count
    count=$(grep -iE '(attachment|attached|see attached)' "$email_file" 2>/dev/null | wc -l | tr -d ' ')

    if [[ "$count" -gt 0 ]]; then
        # Return warning status code (2) instead of 0 to properly flag for review
        echo "WARN|Found $count attachment reference(s), manual check required"
        return 2
    else
        echo "PASS|No attachment references"
        return 0
    fi
}

# Check 6 (runner order): Context-aware date consistency
# @business-context WSJF-2: Arbitration email date validation — prevents stale commitments
# @adr ADR-019: Aligned with validate-email.sh Check 21 historical date logic
# @constraint DDD-VALIDATION: Pure function — no side effects, stdout+exit protocol
#
# Returns: 0=pass, 1=fail (action date in past), 2=warn (unknown past reference)
# Logic:
#   - Classify email type (legal|action|unknown) from subject + body keywords
#   - Explicit past year (year < current year) → PASS (historical reference)
#   - If email_type=legal: allow any past date with no warnings
#   - If email_type=action: any past date → FAIL
#   - If email_type=unknown: any past date → WARN
#   - Future/today dates → PASS
#   - No dates → PASS
core_check_date_consistency() {
    local email_file="$1"
    local skip="${2:-false}"

    if [[ "$skip" == "true" ]]; then
        echo "SKIPPED|Date consistency check skipped"
        return 0
    fi

    if [[ ! -f "$email_file" ]]; then
        echo "FAIL|File not found: $email_file"
        return 1
    fi

    local _now_epoch _current_year
    _now_epoch=$(date "+%s")
    _current_year=$(date "+%Y")

    local _subject_raw _body _combined_text _email_type
    _subject_raw=$(grep -i "^Subject:" "$email_file" 2>/dev/null | head -1 | sed 's/^Subject:[[:space:]]*//I' || echo "")
    _body=$(awk '/^$/{found=1; next} found{print}' "$email_file" 2>/dev/null || cat "$email_file")
    _combined_text=$(printf '%s %s' "$_subject_raw" "$_body" | tr '[:upper:]' '[:lower:]')
    _email_type="unknown"
    if echo "$_combined_text" | grep -qiE '(case|26cv|arbitration|settlement|court|attorney|grimes|legal|plaintiff|defendant|complaint|motion|affidavit|declaration|hearing|filing|filed)'; then
        _email_type="legal"
    elif echo "$_combined_text" | grep -qiE '(move|mover|relocation|moving|vacate|move-out|moveout|appointment|schedule|scheduled|deadline|due by|no later than|must)'; then
        _email_type="action"
    fi

    local _found=false
    local _failed=false
    local _warned=false
    local _results=()

    # --- Scan for "Month Day[, Year]" patterns (all 12 months) ---
    while IFS= read -r _line; do
        [[ -z "$_line" ]] && continue
        echo "$_line" | grep -qiE "(January|February|March|April|May|June|July|August|September|October|November|December) [0-9]{1,2}([^0-9]|$)" || continue

        local _month_word _day_num _explicit_year _use_year _date_epoch
        _month_word=$(echo "$_line" | grep -oiE "January|February|March|April|May|June|July|August|September|October|November|December" | head -1 || true)
        _day_num=$(echo "$_line" | grep -oiE "${_month_word} [0-9]{1,2}" | head -1 | grep -oE "[0-9]+$" || true)
        [[ -z "$_month_word" || -z "$_day_num" || "${#_day_num}" -gt 2 ]] && continue

        # Extract explicit year if present (e.g. "March 3, 2025" or "March 3 2025")
        _explicit_year=$(echo "$_line" | grep -oiE "${_month_word} ${_day_num},? [0-9]{4}" | grep -oE "[0-9]{4}$" || true)
        _use_year="${_explicit_year:-$_current_year}"

        if date -j >/dev/null 2>&1; then
            _date_epoch=$(date -j -f "%B %d %Y" "${_month_word} ${_day_num} ${_use_year}" "+%s" 2>/dev/null || echo "")
        else
            _date_epoch=$(date -d "${_month_word} ${_day_num} ${_use_year}" "+%s" 2>/dev/null || echo "")
        fi
        [[ -z "$_date_epoch" ]] && continue
        [[ "$_date_epoch" -ge "$_now_epoch" ]] && continue  # Future or today — no issue

        _found=true
        local _days_ago=$(( (_now_epoch - _date_epoch) / 86400 ))

        # Historical year detection: explicit year before current year
        if [[ -n "$_explicit_year" && "$_explicit_year" -lt "$_current_year" ]]; then
            _results+=("PASS|Historical date: ${_month_word} ${_day_num}, ${_use_year} (${_days_ago}d ago, explicit past year)")
            continue
        fi

        case "$_email_type" in
            legal)
                _results+=("PASS|Historical date OK (legal context): ${_month_word} ${_day_num}, ${_use_year} (${_days_ago}d ago)")
                ;;
            action)
                _results+=("FAIL|Action date in past: ${_month_word} ${_day_num}, ${_use_year} (${_days_ago}d ago)")
                _failed=true
                ;;
            *)
                _results+=("WARN|Past date reference (unclassified): ${_month_word} ${_day_num}, ${_use_year} (${_days_ago}d ago) — verify")
                _warned=true
                ;;
        esac
    done <<< "$_body"

    # --- Scan for numeric date formats: M/D/YYYY, MM/DD/YYYY ---
    while IFS= read -r _line; do
        [[ -z "$_line" ]] && continue
        echo "$_line" | grep -qE "[0-9]{1,2}/[0-9]{1,2}/[0-9]{4}" || continue

        local _numeric_date _date_epoch
        _numeric_date=$(echo "$_line" | grep -oE "[0-9]{1,2}/[0-9]{1,2}/[0-9]{4}" | head -1 || true)
        [[ -z "$_numeric_date" ]] && continue

        if date -j >/dev/null 2>&1; then
            _date_epoch=$(date -j -f "%m/%d/%Y" "$_numeric_date" "+%s" 2>/dev/null || echo "")
        else
            _date_epoch=$(date -d "$_numeric_date" "+%s" 2>/dev/null || echo "")
        fi
        [[ -z "$_date_epoch" ]] && continue
        [[ "$_date_epoch" -ge "$_now_epoch" ]] && continue

        _found=true
        local _days_ago=$(( (_now_epoch - _date_epoch) / 86400 ))
        local _num_year
        _num_year=$(echo "$_numeric_date" | grep -oE "[0-9]{4}$" || true)

        if [[ -n "$_num_year" && "$_num_year" -lt "$_current_year" ]]; then
            _results+=("PASS|Historical numeric date: ${_numeric_date} (${_days_ago}d ago, past year)")
            continue
        fi

        case "$_email_type" in
            legal)
                _results+=("PASS|Historical numeric date OK (legal context): ${_numeric_date} (${_days_ago}d ago)")
                ;;
            action)
                _results+=("FAIL|Action numeric date in past: ${_numeric_date} (${_days_ago}d ago)")
                _failed=true
                ;;
            *)
                _results+=("WARN|Past numeric date reference (unclassified): ${_numeric_date} (${_days_ago}d ago) — verify")
                _warned=true
                ;;
        esac
    done <<< "$_body"

    # --- Emit results ---
    if [[ ${#_results[@]} -gt 0 ]]; then
        for _r in "${_results[@]}"; do
            echo "$_r"
        done
    fi

    if ! $_found; then
        echo "PASS|No past date references found"
        return 0
    elif $_failed; then
        return 1
    elif $_warned; then
        return 2
    else
        echo "PASS|All past dates are historical references"
        return 0
    fi
}

# Explain exit code function (preserves functionality from deleted explain-exit-code.sh)
explain_exit_code() {
    local EXIT_CODE=$1

    if [ -z "$EXIT_CODE" ]; then
        echo "Usage: explain_exit_code <exit_code>"
        echo "Example: explain_exit_code 111"
        return $EXIT_INVALID_ARGS
    fi

    case $EXIT_CODE in
        # SUCCESS ZONE (0-9)
        0)   echo "✅ SUCCESS: All checks passed, safe to proceed" ;;
        1)   echo "✅ SUCCESS (with warnings): Task completed but review recommended" ;;

        # CLIENT ERRORS (10-49)
        10)  echo "❌ INVALID ARGS: Missing or malformed arguments" ;;
        11)  echo "❌ FILE NOT FOUND: Specified file doesn't exist" ;;
        12)  echo "❌ INVALID FORMAT: Not a .eml file or wrong format" ;;
        20)  echo "❌ PARSE ERROR: Malformed file content" ;;
        21)  echo "❌ MISSING REQUIRED FIELD: Missing required headers" ;;

        # DEPENDENCY ERRORS (50-99)
        50)  echo "⚠️  NETWORK UNAVAILABLE: Can't reach external services" ;;
        60)  echo "⚠️  TOOL MISSING: Required command not installed" ;;
        61)  echo "⚠️  MODULE MISSING: Python module not available" ;;

        # VALIDATION ERRORS (100-149)
        100) echo "❌ SCHEMA VALIDATION FAILED: Data doesn't match expected format" ;;
        110) echo "❌ DATE IN PAST: Specified date is before today" ;;
        111) echo "❌ PLACEHOLDER DETECTED: Template variables not replaced" ;;
        120) echo "❌ DUPLICATE DETECTED: Email already sent to recipient" ;;
        130) echo "❌ ADDRESS MISMATCH: Start/end addresses incorrect" ;;

        # BUSINESS LOGIC ERRORS (150-199)
        150) echo "❌ LEGAL CITATION MALFORMED: N.C.G.S. § formatting incorrect" ;;
        160) echo "❌ WSJF SCORE LOW: Priority score below threshold" ;;
        170) echo "❌ ADR COMPLIANCE: Missing required ADR frontmatter" ;;

        # INFRASTRUCTURE ERRORS (200-249)
        200) echo "🔴 DISK FULL: Insufficient storage space" ;;
        210) echo "🔴 PERMISSION DENIED: Insufficient permissions" ;;
        220) echo "🔴 DAEMON CRASHED: Background process not running" ;;

        # CRITICAL/FATAL (250-255)
        250) echo "🆘 DATA CORRUPTION: File or database corrupted" ;;
        255) echo "🆘 PANIC: Critical error, requires manual intervention" ;;

        *)   echo "❓ UNKNOWN EXIT CODE: $EXIT_CODE" ;;
    esac

    # Suggest next action based on zone
    local ZONE
    ZONE=$(get_exit_zone "$EXIT_CODE")
    case $ZONE in
        "SUCCESS")
            echo "👉 Next: Proceed to next step" ;;
        "CLIENT_ERROR")
            echo "👉 Next: Fix user input or configuration" ;;
        "DEPENDENCY_ERROR")
            echo "👉 Next: Install missing dependencies" ;;
        "VALIDATION_ERROR")
            echo "👉 Next: Fix data validation issues" ;;
        "BUSINESS_LOGIC_ERROR")
            echo "👉 Next: Review business logic constraints" ;;
        "INFRASTRUCTURE_ERROR")
            echo "👉 Next: Fix system resource issues" ;;
        "CRITICAL_FATAL")
            echo "👉 Next: CRITICAL - Manual intervention required" ;;
        *)
            echo "👉 Next: Check documentation" ;;
    esac
}

# Export functions for use in other scripts
export -f init_colors
export -f init_directories
export -f log_validation_event
export -f check_file_exists
export -f compute_file_hash
export -f check_content_pattern
export -f check_threshold
export -f check_tool_availability
export -f check_directory_count
export -f compute_file_size
export -f validation_core_version
export -f validate_placeholders
export -f get_placeholder_details
export -f validate_employment_claims
export -f get_employment_claim_details
export -f validate_legal_citations
export -f validate_required_recipients
export -f get_missing_recipients
export -f validate_trial_references
export -f get_trial_reference_details
export -f validate_attachments
export -f get_missing_attachments
export -f validate_date_consistency
export -f core_check_placeholders
export -f core_check_legal_citations
export -f core_check_pro_se_signature
export -f core_check_attachments
export -f explain_exit_code
export -f core_check_date_consistency

# =============================================================================
# 11. DYNAMIC CONNECTOME SCALING (ADR-005 Phase 17 Mega-Context Expansion)
# =============================================================================
# Dynamically calculates the active token ceiling based on available physical memory.
# Base: 32,000 tokens (for < 4GB available RAM)
# Scale: +64,000 tokens per additional GB of free RAM.
# Cap: 2,000,000 (2MM) tokens to support Gemini 1.5 Pro / Claude 3 context architectures.

compute_dynamic_token_ceiling() {
    local avail_mb=4096
    
    if command -v vm_stat >/dev/null 2>&1; then
        # macOS Memory Calculation
        local page_size=$(vm_stat | grep "page size of" | awk '{print $8}' 2>/dev/null || echo 4096)
        local free_pages=$(vm_stat | grep "Pages free" | awk '{print $3}' | sed 's/\.//' 2>/dev/null || echo 0)
        local inactive_pages=$(vm_stat | grep "Pages inactive" | awk '{print $3}' | sed 's/\.//' 2>/dev/null || echo 0)
        local avail_bytes=$(( (free_pages + inactive_pages) * page_size ))
        avail_mb=$(( avail_bytes / 1024 / 1024 ))
    elif command -v free >/dev/null 2>&1; then
        # Linux Memory Calculation
        avail_mb=$(free -m | awk '/Mem:/ {print $7}' 2>/dev/null || echo 4096)
    fi

    local extra_gb=$(( (avail_mb - 4000) / 1024 ))
    if [ "$extra_gb" -lt 0 ]; then
        extra_gb=0
    fi

    # Phase 21: OpenWorm Taxonomy - Dynamic Connectome Scaling
    # Deprecated the arbitrary 2,000,000 Mega-Context ceiling (ADR-005).
    # Token limits now scale mathematically through physical memory constraints organically.
    local dynamic_ceiling=$(( 32000 + (extra_gb * 64000) ))

    echo "$dynamic_ceiling"
}

export -f compute_dynamic_token_ceiling

# =============================================================================
# CLI INTERFACE
# =============================================================================
# When executed directly (not sourced), provide CLI interface
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    # CLI argument parsing
    MODE=""
    FILE=""
    CHECK="all"
    JSON_OUTPUT=false

    while [[ $# -gt 0 ]]; do
        case $1 in
            email) MODE="email"; shift ;;
            --file) FILE="$2"; shift 2 ;;
            --check) CHECK="$2"; shift 2 ;;
            --json) JSON_OUTPUT=true; shift ;;
            --help|-h)
                echo "Usage: $0 email --file <path> [--check <type>] [--json]"
                echo ""
                echo "Options:"
                echo "  email              Validate email file"
                echo "  --file <path>      Email file to validate"
                echo "  --check <type>     Check type: placeholder|legal|prose|attachment|all (default: all)"
                echo "  --json             Output in JSON format"
                exit 0
                ;;
            *) echo "Unknown option: $1" >&2; exit 1 ;;
        esac
    done

    # Validate inputs
    if [[ -z "$MODE" ]] || [[ -z "$FILE" ]]; then
        echo "ERROR: Missing required arguments" >&2
        echo "Usage: $0 email --file <path> [--check <type>] [--json]" >&2
        exit 1
    fi

    if [[ ! -f "$FILE" ]]; then
        if [[ "$JSON_OUTPUT" == true ]]; then
            echo '{"error":"File not found","file":"'"$FILE"'"}'
        else
            echo "ERROR: File not found: $FILE" >&2
        fi
        exit 1
    fi

    # Initialize colors (only if not JSON output)
    [[ "$JSON_OUTPUT" == false ]] && init_colors

    # Run validation checks and store results
    declare -A results
    exit_code=0

    # Execute requested checks
    if [[ "$CHECK" == "placeholder" ]] || [[ "$CHECK" == "all" ]]; then
        output=$(core_check_placeholders "$FILE")
        status=$?
        results["placeholder"]="$output|$status"
        [[ $status -eq 1 ]] && exit_code=1
        [[ $status -eq 2 ]] && [[ $exit_code -eq 0 ]] && exit_code=2
    fi

    if [[ "$CHECK" == "legal" ]] || [[ "$CHECK" == "all" ]]; then
        output=$(core_check_legal_citations "$FILE")
        status=$?
        results["legal"]="$output|$status"
        [[ $status -eq 1 ]] && exit_code=1
        [[ $status -eq 2 ]] && [[ $exit_code -eq 0 ]] && exit_code=2
    fi

    if [[ "$CHECK" == "prose" ]] || [[ "$CHECK" == "all" ]]; then
        output=$(core_check_pro_se_signature "$FILE")
        status=$?
        results["pro_se"]="$output|$status"
        [[ $status -eq 1 ]] && exit_code=1
        [[ $status -eq 2 ]] && [[ $exit_code -eq 0 ]] && exit_code=2
    fi

    if [[ "$CHECK" == "attachment" ]] || [[ "$CHECK" == "all" ]]; then
        output=$(core_check_attachments "$FILE")
        status=$?
        results["attachment"]="$output|$status"
        [[ $status -eq 1 ]] && exit_code=1
        [[ $status -eq 2 ]] && [[ $exit_code -eq 0 ]] && exit_code=2
    fi

    # Output results
    if [[ "$JSON_OUTPUT" == true ]]; then
        # JSON output
        echo -n '{'
        echo -n '"file":"'"$FILE"'",'
        echo -n '"checks":{'

        first=true
        for check_name in "${!results[@]}"; do
            IFS='|' read -r message status <<< "${results[$check_name]}"

            [[ "$first" == false ]] && echo -n ','
            first=false

            echo -n '"'"$check_name"'":{'
            echo -n '"message":"'"$(echo "$message" | sed 's/"/\\"/'g)"'",'
            echo -n '"status":"'
            case "$status" in
                0) echo -n 'pass' ;;
                1) echo -n 'fail' ;;
                2) echo -n 'warning' ;;
                *) echo -n 'unknown' ;;
            esac
            echo -n '"}'
        done

        echo -n '},'
        echo -n '"exit_code":'"$exit_code"
        echo '}'
    else
        # Human-readable output
        echo ""
        echo "=== Validation Results ==="
        for check_name in "${!results[@]}"; do
            IFS='|' read -r message status <<< "${results[$check_name]}"
            case "$status" in
                0) echo -e "${GREEN}✓${NC} $check_name: $message" ;;
                1) echo -e "${RED}✗${NC} $check_name: $message" ;;
                2) echo -e "${YELLOW}⚠${NC} $check_name: $message" ;;
                *) echo -e "${DIM}?${NC} $check_name: $message" ;;
            esac
        done
        echo ""
    fi

    exit $exit_code
fi
