#!/usr/bin/env bash
# ci-email-validation-integration.sh
# Integrates valid*.sh scripts with CI/CD pipeline
# Runs validation sweep and reports to GitHub Actions

set -euo pipefail

# Paths
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Source robust exit codes
if [[ -f "$PROJECT_ROOT/scripts/validation-core.sh" ]]; then
    source "$PROJECT_ROOT/scripts/validation-core.sh"
else
    EXIT_SUCCESS=0; EXIT_INVALID_ARGS=10; EXIT_FILE_NOT_FOUND=11
    EXIT_TOOL_MISSING=60; EXIT_SCHEMA_VALIDATION_FAILED=100
fi

EMAILS_BASE="/Users/shahroozbhopti/Documents/Personal/CLT/MAA/Uptown/BHOPTI-LEGAL/02-EMAILS"
META_DIR="${EMAILS_BASE}/.meta"
REPORT_FILE="${META_DIR}/ci-validation-report.json"

# Ensure meta directory exists
mkdir -p "$META_DIR"

# Initialize report
init_report() {
    cat > "$REPORT_FILE" << EOF
{
  "run_id": "${GITHUB_RUN_ID:-local-$(date +%s)}",
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "status": "running",
  "summary": {
    "total": 0,
    "passed": 0,
    "failed": 0,
    "warnings": 0
  },
  "validations": []
}
EOF
}

# Run validation and capture results
run_ci_validation() {
    local email_file="$1"
    local email_name=$(basename "$email_file")

    echo "::group::Validating $email_name"

    # Run unified validation orchestrator
    local output
    local exit_code

    if output=$("${SCRIPT_DIR}/unified-validation-orch.sh" validate "$email_file" full 2>&1); then
        exit_code=0
    else
        exit_code=$?
    fi

    # Parse results
    local score=0
    local issues=()

    # Extract score from output
    if [[ "$output" =~ score=([0-9]+) ]]; then
        score="${BASH_REMATCH[1]}"
    fi

    # Determine status
    local status
    if [[ $exit_code -eq 0 ]]; then
        status="passed"
        echo "✅ $email_name - PASSED (score: $score)"
    elif [[ $exit_code -eq 2 ]]; then
        status="warning"
        echo "⚠️  $email_name - WARNING (score: $score)"
    else
        status="failed"
        echo "❌ $email_name - FAILED (score: $score)"
    fi

    # Add to report
    python3 << EOF
import json
with open("$REPORT_FILE", "r") as f:
    report = json.load(f)

report["validations"].append({
    "email": "$email_name",
    "status": "$status",
    "exit_code": $exit_code,
    "score": $score,
    "output": """${output//"/\\"}"""
})

report["summary"]["total"] += 1
report["summary"]["${status}"] += 1

with open("$REPORT_FILE", "w") as f:
    json.dump(report, f, indent=2)
EOF

    echo "::endgroup::"

    return $exit_code
}

# Generate GitHub Actions annotations
generate_annotations() {
    local report_file="$1"

    python3 << EOF
import json
import sys

with open("$report_file", "r") as f:
    report = json.load(f)

for validation in report["validations"]:
    if validation["status"] == "failed":
        print(f"::error file={validation['email']},title=Validation Failed::{validation['email']} failed validation with score {validation['score']}")
    elif validation["status"] == "warning":
        print(f"::warning file={validation['email']},title=Validation Warning::{validation['email']} has warnings (score: {validation['score']})")

summary = report["summary"]
print(f"\n📊 Validation Summary: {summary['passed']}/{summary['total']} passed, {summary['warnings']} warnings, {summary['failed']} failed")

if summary["failed"] > 0:
    sys.exit(1)
EOF
}

# Main execution
main() {
    echo "=== CI Email Validation Integration ==="
    echo "Discover/Consolidate THEN extend"
    echo ""

    # CSQBM Governance Constraint: Now/Next/Later UI Alignment

    init_report

    # Count emails to validate
    local validated_count=$(find "${EMAILS_BASE}/validated" -name "*.eml" -type f 2>/dev/null | wc -l)
    echo "Found $validated_count emails in validated/ directory"
    echo ""

    # Run validation on each email
    local failed=0
    for email_file in "${EMAILS_BASE}/validated"/*.eml; do
        if [[ -f "$email_file" ]]; then
            if ! run_ci_validation "$email_file"; then
                ((failed++)) || true
            fi
        fi
    done

    # Finalize report
    python3 << EOF
import json
with open("$REPORT_FILE", "r") as f:
    report = json.load(f)

report["status"] = "completed"
report["completed_at"] = "$(date -u +%Y-%m-%dT%H:%M:%SZ)"

with open("$REPORT_FILE", "w") as f:
    json.dump(report, f, indent=2)

print(f"\nReport saved to: $REPORT_FILE")
EOF

    # Generate annotations
    echo ""
    generate_annotations "$REPORT_FILE"

    # Exit with failure if any validations failed
    if [[ $failed -gt 0 ]]; then
        echo ""
        echo "❌ $failed validation(s) failed"
        exit 1
    fi

    echo ""
    echo "✅ All validations passed"
}

# Run main if executed directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
