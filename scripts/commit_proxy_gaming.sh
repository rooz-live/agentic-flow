#!/bin/bash
# Commit script for P2-TRUTH Proxy Gaming Detection Implementation
# Run this script to commit and validate all changes

set -e
cd "$(dirname "$0")/.."

echo "=============================================="
echo "P2-TRUTH: PROXY GAMING DETECTION COMMIT"
echo "=============================================="
echo ""

# Step 1: Show git status
echo "=== Step 1: Git Status ==="
git status --short
echo ""

# Step 2: Stage all relevant files
echo "=== Step 2: Staging Files ==="
git add .github/workflows/build-test.yml
git add scripts/agentic/pattern_logger.py
git add scripts/agentic/alignment_checker.py
git add scripts/test_proxy_gaming.py
git add scripts/validate_proxy_gaming.sh
git add scripts/commit_proxy_gaming.sh
echo "Files staged successfully"
echo ""

# Step 3: Create commit
echo "=== Step 3: Creating Commit ==="
git commit -m "feat: Implement P2-TRUTH proxy gaming detection with CI integration

SUMMARY:
- Add proxy-gaming job to .github/workflows/build-test.yml (Stage 6)
- Extend pattern_rationales dictionary to 83+ patterns in pattern_logger.py
- Enhance _extract_rationale() in alignment_checker.py for dict rationale handling
- Add _generate_auto_rationale() to PatternLogger for semantic WHY explanations
- Create comprehensive test suite with 17 edge case tests
- Add validate_pattern_coverage() for pattern rationale validation

CONSERVATIVE THRESHOLDS (P2-TRUTH Enhancement):
- Lookback period: 48 hours (extended from 24 for weekend patterns)
- Gaming score warning: 0.3 (lowered from 0.4 for earlier detection)
- Build blocking: MEDIUM and HIGH risk (was HIGH only)

CI INTEGRATION:
- New proxy-gaming job runs on ubuntu-latest after build/test
- Executes alignment_checker.py --philosophical --json --hours 48
- Extracts gaming_detected, risk_level, gaming_score from output
- BLOCKS BUILD if gaming_detected=True AND risk_level in [MEDIUM, HIGH]
- Uploads gaming_detection.json as artifact for debugging (30-day retention)

PATTERN RATIONALE COVERAGE (83+ patterns):
- Observability: observability_first, observability-first
- Safety: safe_degrade, guardrail_lock, guardrail_lock_check
- Cycles: depth_ladder, iteration_budget, prod_cycle_complete, flow_metrics
- Ceremonies: standup_sync, retro_complete, replenish_complete, refine_complete
- WSJF/Economic: wsjf_prioritization, wsjf-enrichment, ai_enhanced_wsjf
- WSJF Edge Cases: wsjf_zero_score, wsjf_extreme_high, wsjf_override, wsjf_decay
- CoD Components: cod_user_value_high, cod_time_criticality, cod_risk_reduction
- Governance: env_policy, governance_audit, code-fix-proposal
- Risk: circle-risk-focus, failure-strategy
- ROAM Framework: roam_risk_identified, roam_assumption_validated (9 patterns)
- Alignment Edge Cases: alignment_perfect, alignment_low_*, alignment_mismatch
- Gaming Prevention: gaming_indicator_detected, gaming_remediation

COMPREHENSIVE TEST SUITE (17 tests):
- Boundary: exactly 10 patterns (variance), 9 patterns (no variance)
- Missing data: rationale fields, malformed data, mixed types
- Gaming triggers: CHECKBOX_COMPLIANCE, ARTIFICIAL_CONSISTENCY,
  INFLATED_PRIORITIES, BLIND_COMPLIANCE (individual trigger tests)
- ROAM: All 9 ROAM patterns have specific rationales
- Coverage: 83+ pattern coverage validation

GOODHART'S LAW PREVENTION:
- 'When a measure becomes a target, it ceases to be a good measure'
- Semantic rationales explain WHY compliance is achieved, not just WHAT
- Conservative mode blocks MEDIUM risk to catch gaming early"
echo ""

# Step 4: Show commit
echo "=== Step 4: Commit Created ==="
git log --oneline -1
echo ""

echo "=============================================="
echo "COMMIT COMPLETE"
echo "=============================================="
echo ""
echo "Next steps:"
echo "1. Run: git push origin <branch>"
echo "2. Verify CI workflow triggers"
echo "3. Check proxy-gaming job in GitHub Actions"

