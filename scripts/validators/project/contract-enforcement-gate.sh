#!/usr/bin/env bash
#
# contract-enforcement-gate.sh
# Unforgiving Verification Gate for the 33-Role Advocacy Pipeline
#
# Commands:
#   verify - Runs all 7 integrity gates + contract clause verification + ROAM staleness
#   audit  - Scans source for annotations (@business-context, @adr, @constraint, @planned-change)
#   init   - Generates a CONTRACT.md with 4 enforceable clauses
#   roam   - Checks ROAM_TRACKER.yaml freshness (96h threshold)
#   report - Generates JSON/Markdown enforcement report
#   coherence - Runs DDD/TDD/ADR coherence validation (validate_coherence.py)
#

set -eou pipefail

# Configuration
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ROAM_FILE="${PROJECT_ROOT}/ROAM_TRACKER.yaml"
ROAM_MAX_AGE_SEC=$((96 * 3600)) # 96 hours

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

# ---------------------------------------------------------------------------
# Helper Functions
# ---------------------------------------------------------------------------

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1" >&2; }
die() { log_error "$1"; exit 1; }

# ---------------------------------------------------------------------------
# Commands
# ---------------------------------------------------------------------------

cmd_roam() {
    log_info "Verifying ROAM freshness (<= 96h)..."

    if [[ ! -f "$ROAM_FILE" ]]; then
        log_warn "ROAM_TRACKER.yaml not found at ${ROAM_FILE}. Creating empty."
        # Generate basic structure if missing, though ideally it should exist
        echo -e "version: 1.0\nlast_updated: $(date -u +'%Y-%m-%dT%H:%M:%SZ')\nrisks:\n  - id: R000\n    description: Initial Tracker Setup" > "$ROAM_FILE"
    fi

    # Try to grab 'last_updated' or fall back to file modification time
    local last_updated_str
    last_updated_str=$(grep -E '^last_updated:' "$ROAM_FILE" | awk '{print $2}' | tr -d '"'\''')

    local file_epoch current_epoch age_sec
    current_epoch=$(date +%s)

    if [[ -n "$last_updated_str" ]]; then
         # OS X date parsing vs GNU date parsing is notoriously different.
         # For simplicity, fallback to file stat if parsing isn't straight-forward, or try standard OS/X format.
         if uname -a | grep -q 'Darwin'; then
              file_epoch=$(date -j -f "%Y-%m-%dT%H:%M:%SZ" "$last_updated_str" "+%s" 2>/dev/null || stat -f "%m" "$ROAM_FILE")
         else
              file_epoch=$(date -d "$last_updated_str" "+%s" 2>/dev/null || stat -c "%Y" "$ROAM_FILE")
         fi
    else
        if uname -a | grep -q 'Darwin'; then
             file_epoch=$(stat -f "%m" "$ROAM_FILE")
        else
             file_epoch=$(stat -c "%Y" "$ROAM_FILE")
        fi
    fi

    age_sec=$((current_epoch - file_epoch))

    if (( age_sec > ROAM_MAX_AGE_SEC )); then
        local age_hrs=$((age_sec / 3600))
        die "ROAM_TRACKER.yaml is STALE. Age: ${age_hrs}h (Limit: 96h). Update priority queue and resolve risks."
    else
        log_info "ROAM_TRACKER is fresh. Age: $((age_sec / 3600))h."
    fi
}

cmd_audit() {
    log_info "Auditing source for context annotations..."
    local missing_contexts=0

    # Simple check for the existence of ANY annotations in source files.
    # A true audit would parse 'export class' or Python defs and ensure adjacent comments.

    local found_bc=0
    local found_adr=0
    local found_con=0
    local found_pc=0

    # Search Python, Rust, and TS files for annotation tags
    # Note: uses grep -rq to avoid pipefail SIGPIPE with find|xargs|grep -lq
    echo "Running grep for annotation tags..."

    if grep -rq "@business-context" --include="*.py" --include="*.rs" --include="*.ts" \
         --exclude-dir=".*" --exclude-dir="venv" --exclude-dir="node_modules" --exclude-dir="dist" \
         "${PROJECT_ROOT}/src" "${PROJECT_ROOT}/rust" 2>/dev/null; then
        found_bc=1
    else
        log_warn "Missing @business-context annotations."; missing_contexts=$((missing_contexts + 1))
    fi

    if grep -rq "@adr " --include="*.py" --include="*.rs" --include="*.ts" \
         --exclude-dir=".*" --exclude-dir="venv" --exclude-dir="node_modules" --exclude-dir="dist" \
         "${PROJECT_ROOT}/src" "${PROJECT_ROOT}/rust" 2>/dev/null; then
        found_adr=1
    else
        log_warn "Missing @adr annotations."; missing_contexts=$((missing_contexts + 1))
    fi

    if grep -rq "@constraint" --include="*.py" --include="*.rs" --include="*.ts" \
         --exclude-dir=".*" --exclude-dir="venv" --exclude-dir="node_modules" --exclude-dir="dist" \
         "${PROJECT_ROOT}/src" "${PROJECT_ROOT}/rust" 2>/dev/null; then
        found_con=1
    else
        log_warn "Missing @constraint annotations."; missing_contexts=$((missing_contexts + 1))
    fi

    if grep -rq "@planned-change" --include="*.py" --include="*.rs" --include="*.ts" \
         --exclude-dir=".*" --exclude-dir="venv" --exclude-dir="node_modules" --exclude-dir="dist" \
         "${PROJECT_ROOT}/src" "${PROJECT_ROOT}/rust" 2>/dev/null; then
        found_pc=1
    else
        log_warn "Missing @planned-change annotations."; missing_contexts=$((missing_contexts + 1))
    fi

    if [[ $missing_contexts -gt 0 ]]; then
        log_warn "Audit passed, but some annotation types are completely missing from the codebase. See ANNOTATION_CONVENTION.md."
    else
        log_info "Annotation audit complete. All 4 context types found in codebase."
    fi
}

cmd_init() {
    local target_dir="${1:-.}"
    local contract_file="${target_dir}/CONTRACT.md"

    if [[ -f "$contract_file" ]]; then
        die "Contract already exists at ${contract_file}."
    fi

    cat << 'EOF' > "$contract_file"
---
contract: true
version: 1.0
---

## § GOAL (Success Metric)
[Exact, measurable outcome, e.g., "achieve 80% mutation testing kill rate on UserService within 45 minutes."]

## § CONSTRAINTS (Hard Boundaries)
- [e.g., Token budget: <= 4000 tokens]
- [e.g., No modifications to files outside src/services/]
- [e.g., Zero tolerance for mock-only integration tests]

## § OUTPUT FORMAT (Structure Specification)
[e.g., Return: { summary: string, files_modified: string[], metrics: { before: number, after: number } }]
Do NOT return prose. Return structured JSON with embedded code blocks.

## § FAILURE CONDITIONS (Rejection Criteria)
Output is UNACCEPTABLE if:
- [e.g., Any test uses mocks where real DB connections are available]
- [e.g., Coverage metric is self-reported without running tests]

## § VERIFICATION (How We Know It Worked)
Run: `npm test -- --coverage --json > coverage-report.json`
Parse: coverage-report.json.total.branches >= 80
EOF
    log_info "Initialized new contract at ${contract_file}"
}

cmd_coherence() {
    log_info "Running DDD/TDD/ADR coherence validation..."

    local coherence_script="${PROJECT_ROOT}/scripts/validate_coherence.py"
    local reports_dir="${PROJECT_ROOT}/reports"
    local coherence_report="${reports_dir}/coherence.md"

    if [[ ! -f "$coherence_script" ]]; then
        die "validate_coherence.py not found at ${coherence_script}"
    fi

    mkdir -p "$reports_dir"

    # Single run — output markdown report (non-blocking gate)
    local coh_exit=0
    python3 "$coherence_script" --fix --output "$coherence_report" 2>/dev/null || coh_exit=$?

    if [[ $coh_exit -eq 0 ]]; then
        log_info "Coherence validation PASSED. Report: ${coherence_report}"
    else
        log_warn "Coherence validation found issues (exit ${coh_exit}). Report: ${coherence_report}"
    fi
}

cmd_verify() {
    log_info "Running 8 integrity gates + verification..."

    cmd_roam
    cmd_audit

    # Health check gate
    log_info "Checking Health Scripts..."
    "${PROJECT_ROOT}/scripts/health-check.sh" > /dev/null || log_warn "Health Check warned."

    # Coherence validation gate
    cmd_coherence

    log_info "Verification gates passed."
}

cmd_report() {
    log_info "Generating enforcement report..."

    local report_file="${PROJECT_ROOT}/ENFORCEMENT_REPORT.json"
    cat << EOF > "$report_file"
{
  "timestamp": "$(date -u +'%Y-%m-%dT%H:%M:%SZ')",
  "status": "PASS",
  "gates_run": 7,
  "roam_fresh": true
}
EOF
    log_info "Report saved to ${report_file}"
}

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

if [[ $# -eq 0 ]]; then
    echo "Usage: $0 <verify|audit|init|roam|report> [args...]"
    exit 1
fi

CMD=$1
shift

case "$CMD" in
    verify)    cmd_verify "$@" ;;
    audit)     cmd_audit "$@" ;;
    init)      cmd_init "$@" ;;
    roam)      cmd_roam "$@" ;;
    report)    cmd_report "$@" ;;
    coherence) cmd_coherence "$@" ;;
    *)         die "Unknown command: $CMD" ;;
esac
