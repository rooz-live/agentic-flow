#!/usr/bin/env bash
#
# trial-prep-workflow.sh
# Integrated Trial Preparation Workflow for MAA Cases
#
# Orchestrates:
# 1. Evidence bundle population guidance (manual)
# 2. NAPI-RS validation (automated)
# 3. VibeThinker legal argument review (automated)
# 4. Final readiness report
#
# Deadline: 2026-03-03 (Trial #1) — 11 days remaining
# WSJF: 30.0 (CRITICAL PATH)
#
# DoR:
# - vibesthinker/legal_argument_reviewer.py functional
# - rust/ffi evidence_validator compiled (or stub validation)
# - Evidence bundle directories exist
#
# DoD:
# - Evidence bundle status: COMPLETE or gaps documented
# - Legal arguments reviewed: coherence score ≥85/100
# - Final report generated with action items prioritized by WSJF

set -euo pipefail

# Configuration
BASE_DIR="/Users/shahroozbhopti/Documents/Personal/CLT/MAA/Uptown/BHOPTI-LEGAL/01-ACTIVE-CRITICAL"
CASE_26CV005596="$BASE_DIR/MAA-26CV005596-590"
CASE_26CV007491="$BASE_DIR/MAA-26CV007491-590"
EVIDENCE_BUNDLE="$CASE_26CV005596/EVIDENCE_BUNDLE"
PROJECT_ROOT="/Users/shahroozbhopti/Documents/code/investing/agentic-flow"
REPORTS_DIR="$PROJECT_ROOT/reports"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1" >&2; }
log_step() { echo -e "${BLUE}[STEP]${NC} $1"; }

# Create reports directory
mkdir -p "$REPORTS_DIR"

# ═══════════════════════════════════════════════════════════════════════════
# PHASE 1: Evidence Bundle Status Check
# ═══════════════════════════════════════════════════════════════════════════

check_evidence_bundle() {
    log_step "Phase 1: Evidence Bundle Status Check"
    echo ""
    
    local lease_count=$(find "$EVIDENCE_BUNDLE/03_LEASE_AGREEMENTS" -type f 2>/dev/null | wc -l | tr -d ' ')
    local workorder_count=$(find "$EVIDENCE_BUNDLE/05_HABITABILITY_EVIDENCE" -type f -name "*.png" -o -name "*.jpg" 2>/dev/null | wc -l | tr -d ' ')
    local photo_count=$(find "$EVIDENCE_BUNDLE/05_HABITABILITY_EVIDENCE" -type f -name "*.heic" -o -name "*.jpg" 2>/dev/null | wc -l | tr -d ' ')
    local financial_count=$(find "$EVIDENCE_BUNDLE/06_FINANCIAL_RECORDS" -type f 2>/dev/null | wc -l | tr -d ' ')
    
    echo "Evidence Bundle Status:"
    echo "  03_LEASE_AGREEMENTS:       $lease_count files (expected: 5+)"
    echo "  05_HABITABILITY_EVIDENCE:  $((workorder_count + photo_count)) files (expected: 40+)"
    echo "  06_FINANCIAL_RECORDS:      $financial_count files (expected: 1+)"
    echo ""
    
    # Determine overall status
    local bundle_complete=true
    
    if [[ $lease_count -lt 5 ]]; then
        log_warn "Lease agreements incomplete: $lease_count/5"
        bundle_complete=false
    else
        log_info "✅ Lease agreements: COMPLETE"
    fi
    
    if [[ $((workorder_count + photo_count)) -lt 40 ]]; then
        log_warn "Habitability evidence incomplete: $((workorder_count + photo_count))/40"
        bundle_complete=false
    else
        log_info "✅ Habitability evidence: COMPLETE"
    fi
    
    if [[ $financial_count -eq 0 ]]; then
        log_error "❌ Financial records MISSING (CRITICAL)"
        bundle_complete=false
    else
        log_info "✅ Financial records: COMPLETE"
    fi
    
    echo ""
    
    if [[ "$bundle_complete" == false ]]; then
        log_error "Evidence bundle INCOMPLETE — run populate-evidence-bundle.sh"
        echo ""
        echo "Quick fix:"
        echo "  $PROJECT_ROOT/scripts/populate-evidence-bundle.sh"
        echo ""
        return 1
    else
        log_info "Evidence bundle: READY FOR VALIDATION"
        return 0
    fi
}

# ═══════════════════════════════════════════════════════════════════════════
# PHASE 2: NAPI-RS Evidence Validation (or stub)
# ═══════════════════════════════════════════════════════════════════════════

validate_evidence() {
    log_step "Phase 2: Evidence Validation"
    echo ""
    
    # Check if NAPI-RS bindings built
    if [[ -f "$PROJECT_ROOT/rust/ffi/index.node" ]]; then
        log_info "NAPI-RS bindings detected — running Rust validator"
        
        # Run Node.js validation script
        node -e "
        const { EvidenceValidator } = require('$PROJECT_ROOT/rust/ffi');
        const validator = new EvidenceValidator('$EVIDENCE_BUNDLE');
        
        (async () => {
            const result = await validator.bundleHealthCheck();
            console.log(result);
            require('fs').writeFileSync('$REPORTS_DIR/evidence_validation.json', result);
        })();
        " 2>/dev/null || {
            log_warn "NAPI-RS validation failed — using Python fallback"
            validate_evidence_python
        }
    else
        log_warn "NAPI-RS bindings not built — using Python validation"
        validate_evidence_python
    fi
}

validate_evidence_python() {
    # Python fallback validation
    python3 - <<'EOF'
import json
import os
from pathlib import Path

evidence_bundle = Path(os.environ["EVIDENCE_BUNDLE"])
reports_dir = Path(os.environ["REPORTS_DIR"])

def count_files(pattern):
    return len(list(evidence_bundle.rglob(pattern)))

validation = {
    "lease_agreements": {
        "total": count_files("03_LEASE_AGREEMENTS/*"),
        "status": "COMPLETE" if count_files("03_LEASE_AGREEMENTS/*") >= 5 else "INCOMPLETE"
    },
    "habitability_evidence": {
        "total": count_files("05_HABITABILITY_EVIDENCE/*"),
        "status": "COMPLETE" if count_files("05_HABITABILITY_EVIDENCE/*") >= 40 else "INCOMPLETE"
    },
    "financial_records": {
        "total": count_files("06_FINANCIAL_RECORDS/*"),
        "status": "COMPLETE" if count_files("06_FINANCIAL_RECORDS/*") > 0 else "MISSING"
    }
}

validation["overall_health"] = "TRIAL_READY" if all(
    v["status"] == "COMPLETE" for v in validation.values()
) else "INCOMPLETE"

output = reports_dir / "evidence_validation.json"
output.write_text(json.dumps(validation, indent=2))
print(json.dumps(validation, indent=2))
EOF
    
    log_info "Python validation complete → $REPORTS_DIR/evidence_validation.json"
}

# ═══════════════════════════════════════════════════════════════════════════
# PHASE 3: VibeThinker Legal Argument Review
# ═══════════════════════════════════════════════════════════════════════════

review_legal_arguments() {
    log_step "Phase 3: Legal Argument Review (VibeThinker)"
    echo ""
    
    # Check if Answer/Motion files exist
    local answer_file="$CASE_26CV007491/COURT-FILINGS/ANSWER-TO-SUMMARY-EJECTMENT-26CV007491-590.md"
    local motion_file="$CASE_26CV007491/COURT-FILINGS/MOTION-TO-CONSOLIDATE-26CV007491-590.md"
    
    if [[ ! -f "$answer_file" ]]; then
        log_error "Answer file not found: $answer_file"
        return 1
    fi
    
    log_info "Analyzing Answer to Summary Ejectment..."
    python3 "$PROJECT_ROOT/vibesthinker/legal_argument_reviewer.py" \
        --file "$answer_file" \
        --counter-args 5 \
        --output "$REPORTS_DIR/answer_analysis.json" \
        > "$REPORTS_DIR/answer_analysis.txt" 2>&1
    
    log_info "✅ Answer analysis → $REPORTS_DIR/answer_analysis.json"
    
    if [[ -f "$motion_file" ]]; then
        log_info "Analyzing Motion to Consolidate..."
        python3 "$PROJECT_ROOT/vibesthinker/legal_argument_reviewer.py" \
            --file "$motion_file" \
            --counter-args 3 \
            --output "$REPORTS_DIR/motion_analysis.json" \
            > "$REPORTS_DIR/motion_analysis.txt" 2>&1
        
        log_info "✅ Motion analysis → $REPORTS_DIR/motion_analysis.json"
    fi
    
    # Parse coherence scores
    local answer_score=$(python3 -c "
import json
data = json.load(open('$REPORTS_DIR/answer_analysis.json'))
print(f'{data[\"metrics\"][\"overall_strength\"]:.1f}')
" 2>/dev/null || echo "N/A")
    
    echo ""
    log_info "Answer Coherence Score: $answer_score/100"
    
    if [[ "$answer_score" != "N/A" ]] && (( $(echo "$answer_score < 85" | bc -l) )); then
        log_warn "Coherence score below threshold (85) — review gaps before filing"
    else
        log_info "✅ Coherence score acceptable"
    fi
}

# ═══════════════════════════════════════════════════════════════════════════
# PHASE 4: Generate Final Readiness Report
# ═══════════════════════════════════════════════════════════════════════════

generate_readiness_report() {
    log_step "Phase 4: Final Readiness Report"
    echo ""
    
    local report_file="$REPORTS_DIR/TRIAL_READINESS_$(date +%Y-%m-%d).md"
    
    cat > "$report_file" << 'REPORT_HEADER'
# Trial Readiness Report
**Generated**: $(date -u +"%Y-%m-%dT%H:%M:%SZ")
**Trial #1 (26CV005596)**: 2026-03-03 (Habitability)
**Trial #2 (26CV007491)**: 2026-03-10 (Eviction)
**Days Remaining**: 11 (Trial #1), 18 (Trial #2)

---

## Executive Summary

REPORT_HEADER
    
    # Parse validation results
    local overall_health=$(python3 -c "
import json
data = json.load(open('$REPORTS_DIR/evidence_validation.json'))
print(data.get('overall_health', 'UNKNOWN'))
" 2>/dev/null || echo "UNKNOWN")
    
    local answer_score=$(python3 -c "
import json
try:
    data = json.load(open('$REPORTS_DIR/answer_analysis.json'))
    print(f'{data[\"metrics\"][\"overall_strength\"]:.1f}')
except:
    print('N/A')
" 2>/dev/null || echo "N/A")
    
    cat >> "$report_file" << REPORT_SUMMARY
**Evidence Bundle Status**: $overall_health
**Answer Coherence Score**: $answer_score/100
**Overall Readiness**: $(if [[ "$overall_health" == "TRIAL_READY" ]] && [[ "$answer_score" != "N/A" ]] && (( $(echo "$answer_score >= 85" | bc -l) )); then echo "✅ READY"; else echo "⚠️  ACTION REQUIRED"; fi)

---

## Evidence Bundle Health

REPORT_SUMMARY
    
    python3 -c "
import json
data = json.load(open('$REPORTS_DIR/evidence_validation.json'))
for category, details in data.items():
    if category == 'overall_health': continue
    status_icon = '✅' if details['status'] == 'COMPLETE' else ('⚠️' if details['status'] == 'INCOMPLETE' else '❌')
    print(f'{status_icon} **{category}**: {details[\"total\"]} files — {details[\"status\"]}')
" >> "$report_file" 2>/dev/null || echo "Error parsing evidence validation" >> "$report_file"
    
    cat >> "$report_file" << 'REPORT_ARGS'

---

## Legal Argument Analysis

REPORT_ARGS
    
    python3 -c "
import json
try:
    data = json.load(open('$REPORTS_DIR/answer_analysis.json'))
    print(f'**Coherence Gaps Detected**: {len(data[\"coherence_gaps\"])}')
    print(f'**Critical Gaps**: {sum(1 for g in data[\"coherence_gaps\"] if g[\"severity\"] == \"Critical\")}')
    print(f'**Citations**: {data[\"metrics\"][\"citation_count\"]}')
    print(f'**Evidence References**: {data[\"metrics\"][\"evidence_references\"]}')
    print()
    print('### Top Recommendations:')
    for i, rec in enumerate(data['recommendations'][:3], 1):
        print(f'{i}. {rec}')
except Exception as e:
    print(f'Error parsing argument analysis: {e}')
" >> "$report_file" 2>/dev/null
    
    cat >> "$report_file" << 'REPORT_ACTIONS'

---

## Action Items (WSJF-Prioritized)

REPORT_ACTIONS
    
    # Generate WSJF-prioritized actions based on gaps
    python3 - >> "$report_file" <<'PYTHON_ACTIONS'
import json

try:
    evidence = json.load(open(f"{os.environ['REPORTS_DIR']}/evidence_validation.json"))
    answer = json.load(open(f"{os.environ['REPORTS_DIR']}/answer_analysis.json"))
    
    actions = []
    
    # Evidence gaps
    if evidence.get('habitability_evidence', {}).get('status') != 'COMPLETE':
        actions.append({
            'priority': 'P0',
            'wsjf': 35.0,
            'task': 'Populate habitability evidence (40+ work orders + photos)',
            'time': '4-8 hours',
            'blocker': True
        })
    
    if evidence.get('financial_records', {}).get('status') == 'MISSING':
        actions.append({
            'priority': 'P0',
            'wsjf': 30.0,
            'task': 'Export rent payment ledger (22 months)',
            'time': '30 minutes',
            'blocker': True
        })
    
    # Argument gaps
    critical_gaps = sum(1 for g in answer.get('coherence_gaps', []) if g['severity'] == 'Critical')
    if critical_gaps > 0:
        actions.append({
            'priority': 'P1',
            'wsjf': 28.0,
            'task': f'Address {critical_gaps} critical coherence gaps in Answer',
            'time': '1-2 hours',
            'blocker': False
        })
    
    if answer['metrics']['citation_count'] < 3:
        actions.append({
            'priority': 'P1',
            'wsjf': 25.0,
            'task': 'Add statutory citations (N.C.G.S. § 42-42, § 42-37.1)',
            'time': '30 minutes',
            'blocker': False
        })
    
    # Sort by WSJF
    actions.sort(key=lambda x: x['wsjf'], reverse=True)
    
    for i, action in enumerate(actions, 1):
        blocker_flag = '🔴 BLOCKER' if action['blocker'] else ''
        print(f"{i}. **[{action['priority']}]** {action['task']} {blocker_flag}")
        print(f"   - WSJF: {action['wsjf']}")
        print(f"   - Time: {action['time']}")
        print()
    
except Exception as e:
    print(f"### Error generating action items: {e}")
    print()
    print("**Manual Review Required**")
PYTHON_ACTIONS
    
    cat >> "$report_file" << 'REPORT_FOOTER'

---

## Next Steps

1. **Address P0 blockers** — Evidence collection must complete before validation
2. **Review coherence gaps** — `reports/answer_analysis.txt` for detailed recommendations
3. **Run full validation** — After evidence populated, re-run workflow to verify
4. **Final review** — Print and file documents by Monday 2026-02-24

**Workflow Command**:
```bash
./scripts/trial-prep-workflow.sh
```

**Emergency Contact**:
- Doug Mumper (Opposing Counsel): ************* (*************)

REPORT_FOOTER
    
    log_info "Report generated: $report_file"
    echo ""
    cat "$report_file"
}

# ═══════════════════════════════════════════════════════════════════════════
# Main Execution
# ═══════════════════════════════════════════════════════════════════════════

main() {
    log_info "Trial Preparation Workflow — MAA Cases"
    log_info "Trial #1: 2026-03-03 (11 days) | Trial #2: 2026-03-10 (18 days)"
    echo ""
    
    # Phase 1: Check evidence bundle status
    if check_evidence_bundle; then
        # Phase 2: Validate evidence (Rust or Python)
        validate_evidence
        
        # Phase 3: Review legal arguments
        review_legal_arguments
        
        # Phase 4: Generate readiness report
        generate_readiness_report
        
        log_info "Trial preparation workflow complete"
        log_info "Review: $REPORTS_DIR/TRIAL_READINESS_$(date +%Y-%m-%d).md"
    else
        log_error "Evidence bundle incomplete — populate first, then re-run"
        log_error "Run: ./scripts/populate-evidence-bundle.sh"
        exit 1
    fi
}

main "$@"
