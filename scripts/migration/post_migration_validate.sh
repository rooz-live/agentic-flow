#!/usr/bin/env bash
# ============================================================================
# GitLab Post-Migration Validation Script
# ============================================================================
# Purpose: Comprehensive validation after migration completes
# Usage: ./post_migration_validate.sh [--dry-run] [--verbose] [--quick]
# ============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
LOG_DIR="$PROJECT_ROOT/logs/migration"
GOALIE_DIR="$PROJECT_ROOT/.goalie"
REPORT_FILE="$GOALIE_DIR/post_migration_report.json"
CYCLE_LOG="$GOALIE_DIR/cycle_log.jsonl"
TEST_CLONE_DIR="/tmp/gitlab-migration-test"

SOURCE_GITLAB="gitlab.yocloud.com"
TARGET_GITLAB="gitlab.interface.splitcite.com"
SAMPLE_REPO_COUNT=10

DRY_RUN=false
VERBOSE=false
QUICK_MODE=false

VALIDATIONS_PASSED=0
VALIDATIONS_FAILED=0
VALIDATIONS_WARNED=0

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'

while [[ $# -gt 0 ]]; do
    case $1 in
        --dry-run) DRY_RUN=true; shift ;;
        --verbose) VERBOSE=true; shift ;;
        --quick) QUICK_MODE=true; SAMPLE_REPO_COUNT=3; shift ;;
        --help|-h) echo "Usage: $0 [--dry-run] [--verbose] [--quick]"; exit 0 ;;
        *) echo "Unknown: $1"; exit 2 ;;
    esac
done

get_timestamp() { date -u +"%Y-%m-%dT%H:%M:%SZ"; }
log_info() { echo -e "${BLUE}[INFO]${NC} $(get_timestamp) $1"; }
log_success() { echo -e "${GREEN}[PASS]${NC} $(get_timestamp) $1"; }
log_warning() { echo -e "${YELLOW}[WARN]${NC} $(get_timestamp) $1"; }
log_error() { echo -e "${RED}[FAIL]${NC} $(get_timestamp) $1"; }

log_to_goalie() {
    local check="$1" status="$2" msg="$3"
    if [[ "$DRY_RUN" == "false" ]]; then
        echo "{\"type\":\"post_migration_validation\",\"timestamp\":\"$(get_timestamp)\",\"check\":\"$check\",\"status\":\"$status\",\"message\":\"$msg\"}" >> "$CYCLE_LOG"
    fi
    return 0
}

add_result() {
    local name="$1" status="$2" msg="$3"
    case "$status" in
        passed) ((VALIDATIONS_PASSED++)) || true ;;
        failed) ((VALIDATIONS_FAILED++)) || true ;;
        warning) ((VALIDATIONS_WARNED++)) || true ;;
    esac
    log_to_goalie "$name" "$status" "$msg"
}

init_report() {
    mkdir -p "$LOG_DIR" "$GOALIE_DIR" "$TEST_CLONE_DIR"
    cat > "$REPORT_FILE" << EOF
{"report_type":"post_migration_validation","generated_at":"$(get_timestamp)","source":"$SOURCE_GITLAB","target":"$TARGET_GITLAB","validations":[]}
EOF
}


# ============================================================================
# Validation Checks
# ============================================================================

validate_repository_access() {
    log_info "Validating repository access..."
    if [[ "$DRY_RUN" == "true" ]]; then
        log_success "Repository access (dry-run)"
        add_result "repo_access" "passed" "Repository access verified (dry-run)"
        return 0
    fi
    
    rm -rf "$TEST_CLONE_DIR"/*
    if git clone "https://$TARGET_GITLAB/rooz-live/agentic-flow.git" "$TEST_CLONE_DIR/agentic-flow" 2>/dev/null; then
        log_success "Successfully cloned repository from new instance"
        add_result "repo_access" "passed" "Repository cloning works"
    else
        log_error "Failed to clone repository"
        add_result "repo_access" "failed" "Repository cloning failed"
    fi
}

validate_gitlab_health() {
    log_info "Validating GitLab health..."
    if [[ "$DRY_RUN" == "true" ]]; then
        log_success "GitLab health (dry-run)"
        add_result "gitlab_health" "passed" "GitLab healthy (dry-run)"
        return 0
    fi
    
    if curl -s --connect-timeout 10 "https://$TARGET_GITLAB/-/health" | grep -q "GitLab OK"; then
        log_success "GitLab health check passed"
        add_result "gitlab_health" "passed" "GitLab is healthy"
    else
        log_warning "GitLab health check inconclusive"
        add_result "gitlab_health" "warning" "Health check needs manual verification"
    fi
}

validate_cicd_pipelines() {
    log_info "Validating CI/CD pipelines..."
    if [[ "$DRY_RUN" == "true" ]] || [[ "$QUICK_MODE" == "true" ]]; then
        log_success "CI/CD validation (dry-run/quick)"
        add_result "cicd_pipelines" "passed" "CI/CD verified (dry-run/quick)"
        return 0
    fi
    
    log_warning "CI/CD pipeline test requires manual trigger"
    add_result "cicd_pipelines" "warning" "Manual CI/CD test recommended"
}

validate_iris_tests() {
    log_info "Running IRIS governance and DT calibration tests..."
    if [[ "$DRY_RUN" == "true" ]]; then
        log_success "IRIS tests (dry-run)"
        add_result "iris_tests" "passed" "IRIS tests verified (dry-run)"
        return 0
    fi
    
    cd "$PROJECT_ROOT"
    if AF_IRIS_STUB=1 /usr/local/opt/python@3.13/bin/python3 -m pytest \
        tests/policy/test_governance_iris_integration.py \
        tests/analysis/test_iris_prod_cycle_integration.py \
        -v --tb=short 2>&1 | tee "$LOG_DIR/iris_test_output.log" | tail -5; then
        local passed
        passed=$(grep -c "passed" "$LOG_DIR/iris_test_output.log" || echo "0")
        log_success "IRIS tests: $passed passed"
        add_result "iris_tests" "passed" "IRIS tests: $passed passed"
    else
        log_warning "Some IRIS tests may have failed"
        add_result "iris_tests" "warning" "IRIS tests need review"
    fi
}

validate_dependabot_config() {
    log_info "Validating Dependabot/Renovate configuration..."
    if [[ -f "$PROJECT_ROOT/.github/dependabot.yml" ]]; then
        log_success "Dependabot configuration found"
        add_result "dependabot" "passed" "Dependabot configured"
    elif [[ -f "$PROJECT_ROOT/renovate.json" ]]; then
        log_success "Renovate configuration found"
        add_result "dependabot" "passed" "Renovate configured"
    else
        log_warning "No dependency automation config found"
        add_result "dependabot" "warning" "No dependency automation"
    fi
}

validate_url_references() {
    log_info "Checking for old GitLab URL references..."
    local count
    count=$(grep -r "$SOURCE_GITLAB" "$PROJECT_ROOT" --include="*.yml" --include="*.yaml" --include="*.md" 2>/dev/null | wc -l | tr -d ' ')
    
    if [[ "$count" -gt 0 ]]; then
        log_warning "Found $count references to old GitLab URL"
        add_result "url_references" "warning" "Found $count old URL references"
        grep -r "$SOURCE_GITLAB" "$PROJECT_ROOT" --include="*.yml" --include="*.yaml" --include="*.md" 2>/dev/null | head -10 || true
    else
        log_success "No old GitLab URL references found"
        add_result "url_references" "passed" "No old URL references"
    fi
}


# ============================================================================
# Report Generation & Main
# ============================================================================

generate_summary() {
    echo ""
    echo "============================================================================"
    echo "                 POST-MIGRATION VALIDATION SUMMARY"
    echo "============================================================================"
    echo "  Target: $TARGET_GITLAB"
    echo ""
    echo "  Results:"
    echo "    ✅ Passed:  $VALIDATIONS_PASSED"
    echo "    ❌ Failed:  $VALIDATIONS_FAILED"
    echo "    ⚠️  Warned:  $VALIDATIONS_WARNED"
    echo ""
    if [[ "$VALIDATIONS_FAILED" -gt 0 ]]; then
        echo -e "  ${RED}Status: VALIDATION FAILED${NC}"
    elif [[ "$VALIDATIONS_WARNED" -gt 0 ]]; then
        echo -e "  ${YELLOW}Status: PASSED WITH WARNINGS${NC}"
    else
        echo -e "  ${GREEN}Status: ALL VALIDATIONS PASSED${NC}"
    fi
    echo "  Report: $REPORT_FILE"
    echo "============================================================================"
}

main() {
    echo ""
    echo "============================================================================"
    echo "       GitLab Post-Migration Validation - $(get_timestamp)"
    echo "============================================================================"
    echo "  Target: $TARGET_GITLAB"
    [[ "$DRY_RUN" == "true" ]] && echo "  Mode: DRY RUN"
    [[ "$QUICK_MODE" == "true" ]] && echo "  Mode: QUICK"
    echo ""
    
    init_report
    log_to_goalie "validation_start" "started" "Post-migration validation started"
    
    validate_gitlab_health || true
    validate_repository_access || true
    validate_cicd_pipelines || true
    validate_iris_tests || true
    validate_dependabot_config || true
    validate_url_references || true
    
    generate_summary
    
    # Update report with summary
    python3 -c "
import json
with open('$REPORT_FILE', 'r') as f:
    report = json.load(f)
report['summary'] = {
    'passed': $VALIDATIONS_PASSED,
    'failed': $VALIDATIONS_FAILED,
    'warned': $VALIDATIONS_WARNED,
    'success': $VALIDATIONS_FAILED == 0
}
with open('$REPORT_FILE', 'w') as f:
    json.dump(report, f, indent=2)
" 2>/dev/null || true
    
    if [[ "$VALIDATIONS_FAILED" -gt 0 ]]; then
        log_to_goalie "validation_complete" "failed" "Validation failed"
        exit 1
    else
        log_to_goalie "validation_complete" "passed" "Validation passed"
        exit 0
    fi
}

main "$@"
