#!/usr/bin/env bash
# ay-aisp-validate.sh - Validate AISP proof requirements

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
AISP_CONFIG="${PROJECT_ROOT}/reports/yolife/aisp-config.json"
REPORTS_DIR="${PROJECT_ROOT}/reports"

if [[ ! -f "$AISP_CONFIG" ]]; then
    echo "❌ AISP configuration not found: $AISP_CONFIG"
    exit 1
fi

echo "🔍 Validating AISP proof requirements..."

# Validate skill validation proofs
echo "Checking ⟦Γ:SkillValidation⟧..."
if [[ -f "${REPORTS_DIR}/maturity/p0-validation-report.json" ]]; then
    persistence_verified=$(jq -r '.validation.persistence_verified' "${REPORTS_DIR}/maturity/p0-validation-report.json")
    if [[ "$persistence_verified" == "true" ]]; then
        echo "  ✅ persistence_verified"
    else
        echo "  ❌ persistence_verified: FAILED"
        exit 1
    fi
fi

# Validate ROAM+MYM proofs
echo "Checking ⟦Γ:ROAM+MYM⟧..."
if [[ -f "${REPORTS_DIR}/roam-assessment-enhanced.json" ]]; then
    staleness=$(jq -r '.staleness.age_days' "${REPORTS_DIR}/roam-assessment-enhanced.json")
    if [[ "$staleness" -lt 3 ]]; then
        echo "  ✅ staleness_<3d (${staleness}d)"
    else
        echo "  ❌ staleness_<3d: FAILED (${staleness}d)"
        exit 1
    fi
    
    mym_present=$(jq -e '.mym_scores.manthra and .mym_scores.yasna and .mym_scores.mithra' "${REPORTS_DIR}/roam-assessment-enhanced.json" &>/dev/null && echo "true" || echo "false")
    if [[ "$mym_present" == "true" ]]; then
        echo "  ✅ mym_scores_complete"
    else
        echo "  ❌ mym_scores_complete: FAILED"
        exit 1
    fi
fi

echo "✅ AISP proof requirements validated"
