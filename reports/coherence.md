# DDD/TDD/ADR Coherence Validation Report
**Generated:** 2026-04-08 11:29:09
**Project:** `/Users/shahroozbhopti/Documents/code/projects/investing/agentic-flow`
**Files Scanned:** 1515
**Automation Level:** Level 0 (Manual)

## ❌ Overall: FAIL
`███░░░░░░░░░░░░░░░░░░░░░░░░░░░` **13.0%** (402/3104 checks)

## Layer Health

| Layer | Health | Files | Gaps | Strengths |
|:------|:------:|:-----:|:----:|:----------|
| **PRD** | 🔴 23% | 500 | 715 | 500 PRD document(s) found |
| **ADR** | 🔴 4% | 500 | 499 | 500 ADR document(s) found |
| **DDD** | 🔴 13% | 500 | 0 | 500 domain file(s) found |
| **TDD** | 🟢 100% | 15 | 0 | 15 test file(s) found |

## Cross-Layer Coherence

- ✅ **COH-001** (ddd→tdd): 42/50 domain classes have test coverage (84%)
- ✅ **COH-003** (prd→tdd): PRD criteria: ✓, Tests exist: ✓
- ✅ **COH-004** (tdd→ddd): 31/63 domain terms found in test names (49%)
- ✅ **COH-002** (adr→ddd): 500 ADR(s), 50 domain classes
- ✅ **COH-005** (prd→adr): PRD: 500 doc(s), ADR: 500 doc(s), 2/500 with valid status
- ✅ **COH-010** (ddd→prd): 31/31 domain modules have DoR/DoD docstrings (100%)
- ✅ **COH-006** (ddd→ddd): 12/12 Python packages have __init__.py (100%)
- ✅ **COH-009** (ddd→ddd): 40/41 Rust domain structs derive Serialize (98%)
- ✅ **COH-007** (tdd→tdd): 67/68 test files follow naming convention (99%)
- ✅ **COH-008** (prd→prd): 9/9 PRD documents have measurable success metrics (100%) [9 stray PRD-like file(s) outside docs/prd/]

### PRD Checks

- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: objective, acceptance criteria, success metric) `.hybrid-tunnel-config.md`
  💡 Add missing sections: objective, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `.hybrid-tunnel-config.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `.hybrid-tunnel-config.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `AGENTS.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `AGENTS.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `AGENTS.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `CAPABILITY_BACKLOG.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `CAPABILITY_BACKLOG.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✓ `CAPABILITY_BACKLOG.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `CHANGELOG.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `CHANGELOG.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `CHANGELOG.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `CLEANUP_STRATEGY_GUIDE.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 1 pattern(s) found `CLEANUP_STRATEGY_GUIDE.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `CLEANUP_STRATEGY_GUIDE.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: requirements, acceptance criteria, success metric) `CONTRACT.md`
  💡 Add missing sections: requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 1 pattern(s) found `CONTRACT.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `CONTRACT.md`
- ❌ [WARNING] PRD has required sections: 2/4 sections present (missing: requirements, acceptance criteria) `CRITICAL_CYCLICITY_EXECUTION.md`
  💡 Add missing sections: requirements, acceptance criteria
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 3 pattern(s) found `CRITICAL_CYCLICITY_EXECUTION.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `CRITICAL_CYCLICITY_EXECUTION.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: objective, requirements, acceptance criteria) `CRITICAL_EXECUTION_STATUS.md`
  💡 Add missing sections: objective, requirements, acceptance criteria
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 3 pattern(s) found `CRITICAL_EXECUTION_STATUS.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `CRITICAL_EXECUTION_STATUS.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `CYCLE-115-SUBSTITUTION-MAP.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 1 pattern(s) found `CYCLE-115-SUBSTITUTION-MAP.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `CYCLE-115-SUBSTITUTION-MAP.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `DASHBOARD_CONSOLIDATION_PLAN.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `DASHBOARD_CONSOLIDATION_PLAN.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `DASHBOARD_CONSOLIDATION_PLAN.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: objective, requirements, acceptance criteria) `DPC_IMPLEMENTATION.md`
  💡 Add missing sections: objective, requirements, acceptance criteria
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 1 pattern(s) found `DPC_IMPLEMENTATION.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `DPC_IMPLEMENTATION.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `EMAIL-VALIDATION-PIPELINE-COMPLETE.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `EMAIL-VALIDATION-PIPELINE-COMPLETE.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `EMAIL-VALIDATION-PIPELINE-COMPLETE.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: objective, requirements, acceptance criteria) `EXECUTION_PLAN.md`
  💡 Add missing sections: objective, requirements, acceptance criteria
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `EXECUTION_PLAN.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `EXECUTION_PLAN.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `GATES-ALL-PASS-FULL-AUTO-UNLOCKED.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `GATES-ALL-PASS-FULL-AUTO-UNLOCKED.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `GATES-ALL-PASS-FULL-AUTO-UNLOCKED.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `IMPLEMENTATION_STATUS.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `IMPLEMENTATION_STATUS.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `IMPLEMENTATION_STATUS.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `LOCAL-CI-QUICK-REF.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `LOCAL-CI-QUICK-REF.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `LOCAL-CI-QUICK-REF.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `MULTI-WSJF-SWARM-QUICKSTART.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `MULTI-WSJF-SWARM-QUICKSTART.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `MULTI-WSJF-SWARM-QUICKSTART.md`
- ❌ [WARNING] PRD has required sections: 2/4 sections present (missing: objective, acceptance criteria) `PR-DESCRIPTION.md`
  💡 Add missing sections: objective, acceptance criteria
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `PR-DESCRIPTION.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `PR-DESCRIPTION.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `PUSH-OPTIONS.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `PUSH-OPTIONS.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `PUSH-OPTIONS.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `README.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `README.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `README.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: objective, requirements, success metric) `ROAM-RISKS-DISK-CLEANUP-20260329.md`
  💡 Add missing sections: objective, requirements, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `ROAM-RISKS-DISK-CLEANUP-20260329.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `ROAM-RISKS-DISK-CLEANUP-20260329.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: objective, acceptance criteria, success metric) `RUST_CLI_SPEC.md`
  💡 Add missing sections: objective, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `RUST_CLI_SPEC.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `RUST_CLI_SPEC.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: objective, acceptance criteria, success metric) `SEMI-AUTO-FULL-AUTO-GATES.md`
  💡 Add missing sections: objective, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 3 pattern(s) found `SEMI-AUTO-FULL-AUTO-GATES.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `SEMI-AUTO-FULL-AUTO-GATES.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `SWARM-ORCHESTRATION-STATUS.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `SWARM-ORCHESTRATION-STATUS.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `SWARM-ORCHESTRATION-STATUS.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: objective, acceptance criteria, success metric) `TDD_DEPLOYMENT_GATE.md`
  💡 Add missing sections: objective, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 1 pattern(s) found `TDD_DEPLOYMENT_GATE.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `TDD_DEPLOYMENT_GATE.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `TDD_TEST_RESULTS.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `TDD_TEST_RESULTS.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `TDD_TEST_RESULTS.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: objective, acceptance criteria, success metric) `TEMPORAL-CAPACITY-MEGA-FRAMEWORK-OLD.md`
  💡 Add missing sections: objective, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `TEMPORAL-CAPACITY-MEGA-FRAMEWORK-OLD.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✓ `TEMPORAL-CAPACITY-MEGA-FRAMEWORK-OLD.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `TEMPORAL-CAPACITY-MEGA-FRAMEWORK.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `TEMPORAL-CAPACITY-MEGA-FRAMEWORK.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✓ `TEMPORAL-CAPACITY-MEGA-FRAMEWORK.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `TEMPORAL-CAPACITY-TRACKER.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `TEMPORAL-CAPACITY-TRACKER.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `TEMPORAL-CAPACITY-TRACKER.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: requirements, acceptance criteria, success metric) `TEMPORAL-CAPACITY-WSJF-CHECKLIST.md`
  💡 Add missing sections: requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `TEMPORAL-CAPACITY-WSJF-CHECKLIST.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `TEMPORAL-CAPACITY-WSJF-CHECKLIST.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `THEORETICAL_FRAMEWORKS.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `THEORETICAL_FRAMEWORKS.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `THEORETICAL_FRAMEWORKS.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `TONIGHT-DELIVERY-CHECKLIST.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `TONIGHT-DELIVERY-CHECKLIST.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `TONIGHT-DELIVERY-CHECKLIST.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `TONIGHT-QUICK-REF.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 1 pattern(s) found `TONIGHT-QUICK-REF.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `TONIGHT-QUICK-REF.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `TRIAL-1-READINESS.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `TRIAL-1-READINESS.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `TRIAL-1-READINESS.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `VALIDATOR_INVENTORY.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 1 pattern(s) found `VALIDATOR_INVENTORY.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `VALIDATOR_INVENTORY.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `VISUAL-CAPACITY-DASHBOARD.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `VISUAL-CAPACITY-DASHBOARD.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✓ `VISUAL-CAPACITY-DASHBOARD.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: objective, acceptance criteria, success metric) `WARP.md`
  💡 Add missing sections: objective, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 1 pattern(s) found `WARP.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `WARP.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `WSJF-6-5-4-3-2-1-IMPLEMENTATION-PROGRESS.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 1 pattern(s) found `WSJF-6-5-4-3-2-1-IMPLEMENTATION-PROGRESS.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `WSJF-6-5-4-3-2-1-IMPLEMENTATION-PROGRESS.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: objective, requirements, acceptance criteria) `WSJF_DISCOVER_CONSOLIDATE_ANALYSIS.md`
  💡 Add missing sections: objective, requirements, acceptance criteria
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `WSJF_DISCOVER_CONSOLIDATE_ANALYSIS.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `WSJF_DISCOVER_CONSOLIDATE_ANALYSIS.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: objective, requirements, acceptance criteria) `WSJF_PRIORITIZATION_ANALYSIS.md`
  💡 Add missing sections: objective, requirements, acceptance criteria
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `WSJF_PRIORITIZATION_ANALYSIS.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `WSJF_PRIORITIZATION_ANALYSIS.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: objective, requirements, acceptance criteria) `WSJF_TRIAL1_EXECUTION_PLAN.md`
  💡 Add missing sections: objective, requirements, acceptance criteria
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `WSJF_TRIAL1_EXECUTION_PLAN.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `WSJF_TRIAL1_EXECUTION_PLAN.md`
- ❌ [WARNING] PRD has required sections: 2/4 sections present (missing: objective, acceptance criteria) `agentic-flow/.claude/agents/MIGRATION_SUMMARY.md`
  💡 Add missing sections: objective, acceptance criteria
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 1 pattern(s) found `agentic-flow/.claude/agents/MIGRATION_SUMMARY.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/agents/MIGRATION_SUMMARY.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/.claude/agents/README.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `agentic-flow/.claude/agents/README.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/agents/README.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: objective, acceptance criteria, success metric) `agentic-flow/.claude/agents/analysis/code-analyzer.md`
  💡 Add missing sections: objective, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `agentic-flow/.claude/agents/analysis/code-analyzer.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/agents/analysis/code-analyzer.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/.claude/agents/analysis/code-review/analyze-code-quality.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `agentic-flow/.claude/agents/analysis/code-review/analyze-code-quality.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/agents/analysis/code-review/analyze-code-quality.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: objective, acceptance criteria, success metric) `agentic-flow/.claude/agents/architecture/system-design/arch-system-design.md`
  💡 Add missing sections: objective, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 1 pattern(s) found `agentic-flow/.claude/agents/architecture/system-design/arch-system-design.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/agents/architecture/system-design/arch-system-design.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: objective, acceptance criteria, success metric) `agentic-flow/.claude/agents/base-template-generator.md`
  💡 Add missing sections: objective, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `agentic-flow/.claude/agents/base-template-generator.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/agents/base-template-generator.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: objective, acceptance criteria, success metric) `agentic-flow/.claude/agents/consensus/README.md`
  💡 Add missing sections: objective, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `agentic-flow/.claude/agents/consensus/README.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/agents/consensus/README.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/.claude/agents/consensus/byzantine-coordinator.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `agentic-flow/.claude/agents/consensus/byzantine-coordinator.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/agents/consensus/byzantine-coordinator.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: objective, acceptance criteria, success metric) `agentic-flow/.claude/agents/consensus/crdt-synchronizer.md`
  💡 Add missing sections: objective, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 1 pattern(s) found `agentic-flow/.claude/agents/consensus/crdt-synchronizer.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/agents/consensus/crdt-synchronizer.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/.claude/agents/consensus/gossip-coordinator.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `agentic-flow/.claude/agents/consensus/gossip-coordinator.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/agents/consensus/gossip-coordinator.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/.claude/agents/consensus/performance-benchmarker.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 3 pattern(s) found `agentic-flow/.claude/agents/consensus/performance-benchmarker.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/agents/consensus/performance-benchmarker.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: objective, acceptance criteria, success metric) `agentic-flow/.claude/agents/consensus/quorum-manager.md`
  💡 Add missing sections: objective, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `agentic-flow/.claude/agents/consensus/quorum-manager.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/agents/consensus/quorum-manager.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/.claude/agents/consensus/raft-manager.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `agentic-flow/.claude/agents/consensus/raft-manager.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/agents/consensus/raft-manager.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/.claude/agents/consensus/security-manager.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 1 pattern(s) found `agentic-flow/.claude/agents/consensus/security-manager.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/agents/consensus/security-manager.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: objective, acceptance criteria, success metric) `agentic-flow/.claude/agents/core/coder.md`
  💡 Add missing sections: objective, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 1 pattern(s) found `agentic-flow/.claude/agents/core/coder.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/agents/core/coder.md`
- ❌ [WARNING] PRD has required sections: 2/4 sections present (missing: acceptance criteria, success metric) `agentic-flow/.claude/agents/core/planner.md`
  💡 Add missing sections: acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `agentic-flow/.claude/agents/core/planner.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/agents/core/planner.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/.claude/agents/core/researcher.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `agentic-flow/.claude/agents/core/researcher.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/agents/core/researcher.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: objective, acceptance criteria, success metric) `agentic-flow/.claude/agents/core/reviewer.md`
  💡 Add missing sections: objective, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 1 pattern(s) found `agentic-flow/.claude/agents/core/reviewer.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/agents/core/reviewer.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: objective, acceptance criteria, success metric) `agentic-flow/.claude/agents/core/tester.md`
  💡 Add missing sections: objective, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `agentic-flow/.claude/agents/core/tester.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/agents/core/tester.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/.claude/agents/custom/test-long-runner.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 1 pattern(s) found `agentic-flow/.claude/agents/custom/test-long-runner.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/agents/custom/test-long-runner.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/.claude/agents/data/ml/data-ml-model.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 1 pattern(s) found `agentic-flow/.claude/agents/data/ml/data-ml-model.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/agents/data/ml/data-ml-model.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/.claude/agents/development/backend/dev-backend-api.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `agentic-flow/.claude/agents/development/backend/dev-backend-api.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/agents/development/backend/dev-backend-api.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: objective, acceptance criteria, success metric) `agentic-flow/.claude/agents/devops/ci-cd/ops-cicd-github.md`
  💡 Add missing sections: objective, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `agentic-flow/.claude/agents/devops/ci-cd/ops-cicd-github.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/agents/devops/ci-cd/ops-cicd-github.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: objective, acceptance criteria, success metric) `agentic-flow/.claude/agents/documentation/api-docs/docs-api-openapi.md`
  💡 Add missing sections: objective, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `agentic-flow/.claude/agents/documentation/api-docs/docs-api-openapi.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/agents/documentation/api-docs/docs-api-openapi.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/.claude/agents/flow-nexus/app-store.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `agentic-flow/.claude/agents/flow-nexus/app-store.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/agents/flow-nexus/app-store.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: objective, acceptance criteria, success metric) `agentic-flow/.claude/agents/flow-nexus/authentication.md`
  💡 Add missing sections: objective, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `agentic-flow/.claude/agents/flow-nexus/authentication.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/agents/flow-nexus/authentication.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: requirements, acceptance criteria, success metric) `agentic-flow/.claude/agents/flow-nexus/challenges.md`
  💡 Add missing sections: requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `agentic-flow/.claude/agents/flow-nexus/challenges.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/agents/flow-nexus/challenges.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: objective, acceptance criteria, success metric) `agentic-flow/.claude/agents/flow-nexus/neural-network.md`
  💡 Add missing sections: objective, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `agentic-flow/.claude/agents/flow-nexus/neural-network.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/agents/flow-nexus/neural-network.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/.claude/agents/flow-nexus/payments.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `agentic-flow/.claude/agents/flow-nexus/payments.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/agents/flow-nexus/payments.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: objective, acceptance criteria, success metric) `agentic-flow/.claude/agents/flow-nexus/sandbox.md`
  💡 Add missing sections: objective, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `agentic-flow/.claude/agents/flow-nexus/sandbox.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/agents/flow-nexus/sandbox.md`
- ❌ [WARNING] PRD has required sections: 2/4 sections present (missing: acceptance criteria, success metric) `agentic-flow/.claude/agents/flow-nexus/swarm.md`
  💡 Add missing sections: acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `agentic-flow/.claude/agents/flow-nexus/swarm.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/agents/flow-nexus/swarm.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/.claude/agents/flow-nexus/user-tools.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `agentic-flow/.claude/agents/flow-nexus/user-tools.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/agents/flow-nexus/user-tools.md`
- ❌ [WARNING] PRD has required sections: 2/4 sections present (missing: acceptance criteria, success metric) `agentic-flow/.claude/agents/flow-nexus/workflow.md`
  💡 Add missing sections: acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `agentic-flow/.claude/agents/flow-nexus/workflow.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/agents/flow-nexus/workflow.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/.claude/agents/github/code-review-swarm.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 1 pattern(s) found `agentic-flow/.claude/agents/github/code-review-swarm.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/agents/github/code-review-swarm.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/.claude/agents/github/github-modes.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `agentic-flow/.claude/agents/github/github-modes.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/agents/github/github-modes.md`
- ❌ [WARNING] PRD has required sections: 2/4 sections present (missing: acceptance criteria, success metric) `agentic-flow/.claude/agents/github/issue-tracker.md`
  💡 Add missing sections: acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 1 pattern(s) found `agentic-flow/.claude/agents/github/issue-tracker.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/agents/github/issue-tracker.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/.claude/agents/github/multi-repo-swarm.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `agentic-flow/.claude/agents/github/multi-repo-swarm.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/agents/github/multi-repo-swarm.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/.claude/agents/github/pr-manager.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `agentic-flow/.claude/agents/github/pr-manager.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/agents/github/pr-manager.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/.claude/agents/github/project-board-sync.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `agentic-flow/.claude/agents/github/project-board-sync.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/agents/github/project-board-sync.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: objective, acceptance criteria, success metric) `agentic-flow/.claude/agents/github/release-manager.md`
  💡 Add missing sections: objective, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 1 pattern(s) found `agentic-flow/.claude/agents/github/release-manager.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/agents/github/release-manager.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/.claude/agents/github/release-swarm.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 3 pattern(s) found `agentic-flow/.claude/agents/github/release-swarm.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/agents/github/release-swarm.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/.claude/agents/github/repo-architect.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `agentic-flow/.claude/agents/github/repo-architect.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/agents/github/repo-architect.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: objective, requirements, success metric) `agentic-flow/.claude/agents/github/swarm-issue.md`
  💡 Add missing sections: objective, requirements, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 1 pattern(s) found `agentic-flow/.claude/agents/github/swarm-issue.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/agents/github/swarm-issue.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: objective, acceptance criteria, success metric) `agentic-flow/.claude/agents/github/swarm-pr.md`
  💡 Add missing sections: objective, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `agentic-flow/.claude/agents/github/swarm-pr.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/agents/github/swarm-pr.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: objective, acceptance criteria, success metric) `agentic-flow/.claude/agents/github/sync-coordinator.md`
  💡 Add missing sections: objective, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 1 pattern(s) found `agentic-flow/.claude/agents/github/sync-coordinator.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/agents/github/sync-coordinator.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/.claude/agents/github/workflow-automation.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 1 pattern(s) found `agentic-flow/.claude/agents/github/workflow-automation.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/agents/github/workflow-automation.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: requirements, acceptance criteria, success metric) `agentic-flow/.claude/agents/goal/agent.md`
  💡 Add missing sections: requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 1 pattern(s) found `agentic-flow/.claude/agents/goal/agent.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/agents/goal/agent.md`
- ❌ [WARNING] PRD has required sections: 2/4 sections present (missing: acceptance criteria, success metric) `agentic-flow/.claude/agents/goal/goal-planner.md`
  💡 Add missing sections: acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `agentic-flow/.claude/agents/goal/goal-planner.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/agents/goal/goal-planner.md`
- ❌ [WARNING] PRD has required sections: 2/4 sections present (missing: acceptance criteria, success metric) `agentic-flow/.claude/agents/optimization/README.md`
  💡 Add missing sections: acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `agentic-flow/.claude/agents/optimization/README.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/agents/optimization/README.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/.claude/agents/optimization/benchmark-suite.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 1 pattern(s) found `agentic-flow/.claude/agents/optimization/benchmark-suite.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/agents/optimization/benchmark-suite.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: requirements, acceptance criteria, success metric) `agentic-flow/.claude/agents/optimization/load-balancer.md`
  💡 Add missing sections: requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 1 pattern(s) found `agentic-flow/.claude/agents/optimization/load-balancer.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/agents/optimization/load-balancer.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/.claude/agents/optimization/performance-monitor.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `agentic-flow/.claude/agents/optimization/performance-monitor.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/agents/optimization/performance-monitor.md`
- ❌ [WARNING] PRD has required sections: 2/4 sections present (missing: acceptance criteria, success metric) `agentic-flow/.claude/agents/optimization/resource-allocator.md`
  💡 Add missing sections: acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 1 pattern(s) found `agentic-flow/.claude/agents/optimization/resource-allocator.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/agents/optimization/resource-allocator.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: requirements, acceptance criteria, success metric) `agentic-flow/.claude/agents/optimization/topology-optimizer.md`
  💡 Add missing sections: requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `agentic-flow/.claude/agents/optimization/topology-optimizer.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/agents/optimization/topology-optimizer.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/.claude/agents/payments/agentic-payments.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 1 pattern(s) found `agentic-flow/.claude/agents/payments/agentic-payments.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/agents/payments/agentic-payments.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: objective, acceptance criteria, success metric) `agentic-flow/.claude/agents/sparc/architecture.md`
  💡 Add missing sections: objective, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 3 pattern(s) found `agentic-flow/.claude/agents/sparc/architecture.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/agents/sparc/architecture.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/.claude/agents/sparc/pseudocode.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 1 pattern(s) found `agentic-flow/.claude/agents/sparc/pseudocode.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/agents/sparc/pseudocode.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/.claude/agents/sparc/refinement.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 1 pattern(s) found `agentic-flow/.claude/agents/sparc/refinement.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/agents/sparc/refinement.md`
- ❌ [WARNING] PRD has required sections: 3/4 sections present (missing: objective) `agentic-flow/.claude/agents/sparc/specification.md`
  💡 Add missing sections: objective
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `agentic-flow/.claude/agents/sparc/specification.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/agents/sparc/specification.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/.claude/agents/specialized/mobile/spec-mobile-react-native.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `agentic-flow/.claude/agents/specialized/mobile/spec-mobile-react-native.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/agents/specialized/mobile/spec-mobile-react-native.md`
- ❌ [WARNING] PRD has required sections: 2/4 sections present (missing: acceptance criteria, success metric) `agentic-flow/.claude/agents/sublinear/consensus-coordinator.md`
  💡 Add missing sections: acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `agentic-flow/.claude/agents/sublinear/consensus-coordinator.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/agents/sublinear/consensus-coordinator.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: objective, acceptance criteria, success metric) `agentic-flow/.claude/agents/sublinear/matrix-optimizer.md`
  💡 Add missing sections: objective, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `agentic-flow/.claude/agents/sublinear/matrix-optimizer.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/agents/sublinear/matrix-optimizer.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: objective, acceptance criteria, success metric) `agentic-flow/.claude/agents/sublinear/pagerank-analyzer.md`
  💡 Add missing sections: objective, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `agentic-flow/.claude/agents/sublinear/pagerank-analyzer.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/agents/sublinear/pagerank-analyzer.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: requirements, acceptance criteria, success metric) `agentic-flow/.claude/agents/sublinear/performance-optimizer.md`
  💡 Add missing sections: requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `agentic-flow/.claude/agents/sublinear/performance-optimizer.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/agents/sublinear/performance-optimizer.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/.claude/agents/sublinear/trading-predictor.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 1 pattern(s) found `agentic-flow/.claude/agents/sublinear/trading-predictor.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/agents/sublinear/trading-predictor.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: objective, acceptance criteria, success metric) `agentic-flow/.claude/agents/swarm/README.md`
  💡 Add missing sections: objective, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `agentic-flow/.claude/agents/swarm/README.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/agents/swarm/README.md`
- ❌ [WARNING] PRD has required sections: 2/4 sections present (missing: acceptance criteria, success metric) `agentic-flow/.claude/agents/swarm/adaptive-coordinator.md`
  💡 Add missing sections: acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `agentic-flow/.claude/agents/swarm/adaptive-coordinator.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/agents/swarm/adaptive-coordinator.md`
- ❌ [WARNING] PRD has required sections: 3/4 sections present (missing: success metric) `agentic-flow/.claude/agents/swarm/hierarchical-coordinator.md`
  💡 Add missing sections: success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `agentic-flow/.claude/agents/swarm/hierarchical-coordinator.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/agents/swarm/hierarchical-coordinator.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: objective, acceptance criteria, success metric) `agentic-flow/.claude/agents/swarm/mesh-coordinator.md`
  💡 Add missing sections: objective, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `agentic-flow/.claude/agents/swarm/mesh-coordinator.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/agents/swarm/mesh-coordinator.md`
- ❌ [WARNING] PRD has required sections: 2/4 sections present (missing: acceptance criteria, success metric) `agentic-flow/.claude/agents/templates/automation-smart-agent.md`
  💡 Add missing sections: acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `agentic-flow/.claude/agents/templates/automation-smart-agent.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/agents/templates/automation-smart-agent.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/.claude/agents/templates/coordinator-swarm-init.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `agentic-flow/.claude/agents/templates/coordinator-swarm-init.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/agents/templates/coordinator-swarm-init.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/.claude/agents/templates/github-pr-manager.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `agentic-flow/.claude/agents/templates/github-pr-manager.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/agents/templates/github-pr-manager.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: objective, acceptance criteria, success metric) `agentic-flow/.claude/agents/templates/implementer-sparc-coder.md`
  💡 Add missing sections: objective, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 1 pattern(s) found `agentic-flow/.claude/agents/templates/implementer-sparc-coder.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/agents/templates/implementer-sparc-coder.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/.claude/agents/templates/memory-coordinator.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `agentic-flow/.claude/agents/templates/memory-coordinator.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/agents/templates/memory-coordinator.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: objective, acceptance criteria, success metric) `agentic-flow/.claude/agents/templates/migration-plan.md`
  💡 Add missing sections: objective, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `agentic-flow/.claude/agents/templates/migration-plan.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/agents/templates/migration-plan.md`
- ❌ [WARNING] PRD has required sections: 2/4 sections present (missing: acceptance criteria, success metric) `agentic-flow/.claude/agents/templates/orchestrator-task.md`
  💡 Add missing sections: acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `agentic-flow/.claude/agents/templates/orchestrator-task.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/agents/templates/orchestrator-task.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: objective, requirements, acceptance criteria) `agentic-flow/.claude/agents/templates/performance-analyzer.md`
  💡 Add missing sections: objective, requirements, acceptance criteria
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `agentic-flow/.claude/agents/templates/performance-analyzer.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/agents/templates/performance-analyzer.md`
- ✅ [WARNING] PRD has required sections: 4/4 sections present `agentic-flow/.claude/agents/templates/sparc-coordinator.md`
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `agentic-flow/.claude/agents/templates/sparc-coordinator.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/agents/templates/sparc-coordinator.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/.claude/agents/test-neural.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `agentic-flow/.claude/agents/test-neural.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/agents/test-neural.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: objective, acceptance criteria, success metric) `agentic-flow/.claude/agents/testing/unit/tdd-london-swarm.md`
  💡 Add missing sections: objective, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `agentic-flow/.claude/agents/testing/unit/tdd-london-swarm.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/agents/testing/unit/tdd-london-swarm.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: objective, acceptance criteria, success metric) `agentic-flow/.claude/agents/testing/validation/production-validator.md`
  💡 Add missing sections: objective, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `agentic-flow/.claude/agents/testing/validation/production-validator.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/agents/testing/validation/production-validator.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/.claude/answer.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 1 pattern(s) found `agentic-flow/.claude/answer.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/answer.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/.claude/commands/agents/README.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `agentic-flow/.claude/commands/agents/README.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/commands/agents/README.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: objective, acceptance criteria, success metric) `agentic-flow/.claude/commands/agents/agent-capabilities.md`
  💡 Add missing sections: objective, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `agentic-flow/.claude/commands/agents/agent-capabilities.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/commands/agents/agent-capabilities.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/.claude/commands/agents/agent-coordination.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `agentic-flow/.claude/commands/agents/agent-coordination.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/commands/agents/agent-coordination.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: objective, acceptance criteria, success metric) `agentic-flow/.claude/commands/agents/agent-spawning.md`
  💡 Add missing sections: objective, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `agentic-flow/.claude/commands/agents/agent-spawning.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/commands/agents/agent-spawning.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/.claude/commands/agents/agent-types.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `agentic-flow/.claude/commands/agents/agent-types.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/commands/agents/agent-types.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/.claude/commands/analysis/COMMAND_COMPLIANCE_REPORT.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 1 pattern(s) found `agentic-flow/.claude/commands/analysis/COMMAND_COMPLIANCE_REPORT.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/commands/analysis/COMMAND_COMPLIANCE_REPORT.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/.claude/commands/analysis/README.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `agentic-flow/.claude/commands/analysis/README.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/commands/analysis/README.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/.claude/commands/analysis/bottleneck-detect.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `agentic-flow/.claude/commands/analysis/bottleneck-detect.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/commands/analysis/bottleneck-detect.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/.claude/commands/analysis/performance-bottlenecks.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `agentic-flow/.claude/commands/analysis/performance-bottlenecks.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/commands/analysis/performance-bottlenecks.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/.claude/commands/analysis/performance-report.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `agentic-flow/.claude/commands/analysis/performance-report.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/commands/analysis/performance-report.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/.claude/commands/analysis/token-efficiency.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `agentic-flow/.claude/commands/analysis/token-efficiency.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/commands/analysis/token-efficiency.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/.claude/commands/analysis/token-usage.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 1 pattern(s) found `agentic-flow/.claude/commands/analysis/token-usage.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/commands/analysis/token-usage.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/.claude/commands/automation/README.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `agentic-flow/.claude/commands/automation/README.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/commands/automation/README.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: objective, acceptance criteria, success metric) `agentic-flow/.claude/commands/automation/auto-agent.md`
  💡 Add missing sections: objective, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `agentic-flow/.claude/commands/automation/auto-agent.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/commands/automation/auto-agent.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/.claude/commands/automation/self-healing.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 1 pattern(s) found `agentic-flow/.claude/commands/automation/self-healing.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/commands/automation/self-healing.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/.claude/commands/automation/session-memory.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `agentic-flow/.claude/commands/automation/session-memory.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/commands/automation/session-memory.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/.claude/commands/automation/smart-agents.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `agentic-flow/.claude/commands/automation/smart-agents.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/commands/automation/smart-agents.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/.claude/commands/automation/smart-spawn.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `agentic-flow/.claude/commands/automation/smart-spawn.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/commands/automation/smart-spawn.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/.claude/commands/automation/workflow-select.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `agentic-flow/.claude/commands/automation/workflow-select.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/commands/automation/workflow-select.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: objective, acceptance criteria, success metric) `agentic-flow/.claude/commands/claude-flow-help.md`
  💡 Add missing sections: objective, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 1 pattern(s) found `agentic-flow/.claude/commands/claude-flow-help.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/commands/claude-flow-help.md`
- ❌ [WARNING] PRD has required sections: 2/4 sections present (missing: acceptance criteria, success metric) `agentic-flow/.claude/commands/claude-flow-memory.md`
  💡 Add missing sections: acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `agentic-flow/.claude/commands/claude-flow-memory.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/commands/claude-flow-memory.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: requirements, acceptance criteria, success metric) `agentic-flow/.claude/commands/claude-flow-swarm.md`
  💡 Add missing sections: requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 1 pattern(s) found `agentic-flow/.claude/commands/claude-flow-swarm.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/commands/claude-flow-swarm.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/.claude/commands/flow-nexus/app-store.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `agentic-flow/.claude/commands/flow-nexus/app-store.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/commands/flow-nexus/app-store.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/.claude/commands/flow-nexus/challenges.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `agentic-flow/.claude/commands/flow-nexus/challenges.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/commands/flow-nexus/challenges.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/.claude/commands/flow-nexus/login-registration.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `agentic-flow/.claude/commands/flow-nexus/login-registration.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/commands/flow-nexus/login-registration.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/.claude/commands/flow-nexus/neural-network.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `agentic-flow/.claude/commands/flow-nexus/neural-network.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/commands/flow-nexus/neural-network.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/.claude/commands/flow-nexus/payments.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `agentic-flow/.claude/commands/flow-nexus/payments.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/commands/flow-nexus/payments.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/.claude/commands/flow-nexus/sandbox.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `agentic-flow/.claude/commands/flow-nexus/sandbox.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/commands/flow-nexus/sandbox.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/.claude/commands/flow-nexus/swarm.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `agentic-flow/.claude/commands/flow-nexus/swarm.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/commands/flow-nexus/swarm.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/.claude/commands/flow-nexus/user-tools.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `agentic-flow/.claude/commands/flow-nexus/user-tools.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/commands/flow-nexus/user-tools.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/.claude/commands/flow-nexus/workflow.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `agentic-flow/.claude/commands/flow-nexus/workflow.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/commands/flow-nexus/workflow.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/.claude/commands/github/README.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `agentic-flow/.claude/commands/github/README.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/commands/github/README.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/.claude/commands/github/code-review-swarm.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 1 pattern(s) found `agentic-flow/.claude/commands/github/code-review-swarm.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/commands/github/code-review-swarm.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/.claude/commands/github/code-review.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `agentic-flow/.claude/commands/github/code-review.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/commands/github/code-review.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/.claude/commands/github/github-modes.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `agentic-flow/.claude/commands/github/github-modes.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/commands/github/github-modes.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/.claude/commands/github/github-swarm.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `agentic-flow/.claude/commands/github/github-swarm.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/commands/github/github-swarm.md`
- ❌ [WARNING] PRD has required sections: 2/4 sections present (missing: acceptance criteria, success metric) `agentic-flow/.claude/commands/github/issue-tracker.md`
  💡 Add missing sections: acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 1 pattern(s) found `agentic-flow/.claude/commands/github/issue-tracker.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/commands/github/issue-tracker.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/.claude/commands/github/issue-triage.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `agentic-flow/.claude/commands/github/issue-triage.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/commands/github/issue-triage.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/.claude/commands/github/multi-repo-swarm.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `agentic-flow/.claude/commands/github/multi-repo-swarm.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/commands/github/multi-repo-swarm.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/.claude/commands/github/pr-enhance.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `agentic-flow/.claude/commands/github/pr-enhance.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/commands/github/pr-enhance.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/.claude/commands/github/pr-manager.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `agentic-flow/.claude/commands/github/pr-manager.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/commands/github/pr-manager.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/.claude/commands/github/project-board-sync.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `agentic-flow/.claude/commands/github/project-board-sync.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/commands/github/project-board-sync.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: objective, acceptance criteria, success metric) `agentic-flow/.claude/commands/github/release-manager.md`
  💡 Add missing sections: objective, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 1 pattern(s) found `agentic-flow/.claude/commands/github/release-manager.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/commands/github/release-manager.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/.claude/commands/github/release-swarm.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 3 pattern(s) found `agentic-flow/.claude/commands/github/release-swarm.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/commands/github/release-swarm.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/.claude/commands/github/repo-analyze.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `agentic-flow/.claude/commands/github/repo-analyze.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/commands/github/repo-analyze.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/.claude/commands/github/repo-architect.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `agentic-flow/.claude/commands/github/repo-architect.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/commands/github/repo-architect.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: objective, requirements, success metric) `agentic-flow/.claude/commands/github/swarm-issue.md`
  💡 Add missing sections: objective, requirements, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 1 pattern(s) found `agentic-flow/.claude/commands/github/swarm-issue.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/commands/github/swarm-issue.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: objective, acceptance criteria, success metric) `agentic-flow/.claude/commands/github/swarm-pr.md`
  💡 Add missing sections: objective, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `agentic-flow/.claude/commands/github/swarm-pr.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/commands/github/swarm-pr.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: objective, acceptance criteria, success metric) `agentic-flow/.claude/commands/github/sync-coordinator.md`
  💡 Add missing sections: objective, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `agentic-flow/.claude/commands/github/sync-coordinator.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/commands/github/sync-coordinator.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/.claude/commands/github/workflow-automation.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 1 pattern(s) found `agentic-flow/.claude/commands/github/workflow-automation.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/commands/github/workflow-automation.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/.claude/commands/hive-mind/README.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `agentic-flow/.claude/commands/hive-mind/README.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/commands/hive-mind/README.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/.claude/commands/hive-mind/hive-mind-consensus.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `agentic-flow/.claude/commands/hive-mind/hive-mind-consensus.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/commands/hive-mind/hive-mind-consensus.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/.claude/commands/hive-mind/hive-mind-init.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `agentic-flow/.claude/commands/hive-mind/hive-mind-init.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/commands/hive-mind/hive-mind-init.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/.claude/commands/hive-mind/hive-mind-memory.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `agentic-flow/.claude/commands/hive-mind/hive-mind-memory.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/commands/hive-mind/hive-mind-memory.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/.claude/commands/hive-mind/hive-mind-metrics.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `agentic-flow/.claude/commands/hive-mind/hive-mind-metrics.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/commands/hive-mind/hive-mind-metrics.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/.claude/commands/hive-mind/hive-mind-resume.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `agentic-flow/.claude/commands/hive-mind/hive-mind-resume.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/commands/hive-mind/hive-mind-resume.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/.claude/commands/hive-mind/hive-mind-sessions.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `agentic-flow/.claude/commands/hive-mind/hive-mind-sessions.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/commands/hive-mind/hive-mind-sessions.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: requirements, acceptance criteria, success metric) `agentic-flow/.claude/commands/hive-mind/hive-mind-spawn.md`
  💡 Add missing sections: requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `agentic-flow/.claude/commands/hive-mind/hive-mind-spawn.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/commands/hive-mind/hive-mind-spawn.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/.claude/commands/hive-mind/hive-mind-status.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `agentic-flow/.claude/commands/hive-mind/hive-mind-status.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/commands/hive-mind/hive-mind-status.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/.claude/commands/hive-mind/hive-mind-stop.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `agentic-flow/.claude/commands/hive-mind/hive-mind-stop.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/commands/hive-mind/hive-mind-stop.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/.claude/commands/hive-mind/hive-mind-wizard.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `agentic-flow/.claude/commands/hive-mind/hive-mind-wizard.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/commands/hive-mind/hive-mind-wizard.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/.claude/commands/hive-mind/hive-mind.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `agentic-flow/.claude/commands/hive-mind/hive-mind.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/commands/hive-mind/hive-mind.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/.claude/commands/hooks/README.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `agentic-flow/.claude/commands/hooks/README.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/commands/hooks/README.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: objective, acceptance criteria, success metric) `agentic-flow/.claude/commands/hooks/overview.md`
  💡 Add missing sections: objective, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `agentic-flow/.claude/commands/hooks/overview.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/commands/hooks/overview.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/.claude/commands/hooks/post-edit.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `agentic-flow/.claude/commands/hooks/post-edit.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/commands/hooks/post-edit.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/.claude/commands/hooks/post-task.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `agentic-flow/.claude/commands/hooks/post-task.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/commands/hooks/post-task.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/.claude/commands/hooks/pre-edit.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `agentic-flow/.claude/commands/hooks/pre-edit.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/commands/hooks/pre-edit.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: objective, acceptance criteria, success metric) `agentic-flow/.claude/commands/hooks/pre-task.md`
  💡 Add missing sections: objective, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `agentic-flow/.claude/commands/hooks/pre-task.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/commands/hooks/pre-task.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/.claude/commands/hooks/session-end.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `agentic-flow/.claude/commands/hooks/session-end.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/commands/hooks/session-end.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/.claude/commands/hooks/setup.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 1 pattern(s) found `agentic-flow/.claude/commands/hooks/setup.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/commands/hooks/setup.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/.claude/commands/monitoring/README.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `agentic-flow/.claude/commands/monitoring/README.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/commands/monitoring/README.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/.claude/commands/monitoring/agent-metrics.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `agentic-flow/.claude/commands/monitoring/agent-metrics.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/commands/monitoring/agent-metrics.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/.claude/commands/monitoring/agents.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `agentic-flow/.claude/commands/monitoring/agents.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/commands/monitoring/agents.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/.claude/commands/monitoring/real-time-view.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `agentic-flow/.claude/commands/monitoring/real-time-view.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/commands/monitoring/real-time-view.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/.claude/commands/monitoring/status.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `agentic-flow/.claude/commands/monitoring/status.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/commands/monitoring/status.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/.claude/commands/monitoring/swarm-monitor.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `agentic-flow/.claude/commands/monitoring/swarm-monitor.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/commands/monitoring/swarm-monitor.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/.claude/commands/optimization/README.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `agentic-flow/.claude/commands/optimization/README.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/commands/optimization/README.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: objective, acceptance criteria, success metric) `agentic-flow/.claude/commands/optimization/auto-topology.md`
  💡 Add missing sections: objective, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `agentic-flow/.claude/commands/optimization/auto-topology.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/commands/optimization/auto-topology.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/.claude/commands/optimization/cache-manage.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `agentic-flow/.claude/commands/optimization/cache-manage.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/commands/optimization/cache-manage.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/.claude/commands/optimization/parallel-execute.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `agentic-flow/.claude/commands/optimization/parallel-execute.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/commands/optimization/parallel-execute.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/.claude/commands/optimization/parallel-execution.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `agentic-flow/.claude/commands/optimization/parallel-execution.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/commands/optimization/parallel-execution.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/.claude/commands/optimization/topology-optimize.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `agentic-flow/.claude/commands/optimization/topology-optimize.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/commands/optimization/topology-optimize.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/.claude/commands/pair/README.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 1 pattern(s) found `agentic-flow/.claude/commands/pair/README.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/commands/pair/README.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/.claude/commands/pair/commands.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `agentic-flow/.claude/commands/pair/commands.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/commands/pair/commands.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/.claude/commands/pair/config.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `agentic-flow/.claude/commands/pair/config.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/commands/pair/config.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/.claude/commands/pair/examples.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `agentic-flow/.claude/commands/pair/examples.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/commands/pair/examples.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: objective, acceptance criteria, success metric) `agentic-flow/.claude/commands/pair/modes.md`
  💡 Add missing sections: objective, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 1 pattern(s) found `agentic-flow/.claude/commands/pair/modes.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/commands/pair/modes.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: requirements, acceptance criteria, success metric) `agentic-flow/.claude/commands/pair/session.md`
  💡 Add missing sections: requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `agentic-flow/.claude/commands/pair/session.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/commands/pair/session.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: requirements, acceptance criteria, success metric) `agentic-flow/.claude/commands/pair/start.md`
  💡 Add missing sections: requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 1 pattern(s) found `agentic-flow/.claude/commands/pair/start.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/commands/pair/start.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/.claude/commands/sparc/analyzer.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `agentic-flow/.claude/commands/sparc/analyzer.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/commands/sparc/analyzer.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/.claude/commands/sparc/architect.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `agentic-flow/.claude/commands/sparc/architect.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/commands/sparc/architect.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/.claude/commands/sparc/ask.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `agentic-flow/.claude/commands/sparc/ask.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/commands/sparc/ask.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/.claude/commands/sparc/batch-executor.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `agentic-flow/.claude/commands/sparc/batch-executor.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/commands/sparc/batch-executor.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/.claude/commands/sparc/code.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `agentic-flow/.claude/commands/sparc/code.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/commands/sparc/code.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/.claude/commands/sparc/coder.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `agentic-flow/.claude/commands/sparc/coder.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/commands/sparc/coder.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/.claude/commands/sparc/debug.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `agentic-flow/.claude/commands/sparc/debug.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/commands/sparc/debug.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/.claude/commands/sparc/debugger.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `agentic-flow/.claude/commands/sparc/debugger.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/commands/sparc/debugger.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/.claude/commands/sparc/designer.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `agentic-flow/.claude/commands/sparc/designer.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/commands/sparc/designer.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/.claude/commands/sparc/devops.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `agentic-flow/.claude/commands/sparc/devops.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/commands/sparc/devops.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/.claude/commands/sparc/docs-writer.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `agentic-flow/.claude/commands/sparc/docs-writer.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/commands/sparc/docs-writer.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/.claude/commands/sparc/documenter.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `agentic-flow/.claude/commands/sparc/documenter.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/commands/sparc/documenter.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/.claude/commands/sparc/innovator.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `agentic-flow/.claude/commands/sparc/innovator.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/commands/sparc/innovator.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/.claude/commands/sparc/integration.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `agentic-flow/.claude/commands/sparc/integration.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/commands/sparc/integration.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/.claude/commands/sparc/mcp.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `agentic-flow/.claude/commands/sparc/mcp.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/commands/sparc/mcp.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/.claude/commands/sparc/memory-manager.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `agentic-flow/.claude/commands/sparc/memory-manager.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/commands/sparc/memory-manager.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/.claude/commands/sparc/optimizer.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `agentic-flow/.claude/commands/sparc/optimizer.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/commands/sparc/optimizer.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/.claude/commands/sparc/orchestrator.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `agentic-flow/.claude/commands/sparc/orchestrator.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/commands/sparc/orchestrator.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/.claude/commands/sparc/post-deployment-monitoring-mode.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `agentic-flow/.claude/commands/sparc/post-deployment-monitoring-mode.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/commands/sparc/post-deployment-monitoring-mode.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/.claude/commands/sparc/refinement-optimization-mode.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `agentic-flow/.claude/commands/sparc/refinement-optimization-mode.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/commands/sparc/refinement-optimization-mode.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/.claude/commands/sparc/researcher.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `agentic-flow/.claude/commands/sparc/researcher.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/commands/sparc/researcher.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/.claude/commands/sparc/reviewer.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `agentic-flow/.claude/commands/sparc/reviewer.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/commands/sparc/reviewer.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/.claude/commands/sparc/security-review.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `agentic-flow/.claude/commands/sparc/security-review.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/commands/sparc/security-review.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/.claude/commands/sparc/sparc-modes.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `agentic-flow/.claude/commands/sparc/sparc-modes.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/commands/sparc/sparc-modes.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: requirements, acceptance criteria, success metric) `agentic-flow/.claude/commands/sparc/sparc.md`
  💡 Add missing sections: requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `agentic-flow/.claude/commands/sparc/sparc.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/commands/sparc/sparc.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: objective, acceptance criteria, success metric) `agentic-flow/.claude/commands/sparc/spec-pseudocode.md`
  💡 Add missing sections: objective, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `agentic-flow/.claude/commands/sparc/spec-pseudocode.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/commands/sparc/spec-pseudocode.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/.claude/commands/sparc/supabase-admin.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 1 pattern(s) found `agentic-flow/.claude/commands/sparc/supabase-admin.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/commands/sparc/supabase-admin.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/.claude/commands/sparc/swarm-coordinator.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `agentic-flow/.claude/commands/sparc/swarm-coordinator.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/commands/sparc/swarm-coordinator.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/.claude/commands/sparc/tdd.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `agentic-flow/.claude/commands/sparc/tdd.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/commands/sparc/tdd.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/.claude/commands/sparc/tester.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `agentic-flow/.claude/commands/sparc/tester.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/commands/sparc/tester.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/.claude/commands/sparc/tutorial.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `agentic-flow/.claude/commands/sparc/tutorial.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/commands/sparc/tutorial.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/.claude/commands/sparc/workflow-manager.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `agentic-flow/.claude/commands/sparc/workflow-manager.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/commands/sparc/workflow-manager.md`
- ❌ [WARNING] PRD has required sections: 3/4 sections present (missing: success metric) `agentic-flow/.claude/commands/sparc.md`
  💡 Add missing sections: success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `agentic-flow/.claude/commands/sparc.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/commands/sparc.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/.claude/commands/stream-chain/pipeline.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `agentic-flow/.claude/commands/stream-chain/pipeline.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/commands/stream-chain/pipeline.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/.claude/commands/stream-chain/run.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 1 pattern(s) found `agentic-flow/.claude/commands/stream-chain/run.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/commands/stream-chain/run.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/.claude/commands/swarm/README.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `agentic-flow/.claude/commands/swarm/README.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/commands/swarm/README.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/.claude/commands/swarm/analysis.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `agentic-flow/.claude/commands/swarm/analysis.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/commands/swarm/analysis.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/.claude/commands/swarm/development.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `agentic-flow/.claude/commands/swarm/development.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/commands/swarm/development.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/.claude/commands/swarm/examples.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `agentic-flow/.claude/commands/swarm/examples.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/commands/swarm/examples.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/.claude/commands/swarm/maintenance.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `agentic-flow/.claude/commands/swarm/maintenance.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/commands/swarm/maintenance.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/.claude/commands/swarm/optimization.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `agentic-flow/.claude/commands/swarm/optimization.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/commands/swarm/optimization.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/.claude/commands/swarm/research.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 1 pattern(s) found `agentic-flow/.claude/commands/swarm/research.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/commands/swarm/research.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/.claude/commands/swarm/swarm-analysis.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `agentic-flow/.claude/commands/swarm/swarm-analysis.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/commands/swarm/swarm-analysis.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/.claude/commands/swarm/swarm-background.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `agentic-flow/.claude/commands/swarm/swarm-background.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/commands/swarm/swarm-background.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/.claude/commands/swarm/swarm-init.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `agentic-flow/.claude/commands/swarm/swarm-init.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/commands/swarm/swarm-init.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/.claude/commands/swarm/swarm-modes.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `agentic-flow/.claude/commands/swarm/swarm-modes.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/commands/swarm/swarm-modes.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/.claude/commands/swarm/swarm-monitor.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `agentic-flow/.claude/commands/swarm/swarm-monitor.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/commands/swarm/swarm-monitor.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/.claude/commands/swarm/swarm-spawn.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `agentic-flow/.claude/commands/swarm/swarm-spawn.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/commands/swarm/swarm-spawn.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/.claude/commands/swarm/swarm-status.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `agentic-flow/.claude/commands/swarm/swarm-status.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/commands/swarm/swarm-status.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/.claude/commands/swarm/swarm-strategies.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `agentic-flow/.claude/commands/swarm/swarm-strategies.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/commands/swarm/swarm-strategies.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: requirements, acceptance criteria, success metric) `agentic-flow/.claude/commands/swarm/swarm.md`
  💡 Add missing sections: requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `agentic-flow/.claude/commands/swarm/swarm.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/commands/swarm/swarm.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/.claude/commands/swarm/testing.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `agentic-flow/.claude/commands/swarm/testing.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/commands/swarm/testing.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/.claude/commands/training/README.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `agentic-flow/.claude/commands/training/README.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/commands/training/README.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/.claude/commands/training/model-update.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `agentic-flow/.claude/commands/training/model-update.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/commands/training/model-update.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/.claude/commands/training/neural-patterns.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 1 pattern(s) found `agentic-flow/.claude/commands/training/neural-patterns.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/commands/training/neural-patterns.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/.claude/commands/training/neural-train.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `agentic-flow/.claude/commands/training/neural-train.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/commands/training/neural-train.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/.claude/commands/training/pattern-learn.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `agentic-flow/.claude/commands/training/pattern-learn.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/commands/training/pattern-learn.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/.claude/commands/training/specialization.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `agentic-flow/.claude/commands/training/specialization.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/commands/training/specialization.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/.claude/commands/truth/start.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 3 pattern(s) found `agentic-flow/.claude/commands/truth/start.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/commands/truth/start.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/.claude/commands/verify/check.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `agentic-flow/.claude/commands/verify/check.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/commands/verify/check.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/.claude/commands/verify/start.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `agentic-flow/.claude/commands/verify/start.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/commands/verify/start.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/.claude/commands/workflows/README.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `agentic-flow/.claude/commands/workflows/README.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/commands/workflows/README.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/.claude/commands/workflows/development.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `agentic-flow/.claude/commands/workflows/development.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/commands/workflows/development.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/.claude/commands/workflows/research.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `agentic-flow/.claude/commands/workflows/research.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/commands/workflows/research.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/.claude/commands/workflows/workflow-create.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `agentic-flow/.claude/commands/workflows/workflow-create.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/commands/workflows/workflow-create.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/.claude/commands/workflows/workflow-execute.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `agentic-flow/.claude/commands/workflows/workflow-execute.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/commands/workflows/workflow-execute.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/.claude/commands/workflows/workflow-export.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `agentic-flow/.claude/commands/workflows/workflow-export.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/commands/workflows/workflow-export.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: objective, acceptance criteria, success metric) `agentic-flow/.claude/openrouter-models-research.md`
  💡 Add missing sections: objective, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 1 pattern(s) found `agentic-flow/.claude/openrouter-models-research.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/openrouter-models-research.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/.claude/openrouter-quick-reference.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `agentic-flow/.claude/openrouter-quick-reference.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/.claude/openrouter-quick-reference.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/CHANGELOG.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `agentic-flow/CHANGELOG.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/CHANGELOG.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/README.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `agentic-flow/README.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/README.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: objective, requirements, acceptance criteria) `agentic-flow/docker/claude-agent-sdk/docker/claude-agent-sdk/FASTMCP_SUMMARY.md`
  💡 Add missing sections: objective, requirements, acceptance criteria
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `agentic-flow/docker/claude-agent-sdk/docker/claude-agent-sdk/FASTMCP_SUMMARY.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/docker/claude-agent-sdk/docker/claude-agent-sdk/FASTMCP_SUMMARY.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/docker/claude-agent-sdk/docker/claude-agent-sdk/docs/ARCHITECTURE.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 1 pattern(s) found `agentic-flow/docker/claude-agent-sdk/docker/claude-agent-sdk/docs/ARCHITECTURE.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/docker/claude-agent-sdk/docker/claude-agent-sdk/docs/ARCHITECTURE.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/docker/claude-agent-sdk/docker/claude-agent-sdk/docs/fastmcp-implementation.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 1 pattern(s) found `agentic-flow/docker/claude-agent-sdk/docker/claude-agent-sdk/docs/fastmcp-implementation.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/docker/claude-agent-sdk/docker/claude-agent-sdk/docs/fastmcp-implementation.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/docker/claude-agent-sdk/docker/claude-agent-sdk/docs/fastmcp-quick-start.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `agentic-flow/docker/claude-agent-sdk/docker/claude-agent-sdk/docs/fastmcp-quick-start.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/docker/claude-agent-sdk/docker/claude-agent-sdk/docs/fastmcp-quick-start.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/docker/claude-agent-sdk/docker/claude-agent-sdk/src/mcp/fastmcp/README.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 1 pattern(s) found `agentic-flow/docker/claude-agent-sdk/docker/claude-agent-sdk/src/mcp/fastmcp/README.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/docker/claude-agent-sdk/docker/claude-agent-sdk/src/mcp/fastmcp/README.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/docker/federation-test/README.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `agentic-flow/docker/federation-test/README.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/docker/federation-test/README.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: requirements, acceptance criteria, success metric) `agentic-flow/docker/test-instance/COMPREHENSIVE_TEST_RESULTS.md`
  💡 Add missing sections: requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `agentic-flow/docker/test-instance/COMPREHENSIVE_TEST_RESULTS.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/docker/test-instance/COMPREHENSIVE_TEST_RESULTS.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/docker/test-instance/DOCKER_VALIDATION_SUMMARY.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `agentic-flow/docker/test-instance/DOCKER_VALIDATION_SUMMARY.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/docker/test-instance/DOCKER_VALIDATION_SUMMARY.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/docker/test-instance/FIX_VALIDATION_REPORT.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `agentic-flow/docker/test-instance/FIX_VALIDATION_REPORT.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/docker/test-instance/FIX_VALIDATION_REPORT.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: objective, requirements, acceptance criteria) `agentic-flow/docker/test-instance/INDEX.md`
  💡 Add missing sections: objective, requirements, acceptance criteria
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `agentic-flow/docker/test-instance/INDEX.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/docker/test-instance/INDEX.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/docker/test-instance/QUICK_START.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 1 pattern(s) found `agentic-flow/docker/test-instance/QUICK_START.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/docker/test-instance/QUICK_START.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/docker/test-instance/README.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 1 pattern(s) found `agentic-flow/docker/test-instance/README.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/docker/test-instance/README.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/docker/test-instance/VALIDATION_REPORT.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `agentic-flow/docker/test-instance/VALIDATION_REPORT.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/docker/test-instance/VALIDATION_REPORT.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/docker/test-instance/test-model-config.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `agentic-flow/docker/test-instance/test-model-config.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/docker/test-instance/test-model-config.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: objective, acceptance criteria, success metric) `agentic-flow/docs/CLAUDE.md`
  💡 Add missing sections: objective, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 1 pattern(s) found `agentic-flow/docs/CLAUDE.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/docs/CLAUDE.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/docs/DOCKER-VERIFICATION.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `agentic-flow/docs/DOCKER-VERIFICATION.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/docs/DOCKER-VERIFICATION.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/docs/ISSUE-55-VALIDATION.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `agentic-flow/docs/ISSUE-55-VALIDATION.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/docs/ISSUE-55-VALIDATION.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/docs/NPX_AGENTDB_SETUP.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `agentic-flow/docs/NPX_AGENTDB_SETUP.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/docs/NPX_AGENTDB_SETUP.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/docs/OPTIMIZATIONS.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `agentic-flow/docs/OPTIMIZATIONS.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/docs/OPTIMIZATIONS.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/docs/PUBLISH_GUIDE.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 1 pattern(s) found `agentic-flow/docs/PUBLISH_GUIDE.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/docs/PUBLISH_GUIDE.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/docs/README.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `agentic-flow/docs/README.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/docs/README.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/docs/RELEASE-v1.10.0-COMPLETE.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `agentic-flow/docs/RELEASE-v1.10.0-COMPLETE.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/docs/RELEASE-v1.10.0-COMPLETE.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: objective, requirements, acceptance criteria) `agentic-flow/docs/architecture/EXECUTIVE_SUMMARY.md`
  💡 Add missing sections: objective, requirements, acceptance criteria
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `agentic-flow/docs/architecture/EXECUTIVE_SUMMARY.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/docs/architecture/EXECUTIVE_SUMMARY.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: objective, requirements, acceptance criteria) `agentic-flow/docs/architecture/FEDERATION-DATA-LIFECYCLE.md`
  💡 Add missing sections: objective, requirements, acceptance criteria
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 1 pattern(s) found `agentic-flow/docs/architecture/FEDERATION-DATA-LIFECYCLE.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/docs/architecture/FEDERATION-DATA-LIFECYCLE.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/docs/architecture/IMPROVEMENT_PLAN.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `agentic-flow/docs/architecture/IMPROVEMENT_PLAN.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/docs/architecture/IMPROVEMENT_PLAN.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/docs/architecture/INTEGRATION-STATUS.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `agentic-flow/docs/architecture/INTEGRATION-STATUS.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/docs/architecture/INTEGRATION-STATUS.md`
- ❌ [WARNING] PRD has required sections: 2/4 sections present (missing: objective, acceptance criteria) `agentic-flow/docs/architecture/MULTI_MODEL_ROUTER_PLAN.md`
  💡 Add missing sections: objective, acceptance criteria
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `agentic-flow/docs/architecture/MULTI_MODEL_ROUTER_PLAN.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/docs/architecture/MULTI_MODEL_ROUTER_PLAN.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/docs/architecture/PACKAGE_STRUCTURE.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `agentic-flow/docs/architecture/PACKAGE_STRUCTURE.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/docs/architecture/PACKAGE_STRUCTURE.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: objective, acceptance criteria, success metric) `agentic-flow/docs/architecture/QUIC-IMPLEMENTATION-SUMMARY.md`
  💡 Add missing sections: objective, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 1 pattern(s) found `agentic-flow/docs/architecture/QUIC-IMPLEMENTATION-SUMMARY.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/docs/architecture/QUIC-IMPLEMENTATION-SUMMARY.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/docs/architecture/QUIC-SWARM-INTEGRATION.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 1 pattern(s) found `agentic-flow/docs/architecture/QUIC-SWARM-INTEGRATION.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/docs/architecture/QUIC-SWARM-INTEGRATION.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/docs/architecture/QUICK_WINS.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `agentic-flow/docs/architecture/QUICK_WINS.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/docs/architecture/QUICK_WINS.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/docs/architecture/README.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `agentic-flow/docs/architecture/README.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/docs/architecture/README.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/docs/architecture/RESEARCH_SUMMARY.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `agentic-flow/docs/architecture/RESEARCH_SUMMARY.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/docs/architecture/RESEARCH_SUMMARY.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/docs/archive/.agentdb-instructions.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `agentic-flow/docs/archive/.agentdb-instructions.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/docs/archive/.agentdb-instructions.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/docs/archive/AGENT-BOOSTER-STATUS.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `agentic-flow/docs/archive/AGENT-BOOSTER-STATUS.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/docs/archive/AGENT-BOOSTER-STATUS.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/docs/archive/CHANGELOG-v1.3.0.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 1 pattern(s) found `agentic-flow/docs/archive/CHANGELOG-v1.3.0.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/docs/archive/CHANGELOG-v1.3.0.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: objective, acceptance criteria, success metric) `agentic-flow/docs/archive/COMPLETION_REPORT_v1.7.1.md`
  💡 Add missing sections: objective, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `agentic-flow/docs/archive/COMPLETION_REPORT_v1.7.1.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/docs/archive/COMPLETION_REPORT_v1.7.1.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/docs/archive/IMPLEMENTATION_SUMMARY_v1.7.1.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `agentic-flow/docs/archive/IMPLEMENTATION_SUMMARY_v1.7.1.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/docs/archive/IMPLEMENTATION_SUMMARY_v1.7.1.md`
- ❌ [WARNING] PRD has required sections: 2/4 sections present (missing: requirements, acceptance criteria) `agentic-flow/docs/archive/SUPABASE-INTEGRATION-COMPLETE.md`
  💡 Add missing sections: requirements, acceptance criteria
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `agentic-flow/docs/archive/SUPABASE-INTEGRATION-COMPLETE.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/docs/archive/SUPABASE-INTEGRATION-COMPLETE.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/docs/archive/TESTING_QUICK_START.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `agentic-flow/docs/archive/TESTING_QUICK_START.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/docs/archive/TESTING_QUICK_START.md`
- ❌ [WARNING] PRD has required sections: 3/4 sections present (missing: objective) `agentic-flow/docs/archive/TOOL-EMULATION-INTEGRATION-ISSUE.md`
  💡 Add missing sections: objective
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `agentic-flow/docs/archive/TOOL-EMULATION-INTEGRATION-ISSUE.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/docs/archive/TOOL-EMULATION-INTEGRATION-ISSUE.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/docs/archive/VALIDATION_v1.7.1.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `agentic-flow/docs/archive/VALIDATION_v1.7.1.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/docs/archive/VALIDATION_v1.7.1.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/docs/archived/DOCKER_MCP_VALIDATION.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `agentic-flow/docs/archived/DOCKER_MCP_VALIDATION.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/docs/archived/DOCKER_MCP_VALIDATION.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: objective, requirements, acceptance criteria) `agentic-flow/docs/archived/FASTMCP_INTEGRATION_STATUS.md`
  💡 Add missing sections: objective, requirements, acceptance criteria
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 1 pattern(s) found `agentic-flow/docs/archived/FASTMCP_INTEGRATION_STATUS.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/docs/archived/FASTMCP_INTEGRATION_STATUS.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/docs/archived/HOTFIX_1.1.7.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `agentic-flow/docs/archived/HOTFIX_1.1.7.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/docs/archived/HOTFIX_1.1.7.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/docs/archived/MCP_PROXY_VALIDATION.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 1 pattern(s) found `agentic-flow/docs/archived/MCP_PROXY_VALIDATION.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/docs/archived/MCP_PROXY_VALIDATION.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/docs/archived/ONNX_INTEGRATION.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `agentic-flow/docs/archived/ONNX_INTEGRATION.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/docs/archived/ONNX_INTEGRATION.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: objective, requirements, acceptance criteria) `agentic-flow/docs/archived/docker-cli-validation.md`
  💡 Add missing sections: objective, requirements, acceptance criteria
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 1 pattern(s) found `agentic-flow/docs/archived/docker-cli-validation.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/docs/archived/docker-cli-validation.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/docs/archived/mcp-validation-summary.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `agentic-flow/docs/archived/mcp-validation-summary.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/docs/archived/mcp-validation-summary.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/docs/benchmarks/optimization-guide.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 3 pattern(s) found `agentic-flow/docs/benchmarks/optimization-guide.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/docs/benchmarks/optimization-guide.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: objective, acceptance criteria, success metric) `agentic-flow/docs/benchmarks/quic-results.md`
  💡 Add missing sections: objective, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 3 pattern(s) found `agentic-flow/docs/benchmarks/quic-results.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/docs/benchmarks/quic-results.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/docs/federation/AGENT-DEBUG-STREAMING.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 1 pattern(s) found `agentic-flow/docs/federation/AGENT-DEBUG-STREAMING.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/docs/federation/AGENT-DEBUG-STREAMING.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: objective, requirements, acceptance criteria) `agentic-flow/docs/federation/DEBUG-STREAMING-COMPLETE.md`
  💡 Add missing sections: objective, requirements, acceptance criteria
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `agentic-flow/docs/federation/DEBUG-STREAMING-COMPLETE.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/docs/federation/DEBUG-STREAMING-COMPLETE.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/docs/federation/DEBUG-STREAMING.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 1 pattern(s) found `agentic-flow/docs/federation/DEBUG-STREAMING.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/docs/federation/DEBUG-STREAMING.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: objective, requirements, acceptance criteria) `agentic-flow/docs/federation/DEPLOYMENT-VALIDATION-SUCCESS.md`
  💡 Add missing sections: objective, requirements, acceptance criteria
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `agentic-flow/docs/federation/DEPLOYMENT-VALIDATION-SUCCESS.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/docs/federation/DEPLOYMENT-VALIDATION-SUCCESS.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/docs/federation/DOCKER-FEDERATION-DEEP-REVIEW.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 1 pattern(s) found `agentic-flow/docs/federation/DOCKER-FEDERATION-DEEP-REVIEW.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/docs/federation/DOCKER-FEDERATION-DEEP-REVIEW.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/docs/guides/ADDING-MCP-SERVERS-CLI.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `agentic-flow/docs/guides/ADDING-MCP-SERVERS-CLI.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/docs/guides/ADDING-MCP-SERVERS-CLI.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/docs/guides/ADDING-MCP-SERVERS.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 1 pattern(s) found `agentic-flow/docs/guides/ADDING-MCP-SERVERS.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/docs/guides/ADDING-MCP-SERVERS.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/docs/guides/AGENT-BOOSTER.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `agentic-flow/docs/guides/AGENT-BOOSTER.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/docs/guides/AGENT-BOOSTER.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/docs/guides/ALTERNATIVE_LLM_MODELS.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `agentic-flow/docs/guides/ALTERNATIVE_LLM_MODELS.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/docs/guides/ALTERNATIVE_LLM_MODELS.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: objective, acceptance criteria, success metric) `agentic-flow/docs/guides/CLAUDE-CODE-INTEGRATION.md`
  💡 Add missing sections: objective, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 1 pattern(s) found `agentic-flow/docs/guides/CLAUDE-CODE-INTEGRATION.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/docs/guides/CLAUDE-CODE-INTEGRATION.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/docs/guides/DEPLOYMENT.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 1 pattern(s) found `agentic-flow/docs/guides/DEPLOYMENT.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/docs/guides/DEPLOYMENT.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/docs/guides/DOCKER_AGENT_USAGE.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 1 pattern(s) found `agentic-flow/docs/guides/DOCKER_AGENT_USAGE.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/docs/guides/DOCKER_AGENT_USAGE.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/docs/guides/IMPLEMENTATION_EXAMPLES.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `agentic-flow/docs/guides/IMPLEMENTATION_EXAMPLES.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/docs/guides/IMPLEMENTATION_EXAMPLES.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/docs/guides/MCP-TOOLS.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `agentic-flow/docs/guides/MCP-TOOLS.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/docs/guides/MCP-TOOLS.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/docs/guides/MODEL-ID-MAPPING.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `agentic-flow/docs/guides/MODEL-ID-MAPPING.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/docs/guides/MODEL-ID-MAPPING.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: objective, acceptance criteria, success metric) `agentic-flow/docs/guides/MULTI-MODEL-ROUTER.md`
  💡 Add missing sections: objective, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `agentic-flow/docs/guides/MULTI-MODEL-ROUTER.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/docs/guides/MULTI-MODEL-ROUTER.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/docs/guides/NPM-PUBLISH.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 1 pattern(s) found `agentic-flow/docs/guides/NPM-PUBLISH.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/docs/guides/NPM-PUBLISH.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/docs/guides/ONNX-PROXY-IMPLEMENTATION.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 1 pattern(s) found `agentic-flow/docs/guides/ONNX-PROXY-IMPLEMENTATION.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/docs/guides/ONNX-PROXY-IMPLEMENTATION.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/docs/guides/ONNX_CLI_USAGE.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 1 pattern(s) found `agentic-flow/docs/guides/ONNX_CLI_USAGE.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/docs/guides/ONNX_CLI_USAGE.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/docs/guides/ONNX_OPTIMIZATION_GUIDE.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `agentic-flow/docs/guides/ONNX_OPTIMIZATION_GUIDE.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/docs/guides/ONNX_OPTIMIZATION_GUIDE.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/docs/guides/OPENROUTER_DEPLOYMENT.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `agentic-flow/docs/guides/OPENROUTER_DEPLOYMENT.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/docs/guides/OPENROUTER_DEPLOYMENT.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/docs/guides/PROXY-ARCHITECTURE-AND-EXTENSION.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 1 pattern(s) found `agentic-flow/docs/guides/PROXY-ARCHITECTURE-AND-EXTENSION.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/docs/guides/PROXY-ARCHITECTURE-AND-EXTENSION.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/docs/guides/QUIC-SWARM-QUICKSTART.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `agentic-flow/docs/guides/QUIC-SWARM-QUICKSTART.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/docs/guides/QUIC-SWARM-QUICKSTART.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/docs/guides/QUICK-START-v1.7.1.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 3 pattern(s) found `agentic-flow/docs/guides/QUICK-START-v1.7.1.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/docs/guides/QUICK-START-v1.7.1.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/docs/guides/README.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `agentic-flow/docs/guides/README.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/docs/guides/README.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: objective, acceptance criteria, success metric) `agentic-flow/docs/guides/REASONINGBANK.md`
  💡 Add missing sections: objective, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 3 pattern(s) found `agentic-flow/docs/guides/REASONINGBANK.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/docs/guides/REASONINGBANK.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/docs/guides/STANDALONE_PROXY_GUIDE.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 1 pattern(s) found `agentic-flow/docs/guides/STANDALONE_PROXY_GUIDE.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/docs/guides/STANDALONE_PROXY_GUIDE.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/docs/guides/agent-sdk.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 1 pattern(s) found `agentic-flow/docs/guides/agent-sdk.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/docs/guides/agent-sdk.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/docs/integration-docs/AGENT-BOOSTER-INTEGRATION.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `agentic-flow/docs/integration-docs/AGENT-BOOSTER-INTEGRATION.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/docs/integration-docs/AGENT-BOOSTER-INTEGRATION.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/docs/integration-docs/CLAUDE-FLOW-INTEGRATION-ANALYSIS.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `agentic-flow/docs/integration-docs/CLAUDE-FLOW-INTEGRATION-ANALYSIS.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/docs/integration-docs/CLAUDE-FLOW-INTEGRATION-ANALYSIS.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/docs/integration-docs/CLI-INTEGRATION-COMPLETE.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `agentic-flow/docs/integration-docs/CLI-INTEGRATION-COMPLETE.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/docs/integration-docs/CLI-INTEGRATION-COMPLETE.md`
- ❌ [WARNING] PRD has required sections: 2/4 sections present (missing: acceptance criteria, success metric) `agentic-flow/docs/integration-docs/IMPLEMENTATION_SUMMARY.md`
  💡 Add missing sections: acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 1 pattern(s) found `agentic-flow/docs/integration-docs/IMPLEMENTATION_SUMMARY.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/docs/integration-docs/IMPLEMENTATION_SUMMARY.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/docs/integration-docs/INTEGRATION-COMPLETE.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `agentic-flow/docs/integration-docs/INTEGRATION-COMPLETE.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/docs/integration-docs/INTEGRATION-COMPLETE.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/docs/integration-docs/INTEGRATION-QUICK-SUMMARY.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `agentic-flow/docs/integration-docs/INTEGRATION-QUICK-SUMMARY.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/docs/integration-docs/INTEGRATION-QUICK-SUMMARY.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/docs/integration-docs/INTEGRATION-STATUS-CORRECTED.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `agentic-flow/docs/integration-docs/INTEGRATION-STATUS-CORRECTED.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/docs/integration-docs/INTEGRATION-STATUS-CORRECTED.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: objective, acceptance criteria, success metric) `agentic-flow/docs/integration-docs/INTEGRATION_COMPLETE_SUMMARY.md`
  💡 Add missing sections: objective, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `agentic-flow/docs/integration-docs/INTEGRATION_COMPLETE_SUMMARY.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/docs/integration-docs/INTEGRATION_COMPLETE_SUMMARY.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/docs/integration-docs/QUIC-WASM-INTEGRATION.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `agentic-flow/docs/integration-docs/QUIC-WASM-INTEGRATION.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/docs/integration-docs/QUIC-WASM-INTEGRATION.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/docs/integration-docs/README.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `agentic-flow/docs/integration-docs/README.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/docs/integration-docs/README.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/docs/integration-docs/WASM_ESM_FIX.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 1 pattern(s) found `agentic-flow/docs/integration-docs/WASM_ESM_FIX.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/docs/integration-docs/WASM_ESM_FIX.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/docs/integration-docs/WASM_INTEGRATION_COMPLETE.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `agentic-flow/docs/integration-docs/WASM_INTEGRATION_COMPLETE.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/docs/integration-docs/WASM_INTEGRATION_COMPLETE.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/docs/integrations/CLAUDE_AGENTS_INTEGRATION.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 1 pattern(s) found `agentic-flow/docs/integrations/CLAUDE_AGENTS_INTEGRATION.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/docs/integrations/CLAUDE_AGENTS_INTEGRATION.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: objective, acceptance criteria, success metric) `agentic-flow/docs/integrations/CLAUDE_FLOW_INTEGRATION.md`
  💡 Add missing sections: objective, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 1 pattern(s) found `agentic-flow/docs/integrations/CLAUDE_FLOW_INTEGRATION.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/docs/integrations/CLAUDE_FLOW_INTEGRATION.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/docs/integrations/FASTMCP_CLI_INTEGRATION.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `agentic-flow/docs/integrations/FASTMCP_CLI_INTEGRATION.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/docs/integrations/FASTMCP_CLI_INTEGRATION.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/docs/integrations/FLOW-NEXUS-INTEGRATION.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `agentic-flow/docs/integrations/FLOW-NEXUS-INTEGRATION.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/docs/integrations/FLOW-NEXUS-INTEGRATION.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/docs/integrations/README.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `agentic-flow/docs/integrations/README.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/docs/integrations/README.md`
- ❌ [WARNING] PRD has required sections: 2/4 sections present (missing: objective, acceptance criteria) `agentic-flow/docs/integrations/fastmcp-implementation-plan.md`
  💡 Add missing sections: objective, acceptance criteria
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 3 pattern(s) found `agentic-flow/docs/integrations/fastmcp-implementation-plan.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/docs/integrations/fastmcp-implementation-plan.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/docs/integrations/fastmcp-poc-integration.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `agentic-flow/docs/integrations/fastmcp-poc-integration.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/docs/integrations/fastmcp-poc-integration.md`
- ❌ [WARNING] PRD has required sections: 3/4 sections present (missing: requirements) `agentic-flow/docs/issues/ISSUE-SUPABASE-INTEGRATION.md`
  💡 Add missing sections: requirements
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `agentic-flow/docs/issues/ISSUE-SUPABASE-INTEGRATION.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/docs/issues/ISSUE-SUPABASE-INTEGRATION.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: objective, acceptance criteria, success metric) `agentic-flow/docs/issues/ISSUE-xenova-transformers-dependency.md`
  💡 Add missing sections: objective, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 1 pattern(s) found `agentic-flow/docs/issues/ISSUE-xenova-transformers-dependency.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/docs/issues/ISSUE-xenova-transformers-dependency.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/docs/plans/QUIC/BUILD_INSTRUCTIONS.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 1 pattern(s) found `agentic-flow/docs/plans/QUIC/BUILD_INSTRUCTIONS.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/docs/plans/QUIC/BUILD_INSTRUCTIONS.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/docs/plans/QUIC/IMPLEMENTATION_STATUS.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `agentic-flow/docs/plans/QUIC/IMPLEMENTATION_STATUS.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/docs/plans/QUIC/IMPLEMENTATION_STATUS.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/docs/plans/QUIC/QUIC-INTEGRATION-SUMMARY.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 1 pattern(s) found `agentic-flow/docs/plans/QUIC/QUIC-INTEGRATION-SUMMARY.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/docs/plans/QUIC/QUIC-INTEGRATION-SUMMARY.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/docs/plans/QUIC/QUIC-INTEGRATION.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 1 pattern(s) found `agentic-flow/docs/plans/QUIC/QUIC-INTEGRATION.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/docs/plans/QUIC/QUIC-INTEGRATION.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: objective, acceptance criteria, success metric) `agentic-flow/docs/plans/QUIC/QUIC-README.md`
  💡 Add missing sections: objective, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 1 pattern(s) found `agentic-flow/docs/plans/QUIC/QUIC-README.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/docs/plans/QUIC/QUIC-README.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/docs/plans/QUIC/QUIC_IMPLEMENTATION_SUMMARY.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `agentic-flow/docs/plans/QUIC/QUIC_IMPLEMENTATION_SUMMARY.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/docs/plans/QUIC/QUIC_IMPLEMENTATION_SUMMARY.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/docs/plans/QUIC/README-CONDENSED.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `agentic-flow/docs/plans/QUIC/README-CONDENSED.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/docs/plans/QUIC/README-CONDENSED.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: requirements, acceptance criteria, success metric) `agentic-flow/docs/plans/QUIC/quic-research.md`
  💡 Add missing sections: requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `agentic-flow/docs/plans/QUIC/quic-research.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/docs/plans/QUIC/quic-research.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/docs/plans/QUIC/quic-tutorial.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 3 pattern(s) found `agentic-flow/docs/plans/QUIC/quic-tutorial.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/docs/plans/QUIC/quic-tutorial.md`
- ❌ [WARNING] PRD has required sections: 2/4 sections present (missing: requirements, acceptance criteria) `agentic-flow/docs/plans/agent-booster/00-INDEX.md`
  💡 Add missing sections: requirements, acceptance criteria
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `agentic-flow/docs/plans/agent-booster/00-INDEX.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/docs/plans/agent-booster/00-INDEX.md`
- ❌ [WARNING] PRD has required sections: 2/4 sections present (missing: requirements, acceptance criteria) `agentic-flow/docs/plans/agent-booster/00-OVERVIEW.md`
  💡 Add missing sections: requirements, acceptance criteria
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `agentic-flow/docs/plans/agent-booster/00-OVERVIEW.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/docs/plans/agent-booster/00-OVERVIEW.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/docs/plans/agent-booster/01-ARCHITECTURE.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `agentic-flow/docs/plans/agent-booster/01-ARCHITECTURE.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/docs/plans/agent-booster/01-ARCHITECTURE.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/docs/plans/agent-booster/02-INTEGRATION.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `agentic-flow/docs/plans/agent-booster/02-INTEGRATION.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/docs/plans/agent-booster/02-INTEGRATION.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/docs/plans/agent-booster/03-BENCHMARKS.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `agentic-flow/docs/plans/agent-booster/03-BENCHMARKS.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/docs/plans/agent-booster/03-BENCHMARKS.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/docs/plans/agent-booster/04-NPM-SDK.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `agentic-flow/docs/plans/agent-booster/04-NPM-SDK.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/docs/plans/agent-booster/04-NPM-SDK.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: requirements, acceptance criteria, success metric) `agentic-flow/docs/plans/agent-booster/GITHUB-ISSUE.md`
  💡 Add missing sections: requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `agentic-flow/docs/plans/agent-booster/GITHUB-ISSUE.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/docs/plans/agent-booster/GITHUB-ISSUE.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/docs/plans/agent-booster/README.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `agentic-flow/docs/plans/agent-booster/README.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/docs/plans/agent-booster/README.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/docs/plans/agent-booster-cli-integration.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `agentic-flow/docs/plans/agent-booster-cli-integration.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/docs/plans/agent-booster-cli-integration.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/docs/plans/requesty/00-overview.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 3 pattern(s) found `agentic-flow/docs/plans/requesty/00-overview.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/docs/plans/requesty/00-overview.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: objective, acceptance criteria, success metric) `agentic-flow/docs/plans/requesty/01-api-research.md`
  💡 Add missing sections: objective, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `agentic-flow/docs/plans/requesty/01-api-research.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/docs/plans/requesty/01-api-research.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: objective, acceptance criteria, success metric) `agentic-flow/docs/plans/requesty/02-architecture.md`
  💡 Add missing sections: objective, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `agentic-flow/docs/plans/requesty/02-architecture.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/docs/plans/requesty/02-architecture.md`
- ❌ [WARNING] PRD has required sections: 3/4 sections present (missing: requirements) `agentic-flow/docs/plans/requesty/03-implementation-phases.md`
  💡 Add missing sections: requirements
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 3 pattern(s) found `agentic-flow/docs/plans/requesty/03-implementation-phases.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/docs/plans/requesty/03-implementation-phases.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: objective, requirements, success metric) `agentic-flow/docs/plans/requesty/04-testing-strategy.md`
  💡 Add missing sections: objective, requirements, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 3 pattern(s) found `agentic-flow/docs/plans/requesty/04-testing-strategy.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/docs/plans/requesty/04-testing-strategy.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/docs/plans/requesty/05-migration-guide.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 1 pattern(s) found `agentic-flow/docs/plans/requesty/05-migration-guide.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/docs/plans/requesty/05-migration-guide.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: objective, requirements, success metric) `agentic-flow/docs/plans/requesty/README.md`
  💡 Add missing sections: objective, requirements, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 3 pattern(s) found `agentic-flow/docs/plans/requesty/README.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/docs/plans/requesty/README.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/docs/providers/LANDING-PAGE-PROVIDER-CONTENT.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 1 pattern(s) found `agentic-flow/docs/providers/LANDING-PAGE-PROVIDER-CONTENT.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/docs/providers/LANDING-PAGE-PROVIDER-CONTENT.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: objective, acceptance criteria, success metric) `agentic-flow/docs/providers/PROVIDER-FALLBACK-GUIDE.md`
  💡 Add missing sections: objective, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `agentic-flow/docs/providers/PROVIDER-FALLBACK-GUIDE.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/docs/providers/PROVIDER-FALLBACK-GUIDE.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: objective, acceptance criteria, success metric) `agentic-flow/docs/providers/PROVIDER-FALLBACK-SUMMARY.md`
  💡 Add missing sections: objective, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `agentic-flow/docs/providers/PROVIDER-FALLBACK-SUMMARY.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/docs/providers/PROVIDER-FALLBACK-SUMMARY.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: objective, acceptance criteria, success metric) `agentic-flow/docs/quantum-goap/EXECUTION_SUMMARY.md`
  💡 Add missing sections: objective, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `agentic-flow/docs/quantum-goap/EXECUTION_SUMMARY.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/docs/quantum-goap/EXECUTION_SUMMARY.md`
- ❌ [WARNING] PRD has required sections: 3/4 sections present (missing: objective) `agentic-flow/docs/quantum-goap/GOAP_IMPLEMENTATION_PLAN.md`
  💡 Add missing sections: objective
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 4 pattern(s) found `agentic-flow/docs/quantum-goap/GOAP_IMPLEMENTATION_PLAN.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/docs/quantum-goap/GOAP_IMPLEMENTATION_PLAN.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/docs/quantum-goap/QUICK_START.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 1 pattern(s) found `agentic-flow/docs/quantum-goap/QUICK_START.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/docs/quantum-goap/QUICK_START.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: objective, acceptance criteria, success metric) `agentic-flow/docs/quantum-research/QUANTUM_RESEARCH_LITERATURE_REVIEW.md`
  💡 Add missing sections: objective, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 3 pattern(s) found `agentic-flow/docs/quantum-research/QUANTUM_RESEARCH_LITERATURE_REVIEW.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/docs/quantum-research/QUANTUM_RESEARCH_LITERATURE_REVIEW.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/docs/quantum-research/README.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `agentic-flow/docs/quantum-research/README.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/docs/quantum-research/README.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/docs/reasoningbank/MEMORY_VALIDATION_REPORT.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 1 pattern(s) found `agentic-flow/docs/reasoningbank/MEMORY_VALIDATION_REPORT.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/docs/reasoningbank/MEMORY_VALIDATION_REPORT.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/docs/reasoningbank/README.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `agentic-flow/docs/reasoningbank/README.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/docs/reasoningbank/README.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: objective, acceptance criteria, success metric) `agentic-flow/docs/reasoningbank/REASONING-AGENTS.md`
  💡 Add missing sections: objective, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `agentic-flow/docs/reasoningbank/REASONING-AGENTS.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/docs/reasoningbank/REASONING-AGENTS.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/docs/reasoningbank/REASONINGBANK-BENCHMARK-RESULTS.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `agentic-flow/docs/reasoningbank/REASONINGBANK-BENCHMARK-RESULTS.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/docs/reasoningbank/REASONINGBANK-BENCHMARK-RESULTS.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: objective, acceptance criteria, success metric) `agentic-flow/docs/reasoningbank/REASONINGBANK-BENCHMARK.md`
  💡 Add missing sections: objective, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `agentic-flow/docs/reasoningbank/REASONINGBANK-BENCHMARK.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/docs/reasoningbank/REASONINGBANK-BENCHMARK.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/docs/reasoningbank/REASONINGBANK-CLI-INTEGRATION.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `agentic-flow/docs/reasoningbank/REASONINGBANK-CLI-INTEGRATION.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/docs/reasoningbank/REASONINGBANK-CLI-INTEGRATION.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/docs/reasoningbank/REASONINGBANK-DEMO.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `agentic-flow/docs/reasoningbank/REASONINGBANK-DEMO.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/docs/reasoningbank/REASONINGBANK-DEMO.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/docs/reasoningbank/REASONINGBANK-VALIDATION.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `agentic-flow/docs/reasoningbank/REASONINGBANK-VALIDATION.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/docs/reasoningbank/REASONINGBANK-VALIDATION.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/docs/reasoningbank/REASONINGBANK_ARCHITECTURE.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `agentic-flow/docs/reasoningbank/REASONINGBANK_ARCHITECTURE.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/docs/reasoningbank/REASONINGBANK_ARCHITECTURE.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: objective, acceptance criteria, success metric) `agentic-flow/docs/reasoningbank/REASONINGBANK_BACKENDS.md`
  💡 Add missing sections: objective, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `agentic-flow/docs/reasoningbank/REASONINGBANK_BACKENDS.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/docs/reasoningbank/REASONINGBANK_BACKENDS.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/docs/reasoningbank/REASONINGBANK_FIXES.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 3 pattern(s) found `agentic-flow/docs/reasoningbank/REASONINGBANK_FIXES.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/docs/reasoningbank/REASONINGBANK_FIXES.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/docs/reasoningbank/REASONINGBANK_IMPLEMENTATION_STATUS.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `agentic-flow/docs/reasoningbank/REASONINGBANK_IMPLEMENTATION_STATUS.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/docs/reasoningbank/REASONINGBANK_IMPLEMENTATION_STATUS.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: objective, acceptance criteria, success metric) `agentic-flow/docs/reasoningbank/REASONINGBANK_INTEGRATION_PLAN.md`
  💡 Add missing sections: objective, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 3 pattern(s) found `agentic-flow/docs/reasoningbank/REASONINGBANK_INTEGRATION_PLAN.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/docs/reasoningbank/REASONINGBANK_INTEGRATION_PLAN.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/docs/reasoningbank/REASONINGBANK_INVESTIGATION.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 1 pattern(s) found `agentic-flow/docs/reasoningbank/REASONINGBANK_INVESTIGATION.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/docs/reasoningbank/REASONINGBANK_INVESTIGATION.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/docs/releases/GITHUB-ISSUE-ADDENDUM-v1.4.6.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 3 pattern(s) found `agentic-flow/docs/releases/GITHUB-ISSUE-ADDENDUM-v1.4.6.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/docs/releases/GITHUB-ISSUE-ADDENDUM-v1.4.6.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: objective, acceptance criteria, success metric) `agentic-flow/docs/releases/GITHUB-ISSUE-REASONINGBANK-BENCHMARK.md`
  💡 Add missing sections: objective, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `agentic-flow/docs/releases/GITHUB-ISSUE-REASONINGBANK-BENCHMARK.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/docs/releases/GITHUB-ISSUE-REASONINGBANK-BENCHMARK.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: objective, acceptance criteria, success metric) `agentic-flow/docs/releases/GITHUB-ISSUE-v1.4.6.md`
  💡 Add missing sections: objective, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 3 pattern(s) found `agentic-flow/docs/releases/GITHUB-ISSUE-v1.4.6.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/docs/releases/GITHUB-ISSUE-v1.4.6.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: objective, acceptance criteria, success metric) `agentic-flow/docs/releases/GITHUB-ISSUE-v1.5.0.md`
  💡 Add missing sections: objective, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 1 pattern(s) found `agentic-flow/docs/releases/GITHUB-ISSUE-v1.5.0.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/docs/releases/GITHUB-ISSUE-v1.5.0.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/docs/releases/HOTFIX-v1.2.1.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 1 pattern(s) found `agentic-flow/docs/releases/HOTFIX-v1.2.1.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/docs/releases/HOTFIX-v1.2.1.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/docs/releases/NPM-PUBLISH-GUIDE-v1.2.0.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `agentic-flow/docs/releases/NPM-PUBLISH-GUIDE-v1.2.0.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/docs/releases/NPM-PUBLISH-GUIDE-v1.2.0.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: objective, requirements, acceptance criteria) `agentic-flow/docs/releases/PUBLISH-COMPLETE-v1.2.0.md`
  💡 Add missing sections: objective, requirements, acceptance criteria
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 1 pattern(s) found `agentic-flow/docs/releases/PUBLISH-COMPLETE-v1.2.0.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/docs/releases/PUBLISH-COMPLETE-v1.2.0.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/docs/releases/PUBLISH_CHECKLIST_v1.10.0.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `agentic-flow/docs/releases/PUBLISH_CHECKLIST_v1.10.0.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/docs/releases/PUBLISH_CHECKLIST_v1.10.0.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/docs/releases/PUBLISH_SUMMARY_v1.7.1.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `agentic-flow/docs/releases/PUBLISH_SUMMARY_v1.7.1.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/docs/releases/PUBLISH_SUMMARY_v1.7.1.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/docs/releases/README.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `agentic-flow/docs/releases/README.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/docs/releases/README.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/docs/releases/RELEASE-v1.2.0.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 1 pattern(s) found `agentic-flow/docs/releases/RELEASE-v1.2.0.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/docs/releases/RELEASE-v1.2.0.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/docs/releases/RELEASE-v1.8.13.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 1 pattern(s) found `agentic-flow/docs/releases/RELEASE-v1.8.13.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/docs/releases/RELEASE-v1.8.13.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/docs/releases/RELEASE_NOTES_v1.10.0.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `agentic-flow/docs/releases/RELEASE_NOTES_v1.10.0.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/docs/releases/RELEASE_NOTES_v1.10.0.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/docs/releases/RELEASE_NOTES_v1.7.0.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `agentic-flow/docs/releases/RELEASE_NOTES_v1.7.0.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/docs/releases/RELEASE_NOTES_v1.7.0.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/docs/releases/RELEASE_v1.7.1.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 1 pattern(s) found `agentic-flow/docs/releases/RELEASE_v1.7.1.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/docs/releases/RELEASE_v1.7.1.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/docs/releases/v1.4.6-reasoningbank-release.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `agentic-flow/docs/releases/v1.4.6-reasoningbank-release.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/docs/releases/v1.4.6-reasoningbank-release.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/docs/releases/v1.4.7-bugfix.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 1 pattern(s) found `agentic-flow/docs/releases/v1.4.7-bugfix.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/docs/releases/v1.4.7-bugfix.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/docs/releases/v1.5.14-QUIC-TRANSPORT.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 1 pattern(s) found `agentic-flow/docs/releases/v1.5.14-QUIC-TRANSPORT.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/docs/releases/v1.5.14-QUIC-TRANSPORT.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: objective, requirements, acceptance criteria) `agentic-flow/docs/supabase/IMPLEMENTATION-SUMMARY.md`
  💡 Add missing sections: objective, requirements, acceptance criteria
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `agentic-flow/docs/supabase/IMPLEMENTATION-SUMMARY.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/docs/supabase/IMPLEMENTATION-SUMMARY.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/docs/supabase/INDEX.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `agentic-flow/docs/supabase/INDEX.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/docs/supabase/INDEX.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/docs/supabase/QUICKSTART.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 1 pattern(s) found `agentic-flow/docs/supabase/QUICKSTART.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/docs/supabase/QUICKSTART.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/docs/supabase/README.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 1 pattern(s) found `agentic-flow/docs/supabase/README.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/docs/supabase/README.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/docs/supabase/SUPABASE-REALTIME-FEDERATION.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 1 pattern(s) found `agentic-flow/docs/supabase/SUPABASE-REALTIME-FEDERATION.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/docs/supabase/SUPABASE-REALTIME-FEDERATION.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: objective, acceptance criteria, success metric) `agentic-flow/docs/supabase/TEST-REPORT.md`
  💡 Add missing sections: objective, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `agentic-flow/docs/supabase/TEST-REPORT.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/docs/supabase/TEST-REPORT.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: objective, acceptance criteria, success metric) `agentic-flow/docs/testing/AGENT-SYSTEM-VALIDATION.md`
  💡 Add missing sections: objective, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `agentic-flow/docs/testing/AGENT-SYSTEM-VALIDATION.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/docs/testing/AGENT-SYSTEM-VALIDATION.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/docs/testing/AGENTDB_TESTING.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 1 pattern(s) found `agentic-flow/docs/testing/AGENTDB_TESTING.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/docs/testing/AGENTDB_TESTING.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/docs/testing/FINAL-TESTING-SUMMARY.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `agentic-flow/docs/testing/FINAL-TESTING-SUMMARY.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/docs/testing/FINAL-TESTING-SUMMARY.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/docs/testing/README.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `agentic-flow/docs/testing/README.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/docs/testing/README.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: objective, acceptance criteria, success metric) `agentic-flow/docs/testing/REGRESSION-TEST-RESULTS.md`
  💡 Add missing sections: objective, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 1 pattern(s) found `agentic-flow/docs/testing/REGRESSION-TEST-RESULTS.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/docs/testing/REGRESSION-TEST-RESULTS.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/docs/testing/STREAMING-AND-MCP-VALIDATION.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 1 pattern(s) found `agentic-flow/docs/testing/STREAMING-AND-MCP-VALIDATION.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/docs/testing/STREAMING-AND-MCP-VALIDATION.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/docs/validation-reports/BENCHMARK_AND_OPTIMIZATION_REPORT.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `agentic-flow/docs/validation-reports/BENCHMARK_AND_OPTIMIZATION_REPORT.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/docs/validation-reports/BENCHMARK_AND_OPTIMIZATION_REPORT.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: requirements, acceptance criteria, success metric) `agentic-flow/docs/validation-reports/DOCKER_VALIDATION_RESULTS.md`
  💡 Add missing sections: requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `agentic-flow/docs/validation-reports/DOCKER_VALIDATION_RESULTS.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/docs/validation-reports/DOCKER_VALIDATION_RESULTS.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/docs/validation-reports/NO_REGRESSIONS_CONFIRMED.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `agentic-flow/docs/validation-reports/NO_REGRESSIONS_CONFIRMED.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/docs/validation-reports/NO_REGRESSIONS_CONFIRMED.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/docs/validation-reports/NPM-PACKAGE-ANALYSIS-FINAL.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `agentic-flow/docs/validation-reports/NPM-PACKAGE-ANALYSIS-FINAL.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/docs/validation-reports/NPM-PACKAGE-ANALYSIS-FINAL.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/docs/validation-reports/README.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `agentic-flow/docs/validation-reports/README.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/docs/validation-reports/README.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/docs/validation-reports/V2.7.0-ALPHA.10_FINAL_VALIDATION.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `agentic-flow/docs/validation-reports/V2.7.0-ALPHA.10_FINAL_VALIDATION.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/docs/validation-reports/V2.7.0-ALPHA.10_FINAL_VALIDATION.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/docs/validation-reports/V2.7.0-ALPHA.9_VALIDATION.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `agentic-flow/docs/validation-reports/V2.7.0-ALPHA.9_VALIDATION.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/docs/validation-reports/V2.7.0-ALPHA.9_VALIDATION.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/docs/validation-reports/v1.6.0-QUIC-CLI-VALIDATION.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 1 pattern(s) found `agentic-flow/docs/validation-reports/v1.6.0-QUIC-CLI-VALIDATION.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/docs/validation-reports/v1.6.0-QUIC-CLI-VALIDATION.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/docs/validation-reports/v1.6.1-NPM-PUBLISH-VALIDATION.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `agentic-flow/docs/validation-reports/v1.6.1-NPM-PUBLISH-VALIDATION.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/docs/validation-reports/v1.6.1-NPM-PUBLISH-VALIDATION.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/docs/version-releases/PUBLICATION_REPORT_v1.5.11.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `agentic-flow/docs/version-releases/PUBLICATION_REPORT_v1.5.11.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/docs/version-releases/PUBLICATION_REPORT_v1.5.11.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/docs/version-releases/README.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `agentic-flow/docs/version-releases/README.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/docs/version-releases/README.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: objective, acceptance criteria, success metric) `agentic-flow/docs/version-releases/v1.5.9-DOCKER-VERIFICATION.md`
  💡 Add missing sections: objective, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `agentic-flow/docs/version-releases/v1.5.9-DOCKER-VERIFICATION.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/docs/version-releases/v1.5.9-DOCKER-VERIFICATION.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/docs/version-releases/v1.5.9-RELEASE-SUMMARY.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `agentic-flow/docs/version-releases/v1.5.9-RELEASE-SUMMARY.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/docs/version-releases/v1.5.9-RELEASE-SUMMARY.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/tests/README.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `agentic-flow/tests/README.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/tests/README.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/tests/supabase/README.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `agentic-flow/tests/supabase/README.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/tests/supabase/README.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/tests/validate-streaming-fix.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 1 pattern(s) found `agentic-flow/tests/validate-streaming-fix.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/tests/validate-streaming-fix.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/tests/validation/README.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `agentic-flow/tests/validation/README.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/tests/validation/README.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `agentic-flow/wasm/quic/README.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `agentic-flow/wasm/quic/README.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `agentic-flow/wasm/quic/README.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `backlog.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `backlog.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `backlog.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `bench/BENCHMARK-GUIDE.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 1 pattern(s) found `bench/BENCHMARK-GUIDE.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `bench/BENCHMARK-GUIDE.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `bench/BENCHMARK-RESULTS-TEMPLATE.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `bench/BENCHMARK-RESULTS-TEMPLATE.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `bench/BENCHMARK-RESULTS-TEMPLATE.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `bench/COMPLETION-SUMMARY.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `bench/COMPLETION-SUMMARY.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `bench/COMPLETION-SUMMARY.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `bench/README.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `bench/README.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `bench/README.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `crates/agentic-flow-quic/IMPLEMENTATION.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 1 pattern(s) found `crates/agentic-flow-quic/IMPLEMENTATION.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `crates/agentic-flow-quic/IMPLEMENTATION.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `crates/agentic-flow-quic/README.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `crates/agentic-flow-quic/README.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `crates/agentic-flow-quic/README.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `docker/README.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `docker/README.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `docker/README.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `docker/test/README.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `docker/test/README.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `docker/test/README.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `docker/test/swarm/README.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `docker/test/swarm/README.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `docker/test/swarm/README.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `docker/trading-mvp/README.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `docker/trading-mvp/README.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `docker/trading-mvp/README.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `go_no_go_ledger.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 1 pattern(s) found `go_no_go_ledger.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✓ `go_no_go_ledger.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `ide_configs.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 1 pattern(s) found `ide_configs.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `ide_configs.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `releases/RELEASE-v1.0.6.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 1 pattern(s) found `releases/RELEASE-v1.0.6.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `releases/RELEASE-v1.0.6.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: objective, acceptance criteria, success metric) `releases/RELEASE-v1.0.7.md`
  💡 Add missing sections: objective, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 1 pattern(s) found `releases/RELEASE-v1.0.7.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `releases/RELEASE-v1.0.7.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `releases/VALIDATION-v1.0.5.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 1 pattern(s) found `releases/VALIDATION-v1.0.5.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `releases/VALIDATION-v1.0.5.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `tools/dashboards/README.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 1 pattern(s) found `tools/dashboards/README.md`
- ✅ [INFO] PRD defines DoR and DoD: DoR: ✓, DoD: ✓ `tools/dashboards/README.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `tools/eslint-plugin-ddd/README.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 1 pattern(s) found `tools/eslint-plugin-ddd/README.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `tools/eslint-plugin-ddd/README.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `tools/goalie-vscode/ENHANCED_FILE_WATCHER_README.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 1 pattern(s) found `tools/goalie-vscode/ENHANCED_FILE_WATCHER_README.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `tools/goalie-vscode/ENHANCED_FILE_WATCHER_README.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `tools/goalie-vscode/README.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `tools/goalie-vscode/README.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `tools/goalie-vscode/README.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `tools/goalie-vscode/TEST_DOCUMENTATION.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 1 pattern(s) found `tools/goalie-vscode/TEST_DOCUMENTATION.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `tools/goalie-vscode/TEST_DOCUMENTATION.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `wsjf_prompt_reindex.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `wsjf_prompt_reindex.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `wsjf_prompt_reindex.md`

### ADR Checks

- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `.hybrid-tunnel-config.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `.hybrid-tunnel-config.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `.hybrid-tunnel-config.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: status, decision, consequences) `AGENTS.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `AGENTS.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `AGENTS.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `CAPABILITY_BACKLOG.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `CAPABILITY_BACKLOG.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `CAPABILITY_BACKLOG.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: status, decision, consequences) `CHANGELOG.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `CHANGELOG.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `CHANGELOG.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `CLEANUP_STRATEGY_GUIDE.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `CLEANUP_STRATEGY_GUIDE.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `CLEANUP_STRATEGY_GUIDE.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `CONTRACT.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `CONTRACT.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `CONTRACT.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `CRITICAL_CYCLICITY_EXECUTION.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `CRITICAL_CYCLICITY_EXECUTION.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `CRITICAL_CYCLICITY_EXECUTION.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `CRITICAL_EXECUTION_STATUS.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `CRITICAL_EXECUTION_STATUS.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `CRITICAL_EXECUTION_STATUS.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `CYCLE-115-SUBSTITUTION-MAP.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `CYCLE-115-SUBSTITUTION-MAP.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `CYCLE-115-SUBSTITUTION-MAP.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `DASHBOARD_CONSOLIDATION_PLAN.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `DASHBOARD_CONSOLIDATION_PLAN.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `DASHBOARD_CONSOLIDATION_PLAN.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `DPC_IMPLEMENTATION.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `DPC_IMPLEMENTATION.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `DPC_IMPLEMENTATION.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `EMAIL-VALIDATION-PIPELINE-COMPLETE.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `EMAIL-VALIDATION-PIPELINE-COMPLETE.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `EMAIL-VALIDATION-PIPELINE-COMPLETE.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: context, consequences) `EXECUTION_PLAN.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `EXECUTION_PLAN.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `EXECUTION_PLAN.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: context, consequences) `GATES-ALL-PASS-FULL-AUTO-UNLOCKED.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `GATES-ALL-PASS-FULL-AUTO-UNLOCKED.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `GATES-ALL-PASS-FULL-AUTO-UNLOCKED.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `IMPLEMENTATION_STATUS.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `IMPLEMENTATION_STATUS.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `IMPLEMENTATION_STATUS.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `LOCAL-CI-QUICK-REF.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `LOCAL-CI-QUICK-REF.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `LOCAL-CI-QUICK-REF.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: decision, consequences) `MULTI-WSJF-SWARM-QUICKSTART.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `MULTI-WSJF-SWARM-QUICKSTART.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `MULTI-WSJF-SWARM-QUICKSTART.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `PR-DESCRIPTION.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `PR-DESCRIPTION.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `PR-DESCRIPTION.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `PUSH-OPTIONS.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `PUSH-OPTIONS.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `PUSH-OPTIONS.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: decision, consequences) `README.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `README.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `README.md`
- ❌ [WARNING] ADR has required sections: 3/4 sections (missing: consequences) `ROAM-RISKS-DISK-CLEANUP-20260329.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `ROAM-RISKS-DISK-CLEANUP-20260329.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ✅ [INFO] ADR has date: Date present `ROAM-RISKS-DISK-CLEANUP-20260329.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: status, decision, consequences) `RUST_CLI_SPEC.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `RUST_CLI_SPEC.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `RUST_CLI_SPEC.md`
- ✅ [WARNING] ADR has required sections: 4/4 sections `SEMI-AUTO-FULL-AUTO-GATES.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `SEMI-AUTO-FULL-AUTO-GATES.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `SEMI-AUTO-FULL-AUTO-GATES.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: decision, consequences) `SWARM-ORCHESTRATION-STATUS.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `SWARM-ORCHESTRATION-STATUS.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `SWARM-ORCHESTRATION-STATUS.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `TDD_DEPLOYMENT_GATE.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `TDD_DEPLOYMENT_GATE.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `TDD_DEPLOYMENT_GATE.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `TDD_TEST_RESULTS.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `TDD_TEST_RESULTS.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `TDD_TEST_RESULTS.md`
- ❌ [WARNING] ADR has required sections: 3/4 sections (missing: consequences) `TEMPORAL-CAPACITY-MEGA-FRAMEWORK-OLD.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `TEMPORAL-CAPACITY-MEGA-FRAMEWORK-OLD.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `TEMPORAL-CAPACITY-MEGA-FRAMEWORK-OLD.md`
- ❌ [WARNING] ADR has required sections: 3/4 sections (missing: consequences) `TEMPORAL-CAPACITY-MEGA-FRAMEWORK.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `TEMPORAL-CAPACITY-MEGA-FRAMEWORK.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `TEMPORAL-CAPACITY-MEGA-FRAMEWORK.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `TEMPORAL-CAPACITY-TRACKER.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `TEMPORAL-CAPACITY-TRACKER.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `TEMPORAL-CAPACITY-TRACKER.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: status, context, consequences) `TEMPORAL-CAPACITY-WSJF-CHECKLIST.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `TEMPORAL-CAPACITY-WSJF-CHECKLIST.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `TEMPORAL-CAPACITY-WSJF-CHECKLIST.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: status, consequences) `THEORETICAL_FRAMEWORKS.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `THEORETICAL_FRAMEWORKS.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `THEORETICAL_FRAMEWORKS.md`
- ❌ [WARNING] ADR has required sections: 3/4 sections (missing: consequences) `TONIGHT-DELIVERY-CHECKLIST.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `TONIGHT-DELIVERY-CHECKLIST.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `TONIGHT-DELIVERY-CHECKLIST.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `TONIGHT-QUICK-REF.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `TONIGHT-QUICK-REF.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `TONIGHT-QUICK-REF.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `TRIAL-1-READINESS.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `TRIAL-1-READINESS.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ✅ [INFO] ADR has date: Date present `TRIAL-1-READINESS.md`
- ❌ [WARNING] ADR has required sections: 3/4 sections (missing: consequences) `VALIDATOR_INVENTORY.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `VALIDATOR_INVENTORY.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `VALIDATOR_INVENTORY.md`
- ❌ [WARNING] ADR has required sections: 3/4 sections (missing: consequences) `VISUAL-CAPACITY-DASHBOARD.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `VISUAL-CAPACITY-DASHBOARD.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `VISUAL-CAPACITY-DASHBOARD.md`
- ❌ [WARNING] ADR has required sections: 3/4 sections (missing: consequences) `WARP.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `WARP.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `WARP.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `WSJF-6-5-4-3-2-1-IMPLEMENTATION-PROGRESS.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `WSJF-6-5-4-3-2-1-IMPLEMENTATION-PROGRESS.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `WSJF-6-5-4-3-2-1-IMPLEMENTATION-PROGRESS.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: context, consequences) `WSJF_DISCOVER_CONSOLIDATE_ANALYSIS.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `WSJF_DISCOVER_CONSOLIDATE_ANALYSIS.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `WSJF_DISCOVER_CONSOLIDATE_ANALYSIS.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: decision, consequences) `WSJF_PRIORITIZATION_ANALYSIS.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `WSJF_PRIORITIZATION_ANALYSIS.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ✅ [INFO] ADR has date: Date present `WSJF_PRIORITIZATION_ANALYSIS.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: context, consequences) `WSJF_TRIAL1_EXECUTION_PLAN.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `WSJF_TRIAL1_EXECUTION_PLAN.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `WSJF_TRIAL1_EXECUTION_PLAN.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: status, decision, consequences) `agentic-flow/.claude/agents/MIGRATION_SUMMARY.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/agents/MIGRATION_SUMMARY.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/agents/MIGRATION_SUMMARY.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `agentic-flow/.claude/agents/README.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/agents/README.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/agents/README.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: status, decision, consequences) `agentic-flow/.claude/agents/analysis/code-analyzer.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/agents/analysis/code-analyzer.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/agents/analysis/code-analyzer.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: status, decision, consequences) `agentic-flow/.claude/agents/analysis/code-review/analyze-code-quality.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/agents/analysis/code-review/analyze-code-quality.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/agents/analysis/code-review/analyze-code-quality.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: status, consequences) `agentic-flow/.claude/agents/architecture/system-design/arch-system-design.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/agents/architecture/system-design/arch-system-design.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/agents/architecture/system-design/arch-system-design.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: status, decision, consequences) `agentic-flow/.claude/agents/base-template-generator.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/agents/base-template-generator.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/agents/base-template-generator.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: status, consequences) `agentic-flow/.claude/agents/consensus/README.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/agents/consensus/README.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/agents/consensus/README.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `agentic-flow/.claude/agents/consensus/byzantine-coordinator.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/agents/consensus/byzantine-coordinator.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/agents/consensus/byzantine-coordinator.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `agentic-flow/.claude/agents/consensus/crdt-synchronizer.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/agents/consensus/crdt-synchronizer.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/agents/consensus/crdt-synchronizer.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `agentic-flow/.claude/agents/consensus/gossip-coordinator.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/agents/consensus/gossip-coordinator.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/agents/consensus/gossip-coordinator.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `agentic-flow/.claude/agents/consensus/performance-benchmarker.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/agents/consensus/performance-benchmarker.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/agents/consensus/performance-benchmarker.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: decision, consequences) `agentic-flow/.claude/agents/consensus/quorum-manager.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/agents/consensus/quorum-manager.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/agents/consensus/quorum-manager.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `agentic-flow/.claude/agents/consensus/raft-manager.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/agents/consensus/raft-manager.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/agents/consensus/raft-manager.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `agentic-flow/.claude/agents/consensus/security-manager.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/agents/consensus/security-manager.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/agents/consensus/security-manager.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: status, consequences) `agentic-flow/.claude/agents/core/coder.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/agents/core/coder.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/agents/core/coder.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: status, context, consequences) `agentic-flow/.claude/agents/core/planner.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/agents/core/planner.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/agents/core/planner.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: status, decision, consequences) `agentic-flow/.claude/agents/core/researcher.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/agents/core/researcher.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/agents/core/researcher.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: status, decision, consequences) `agentic-flow/.claude/agents/core/reviewer.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/agents/core/reviewer.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/agents/core/reviewer.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `agentic-flow/.claude/agents/core/tester.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/agents/core/tester.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/agents/core/tester.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `agentic-flow/.claude/agents/custom/test-long-runner.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/agents/custom/test-long-runner.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/agents/custom/test-long-runner.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: status, decision, consequences) `agentic-flow/.claude/agents/data/ml/data-ml-model.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/agents/data/ml/data-ml-model.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/agents/data/ml/data-ml-model.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: decision, consequences) `agentic-flow/.claude/agents/development/backend/dev-backend-api.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/agents/development/backend/dev-backend-api.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/agents/development/backend/dev-backend-api.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: status, decision, consequences) `agentic-flow/.claude/agents/devops/ci-cd/ops-cicd-github.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/agents/devops/ci-cd/ops-cicd-github.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/agents/devops/ci-cd/ops-cicd-github.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: status, decision, consequences) `agentic-flow/.claude/agents/documentation/api-docs/docs-api-openapi.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/agents/documentation/api-docs/docs-api-openapi.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/agents/documentation/api-docs/docs-api-openapi.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `agentic-flow/.claude/agents/flow-nexus/app-store.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/agents/flow-nexus/app-store.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/agents/flow-nexus/app-store.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `agentic-flow/.claude/agents/flow-nexus/authentication.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/agents/flow-nexus/authentication.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/agents/flow-nexus/authentication.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `agentic-flow/.claude/agents/flow-nexus/challenges.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/agents/flow-nexus/challenges.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/agents/flow-nexus/challenges.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `agentic-flow/.claude/agents/flow-nexus/neural-network.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/agents/flow-nexus/neural-network.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/agents/flow-nexus/neural-network.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `agentic-flow/.claude/agents/flow-nexus/payments.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/agents/flow-nexus/payments.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/agents/flow-nexus/payments.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `agentic-flow/.claude/agents/flow-nexus/sandbox.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/agents/flow-nexus/sandbox.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/agents/flow-nexus/sandbox.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `agentic-flow/.claude/agents/flow-nexus/swarm.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/agents/flow-nexus/swarm.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/agents/flow-nexus/swarm.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: context, consequences) `agentic-flow/.claude/agents/flow-nexus/user-tools.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/agents/flow-nexus/user-tools.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/agents/flow-nexus/user-tools.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: context, consequences) `agentic-flow/.claude/agents/flow-nexus/workflow.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/agents/flow-nexus/workflow.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/agents/flow-nexus/workflow.md`
- ❌ [WARNING] ADR has required sections: 3/4 sections (missing: decision) `agentic-flow/.claude/agents/github/code-review-swarm.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/agents/github/code-review-swarm.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/agents/github/code-review-swarm.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `agentic-flow/.claude/agents/github/github-modes.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/agents/github/github-modes.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/agents/github/github-modes.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: decision, consequences) `agentic-flow/.claude/agents/github/issue-tracker.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/agents/github/issue-tracker.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/agents/github/issue-tracker.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: decision, consequences) `agentic-flow/.claude/agents/github/multi-repo-swarm.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/agents/github/multi-repo-swarm.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/agents/github/multi-repo-swarm.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `agentic-flow/.claude/agents/github/pr-manager.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/agents/github/pr-manager.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/agents/github/pr-manager.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `agentic-flow/.claude/agents/github/project-board-sync.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/agents/github/project-board-sync.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/agents/github/project-board-sync.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `agentic-flow/.claude/agents/github/release-manager.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/agents/github/release-manager.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/agents/github/release-manager.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `agentic-flow/.claude/agents/github/release-swarm.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/agents/github/release-swarm.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/agents/github/release-swarm.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: context, consequences) `agentic-flow/.claude/agents/github/repo-architect.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/agents/github/repo-architect.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/agents/github/repo-architect.md`
- ❌ [WARNING] ADR has required sections: 3/4 sections (missing: consequences) `agentic-flow/.claude/agents/github/swarm-issue.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/agents/github/swarm-issue.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/agents/github/swarm-issue.md`
- ❌ [WARNING] ADR has required sections: 3/4 sections (missing: consequences) `agentic-flow/.claude/agents/github/swarm-pr.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/agents/github/swarm-pr.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/agents/github/swarm-pr.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: decision, consequences) `agentic-flow/.claude/agents/github/sync-coordinator.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/agents/github/sync-coordinator.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/agents/github/sync-coordinator.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: status, decision, consequences) `agentic-flow/.claude/agents/github/workflow-automation.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/agents/github/workflow-automation.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/agents/github/workflow-automation.md`
- ❌ [WARNING] ADR has required sections: 3/4 sections (missing: consequences) `agentic-flow/.claude/agents/goal/agent.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/agents/goal/agent.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/agents/goal/agent.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `agentic-flow/.claude/agents/goal/goal-planner.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/agents/goal/goal-planner.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/agents/goal/goal-planner.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: status, context, consequences) `agentic-flow/.claude/agents/optimization/README.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/agents/optimization/README.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/agents/optimization/README.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: context, consequences) `agentic-flow/.claude/agents/optimization/benchmark-suite.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/agents/optimization/benchmark-suite.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/agents/optimization/benchmark-suite.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: context, consequences) `agentic-flow/.claude/agents/optimization/load-balancer.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/agents/optimization/load-balancer.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/agents/optimization/load-balancer.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: context, consequences) `agentic-flow/.claude/agents/optimization/performance-monitor.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/agents/optimization/performance-monitor.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/agents/optimization/performance-monitor.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: context, consequences) `agentic-flow/.claude/agents/optimization/resource-allocator.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/agents/optimization/resource-allocator.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/agents/optimization/resource-allocator.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: context, consequences) `agentic-flow/.claude/agents/optimization/topology-optimizer.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/agents/optimization/topology-optimizer.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/agents/optimization/topology-optimizer.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `agentic-flow/.claude/agents/payments/agentic-payments.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/agents/payments/agentic-payments.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/agents/payments/agentic-payments.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: context, consequences) `agentic-flow/.claude/agents/sparc/architecture.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/agents/sparc/architecture.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/agents/sparc/architecture.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: status, decision, consequences) `agentic-flow/.claude/agents/sparc/pseudocode.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/agents/sparc/pseudocode.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/agents/sparc/pseudocode.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `agentic-flow/.claude/agents/sparc/refinement.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/agents/sparc/refinement.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/agents/sparc/refinement.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `agentic-flow/.claude/agents/sparc/specification.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/agents/sparc/specification.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/agents/sparc/specification.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: status, decision, consequences) `agentic-flow/.claude/agents/specialized/mobile/spec-mobile-react-native.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/agents/specialized/mobile/spec-mobile-react-native.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/agents/specialized/mobile/spec-mobile-react-native.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: status, context, consequences) `agentic-flow/.claude/agents/sublinear/consensus-coordinator.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/agents/sublinear/consensus-coordinator.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/agents/sublinear/consensus-coordinator.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `agentic-flow/.claude/agents/sublinear/matrix-optimizer.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/agents/sublinear/matrix-optimizer.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/agents/sublinear/matrix-optimizer.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `agentic-flow/.claude/agents/sublinear/pagerank-analyzer.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/agents/sublinear/pagerank-analyzer.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/agents/sublinear/pagerank-analyzer.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: status, context, consequences) `agentic-flow/.claude/agents/sublinear/performance-optimizer.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/agents/sublinear/performance-optimizer.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/agents/sublinear/performance-optimizer.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: status, context, consequences) `agentic-flow/.claude/agents/sublinear/trading-predictor.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/agents/sublinear/trading-predictor.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/agents/sublinear/trading-predictor.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: context, consequences) `agentic-flow/.claude/agents/swarm/README.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/agents/swarm/README.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/agents/swarm/README.md`
- ❌ [WARNING] ADR has required sections: 3/4 sections (missing: consequences) `agentic-flow/.claude/agents/swarm/adaptive-coordinator.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/agents/swarm/adaptive-coordinator.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/agents/swarm/adaptive-coordinator.md`
- ❌ [WARNING] ADR has required sections: 3/4 sections (missing: consequences) `agentic-flow/.claude/agents/swarm/hierarchical-coordinator.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/agents/swarm/hierarchical-coordinator.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/agents/swarm/hierarchical-coordinator.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: context, consequences) `agentic-flow/.claude/agents/swarm/mesh-coordinator.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/agents/swarm/mesh-coordinator.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/agents/swarm/mesh-coordinator.md`
- ❌ [WARNING] ADR has required sections: 3/4 sections (missing: consequences) `agentic-flow/.claude/agents/templates/automation-smart-agent.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/agents/templates/automation-smart-agent.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/agents/templates/automation-smart-agent.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `agentic-flow/.claude/agents/templates/coordinator-swarm-init.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/agents/templates/coordinator-swarm-init.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/agents/templates/coordinator-swarm-init.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `agentic-flow/.claude/agents/templates/github-pr-manager.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/agents/templates/github-pr-manager.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/agents/templates/github-pr-manager.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `agentic-flow/.claude/agents/templates/implementer-sparc-coder.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/agents/templates/implementer-sparc-coder.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/agents/templates/implementer-sparc-coder.md`
- ❌ [WARNING] ADR has required sections: 3/4 sections (missing: consequences) `agentic-flow/.claude/agents/templates/memory-coordinator.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/agents/templates/memory-coordinator.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/agents/templates/memory-coordinator.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: decision, consequences) `agentic-flow/.claude/agents/templates/migration-plan.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/agents/templates/migration-plan.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/agents/templates/migration-plan.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `agentic-flow/.claude/agents/templates/orchestrator-task.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/agents/templates/orchestrator-task.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/agents/templates/orchestrator-task.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: status, context, consequences) `agentic-flow/.claude/agents/templates/performance-analyzer.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/agents/templates/performance-analyzer.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/agents/templates/performance-analyzer.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: status, context, consequences) `agentic-flow/.claude/agents/templates/sparc-coordinator.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/agents/templates/sparc-coordinator.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/agents/templates/sparc-coordinator.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `agentic-flow/.claude/agents/test-neural.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/agents/test-neural.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/agents/test-neural.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: status, context, consequences) `agentic-flow/.claude/agents/testing/unit/tdd-london-swarm.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/agents/testing/unit/tdd-london-swarm.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/agents/testing/unit/tdd-london-swarm.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `agentic-flow/.claude/agents/testing/validation/production-validator.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/agents/testing/validation/production-validator.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/agents/testing/validation/production-validator.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `agentic-flow/.claude/answer.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/answer.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/answer.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `agentic-flow/.claude/commands/agents/README.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/commands/agents/README.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/commands/agents/README.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `agentic-flow/.claude/commands/agents/agent-capabilities.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/commands/agents/agent-capabilities.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/commands/agents/agent-capabilities.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `agentic-flow/.claude/commands/agents/agent-coordination.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/commands/agents/agent-coordination.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/commands/agents/agent-coordination.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `agentic-flow/.claude/commands/agents/agent-spawning.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/commands/agents/agent-spawning.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/commands/agents/agent-spawning.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `agentic-flow/.claude/commands/agents/agent-types.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/commands/agents/agent-types.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/commands/agents/agent-types.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: decision, consequences) `agentic-flow/.claude/commands/analysis/COMMAND_COMPLIANCE_REPORT.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/commands/analysis/COMMAND_COMPLIANCE_REPORT.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/commands/analysis/COMMAND_COMPLIANCE_REPORT.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `agentic-flow/.claude/commands/analysis/README.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/commands/analysis/README.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/commands/analysis/README.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `agentic-flow/.claude/commands/analysis/bottleneck-detect.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/commands/analysis/bottleneck-detect.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/commands/analysis/bottleneck-detect.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `agentic-flow/.claude/commands/analysis/performance-bottlenecks.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/commands/analysis/performance-bottlenecks.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/commands/analysis/performance-bottlenecks.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `agentic-flow/.claude/commands/analysis/performance-report.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/commands/analysis/performance-report.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/commands/analysis/performance-report.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: status, decision, consequences) `agentic-flow/.claude/commands/analysis/token-efficiency.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/commands/analysis/token-efficiency.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/commands/analysis/token-efficiency.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `agentic-flow/.claude/commands/analysis/token-usage.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/commands/analysis/token-usage.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/commands/analysis/token-usage.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `agentic-flow/.claude/commands/automation/README.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/commands/automation/README.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/commands/automation/README.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: status, context, consequences) `agentic-flow/.claude/commands/automation/auto-agent.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/commands/automation/auto-agent.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/commands/automation/auto-agent.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `agentic-flow/.claude/commands/automation/self-healing.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/commands/automation/self-healing.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/commands/automation/self-healing.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: status, decision, consequences) `agentic-flow/.claude/commands/automation/session-memory.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/commands/automation/session-memory.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/commands/automation/session-memory.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `agentic-flow/.claude/commands/automation/smart-agents.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/commands/automation/smart-agents.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/commands/automation/smart-agents.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `agentic-flow/.claude/commands/automation/smart-spawn.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/commands/automation/smart-spawn.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/commands/automation/smart-spawn.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `agentic-flow/.claude/commands/automation/workflow-select.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/commands/automation/workflow-select.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/commands/automation/workflow-select.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: decision, consequences) `agentic-flow/.claude/commands/claude-flow-help.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/commands/claude-flow-help.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/commands/claude-flow-help.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: status, consequences) `agentic-flow/.claude/commands/claude-flow-memory.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/commands/claude-flow-memory.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/commands/claude-flow-memory.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `agentic-flow/.claude/commands/claude-flow-swarm.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/commands/claude-flow-swarm.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/commands/claude-flow-swarm.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `agentic-flow/.claude/commands/flow-nexus/app-store.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/commands/flow-nexus/app-store.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/commands/flow-nexus/app-store.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `agentic-flow/.claude/commands/flow-nexus/challenges.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/commands/flow-nexus/challenges.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/commands/flow-nexus/challenges.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `agentic-flow/.claude/commands/flow-nexus/login-registration.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/commands/flow-nexus/login-registration.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/commands/flow-nexus/login-registration.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `agentic-flow/.claude/commands/flow-nexus/neural-network.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/commands/flow-nexus/neural-network.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/commands/flow-nexus/neural-network.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `agentic-flow/.claude/commands/flow-nexus/payments.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/commands/flow-nexus/payments.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/commands/flow-nexus/payments.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `agentic-flow/.claude/commands/flow-nexus/sandbox.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/commands/flow-nexus/sandbox.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/commands/flow-nexus/sandbox.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `agentic-flow/.claude/commands/flow-nexus/swarm.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/commands/flow-nexus/swarm.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/commands/flow-nexus/swarm.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `agentic-flow/.claude/commands/flow-nexus/user-tools.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/commands/flow-nexus/user-tools.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/commands/flow-nexus/user-tools.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `agentic-flow/.claude/commands/flow-nexus/workflow.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/commands/flow-nexus/workflow.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/commands/flow-nexus/workflow.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `agentic-flow/.claude/commands/github/README.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/commands/github/README.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/commands/github/README.md`
- ❌ [WARNING] ADR has required sections: 3/4 sections (missing: decision) `agentic-flow/.claude/commands/github/code-review-swarm.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/commands/github/code-review-swarm.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/commands/github/code-review-swarm.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `agentic-flow/.claude/commands/github/code-review.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/commands/github/code-review.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/commands/github/code-review.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `agentic-flow/.claude/commands/github/github-modes.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/commands/github/github-modes.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/commands/github/github-modes.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `agentic-flow/.claude/commands/github/github-swarm.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/commands/github/github-swarm.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/commands/github/github-swarm.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: decision, consequences) `agentic-flow/.claude/commands/github/issue-tracker.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/commands/github/issue-tracker.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/commands/github/issue-tracker.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `agentic-flow/.claude/commands/github/issue-triage.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/commands/github/issue-triage.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/commands/github/issue-triage.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: decision, consequences) `agentic-flow/.claude/commands/github/multi-repo-swarm.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/commands/github/multi-repo-swarm.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/commands/github/multi-repo-swarm.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `agentic-flow/.claude/commands/github/pr-enhance.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/commands/github/pr-enhance.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/commands/github/pr-enhance.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `agentic-flow/.claude/commands/github/pr-manager.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/commands/github/pr-manager.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/commands/github/pr-manager.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `agentic-flow/.claude/commands/github/project-board-sync.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/commands/github/project-board-sync.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/commands/github/project-board-sync.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `agentic-flow/.claude/commands/github/release-manager.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/commands/github/release-manager.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/commands/github/release-manager.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `agentic-flow/.claude/commands/github/release-swarm.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/commands/github/release-swarm.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/commands/github/release-swarm.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `agentic-flow/.claude/commands/github/repo-analyze.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/commands/github/repo-analyze.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/commands/github/repo-analyze.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: context, consequences) `agentic-flow/.claude/commands/github/repo-architect.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/commands/github/repo-architect.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/commands/github/repo-architect.md`
- ❌ [WARNING] ADR has required sections: 3/4 sections (missing: consequences) `agentic-flow/.claude/commands/github/swarm-issue.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/commands/github/swarm-issue.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/commands/github/swarm-issue.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: decision, consequences) `agentic-flow/.claude/commands/github/swarm-pr.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/commands/github/swarm-pr.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/commands/github/swarm-pr.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `agentic-flow/.claude/commands/github/sync-coordinator.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/commands/github/sync-coordinator.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/commands/github/sync-coordinator.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `agentic-flow/.claude/commands/github/workflow-automation.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/commands/github/workflow-automation.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/commands/github/workflow-automation.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `agentic-flow/.claude/commands/hive-mind/README.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/commands/hive-mind/README.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/commands/hive-mind/README.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `agentic-flow/.claude/commands/hive-mind/hive-mind-consensus.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/commands/hive-mind/hive-mind-consensus.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/commands/hive-mind/hive-mind-consensus.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `agentic-flow/.claude/commands/hive-mind/hive-mind-init.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/commands/hive-mind/hive-mind-init.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/commands/hive-mind/hive-mind-init.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `agentic-flow/.claude/commands/hive-mind/hive-mind-memory.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/commands/hive-mind/hive-mind-memory.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/commands/hive-mind/hive-mind-memory.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `agentic-flow/.claude/commands/hive-mind/hive-mind-metrics.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/commands/hive-mind/hive-mind-metrics.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/commands/hive-mind/hive-mind-metrics.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `agentic-flow/.claude/commands/hive-mind/hive-mind-resume.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/commands/hive-mind/hive-mind-resume.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/commands/hive-mind/hive-mind-resume.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `agentic-flow/.claude/commands/hive-mind/hive-mind-sessions.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/commands/hive-mind/hive-mind-sessions.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/commands/hive-mind/hive-mind-sessions.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `agentic-flow/.claude/commands/hive-mind/hive-mind-spawn.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/commands/hive-mind/hive-mind-spawn.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/commands/hive-mind/hive-mind-spawn.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `agentic-flow/.claude/commands/hive-mind/hive-mind-status.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/commands/hive-mind/hive-mind-status.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/commands/hive-mind/hive-mind-status.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `agentic-flow/.claude/commands/hive-mind/hive-mind-stop.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/commands/hive-mind/hive-mind-stop.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/commands/hive-mind/hive-mind-stop.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `agentic-flow/.claude/commands/hive-mind/hive-mind-wizard.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/commands/hive-mind/hive-mind-wizard.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/commands/hive-mind/hive-mind-wizard.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `agentic-flow/.claude/commands/hive-mind/hive-mind.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/commands/hive-mind/hive-mind.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/commands/hive-mind/hive-mind.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `agentic-flow/.claude/commands/hooks/README.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/commands/hooks/README.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/commands/hooks/README.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `agentic-flow/.claude/commands/hooks/overview.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/commands/hooks/overview.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/commands/hooks/overview.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: status, consequences) `agentic-flow/.claude/commands/hooks/post-edit.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/commands/hooks/post-edit.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/commands/hooks/post-edit.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: status, context, consequences) `agentic-flow/.claude/commands/hooks/post-task.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/commands/hooks/post-task.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/commands/hooks/post-task.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `agentic-flow/.claude/commands/hooks/pre-edit.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/commands/hooks/pre-edit.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/commands/hooks/pre-edit.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: status, consequences) `agentic-flow/.claude/commands/hooks/pre-task.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/commands/hooks/pre-task.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/commands/hooks/pre-task.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: status, consequences) `agentic-flow/.claude/commands/hooks/session-end.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/commands/hooks/session-end.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/commands/hooks/session-end.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: status, consequences) `agentic-flow/.claude/commands/hooks/setup.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/commands/hooks/setup.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/commands/hooks/setup.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `agentic-flow/.claude/commands/monitoring/README.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/commands/monitoring/README.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/commands/monitoring/README.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `agentic-flow/.claude/commands/monitoring/agent-metrics.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/commands/monitoring/agent-metrics.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/commands/monitoring/agent-metrics.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `agentic-flow/.claude/commands/monitoring/agents.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/commands/monitoring/agents.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/commands/monitoring/agents.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `agentic-flow/.claude/commands/monitoring/real-time-view.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/commands/monitoring/real-time-view.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/commands/monitoring/real-time-view.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `agentic-flow/.claude/commands/monitoring/status.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/commands/monitoring/status.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/commands/monitoring/status.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `agentic-flow/.claude/commands/monitoring/swarm-monitor.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/commands/monitoring/swarm-monitor.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/commands/monitoring/swarm-monitor.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `agentic-flow/.claude/commands/optimization/README.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/commands/optimization/README.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/commands/optimization/README.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `agentic-flow/.claude/commands/optimization/auto-topology.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/commands/optimization/auto-topology.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/commands/optimization/auto-topology.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `agentic-flow/.claude/commands/optimization/cache-manage.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/commands/optimization/cache-manage.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/commands/optimization/cache-manage.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `agentic-flow/.claude/commands/optimization/parallel-execute.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/commands/optimization/parallel-execute.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/commands/optimization/parallel-execute.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `agentic-flow/.claude/commands/optimization/parallel-execution.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/commands/optimization/parallel-execution.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/commands/optimization/parallel-execution.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `agentic-flow/.claude/commands/optimization/topology-optimize.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/commands/optimization/topology-optimize.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/commands/optimization/topology-optimize.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: status, consequences) `agentic-flow/.claude/commands/pair/README.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/commands/pair/README.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/commands/pair/README.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `agentic-flow/.claude/commands/pair/commands.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/commands/pair/commands.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/commands/pair/commands.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: status, decision, consequences) `agentic-flow/.claude/commands/pair/config.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/commands/pair/config.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/commands/pair/config.md`
- ❌ [WARNING] ADR has required sections: 3/4 sections (missing: consequences) `agentic-flow/.claude/commands/pair/examples.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/commands/pair/examples.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/commands/pair/examples.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: status, consequences) `agentic-flow/.claude/commands/pair/modes.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/commands/pair/modes.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/commands/pair/modes.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `agentic-flow/.claude/commands/pair/session.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/commands/pair/session.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/commands/pair/session.md`
- ❌ [WARNING] ADR has required sections: 3/4 sections (missing: consequences) `agentic-flow/.claude/commands/pair/start.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/commands/pair/start.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/commands/pair/start.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `agentic-flow/.claude/commands/sparc/analyzer.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/commands/sparc/analyzer.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/commands/sparc/analyzer.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: status, context, consequences) `agentic-flow/.claude/commands/sparc/architect.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/commands/sparc/architect.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/commands/sparc/architect.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: status, consequences) `agentic-flow/.claude/commands/sparc/ask.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/commands/sparc/ask.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/commands/sparc/ask.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `agentic-flow/.claude/commands/sparc/batch-executor.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/commands/sparc/batch-executor.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/commands/sparc/batch-executor.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: status, consequences) `agentic-flow/.claude/commands/sparc/code.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/commands/sparc/code.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/commands/sparc/code.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `agentic-flow/.claude/commands/sparc/coder.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/commands/sparc/coder.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/commands/sparc/coder.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: status, consequences) `agentic-flow/.claude/commands/sparc/debug.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/commands/sparc/debug.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/commands/sparc/debug.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `agentic-flow/.claude/commands/sparc/debugger.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/commands/sparc/debugger.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/commands/sparc/debugger.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: status, context, consequences) `agentic-flow/.claude/commands/sparc/designer.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/commands/sparc/designer.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/commands/sparc/designer.md`
- ❌ [WARNING] ADR has required sections: 3/4 sections (missing: consequences) `agentic-flow/.claude/commands/sparc/devops.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/commands/sparc/devops.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/commands/sparc/devops.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: status, consequences) `agentic-flow/.claude/commands/sparc/docs-writer.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/commands/sparc/docs-writer.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/commands/sparc/docs-writer.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `agentic-flow/.claude/commands/sparc/documenter.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/commands/sparc/documenter.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/commands/sparc/documenter.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: status, decision, consequences) `agentic-flow/.claude/commands/sparc/innovator.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/commands/sparc/innovator.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/commands/sparc/innovator.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: status, consequences) `agentic-flow/.claude/commands/sparc/integration.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/commands/sparc/integration.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/commands/sparc/integration.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: status, consequences) `agentic-flow/.claude/commands/sparc/mcp.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/commands/sparc/mcp.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/commands/sparc/mcp.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: status, decision, consequences) `agentic-flow/.claude/commands/sparc/memory-manager.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/commands/sparc/memory-manager.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/commands/sparc/memory-manager.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `agentic-flow/.claude/commands/sparc/optimizer.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/commands/sparc/optimizer.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/commands/sparc/optimizer.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `agentic-flow/.claude/commands/sparc/orchestrator.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/commands/sparc/orchestrator.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/commands/sparc/orchestrator.md`
- ❌ [WARNING] ADR has required sections: 3/4 sections (missing: consequences) `agentic-flow/.claude/commands/sparc/post-deployment-monitoring-mode.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/commands/sparc/post-deployment-monitoring-mode.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/commands/sparc/post-deployment-monitoring-mode.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: status, consequences) `agentic-flow/.claude/commands/sparc/refinement-optimization-mode.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/commands/sparc/refinement-optimization-mode.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/commands/sparc/refinement-optimization-mode.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `agentic-flow/.claude/commands/sparc/researcher.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/commands/sparc/researcher.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/commands/sparc/researcher.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `agentic-flow/.claude/commands/sparc/reviewer.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/commands/sparc/reviewer.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/commands/sparc/reviewer.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: status, consequences) `agentic-flow/.claude/commands/sparc/security-review.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/commands/sparc/security-review.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/commands/sparc/security-review.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `agentic-flow/.claude/commands/sparc/sparc-modes.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/commands/sparc/sparc-modes.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/commands/sparc/sparc-modes.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: status, consequences) `agentic-flow/.claude/commands/sparc/sparc.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/commands/sparc/sparc.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/commands/sparc/sparc.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: status, consequences) `agentic-flow/.claude/commands/sparc/spec-pseudocode.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/commands/sparc/spec-pseudocode.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/commands/sparc/spec-pseudocode.md`
- ❌ [WARNING] ADR has required sections: 3/4 sections (missing: consequences) `agentic-flow/.claude/commands/sparc/supabase-admin.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/commands/sparc/supabase-admin.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/commands/sparc/supabase-admin.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `agentic-flow/.claude/commands/sparc/swarm-coordinator.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/commands/sparc/swarm-coordinator.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/commands/sparc/swarm-coordinator.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `agentic-flow/.claude/commands/sparc/tdd.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/commands/sparc/tdd.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/commands/sparc/tdd.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `agentic-flow/.claude/commands/sparc/tester.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/commands/sparc/tester.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/commands/sparc/tester.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: status, consequences) `agentic-flow/.claude/commands/sparc/tutorial.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/commands/sparc/tutorial.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/commands/sparc/tutorial.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `agentic-flow/.claude/commands/sparc/workflow-manager.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/commands/sparc/workflow-manager.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/commands/sparc/workflow-manager.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: status, consequences) `agentic-flow/.claude/commands/sparc.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/commands/sparc.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/commands/sparc.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `agentic-flow/.claude/commands/stream-chain/pipeline.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/commands/stream-chain/pipeline.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/commands/stream-chain/pipeline.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: status, decision, consequences) `agentic-flow/.claude/commands/stream-chain/run.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/commands/stream-chain/run.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/commands/stream-chain/run.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `agentic-flow/.claude/commands/swarm/README.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/commands/swarm/README.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/commands/swarm/README.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `agentic-flow/.claude/commands/swarm/analysis.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/commands/swarm/analysis.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/commands/swarm/analysis.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `agentic-flow/.claude/commands/swarm/development.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/commands/swarm/development.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/commands/swarm/development.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `agentic-flow/.claude/commands/swarm/examples.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/commands/swarm/examples.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/commands/swarm/examples.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `agentic-flow/.claude/commands/swarm/maintenance.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/commands/swarm/maintenance.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/commands/swarm/maintenance.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `agentic-flow/.claude/commands/swarm/optimization.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/commands/swarm/optimization.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/commands/swarm/optimization.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `agentic-flow/.claude/commands/swarm/research.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/commands/swarm/research.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/commands/swarm/research.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `agentic-flow/.claude/commands/swarm/swarm-analysis.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/commands/swarm/swarm-analysis.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/commands/swarm/swarm-analysis.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `agentic-flow/.claude/commands/swarm/swarm-background.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/commands/swarm/swarm-background.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/commands/swarm/swarm-background.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `agentic-flow/.claude/commands/swarm/swarm-init.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/commands/swarm/swarm-init.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/commands/swarm/swarm-init.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `agentic-flow/.claude/commands/swarm/swarm-modes.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/commands/swarm/swarm-modes.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/commands/swarm/swarm-modes.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `agentic-flow/.claude/commands/swarm/swarm-monitor.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/commands/swarm/swarm-monitor.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/commands/swarm/swarm-monitor.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `agentic-flow/.claude/commands/swarm/swarm-spawn.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/commands/swarm/swarm-spawn.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/commands/swarm/swarm-spawn.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `agentic-flow/.claude/commands/swarm/swarm-status.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/commands/swarm/swarm-status.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/commands/swarm/swarm-status.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `agentic-flow/.claude/commands/swarm/swarm-strategies.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/commands/swarm/swarm-strategies.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/commands/swarm/swarm-strategies.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `agentic-flow/.claude/commands/swarm/swarm.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/commands/swarm/swarm.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/commands/swarm/swarm.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `agentic-flow/.claude/commands/swarm/testing.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/commands/swarm/testing.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/commands/swarm/testing.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `agentic-flow/.claude/commands/training/README.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/commands/training/README.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/commands/training/README.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `agentic-flow/.claude/commands/training/model-update.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/commands/training/model-update.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/commands/training/model-update.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `agentic-flow/.claude/commands/training/neural-patterns.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/commands/training/neural-patterns.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/commands/training/neural-patterns.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `agentic-flow/.claude/commands/training/neural-train.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/commands/training/neural-train.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/commands/training/neural-train.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `agentic-flow/.claude/commands/training/pattern-learn.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/commands/training/pattern-learn.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/commands/training/pattern-learn.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `agentic-flow/.claude/commands/training/specialization.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/commands/training/specialization.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/commands/training/specialization.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `agentic-flow/.claude/commands/truth/start.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/commands/truth/start.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/commands/truth/start.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `agentic-flow/.claude/commands/verify/check.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/commands/verify/check.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/commands/verify/check.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `agentic-flow/.claude/commands/verify/start.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/commands/verify/start.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/commands/verify/start.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `agentic-flow/.claude/commands/workflows/README.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/commands/workflows/README.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/commands/workflows/README.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `agentic-flow/.claude/commands/workflows/development.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/commands/workflows/development.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/commands/workflows/development.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `agentic-flow/.claude/commands/workflows/research.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/commands/workflows/research.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/commands/workflows/research.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `agentic-flow/.claude/commands/workflows/workflow-create.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/commands/workflows/workflow-create.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/commands/workflows/workflow-create.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `agentic-flow/.claude/commands/workflows/workflow-execute.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/commands/workflows/workflow-execute.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/commands/workflows/workflow-execute.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `agentic-flow/.claude/commands/workflows/workflow-export.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/commands/workflows/workflow-export.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/commands/workflows/workflow-export.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: status, decision, consequences) `agentic-flow/.claude/openrouter-models-research.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/openrouter-models-research.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/openrouter-models-research.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: status, decision, consequences) `agentic-flow/.claude/openrouter-quick-reference.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/.claude/openrouter-quick-reference.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/.claude/openrouter-quick-reference.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `agentic-flow/CHANGELOG.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/CHANGELOG.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/CHANGELOG.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: decision, consequences) `agentic-flow/README.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/README.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/README.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: decision, consequences) `agentic-flow/docker/claude-agent-sdk/docker/claude-agent-sdk/FASTMCP_SUMMARY.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/docker/claude-agent-sdk/docker/claude-agent-sdk/FASTMCP_SUMMARY.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/docker/claude-agent-sdk/docker/claude-agent-sdk/FASTMCP_SUMMARY.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: decision, consequences) `agentic-flow/docker/claude-agent-sdk/docker/claude-agent-sdk/docs/ARCHITECTURE.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/docker/claude-agent-sdk/docker/claude-agent-sdk/docs/ARCHITECTURE.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/docker/claude-agent-sdk/docker/claude-agent-sdk/docs/ARCHITECTURE.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: decision, consequences) `agentic-flow/docker/claude-agent-sdk/docker/claude-agent-sdk/docs/fastmcp-implementation.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/docker/claude-agent-sdk/docker/claude-agent-sdk/docs/fastmcp-implementation.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/docker/claude-agent-sdk/docker/claude-agent-sdk/docs/fastmcp-implementation.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: decision, consequences) `agentic-flow/docker/claude-agent-sdk/docker/claude-agent-sdk/docs/fastmcp-quick-start.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/docker/claude-agent-sdk/docker/claude-agent-sdk/docs/fastmcp-quick-start.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/docker/claude-agent-sdk/docker/claude-agent-sdk/docs/fastmcp-quick-start.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: decision, consequences) `agentic-flow/docker/claude-agent-sdk/docker/claude-agent-sdk/src/mcp/fastmcp/README.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/docker/claude-agent-sdk/docker/claude-agent-sdk/src/mcp/fastmcp/README.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/docker/claude-agent-sdk/docker/claude-agent-sdk/src/mcp/fastmcp/README.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `agentic-flow/docker/federation-test/README.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/docker/federation-test/README.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/docker/federation-test/README.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `agentic-flow/docker/test-instance/COMPREHENSIVE_TEST_RESULTS.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/docker/test-instance/COMPREHENSIVE_TEST_RESULTS.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ✅ [INFO] ADR has date: Date present `agentic-flow/docker/test-instance/COMPREHENSIVE_TEST_RESULTS.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: decision, consequences) `agentic-flow/docker/test-instance/DOCKER_VALIDATION_SUMMARY.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/docker/test-instance/DOCKER_VALIDATION_SUMMARY.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ✅ [INFO] ADR has date: Date present `agentic-flow/docker/test-instance/DOCKER_VALIDATION_SUMMARY.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: decision, consequences) `agentic-flow/docker/test-instance/FIX_VALIDATION_REPORT.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/docker/test-instance/FIX_VALIDATION_REPORT.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ✅ [INFO] ADR has date: Date present `agentic-flow/docker/test-instance/FIX_VALIDATION_REPORT.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `agentic-flow/docker/test-instance/INDEX.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/docker/test-instance/INDEX.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ✅ [INFO] ADR has date: Date present `agentic-flow/docker/test-instance/INDEX.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `agentic-flow/docker/test-instance/QUICK_START.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/docker/test-instance/QUICK_START.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/docker/test-instance/QUICK_START.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `agentic-flow/docker/test-instance/README.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/docker/test-instance/README.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/docker/test-instance/README.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `agentic-flow/docker/test-instance/VALIDATION_REPORT.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/docker/test-instance/VALIDATION_REPORT.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ✅ [INFO] ADR has date: Date present `agentic-flow/docker/test-instance/VALIDATION_REPORT.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `agentic-flow/docker/test-instance/test-model-config.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/docker/test-instance/test-model-config.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/docker/test-instance/test-model-config.md`
- ❌ [WARNING] ADR has required sections: 3/4 sections (missing: consequences) `agentic-flow/docs/CLAUDE.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/docs/CLAUDE.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/docs/CLAUDE.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `agentic-flow/docs/DOCKER-VERIFICATION.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/docs/DOCKER-VERIFICATION.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ✅ [INFO] ADR has date: Date present `agentic-flow/docs/DOCKER-VERIFICATION.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `agentic-flow/docs/ISSUE-55-VALIDATION.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/docs/ISSUE-55-VALIDATION.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ✅ [INFO] ADR has date: Date present `agentic-flow/docs/ISSUE-55-VALIDATION.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `agentic-flow/docs/NPX_AGENTDB_SETUP.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/docs/NPX_AGENTDB_SETUP.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/docs/NPX_AGENTDB_SETUP.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `agentic-flow/docs/OPTIMIZATIONS.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/docs/OPTIMIZATIONS.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/docs/OPTIMIZATIONS.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `agentic-flow/docs/PUBLISH_GUIDE.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/docs/PUBLISH_GUIDE.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/docs/PUBLISH_GUIDE.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: decision, consequences) `agentic-flow/docs/README.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/docs/README.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/docs/README.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `agentic-flow/docs/RELEASE-v1.10.0-COMPLETE.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/docs/RELEASE-v1.10.0-COMPLETE.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ✅ [INFO] ADR has date: Date present `agentic-flow/docs/RELEASE-v1.10.0-COMPLETE.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: status, consequences) `agentic-flow/docs/architecture/EXECUTIVE_SUMMARY.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/docs/architecture/EXECUTIVE_SUMMARY.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/docs/architecture/EXECUTIVE_SUMMARY.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: status, consequences) `agentic-flow/docs/architecture/FEDERATION-DATA-LIFECYCLE.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/docs/architecture/FEDERATION-DATA-LIFECYCLE.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/docs/architecture/FEDERATION-DATA-LIFECYCLE.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `agentic-flow/docs/architecture/IMPROVEMENT_PLAN.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/docs/architecture/IMPROVEMENT_PLAN.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/docs/architecture/IMPROVEMENT_PLAN.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: decision, consequences) `agentic-flow/docs/architecture/INTEGRATION-STATUS.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/docs/architecture/INTEGRATION-STATUS.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/docs/architecture/INTEGRATION-STATUS.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: decision, consequences) `agentic-flow/docs/architecture/MULTI_MODEL_ROUTER_PLAN.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/docs/architecture/MULTI_MODEL_ROUTER_PLAN.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/docs/architecture/MULTI_MODEL_ROUTER_PLAN.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `agentic-flow/docs/architecture/PACKAGE_STRUCTURE.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/docs/architecture/PACKAGE_STRUCTURE.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/docs/architecture/PACKAGE_STRUCTURE.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `agentic-flow/docs/architecture/QUIC-IMPLEMENTATION-SUMMARY.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/docs/architecture/QUIC-IMPLEMENTATION-SUMMARY.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ✅ [INFO] ADR has date: Date present `agentic-flow/docs/architecture/QUIC-IMPLEMENTATION-SUMMARY.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `agentic-flow/docs/architecture/QUIC-SWARM-INTEGRATION.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/docs/architecture/QUIC-SWARM-INTEGRATION.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/docs/architecture/QUIC-SWARM-INTEGRATION.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: decision, consequences) `agentic-flow/docs/architecture/QUICK_WINS.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/docs/architecture/QUICK_WINS.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/docs/architecture/QUICK_WINS.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `agentic-flow/docs/architecture/README.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/docs/architecture/README.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/docs/architecture/README.md`
- ❌ [WARNING] ADR has required sections: 3/4 sections (missing: consequences) `agentic-flow/docs/architecture/RESEARCH_SUMMARY.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/docs/architecture/RESEARCH_SUMMARY.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/docs/architecture/RESEARCH_SUMMARY.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `agentic-flow/docs/archive/.agentdb-instructions.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/docs/archive/.agentdb-instructions.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/docs/archive/.agentdb-instructions.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `agentic-flow/docs/archive/AGENT-BOOSTER-STATUS.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/docs/archive/AGENT-BOOSTER-STATUS.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/docs/archive/AGENT-BOOSTER-STATUS.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: status, decision, consequences) `agentic-flow/docs/archive/CHANGELOG-v1.3.0.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/docs/archive/CHANGELOG-v1.3.0.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/docs/archive/CHANGELOG-v1.3.0.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `agentic-flow/docs/archive/COMPLETION_REPORT_v1.7.1.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/docs/archive/COMPLETION_REPORT_v1.7.1.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/docs/archive/COMPLETION_REPORT_v1.7.1.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `agentic-flow/docs/archive/IMPLEMENTATION_SUMMARY_v1.7.1.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/docs/archive/IMPLEMENTATION_SUMMARY_v1.7.1.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/docs/archive/IMPLEMENTATION_SUMMARY_v1.7.1.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `agentic-flow/docs/archive/SUPABASE-INTEGRATION-COMPLETE.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/docs/archive/SUPABASE-INTEGRATION-COMPLETE.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ✅ [INFO] ADR has date: Date present `agentic-flow/docs/archive/SUPABASE-INTEGRATION-COMPLETE.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `agentic-flow/docs/archive/TESTING_QUICK_START.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/docs/archive/TESTING_QUICK_START.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/docs/archive/TESTING_QUICK_START.md`
- ❌ [WARNING] ADR has required sections: 3/4 sections (missing: consequences) `agentic-flow/docs/archive/TOOL-EMULATION-INTEGRATION-ISSUE.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/docs/archive/TOOL-EMULATION-INTEGRATION-ISSUE.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/docs/archive/TOOL-EMULATION-INTEGRATION-ISSUE.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `agentic-flow/docs/archive/VALIDATION_v1.7.1.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/docs/archive/VALIDATION_v1.7.1.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/docs/archive/VALIDATION_v1.7.1.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `agentic-flow/docs/archived/DOCKER_MCP_VALIDATION.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/docs/archived/DOCKER_MCP_VALIDATION.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/docs/archived/DOCKER_MCP_VALIDATION.md`
- ❌ [WARNING] ADR has required sections: 3/4 sections (missing: consequences) `agentic-flow/docs/archived/FASTMCP_INTEGRATION_STATUS.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/docs/archived/FASTMCP_INTEGRATION_STATUS.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/docs/archived/FASTMCP_INTEGRATION_STATUS.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `agentic-flow/docs/archived/HOTFIX_1.1.7.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/docs/archived/HOTFIX_1.1.7.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ✅ [INFO] ADR has date: Date present `agentic-flow/docs/archived/HOTFIX_1.1.7.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `agentic-flow/docs/archived/MCP_PROXY_VALIDATION.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/docs/archived/MCP_PROXY_VALIDATION.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/docs/archived/MCP_PROXY_VALIDATION.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: status, decision, consequences) `agentic-flow/docs/archived/ONNX_INTEGRATION.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/docs/archived/ONNX_INTEGRATION.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/docs/archived/ONNX_INTEGRATION.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: decision, consequences) `agentic-flow/docs/archived/docker-cli-validation.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/docs/archived/docker-cli-validation.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ✅ [INFO] ADR has date: Date present `agentic-flow/docs/archived/docker-cli-validation.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `agentic-flow/docs/archived/mcp-validation-summary.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/docs/archived/mcp-validation-summary.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ✅ [INFO] ADR has date: Date present `agentic-flow/docs/archived/mcp-validation-summary.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `agentic-flow/docs/benchmarks/optimization-guide.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/docs/benchmarks/optimization-guide.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/docs/benchmarks/optimization-guide.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `agentic-flow/docs/benchmarks/quic-results.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/docs/benchmarks/quic-results.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/docs/benchmarks/quic-results.md`
- ❌ [WARNING] ADR has required sections: 3/4 sections (missing: consequences) `agentic-flow/docs/federation/AGENT-DEBUG-STREAMING.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/docs/federation/AGENT-DEBUG-STREAMING.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ✅ [INFO] ADR has date: Date present `agentic-flow/docs/federation/AGENT-DEBUG-STREAMING.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `agentic-flow/docs/federation/DEBUG-STREAMING-COMPLETE.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/docs/federation/DEBUG-STREAMING-COMPLETE.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ✅ [INFO] ADR has date: Date present `agentic-flow/docs/federation/DEBUG-STREAMING-COMPLETE.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `agentic-flow/docs/federation/DEBUG-STREAMING.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/docs/federation/DEBUG-STREAMING.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ✅ [INFO] ADR has date: Date present `agentic-flow/docs/federation/DEBUG-STREAMING.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `agentic-flow/docs/federation/DEPLOYMENT-VALIDATION-SUCCESS.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/docs/federation/DEPLOYMENT-VALIDATION-SUCCESS.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ✅ [INFO] ADR has date: Date present `agentic-flow/docs/federation/DEPLOYMENT-VALIDATION-SUCCESS.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: decision, consequences) `agentic-flow/docs/federation/DOCKER-FEDERATION-DEEP-REVIEW.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/docs/federation/DOCKER-FEDERATION-DEEP-REVIEW.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ✅ [INFO] ADR has date: Date present `agentic-flow/docs/federation/DOCKER-FEDERATION-DEEP-REVIEW.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: decision, consequences) `agentic-flow/docs/guides/ADDING-MCP-SERVERS-CLI.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/docs/guides/ADDING-MCP-SERVERS-CLI.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/docs/guides/ADDING-MCP-SERVERS-CLI.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: decision, consequences) `agentic-flow/docs/guides/ADDING-MCP-SERVERS.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/docs/guides/ADDING-MCP-SERVERS.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/docs/guides/ADDING-MCP-SERVERS.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: status, context, consequences) `agentic-flow/docs/guides/AGENT-BOOSTER.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/docs/guides/AGENT-BOOSTER.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/docs/guides/AGENT-BOOSTER.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: status, decision, consequences) `agentic-flow/docs/guides/ALTERNATIVE_LLM_MODELS.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/docs/guides/ALTERNATIVE_LLM_MODELS.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ✅ [INFO] ADR has date: Date present `agentic-flow/docs/guides/ALTERNATIVE_LLM_MODELS.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `agentic-flow/docs/guides/CLAUDE-CODE-INTEGRATION.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/docs/guides/CLAUDE-CODE-INTEGRATION.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/docs/guides/CLAUDE-CODE-INTEGRATION.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: decision, consequences) `agentic-flow/docs/guides/DEPLOYMENT.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/docs/guides/DEPLOYMENT.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/docs/guides/DEPLOYMENT.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `agentic-flow/docs/guides/DOCKER_AGENT_USAGE.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/docs/guides/DOCKER_AGENT_USAGE.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/docs/guides/DOCKER_AGENT_USAGE.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: decision, consequences) `agentic-flow/docs/guides/IMPLEMENTATION_EXAMPLES.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/docs/guides/IMPLEMENTATION_EXAMPLES.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/docs/guides/IMPLEMENTATION_EXAMPLES.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: decision, consequences) `agentic-flow/docs/guides/MCP-TOOLS.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/docs/guides/MCP-TOOLS.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/docs/guides/MCP-TOOLS.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `agentic-flow/docs/guides/MODEL-ID-MAPPING.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/docs/guides/MODEL-ID-MAPPING.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/docs/guides/MODEL-ID-MAPPING.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: status, consequences) `agentic-flow/docs/guides/MULTI-MODEL-ROUTER.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/docs/guides/MULTI-MODEL-ROUTER.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/docs/guides/MULTI-MODEL-ROUTER.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `agentic-flow/docs/guides/NPM-PUBLISH.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/docs/guides/NPM-PUBLISH.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/docs/guides/NPM-PUBLISH.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `agentic-flow/docs/guides/ONNX-PROXY-IMPLEMENTATION.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/docs/guides/ONNX-PROXY-IMPLEMENTATION.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/docs/guides/ONNX-PROXY-IMPLEMENTATION.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: status, decision, consequences) `agentic-flow/docs/guides/ONNX_CLI_USAGE.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/docs/guides/ONNX_CLI_USAGE.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/docs/guides/ONNX_CLI_USAGE.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: status, decision, consequences) `agentic-flow/docs/guides/ONNX_OPTIMIZATION_GUIDE.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/docs/guides/ONNX_OPTIMIZATION_GUIDE.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/docs/guides/ONNX_OPTIMIZATION_GUIDE.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `agentic-flow/docs/guides/OPENROUTER_DEPLOYMENT.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/docs/guides/OPENROUTER_DEPLOYMENT.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/docs/guides/OPENROUTER_DEPLOYMENT.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: decision, consequences) `agentic-flow/docs/guides/PROXY-ARCHITECTURE-AND-EXTENSION.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/docs/guides/PROXY-ARCHITECTURE-AND-EXTENSION.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/docs/guides/PROXY-ARCHITECTURE-AND-EXTENSION.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `agentic-flow/docs/guides/QUIC-SWARM-QUICKSTART.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/docs/guides/QUIC-SWARM-QUICKSTART.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/docs/guides/QUIC-SWARM-QUICKSTART.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: decision, consequences) `agentic-flow/docs/guides/QUICK-START-v1.7.1.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/docs/guides/QUICK-START-v1.7.1.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/docs/guides/QUICK-START-v1.7.1.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `agentic-flow/docs/guides/README.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/docs/guides/README.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/docs/guides/README.md`
- ❌ [WARNING] ADR has required sections: 3/4 sections (missing: consequences) `agentic-flow/docs/guides/REASONINGBANK.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/docs/guides/REASONINGBANK.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/docs/guides/REASONINGBANK.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `agentic-flow/docs/guides/STANDALONE_PROXY_GUIDE.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/docs/guides/STANDALONE_PROXY_GUIDE.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/docs/guides/STANDALONE_PROXY_GUIDE.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: status, decision, consequences) `agentic-flow/docs/guides/agent-sdk.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/docs/guides/agent-sdk.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/docs/guides/agent-sdk.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `agentic-flow/docs/integration-docs/AGENT-BOOSTER-INTEGRATION.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/docs/integration-docs/AGENT-BOOSTER-INTEGRATION.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/docs/integration-docs/AGENT-BOOSTER-INTEGRATION.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: decision, consequences) `agentic-flow/docs/integration-docs/CLAUDE-FLOW-INTEGRATION-ANALYSIS.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/docs/integration-docs/CLAUDE-FLOW-INTEGRATION-ANALYSIS.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ✅ [INFO] ADR has date: Date present `agentic-flow/docs/integration-docs/CLAUDE-FLOW-INTEGRATION-ANALYSIS.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `agentic-flow/docs/integration-docs/CLI-INTEGRATION-COMPLETE.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/docs/integration-docs/CLI-INTEGRATION-COMPLETE.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ✅ [INFO] ADR has date: Date present `agentic-flow/docs/integration-docs/CLI-INTEGRATION-COMPLETE.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `agentic-flow/docs/integration-docs/IMPLEMENTATION_SUMMARY.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/docs/integration-docs/IMPLEMENTATION_SUMMARY.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ✅ [INFO] ADR has date: Date present `agentic-flow/docs/integration-docs/IMPLEMENTATION_SUMMARY.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `agentic-flow/docs/integration-docs/INTEGRATION-COMPLETE.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/docs/integration-docs/INTEGRATION-COMPLETE.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ✅ [INFO] ADR has date: Date present `agentic-flow/docs/integration-docs/INTEGRATION-COMPLETE.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `agentic-flow/docs/integration-docs/INTEGRATION-QUICK-SUMMARY.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/docs/integration-docs/INTEGRATION-QUICK-SUMMARY.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/docs/integration-docs/INTEGRATION-QUICK-SUMMARY.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `agentic-flow/docs/integration-docs/INTEGRATION-STATUS-CORRECTED.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/docs/integration-docs/INTEGRATION-STATUS-CORRECTED.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ✅ [INFO] ADR has date: Date present `agentic-flow/docs/integration-docs/INTEGRATION-STATUS-CORRECTED.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `agentic-flow/docs/integration-docs/INTEGRATION_COMPLETE_SUMMARY.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/docs/integration-docs/INTEGRATION_COMPLETE_SUMMARY.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ✅ [INFO] ADR has date: Date present `agentic-flow/docs/integration-docs/INTEGRATION_COMPLETE_SUMMARY.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `agentic-flow/docs/integration-docs/QUIC-WASM-INTEGRATION.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/docs/integration-docs/QUIC-WASM-INTEGRATION.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/docs/integration-docs/QUIC-WASM-INTEGRATION.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `agentic-flow/docs/integration-docs/README.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/docs/integration-docs/README.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/docs/integration-docs/README.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: decision, consequences) `agentic-flow/docs/integration-docs/WASM_ESM_FIX.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/docs/integration-docs/WASM_ESM_FIX.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/docs/integration-docs/WASM_ESM_FIX.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `agentic-flow/docs/integration-docs/WASM_INTEGRATION_COMPLETE.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/docs/integration-docs/WASM_INTEGRATION_COMPLETE.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ✅ [INFO] ADR has date: Date present `agentic-flow/docs/integration-docs/WASM_INTEGRATION_COMPLETE.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `agentic-flow/docs/integrations/CLAUDE_AGENTS_INTEGRATION.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/docs/integrations/CLAUDE_AGENTS_INTEGRATION.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/docs/integrations/CLAUDE_AGENTS_INTEGRATION.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: decision, consequences) `agentic-flow/docs/integrations/CLAUDE_FLOW_INTEGRATION.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/docs/integrations/CLAUDE_FLOW_INTEGRATION.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/docs/integrations/CLAUDE_FLOW_INTEGRATION.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `agentic-flow/docs/integrations/FASTMCP_CLI_INTEGRATION.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/docs/integrations/FASTMCP_CLI_INTEGRATION.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/docs/integrations/FASTMCP_CLI_INTEGRATION.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: decision, consequences) `agentic-flow/docs/integrations/FLOW-NEXUS-INTEGRATION.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/docs/integrations/FLOW-NEXUS-INTEGRATION.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/docs/integrations/FLOW-NEXUS-INTEGRATION.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: status, decision, consequences) `agentic-flow/docs/integrations/README.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/docs/integrations/README.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/docs/integrations/README.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: decision, consequences) `agentic-flow/docs/integrations/fastmcp-implementation-plan.md`
- ✅ [INFO] ADR has explicit status: Status: Draft `agentic-flow/docs/integrations/fastmcp-implementation-plan.md`
- ❌ [INFO] ADR has date: No date found `agentic-flow/docs/integrations/fastmcp-implementation-plan.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: decision, consequences) `agentic-flow/docs/integrations/fastmcp-poc-integration.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/docs/integrations/fastmcp-poc-integration.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/docs/integrations/fastmcp-poc-integration.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `agentic-flow/docs/issues/ISSUE-SUPABASE-INTEGRATION.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/docs/issues/ISSUE-SUPABASE-INTEGRATION.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/docs/issues/ISSUE-SUPABASE-INTEGRATION.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: status, decision, consequences) `agentic-flow/docs/issues/ISSUE-xenova-transformers-dependency.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/docs/issues/ISSUE-xenova-transformers-dependency.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/docs/issues/ISSUE-xenova-transformers-dependency.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `agentic-flow/docs/plans/QUIC/BUILD_INSTRUCTIONS.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/docs/plans/QUIC/BUILD_INSTRUCTIONS.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/docs/plans/QUIC/BUILD_INSTRUCTIONS.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `agentic-flow/docs/plans/QUIC/IMPLEMENTATION_STATUS.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/docs/plans/QUIC/IMPLEMENTATION_STATUS.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/docs/plans/QUIC/IMPLEMENTATION_STATUS.md`
- ❌ [WARNING] ADR has required sections: 3/4 sections (missing: consequences) `agentic-flow/docs/plans/QUIC/QUIC-INTEGRATION-SUMMARY.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/docs/plans/QUIC/QUIC-INTEGRATION-SUMMARY.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ✅ [INFO] ADR has date: Date present `agentic-flow/docs/plans/QUIC/QUIC-INTEGRATION-SUMMARY.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `agentic-flow/docs/plans/QUIC/QUIC-INTEGRATION.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/docs/plans/QUIC/QUIC-INTEGRATION.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/docs/plans/QUIC/QUIC-INTEGRATION.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `agentic-flow/docs/plans/QUIC/QUIC-README.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/docs/plans/QUIC/QUIC-README.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/docs/plans/QUIC/QUIC-README.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: decision, consequences) `agentic-flow/docs/plans/QUIC/QUIC_IMPLEMENTATION_SUMMARY.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/docs/plans/QUIC/QUIC_IMPLEMENTATION_SUMMARY.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/docs/plans/QUIC/QUIC_IMPLEMENTATION_SUMMARY.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: decision, consequences) `agentic-flow/docs/plans/QUIC/README-CONDENSED.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/docs/plans/QUIC/README-CONDENSED.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/docs/plans/QUIC/README-CONDENSED.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `agentic-flow/docs/plans/QUIC/quic-research.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/docs/plans/QUIC/quic-research.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/docs/plans/QUIC/quic-research.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: decision, consequences) `agentic-flow/docs/plans/QUIC/quic-tutorial.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/docs/plans/QUIC/quic-tutorial.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/docs/plans/QUIC/quic-tutorial.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `agentic-flow/docs/plans/agent-booster/00-INDEX.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/docs/plans/agent-booster/00-INDEX.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/docs/plans/agent-booster/00-INDEX.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: status, consequences) `agentic-flow/docs/plans/agent-booster/00-OVERVIEW.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/docs/plans/agent-booster/00-OVERVIEW.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/docs/plans/agent-booster/00-OVERVIEW.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: status, consequences) `agentic-flow/docs/plans/agent-booster/01-ARCHITECTURE.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/docs/plans/agent-booster/01-ARCHITECTURE.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/docs/plans/agent-booster/01-ARCHITECTURE.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: decision, consequences) `agentic-flow/docs/plans/agent-booster/02-INTEGRATION.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/docs/plans/agent-booster/02-INTEGRATION.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/docs/plans/agent-booster/02-INTEGRATION.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `agentic-flow/docs/plans/agent-booster/03-BENCHMARKS.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/docs/plans/agent-booster/03-BENCHMARKS.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/docs/plans/agent-booster/03-BENCHMARKS.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: status, decision, consequences) `agentic-flow/docs/plans/agent-booster/04-NPM-SDK.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/docs/plans/agent-booster/04-NPM-SDK.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/docs/plans/agent-booster/04-NPM-SDK.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `agentic-flow/docs/plans/agent-booster/GITHUB-ISSUE.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/docs/plans/agent-booster/GITHUB-ISSUE.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/docs/plans/agent-booster/GITHUB-ISSUE.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: decision, consequences) `agentic-flow/docs/plans/agent-booster/README.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/docs/plans/agent-booster/README.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/docs/plans/agent-booster/README.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `agentic-flow/docs/plans/agent-booster-cli-integration.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/docs/plans/agent-booster-cli-integration.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/docs/plans/agent-booster-cli-integration.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `agentic-flow/docs/plans/requesty/00-overview.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/docs/plans/requesty/00-overview.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/docs/plans/requesty/00-overview.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: decision, consequences) `agentic-flow/docs/plans/requesty/01-api-research.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/docs/plans/requesty/01-api-research.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/docs/plans/requesty/01-api-research.md`
- ❌ [WARNING] ADR has required sections: 3/4 sections (missing: consequences) `agentic-flow/docs/plans/requesty/02-architecture.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/docs/plans/requesty/02-architecture.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/docs/plans/requesty/02-architecture.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: decision, consequences) `agentic-flow/docs/plans/requesty/03-implementation-phases.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/docs/plans/requesty/03-implementation-phases.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/docs/plans/requesty/03-implementation-phases.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: decision, consequences) `agentic-flow/docs/plans/requesty/04-testing-strategy.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/docs/plans/requesty/04-testing-strategy.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/docs/plans/requesty/04-testing-strategy.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: status, decision, consequences) `agentic-flow/docs/plans/requesty/05-migration-guide.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/docs/plans/requesty/05-migration-guide.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/docs/plans/requesty/05-migration-guide.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `agentic-flow/docs/plans/requesty/README.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/docs/plans/requesty/README.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/docs/plans/requesty/README.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: status, decision, consequences) `agentic-flow/docs/providers/LANDING-PAGE-PROVIDER-CONTENT.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/docs/providers/LANDING-PAGE-PROVIDER-CONTENT.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/docs/providers/LANDING-PAGE-PROVIDER-CONTENT.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `agentic-flow/docs/providers/PROVIDER-FALLBACK-GUIDE.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/docs/providers/PROVIDER-FALLBACK-GUIDE.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/docs/providers/PROVIDER-FALLBACK-GUIDE.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `agentic-flow/docs/providers/PROVIDER-FALLBACK-SUMMARY.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/docs/providers/PROVIDER-FALLBACK-SUMMARY.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/docs/providers/PROVIDER-FALLBACK-SUMMARY.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `agentic-flow/docs/quantum-goap/EXECUTION_SUMMARY.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/docs/quantum-goap/EXECUTION_SUMMARY.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/docs/quantum-goap/EXECUTION_SUMMARY.md`
- ❌ [WARNING] ADR has required sections: 3/4 sections (missing: consequences) `agentic-flow/docs/quantum-goap/GOAP_IMPLEMENTATION_PLAN.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/docs/quantum-goap/GOAP_IMPLEMENTATION_PLAN.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ✅ [INFO] ADR has date: Date present `agentic-flow/docs/quantum-goap/GOAP_IMPLEMENTATION_PLAN.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `agentic-flow/docs/quantum-goap/QUICK_START.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/docs/quantum-goap/QUICK_START.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/docs/quantum-goap/QUICK_START.md`
- ❌ [WARNING] ADR has required sections: 3/4 sections (missing: consequences) `agentic-flow/docs/quantum-research/QUANTUM_RESEARCH_LITERATURE_REVIEW.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/docs/quantum-research/QUANTUM_RESEARCH_LITERATURE_REVIEW.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ✅ [INFO] ADR has date: Date present `agentic-flow/docs/quantum-research/QUANTUM_RESEARCH_LITERATURE_REVIEW.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `agentic-flow/docs/quantum-research/README.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/docs/quantum-research/README.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/docs/quantum-research/README.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: context, consequences) `agentic-flow/docs/reasoningbank/MEMORY_VALIDATION_REPORT.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/docs/reasoningbank/MEMORY_VALIDATION_REPORT.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ✅ [INFO] ADR has date: Date present `agentic-flow/docs/reasoningbank/MEMORY_VALIDATION_REPORT.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `agentic-flow/docs/reasoningbank/README.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/docs/reasoningbank/README.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/docs/reasoningbank/README.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: status, consequences) `agentic-flow/docs/reasoningbank/REASONING-AGENTS.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/docs/reasoningbank/REASONING-AGENTS.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/docs/reasoningbank/REASONING-AGENTS.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `agentic-flow/docs/reasoningbank/REASONINGBANK-BENCHMARK-RESULTS.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/docs/reasoningbank/REASONINGBANK-BENCHMARK-RESULTS.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ✅ [INFO] ADR has date: Date present `agentic-flow/docs/reasoningbank/REASONINGBANK-BENCHMARK-RESULTS.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `agentic-flow/docs/reasoningbank/REASONINGBANK-BENCHMARK.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/docs/reasoningbank/REASONINGBANK-BENCHMARK.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ✅ [INFO] ADR has date: Date present `agentic-flow/docs/reasoningbank/REASONINGBANK-BENCHMARK.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `agentic-flow/docs/reasoningbank/REASONINGBANK-CLI-INTEGRATION.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/docs/reasoningbank/REASONINGBANK-CLI-INTEGRATION.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ✅ [INFO] ADR has date: Date present `agentic-flow/docs/reasoningbank/REASONINGBANK-CLI-INTEGRATION.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `agentic-flow/docs/reasoningbank/REASONINGBANK-DEMO.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/docs/reasoningbank/REASONINGBANK-DEMO.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/docs/reasoningbank/REASONINGBANK-DEMO.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `agentic-flow/docs/reasoningbank/REASONINGBANK-VALIDATION.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/docs/reasoningbank/REASONINGBANK-VALIDATION.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ✅ [INFO] ADR has date: Date present `agentic-flow/docs/reasoningbank/REASONINGBANK-VALIDATION.md`
- ❌ [WARNING] ADR has required sections: 3/4 sections (missing: consequences) `agentic-flow/docs/reasoningbank/REASONINGBANK_ARCHITECTURE.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/docs/reasoningbank/REASONINGBANK_ARCHITECTURE.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/docs/reasoningbank/REASONINGBANK_ARCHITECTURE.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `agentic-flow/docs/reasoningbank/REASONINGBANK_BACKENDS.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/docs/reasoningbank/REASONINGBANK_BACKENDS.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/docs/reasoningbank/REASONINGBANK_BACKENDS.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `agentic-flow/docs/reasoningbank/REASONINGBANK_FIXES.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/docs/reasoningbank/REASONINGBANK_FIXES.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ✅ [INFO] ADR has date: Date present `agentic-flow/docs/reasoningbank/REASONINGBANK_FIXES.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `agentic-flow/docs/reasoningbank/REASONINGBANK_IMPLEMENTATION_STATUS.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/docs/reasoningbank/REASONINGBANK_IMPLEMENTATION_STATUS.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ✅ [INFO] ADR has date: Date present `agentic-flow/docs/reasoningbank/REASONINGBANK_IMPLEMENTATION_STATUS.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: context, consequences) `agentic-flow/docs/reasoningbank/REASONINGBANK_INTEGRATION_PLAN.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/docs/reasoningbank/REASONINGBANK_INTEGRATION_PLAN.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ✅ [INFO] ADR has date: Date present `agentic-flow/docs/reasoningbank/REASONINGBANK_INTEGRATION_PLAN.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: context, consequences) `agentic-flow/docs/reasoningbank/REASONINGBANK_INVESTIGATION.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/docs/reasoningbank/REASONINGBANK_INVESTIGATION.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ✅ [INFO] ADR has date: Date present `agentic-flow/docs/reasoningbank/REASONINGBANK_INVESTIGATION.md`
- ❌ [WARNING] ADR has required sections: 3/4 sections (missing: consequences) `agentic-flow/docs/releases/GITHUB-ISSUE-ADDENDUM-v1.4.6.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/docs/releases/GITHUB-ISSUE-ADDENDUM-v1.4.6.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/docs/releases/GITHUB-ISSUE-ADDENDUM-v1.4.6.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: decision, consequences) `agentic-flow/docs/releases/GITHUB-ISSUE-REASONINGBANK-BENCHMARK.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/docs/releases/GITHUB-ISSUE-REASONINGBANK-BENCHMARK.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/docs/releases/GITHUB-ISSUE-REASONINGBANK-BENCHMARK.md`
- ❌ [WARNING] ADR has required sections: 3/4 sections (missing: consequences) `agentic-flow/docs/releases/GITHUB-ISSUE-v1.4.6.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/docs/releases/GITHUB-ISSUE-v1.4.6.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/docs/releases/GITHUB-ISSUE-v1.4.6.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `agentic-flow/docs/releases/GITHUB-ISSUE-v1.5.0.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/docs/releases/GITHUB-ISSUE-v1.5.0.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ✅ [INFO] ADR has date: Date present `agentic-flow/docs/releases/GITHUB-ISSUE-v1.5.0.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `agentic-flow/docs/releases/HOTFIX-v1.2.1.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/docs/releases/HOTFIX-v1.2.1.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ✅ [INFO] ADR has date: Date present `agentic-flow/docs/releases/HOTFIX-v1.2.1.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: decision, consequences) `agentic-flow/docs/releases/NPM-PUBLISH-GUIDE-v1.2.0.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/docs/releases/NPM-PUBLISH-GUIDE-v1.2.0.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ✅ [INFO] ADR has date: Date present `agentic-flow/docs/releases/NPM-PUBLISH-GUIDE-v1.2.0.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: decision, consequences) `agentic-flow/docs/releases/PUBLISH-COMPLETE-v1.2.0.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/docs/releases/PUBLISH-COMPLETE-v1.2.0.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/docs/releases/PUBLISH-COMPLETE-v1.2.0.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: context, consequences) `agentic-flow/docs/releases/PUBLISH_CHECKLIST_v1.10.0.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/docs/releases/PUBLISH_CHECKLIST_v1.10.0.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ✅ [INFO] ADR has date: Date present `agentic-flow/docs/releases/PUBLISH_CHECKLIST_v1.10.0.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `agentic-flow/docs/releases/PUBLISH_SUMMARY_v1.7.1.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/docs/releases/PUBLISH_SUMMARY_v1.7.1.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/docs/releases/PUBLISH_SUMMARY_v1.7.1.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `agentic-flow/docs/releases/README.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/docs/releases/README.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/docs/releases/README.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: decision, consequences) `agentic-flow/docs/releases/RELEASE-v1.2.0.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/docs/releases/RELEASE-v1.2.0.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ✅ [INFO] ADR has date: Date present `agentic-flow/docs/releases/RELEASE-v1.2.0.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `agentic-flow/docs/releases/RELEASE-v1.8.13.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/docs/releases/RELEASE-v1.8.13.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ✅ [INFO] ADR has date: Date present `agentic-flow/docs/releases/RELEASE-v1.8.13.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `agentic-flow/docs/releases/RELEASE_NOTES_v1.10.0.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/docs/releases/RELEASE_NOTES_v1.10.0.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ✅ [INFO] ADR has date: Date present `agentic-flow/docs/releases/RELEASE_NOTES_v1.10.0.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: decision, consequences) `agentic-flow/docs/releases/RELEASE_NOTES_v1.7.0.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/docs/releases/RELEASE_NOTES_v1.7.0.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ✅ [INFO] ADR has date: Date present `agentic-flow/docs/releases/RELEASE_NOTES_v1.7.0.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `agentic-flow/docs/releases/RELEASE_v1.7.1.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/docs/releases/RELEASE_v1.7.1.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/docs/releases/RELEASE_v1.7.1.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `agentic-flow/docs/releases/v1.4.6-reasoningbank-release.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/docs/releases/v1.4.6-reasoningbank-release.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/docs/releases/v1.4.6-reasoningbank-release.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `agentic-flow/docs/releases/v1.4.7-bugfix.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/docs/releases/v1.4.7-bugfix.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/docs/releases/v1.4.7-bugfix.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `agentic-flow/docs/releases/v1.5.14-QUIC-TRANSPORT.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/docs/releases/v1.5.14-QUIC-TRANSPORT.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ✅ [INFO] ADR has date: Date present `agentic-flow/docs/releases/v1.5.14-QUIC-TRANSPORT.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: decision, consequences) `agentic-flow/docs/supabase/IMPLEMENTATION-SUMMARY.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/docs/supabase/IMPLEMENTATION-SUMMARY.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ✅ [INFO] ADR has date: Date present `agentic-flow/docs/supabase/IMPLEMENTATION-SUMMARY.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `agentic-flow/docs/supabase/INDEX.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/docs/supabase/INDEX.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ✅ [INFO] ADR has date: Date present `agentic-flow/docs/supabase/INDEX.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: decision, consequences) `agentic-flow/docs/supabase/QUICKSTART.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/docs/supabase/QUICKSTART.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/docs/supabase/QUICKSTART.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `agentic-flow/docs/supabase/README.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/docs/supabase/README.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ✅ [INFO] ADR has date: Date present `agentic-flow/docs/supabase/README.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: decision, consequences) `agentic-flow/docs/supabase/SUPABASE-REALTIME-FEDERATION.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/docs/supabase/SUPABASE-REALTIME-FEDERATION.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ✅ [INFO] ADR has date: Date present `agentic-flow/docs/supabase/SUPABASE-REALTIME-FEDERATION.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: context, consequences) `agentic-flow/docs/supabase/TEST-REPORT.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/docs/supabase/TEST-REPORT.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ✅ [INFO] ADR has date: Date present `agentic-flow/docs/supabase/TEST-REPORT.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: decision, consequences) `agentic-flow/docs/testing/AGENT-SYSTEM-VALIDATION.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/docs/testing/AGENT-SYSTEM-VALIDATION.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ✅ [INFO] ADR has date: Date present `agentic-flow/docs/testing/AGENT-SYSTEM-VALIDATION.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `agentic-flow/docs/testing/AGENTDB_TESTING.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/docs/testing/AGENTDB_TESTING.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/docs/testing/AGENTDB_TESTING.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `agentic-flow/docs/testing/FINAL-TESTING-SUMMARY.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/docs/testing/FINAL-TESTING-SUMMARY.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ✅ [INFO] ADR has date: Date present `agentic-flow/docs/testing/FINAL-TESTING-SUMMARY.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `agentic-flow/docs/testing/README.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/docs/testing/README.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/docs/testing/README.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `agentic-flow/docs/testing/REGRESSION-TEST-RESULTS.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/docs/testing/REGRESSION-TEST-RESULTS.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ✅ [INFO] ADR has date: Date present `agentic-flow/docs/testing/REGRESSION-TEST-RESULTS.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: decision, consequences) `agentic-flow/docs/testing/STREAMING-AND-MCP-VALIDATION.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/docs/testing/STREAMING-AND-MCP-VALIDATION.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ✅ [INFO] ADR has date: Date present `agentic-flow/docs/testing/STREAMING-AND-MCP-VALIDATION.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `agentic-flow/docs/validation-reports/BENCHMARK_AND_OPTIMIZATION_REPORT.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/docs/validation-reports/BENCHMARK_AND_OPTIMIZATION_REPORT.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ✅ [INFO] ADR has date: Date present `agentic-flow/docs/validation-reports/BENCHMARK_AND_OPTIMIZATION_REPORT.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: decision, consequences) `agentic-flow/docs/validation-reports/DOCKER_VALIDATION_RESULTS.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/docs/validation-reports/DOCKER_VALIDATION_RESULTS.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ✅ [INFO] ADR has date: Date present `agentic-flow/docs/validation-reports/DOCKER_VALIDATION_RESULTS.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `agentic-flow/docs/validation-reports/NO_REGRESSIONS_CONFIRMED.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/docs/validation-reports/NO_REGRESSIONS_CONFIRMED.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ✅ [INFO] ADR has date: Date present `agentic-flow/docs/validation-reports/NO_REGRESSIONS_CONFIRMED.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `agentic-flow/docs/validation-reports/NPM-PACKAGE-ANALYSIS-FINAL.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/docs/validation-reports/NPM-PACKAGE-ANALYSIS-FINAL.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ✅ [INFO] ADR has date: Date present `agentic-flow/docs/validation-reports/NPM-PACKAGE-ANALYSIS-FINAL.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `agentic-flow/docs/validation-reports/README.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/docs/validation-reports/README.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/docs/validation-reports/README.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `agentic-flow/docs/validation-reports/V2.7.0-ALPHA.10_FINAL_VALIDATION.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/docs/validation-reports/V2.7.0-ALPHA.10_FINAL_VALIDATION.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ✅ [INFO] ADR has date: Date present `agentic-flow/docs/validation-reports/V2.7.0-ALPHA.10_FINAL_VALIDATION.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `agentic-flow/docs/validation-reports/V2.7.0-ALPHA.9_VALIDATION.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/docs/validation-reports/V2.7.0-ALPHA.9_VALIDATION.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ✅ [INFO] ADR has date: Date present `agentic-flow/docs/validation-reports/V2.7.0-ALPHA.9_VALIDATION.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `agentic-flow/docs/validation-reports/v1.6.0-QUIC-CLI-VALIDATION.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/docs/validation-reports/v1.6.0-QUIC-CLI-VALIDATION.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/docs/validation-reports/v1.6.0-QUIC-CLI-VALIDATION.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `agentic-flow/docs/validation-reports/v1.6.1-NPM-PUBLISH-VALIDATION.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/docs/validation-reports/v1.6.1-NPM-PUBLISH-VALIDATION.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/docs/validation-reports/v1.6.1-NPM-PUBLISH-VALIDATION.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `agentic-flow/docs/version-releases/PUBLICATION_REPORT_v1.5.11.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/docs/version-releases/PUBLICATION_REPORT_v1.5.11.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/docs/version-releases/PUBLICATION_REPORT_v1.5.11.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `agentic-flow/docs/version-releases/README.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/docs/version-releases/README.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/docs/version-releases/README.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `agentic-flow/docs/version-releases/v1.5.9-DOCKER-VERIFICATION.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/docs/version-releases/v1.5.9-DOCKER-VERIFICATION.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ✅ [INFO] ADR has date: Date present `agentic-flow/docs/version-releases/v1.5.9-DOCKER-VERIFICATION.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `agentic-flow/docs/version-releases/v1.5.9-RELEASE-SUMMARY.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/docs/version-releases/v1.5.9-RELEASE-SUMMARY.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/docs/version-releases/v1.5.9-RELEASE-SUMMARY.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `agentic-flow/tests/README.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/tests/README.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/tests/README.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `agentic-flow/tests/supabase/README.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/tests/supabase/README.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/tests/supabase/README.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `agentic-flow/tests/validate-streaming-fix.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/tests/validate-streaming-fix.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/tests/validate-streaming-fix.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `agentic-flow/tests/validation/README.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/tests/validation/README.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/tests/validation/README.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `agentic-flow/wasm/quic/README.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `agentic-flow/wasm/quic/README.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `agentic-flow/wasm/quic/README.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: status, context, consequences) `backlog.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `backlog.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `backlog.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: decision, consequences) `bench/BENCHMARK-GUIDE.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `bench/BENCHMARK-GUIDE.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `bench/BENCHMARK-GUIDE.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: decision, consequences) `bench/BENCHMARK-RESULTS-TEMPLATE.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `bench/BENCHMARK-RESULTS-TEMPLATE.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `bench/BENCHMARK-RESULTS-TEMPLATE.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: context, consequences) `bench/COMPLETION-SUMMARY.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `bench/COMPLETION-SUMMARY.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ✅ [INFO] ADR has date: Date present `bench/COMPLETION-SUMMARY.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: status, decision, consequences) `bench/README.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `bench/README.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `bench/README.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: decision, consequences) `crates/agentic-flow-quic/IMPLEMENTATION.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `crates/agentic-flow-quic/IMPLEMENTATION.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `crates/agentic-flow-quic/IMPLEMENTATION.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `crates/agentic-flow-quic/README.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `crates/agentic-flow-quic/README.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `crates/agentic-flow-quic/README.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `docker/README.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `docker/README.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `docker/README.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `docker/test/README.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `docker/test/README.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `docker/test/README.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `docker/test/swarm/README.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `docker/test/swarm/README.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `docker/test/swarm/README.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `docker/trading-mvp/README.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `docker/trading-mvp/README.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `docker/trading-mvp/README.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: context, consequences) `go_no_go_ledger.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `go_no_go_ledger.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ✅ [INFO] ADR has date: Date present `go_no_go_ledger.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: status, decision, consequences) `ide_configs.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `ide_configs.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `ide_configs.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `releases/RELEASE-v1.0.6.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `releases/RELEASE-v1.0.6.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `releases/RELEASE-v1.0.6.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `releases/RELEASE-v1.0.7.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `releases/RELEASE-v1.0.7.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `releases/RELEASE-v1.0.7.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `releases/VALIDATION-v1.0.5.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `releases/VALIDATION-v1.0.5.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `releases/VALIDATION-v1.0.5.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `tools/dashboards/README.md`
- ✅ [INFO] ADR has explicit status: Status: draft `tools/dashboards/README.md`
- ❌ [INFO] ADR has date: No date found `tools/dashboards/README.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `tools/eslint-plugin-ddd/README.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `tools/eslint-plugin-ddd/README.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `tools/eslint-plugin-ddd/README.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: status, decision, consequences) `tools/goalie-vscode/ENHANCED_FILE_WATCHER_README.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `tools/goalie-vscode/ENHANCED_FILE_WATCHER_README.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `tools/goalie-vscode/ENHANCED_FILE_WATCHER_README.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: context, consequences) `tools/goalie-vscode/README.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `tools/goalie-vscode/README.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `tools/goalie-vscode/README.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: status, decision, consequences) `tools/goalie-vscode/TEST_DOCUMENTATION.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `tools/goalie-vscode/TEST_DOCUMENTATION.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `tools/goalie-vscode/TEST_DOCUMENTATION.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: status, decision, consequences) `wsjf_prompt_reindex.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `wsjf_prompt_reindex.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `wsjf_prompt_reindex.md`

### DDD Checks

- ❌ [INFO] Module has DoR/DoD in docstring: No DoR/DoD in docstring `analyze_swarm_results.py`
- ✅ [INFO] Module has DoR/DoD in docstring: DoR/DoD found `automated_email_format_upgrader.py`
- ❌ [INFO] Module has DoR/DoD in docstring: No DoR/DoD in docstring `bench/agents/baseline-agent.ts`
- ❌ [INFO] Module has DoR/DoD in docstring: No DoR/DoD in docstring `bench/agents/reasoningbank-agent.ts`
- ❌ [INFO] Module has DoR/DoD in docstring: No DoR/DoD in docstring `bench/benchmark.ts`
- ❌ [INFO] Module has DoR/DoD in docstring: No DoR/DoD in docstring `bench/lib/metrics.ts`
- ❌ [INFO] Module has DoR/DoD in docstring: No DoR/DoD in docstring `bench/lib/report-generator.ts`
- ❌ [INFO] Module has DoR/DoD in docstring: No DoR/DoD in docstring `bench/lib/types.ts`
- ❌ [INFO] Module has DoR/DoD in docstring: No DoR/DoD in docstring `bench/quic-transport.bench.ts`
- ❌ [INFO] Module has DoR/DoD in docstring: No DoR/DoD in docstring `bench/scenarios/api-design-tasks.ts`
- ❌ [INFO] Module has DoR/DoD in docstring: No DoR/DoD in docstring `bench/scenarios/coding-tasks.ts`
- ❌ [INFO] Module has DoR/DoD in docstring: No DoR/DoD in docstring `bench/scenarios/debugging-tasks.ts`
- ❌ [INFO] Module has DoR/DoD in docstring: No DoR/DoD in docstring `bench/scenarios/problem-solving-tasks.ts`
- ❌ [INFO] Module has DoR/DoD in docstring: No DoR/DoD in docstring `compliance-scanner.py`
- ❌ [INFO] Module has DoR/DoD in docstring: No DoR/DoD in docstring `comprehensive_email_automation.py`
- ❌ [INFO] Module has DoR/DoD in docstring: No DoR/DoD in docstring `debug_metrics.py`
- ❌ [INFO] Module has DoR/DoD in docstring: No DoR/DoD in docstring `dt_schema.py`
- ❌ [INFO] Module has DoR/DoD in docstring: No DoR/DoD in docstring `hivelocity_device_check.py`
- ❌ [INFO] Module has DoR/DoD in docstring: No DoR/DoD in docstring `hivelocity_setup_monitoring.py`
- ❌ [INFO] Module has DoR/DoD in docstring: No DoR/DoD in docstring `legal_research_dashboard.py`
- ❌ [INFO] Module has DoR/DoD in docstring: No DoR/DoD in docstring `multi_org_sor_analyzer.py`
- ❌ [INFO] Module has DoR/DoD in docstring: No DoR/DoD in docstring `playwright.config.ts`
- ❌ [INFO] Module has DoR/DoD in docstring: No DoR/DoD in docstring `playwright.trading.config.ts`
- ❌ [INFO] Module has DoR/DoD in docstring: No DoR/DoD in docstring `quick_email_review.py`
- ❌ [INFO] Module has DoR/DoD in docstring: No DoR/DoD in docstring `refactor_admission.py`
- ❌ [INFO] Module has DoR/DoD in docstring: No DoR/DoD in docstring `reverse_recruiting_evaluator.py`
- ❌ [INFO] Module has DoR/DoD in docstring: No DoR/DoD in docstring `reverse_recruiting_orchestrator.py`
- ❌ [INFO] Module has DoR/DoD in docstring: No DoR/DoD in docstring `reverse_recruiting_swarm.py`
- ❌ [INFO] Module has DoR/DoD in docstring: No DoR/DoD in docstring `rewrite_governance.py`
- ❌ [INFO] Module has DoR/DoD in docstring: No DoR/DoD in docstring `roam_wsjf_analyzer.py`
- ❌ [INFO] Module has DoR/DoD in docstring: No DoR/DoD in docstring `tailwind.config.ts`
- ❌ [INFO] Module has DoR/DoD in docstring: No DoR/DoD in docstring `test-roam.ts`
- ❌ [INFO] Module has DoR/DoD in docstring: No DoR/DoD in docstring `test-scheduler.ts`
- ❌ [INFO] Module has DoR/DoD in docstring: No DoR/DoD in docstring `tooling/mcp-polyglot-adapter/core-adapter.py`
- ❌ [INFO] Module has DoR/DoD in docstring: No DoR/DoD in docstring `tooling/scripts/env-sync.ts`
- ❌ [INFO] Module has DoR/DoD in docstring: No DoR/DoD in docstring `tools/eslint-plugin-ddd/src/index.ts`
- ❌ [INFO] Module has DoR/DoD in docstring: No DoR/DoD in docstring `tools/eslint-plugin-ddd/src/rules/no-application-domain-mutation.ts`
- ❌ [INFO] Module has DoR/DoD in docstring: No DoR/DoD in docstring `tools/eslint-plugin-ddd/src/rules/no-domain-infrastructure-imports.ts`
- ❌ [INFO] Module has DoR/DoD in docstring: No DoR/DoD in docstring `tools/eslint-plugin-ddd/src/rules/repository-interfaces-in-domain.ts`
- ❌ [INFO] Module has DoR/DoD in docstring: No DoR/DoD in docstring `tools/eslint-plugin-ddd/src/utils/ddd-layers.ts`
- ❌ [INFO] Module has DoR/DoD in docstring: No DoR/DoD in docstring `tools/eslint-plugin-ddd/tests/rules/no-application-domain-mutation.test.ts`
- ❌ [INFO] Module has DoR/DoD in docstring: No DoR/DoD in docstring `tools/eslint-plugin-ddd/tests/rules/no-domain-infrastructure-imports.test.ts`
- ❌ [INFO] Module has DoR/DoD in docstring: No DoR/DoD in docstring `tools/eslint-plugin-ddd/tests/rules/repository-interfaces-in-domain.test.ts`
- ❌ [INFO] Module has DoR/DoD in docstring: No DoR/DoD in docstring `tools/eslint-plugin-ddd/tests/utils/ddd-layers.test.ts`
- ❌ [INFO] Module has DoR/DoD in docstring: No DoR/DoD in docstring `tools/goalie-vscode/test/mocks/vscode.ts`
- ❌ [INFO] Module has DoR/DoD in docstring: No DoR/DoD in docstring `tools/goalie-vscode/tests/alertManager.test.ts`
- ❌ [INFO] Module has DoR/DoD in docstring: No DoR/DoD in docstring `tools/goalie-vscode/tests/commandHandlers.test.ts`
- ❌ [INFO] Module has DoR/DoD in docstring: No DoR/DoD in docstring `tools/goalie-vscode/tests/dataParsing.test.ts`
- ❌ [INFO] Module has DoR/DoD in docstring: No DoR/DoD in docstring `tools/goalie-vscode/tests/fileWatcherService.test.ts`
- ❌ [INFO] Module has DoR/DoD in docstring: No DoR/DoD in docstring `tools/goalie-vscode/tests/integration.test.ts`
- ❌ [INFO] Module has DoR/DoD in docstring: No DoR/DoD in docstring `tools/goalie-vscode/tests/performance.test.ts`
- ❌ [INFO] Module has DoR/DoD in docstring: No DoR/DoD in docstring `tools/goalie-vscode/tests/setup.ts`
- ❌ [INFO] Module has DoR/DoD in docstring: No DoR/DoD in docstring `tools/goalie-vscode/tests/treeview.test.ts`
- ❌ [INFO] Module has DoR/DoD in docstring: No DoR/DoD in docstring `tools/goalie-vscode/tests/userExperience.test.ts`
- ❌ [INFO] Module has DoR/DoD in docstring: No DoR/DoD in docstring `tools/wsjf/build_ssot_snapshot.ts`
- ❌ [INFO] Module has DoR/DoD in docstring: No DoR/DoD in docstring `validate_legal_patterns_cli.py`
- ✅ [INFO] Module has DoR/DoD in docstring: DoR/DoD found `validation_dashboard_tui.py`
- ❌ [INFO] Module has DoR/DoD in docstring: No DoR/DoD in docstring `validation_tui_dashboard.py`
- ❌ [INFO] Module has DoR/DoD in docstring: No DoR/DoD in docstring `vibethinker_settlement_ai.py`
- ❌ [INFO] Module has DoR/DoD in docstring: No DoR/DoD in docstring `vite.config.ts`
- ❌ [INFO] Module has DoR/DoD in docstring: No DoR/DoD in docstring `wholeness_validation_framework.py`
- ✅ [CRITICAL] DDD aggregate root present: 2 aggregate root(s) detected
- ✅ [WARNING] DDD value object present: 12 value object(s) detected
- ✅ [WARNING] DDD service present: 16 service(s) detected

### TDD Checks

- ✅ [INFO] Test file follows naming convention: Correct: test-roam.ts `test-roam.ts`
- ✅ [INFO] Test file follows naming convention: Correct: test-scheduler.ts `test-scheduler.ts`
- ✅ [INFO] Test file follows naming convention: Correct: no-application-domain-mutation.test.ts `tools/eslint-plugin-ddd/tests/rules/no-application-domain-mutation.test.ts`
- ✅ [WARNING] Test assertion density ≥ 1.0 per test: 2.0 assertions/test (2 assertions, 1 tests) `tools/eslint-plugin-ddd/tests/rules/no-application-domain-mutation.test.ts`
- ✅ [INFO] Test file follows naming convention: Correct: no-domain-infrastructure-imports.test.ts `tools/eslint-plugin-ddd/tests/rules/no-domain-infrastructure-imports.test.ts`
- ✅ [WARNING] Test assertion density ≥ 1.0 per test: 2.0 assertions/test (2 assertions, 1 tests) `tools/eslint-plugin-ddd/tests/rules/no-domain-infrastructure-imports.test.ts`
- ✅ [INFO] Test file follows naming convention: Correct: repository-interfaces-in-domain.test.ts `tools/eslint-plugin-ddd/tests/rules/repository-interfaces-in-domain.test.ts`
- ✅ [WARNING] Test assertion density ≥ 1.0 per test: 2.0 assertions/test (2 assertions, 1 tests) `tools/eslint-plugin-ddd/tests/rules/repository-interfaces-in-domain.test.ts`
- ✅ [INFO] Test file follows naming convention: Correct: ddd-layers.test.ts `tools/eslint-plugin-ddd/tests/utils/ddd-layers.test.ts`
- ✅ [WARNING] Test assertion density ≥ 1.0 per test: 2.9 assertions/test (112 assertions, 38 tests) `tools/eslint-plugin-ddd/tests/utils/ddd-layers.test.ts`
- ✅ [INFO] Test file follows naming convention: Correct: test-extension.js `tools/goalie-vscode/test-extension.js`
- ✅ [INFO] Test file follows naming convention: Correct: alertManager.test.ts `tools/goalie-vscode/tests/alertManager.test.ts`
- ✅ [WARNING] Test assertion density ≥ 1.0 per test: 1.1 assertions/test (14 assertions, 13 tests) `tools/goalie-vscode/tests/alertManager.test.ts`
- ✅ [INFO] Test file follows naming convention: Correct: commandHandlers.test.ts `tools/goalie-vscode/tests/commandHandlers.test.ts`
- ✅ [WARNING] Test assertion density ≥ 1.0 per test: 1.4 assertions/test (32 assertions, 23 tests) `tools/goalie-vscode/tests/commandHandlers.test.ts`
- ✅ [INFO] Test file follows naming convention: Correct: dataParsing.test.ts `tools/goalie-vscode/tests/dataParsing.test.ts`
- ✅ [WARNING] Test assertion density ≥ 1.0 per test: 2.5 assertions/test (35 assertions, 14 tests) `tools/goalie-vscode/tests/dataParsing.test.ts`
- ✅ [INFO] Test file follows naming convention: Correct: fileWatcherService.test.ts `tools/goalie-vscode/tests/fileWatcherService.test.ts`
- ✅ [WARNING] Test assertion density ≥ 1.0 per test: 2.5 assertions/test (43 assertions, 17 tests) `tools/goalie-vscode/tests/fileWatcherService.test.ts`
- ✅ [INFO] Test file follows naming convention: Correct: integration.test.ts `tools/goalie-vscode/tests/integration.test.ts`
- ✅ [WARNING] Test assertion density ≥ 1.0 per test: 2.6 assertions/test (18 assertions, 7 tests) `tools/goalie-vscode/tests/integration.test.ts`
- ✅ [INFO] Test file follows naming convention: Correct: performance.test.ts `tools/goalie-vscode/tests/performance.test.ts`
- ✅ [WARNING] Test assertion density ≥ 1.0 per test: 1.9 assertions/test (15 assertions, 8 tests) `tools/goalie-vscode/tests/performance.test.ts`
- ✅ [INFO] Test file follows naming convention: Correct: treeview.test.ts `tools/goalie-vscode/tests/treeview.test.ts`
- ✅ [WARNING] Test assertion density ≥ 1.0 per test: 2.2 assertions/test (41 assertions, 19 tests) `tools/goalie-vscode/tests/treeview.test.ts`
- ✅ [INFO] Test file follows naming convention: Correct: userExperience.test.ts `tools/goalie-vscode/tests/userExperience.test.ts`
- ✅ [WARNING] Test assertion density ≥ 1.0 per test: 1.6 assertions/test (14 assertions, 9 tests) `tools/goalie-vscode/tests/userExperience.test.ts`
- ✅ [CRITICAL] Unit tests present: 151 test functions found
- ✅ [WARNING] Integration tests present: 4 integration test file(s)
- ✅ [INFO] Total assertion count reasonable: 330 total assertions across 15 files

## Recommendations

- ⚠️ PRD health is 23% — address 715 gap(s)
-   → [WARNING] PRD has required sections: 1/4 sections present (missing: objective, acceptance criteria, success metric)
-   → [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found
-   → [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric)
- ⚠️ ADR health is 4% — address 499 gap(s)
-   → [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences)
-   → [WARNING] ADR has required sections: 1/4 sections (missing: status, decision, consequences)
-   → [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences)
- ⚠️ DDD health is 13% — address 0 gap(s)
- 🏗️ Strengthen domain model: ensure aggregate roots, value objects, and services are clearly defined

## OODA Integration

| Phase | Coherence Action |
|:------|:-----------------|
| **Observe** | Scanned 1515 files across 4 layers |
| **Orient** | Health: PRD=23%, ADR=4%, DDD=13%, TDD=100% |
| **Decide** | Verdict: FAIL at 13% |
| **Act** | 10 recommendations to implement |

---
*Generated by DDD/TDD/ADR Coherence Validator v1.0 | 2026-04-08 11:29:09*