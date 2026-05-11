# DDD/TDD/ADR Coherence Validation Report
**Generated:** 2026-05-08 12:21:31
**Project:** `/Users/shahroozbhopti/Documents/code`
**Files Scanned:** 1524
**Automation Level:** Level 0 (Manual)

## ❌ Overall: FAIL
`████░░░░░░░░░░░░░░░░░░░░░░░░░░` **15.3%** (476/3117 checks)

## Layer Health

| Layer | Health | Files | Gaps | Strengths |
|:------|:------:|:-----:|:----:|:----------|
| **PRD** | 🔴 26% | 500 | 669 | 500 PRD document(s) found |
| **ADR** | 🔴 5% | 500 | 498 | 500 ADR document(s) found |
| **DDD** | 🔴 8% | 500 | 1 | 500 domain file(s) found |
| **TDD** | 🟡 75% | 24 | 5 | 24 test file(s) found |

## Cross-Layer Coherence

- ✅ **COH-001** (ddd→tdd): 46/50 domain classes have test coverage (92%)
- ✅ **COH-003** (prd→tdd): PRD criteria: ✓, Tests exist: ✓
- ✅ **COH-004** (tdd→ddd): 44/63 domain terms found in test names (70%)
- ✅ **COH-002** (adr→ddd): 500 ADR(s), 50 domain classes
- ✅ **COH-005** (prd→adr): PRD: 500 doc(s), ADR: 500 doc(s), 1/500 with valid status
- ✅ **COH-010** (ddd→prd): 31/31 domain modules have DoR/DoD docstrings (100%)
- ✅ **COH-006** (ddd→ddd): 12/14 Python packages have __init__.py (86%)
- ✅ **COH-009** (ddd→ddd): 40/41 Rust domain structs derive Serialize (98%)
- ✅ **COH-007** (tdd→tdd): 77/78 test files follow naming convention (99%)
- ✅ **COH-008** (prd→prd): 18/18 PRD documents have measurable success metrics (100%) [11 stray PRD-like file(s) outside docs/prd/]

### PRD Checks

- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `.agent.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 1 pattern(s) found `.agent.md`
- ✅ [INFO] PRD defines DoR and DoD: DoR: ✓, DoD: ✓ `.agent.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: objective, acceptance criteria, success metric) `.hybrid-tunnel-config.md`
  💡 Add missing sections: objective, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `.hybrid-tunnel-config.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `.hybrid-tunnel-config.md`
- ❌ [WARNING] PRD has required sections: 3/4 sections present (missing: acceptance criteria) `ADAPTIVE_LEARNING_ANALYSIS_SUMMARY.md`
  💡 Add missing sections: acceptance criteria
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `ADAPTIVE_LEARNING_ANALYSIS_SUMMARY.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `ADAPTIVE_LEARNING_ANALYSIS_SUMMARY.md`
- ❌ [WARNING] PRD has required sections: 3/4 sections present (missing: acceptance criteria) `ADAPTIVE_LEARNING_DOCUMENTS_INDEX.md`
  💡 Add missing sections: acceptance criteria
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `ADAPTIVE_LEARNING_DOCUMENTS_INDEX.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `ADAPTIVE_LEARNING_DOCUMENTS_INDEX.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `AFFILIATE_CONSOLIDATION_GREENFIELD_MIGRATION.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 1 pattern(s) found `AFFILIATE_CONSOLIDATION_GREENFIELD_MIGRATION.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `AFFILIATE_CONSOLIDATION_GREENFIELD_MIGRATION.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: objective, requirements, acceptance criteria) `AFFILIATE_PRE_PI_SYNC_COMPLETE_PACKAGE.md`
  💡 Add missing sections: objective, requirements, acceptance criteria
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 3 pattern(s) found `AFFILIATE_PRE_PI_SYNC_COMPLETE_PACKAGE.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `AFFILIATE_PRE_PI_SYNC_COMPLETE_PACKAGE.md`
- ❌ [WARNING] PRD has required sections: 3/4 sections present (missing: requirements) `AFFILIATE_SYSTEMS_COMPREHENSIVE_PI_SYNC_REVIEW.md`
  💡 Add missing sections: requirements
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 4 pattern(s) found `AFFILIATE_SYSTEMS_COMPREHENSIVE_PI_SYNC_REVIEW.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `AFFILIATE_SYSTEMS_COMPREHENSIVE_PI_SYNC_REVIEW.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: objective, requirements, acceptance criteria) `AFFILIATE_SYSTEMS_RECURSIVE_ROAM_ANALYSIS_PRE_PI_SYNC.md`
  💡 Add missing sections: objective, requirements, acceptance criteria
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 4 pattern(s) found `AFFILIATE_SYSTEMS_RECURSIVE_ROAM_ANALYSIS_PRE_PI_SYNC.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `AFFILIATE_SYSTEMS_RECURSIVE_ROAM_ANALYSIS_PRE_PI_SYNC.md`
- ❌ [WARNING] PRD has required sections: 2/4 sections present (missing: requirements, acceptance criteria) `AGENTDB_ANALYSIS_INDEX.md`
  💡 Add missing sections: requirements, acceptance criteria
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `AGENTDB_ANALYSIS_INDEX.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `AGENTDB_ANALYSIS_INDEX.md`
- ❌ [WARNING] PRD has required sections: 2/4 sections present (missing: objective, acceptance criteria) `AGENTDB_HOOK_HEALTH_ASSESSMENT.md`
  💡 Add missing sections: objective, acceptance criteria
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `AGENTDB_HOOK_HEALTH_ASSESSMENT.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `AGENTDB_HOOK_HEALTH_ASSESSMENT.md`
- ❌ [WARNING] PRD has required sections: 3/4 sections present (missing: acceptance criteria) `AGENTDB_LEARNING_HOOKS_SUMMARY.md`
  💡 Add missing sections: acceptance criteria
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 3 pattern(s) found `AGENTDB_LEARNING_HOOKS_SUMMARY.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `AGENTDB_LEARNING_HOOKS_SUMMARY.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `AGENTIC_TRIBE_INTEGRATION_COMPLETE.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 3 pattern(s) found `AGENTIC_TRIBE_INTEGRATION_COMPLETE.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `AGENTIC_TRIBE_INTEGRATION_COMPLETE.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `AGENTS.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `AGENTS.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `AGENTS.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: objective, requirements, acceptance criteria) `ANALYSIS_DOCUMENTS_INDEX.md`
  💡 Add missing sections: objective, requirements, acceptance criteria
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `ANALYSIS_DOCUMENTS_INDEX.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `ANALYSIS_DOCUMENTS_INDEX.md`
- ❌ [WARNING] PRD has required sections: 3/4 sections present (missing: acceptance criteria) `APPROVAL_FRAMEWORK_SUMMARY.md`
  💡 Add missing sections: acceptance criteria
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `APPROVAL_FRAMEWORK_SUMMARY.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `APPROVAL_FRAMEWORK_SUMMARY.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `BACKUP_LOCATIONS_REPORT.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `BACKUP_LOCATIONS_REPORT.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `BACKUP_LOCATIONS_REPORT.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: requirements, acceptance criteria, success metric) `BACKUP_REVIEW_RETRO.md`
  💡 Add missing sections: requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `BACKUP_REVIEW_RETRO.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `BACKUP_REVIEW_RETRO.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `BEAM_DIMENSION_MAPPING_GUIDE.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `BEAM_DIMENSION_MAPPING_GUIDE.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `BEAM_DIMENSION_MAPPING_GUIDE.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: objective, acceptance criteria, success metric) `BLOCKERS_RESOLVED.md`
  💡 Add missing sections: objective, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 3 pattern(s) found `BLOCKERS_RESOLVED.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `BLOCKERS_RESOLVED.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `BLOCKER_001_CALIBRATION_IMPLEMENTATION_GUIDE.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 3 pattern(s) found `BLOCKER_001_CALIBRATION_IMPLEMENTATION_GUIDE.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `BLOCKER_001_CALIBRATION_IMPLEMENTATION_GUIDE.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `BLOCKER_003_IPMI_IMPLEMENTATION_GUIDE.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 4 pattern(s) found `BLOCKER_003_IPMI_IMPLEMENTATION_GUIDE.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `BLOCKER_003_IPMI_IMPLEMENTATION_GUIDE.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `BLOCKER_REMEDIATION_EXECUTION_ORCHESTRATION.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 3 pattern(s) found `BLOCKER_REMEDIATION_EXECUTION_ORCHESTRATION.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `BLOCKER_REMEDIATION_EXECUTION_ORCHESTRATION.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `BLOCKER_REMEDIATION_INDEX.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `BLOCKER_REMEDIATION_INDEX.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `BLOCKER_REMEDIATION_INDEX.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `BLOCKER_REMEDIATION_SUMMARY.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 3 pattern(s) found `BLOCKER_REMEDIATION_SUMMARY.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `BLOCKER_REMEDIATION_SUMMARY.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `CAPABILITY_BACKLOG.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `CAPABILITY_BACKLOG.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✓ `CAPABILITY_BACKLOG.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `CHANGELOG.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `CHANGELOG.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `CHANGELOG.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: objective, requirements, acceptance criteria) `CLAUDE_ENHANCED_BLOCKERS_RESOLVED.md`
  💡 Add missing sections: objective, requirements, acceptance criteria
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 3 pattern(s) found `CLAUDE_ENHANCED_BLOCKERS_RESOLVED.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `CLAUDE_ENHANCED_BLOCKERS_RESOLVED.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: requirements, acceptance criteria, success metric) `CLAUDE_FLOW_INFRASTRUCTURE_SUMMARY.md`
  💡 Add missing sections: requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `CLAUDE_FLOW_INFRASTRUCTURE_SUMMARY.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `CLAUDE_FLOW_INFRASTRUCTURE_SUMMARY.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `CLEANUP_STRATEGY_GUIDE.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 1 pattern(s) found `CLEANUP_STRATEGY_GUIDE.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `CLEANUP_STRATEGY_GUIDE.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: objective, requirements, success metric) `COMPLETE_EXECUTION_SUMMARY.md`
  💡 Add missing sections: objective, requirements, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `COMPLETE_EXECUTION_SUMMARY.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `COMPLETE_EXECUTION_SUMMARY.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: objective, requirements, acceptance criteria) `COMPREHENSIVE_AGENTIC_ECOSYSTEM_ROADMAP.md`
  💡 Add missing sections: objective, requirements, acceptance criteria
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `COMPREHENSIVE_AGENTIC_ECOSYSTEM_ROADMAP.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `COMPREHENSIVE_AGENTIC_ECOSYSTEM_ROADMAP.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `COMPREHENSIVE_BLOCKER_REMEDIATION_STRATEGY.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 4 pattern(s) found `COMPREHENSIVE_BLOCKER_REMEDIATION_STRATEGY.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `COMPREHENSIVE_BLOCKER_REMEDIATION_STRATEGY.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: requirements, acceptance criteria, success metric) `CONTRACT.md`
  💡 Add missing sections: requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 1 pattern(s) found `CONTRACT.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `CONTRACT.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: requirements, acceptance criteria, success metric) `CRITICAL_BLOCKER_RESOLUTION_COMPLETE.md`
  💡 Add missing sections: requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `CRITICAL_BLOCKER_RESOLUTION_COMPLETE.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `CRITICAL_BLOCKER_RESOLUTION_COMPLETE.md`
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
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `DELIVERY_SUMMARY.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 1 pattern(s) found `DELIVERY_SUMMARY.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `DELIVERY_SUMMARY.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `DEPLOYMENT_COMPLETE_FINAL.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 3 pattern(s) found `DEPLOYMENT_COMPLETE_FINAL.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `DEPLOYMENT_COMPLETE_FINAL.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `DEPLOYMENT_EXECUTED.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 3 pattern(s) found `DEPLOYMENT_EXECUTED.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `DEPLOYMENT_EXECUTED.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `DEPLOYMENT_EXECUTION_COMPLETE.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 3 pattern(s) found `DEPLOYMENT_EXECUTION_COMPLETE.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `DEPLOYMENT_EXECUTION_COMPLETE.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `DEPLOYMENT_INDEX.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 3 pattern(s) found `DEPLOYMENT_INDEX.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `DEPLOYMENT_INDEX.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: objective, acceptance criteria, success metric) `DEPLOYMENT_PR_SUMMARY.md`
  💡 Add missing sections: objective, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `DEPLOYMENT_PR_SUMMARY.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `DEPLOYMENT_PR_SUMMARY.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `DEPLOYMENT_PR_TEMPLATE.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 3 pattern(s) found `DEPLOYMENT_PR_TEMPLATE.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `DEPLOYMENT_PR_TEMPLATE.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `DEPLOYMENT_READINESS_SUMMARY.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `DEPLOYMENT_READINESS_SUMMARY.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `DEPLOYMENT_READINESS_SUMMARY.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: objective, requirements, acceptance criteria) `DPC_IMPLEMENTATION.md`
  💡 Add missing sections: objective, requirements, acceptance criteria
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 1 pattern(s) found `DPC_IMPLEMENTATION.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `DPC_IMPLEMENTATION.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `EMAIL-VALIDATION-PIPELINE-COMPLETE.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `EMAIL-VALIDATION-PIPELINE-COMPLETE.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `EMAIL-VALIDATION-PIPELINE-COMPLETE.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: requirements, acceptance criteria, success metric) `EXECUTIONCONTEXT_ENHANCEMENT_GUIDE.md`
  💡 Add missing sections: requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `EXECUTIONCONTEXT_ENHANCEMENT_GUIDE.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `EXECUTIONCONTEXT_ENHANCEMENT_GUIDE.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: requirements, acceptance criteria, success metric) `EXECUTIONCONTEXT_LEARNING_ENHANCEMENT.md`
  💡 Add missing sections: requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `EXECUTIONCONTEXT_LEARNING_ENHANCEMENT.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `EXECUTIONCONTEXT_LEARNING_ENHANCEMENT.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `EXECUTION_INDEX.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `EXECUTION_INDEX.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `EXECUTION_INDEX.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: objective, requirements, acceptance criteria) `EXECUTION_PLAN.md`
  💡 Add missing sections: objective, requirements, acceptance criteria
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `EXECUTION_PLAN.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `EXECUTION_PLAN.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `EXECUTION_SUMMARY_20250129.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 1 pattern(s) found `EXECUTION_SUMMARY_20250129.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `EXECUTION_SUMMARY_20250129.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: objective, acceptance criteria, success metric) `EXECUTIVE_SUMMARY.md`
  💡 Add missing sections: objective, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `EXECUTIVE_SUMMARY.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `EXECUTIVE_SUMMARY.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `FINAL_COMPREHENSIVE_SUMMARY.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 3 pattern(s) found `FINAL_COMPREHENSIVE_SUMMARY.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `FINAL_COMPREHENSIVE_SUMMARY.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `FINAL_DEPLOYMENT_SUMMARY.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 3 pattern(s) found `FINAL_DEPLOYMENT_SUMMARY.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `FINAL_DEPLOYMENT_SUMMARY.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `FINAL_PI_SYNC_EXECUTION_REPORT.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `FINAL_PI_SYNC_EXECUTION_REPORT.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `FINAL_PI_SYNC_EXECUTION_REPORT.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `FINAL_STATUS.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 3 pattern(s) found `FINAL_STATUS.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `FINAL_STATUS.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `GATES-ALL-PASS-FULL-AUTO-UNLOCKED.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `GATES-ALL-PASS-FULL-AUTO-UNLOCKED.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `GATES-ALL-PASS-FULL-AUTO-UNLOCKED.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: objective, requirements, acceptance criteria) `GO_LIVE_COMPLETE.md`
  💡 Add missing sections: objective, requirements, acceptance criteria
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `GO_LIVE_COMPLETE.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `GO_LIVE_COMPLETE.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `GO_LIVE_EXECUTION_PLAN.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `GO_LIVE_EXECUTION_PLAN.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `GO_LIVE_EXECUTION_PLAN.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: objective, requirements, acceptance criteria) `GO_LIVE_FINAL_AUTHORIZATION.md`
  💡 Add missing sections: objective, requirements, acceptance criteria
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 3 pattern(s) found `GO_LIVE_FINAL_AUTHORIZATION.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `GO_LIVE_FINAL_AUTHORIZATION.md`
- ❌ [WARNING] PRD has required sections: 2/4 sections present (missing: objective, acceptance criteria) `HEALTH_ASSESSMENT_EXECUTIVE_SUMMARY.md`
  💡 Add missing sections: objective, acceptance criteria
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `HEALTH_ASSESSMENT_EXECUTIVE_SUMMARY.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `HEALTH_ASSESSMENT_EXECUTIVE_SUMMARY.md`
- ❌ [WARNING] PRD has required sections: 2/4 sections present (missing: requirements, acceptance criteria) `HEALTH_ASSESSMENT_INDEX.md`
  💡 Add missing sections: requirements, acceptance criteria
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `HEALTH_ASSESSMENT_INDEX.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `HEALTH_ASSESSMENT_INDEX.md`
- ❌ [WARNING] PRD has required sections: 2/4 sections present (missing: acceptance criteria, success metric) `IMPLEMENTATION_COMPLETE.md`
  💡 Add missing sections: acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `IMPLEMENTATION_COMPLETE.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `IMPLEMENTATION_COMPLETE.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `IMPLEMENTATION_STATUS.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `IMPLEMENTATION_STATUS.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `IMPLEMENTATION_STATUS.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `IMPLEMENTATION_SUMMARY.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `IMPLEMENTATION_SUMMARY.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `IMPLEMENTATION_SUMMARY.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `INBOX_ZERO_ROADMAP.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 1 pattern(s) found `INBOX_ZERO_ROADMAP.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `INBOX_ZERO_ROADMAP.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: objective, requirements, success metric) `INCREMENT.md`
  💡 Add missing sections: objective, requirements, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `INCREMENT.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `INCREMENT.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `INDEX.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 3 pattern(s) found `INDEX.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `INDEX.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `INFRASTRUCTURE_MAP.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 1 pattern(s) found `INFRASTRUCTURE_MAP.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `INFRASTRUCTURE_MAP.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `INTEGRATION_STATUS.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `INTEGRATION_STATUS.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `INTEGRATION_STATUS.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `INTEGRATION_SUMMARY.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 3 pattern(s) found `INTEGRATION_SUMMARY.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `INTEGRATION_SUMMARY.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: objective, requirements, acceptance criteria) `LEAN_AGENTIC_EXECUTION_ROADMAP.md`
  💡 Add missing sections: objective, requirements, acceptance criteria
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 3 pattern(s) found `LEAN_AGENTIC_EXECUTION_ROADMAP.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `LEAN_AGENTIC_EXECUTION_ROADMAP.md`
- ❌ [WARNING] PRD has required sections: 2/4 sections present (missing: requirements, acceptance criteria) `LEAN_AGENTIC_LEARNING_HOOKS_IMPLEMENTATION_PLAN.md`
  💡 Add missing sections: requirements, acceptance criteria
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `LEAN_AGENTIC_LEARNING_HOOKS_IMPLEMENTATION_PLAN.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `LEAN_AGENTIC_LEARNING_HOOKS_IMPLEMENTATION_PLAN.md`
- ❌ [WARNING] PRD has required sections: 2/4 sections present (missing: requirements, acceptance criteria) `LEAN_AGENTIC_LEARNING_IMPLEMENTATION_INDEX.md`
  💡 Add missing sections: requirements, acceptance criteria
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `LEAN_AGENTIC_LEARNING_IMPLEMENTATION_INDEX.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `LEAN_AGENTIC_LEARNING_IMPLEMENTATION_INDEX.md`
- ❌ [WARNING] PRD has required sections: 2/4 sections present (missing: requirements, acceptance criteria) `LEAN_AGENTIC_MASTER_INDEX.md`
  💡 Add missing sections: requirements, acceptance criteria
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `LEAN_AGENTIC_MASTER_INDEX.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `LEAN_AGENTIC_MASTER_INDEX.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `LEAN_INTEGRATION_ANALYSIS_INDEX.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `LEAN_INTEGRATION_ANALYSIS_INDEX.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `LEAN_INTEGRATION_ANALYSIS_INDEX.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `LEAN_INTEGRATION_DEPENDENCY_ANALYSIS_REFINED.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `LEAN_INTEGRATION_DEPENDENCY_ANALYSIS_REFINED.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `LEAN_INTEGRATION_DEPENDENCY_ANALYSIS_REFINED.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `LEAN_INTEGRATION_EXECUTION_SUMMARY.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `LEAN_INTEGRATION_EXECUTION_SUMMARY.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `LEAN_INTEGRATION_EXECUTION_SUMMARY.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: objective, requirements, acceptance criteria) `LEAN_INTEGRATION_IMMEDIATE_ACTION_ITEMS.md`
  💡 Add missing sections: objective, requirements, acceptance criteria
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `LEAN_INTEGRATION_IMMEDIATE_ACTION_ITEMS.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `LEAN_INTEGRATION_IMMEDIATE_ACTION_ITEMS.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `LEAN_INTEGRATION_REFINEMENT_INDEX.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 1 pattern(s) found `LEAN_INTEGRATION_REFINEMENT_INDEX.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `LEAN_INTEGRATION_REFINEMENT_INDEX.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `LEAN_INTEGRATION_RISK_DEPENDENCY_ANALYSIS.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `LEAN_INTEGRATION_RISK_DEPENDENCY_ANALYSIS.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `LEAN_INTEGRATION_RISK_DEPENDENCY_ANALYSIS.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: objective, requirements, success metric) `LEAN_INTEGRATION_ROAM_RISK_ASSESSMENT.md`
  💡 Add missing sections: objective, requirements, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `LEAN_INTEGRATION_ROAM_RISK_ASSESSMENT.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `LEAN_INTEGRATION_ROAM_RISK_ASSESSMENT.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `LEAN_INTEGRATION_ROAM_RISK_REFINEMENT.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `LEAN_INTEGRATION_ROAM_RISK_REFINEMENT.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `LEAN_INTEGRATION_ROAM_RISK_REFINEMENT.md`
- ❌ [WARNING] PRD has required sections: 2/4 sections present (missing: requirements, acceptance criteria) `LEAN_INTEGRATION_STAKEHOLDER_BRIEF.md`
  💡 Add missing sections: requirements, acceptance criteria
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 3 pattern(s) found `LEAN_INTEGRATION_STAKEHOLDER_BRIEF.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `LEAN_INTEGRATION_STAKEHOLDER_BRIEF.md`
- ❌ [WARNING] PRD has required sections: 2/4 sections present (missing: objective, success metric) `LEGACY_AFFILIATE_RECURSIVE_REVIEW_PI_SYNC_CONSOLIDATED.md`
  💡 Add missing sections: objective, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 4 pattern(s) found `LEGACY_AFFILIATE_RECURSIVE_REVIEW_PI_SYNC_CONSOLIDATED.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `LEGACY_AFFILIATE_RECURSIVE_REVIEW_PI_SYNC_CONSOLIDATED.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `LOCAL-CI-QUICK-REF.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `LOCAL-CI-QUICK-REF.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `LOCAL-CI-QUICK-REF.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: objective, requirements, success metric) `MASTER_EXECUTION_SUMMARY.md`
  💡 Add missing sections: objective, requirements, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `MASTER_EXECUTION_SUMMARY.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✓ `MASTER_EXECUTION_SUMMARY.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `METRICS_DB_INITIALIZATION_PATCH.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 3 pattern(s) found `METRICS_DB_INITIALIZATION_PATCH.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `METRICS_DB_INITIALIZATION_PATCH.md`
- ❌ [WARNING] PRD has required sections: 2/4 sections present (missing: requirements, success metric) `MILESTONE_PHASE_GATE_IMPLEMENTATION_PLAN.md`
  💡 Add missing sections: requirements, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `MILESTONE_PHASE_GATE_IMPLEMENTATION_PLAN.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✓ `MILESTONE_PHASE_GATE_IMPLEMENTATION_PLAN.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `MILESTONE_VALIDATION_COMPLETE.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `MILESTONE_VALIDATION_COMPLETE.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `MILESTONE_VALIDATION_COMPLETE.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `MULTI-WSJF-SWARM-QUICKSTART.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `MULTI-WSJF-SWARM-QUICKSTART.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `MULTI-WSJF-SWARM-QUICKSTART.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: objective, requirements, acceptance criteria) `MULTI_PHASE_IMPLEMENTATION_GUIDE.md`
  💡 Add missing sections: objective, requirements, acceptance criteria
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `MULTI_PHASE_IMPLEMENTATION_GUIDE.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `MULTI_PHASE_IMPLEMENTATION_GUIDE.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `NEXT_ACTIONS.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `NEXT_ACTIONS.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `NEXT_ACTIONS.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: objective, acceptance criteria, success metric) `ORCHESTRATOR_ANALYSIS_SUMMARY.md`
  💡 Add missing sections: objective, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 1 pattern(s) found `ORCHESTRATOR_ANALYSIS_SUMMARY.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `ORCHESTRATOR_ANALYSIS_SUMMARY.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: objective, requirements, success metric) `ORCHESTRATOR_COMPARISON.md`
  💡 Add missing sections: objective, requirements, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 1 pattern(s) found `ORCHESTRATOR_COMPARISON.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `ORCHESTRATOR_COMPARISON.md`
- ❌ [WARNING] PRD has required sections: 3/4 sections present (missing: requirements) `ORCHESTRATOR_DEDUPLICATION_ANALYSIS.md`
  💡 Add missing sections: requirements
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 1 pattern(s) found `ORCHESTRATOR_DEDUPLICATION_ANALYSIS.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `ORCHESTRATOR_DEDUPLICATION_ANALYSIS.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: requirements, acceptance criteria, success metric) `ORCHESTRATOR_REFACTORING_GUIDE.md`
  💡 Add missing sections: requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 1 pattern(s) found `ORCHESTRATOR_REFACTORING_GUIDE.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `ORCHESTRATOR_REFACTORING_GUIDE.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: objective, acceptance criteria, success metric) `P0_PROGRESS_SUMMARY.md`
  💡 Add missing sections: objective, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `P0_PROGRESS_SUMMARY.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `P0_PROGRESS_SUMMARY.md`
- ❌ [WARNING] PRD has required sections: 3/4 sections present (missing: requirements) `PHASE1_COMPLETION_SUMMARY.md`
  💡 Add missing sections: requirements
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `PHASE1_COMPLETION_SUMMARY.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `PHASE1_COMPLETION_SUMMARY.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: objective, acceptance criteria, success metric) `PHASE_2_PERFORMANCE_HOOK_IMPLEMENTATION_REPORT.md`
  💡 Add missing sections: objective, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `PHASE_2_PERFORMANCE_HOOK_IMPLEMENTATION_REPORT.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `PHASE_2_PERFORMANCE_HOOK_IMPLEMENTATION_REPORT.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `PHASE_3_CODE_CHANGES.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 1 pattern(s) found `PHASE_3_CODE_CHANGES.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `PHASE_3_CODE_CHANGES.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `PHASE_3_COMPLETION_SUMMARY.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `PHASE_3_COMPLETION_SUMMARY.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `PHASE_3_COMPLETION_SUMMARY.md`
- ❌ [WARNING] PRD has required sections: 2/4 sections present (missing: requirements, acceptance criteria) `PHASE_3_EXECUTION_INDEX.md`
  💡 Add missing sections: requirements, acceptance criteria
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `PHASE_3_EXECUTION_INDEX.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `PHASE_3_EXECUTION_INDEX.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: requirements, acceptance criteria, success metric) `PHASE_3_EXECUTION_PLAN.md`
  💡 Add missing sections: requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `PHASE_3_EXECUTION_PLAN.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `PHASE_3_EXECUTION_PLAN.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `PHASE_3_EXECUTION_REPORT.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `PHASE_3_EXECUTION_REPORT.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `PHASE_3_EXECUTION_REPORT.md`
- ❌ [WARNING] PRD has required sections: 2/4 sections present (missing: requirements, success metric) `PHASE_3_PRODUCTION_DEPLOYMENT.md`
  💡 Add missing sections: requirements, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `PHASE_3_PRODUCTION_DEPLOYMENT.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `PHASE_3_PRODUCTION_DEPLOYMENT.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `PHASE_3_STATUS_2025_10_25.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `PHASE_3_STATUS_2025_10_25.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `PHASE_3_STATUS_2025_10_25.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: requirements, acceptance criteria, success metric) `PHASE_3_TEST_RESULTS.md`
  💡 Add missing sections: requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `PHASE_3_TEST_RESULTS.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `PHASE_3_TEST_RESULTS.md`
- ❌ [WARNING] PRD has required sections: 2/4 sections present (missing: requirements, acceptance criteria) `PHASE_4_DESIGN_INDEX.md`
  💡 Add missing sections: requirements, acceptance criteria
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `PHASE_4_DESIGN_INDEX.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `PHASE_4_DESIGN_INDEX.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: objective, requirements, acceptance criteria) `PHASE_4_DESIGN_SUMMARY.md`
  💡 Add missing sections: objective, requirements, acceptance criteria
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `PHASE_4_DESIGN_SUMMARY.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `PHASE_4_DESIGN_SUMMARY.md`
- ❌ [WARNING] PRD has required sections: 2/4 sections present (missing: acceptance criteria, success metric) `PHASE_4_EXECUTION_PLAN.md`
  💡 Add missing sections: acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 3 pattern(s) found `PHASE_4_EXECUTION_PLAN.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `PHASE_4_EXECUTION_PLAN.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `PHASE_4_HOOKS_1_3_IMPLEMENTATION_GUIDE.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 1 pattern(s) found `PHASE_4_HOOKS_1_3_IMPLEMENTATION_GUIDE.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `PHASE_4_HOOKS_1_3_IMPLEMENTATION_GUIDE.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: objective, requirements, acceptance criteria) `PHASE_4_LEARNING_HOOKS_DESIGN_ANALYSIS.md`
  💡 Add missing sections: objective, requirements, acceptance criteria
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `PHASE_4_LEARNING_HOOKS_DESIGN_ANALYSIS.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `PHASE_4_LEARNING_HOOKS_DESIGN_ANALYSIS.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: objective, acceptance criteria, success metric) `PHASE_GATE_IMPLEMENTATION_GUIDE.md`
  💡 Add missing sections: objective, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 3 pattern(s) found `PHASE_GATE_IMPLEMENTATION_GUIDE.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `PHASE_GATE_IMPLEMENTATION_GUIDE.md`
- ❌ [WARNING] PRD has required sections: 3/4 sections present (missing: acceptance criteria) `PHASE_GATE_STATUS_ANALYSIS.md`
  💡 Add missing sections: acceptance criteria
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `PHASE_GATE_STATUS_ANALYSIS.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `PHASE_GATE_STATUS_ANALYSIS.md`
- ❌ [WARNING] PRD has required sections: 2/4 sections present (missing: requirements, acceptance criteria) `PI_SYNC_COMPREHENSIVE_READINESS_REVIEW.md`
  💡 Add missing sections: requirements, acceptance criteria
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 4 pattern(s) found `PI_SYNC_COMPREHENSIVE_READINESS_REVIEW.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `PI_SYNC_COMPREHENSIVE_READINESS_REVIEW.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `PI_SYNC_READINESS_WITH_AUTOMATION.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `PI_SYNC_READINESS_WITH_AUTOMATION.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `PI_SYNC_READINESS_WITH_AUTOMATION.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: objective, requirements, acceptance criteria) `PI_SYNC_ROAMING_RISKS.md`
  💡 Add missing sections: objective, requirements, acceptance criteria
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 3 pattern(s) found `PI_SYNC_ROAMING_RISKS.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `PI_SYNC_ROAMING_RISKS.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `PI_SYNC_VALIDATION_EXECUTIVE_SUMMARY.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 3 pattern(s) found `PI_SYNC_VALIDATION_EXECUTIVE_SUMMARY.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `PI_SYNC_VALIDATION_EXECUTIVE_SUMMARY.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: objective, requirements, acceptance criteria) `POST_LAUNCH_OPERATIONAL_STATUS.md`
  💡 Add missing sections: objective, requirements, acceptance criteria
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `POST_LAUNCH_OPERATIONAL_STATUS.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `POST_LAUNCH_OPERATIONAL_STATUS.md`
- ❌ [WARNING] PRD has required sections: 2/4 sections present (missing: objective, acceptance criteria) `PR-DESCRIPTION.md`
  💡 Add missing sections: objective, acceptance criteria
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `PR-DESCRIPTION.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `PR-DESCRIPTION.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `PRODUCTION_DEPLOYMENT_COMPLETE.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `PRODUCTION_DEPLOYMENT_COMPLETE.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `PRODUCTION_DEPLOYMENT_COMPLETE.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: objective, requirements, acceptance criteria) `PROJECT_STATUS_REPORT.md`
  💡 Add missing sections: objective, requirements, acceptance criteria
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `PROJECT_STATUS_REPORT.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `PROJECT_STATUS_REPORT.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `PUSH-OPTIONS.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `PUSH-OPTIONS.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `PUSH-OPTIONS.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `README.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `README.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `README.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `READY_FOR_DEPLOYMENT.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 3 pattern(s) found `READY_FOR_DEPLOYMENT.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `READY_FOR_DEPLOYMENT.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `RECURSIVE_LEGACY_CONSOLIDATION_PLAN.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 3 pattern(s) found `RECURSIVE_LEGACY_CONSOLIDATION_PLAN.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `RECURSIVE_LEGACY_CONSOLIDATION_PLAN.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `RECURSIVE_REVIEW_RETRO.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `RECURSIVE_REVIEW_RETRO.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `RECURSIVE_REVIEW_RETRO.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `RESTRUCTURE_EXECUTION_PLAN.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 1 pattern(s) found `RESTRUCTURE_EXECUTION_PLAN.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `RESTRUCTURE_EXECUTION_PLAN.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `RESTRUCTURE_PLAN.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 1 pattern(s) found `RESTRUCTURE_PLAN.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `RESTRUCTURE_PLAN.md`
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
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: objective, acceptance criteria, success metric) `SIGN_OFF_SUMMARY.md`
  💡 Add missing sections: objective, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 3 pattern(s) found `SIGN_OFF_SUMMARY.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `SIGN_OFF_SUMMARY.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `STEP_BY_STEP_FIX_GUIDE.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 1 pattern(s) found `STEP_BY_STEP_FIX_GUIDE.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `STEP_BY_STEP_FIX_GUIDE.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: requirements, acceptance criteria, success metric) `STX11_GREENFIELD_ARCHITECTURE.md`
  💡 Add missing sections: requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `STX11_GREENFIELD_ARCHITECTURE.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `STX11_GREENFIELD_ARCHITECTURE.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: objective, requirements, acceptance criteria) `STX11_INTEGRATION_COMPLETE.md`
  💡 Add missing sections: objective, requirements, acceptance criteria
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `STX11_INTEGRATION_COMPLETE.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `STX11_INTEGRATION_COMPLETE.md`
- ❌ [WARNING] PRD has required sections: 2/4 sections present (missing: requirements, acceptance criteria) `STX_11_PI_SYNC_GO_LIVE_ASSESSMENT.md`
  💡 Add missing sections: requirements, acceptance criteria
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `STX_11_PI_SYNC_GO_LIVE_ASSESSMENT.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `STX_11_PI_SYNC_GO_LIVE_ASSESSMENT.md`
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
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: requirements, acceptance criteria, success metric) `TIER1_LEARNING_HOOKS_IMPLEMENTATION.md`
  💡 Add missing sections: requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 3 pattern(s) found `TIER1_LEARNING_HOOKS_IMPLEMENTATION.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `TIER1_LEARNING_HOOKS_IMPLEMENTATION.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `TONIGHT-DELIVERY-CHECKLIST.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `TONIGHT-DELIVERY-CHECKLIST.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `TONIGHT-DELIVERY-CHECKLIST.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `TONIGHT-QUICK-REF.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 1 pattern(s) found `TONIGHT-QUICK-REF.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `TONIGHT-QUICK-REF.md`
- ❌ [WARNING] PRD has required sections: 2/4 sections present (missing: requirements, success metric) `TRACK_EXECUTION_PLAN.md`
  💡 Add missing sections: requirements, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `TRACK_EXECUTION_PLAN.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✓ `TRACK_EXECUTION_PLAN.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: objective, requirements, success metric) `TRACK_EXECUTION_RESULTS.md`
  💡 Add missing sections: objective, requirements, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `TRACK_EXECUTION_RESULTS.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `TRACK_EXECUTION_RESULTS.md`
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
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `WSJF_ROAM_ANALYSIS_2026-01-22.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 1 pattern(s) found `WSJF_ROAM_ANALYSIS_2026-01-22.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✓ `WSJF_ROAM_ANALYSIS_2026-01-22.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: objective, requirements, acceptance criteria) `WSJF_TRIAL1_EXECUTION_PLAN.md`
  💡 Add missing sections: objective, requirements, acceptance criteria
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `WSJF_TRIAL1_EXECUTION_PLAN.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `WSJF_TRIAL1_EXECUTION_PLAN.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `arxiv_research_integration.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 1 pattern(s) found `arxiv_research_integration.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `arxiv_research_integration.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `backlog.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `backlog.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `backlog.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `go_no_go_ledger.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 1 pattern(s) found `go_no_go_ledger.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✓ `go_no_go_ledger.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `ide_configs.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 1 pattern(s) found `ide_configs.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `ide_configs.md`
- ❌ [WARNING] PRD has required sections: 2/4 sections present (missing: objective, acceptance criteria) `mcp_integrations_analysis.md`
  💡 Add missing sections: objective, acceptance criteria
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `mcp_integrations_analysis.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `mcp_integrations_analysis.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `research_paper_review.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `research_paper_review.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `research_paper_review.md`
- ❌ [WARNING] PRD has required sections: 2/4 sections present (missing: requirements, acceptance criteria) `starlingx_integration.md`
  💡 Add missing sections: requirements, acceptance criteria
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `starlingx_integration.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `starlingx_integration.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: objective, acceptance criteria, success metric) `temp_agentic_qe/.claude/agents/analysis/code-analyzer.md`
  💡 Add missing sections: objective, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `temp_agentic_qe/.claude/agents/analysis/code-analyzer.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/agents/analysis/code-analyzer.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `temp_agentic_qe/.claude/agents/analysis/code-review/analyze-code-quality.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `temp_agentic_qe/.claude/agents/analysis/code-review/analyze-code-quality.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/agents/analysis/code-review/analyze-code-quality.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: objective, acceptance criteria, success metric) `temp_agentic_qe/.claude/agents/architecture/system-design/arch-system-design.md`
  💡 Add missing sections: objective, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 1 pattern(s) found `temp_agentic_qe/.claude/agents/architecture/system-design/arch-system-design.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/agents/architecture/system-design/arch-system-design.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: objective, acceptance criteria, success metric) `temp_agentic_qe/.claude/agents/base-template-generator.md`
  💡 Add missing sections: objective, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `temp_agentic_qe/.claude/agents/base-template-generator.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/agents/base-template-generator.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `temp_agentic_qe/.claude/agents/consensus/byzantine-coordinator.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `temp_agentic_qe/.claude/agents/consensus/byzantine-coordinator.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/agents/consensus/byzantine-coordinator.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: objective, acceptance criteria, success metric) `temp_agentic_qe/.claude/agents/consensus/crdt-synchronizer.md`
  💡 Add missing sections: objective, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 1 pattern(s) found `temp_agentic_qe/.claude/agents/consensus/crdt-synchronizer.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/agents/consensus/crdt-synchronizer.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `temp_agentic_qe/.claude/agents/consensus/gossip-coordinator.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `temp_agentic_qe/.claude/agents/consensus/gossip-coordinator.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/agents/consensus/gossip-coordinator.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `temp_agentic_qe/.claude/agents/consensus/performance-benchmarker.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 3 pattern(s) found `temp_agentic_qe/.claude/agents/consensus/performance-benchmarker.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/agents/consensus/performance-benchmarker.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: objective, acceptance criteria, success metric) `temp_agentic_qe/.claude/agents/consensus/quorum-manager.md`
  💡 Add missing sections: objective, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `temp_agentic_qe/.claude/agents/consensus/quorum-manager.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/agents/consensus/quorum-manager.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `temp_agentic_qe/.claude/agents/consensus/raft-manager.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `temp_agentic_qe/.claude/agents/consensus/raft-manager.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/agents/consensus/raft-manager.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `temp_agentic_qe/.claude/agents/consensus/security-manager.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 1 pattern(s) found `temp_agentic_qe/.claude/agents/consensus/security-manager.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/agents/consensus/security-manager.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: objective, acceptance criteria, success metric) `temp_agentic_qe/.claude/agents/core/coder.md`
  💡 Add missing sections: objective, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 1 pattern(s) found `temp_agentic_qe/.claude/agents/core/coder.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/agents/core/coder.md`
- ❌ [WARNING] PRD has required sections: 2/4 sections present (missing: acceptance criteria, success metric) `temp_agentic_qe/.claude/agents/core/planner.md`
  💡 Add missing sections: acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `temp_agentic_qe/.claude/agents/core/planner.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/agents/core/planner.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `temp_agentic_qe/.claude/agents/core/researcher.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `temp_agentic_qe/.claude/agents/core/researcher.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/agents/core/researcher.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: objective, acceptance criteria, success metric) `temp_agentic_qe/.claude/agents/core/reviewer.md`
  💡 Add missing sections: objective, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 1 pattern(s) found `temp_agentic_qe/.claude/agents/core/reviewer.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/agents/core/reviewer.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: objective, acceptance criteria, success metric) `temp_agentic_qe/.claude/agents/core/tester.md`
  💡 Add missing sections: objective, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `temp_agentic_qe/.claude/agents/core/tester.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/agents/core/tester.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `temp_agentic_qe/.claude/agents/data/ml/data-ml-model.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 1 pattern(s) found `temp_agentic_qe/.claude/agents/data/ml/data-ml-model.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/agents/data/ml/data-ml-model.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `temp_agentic_qe/.claude/agents/development/backend/dev-backend-api.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `temp_agentic_qe/.claude/agents/development/backend/dev-backend-api.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/agents/development/backend/dev-backend-api.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: objective, acceptance criteria, success metric) `temp_agentic_qe/.claude/agents/devops/ci-cd/ops-cicd-github.md`
  💡 Add missing sections: objective, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `temp_agentic_qe/.claude/agents/devops/ci-cd/ops-cicd-github.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/agents/devops/ci-cd/ops-cicd-github.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: objective, acceptance criteria, success metric) `temp_agentic_qe/.claude/agents/documentation/api-docs/docs-api-openapi.md`
  💡 Add missing sections: objective, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `temp_agentic_qe/.claude/agents/documentation/api-docs/docs-api-openapi.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/agents/documentation/api-docs/docs-api-openapi.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `temp_agentic_qe/.claude/agents/flow-nexus/app-store.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `temp_agentic_qe/.claude/agents/flow-nexus/app-store.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/agents/flow-nexus/app-store.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: objective, acceptance criteria, success metric) `temp_agentic_qe/.claude/agents/flow-nexus/authentication.md`
  💡 Add missing sections: objective, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `temp_agentic_qe/.claude/agents/flow-nexus/authentication.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/agents/flow-nexus/authentication.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: requirements, acceptance criteria, success metric) `temp_agentic_qe/.claude/agents/flow-nexus/challenges.md`
  💡 Add missing sections: requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `temp_agentic_qe/.claude/agents/flow-nexus/challenges.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/agents/flow-nexus/challenges.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: objective, acceptance criteria, success metric) `temp_agentic_qe/.claude/agents/flow-nexus/neural-network.md`
  💡 Add missing sections: objective, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `temp_agentic_qe/.claude/agents/flow-nexus/neural-network.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/agents/flow-nexus/neural-network.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `temp_agentic_qe/.claude/agents/flow-nexus/payments.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `temp_agentic_qe/.claude/agents/flow-nexus/payments.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/agents/flow-nexus/payments.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: objective, acceptance criteria, success metric) `temp_agentic_qe/.claude/agents/flow-nexus/sandbox.md`
  💡 Add missing sections: objective, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `temp_agentic_qe/.claude/agents/flow-nexus/sandbox.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/agents/flow-nexus/sandbox.md`
- ❌ [WARNING] PRD has required sections: 2/4 sections present (missing: acceptance criteria, success metric) `temp_agentic_qe/.claude/agents/flow-nexus/swarm.md`
  💡 Add missing sections: acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `temp_agentic_qe/.claude/agents/flow-nexus/swarm.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/agents/flow-nexus/swarm.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `temp_agentic_qe/.claude/agents/flow-nexus/user-tools.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `temp_agentic_qe/.claude/agents/flow-nexus/user-tools.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/agents/flow-nexus/user-tools.md`
- ❌ [WARNING] PRD has required sections: 2/4 sections present (missing: acceptance criteria, success metric) `temp_agentic_qe/.claude/agents/flow-nexus/workflow.md`
  💡 Add missing sections: acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `temp_agentic_qe/.claude/agents/flow-nexus/workflow.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/agents/flow-nexus/workflow.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `temp_agentic_qe/.claude/agents/github/code-review-swarm.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 1 pattern(s) found `temp_agentic_qe/.claude/agents/github/code-review-swarm.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/agents/github/code-review-swarm.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `temp_agentic_qe/.claude/agents/github/github-modes.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `temp_agentic_qe/.claude/agents/github/github-modes.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/agents/github/github-modes.md`
- ❌ [WARNING] PRD has required sections: 2/4 sections present (missing: acceptance criteria, success metric) `temp_agentic_qe/.claude/agents/github/issue-tracker.md`
  💡 Add missing sections: acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 1 pattern(s) found `temp_agentic_qe/.claude/agents/github/issue-tracker.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/agents/github/issue-tracker.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `temp_agentic_qe/.claude/agents/github/multi-repo-swarm.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `temp_agentic_qe/.claude/agents/github/multi-repo-swarm.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/agents/github/multi-repo-swarm.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `temp_agentic_qe/.claude/agents/github/pr-manager.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `temp_agentic_qe/.claude/agents/github/pr-manager.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/agents/github/pr-manager.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `temp_agentic_qe/.claude/agents/github/project-board-sync.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `temp_agentic_qe/.claude/agents/github/project-board-sync.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/agents/github/project-board-sync.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: objective, acceptance criteria, success metric) `temp_agentic_qe/.claude/agents/github/release-manager.md`
  💡 Add missing sections: objective, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 1 pattern(s) found `temp_agentic_qe/.claude/agents/github/release-manager.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/agents/github/release-manager.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `temp_agentic_qe/.claude/agents/github/release-swarm.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 3 pattern(s) found `temp_agentic_qe/.claude/agents/github/release-swarm.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/agents/github/release-swarm.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `temp_agentic_qe/.claude/agents/github/repo-architect.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `temp_agentic_qe/.claude/agents/github/repo-architect.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/agents/github/repo-architect.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: objective, requirements, success metric) `temp_agentic_qe/.claude/agents/github/swarm-issue.md`
  💡 Add missing sections: objective, requirements, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 1 pattern(s) found `temp_agentic_qe/.claude/agents/github/swarm-issue.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/agents/github/swarm-issue.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: objective, acceptance criteria, success metric) `temp_agentic_qe/.claude/agents/github/swarm-pr.md`
  💡 Add missing sections: objective, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `temp_agentic_qe/.claude/agents/github/swarm-pr.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/agents/github/swarm-pr.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: objective, acceptance criteria, success metric) `temp_agentic_qe/.claude/agents/github/sync-coordinator.md`
  💡 Add missing sections: objective, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 1 pattern(s) found `temp_agentic_qe/.claude/agents/github/sync-coordinator.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/agents/github/sync-coordinator.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `temp_agentic_qe/.claude/agents/github/workflow-automation.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 1 pattern(s) found `temp_agentic_qe/.claude/agents/github/workflow-automation.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/agents/github/workflow-automation.md`
- ✅ [WARNING] PRD has required sections: 4/4 sections present `temp_agentic_qe/.claude/agents/goal/code-goal-planner.md`
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 3 pattern(s) found `temp_agentic_qe/.claude/agents/goal/code-goal-planner.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/agents/goal/code-goal-planner.md`
- ❌ [WARNING] PRD has required sections: 2/4 sections present (missing: acceptance criteria, success metric) `temp_agentic_qe/.claude/agents/goal/goal-planner.md`
  💡 Add missing sections: acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 1 pattern(s) found `temp_agentic_qe/.claude/agents/goal/goal-planner.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/agents/goal/goal-planner.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: objective, acceptance criteria, success metric) `temp_agentic_qe/.claude/agents/hive-mind/collective-intelligence-coordinator.md`
  💡 Add missing sections: objective, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `temp_agentic_qe/.claude/agents/hive-mind/collective-intelligence-coordinator.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/agents/hive-mind/collective-intelligence-coordinator.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: requirements, acceptance criteria, success metric) `temp_agentic_qe/.claude/agents/hive-mind/queen-coordinator.md`
  💡 Add missing sections: requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `temp_agentic_qe/.claude/agents/hive-mind/queen-coordinator.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/agents/hive-mind/queen-coordinator.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `temp_agentic_qe/.claude/agents/hive-mind/scout-explorer.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 1 pattern(s) found `temp_agentic_qe/.claude/agents/hive-mind/scout-explorer.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/agents/hive-mind/scout-explorer.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `temp_agentic_qe/.claude/agents/hive-mind/swarm-memory-manager.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 1 pattern(s) found `temp_agentic_qe/.claude/agents/hive-mind/swarm-memory-manager.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/agents/hive-mind/swarm-memory-manager.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `temp_agentic_qe/.claude/agents/hive-mind/worker-specialist.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `temp_agentic_qe/.claude/agents/hive-mind/worker-specialist.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/agents/hive-mind/worker-specialist.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `temp_agentic_qe/.claude/agents/neural/safla-neural.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `temp_agentic_qe/.claude/agents/neural/safla-neural.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/agents/neural/safla-neural.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `temp_agentic_qe/.claude/agents/optimization/benchmark-suite.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 1 pattern(s) found `temp_agentic_qe/.claude/agents/optimization/benchmark-suite.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/agents/optimization/benchmark-suite.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: requirements, acceptance criteria, success metric) `temp_agentic_qe/.claude/agents/optimization/load-balancer.md`
  💡 Add missing sections: requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 1 pattern(s) found `temp_agentic_qe/.claude/agents/optimization/load-balancer.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/agents/optimization/load-balancer.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `temp_agentic_qe/.claude/agents/optimization/performance-monitor.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `temp_agentic_qe/.claude/agents/optimization/performance-monitor.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/agents/optimization/performance-monitor.md`
- ❌ [WARNING] PRD has required sections: 2/4 sections present (missing: acceptance criteria, success metric) `temp_agentic_qe/.claude/agents/optimization/resource-allocator.md`
  💡 Add missing sections: acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 1 pattern(s) found `temp_agentic_qe/.claude/agents/optimization/resource-allocator.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/agents/optimization/resource-allocator.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: requirements, acceptance criteria, success metric) `temp_agentic_qe/.claude/agents/optimization/topology-optimizer.md`
  💡 Add missing sections: requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `temp_agentic_qe/.claude/agents/optimization/topology-optimizer.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/agents/optimization/topology-optimizer.md`
- ❌ [WARNING] PRD has required sections: 2/4 sections present (missing: objective, acceptance criteria) `temp_agentic_qe/.claude/agents/qe-api-contract-validator.md`
  💡 Add missing sections: objective, acceptance criteria
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `temp_agentic_qe/.claude/agents/qe-api-contract-validator.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/agents/qe-api-contract-validator.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: requirements, acceptance criteria, success metric) `temp_agentic_qe/.claude/agents/qe-chaos-engineer.md`
  💡 Add missing sections: requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 3 pattern(s) found `temp_agentic_qe/.claude/agents/qe-chaos-engineer.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/agents/qe-chaos-engineer.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: objective, acceptance criteria, success metric) `temp_agentic_qe/.claude/agents/qe-coverage-analyzer.md`
  💡 Add missing sections: objective, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 3 pattern(s) found `temp_agentic_qe/.claude/agents/qe-coverage-analyzer.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/agents/qe-coverage-analyzer.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: objective, requirements, acceptance criteria) `temp_agentic_qe/.claude/agents/qe-deployment-readiness.md`
  💡 Add missing sections: objective, requirements, acceptance criteria
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 3 pattern(s) found `temp_agentic_qe/.claude/agents/qe-deployment-readiness.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/agents/qe-deployment-readiness.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: objective, requirements, acceptance criteria) `temp_agentic_qe/.claude/agents/qe-flaky-test-hunter.md`
  💡 Add missing sections: objective, requirements, acceptance criteria
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 3 pattern(s) found `temp_agentic_qe/.claude/agents/qe-flaky-test-hunter.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/agents/qe-flaky-test-hunter.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `temp_agentic_qe/.claude/agents/qe-fleet-commander.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 3 pattern(s) found `temp_agentic_qe/.claude/agents/qe-fleet-commander.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/agents/qe-fleet-commander.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: objective, acceptance criteria, success metric) `temp_agentic_qe/.claude/agents/qe-performance-tester.md`
  💡 Add missing sections: objective, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `temp_agentic_qe/.claude/agents/qe-performance-tester.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/agents/qe-performance-tester.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: objective, acceptance criteria, success metric) `temp_agentic_qe/.claude/agents/qe-production-intelligence.md`
  💡 Add missing sections: objective, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 4 pattern(s) found `temp_agentic_qe/.claude/agents/qe-production-intelligence.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/agents/qe-production-intelligence.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `temp_agentic_qe/.claude/agents/qe-quality-analyzer.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 1 pattern(s) found `temp_agentic_qe/.claude/agents/qe-quality-analyzer.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/agents/qe-quality-analyzer.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: objective, acceptance criteria, success metric) `temp_agentic_qe/.claude/agents/qe-quality-gate.md`
  💡 Add missing sections: objective, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 1 pattern(s) found `temp_agentic_qe/.claude/agents/qe-quality-gate.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/agents/qe-quality-gate.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: objective, requirements, acceptance criteria) `temp_agentic_qe/.claude/agents/qe-regression-risk-analyzer.md`
  💡 Add missing sections: objective, requirements, acceptance criteria
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `temp_agentic_qe/.claude/agents/qe-regression-risk-analyzer.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/agents/qe-regression-risk-analyzer.md`
- ❌ [WARNING] PRD has required sections: 3/4 sections present (missing: objective) `temp_agentic_qe/.claude/agents/qe-requirements-validator.md`
  💡 Add missing sections: objective
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 3 pattern(s) found `temp_agentic_qe/.claude/agents/qe-requirements-validator.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/agents/qe-requirements-validator.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: objective, acceptance criteria, success metric) `temp_agentic_qe/.claude/agents/qe-security-scanner.md`
  💡 Add missing sections: objective, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 1 pattern(s) found `temp_agentic_qe/.claude/agents/qe-security-scanner.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/agents/qe-security-scanner.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: objective, requirements, acceptance criteria) `temp_agentic_qe/.claude/agents/qe-test-data-architect.md`
  💡 Add missing sections: objective, requirements, acceptance criteria
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `temp_agentic_qe/.claude/agents/qe-test-data-architect.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/agents/qe-test-data-architect.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `temp_agentic_qe/.claude/agents/qe-test-executor.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 1 pattern(s) found `temp_agentic_qe/.claude/agents/qe-test-executor.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/agents/qe-test-executor.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: objective, acceptance criteria, success metric) `temp_agentic_qe/.claude/agents/qe-test-generator.md`
  💡 Add missing sections: objective, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 3 pattern(s) found `temp_agentic_qe/.claude/agents/qe-test-generator.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/agents/qe-test-generator.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `temp_agentic_qe/.claude/agents/qe-visual-tester.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 3 pattern(s) found `temp_agentic_qe/.claude/agents/qe-visual-tester.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/agents/qe-visual-tester.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: requirements, acceptance criteria, success metric) `temp_agentic_qe/.claude/agents/reasoning/agent.md`
  💡 Add missing sections: requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 1 pattern(s) found `temp_agentic_qe/.claude/agents/reasoning/agent.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/agents/reasoning/agent.md`
- ❌ [WARNING] PRD has required sections: 2/4 sections present (missing: acceptance criteria, success metric) `temp_agentic_qe/.claude/agents/reasoning/goal-planner.md`
  💡 Add missing sections: acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `temp_agentic_qe/.claude/agents/reasoning/goal-planner.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/agents/reasoning/goal-planner.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: objective, acceptance criteria, success metric) `temp_agentic_qe/.claude/agents/sparc/architecture.md`
  💡 Add missing sections: objective, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 3 pattern(s) found `temp_agentic_qe/.claude/agents/sparc/architecture.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/agents/sparc/architecture.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `temp_agentic_qe/.claude/agents/sparc/pseudocode.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 1 pattern(s) found `temp_agentic_qe/.claude/agents/sparc/pseudocode.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/agents/sparc/pseudocode.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `temp_agentic_qe/.claude/agents/sparc/refinement.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 1 pattern(s) found `temp_agentic_qe/.claude/agents/sparc/refinement.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/agents/sparc/refinement.md`
- ❌ [WARNING] PRD has required sections: 3/4 sections present (missing: objective) `temp_agentic_qe/.claude/agents/sparc/specification.md`
  💡 Add missing sections: objective
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `temp_agentic_qe/.claude/agents/sparc/specification.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/agents/sparc/specification.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `temp_agentic_qe/.claude/agents/specialized/mobile/spec-mobile-react-native.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `temp_agentic_qe/.claude/agents/specialized/mobile/spec-mobile-react-native.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/agents/specialized/mobile/spec-mobile-react-native.md`
- ❌ [WARNING] PRD has required sections: 2/4 sections present (missing: acceptance criteria, success metric) `temp_agentic_qe/.claude/agents/swarm/adaptive-coordinator.md`
  💡 Add missing sections: acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `temp_agentic_qe/.claude/agents/swarm/adaptive-coordinator.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/agents/swarm/adaptive-coordinator.md`
- ❌ [WARNING] PRD has required sections: 3/4 sections present (missing: success metric) `temp_agentic_qe/.claude/agents/swarm/hierarchical-coordinator.md`
  💡 Add missing sections: success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `temp_agentic_qe/.claude/agents/swarm/hierarchical-coordinator.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/agents/swarm/hierarchical-coordinator.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: objective, acceptance criteria, success metric) `temp_agentic_qe/.claude/agents/swarm/mesh-coordinator.md`
  💡 Add missing sections: objective, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `temp_agentic_qe/.claude/agents/swarm/mesh-coordinator.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/agents/swarm/mesh-coordinator.md`
- ❌ [WARNING] PRD has required sections: 2/4 sections present (missing: acceptance criteria, success metric) `temp_agentic_qe/.claude/agents/templates/automation-smart-agent.md`
  💡 Add missing sections: acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `temp_agentic_qe/.claude/agents/templates/automation-smart-agent.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/agents/templates/automation-smart-agent.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: objective, acceptance criteria, success metric) `temp_agentic_qe/.claude/agents/templates/coordinator-swarm-init.md`
  💡 Add missing sections: objective, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `temp_agentic_qe/.claude/agents/templates/coordinator-swarm-init.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/agents/templates/coordinator-swarm-init.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `temp_agentic_qe/.claude/agents/templates/github-pr-manager.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `temp_agentic_qe/.claude/agents/templates/github-pr-manager.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/agents/templates/github-pr-manager.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: objective, acceptance criteria, success metric) `temp_agentic_qe/.claude/agents/templates/implementer-sparc-coder.md`
  💡 Add missing sections: objective, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 1 pattern(s) found `temp_agentic_qe/.claude/agents/templates/implementer-sparc-coder.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/agents/templates/implementer-sparc-coder.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `temp_agentic_qe/.claude/agents/templates/memory-coordinator.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `temp_agentic_qe/.claude/agents/templates/memory-coordinator.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/agents/templates/memory-coordinator.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: objective, acceptance criteria, success metric) `temp_agentic_qe/.claude/agents/templates/migration-plan.md`
  💡 Add missing sections: objective, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `temp_agentic_qe/.claude/agents/templates/migration-plan.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/agents/templates/migration-plan.md`
- ❌ [WARNING] PRD has required sections: 2/4 sections present (missing: acceptance criteria, success metric) `temp_agentic_qe/.claude/agents/templates/orchestrator-task.md`
  💡 Add missing sections: acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `temp_agentic_qe/.claude/agents/templates/orchestrator-task.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/agents/templates/orchestrator-task.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: objective, requirements, acceptance criteria) `temp_agentic_qe/.claude/agents/templates/performance-analyzer.md`
  💡 Add missing sections: objective, requirements, acceptance criteria
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `temp_agentic_qe/.claude/agents/templates/performance-analyzer.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/agents/templates/performance-analyzer.md`
- ✅ [WARNING] PRD has required sections: 4/4 sections present `temp_agentic_qe/.claude/agents/templates/sparc-coordinator.md`
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `temp_agentic_qe/.claude/agents/templates/sparc-coordinator.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/agents/templates/sparc-coordinator.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: objective, acceptance criteria, success metric) `temp_agentic_qe/.claude/agents/testing/unit/tdd-london-swarm.md`
  💡 Add missing sections: objective, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `temp_agentic_qe/.claude/agents/testing/unit/tdd-london-swarm.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/agents/testing/unit/tdd-london-swarm.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: objective, acceptance criteria, success metric) `temp_agentic_qe/.claude/agents/testing/validation/production-validator.md`
  💡 Add missing sections: objective, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `temp_agentic_qe/.claude/agents/testing/validation/production-validator.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/agents/testing/validation/production-validator.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `temp_agentic_qe/.claude/commands/README.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `temp_agentic_qe/.claude/commands/README.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/commands/README.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `temp_agentic_qe/.claude/commands/agents/README.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `temp_agentic_qe/.claude/commands/agents/README.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/commands/agents/README.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: objective, acceptance criteria, success metric) `temp_agentic_qe/.claude/commands/agents/agent-capabilities.md`
  💡 Add missing sections: objective, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `temp_agentic_qe/.claude/commands/agents/agent-capabilities.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/commands/agents/agent-capabilities.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `temp_agentic_qe/.claude/commands/agents/agent-coordination.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `temp_agentic_qe/.claude/commands/agents/agent-coordination.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/commands/agents/agent-coordination.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: objective, acceptance criteria, success metric) `temp_agentic_qe/.claude/commands/agents/agent-spawning.md`
  💡 Add missing sections: objective, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `temp_agentic_qe/.claude/commands/agents/agent-spawning.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/commands/agents/agent-spawning.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `temp_agentic_qe/.claude/commands/agents/agent-types.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `temp_agentic_qe/.claude/commands/agents/agent-types.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/commands/agents/agent-types.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `temp_agentic_qe/.claude/commands/analysis/COMMAND_COMPLIANCE_REPORT.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 1 pattern(s) found `temp_agentic_qe/.claude/commands/analysis/COMMAND_COMPLIANCE_REPORT.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/commands/analysis/COMMAND_COMPLIANCE_REPORT.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `temp_agentic_qe/.claude/commands/analysis/README.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `temp_agentic_qe/.claude/commands/analysis/README.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/commands/analysis/README.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `temp_agentic_qe/.claude/commands/analysis/bottleneck-detect.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `temp_agentic_qe/.claude/commands/analysis/bottleneck-detect.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/commands/analysis/bottleneck-detect.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `temp_agentic_qe/.claude/commands/analysis/performance-bottlenecks.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `temp_agentic_qe/.claude/commands/analysis/performance-bottlenecks.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/commands/analysis/performance-bottlenecks.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `temp_agentic_qe/.claude/commands/analysis/performance-report.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `temp_agentic_qe/.claude/commands/analysis/performance-report.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/commands/analysis/performance-report.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `temp_agentic_qe/.claude/commands/analysis/token-efficiency.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `temp_agentic_qe/.claude/commands/analysis/token-efficiency.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/commands/analysis/token-efficiency.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `temp_agentic_qe/.claude/commands/analysis/token-usage.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 1 pattern(s) found `temp_agentic_qe/.claude/commands/analysis/token-usage.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/commands/analysis/token-usage.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `temp_agentic_qe/.claude/commands/aqe-analyze.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `temp_agentic_qe/.claude/commands/aqe-analyze.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/commands/aqe-analyze.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: objective, acceptance criteria, success metric) `temp_agentic_qe/.claude/commands/aqe-benchmark.md`
  💡 Add missing sections: objective, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `temp_agentic_qe/.claude/commands/aqe-benchmark.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/commands/aqe-benchmark.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `temp_agentic_qe/.claude/commands/aqe-chaos.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `temp_agentic_qe/.claude/commands/aqe-chaos.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/commands/aqe-chaos.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `temp_agentic_qe/.claude/commands/aqe-execute.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `temp_agentic_qe/.claude/commands/aqe-execute.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/commands/aqe-execute.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `temp_agentic_qe/.claude/commands/aqe-fleet-status.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `temp_agentic_qe/.claude/commands/aqe-fleet-status.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/commands/aqe-fleet-status.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `temp_agentic_qe/.claude/commands/aqe-generate.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 1 pattern(s) found `temp_agentic_qe/.claude/commands/aqe-generate.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/commands/aqe-generate.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: requirements, acceptance criteria, success metric) `temp_agentic_qe/.claude/commands/aqe-optimize.md`
  💡 Add missing sections: requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 1 pattern(s) found `temp_agentic_qe/.claude/commands/aqe-optimize.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/commands/aqe-optimize.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `temp_agentic_qe/.claude/commands/aqe-report.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `temp_agentic_qe/.claude/commands/aqe-report.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/commands/aqe-report.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `temp_agentic_qe/.claude/commands/automation/README.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `temp_agentic_qe/.claude/commands/automation/README.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/commands/automation/README.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: objective, acceptance criteria, success metric) `temp_agentic_qe/.claude/commands/automation/auto-agent.md`
  💡 Add missing sections: objective, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `temp_agentic_qe/.claude/commands/automation/auto-agent.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/commands/automation/auto-agent.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `temp_agentic_qe/.claude/commands/automation/self-healing.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 1 pattern(s) found `temp_agentic_qe/.claude/commands/automation/self-healing.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/commands/automation/self-healing.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `temp_agentic_qe/.claude/commands/automation/session-memory.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `temp_agentic_qe/.claude/commands/automation/session-memory.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/commands/automation/session-memory.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `temp_agentic_qe/.claude/commands/automation/smart-agents.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `temp_agentic_qe/.claude/commands/automation/smart-agents.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/commands/automation/smart-agents.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `temp_agentic_qe/.claude/commands/automation/smart-spawn.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `temp_agentic_qe/.claude/commands/automation/smart-spawn.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/commands/automation/smart-spawn.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `temp_agentic_qe/.claude/commands/automation/workflow-select.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `temp_agentic_qe/.claude/commands/automation/workflow-select.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/commands/automation/workflow-select.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `temp_agentic_qe/.claude/commands/flow-nexus/app-store.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `temp_agentic_qe/.claude/commands/flow-nexus/app-store.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/commands/flow-nexus/app-store.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `temp_agentic_qe/.claude/commands/flow-nexus/challenges.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `temp_agentic_qe/.claude/commands/flow-nexus/challenges.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/commands/flow-nexus/challenges.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `temp_agentic_qe/.claude/commands/flow-nexus/login-registration.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `temp_agentic_qe/.claude/commands/flow-nexus/login-registration.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/commands/flow-nexus/login-registration.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `temp_agentic_qe/.claude/commands/flow-nexus/neural-network.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `temp_agentic_qe/.claude/commands/flow-nexus/neural-network.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/commands/flow-nexus/neural-network.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `temp_agentic_qe/.claude/commands/flow-nexus/payments.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `temp_agentic_qe/.claude/commands/flow-nexus/payments.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/commands/flow-nexus/payments.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `temp_agentic_qe/.claude/commands/flow-nexus/sandbox.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `temp_agentic_qe/.claude/commands/flow-nexus/sandbox.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/commands/flow-nexus/sandbox.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `temp_agentic_qe/.claude/commands/flow-nexus/swarm.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `temp_agentic_qe/.claude/commands/flow-nexus/swarm.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/commands/flow-nexus/swarm.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `temp_agentic_qe/.claude/commands/flow-nexus/user-tools.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `temp_agentic_qe/.claude/commands/flow-nexus/user-tools.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/commands/flow-nexus/user-tools.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `temp_agentic_qe/.claude/commands/flow-nexus/workflow.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `temp_agentic_qe/.claude/commands/flow-nexus/workflow.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/commands/flow-nexus/workflow.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `temp_agentic_qe/.claude/commands/github/README.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `temp_agentic_qe/.claude/commands/github/README.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/commands/github/README.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `temp_agentic_qe/.claude/commands/github/code-review-swarm.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 1 pattern(s) found `temp_agentic_qe/.claude/commands/github/code-review-swarm.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/commands/github/code-review-swarm.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `temp_agentic_qe/.claude/commands/github/code-review.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `temp_agentic_qe/.claude/commands/github/code-review.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/commands/github/code-review.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `temp_agentic_qe/.claude/commands/github/github-modes.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `temp_agentic_qe/.claude/commands/github/github-modes.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/commands/github/github-modes.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `temp_agentic_qe/.claude/commands/github/github-swarm.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `temp_agentic_qe/.claude/commands/github/github-swarm.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/commands/github/github-swarm.md`
- ❌ [WARNING] PRD has required sections: 2/4 sections present (missing: acceptance criteria, success metric) `temp_agentic_qe/.claude/commands/github/issue-tracker.md`
  💡 Add missing sections: acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 1 pattern(s) found `temp_agentic_qe/.claude/commands/github/issue-tracker.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/commands/github/issue-tracker.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `temp_agentic_qe/.claude/commands/github/issue-triage.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `temp_agentic_qe/.claude/commands/github/issue-triage.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/commands/github/issue-triage.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `temp_agentic_qe/.claude/commands/github/multi-repo-swarm.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `temp_agentic_qe/.claude/commands/github/multi-repo-swarm.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/commands/github/multi-repo-swarm.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `temp_agentic_qe/.claude/commands/github/pr-enhance.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `temp_agentic_qe/.claude/commands/github/pr-enhance.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/commands/github/pr-enhance.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `temp_agentic_qe/.claude/commands/github/pr-manager.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `temp_agentic_qe/.claude/commands/github/pr-manager.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/commands/github/pr-manager.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `temp_agentic_qe/.claude/commands/github/project-board-sync.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `temp_agentic_qe/.claude/commands/github/project-board-sync.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/commands/github/project-board-sync.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: objective, acceptance criteria, success metric) `temp_agentic_qe/.claude/commands/github/release-manager.md`
  💡 Add missing sections: objective, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 1 pattern(s) found `temp_agentic_qe/.claude/commands/github/release-manager.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/commands/github/release-manager.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `temp_agentic_qe/.claude/commands/github/release-swarm.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 3 pattern(s) found `temp_agentic_qe/.claude/commands/github/release-swarm.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/commands/github/release-swarm.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `temp_agentic_qe/.claude/commands/github/repo-analyze.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `temp_agentic_qe/.claude/commands/github/repo-analyze.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/commands/github/repo-analyze.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `temp_agentic_qe/.claude/commands/github/repo-architect.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `temp_agentic_qe/.claude/commands/github/repo-architect.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/commands/github/repo-architect.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: objective, requirements, success metric) `temp_agentic_qe/.claude/commands/github/swarm-issue.md`
  💡 Add missing sections: objective, requirements, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 1 pattern(s) found `temp_agentic_qe/.claude/commands/github/swarm-issue.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/commands/github/swarm-issue.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: objective, acceptance criteria, success metric) `temp_agentic_qe/.claude/commands/github/swarm-pr.md`
  💡 Add missing sections: objective, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `temp_agentic_qe/.claude/commands/github/swarm-pr.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/commands/github/swarm-pr.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: objective, acceptance criteria, success metric) `temp_agentic_qe/.claude/commands/github/sync-coordinator.md`
  💡 Add missing sections: objective, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `temp_agentic_qe/.claude/commands/github/sync-coordinator.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/commands/github/sync-coordinator.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `temp_agentic_qe/.claude/commands/github/workflow-automation.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 1 pattern(s) found `temp_agentic_qe/.claude/commands/github/workflow-automation.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/commands/github/workflow-automation.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `temp_agentic_qe/.claude/commands/hive-mind/README.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `temp_agentic_qe/.claude/commands/hive-mind/README.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/commands/hive-mind/README.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `temp_agentic_qe/.claude/commands/hive-mind/hive-mind-consensus.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `temp_agentic_qe/.claude/commands/hive-mind/hive-mind-consensus.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/commands/hive-mind/hive-mind-consensus.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `temp_agentic_qe/.claude/commands/hive-mind/hive-mind-init.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `temp_agentic_qe/.claude/commands/hive-mind/hive-mind-init.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/commands/hive-mind/hive-mind-init.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `temp_agentic_qe/.claude/commands/hive-mind/hive-mind-memory.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `temp_agentic_qe/.claude/commands/hive-mind/hive-mind-memory.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/commands/hive-mind/hive-mind-memory.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `temp_agentic_qe/.claude/commands/hive-mind/hive-mind-metrics.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `temp_agentic_qe/.claude/commands/hive-mind/hive-mind-metrics.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/commands/hive-mind/hive-mind-metrics.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `temp_agentic_qe/.claude/commands/hive-mind/hive-mind-resume.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `temp_agentic_qe/.claude/commands/hive-mind/hive-mind-resume.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/commands/hive-mind/hive-mind-resume.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `temp_agentic_qe/.claude/commands/hive-mind/hive-mind-sessions.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `temp_agentic_qe/.claude/commands/hive-mind/hive-mind-sessions.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/commands/hive-mind/hive-mind-sessions.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: requirements, acceptance criteria, success metric) `temp_agentic_qe/.claude/commands/hive-mind/hive-mind-spawn.md`
  💡 Add missing sections: requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `temp_agentic_qe/.claude/commands/hive-mind/hive-mind-spawn.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/commands/hive-mind/hive-mind-spawn.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `temp_agentic_qe/.claude/commands/hive-mind/hive-mind-status.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `temp_agentic_qe/.claude/commands/hive-mind/hive-mind-status.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/commands/hive-mind/hive-mind-status.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `temp_agentic_qe/.claude/commands/hive-mind/hive-mind-stop.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `temp_agentic_qe/.claude/commands/hive-mind/hive-mind-stop.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/commands/hive-mind/hive-mind-stop.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `temp_agentic_qe/.claude/commands/hive-mind/hive-mind-wizard.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `temp_agentic_qe/.claude/commands/hive-mind/hive-mind-wizard.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/commands/hive-mind/hive-mind-wizard.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `temp_agentic_qe/.claude/commands/hive-mind/hive-mind.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `temp_agentic_qe/.claude/commands/hive-mind/hive-mind.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/commands/hive-mind/hive-mind.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `temp_agentic_qe/.claude/commands/hooks/README.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `temp_agentic_qe/.claude/commands/hooks/README.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/commands/hooks/README.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: objective, acceptance criteria, success metric) `temp_agentic_qe/.claude/commands/hooks/overview.md`
  💡 Add missing sections: objective, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `temp_agentic_qe/.claude/commands/hooks/overview.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/commands/hooks/overview.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `temp_agentic_qe/.claude/commands/hooks/post-edit.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `temp_agentic_qe/.claude/commands/hooks/post-edit.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/commands/hooks/post-edit.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `temp_agentic_qe/.claude/commands/hooks/post-task.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `temp_agentic_qe/.claude/commands/hooks/post-task.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/commands/hooks/post-task.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `temp_agentic_qe/.claude/commands/hooks/pre-edit.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `temp_agentic_qe/.claude/commands/hooks/pre-edit.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/commands/hooks/pre-edit.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: objective, acceptance criteria, success metric) `temp_agentic_qe/.claude/commands/hooks/pre-task.md`
  💡 Add missing sections: objective, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `temp_agentic_qe/.claude/commands/hooks/pre-task.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/commands/hooks/pre-task.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `temp_agentic_qe/.claude/commands/hooks/session-end.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `temp_agentic_qe/.claude/commands/hooks/session-end.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/commands/hooks/session-end.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `temp_agentic_qe/.claude/commands/hooks/setup.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 1 pattern(s) found `temp_agentic_qe/.claude/commands/hooks/setup.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/commands/hooks/setup.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `temp_agentic_qe/.claude/commands/monitoring/README.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `temp_agentic_qe/.claude/commands/monitoring/README.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/commands/monitoring/README.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `temp_agentic_qe/.claude/commands/monitoring/agent-metrics.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `temp_agentic_qe/.claude/commands/monitoring/agent-metrics.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/commands/monitoring/agent-metrics.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `temp_agentic_qe/.claude/commands/monitoring/agents.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `temp_agentic_qe/.claude/commands/monitoring/agents.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/commands/monitoring/agents.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `temp_agentic_qe/.claude/commands/monitoring/real-time-view.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `temp_agentic_qe/.claude/commands/monitoring/real-time-view.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/commands/monitoring/real-time-view.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `temp_agentic_qe/.claude/commands/monitoring/status.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `temp_agentic_qe/.claude/commands/monitoring/status.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/commands/monitoring/status.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `temp_agentic_qe/.claude/commands/monitoring/swarm-monitor.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `temp_agentic_qe/.claude/commands/monitoring/swarm-monitor.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/commands/monitoring/swarm-monitor.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `temp_agentic_qe/.claude/commands/optimization/README.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `temp_agentic_qe/.claude/commands/optimization/README.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/commands/optimization/README.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: objective, acceptance criteria, success metric) `temp_agentic_qe/.claude/commands/optimization/auto-topology.md`
  💡 Add missing sections: objective, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `temp_agentic_qe/.claude/commands/optimization/auto-topology.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/commands/optimization/auto-topology.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `temp_agentic_qe/.claude/commands/optimization/cache-manage.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `temp_agentic_qe/.claude/commands/optimization/cache-manage.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/commands/optimization/cache-manage.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `temp_agentic_qe/.claude/commands/optimization/parallel-execute.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `temp_agentic_qe/.claude/commands/optimization/parallel-execute.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/commands/optimization/parallel-execute.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `temp_agentic_qe/.claude/commands/optimization/parallel-execution.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `temp_agentic_qe/.claude/commands/optimization/parallel-execution.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/commands/optimization/parallel-execution.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `temp_agentic_qe/.claude/commands/optimization/topology-optimize.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `temp_agentic_qe/.claude/commands/optimization/topology-optimize.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/commands/optimization/topology-optimize.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `temp_agentic_qe/.claude/commands/pair/commands.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `temp_agentic_qe/.claude/commands/pair/commands.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/commands/pair/commands.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `temp_agentic_qe/.claude/commands/pair/config.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `temp_agentic_qe/.claude/commands/pair/config.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/commands/pair/config.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `temp_agentic_qe/.claude/commands/pair/examples.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `temp_agentic_qe/.claude/commands/pair/examples.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/commands/pair/examples.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: objective, acceptance criteria, success metric) `temp_agentic_qe/.claude/commands/pair/modes.md`
  💡 Add missing sections: objective, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 1 pattern(s) found `temp_agentic_qe/.claude/commands/pair/modes.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/commands/pair/modes.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: requirements, acceptance criteria, success metric) `temp_agentic_qe/.claude/commands/pair/session.md`
  💡 Add missing sections: requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `temp_agentic_qe/.claude/commands/pair/session.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/commands/pair/session.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: requirements, acceptance criteria, success metric) `temp_agentic_qe/.claude/commands/pair/start.md`
  💡 Add missing sections: requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 1 pattern(s) found `temp_agentic_qe/.claude/commands/pair/start.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/commands/pair/start.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `temp_agentic_qe/.claude/commands/sparc/analyzer.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `temp_agentic_qe/.claude/commands/sparc/analyzer.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/commands/sparc/analyzer.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `temp_agentic_qe/.claude/commands/sparc/architect.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `temp_agentic_qe/.claude/commands/sparc/architect.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/commands/sparc/architect.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `temp_agentic_qe/.claude/commands/sparc/batch-executor.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `temp_agentic_qe/.claude/commands/sparc/batch-executor.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/commands/sparc/batch-executor.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `temp_agentic_qe/.claude/commands/sparc/coder.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `temp_agentic_qe/.claude/commands/sparc/coder.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/commands/sparc/coder.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `temp_agentic_qe/.claude/commands/sparc/debugger.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `temp_agentic_qe/.claude/commands/sparc/debugger.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/commands/sparc/debugger.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `temp_agentic_qe/.claude/commands/sparc/designer.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `temp_agentic_qe/.claude/commands/sparc/designer.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/commands/sparc/designer.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `temp_agentic_qe/.claude/commands/sparc/documenter.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `temp_agentic_qe/.claude/commands/sparc/documenter.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/commands/sparc/documenter.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `temp_agentic_qe/.claude/commands/sparc/innovator.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `temp_agentic_qe/.claude/commands/sparc/innovator.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/commands/sparc/innovator.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `temp_agentic_qe/.claude/commands/sparc/memory-manager.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `temp_agentic_qe/.claude/commands/sparc/memory-manager.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/commands/sparc/memory-manager.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `temp_agentic_qe/.claude/commands/sparc/optimizer.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `temp_agentic_qe/.claude/commands/sparc/optimizer.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/commands/sparc/optimizer.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `temp_agentic_qe/.claude/commands/sparc/orchestrator.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `temp_agentic_qe/.claude/commands/sparc/orchestrator.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/commands/sparc/orchestrator.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `temp_agentic_qe/.claude/commands/sparc/researcher.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `temp_agentic_qe/.claude/commands/sparc/researcher.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/commands/sparc/researcher.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `temp_agentic_qe/.claude/commands/sparc/reviewer.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `temp_agentic_qe/.claude/commands/sparc/reviewer.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/commands/sparc/reviewer.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `temp_agentic_qe/.claude/commands/sparc/sparc-modes.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `temp_agentic_qe/.claude/commands/sparc/sparc-modes.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/commands/sparc/sparc-modes.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `temp_agentic_qe/.claude/commands/sparc/swarm-coordinator.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `temp_agentic_qe/.claude/commands/sparc/swarm-coordinator.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/commands/sparc/swarm-coordinator.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `temp_agentic_qe/.claude/commands/sparc/tdd.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `temp_agentic_qe/.claude/commands/sparc/tdd.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/commands/sparc/tdd.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `temp_agentic_qe/.claude/commands/sparc/tester.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `temp_agentic_qe/.claude/commands/sparc/tester.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/commands/sparc/tester.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `temp_agentic_qe/.claude/commands/sparc/workflow-manager.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `temp_agentic_qe/.claude/commands/sparc/workflow-manager.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/commands/sparc/workflow-manager.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `temp_agentic_qe/.claude/commands/stream-chain/pipeline.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `temp_agentic_qe/.claude/commands/stream-chain/pipeline.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/commands/stream-chain/pipeline.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `temp_agentic_qe/.claude/commands/stream-chain/run.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 1 pattern(s) found `temp_agentic_qe/.claude/commands/stream-chain/run.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/commands/stream-chain/run.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `temp_agentic_qe/.claude/commands/swarm/README.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `temp_agentic_qe/.claude/commands/swarm/README.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/commands/swarm/README.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `temp_agentic_qe/.claude/commands/swarm/analysis.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `temp_agentic_qe/.claude/commands/swarm/analysis.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/commands/swarm/analysis.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `temp_agentic_qe/.claude/commands/swarm/development.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `temp_agentic_qe/.claude/commands/swarm/development.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/commands/swarm/development.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `temp_agentic_qe/.claude/commands/swarm/examples.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `temp_agentic_qe/.claude/commands/swarm/examples.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/commands/swarm/examples.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `temp_agentic_qe/.claude/commands/swarm/maintenance.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `temp_agentic_qe/.claude/commands/swarm/maintenance.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/commands/swarm/maintenance.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `temp_agentic_qe/.claude/commands/swarm/optimization.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `temp_agentic_qe/.claude/commands/swarm/optimization.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/commands/swarm/optimization.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `temp_agentic_qe/.claude/commands/swarm/research.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 1 pattern(s) found `temp_agentic_qe/.claude/commands/swarm/research.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/commands/swarm/research.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `temp_agentic_qe/.claude/commands/swarm/swarm-analysis.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `temp_agentic_qe/.claude/commands/swarm/swarm-analysis.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/commands/swarm/swarm-analysis.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `temp_agentic_qe/.claude/commands/swarm/swarm-background.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `temp_agentic_qe/.claude/commands/swarm/swarm-background.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/commands/swarm/swarm-background.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `temp_agentic_qe/.claude/commands/swarm/swarm-init.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `temp_agentic_qe/.claude/commands/swarm/swarm-init.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/commands/swarm/swarm-init.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `temp_agentic_qe/.claude/commands/swarm/swarm-modes.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `temp_agentic_qe/.claude/commands/swarm/swarm-modes.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/commands/swarm/swarm-modes.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `temp_agentic_qe/.claude/commands/swarm/swarm-monitor.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `temp_agentic_qe/.claude/commands/swarm/swarm-monitor.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/commands/swarm/swarm-monitor.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `temp_agentic_qe/.claude/commands/swarm/swarm-spawn.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `temp_agentic_qe/.claude/commands/swarm/swarm-spawn.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/commands/swarm/swarm-spawn.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `temp_agentic_qe/.claude/commands/swarm/swarm-status.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `temp_agentic_qe/.claude/commands/swarm/swarm-status.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/commands/swarm/swarm-status.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `temp_agentic_qe/.claude/commands/swarm/swarm-strategies.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `temp_agentic_qe/.claude/commands/swarm/swarm-strategies.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/commands/swarm/swarm-strategies.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: requirements, acceptance criteria, success metric) `temp_agentic_qe/.claude/commands/swarm/swarm.md`
  💡 Add missing sections: requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `temp_agentic_qe/.claude/commands/swarm/swarm.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/commands/swarm/swarm.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `temp_agentic_qe/.claude/commands/swarm/testing.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `temp_agentic_qe/.claude/commands/swarm/testing.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/commands/swarm/testing.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `temp_agentic_qe/.claude/commands/training/README.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `temp_agentic_qe/.claude/commands/training/README.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/commands/training/README.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `temp_agentic_qe/.claude/commands/training/model-update.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `temp_agentic_qe/.claude/commands/training/model-update.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/commands/training/model-update.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `temp_agentic_qe/.claude/commands/training/neural-patterns.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 1 pattern(s) found `temp_agentic_qe/.claude/commands/training/neural-patterns.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/commands/training/neural-patterns.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `temp_agentic_qe/.claude/commands/training/neural-train.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `temp_agentic_qe/.claude/commands/training/neural-train.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/commands/training/neural-train.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `temp_agentic_qe/.claude/commands/training/pattern-learn.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `temp_agentic_qe/.claude/commands/training/pattern-learn.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/commands/training/pattern-learn.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `temp_agentic_qe/.claude/commands/training/specialization.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `temp_agentic_qe/.claude/commands/training/specialization.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/commands/training/specialization.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `temp_agentic_qe/.claude/commands/truth/start.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 3 pattern(s) found `temp_agentic_qe/.claude/commands/truth/start.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/commands/truth/start.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `temp_agentic_qe/.claude/commands/verify/check.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `temp_agentic_qe/.claude/commands/verify/check.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/commands/verify/check.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `temp_agentic_qe/.claude/commands/verify/start.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `temp_agentic_qe/.claude/commands/verify/start.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/commands/verify/start.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `temp_agentic_qe/.claude/commands/workflows/README.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `temp_agentic_qe/.claude/commands/workflows/README.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/commands/workflows/README.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `temp_agentic_qe/.claude/commands/workflows/development.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `temp_agentic_qe/.claude/commands/workflows/development.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/commands/workflows/development.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `temp_agentic_qe/.claude/commands/workflows/research.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `temp_agentic_qe/.claude/commands/workflows/research.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/commands/workflows/research.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `temp_agentic_qe/.claude/commands/workflows/workflow-create.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `temp_agentic_qe/.claude/commands/workflows/workflow-create.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/commands/workflows/workflow-create.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `temp_agentic_qe/.claude/commands/workflows/workflow-execute.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `temp_agentic_qe/.claude/commands/workflows/workflow-execute.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/commands/workflows/workflow-execute.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `temp_agentic_qe/.claude/commands/workflows/workflow-export.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `temp_agentic_qe/.claude/commands/workflows/workflow-export.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/commands/workflows/workflow-export.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `temp_agentic_qe/.claude/skills/README.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `temp_agentic_qe/.claude/skills/README.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/skills/README.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: objective, acceptance criteria, success metric) `temp_agentic_qe/.claude/skills/accessibility-testing/SKILL.md`
  💡 Add missing sections: objective, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 3 pattern(s) found `temp_agentic_qe/.claude/skills/accessibility-testing/SKILL.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/skills/accessibility-testing/SKILL.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `temp_agentic_qe/.claude/skills/agentdb-advanced/SKILL.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `temp_agentic_qe/.claude/skills/agentdb-advanced/SKILL.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/skills/agentdb-advanced/SKILL.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `temp_agentic_qe/.claude/skills/agentdb-learning/SKILL.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `temp_agentic_qe/.claude/skills/agentdb-learning/SKILL.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/skills/agentdb-learning/SKILL.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `temp_agentic_qe/.claude/skills/agentdb-memory-patterns/SKILL.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `temp_agentic_qe/.claude/skills/agentdb-memory-patterns/SKILL.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/skills/agentdb-memory-patterns/SKILL.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `temp_agentic_qe/.claude/skills/agentdb-optimization/SKILL.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 3 pattern(s) found `temp_agentic_qe/.claude/skills/agentdb-optimization/SKILL.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/skills/agentdb-optimization/SKILL.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `temp_agentic_qe/.claude/skills/agentdb-vector-search/SKILL.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 1 pattern(s) found `temp_agentic_qe/.claude/skills/agentdb-vector-search/SKILL.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/skills/agentdb-vector-search/SKILL.md`
- ❌ [WARNING] PRD has required sections: 2/4 sections present (missing: objective, acceptance criteria) `temp_agentic_qe/.claude/skills/agentic-quality-engineering/SKILL.md`
  💡 Add missing sections: objective, acceptance criteria
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `temp_agentic_qe/.claude/skills/agentic-quality-engineering/SKILL.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/skills/agentic-quality-engineering/SKILL.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `temp_agentic_qe/.claude/skills/api-testing-patterns/SKILL.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `temp_agentic_qe/.claude/skills/api-testing-patterns/SKILL.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/skills/api-testing-patterns/SKILL.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: requirements, acceptance criteria, success metric) `temp_agentic_qe/.claude/skills/bug-reporting-excellence/SKILL.md`
  💡 Add missing sections: requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `temp_agentic_qe/.claude/skills/bug-reporting-excellence/SKILL.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/skills/bug-reporting-excellence/SKILL.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `temp_agentic_qe/.claude/skills/chaos-engineering-resilience/SKILL.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `temp_agentic_qe/.claude/skills/chaos-engineering-resilience/SKILL.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/skills/chaos-engineering-resilience/SKILL.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `temp_agentic_qe/.claude/skills/code-review-quality/SKILL.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 1 pattern(s) found `temp_agentic_qe/.claude/skills/code-review-quality/SKILL.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/skills/code-review-quality/SKILL.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `temp_agentic_qe/.claude/skills/compatibility-testing/SKILL.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `temp_agentic_qe/.claude/skills/compatibility-testing/SKILL.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/skills/compatibility-testing/SKILL.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: objective, acceptance criteria, success metric) `temp_agentic_qe/.claude/skills/compliance-testing/SKILL.md`
  💡 Add missing sections: objective, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `temp_agentic_qe/.claude/skills/compliance-testing/SKILL.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/skills/compliance-testing/SKILL.md`
- ❌ [WARNING] PRD has required sections: 3/4 sections present (missing: objective) `temp_agentic_qe/.claude/skills/consultancy-practices/SKILL.md`
  💡 Add missing sections: objective
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `temp_agentic_qe/.claude/skills/consultancy-practices/SKILL.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/skills/consultancy-practices/SKILL.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: objective, acceptance criteria, success metric) `temp_agentic_qe/.claude/skills/context-driven-testing/SKILL.md`
  💡 Add missing sections: objective, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `temp_agentic_qe/.claude/skills/context-driven-testing/SKILL.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/skills/context-driven-testing/SKILL.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `temp_agentic_qe/.claude/skills/contract-testing/SKILL.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 1 pattern(s) found `temp_agentic_qe/.claude/skills/contract-testing/SKILL.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/skills/contract-testing/SKILL.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `temp_agentic_qe/.claude/skills/database-testing/SKILL.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 1 pattern(s) found `temp_agentic_qe/.claude/skills/database-testing/SKILL.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/skills/database-testing/SKILL.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `temp_agentic_qe/.claude/skills/exploratory-testing-advanced/SKILL.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `temp_agentic_qe/.claude/skills/exploratory-testing-advanced/SKILL.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/skills/exploratory-testing-advanced/SKILL.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `temp_agentic_qe/.claude/skills/flow-nexus-neural/SKILL.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 1 pattern(s) found `temp_agentic_qe/.claude/skills/flow-nexus-neural/SKILL.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/skills/flow-nexus-neural/SKILL.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: objective, acceptance criteria, success metric) `temp_agentic_qe/.claude/skills/flow-nexus-platform/SKILL.md`
  💡 Add missing sections: objective, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `temp_agentic_qe/.claude/skills/flow-nexus-platform/SKILL.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/skills/flow-nexus-platform/SKILL.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: objective, acceptance criteria, success metric) `temp_agentic_qe/.claude/skills/flow-nexus-swarm/SKILL.md`
  💡 Add missing sections: objective, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 1 pattern(s) found `temp_agentic_qe/.claude/skills/flow-nexus-swarm/SKILL.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/skills/flow-nexus-swarm/SKILL.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: objective, acceptance criteria, success metric) `temp_agentic_qe/.claude/skills/github-code-review/SKILL.md`
  💡 Add missing sections: objective, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 1 pattern(s) found `temp_agentic_qe/.claude/skills/github-code-review/SKILL.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/skills/github-code-review/SKILL.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: objective, acceptance criteria, success metric) `temp_agentic_qe/.claude/skills/github-multi-repo/SKILL.md`
  💡 Add missing sections: objective, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `temp_agentic_qe/.claude/skills/github-multi-repo/SKILL.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/skills/github-multi-repo/SKILL.md`
- ❌ [WARNING] PRD has required sections: 3/4 sections present (missing: success metric) `temp_agentic_qe/.claude/skills/github-project-management/SKILL.md`
  💡 Add missing sections: success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 1 pattern(s) found `temp_agentic_qe/.claude/skills/github-project-management/SKILL.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/skills/github-project-management/SKILL.md`
- ❌ [WARNING] PRD has required sections: 2/4 sections present (missing: objective, acceptance criteria) `temp_agentic_qe/.claude/skills/github-release-management/SKILL.md`
  💡 Add missing sections: objective, acceptance criteria
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 3 pattern(s) found `temp_agentic_qe/.claude/skills/github-release-management/SKILL.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/skills/github-release-management/SKILL.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `temp_agentic_qe/.claude/skills/github-workflow-automation/SKILL.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 1 pattern(s) found `temp_agentic_qe/.claude/skills/github-workflow-automation/SKILL.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/skills/github-workflow-automation/SKILL.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: requirements, acceptance criteria, success metric) `temp_agentic_qe/.claude/skills/hive-mind-advanced/SKILL.md`
  💡 Add missing sections: requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `temp_agentic_qe/.claude/skills/hive-mind-advanced/SKILL.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/skills/hive-mind-advanced/SKILL.md`
- ❌ [WARNING] PRD has required sections: 2/4 sections present (missing: objective, success metric) `temp_agentic_qe/.claude/skills/holistic-testing-pact/SKILL.md`
  💡 Add missing sections: objective, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `temp_agentic_qe/.claude/skills/holistic-testing-pact/SKILL.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/skills/holistic-testing-pact/SKILL.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: objective, acceptance criteria, success metric) `temp_agentic_qe/.claude/skills/hooks-automation/SKILL.md`
  💡 Add missing sections: objective, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 3 pattern(s) found `temp_agentic_qe/.claude/skills/hooks-automation/SKILL.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/skills/hooks-automation/SKILL.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `temp_agentic_qe/.claude/skills/localization-testing/SKILL.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 1 pattern(s) found `temp_agentic_qe/.claude/skills/localization-testing/SKILL.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/skills/localization-testing/SKILL.md`
- ❌ [WARNING] PRD has required sections: 2/4 sections present (missing: acceptance criteria, success metric) `temp_agentic_qe/.claude/skills/mobile-testing/SKILL.md`
  💡 Add missing sections: acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `temp_agentic_qe/.claude/skills/mobile-testing/SKILL.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/skills/mobile-testing/SKILL.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `temp_agentic_qe/.claude/skills/mutation-testing/SKILL.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `temp_agentic_qe/.claude/skills/mutation-testing/SKILL.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/skills/mutation-testing/SKILL.md`
- ❌ [WARNING] PRD has required sections: 2/4 sections present (missing: acceptance criteria, success metric) `temp_agentic_qe/.claude/skills/pair-programming/SKILL.md`
  💡 Add missing sections: acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `temp_agentic_qe/.claude/skills/pair-programming/SKILL.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/skills/pair-programming/SKILL.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: objective, acceptance criteria, success metric) `temp_agentic_qe/.claude/skills/performance-analysis/SKILL.md`
  💡 Add missing sections: objective, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `temp_agentic_qe/.claude/skills/performance-analysis/SKILL.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/skills/performance-analysis/SKILL.md`
- ❌ [WARNING] PRD has required sections: 3/4 sections present (missing: success metric) `temp_agentic_qe/.claude/skills/performance-testing/SKILL.md`
  💡 Add missing sections: success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 3 pattern(s) found `temp_agentic_qe/.claude/skills/performance-testing/SKILL.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/skills/performance-testing/SKILL.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: objective, requirements, acceptance criteria) `temp_agentic_qe/.claude/skills/quality-metrics/SKILL.md`
  💡 Add missing sections: objective, requirements, acceptance criteria
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `temp_agentic_qe/.claude/skills/quality-metrics/SKILL.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/skills/quality-metrics/SKILL.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `temp_agentic_qe/.claude/skills/reasoningbank-agentdb/SKILL.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `temp_agentic_qe/.claude/skills/reasoningbank-agentdb/SKILL.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/skills/reasoningbank-agentdb/SKILL.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `temp_agentic_qe/.claude/skills/reasoningbank-intelligence/SKILL.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `temp_agentic_qe/.claude/skills/reasoningbank-intelligence/SKILL.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/skills/reasoningbank-intelligence/SKILL.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `temp_agentic_qe/.claude/skills/refactoring-patterns/SKILL.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `temp_agentic_qe/.claude/skills/refactoring-patterns/SKILL.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/skills/refactoring-patterns/SKILL.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `temp_agentic_qe/.claude/skills/regression-testing/SKILL.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 3 pattern(s) found `temp_agentic_qe/.claude/skills/regression-testing/SKILL.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/skills/regression-testing/SKILL.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: objective, acceptance criteria, success metric) `temp_agentic_qe/.claude/skills/risk-based-testing/SKILL.md`
  💡 Add missing sections: objective, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `temp_agentic_qe/.claude/skills/risk-based-testing/SKILL.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/skills/risk-based-testing/SKILL.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: objective, acceptance criteria, success metric) `temp_agentic_qe/.claude/skills/security-testing/SKILL.md`
  💡 Add missing sections: objective, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 1 pattern(s) found `temp_agentic_qe/.claude/skills/security-testing/SKILL.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/skills/security-testing/SKILL.md`
- ❌ [WARNING] PRD has required sections: 2/4 sections present (missing: objective, success metric) `temp_agentic_qe/.claude/skills/shift-left-testing/SKILL.md`
  💡 Add missing sections: objective, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `temp_agentic_qe/.claude/skills/shift-left-testing/SKILL.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/skills/shift-left-testing/SKILL.md`
- ❌ [WARNING] PRD has required sections: 2/4 sections present (missing: objective, acceptance criteria) `temp_agentic_qe/.claude/skills/shift-right-testing/SKILL.md`
  💡 Add missing sections: objective, acceptance criteria
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 3 pattern(s) found `temp_agentic_qe/.claude/skills/shift-right-testing/SKILL.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/skills/shift-right-testing/SKILL.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: objective, acceptance criteria, success metric) `temp_agentic_qe/.claude/skills/skill-builder/SKILL.md`
  💡 Add missing sections: objective, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 3 pattern(s) found `temp_agentic_qe/.claude/skills/skill-builder/SKILL.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/skills/skill-builder/SKILL.md`
- ❌ [WARNING] PRD has required sections: 2/4 sections present (missing: objective, acceptance criteria) `temp_agentic_qe/.claude/skills/sparc-methodology/SKILL.md`
  💡 Add missing sections: objective, acceptance criteria
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 3 pattern(s) found `temp_agentic_qe/.claude/skills/sparc-methodology/SKILL.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/skills/sparc-methodology/SKILL.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: objective, acceptance criteria, success metric) `temp_agentic_qe/.claude/skills/stream-chain/SKILL.md`
  💡 Add missing sections: objective, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `temp_agentic_qe/.claude/skills/stream-chain/SKILL.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/skills/stream-chain/SKILL.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: objective, acceptance criteria, success metric) `temp_agentic_qe/.claude/skills/swarm-advanced/SKILL.md`
  💡 Add missing sections: objective, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 1 pattern(s) found `temp_agentic_qe/.claude/skills/swarm-advanced/SKILL.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/skills/swarm-advanced/SKILL.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `temp_agentic_qe/.claude/skills/swarm-orchestration/SKILL.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 1 pattern(s) found `temp_agentic_qe/.claude/skills/swarm-orchestration/SKILL.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/skills/swarm-orchestration/SKILL.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: objective, acceptance criteria, success metric) `temp_agentic_qe/.claude/skills/tdd-london-chicago/SKILL.md`
  💡 Add missing sections: objective, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `temp_agentic_qe/.claude/skills/tdd-london-chicago/SKILL.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/skills/tdd-london-chicago/SKILL.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `temp_agentic_qe/.claude/skills/technical-writing/SKILL.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `temp_agentic_qe/.claude/skills/technical-writing/SKILL.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/skills/technical-writing/SKILL.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: objective, acceptance criteria, success metric) `temp_agentic_qe/.claude/skills/test-automation-strategy/SKILL.md`
  💡 Add missing sections: objective, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `temp_agentic_qe/.claude/skills/test-automation-strategy/SKILL.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/skills/test-automation-strategy/SKILL.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: objective, acceptance criteria, success metric) `temp_agentic_qe/.claude/skills/test-data-management/SKILL.md`
  💡 Add missing sections: objective, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `temp_agentic_qe/.claude/skills/test-data-management/SKILL.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/skills/test-data-management/SKILL.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `temp_agentic_qe/.claude/skills/test-design-techniques/SKILL.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `temp_agentic_qe/.claude/skills/test-design-techniques/SKILL.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/skills/test-design-techniques/SKILL.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `temp_agentic_qe/.claude/skills/test-environment-management/SKILL.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `temp_agentic_qe/.claude/skills/test-environment-management/SKILL.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/skills/test-environment-management/SKILL.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: objective, acceptance criteria, success metric) `temp_agentic_qe/.claude/skills/test-reporting-analytics/SKILL.md`
  💡 Add missing sections: objective, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `temp_agentic_qe/.claude/skills/test-reporting-analytics/SKILL.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/skills/test-reporting-analytics/SKILL.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `temp_agentic_qe/.claude/skills/verification-quality/SKILL.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 3 pattern(s) found `temp_agentic_qe/.claude/skills/verification-quality/SKILL.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/skills/verification-quality/SKILL.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `temp_agentic_qe/.claude/skills/visual-testing-advanced/SKILL.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `temp_agentic_qe/.claude/skills/visual-testing-advanced/SKILL.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/skills/visual-testing-advanced/SKILL.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: objective, acceptance criteria, success metric) `temp_agentic_qe/.claude/skills/xp-practices/SKILL.md`
  💡 Add missing sections: objective, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `temp_agentic_qe/.claude/skills/xp-practices/SKILL.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/.claude/skills/xp-practices/SKILL.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: objective, acceptance criteria, success metric) `temp_agentic_qe/CHANGELOG.md`
  💡 Add missing sections: objective, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `temp_agentic_qe/CHANGELOG.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/CHANGELOG.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: objective, acceptance criteria, success metric) `temp_agentic_qe/CLAUDE.md`
  💡 Add missing sections: objective, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `temp_agentic_qe/CLAUDE.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/CLAUDE.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: objective, acceptance criteria, success metric) `temp_agentic_qe/CONTRIBUTING.md`
  💡 Add missing sections: objective, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 3 pattern(s) found `temp_agentic_qe/CONTRIBUTING.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/CONTRIBUTING.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: objective, acceptance criteria, success metric) `temp_agentic_qe/PRE-PUBLISH-CHECKLIST.md`
  💡 Add missing sections: objective, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `temp_agentic_qe/PRE-PUBLISH-CHECKLIST.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/PRE-PUBLISH-CHECKLIST.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: objective, acceptance criteria, success metric) `temp_agentic_qe/README.md`
  💡 Add missing sections: objective, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `temp_agentic_qe/README.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/README.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: objective, acceptance criteria, success metric) `temp_agentic_qe/RELEASE-NOTES.md`
  💡 Add missing sections: objective, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `temp_agentic_qe/RELEASE-NOTES.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/RELEASE-NOTES.md`
- ❌ [WARNING] PRD has required sections: 2/4 sections present (missing: objective, acceptance criteria) `temp_agentic_qe/ROUTING_IMPLEMENTATION_REPORT.md`
  💡 Add missing sections: objective, acceptance criteria
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `temp_agentic_qe/ROUTING_IMPLEMENTATION_REPORT.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/ROUTING_IMPLEMENTATION_REPORT.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: objective, acceptance criteria, success metric) `temp_agentic_qe/SECURITY.md`
  💡 Add missing sections: objective, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `temp_agentic_qe/SECURITY.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/SECURITY.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: objective, acceptance criteria, success metric) `temp_agentic_qe/VALIDATION-SUMMARY.md`
  💡 Add missing sections: objective, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 3 pattern(s) found `temp_agentic_qe/VALIDATION-SUMMARY.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/VALIDATION-SUMMARY.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: objective, requirements, acceptance criteria) `temp_agentic_qe/docs/AgentDBManager-Implementation.md`
  💡 Add missing sections: objective, requirements, acceptance criteria
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `temp_agentic_qe/docs/AgentDBManager-Implementation.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/docs/AgentDBManager-Implementation.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `temp_agentic_qe/docs/INIT-LOGGING-BEFORE-AFTER.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `temp_agentic_qe/docs/INIT-LOGGING-BEFORE-AFTER.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/docs/INIT-LOGGING-BEFORE-AFTER.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `temp_agentic_qe/docs/PHASE2-FILE-STRUCTURE.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `temp_agentic_qe/docs/PHASE2-FILE-STRUCTURE.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/docs/PHASE2-FILE-STRUCTURE.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `temp_agentic_qe/docs/PHASE2-INTEGRATION-EXECUTIVE-SUMMARY.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `temp_agentic_qe/docs/PHASE2-INTEGRATION-EXECUTIVE-SUMMARY.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/docs/PHASE2-INTEGRATION-EXECUTIVE-SUMMARY.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `temp_agentic_qe/docs/PHASE2-INTEGRATION-TESTS-DELIVERED.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `temp_agentic_qe/docs/PHASE2-INTEGRATION-TESTS-DELIVERED.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/docs/PHASE2-INTEGRATION-TESTS-DELIVERED.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `temp_agentic_qe/docs/learning-system-integration-tests-report.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 3 pattern(s) found `temp_agentic_qe/docs/learning-system-integration-tests-report.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/docs/learning-system-integration-tests-report.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `temp_agentic_qe/security/SECURITY-REMEDIATION-REPORT.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `temp_agentic_qe/security/SECURITY-REMEDIATION-REPORT.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/security/SECURITY-REMEDIATION-REPORT.md`
- ❌ [WARNING] PRD has required sections: 2/4 sections present (missing: objective, acceptance criteria) `temp_agentic_qe/tests/COVERAGE_REMEDIATION_REPORT.md`
  💡 Add missing sections: objective, acceptance criteria
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `temp_agentic_qe/tests/COVERAGE_REMEDIATION_REPORT.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/tests/COVERAGE_REMEDIATION_REPORT.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `temp_agentic_qe/tests/PERFORMANCE_ANALYSIS_REPORT.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 1 pattern(s) found `temp_agentic_qe/tests/PERFORMANCE_ANALYSIS_REPORT.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/tests/PERFORMANCE_ANALYSIS_REPORT.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: objective, acceptance criteria, success metric) `temp_agentic_qe/tests/README.md`
  💡 Add missing sections: objective, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 1 pattern(s) found `temp_agentic_qe/tests/README.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/tests/README.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `temp_agentic_qe/tests/README_PHASE1.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 1 pattern(s) found `temp_agentic_qe/tests/README_PHASE1.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/tests/README_PHASE1.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: objective, acceptance criteria, success metric) `temp_agentic_qe/tests/disabled/until-implementations/README.md`
  💡 Add missing sections: objective, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 1 pattern(s) found `temp_agentic_qe/tests/disabled/until-implementations/README.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/tests/disabled/until-implementations/README.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `temp_agentic_qe/tests/docs/PHASE1_TESTS.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `temp_agentic_qe/tests/docs/PHASE1_TESTS.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/tests/docs/PHASE1_TESTS.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `temp_agentic_qe/tests/docs/PHASE1_TEST_SUMMARY.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `temp_agentic_qe/tests/docs/PHASE1_TEST_SUMMARY.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/tests/docs/PHASE1_TEST_SUMMARY.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `temp_agentic_qe/tests/docs/QUICK_START.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `temp_agentic_qe/tests/docs/QUICK_START.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/tests/docs/QUICK_START.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `temp_agentic_qe/tests/fixtures/agentdb/README.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `temp_agentic_qe/tests/fixtures/agentdb/README.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/tests/fixtures/agentdb/README.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `temp_agentic_qe/tests/fixtures/phase2-test-data/README.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `temp_agentic_qe/tests/fixtures/phase2-test-data/README.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/tests/fixtures/phase2-test-data/README.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `temp_agentic_qe/tests/integration/README.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `temp_agentic_qe/tests/integration/README.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/tests/integration/README.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: requirements, acceptance criteria, success metric) `temp_agentic_qe/tests/integration/agentdb/README.md`
  💡 Add missing sections: requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `temp_agentic_qe/tests/integration/agentdb/README.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/tests/integration/agentdb/README.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `temp_agentic_qe/tests/integration/phase1/README.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 2 pattern(s) found `temp_agentic_qe/tests/integration/phase1/README.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/tests/integration/phase1/README.md`
- ❌ [WARNING] PRD has required sections: 1/4 sections present (missing: objective, acceptance criteria, success metric) `temp_agentic_qe/tests/verification-report.md`
  💡 Add missing sections: objective, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 3 pattern(s) found `temp_agentic_qe/tests/verification-report.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `temp_agentic_qe/tests/verification-report.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `wsjf_activation_analysis.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ✅ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 3 pattern(s) found `wsjf_activation_analysis.md`
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `wsjf_activation_analysis.md`
- ❌ [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric) `wsjf_prompt_reindex.md`
  💡 Add missing sections: objective, requirements, acceptance criteria, success metric
- ❌ [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found `wsjf_prompt_reindex.md`
  💡 Add measurable criteria like '≥85% consensus' or 'response within 48 hours'
- ❌ [INFO] PRD defines DoR and DoD: DoR: ✗, DoD: ✗ `wsjf_prompt_reindex.md`

### ADR Checks

- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: status, context, consequences) `.agent.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `.agent.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `.agent.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `.hybrid-tunnel-config.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `.hybrid-tunnel-config.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `.hybrid-tunnel-config.md`
- ❌ [WARNING] ADR has required sections: 3/4 sections (missing: consequences) `ADAPTIVE_LEARNING_ANALYSIS_SUMMARY.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `ADAPTIVE_LEARNING_ANALYSIS_SUMMARY.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ✅ [INFO] ADR has date: Date present `ADAPTIVE_LEARNING_ANALYSIS_SUMMARY.md`
- ❌ [WARNING] ADR has required sections: 3/4 sections (missing: consequences) `ADAPTIVE_LEARNING_DOCUMENTS_INDEX.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `ADAPTIVE_LEARNING_DOCUMENTS_INDEX.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ✅ [INFO] ADR has date: Date present `ADAPTIVE_LEARNING_DOCUMENTS_INDEX.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `AFFILIATE_CONSOLIDATION_GREENFIELD_MIGRATION.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `AFFILIATE_CONSOLIDATION_GREENFIELD_MIGRATION.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ✅ [INFO] ADR has date: Date present `AFFILIATE_CONSOLIDATION_GREENFIELD_MIGRATION.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: context, consequences) `AFFILIATE_PRE_PI_SYNC_COMPLETE_PACKAGE.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `AFFILIATE_PRE_PI_SYNC_COMPLETE_PACKAGE.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ✅ [INFO] ADR has date: Date present `AFFILIATE_PRE_PI_SYNC_COMPLETE_PACKAGE.md`
- ❌ [WARNING] ADR has required sections: 3/4 sections (missing: consequences) `AFFILIATE_SYSTEMS_COMPREHENSIVE_PI_SYNC_REVIEW.md`
- ✅ [INFO] ADR has explicit status: Status: ACCEPTED `AFFILIATE_SYSTEMS_COMPREHENSIVE_PI_SYNC_REVIEW.md`
- ✅ [INFO] ADR has date: Date present `AFFILIATE_SYSTEMS_COMPREHENSIVE_PI_SYNC_REVIEW.md`
- ❌ [WARNING] ADR has required sections: 3/4 sections (missing: consequences) `AFFILIATE_SYSTEMS_RECURSIVE_ROAM_ANALYSIS_PRE_PI_SYNC.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `AFFILIATE_SYSTEMS_RECURSIVE_ROAM_ANALYSIS_PRE_PI_SYNC.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ✅ [INFO] ADR has date: Date present `AFFILIATE_SYSTEMS_RECURSIVE_ROAM_ANALYSIS_PRE_PI_SYNC.md`
- ❌ [WARNING] ADR has required sections: 3/4 sections (missing: consequences) `AGENTDB_ANALYSIS_INDEX.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `AGENTDB_ANALYSIS_INDEX.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `AGENTDB_ANALYSIS_INDEX.md`
- ❌ [WARNING] ADR has required sections: 3/4 sections (missing: consequences) `AGENTDB_HOOK_HEALTH_ASSESSMENT.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `AGENTDB_HOOK_HEALTH_ASSESSMENT.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `AGENTDB_HOOK_HEALTH_ASSESSMENT.md`
- ❌ [WARNING] ADR has required sections: 3/4 sections (missing: consequences) `AGENTDB_LEARNING_HOOKS_SUMMARY.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `AGENTDB_LEARNING_HOOKS_SUMMARY.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `AGENTDB_LEARNING_HOOKS_SUMMARY.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: decision, consequences) `AGENTIC_TRIBE_INTEGRATION_COMPLETE.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `AGENTIC_TRIBE_INTEGRATION_COMPLETE.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ✅ [INFO] ADR has date: Date present `AGENTIC_TRIBE_INTEGRATION_COMPLETE.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: status, decision, consequences) `AGENTS.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `AGENTS.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `AGENTS.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: context, consequences) `ANALYSIS_DOCUMENTS_INDEX.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `ANALYSIS_DOCUMENTS_INDEX.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ✅ [INFO] ADR has date: Date present `ANALYSIS_DOCUMENTS_INDEX.md`
- ❌ [WARNING] ADR has required sections: 3/4 sections (missing: consequences) `APPROVAL_FRAMEWORK_SUMMARY.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `APPROVAL_FRAMEWORK_SUMMARY.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `APPROVAL_FRAMEWORK_SUMMARY.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `BACKUP_LOCATIONS_REPORT.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `BACKUP_LOCATIONS_REPORT.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ✅ [INFO] ADR has date: Date present `BACKUP_LOCATIONS_REPORT.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: context, consequences) `BACKUP_REVIEW_RETRO.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `BACKUP_REVIEW_RETRO.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ✅ [INFO] ADR has date: Date present `BACKUP_REVIEW_RETRO.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: decision, consequences) `BEAM_DIMENSION_MAPPING_GUIDE.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `BEAM_DIMENSION_MAPPING_GUIDE.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ✅ [INFO] ADR has date: Date present `BEAM_DIMENSION_MAPPING_GUIDE.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: context, consequences) `BLOCKERS_RESOLVED.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `BLOCKERS_RESOLVED.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ✅ [INFO] ADR has date: Date present `BLOCKERS_RESOLVED.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `BLOCKER_001_CALIBRATION_IMPLEMENTATION_GUIDE.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `BLOCKER_001_CALIBRATION_IMPLEMENTATION_GUIDE.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `BLOCKER_001_CALIBRATION_IMPLEMENTATION_GUIDE.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `BLOCKER_003_IPMI_IMPLEMENTATION_GUIDE.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `BLOCKER_003_IPMI_IMPLEMENTATION_GUIDE.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `BLOCKER_003_IPMI_IMPLEMENTATION_GUIDE.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `BLOCKER_REMEDIATION_EXECUTION_ORCHESTRATION.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `BLOCKER_REMEDIATION_EXECUTION_ORCHESTRATION.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `BLOCKER_REMEDIATION_EXECUTION_ORCHESTRATION.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: context, consequences) `BLOCKER_REMEDIATION_INDEX.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `BLOCKER_REMEDIATION_INDEX.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ✅ [INFO] ADR has date: Date present `BLOCKER_REMEDIATION_INDEX.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `BLOCKER_REMEDIATION_SUMMARY.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `BLOCKER_REMEDIATION_SUMMARY.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ✅ [INFO] ADR has date: Date present `BLOCKER_REMEDIATION_SUMMARY.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `CAPABILITY_BACKLOG.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `CAPABILITY_BACKLOG.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `CAPABILITY_BACKLOG.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: status, decision, consequences) `CHANGELOG.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `CHANGELOG.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `CHANGELOG.md`
- ❌ [WARNING] ADR has required sections: 3/4 sections (missing: consequences) `CLAUDE_ENHANCED_BLOCKERS_RESOLVED.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `CLAUDE_ENHANCED_BLOCKERS_RESOLVED.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ✅ [INFO] ADR has date: Date present `CLAUDE_ENHANCED_BLOCKERS_RESOLVED.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: context, consequences) `CLAUDE_FLOW_INFRASTRUCTURE_SUMMARY.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `CLAUDE_FLOW_INFRASTRUCTURE_SUMMARY.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ✅ [INFO] ADR has date: Date present `CLAUDE_FLOW_INFRASTRUCTURE_SUMMARY.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `CLEANUP_STRATEGY_GUIDE.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `CLEANUP_STRATEGY_GUIDE.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `CLEANUP_STRATEGY_GUIDE.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `COMPLETE_EXECUTION_SUMMARY.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `COMPLETE_EXECUTION_SUMMARY.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ✅ [INFO] ADR has date: Date present `COMPLETE_EXECUTION_SUMMARY.md`
- ❌ [WARNING] ADR has required sections: 3/4 sections (missing: consequences) `COMPREHENSIVE_AGENTIC_ECOSYSTEM_ROADMAP.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `COMPREHENSIVE_AGENTIC_ECOSYSTEM_ROADMAP.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `COMPREHENSIVE_AGENTIC_ECOSYSTEM_ROADMAP.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: context, consequences) `COMPREHENSIVE_BLOCKER_REMEDIATION_STRATEGY.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `COMPREHENSIVE_BLOCKER_REMEDIATION_STRATEGY.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ✅ [INFO] ADR has date: Date present `COMPREHENSIVE_BLOCKER_REMEDIATION_STRATEGY.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `CONTRACT.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `CONTRACT.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `CONTRACT.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: context, consequences) `CRITICAL_BLOCKER_RESOLUTION_COMPLETE.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `CRITICAL_BLOCKER_RESOLUTION_COMPLETE.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ✅ [INFO] ADR has date: Date present `CRITICAL_BLOCKER_RESOLUTION_COMPLETE.md`
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
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: context, consequences) `DELIVERY_SUMMARY.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `DELIVERY_SUMMARY.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ✅ [INFO] ADR has date: Date present `DELIVERY_SUMMARY.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: context, consequences) `DEPLOYMENT_COMPLETE_FINAL.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `DEPLOYMENT_COMPLETE_FINAL.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ✅ [INFO] ADR has date: Date present `DEPLOYMENT_COMPLETE_FINAL.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: context, consequences) `DEPLOYMENT_EXECUTED.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `DEPLOYMENT_EXECUTED.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ✅ [INFO] ADR has date: Date present `DEPLOYMENT_EXECUTED.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: context, consequences) `DEPLOYMENT_EXECUTION_COMPLETE.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `DEPLOYMENT_EXECUTION_COMPLETE.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ✅ [INFO] ADR has date: Date present `DEPLOYMENT_EXECUTION_COMPLETE.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `DEPLOYMENT_INDEX.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `DEPLOYMENT_INDEX.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ✅ [INFO] ADR has date: Date present `DEPLOYMENT_INDEX.md`
- ❌ [WARNING] ADR has required sections: 3/4 sections (missing: consequences) `DEPLOYMENT_PR_SUMMARY.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `DEPLOYMENT_PR_SUMMARY.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `DEPLOYMENT_PR_SUMMARY.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: context, consequences) `DEPLOYMENT_PR_TEMPLATE.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `DEPLOYMENT_PR_TEMPLATE.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `DEPLOYMENT_PR_TEMPLATE.md`
- ❌ [WARNING] ADR has required sections: 3/4 sections (missing: consequences) `DEPLOYMENT_READINESS_SUMMARY.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `DEPLOYMENT_READINESS_SUMMARY.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `DEPLOYMENT_READINESS_SUMMARY.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `DPC_IMPLEMENTATION.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `DPC_IMPLEMENTATION.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `DPC_IMPLEMENTATION.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `EMAIL-VALIDATION-PIPELINE-COMPLETE.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `EMAIL-VALIDATION-PIPELINE-COMPLETE.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `EMAIL-VALIDATION-PIPELINE-COMPLETE.md`
- ❌ [WARNING] ADR has required sections: 3/4 sections (missing: consequences) `EXECUTIONCONTEXT_ENHANCEMENT_GUIDE.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `EXECUTIONCONTEXT_ENHANCEMENT_GUIDE.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `EXECUTIONCONTEXT_ENHANCEMENT_GUIDE.md`
- ❌ [WARNING] ADR has required sections: 3/4 sections (missing: consequences) `EXECUTIONCONTEXT_LEARNING_ENHANCEMENT.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `EXECUTIONCONTEXT_LEARNING_ENHANCEMENT.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ✅ [INFO] ADR has date: Date present `EXECUTIONCONTEXT_LEARNING_ENHANCEMENT.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `EXECUTION_INDEX.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `EXECUTION_INDEX.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ✅ [INFO] ADR has date: Date present `EXECUTION_INDEX.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: context, consequences) `EXECUTION_PLAN.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `EXECUTION_PLAN.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `EXECUTION_PLAN.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `EXECUTION_SUMMARY_20250129.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `EXECUTION_SUMMARY_20250129.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ✅ [INFO] ADR has date: Date present `EXECUTION_SUMMARY_20250129.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `EXECUTIVE_SUMMARY.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `EXECUTIVE_SUMMARY.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `EXECUTIVE_SUMMARY.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `FINAL_COMPREHENSIVE_SUMMARY.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `FINAL_COMPREHENSIVE_SUMMARY.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ✅ [INFO] ADR has date: Date present `FINAL_COMPREHENSIVE_SUMMARY.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `FINAL_DEPLOYMENT_SUMMARY.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `FINAL_DEPLOYMENT_SUMMARY.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ✅ [INFO] ADR has date: Date present `FINAL_DEPLOYMENT_SUMMARY.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: context, consequences) `FINAL_PI_SYNC_EXECUTION_REPORT.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `FINAL_PI_SYNC_EXECUTION_REPORT.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ✅ [INFO] ADR has date: Date present `FINAL_PI_SYNC_EXECUTION_REPORT.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `FINAL_STATUS.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `FINAL_STATUS.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ✅ [INFO] ADR has date: Date present `FINAL_STATUS.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: context, consequences) `GATES-ALL-PASS-FULL-AUTO-UNLOCKED.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `GATES-ALL-PASS-FULL-AUTO-UNLOCKED.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `GATES-ALL-PASS-FULL-AUTO-UNLOCKED.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: context, consequences) `GO_LIVE_COMPLETE.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `GO_LIVE_COMPLETE.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `GO_LIVE_COMPLETE.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `GO_LIVE_EXECUTION_PLAN.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `GO_LIVE_EXECUTION_PLAN.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `GO_LIVE_EXECUTION_PLAN.md`
- ❌ [WARNING] ADR has required sections: 3/4 sections (missing: consequences) `GO_LIVE_FINAL_AUTHORIZATION.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `GO_LIVE_FINAL_AUTHORIZATION.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `GO_LIVE_FINAL_AUTHORIZATION.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: decision, consequences) `HEALTH_ASSESSMENT_EXECUTIVE_SUMMARY.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `HEALTH_ASSESSMENT_EXECUTIVE_SUMMARY.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `HEALTH_ASSESSMENT_EXECUTIVE_SUMMARY.md`
- ❌ [WARNING] ADR has required sections: 3/4 sections (missing: consequences) `HEALTH_ASSESSMENT_INDEX.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `HEALTH_ASSESSMENT_INDEX.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `HEALTH_ASSESSMENT_INDEX.md`
- ❌ [WARNING] ADR has required sections: 3/4 sections (missing: consequences) `IMPLEMENTATION_COMPLETE.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `IMPLEMENTATION_COMPLETE.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ✅ [INFO] ADR has date: Date present `IMPLEMENTATION_COMPLETE.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `IMPLEMENTATION_STATUS.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `IMPLEMENTATION_STATUS.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `IMPLEMENTATION_STATUS.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: decision, consequences) `IMPLEMENTATION_SUMMARY.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `IMPLEMENTATION_SUMMARY.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `IMPLEMENTATION_SUMMARY.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `INBOX_ZERO_ROADMAP.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `INBOX_ZERO_ROADMAP.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `INBOX_ZERO_ROADMAP.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `INCREMENT.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `INCREMENT.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `INCREMENT.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: context, consequences) `INDEX.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `INDEX.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ✅ [INFO] ADR has date: Date present `INDEX.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `INFRASTRUCTURE_MAP.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `INFRASTRUCTURE_MAP.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ✅ [INFO] ADR has date: Date present `INFRASTRUCTURE_MAP.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: decision, consequences) `INTEGRATION_STATUS.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `INTEGRATION_STATUS.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `INTEGRATION_STATUS.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `INTEGRATION_SUMMARY.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `INTEGRATION_SUMMARY.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ✅ [INFO] ADR has date: Date present `INTEGRATION_SUMMARY.md`
- ❌ [WARNING] ADR has required sections: 3/4 sections (missing: consequences) `LEAN_AGENTIC_EXECUTION_ROADMAP.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `LEAN_AGENTIC_EXECUTION_ROADMAP.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ✅ [INFO] ADR has date: Date present `LEAN_AGENTIC_EXECUTION_ROADMAP.md`
- ❌ [WARNING] ADR has required sections: 3/4 sections (missing: consequences) `LEAN_AGENTIC_LEARNING_HOOKS_IMPLEMENTATION_PLAN.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `LEAN_AGENTIC_LEARNING_HOOKS_IMPLEMENTATION_PLAN.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ✅ [INFO] ADR has date: Date present `LEAN_AGENTIC_LEARNING_HOOKS_IMPLEMENTATION_PLAN.md`
- ❌ [WARNING] ADR has required sections: 3/4 sections (missing: consequences) `LEAN_AGENTIC_LEARNING_IMPLEMENTATION_INDEX.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `LEAN_AGENTIC_LEARNING_IMPLEMENTATION_INDEX.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ✅ [INFO] ADR has date: Date present `LEAN_AGENTIC_LEARNING_IMPLEMENTATION_INDEX.md`
- ❌ [WARNING] ADR has required sections: 3/4 sections (missing: consequences) `LEAN_AGENTIC_MASTER_INDEX.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `LEAN_AGENTIC_MASTER_INDEX.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ✅ [INFO] ADR has date: Date present `LEAN_AGENTIC_MASTER_INDEX.md`
- ❌ [WARNING] ADR has required sections: 3/4 sections (missing: consequences) `LEAN_INTEGRATION_ANALYSIS_INDEX.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `LEAN_INTEGRATION_ANALYSIS_INDEX.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ✅ [INFO] ADR has date: Date present `LEAN_INTEGRATION_ANALYSIS_INDEX.md`
- ❌ [WARNING] ADR has required sections: 3/4 sections (missing: consequences) `LEAN_INTEGRATION_DEPENDENCY_ANALYSIS_REFINED.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `LEAN_INTEGRATION_DEPENDENCY_ANALYSIS_REFINED.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ✅ [INFO] ADR has date: Date present `LEAN_INTEGRATION_DEPENDENCY_ANALYSIS_REFINED.md`
- ❌ [WARNING] ADR has required sections: 3/4 sections (missing: consequences) `LEAN_INTEGRATION_EXECUTION_SUMMARY.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `LEAN_INTEGRATION_EXECUTION_SUMMARY.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ✅ [INFO] ADR has date: Date present `LEAN_INTEGRATION_EXECUTION_SUMMARY.md`
- ❌ [WARNING] ADR has required sections: 3/4 sections (missing: consequences) `LEAN_INTEGRATION_IMMEDIATE_ACTION_ITEMS.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `LEAN_INTEGRATION_IMMEDIATE_ACTION_ITEMS.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ✅ [INFO] ADR has date: Date present `LEAN_INTEGRATION_IMMEDIATE_ACTION_ITEMS.md`
- ❌ [WARNING] ADR has required sections: 3/4 sections (missing: consequences) `LEAN_INTEGRATION_REFINEMENT_INDEX.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `LEAN_INTEGRATION_REFINEMENT_INDEX.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ✅ [INFO] ADR has date: Date present `LEAN_INTEGRATION_REFINEMENT_INDEX.md`
- ❌ [WARNING] ADR has required sections: 3/4 sections (missing: consequences) `LEAN_INTEGRATION_RISK_DEPENDENCY_ANALYSIS.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `LEAN_INTEGRATION_RISK_DEPENDENCY_ANALYSIS.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ✅ [INFO] ADR has date: Date present `LEAN_INTEGRATION_RISK_DEPENDENCY_ANALYSIS.md`
- ❌ [WARNING] ADR has required sections: 3/4 sections (missing: consequences) `LEAN_INTEGRATION_ROAM_RISK_ASSESSMENT.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `LEAN_INTEGRATION_ROAM_RISK_ASSESSMENT.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ✅ [INFO] ADR has date: Date present `LEAN_INTEGRATION_ROAM_RISK_ASSESSMENT.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: context, consequences) `LEAN_INTEGRATION_ROAM_RISK_REFINEMENT.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `LEAN_INTEGRATION_ROAM_RISK_REFINEMENT.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ✅ [INFO] ADR has date: Date present `LEAN_INTEGRATION_ROAM_RISK_REFINEMENT.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: context, consequences) `LEAN_INTEGRATION_STAKEHOLDER_BRIEF.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `LEAN_INTEGRATION_STAKEHOLDER_BRIEF.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ✅ [INFO] ADR has date: Date present `LEAN_INTEGRATION_STAKEHOLDER_BRIEF.md`
- ❌ [WARNING] ADR has required sections: 3/4 sections (missing: consequences) `LEGACY_AFFILIATE_RECURSIVE_REVIEW_PI_SYNC_CONSOLIDATED.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `LEGACY_AFFILIATE_RECURSIVE_REVIEW_PI_SYNC_CONSOLIDATED.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ✅ [INFO] ADR has date: Date present `LEGACY_AFFILIATE_RECURSIVE_REVIEW_PI_SYNC_CONSOLIDATED.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `LOCAL-CI-QUICK-REF.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `LOCAL-CI-QUICK-REF.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `LOCAL-CI-QUICK-REF.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: decision, consequences) `MASTER_EXECUTION_SUMMARY.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `MASTER_EXECUTION_SUMMARY.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ✅ [INFO] ADR has date: Date present `MASTER_EXECUTION_SUMMARY.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `METRICS_DB_INITIALIZATION_PATCH.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `METRICS_DB_INITIALIZATION_PATCH.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `METRICS_DB_INITIALIZATION_PATCH.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `MILESTONE_PHASE_GATE_IMPLEMENTATION_PLAN.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `MILESTONE_PHASE_GATE_IMPLEMENTATION_PLAN.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ✅ [INFO] ADR has date: Date present `MILESTONE_PHASE_GATE_IMPLEMENTATION_PLAN.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `MILESTONE_VALIDATION_COMPLETE.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `MILESTONE_VALIDATION_COMPLETE.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ✅ [INFO] ADR has date: Date present `MILESTONE_VALIDATION_COMPLETE.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: decision, consequences) `MULTI-WSJF-SWARM-QUICKSTART.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `MULTI-WSJF-SWARM-QUICKSTART.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `MULTI-WSJF-SWARM-QUICKSTART.md`
- ❌ [WARNING] ADR has required sections: 3/4 sections (missing: consequences) `MULTI_PHASE_IMPLEMENTATION_GUIDE.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `MULTI_PHASE_IMPLEMENTATION_GUIDE.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `MULTI_PHASE_IMPLEMENTATION_GUIDE.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `NEXT_ACTIONS.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `NEXT_ACTIONS.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `NEXT_ACTIONS.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `ORCHESTRATOR_ANALYSIS_SUMMARY.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `ORCHESTRATOR_ANALYSIS_SUMMARY.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ✅ [INFO] ADR has date: Date present `ORCHESTRATOR_ANALYSIS_SUMMARY.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: decision, consequences) `ORCHESTRATOR_COMPARISON.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `ORCHESTRATOR_COMPARISON.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `ORCHESTRATOR_COMPARISON.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `ORCHESTRATOR_DEDUPLICATION_ANALYSIS.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `ORCHESTRATOR_DEDUPLICATION_ANALYSIS.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ✅ [INFO] ADR has date: Date present `ORCHESTRATOR_DEDUPLICATION_ANALYSIS.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `ORCHESTRATOR_REFACTORING_GUIDE.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `ORCHESTRATOR_REFACTORING_GUIDE.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `ORCHESTRATOR_REFACTORING_GUIDE.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: context, consequences) `P0_PROGRESS_SUMMARY.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `P0_PROGRESS_SUMMARY.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ✅ [INFO] ADR has date: Date present `P0_PROGRESS_SUMMARY.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: decision, consequences) `PHASE1_COMPLETION_SUMMARY.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `PHASE1_COMPLETION_SUMMARY.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ✅ [INFO] ADR has date: Date present `PHASE1_COMPLETION_SUMMARY.md`
- ❌ [WARNING] ADR has required sections: 3/4 sections (missing: consequences) `PHASE_2_PERFORMANCE_HOOK_IMPLEMENTATION_REPORT.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `PHASE_2_PERFORMANCE_HOOK_IMPLEMENTATION_REPORT.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `PHASE_2_PERFORMANCE_HOOK_IMPLEMENTATION_REPORT.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `PHASE_3_CODE_CHANGES.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `PHASE_3_CODE_CHANGES.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ✅ [INFO] ADR has date: Date present `PHASE_3_CODE_CHANGES.md`
- ❌ [WARNING] ADR has required sections: 3/4 sections (missing: consequences) `PHASE_3_COMPLETION_SUMMARY.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `PHASE_3_COMPLETION_SUMMARY.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ✅ [INFO] ADR has date: Date present `PHASE_3_COMPLETION_SUMMARY.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: context, consequences) `PHASE_3_EXECUTION_INDEX.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `PHASE_3_EXECUTION_INDEX.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ✅ [INFO] ADR has date: Date present `PHASE_3_EXECUTION_INDEX.md`
- ❌ [WARNING] ADR has required sections: 3/4 sections (missing: consequences) `PHASE_3_EXECUTION_PLAN.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `PHASE_3_EXECUTION_PLAN.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ✅ [INFO] ADR has date: Date present `PHASE_3_EXECUTION_PLAN.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `PHASE_3_EXECUTION_REPORT.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `PHASE_3_EXECUTION_REPORT.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ✅ [INFO] ADR has date: Date present `PHASE_3_EXECUTION_REPORT.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: context, consequences) `PHASE_3_PRODUCTION_DEPLOYMENT.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `PHASE_3_PRODUCTION_DEPLOYMENT.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ✅ [INFO] ADR has date: Date present `PHASE_3_PRODUCTION_DEPLOYMENT.md`
- ❌ [WARNING] ADR has required sections: 3/4 sections (missing: consequences) `PHASE_3_STATUS_2025_10_25.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `PHASE_3_STATUS_2025_10_25.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ✅ [INFO] ADR has date: Date present `PHASE_3_STATUS_2025_10_25.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `PHASE_3_TEST_RESULTS.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `PHASE_3_TEST_RESULTS.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ✅ [INFO] ADR has date: Date present `PHASE_3_TEST_RESULTS.md`
- ❌ [WARNING] ADR has required sections: 3/4 sections (missing: consequences) `PHASE_4_DESIGN_INDEX.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `PHASE_4_DESIGN_INDEX.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ✅ [INFO] ADR has date: Date present `PHASE_4_DESIGN_INDEX.md`
- ❌ [WARNING] ADR has required sections: 3/4 sections (missing: consequences) `PHASE_4_DESIGN_SUMMARY.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `PHASE_4_DESIGN_SUMMARY.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ✅ [INFO] ADR has date: Date present `PHASE_4_DESIGN_SUMMARY.md`
- ❌ [WARNING] ADR has required sections: 3/4 sections (missing: consequences) `PHASE_4_EXECUTION_PLAN.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `PHASE_4_EXECUTION_PLAN.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ✅ [INFO] ADR has date: Date present `PHASE_4_EXECUTION_PLAN.md`
- ❌ [WARNING] ADR has required sections: 3/4 sections (missing: consequences) `PHASE_4_HOOKS_1_3_IMPLEMENTATION_GUIDE.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `PHASE_4_HOOKS_1_3_IMPLEMENTATION_GUIDE.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ✅ [INFO] ADR has date: Date present `PHASE_4_HOOKS_1_3_IMPLEMENTATION_GUIDE.md`
- ❌ [WARNING] ADR has required sections: 3/4 sections (missing: consequences) `PHASE_4_LEARNING_HOOKS_DESIGN_ANALYSIS.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `PHASE_4_LEARNING_HOOKS_DESIGN_ANALYSIS.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ✅ [INFO] ADR has date: Date present `PHASE_4_LEARNING_HOOKS_DESIGN_ANALYSIS.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `PHASE_GATE_IMPLEMENTATION_GUIDE.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `PHASE_GATE_IMPLEMENTATION_GUIDE.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `PHASE_GATE_IMPLEMENTATION_GUIDE.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: context, consequences) `PHASE_GATE_STATUS_ANALYSIS.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `PHASE_GATE_STATUS_ANALYSIS.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `PHASE_GATE_STATUS_ANALYSIS.md`
- ❌ [WARNING] ADR has required sections: 3/4 sections (missing: consequences) `PI_SYNC_COMPREHENSIVE_READINESS_REVIEW.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `PI_SYNC_COMPREHENSIVE_READINESS_REVIEW.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ✅ [INFO] ADR has date: Date present `PI_SYNC_COMPREHENSIVE_READINESS_REVIEW.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: context, consequences) `PI_SYNC_READINESS_WITH_AUTOMATION.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `PI_SYNC_READINESS_WITH_AUTOMATION.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ✅ [INFO] ADR has date: Date present `PI_SYNC_READINESS_WITH_AUTOMATION.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `PI_SYNC_ROAMING_RISKS.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `PI_SYNC_ROAMING_RISKS.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ✅ [INFO] ADR has date: Date present `PI_SYNC_ROAMING_RISKS.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: context, consequences) `PI_SYNC_VALIDATION_EXECUTIVE_SUMMARY.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `PI_SYNC_VALIDATION_EXECUTIVE_SUMMARY.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ✅ [INFO] ADR has date: Date present `PI_SYNC_VALIDATION_EXECUTIVE_SUMMARY.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: decision, consequences) `POST_LAUNCH_OPERATIONAL_STATUS.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `POST_LAUNCH_OPERATIONAL_STATUS.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `POST_LAUNCH_OPERATIONAL_STATUS.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `PR-DESCRIPTION.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `PR-DESCRIPTION.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `PR-DESCRIPTION.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `PRODUCTION_DEPLOYMENT_COMPLETE.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `PRODUCTION_DEPLOYMENT_COMPLETE.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ✅ [INFO] ADR has date: Date present `PRODUCTION_DEPLOYMENT_COMPLETE.md`
- ❌ [WARNING] ADR has required sections: 3/4 sections (missing: consequences) `PROJECT_STATUS_REPORT.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `PROJECT_STATUS_REPORT.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `PROJECT_STATUS_REPORT.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `PUSH-OPTIONS.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `PUSH-OPTIONS.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `PUSH-OPTIONS.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: decision, consequences) `README.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `README.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `README.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: context, consequences) `READY_FOR_DEPLOYMENT.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `READY_FOR_DEPLOYMENT.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ✅ [INFO] ADR has date: Date present `READY_FOR_DEPLOYMENT.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `RECURSIVE_LEGACY_CONSOLIDATION_PLAN.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `RECURSIVE_LEGACY_CONSOLIDATION_PLAN.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ✅ [INFO] ADR has date: Date present `RECURSIVE_LEGACY_CONSOLIDATION_PLAN.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: context, consequences) `RECURSIVE_REVIEW_RETRO.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `RECURSIVE_REVIEW_RETRO.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ✅ [INFO] ADR has date: Date present `RECURSIVE_REVIEW_RETRO.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `RESTRUCTURE_EXECUTION_PLAN.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `RESTRUCTURE_EXECUTION_PLAN.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `RESTRUCTURE_EXECUTION_PLAN.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `RESTRUCTURE_PLAN.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `RESTRUCTURE_PLAN.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `RESTRUCTURE_PLAN.md`
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
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: context, consequences) `SIGN_OFF_SUMMARY.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `SIGN_OFF_SUMMARY.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ✅ [INFO] ADR has date: Date present `SIGN_OFF_SUMMARY.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `STEP_BY_STEP_FIX_GUIDE.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `STEP_BY_STEP_FIX_GUIDE.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `STEP_BY_STEP_FIX_GUIDE.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `STX11_GREENFIELD_ARCHITECTURE.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `STX11_GREENFIELD_ARCHITECTURE.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `STX11_GREENFIELD_ARCHITECTURE.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `STX11_INTEGRATION_COMPLETE.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `STX11_INTEGRATION_COMPLETE.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `STX11_INTEGRATION_COMPLETE.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: context, consequences) `STX_11_PI_SYNC_GO_LIVE_ASSESSMENT.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `STX_11_PI_SYNC_GO_LIVE_ASSESSMENT.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `STX_11_PI_SYNC_GO_LIVE_ASSESSMENT.md`
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
- ❌ [WARNING] ADR has required sections: 3/4 sections (missing: consequences) `TIER1_LEARNING_HOOKS_IMPLEMENTATION.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `TIER1_LEARNING_HOOKS_IMPLEMENTATION.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ✅ [INFO] ADR has date: Date present `TIER1_LEARNING_HOOKS_IMPLEMENTATION.md`
- ❌ [WARNING] ADR has required sections: 3/4 sections (missing: consequences) `TONIGHT-DELIVERY-CHECKLIST.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `TONIGHT-DELIVERY-CHECKLIST.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `TONIGHT-DELIVERY-CHECKLIST.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `TONIGHT-QUICK-REF.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `TONIGHT-QUICK-REF.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `TONIGHT-QUICK-REF.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: decision, consequences) `TRACK_EXECUTION_PLAN.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `TRACK_EXECUTION_PLAN.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ✅ [INFO] ADR has date: Date present `TRACK_EXECUTION_PLAN.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `TRACK_EXECUTION_RESULTS.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `TRACK_EXECUTION_RESULTS.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ✅ [INFO] ADR has date: Date present `TRACK_EXECUTION_RESULTS.md`
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
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: context, consequences) `WSJF_ROAM_ANALYSIS_2026-01-22.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `WSJF_ROAM_ANALYSIS_2026-01-22.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ✅ [INFO] ADR has date: Date present `WSJF_ROAM_ANALYSIS_2026-01-22.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: context, consequences) `WSJF_TRIAL1_EXECUTION_PLAN.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `WSJF_TRIAL1_EXECUTION_PLAN.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `WSJF_TRIAL1_EXECUTION_PLAN.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `arxiv_research_integration.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `arxiv_research_integration.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `arxiv_research_integration.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: status, context, consequences) `backlog.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `backlog.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `backlog.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: context, consequences) `go_no_go_ledger.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `go_no_go_ledger.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ✅ [INFO] ADR has date: Date present `go_no_go_ledger.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: status, decision, consequences) `ide_configs.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `ide_configs.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `ide_configs.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: decision, consequences) `mcp_integrations_analysis.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `mcp_integrations_analysis.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `mcp_integrations_analysis.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: status, consequences) `research_paper_review.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `research_paper_review.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `research_paper_review.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: decision, consequences) `starlingx_integration.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `starlingx_integration.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `starlingx_integration.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: status, decision, consequences) `temp_agentic_qe/.claude/agents/analysis/code-analyzer.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/agents/analysis/code-analyzer.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/agents/analysis/code-analyzer.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: status, decision, consequences) `temp_agentic_qe/.claude/agents/analysis/code-review/analyze-code-quality.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/agents/analysis/code-review/analyze-code-quality.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/agents/analysis/code-review/analyze-code-quality.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: status, consequences) `temp_agentic_qe/.claude/agents/architecture/system-design/arch-system-design.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/agents/architecture/system-design/arch-system-design.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/agents/architecture/system-design/arch-system-design.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: status, decision, consequences) `temp_agentic_qe/.claude/agents/base-template-generator.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/agents/base-template-generator.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/agents/base-template-generator.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `temp_agentic_qe/.claude/agents/consensus/byzantine-coordinator.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/agents/consensus/byzantine-coordinator.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/agents/consensus/byzantine-coordinator.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `temp_agentic_qe/.claude/agents/consensus/crdt-synchronizer.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/agents/consensus/crdt-synchronizer.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/agents/consensus/crdt-synchronizer.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `temp_agentic_qe/.claude/agents/consensus/gossip-coordinator.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/agents/consensus/gossip-coordinator.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/agents/consensus/gossip-coordinator.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `temp_agentic_qe/.claude/agents/consensus/performance-benchmarker.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/agents/consensus/performance-benchmarker.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/agents/consensus/performance-benchmarker.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: decision, consequences) `temp_agentic_qe/.claude/agents/consensus/quorum-manager.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/agents/consensus/quorum-manager.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/agents/consensus/quorum-manager.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `temp_agentic_qe/.claude/agents/consensus/raft-manager.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/agents/consensus/raft-manager.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/agents/consensus/raft-manager.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `temp_agentic_qe/.claude/agents/consensus/security-manager.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/agents/consensus/security-manager.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/agents/consensus/security-manager.md`
- ❌ [WARNING] ADR has required sections: 3/4 sections (missing: consequences) `temp_agentic_qe/.claude/agents/core/coder.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/agents/core/coder.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/agents/core/coder.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: context, consequences) `temp_agentic_qe/.claude/agents/core/planner.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/agents/core/planner.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/agents/core/planner.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: decision, consequences) `temp_agentic_qe/.claude/agents/core/researcher.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/agents/core/researcher.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/agents/core/researcher.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: decision, consequences) `temp_agentic_qe/.claude/agents/core/reviewer.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/agents/core/reviewer.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/agents/core/reviewer.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `temp_agentic_qe/.claude/agents/core/tester.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/agents/core/tester.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/agents/core/tester.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: status, decision, consequences) `temp_agentic_qe/.claude/agents/data/ml/data-ml-model.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/agents/data/ml/data-ml-model.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/agents/data/ml/data-ml-model.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: decision, consequences) `temp_agentic_qe/.claude/agents/development/backend/dev-backend-api.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/agents/development/backend/dev-backend-api.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/agents/development/backend/dev-backend-api.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: status, decision, consequences) `temp_agentic_qe/.claude/agents/devops/ci-cd/ops-cicd-github.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/agents/devops/ci-cd/ops-cicd-github.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/agents/devops/ci-cd/ops-cicd-github.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: status, decision, consequences) `temp_agentic_qe/.claude/agents/documentation/api-docs/docs-api-openapi.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/agents/documentation/api-docs/docs-api-openapi.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/agents/documentation/api-docs/docs-api-openapi.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `temp_agentic_qe/.claude/agents/flow-nexus/app-store.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/agents/flow-nexus/app-store.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/agents/flow-nexus/app-store.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `temp_agentic_qe/.claude/agents/flow-nexus/authentication.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/agents/flow-nexus/authentication.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/agents/flow-nexus/authentication.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `temp_agentic_qe/.claude/agents/flow-nexus/challenges.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/agents/flow-nexus/challenges.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/agents/flow-nexus/challenges.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `temp_agentic_qe/.claude/agents/flow-nexus/neural-network.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/agents/flow-nexus/neural-network.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/agents/flow-nexus/neural-network.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `temp_agentic_qe/.claude/agents/flow-nexus/payments.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/agents/flow-nexus/payments.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/agents/flow-nexus/payments.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `temp_agentic_qe/.claude/agents/flow-nexus/sandbox.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/agents/flow-nexus/sandbox.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/agents/flow-nexus/sandbox.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `temp_agentic_qe/.claude/agents/flow-nexus/swarm.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/agents/flow-nexus/swarm.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/agents/flow-nexus/swarm.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: context, consequences) `temp_agentic_qe/.claude/agents/flow-nexus/user-tools.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/agents/flow-nexus/user-tools.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/agents/flow-nexus/user-tools.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: context, consequences) `temp_agentic_qe/.claude/agents/flow-nexus/workflow.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/agents/flow-nexus/workflow.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/agents/flow-nexus/workflow.md`
- ❌ [WARNING] ADR has required sections: 3/4 sections (missing: decision) `temp_agentic_qe/.claude/agents/github/code-review-swarm.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/agents/github/code-review-swarm.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/agents/github/code-review-swarm.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `temp_agentic_qe/.claude/agents/github/github-modes.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/agents/github/github-modes.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/agents/github/github-modes.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: decision, consequences) `temp_agentic_qe/.claude/agents/github/issue-tracker.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/agents/github/issue-tracker.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/agents/github/issue-tracker.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: decision, consequences) `temp_agentic_qe/.claude/agents/github/multi-repo-swarm.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/agents/github/multi-repo-swarm.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/agents/github/multi-repo-swarm.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `temp_agentic_qe/.claude/agents/github/pr-manager.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/agents/github/pr-manager.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/agents/github/pr-manager.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `temp_agentic_qe/.claude/agents/github/project-board-sync.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/agents/github/project-board-sync.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/agents/github/project-board-sync.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `temp_agentic_qe/.claude/agents/github/release-manager.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/agents/github/release-manager.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/agents/github/release-manager.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `temp_agentic_qe/.claude/agents/github/release-swarm.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/agents/github/release-swarm.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/agents/github/release-swarm.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: context, consequences) `temp_agentic_qe/.claude/agents/github/repo-architect.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/agents/github/repo-architect.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/agents/github/repo-architect.md`
- ❌ [WARNING] ADR has required sections: 3/4 sections (missing: consequences) `temp_agentic_qe/.claude/agents/github/swarm-issue.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/agents/github/swarm-issue.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/agents/github/swarm-issue.md`
- ❌ [WARNING] ADR has required sections: 3/4 sections (missing: consequences) `temp_agentic_qe/.claude/agents/github/swarm-pr.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/agents/github/swarm-pr.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/agents/github/swarm-pr.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: decision, consequences) `temp_agentic_qe/.claude/agents/github/sync-coordinator.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/agents/github/sync-coordinator.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/agents/github/sync-coordinator.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: status, decision, consequences) `temp_agentic_qe/.claude/agents/github/workflow-automation.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/agents/github/workflow-automation.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/agents/github/workflow-automation.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: status, decision, consequences) `temp_agentic_qe/.claude/agents/goal/code-goal-planner.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/agents/goal/code-goal-planner.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/agents/goal/code-goal-planner.md`
- ❌ [WARNING] ADR has required sections: 3/4 sections (missing: consequences) `temp_agentic_qe/.claude/agents/goal/goal-planner.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/agents/goal/goal-planner.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/agents/goal/goal-planner.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: context, consequences) `temp_agentic_qe/.claude/agents/hive-mind/collective-intelligence-coordinator.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/agents/hive-mind/collective-intelligence-coordinator.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/agents/hive-mind/collective-intelligence-coordinator.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: context, consequences) `temp_agentic_qe/.claude/agents/hive-mind/queen-coordinator.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/agents/hive-mind/queen-coordinator.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/agents/hive-mind/queen-coordinator.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: context, consequences) `temp_agentic_qe/.claude/agents/hive-mind/scout-explorer.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/agents/hive-mind/scout-explorer.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/agents/hive-mind/scout-explorer.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: context, consequences) `temp_agentic_qe/.claude/agents/hive-mind/swarm-memory-manager.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/agents/hive-mind/swarm-memory-manager.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/agents/hive-mind/swarm-memory-manager.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: context, consequences) `temp_agentic_qe/.claude/agents/hive-mind/worker-specialist.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/agents/hive-mind/worker-specialist.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/agents/hive-mind/worker-specialist.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: status, decision, consequences) `temp_agentic_qe/.claude/agents/neural/safla-neural.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/agents/neural/safla-neural.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/agents/neural/safla-neural.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: context, consequences) `temp_agentic_qe/.claude/agents/optimization/benchmark-suite.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/agents/optimization/benchmark-suite.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/agents/optimization/benchmark-suite.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: context, consequences) `temp_agentic_qe/.claude/agents/optimization/load-balancer.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/agents/optimization/load-balancer.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/agents/optimization/load-balancer.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: context, consequences) `temp_agentic_qe/.claude/agents/optimization/performance-monitor.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/agents/optimization/performance-monitor.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/agents/optimization/performance-monitor.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: context, consequences) `temp_agentic_qe/.claude/agents/optimization/resource-allocator.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/agents/optimization/resource-allocator.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/agents/optimization/resource-allocator.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: context, consequences) `temp_agentic_qe/.claude/agents/optimization/topology-optimizer.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/agents/optimization/topology-optimizer.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/agents/optimization/topology-optimizer.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: decision, consequences) `temp_agentic_qe/.claude/agents/qe-api-contract-validator.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/agents/qe-api-contract-validator.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/agents/qe-api-contract-validator.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: decision, consequences) `temp_agentic_qe/.claude/agents/qe-chaos-engineer.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/agents/qe-chaos-engineer.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/agents/qe-chaos-engineer.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: status, decision, consequences) `temp_agentic_qe/.claude/agents/qe-coverage-analyzer.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/agents/qe-coverage-analyzer.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/agents/qe-coverage-analyzer.md`
- ❌ [WARNING] ADR has required sections: 3/4 sections (missing: consequences) `temp_agentic_qe/.claude/agents/qe-deployment-readiness.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/agents/qe-deployment-readiness.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ✅ [INFO] ADR has date: Date present `temp_agentic_qe/.claude/agents/qe-deployment-readiness.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: decision, consequences) `temp_agentic_qe/.claude/agents/qe-flaky-test-hunter.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/agents/qe-flaky-test-hunter.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ✅ [INFO] ADR has date: Date present `temp_agentic_qe/.claude/agents/qe-flaky-test-hunter.md`
- ❌ [WARNING] ADR has required sections: 3/4 sections (missing: consequences) `temp_agentic_qe/.claude/agents/qe-fleet-commander.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/agents/qe-fleet-commander.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/agents/qe-fleet-commander.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: decision, consequences) `temp_agentic_qe/.claude/agents/qe-performance-tester.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/agents/qe-performance-tester.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/agents/qe-performance-tester.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: decision, consequences) `temp_agentic_qe/.claude/agents/qe-production-intelligence.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/agents/qe-production-intelligence.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/agents/qe-production-intelligence.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: decision, consequences) `temp_agentic_qe/.claude/agents/qe-quality-analyzer.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/agents/qe-quality-analyzer.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/agents/qe-quality-analyzer.md`
- ❌ [WARNING] ADR has required sections: 3/4 sections (missing: consequences) `temp_agentic_qe/.claude/agents/qe-quality-gate.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/agents/qe-quality-gate.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/agents/qe-quality-gate.md`
- ❌ [WARNING] ADR has required sections: 3/4 sections (missing: consequences) `temp_agentic_qe/.claude/agents/qe-regression-risk-analyzer.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/agents/qe-regression-risk-analyzer.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/agents/qe-regression-risk-analyzer.md`
- ❌ [WARNING] ADR has required sections: 3/4 sections (missing: consequences) `temp_agentic_qe/.claude/agents/qe-requirements-validator.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/agents/qe-requirements-validator.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/agents/qe-requirements-validator.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: decision, consequences) `temp_agentic_qe/.claude/agents/qe-security-scanner.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/agents/qe-security-scanner.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/agents/qe-security-scanner.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `temp_agentic_qe/.claude/agents/qe-test-data-architect.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/agents/qe-test-data-architect.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ✅ [INFO] ADR has date: Date present `temp_agentic_qe/.claude/agents/qe-test-data-architect.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: decision, consequences) `temp_agentic_qe/.claude/agents/qe-test-executor.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/agents/qe-test-executor.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/agents/qe-test-executor.md`
- ❌ [WARNING] ADR has required sections: 3/4 sections (missing: consequences) `temp_agentic_qe/.claude/agents/qe-test-generator.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/agents/qe-test-generator.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/agents/qe-test-generator.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: decision, consequences) `temp_agentic_qe/.claude/agents/qe-visual-tester.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/agents/qe-visual-tester.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/agents/qe-visual-tester.md`
- ❌ [WARNING] ADR has required sections: 3/4 sections (missing: consequences) `temp_agentic_qe/.claude/agents/reasoning/agent.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/agents/reasoning/agent.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/agents/reasoning/agent.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `temp_agentic_qe/.claude/agents/reasoning/goal-planner.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/agents/reasoning/goal-planner.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/agents/reasoning/goal-planner.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: context, consequences) `temp_agentic_qe/.claude/agents/sparc/architecture.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/agents/sparc/architecture.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/agents/sparc/architecture.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: status, decision, consequences) `temp_agentic_qe/.claude/agents/sparc/pseudocode.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/agents/sparc/pseudocode.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/agents/sparc/pseudocode.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `temp_agentic_qe/.claude/agents/sparc/refinement.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/agents/sparc/refinement.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/agents/sparc/refinement.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `temp_agentic_qe/.claude/agents/sparc/specification.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/agents/sparc/specification.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/agents/sparc/specification.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: status, decision, consequences) `temp_agentic_qe/.claude/agents/specialized/mobile/spec-mobile-react-native.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/agents/specialized/mobile/spec-mobile-react-native.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/agents/specialized/mobile/spec-mobile-react-native.md`
- ❌ [WARNING] ADR has required sections: 3/4 sections (missing: consequences) `temp_agentic_qe/.claude/agents/swarm/adaptive-coordinator.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/agents/swarm/adaptive-coordinator.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/agents/swarm/adaptive-coordinator.md`
- ❌ [WARNING] ADR has required sections: 3/4 sections (missing: consequences) `temp_agentic_qe/.claude/agents/swarm/hierarchical-coordinator.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/agents/swarm/hierarchical-coordinator.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/agents/swarm/hierarchical-coordinator.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: context, consequences) `temp_agentic_qe/.claude/agents/swarm/mesh-coordinator.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/agents/swarm/mesh-coordinator.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/agents/swarm/mesh-coordinator.md`
- ❌ [WARNING] ADR has required sections: 3/4 sections (missing: consequences) `temp_agentic_qe/.claude/agents/templates/automation-smart-agent.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/agents/templates/automation-smart-agent.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/agents/templates/automation-smart-agent.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `temp_agentic_qe/.claude/agents/templates/coordinator-swarm-init.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/agents/templates/coordinator-swarm-init.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/agents/templates/coordinator-swarm-init.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `temp_agentic_qe/.claude/agents/templates/github-pr-manager.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/agents/templates/github-pr-manager.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/agents/templates/github-pr-manager.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `temp_agentic_qe/.claude/agents/templates/implementer-sparc-coder.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/agents/templates/implementer-sparc-coder.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/agents/templates/implementer-sparc-coder.md`
- ❌ [WARNING] ADR has required sections: 3/4 sections (missing: consequences) `temp_agentic_qe/.claude/agents/templates/memory-coordinator.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/agents/templates/memory-coordinator.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/agents/templates/memory-coordinator.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: decision, consequences) `temp_agentic_qe/.claude/agents/templates/migration-plan.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/agents/templates/migration-plan.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/agents/templates/migration-plan.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `temp_agentic_qe/.claude/agents/templates/orchestrator-task.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/agents/templates/orchestrator-task.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/agents/templates/orchestrator-task.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: status, context, consequences) `temp_agentic_qe/.claude/agents/templates/performance-analyzer.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/agents/templates/performance-analyzer.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/agents/templates/performance-analyzer.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: status, context, consequences) `temp_agentic_qe/.claude/agents/templates/sparc-coordinator.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/agents/templates/sparc-coordinator.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/agents/templates/sparc-coordinator.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: status, context, consequences) `temp_agentic_qe/.claude/agents/testing/unit/tdd-london-swarm.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/agents/testing/unit/tdd-london-swarm.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/agents/testing/unit/tdd-london-swarm.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `temp_agentic_qe/.claude/agents/testing/validation/production-validator.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/agents/testing/validation/production-validator.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/agents/testing/validation/production-validator.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `temp_agentic_qe/.claude/commands/README.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/commands/README.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ✅ [INFO] ADR has date: Date present `temp_agentic_qe/.claude/commands/README.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `temp_agentic_qe/.claude/commands/agents/README.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/commands/agents/README.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/commands/agents/README.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `temp_agentic_qe/.claude/commands/agents/agent-capabilities.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/commands/agents/agent-capabilities.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/commands/agents/agent-capabilities.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `temp_agentic_qe/.claude/commands/agents/agent-coordination.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/commands/agents/agent-coordination.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/commands/agents/agent-coordination.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `temp_agentic_qe/.claude/commands/agents/agent-spawning.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/commands/agents/agent-spawning.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/commands/agents/agent-spawning.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `temp_agentic_qe/.claude/commands/agents/agent-types.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/commands/agents/agent-types.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/commands/agents/agent-types.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: decision, consequences) `temp_agentic_qe/.claude/commands/analysis/COMMAND_COMPLIANCE_REPORT.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/commands/analysis/COMMAND_COMPLIANCE_REPORT.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/commands/analysis/COMMAND_COMPLIANCE_REPORT.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `temp_agentic_qe/.claude/commands/analysis/README.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/commands/analysis/README.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/commands/analysis/README.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `temp_agentic_qe/.claude/commands/analysis/bottleneck-detect.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/commands/analysis/bottleneck-detect.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/commands/analysis/bottleneck-detect.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `temp_agentic_qe/.claude/commands/analysis/performance-bottlenecks.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/commands/analysis/performance-bottlenecks.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/commands/analysis/performance-bottlenecks.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `temp_agentic_qe/.claude/commands/analysis/performance-report.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/commands/analysis/performance-report.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/commands/analysis/performance-report.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: status, decision, consequences) `temp_agentic_qe/.claude/commands/analysis/token-efficiency.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/commands/analysis/token-efficiency.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/commands/analysis/token-efficiency.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `temp_agentic_qe/.claude/commands/analysis/token-usage.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/commands/analysis/token-usage.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/commands/analysis/token-usage.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `temp_agentic_qe/.claude/commands/aqe-analyze.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/commands/aqe-analyze.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/commands/aqe-analyze.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `temp_agentic_qe/.claude/commands/aqe-benchmark.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/commands/aqe-benchmark.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/commands/aqe-benchmark.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `temp_agentic_qe/.claude/commands/aqe-chaos.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/commands/aqe-chaos.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/commands/aqe-chaos.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `temp_agentic_qe/.claude/commands/aqe-execute.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/commands/aqe-execute.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/commands/aqe-execute.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `temp_agentic_qe/.claude/commands/aqe-fleet-status.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/commands/aqe-fleet-status.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/commands/aqe-fleet-status.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `temp_agentic_qe/.claude/commands/aqe-generate.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/commands/aqe-generate.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/commands/aqe-generate.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `temp_agentic_qe/.claude/commands/aqe-optimize.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/commands/aqe-optimize.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/commands/aqe-optimize.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `temp_agentic_qe/.claude/commands/aqe-report.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/commands/aqe-report.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/commands/aqe-report.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `temp_agentic_qe/.claude/commands/automation/README.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/commands/automation/README.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/commands/automation/README.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: status, context, consequences) `temp_agentic_qe/.claude/commands/automation/auto-agent.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/commands/automation/auto-agent.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/commands/automation/auto-agent.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `temp_agentic_qe/.claude/commands/automation/self-healing.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/commands/automation/self-healing.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/commands/automation/self-healing.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: status, decision, consequences) `temp_agentic_qe/.claude/commands/automation/session-memory.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/commands/automation/session-memory.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/commands/automation/session-memory.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `temp_agentic_qe/.claude/commands/automation/smart-agents.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/commands/automation/smart-agents.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/commands/automation/smart-agents.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `temp_agentic_qe/.claude/commands/automation/smart-spawn.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/commands/automation/smart-spawn.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/commands/automation/smart-spawn.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `temp_agentic_qe/.claude/commands/automation/workflow-select.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/commands/automation/workflow-select.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/commands/automation/workflow-select.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `temp_agentic_qe/.claude/commands/flow-nexus/app-store.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/commands/flow-nexus/app-store.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/commands/flow-nexus/app-store.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `temp_agentic_qe/.claude/commands/flow-nexus/challenges.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/commands/flow-nexus/challenges.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/commands/flow-nexus/challenges.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `temp_agentic_qe/.claude/commands/flow-nexus/login-registration.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/commands/flow-nexus/login-registration.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/commands/flow-nexus/login-registration.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `temp_agentic_qe/.claude/commands/flow-nexus/neural-network.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/commands/flow-nexus/neural-network.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/commands/flow-nexus/neural-network.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `temp_agentic_qe/.claude/commands/flow-nexus/payments.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/commands/flow-nexus/payments.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/commands/flow-nexus/payments.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `temp_agentic_qe/.claude/commands/flow-nexus/sandbox.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/commands/flow-nexus/sandbox.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/commands/flow-nexus/sandbox.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `temp_agentic_qe/.claude/commands/flow-nexus/swarm.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/commands/flow-nexus/swarm.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/commands/flow-nexus/swarm.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `temp_agentic_qe/.claude/commands/flow-nexus/user-tools.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/commands/flow-nexus/user-tools.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/commands/flow-nexus/user-tools.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `temp_agentic_qe/.claude/commands/flow-nexus/workflow.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/commands/flow-nexus/workflow.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/commands/flow-nexus/workflow.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `temp_agentic_qe/.claude/commands/github/README.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/commands/github/README.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/commands/github/README.md`
- ❌ [WARNING] ADR has required sections: 3/4 sections (missing: decision) `temp_agentic_qe/.claude/commands/github/code-review-swarm.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/commands/github/code-review-swarm.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/commands/github/code-review-swarm.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `temp_agentic_qe/.claude/commands/github/code-review.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/commands/github/code-review.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/commands/github/code-review.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `temp_agentic_qe/.claude/commands/github/github-modes.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/commands/github/github-modes.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/commands/github/github-modes.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `temp_agentic_qe/.claude/commands/github/github-swarm.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/commands/github/github-swarm.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/commands/github/github-swarm.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: decision, consequences) `temp_agentic_qe/.claude/commands/github/issue-tracker.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/commands/github/issue-tracker.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/commands/github/issue-tracker.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `temp_agentic_qe/.claude/commands/github/issue-triage.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/commands/github/issue-triage.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/commands/github/issue-triage.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: decision, consequences) `temp_agentic_qe/.claude/commands/github/multi-repo-swarm.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/commands/github/multi-repo-swarm.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/commands/github/multi-repo-swarm.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `temp_agentic_qe/.claude/commands/github/pr-enhance.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/commands/github/pr-enhance.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/commands/github/pr-enhance.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `temp_agentic_qe/.claude/commands/github/pr-manager.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/commands/github/pr-manager.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/commands/github/pr-manager.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `temp_agentic_qe/.claude/commands/github/project-board-sync.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/commands/github/project-board-sync.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/commands/github/project-board-sync.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `temp_agentic_qe/.claude/commands/github/release-manager.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/commands/github/release-manager.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/commands/github/release-manager.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `temp_agentic_qe/.claude/commands/github/release-swarm.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/commands/github/release-swarm.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/commands/github/release-swarm.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `temp_agentic_qe/.claude/commands/github/repo-analyze.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/commands/github/repo-analyze.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/commands/github/repo-analyze.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: context, consequences) `temp_agentic_qe/.claude/commands/github/repo-architect.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/commands/github/repo-architect.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/commands/github/repo-architect.md`
- ❌ [WARNING] ADR has required sections: 3/4 sections (missing: consequences) `temp_agentic_qe/.claude/commands/github/swarm-issue.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/commands/github/swarm-issue.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/commands/github/swarm-issue.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: decision, consequences) `temp_agentic_qe/.claude/commands/github/swarm-pr.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/commands/github/swarm-pr.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/commands/github/swarm-pr.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `temp_agentic_qe/.claude/commands/github/sync-coordinator.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/commands/github/sync-coordinator.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/commands/github/sync-coordinator.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `temp_agentic_qe/.claude/commands/github/workflow-automation.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/commands/github/workflow-automation.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/commands/github/workflow-automation.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `temp_agentic_qe/.claude/commands/hive-mind/README.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/commands/hive-mind/README.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/commands/hive-mind/README.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `temp_agentic_qe/.claude/commands/hive-mind/hive-mind-consensus.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/commands/hive-mind/hive-mind-consensus.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/commands/hive-mind/hive-mind-consensus.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `temp_agentic_qe/.claude/commands/hive-mind/hive-mind-init.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/commands/hive-mind/hive-mind-init.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/commands/hive-mind/hive-mind-init.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `temp_agentic_qe/.claude/commands/hive-mind/hive-mind-memory.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/commands/hive-mind/hive-mind-memory.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/commands/hive-mind/hive-mind-memory.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `temp_agentic_qe/.claude/commands/hive-mind/hive-mind-metrics.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/commands/hive-mind/hive-mind-metrics.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/commands/hive-mind/hive-mind-metrics.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `temp_agentic_qe/.claude/commands/hive-mind/hive-mind-resume.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/commands/hive-mind/hive-mind-resume.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/commands/hive-mind/hive-mind-resume.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `temp_agentic_qe/.claude/commands/hive-mind/hive-mind-sessions.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/commands/hive-mind/hive-mind-sessions.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/commands/hive-mind/hive-mind-sessions.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `temp_agentic_qe/.claude/commands/hive-mind/hive-mind-spawn.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/commands/hive-mind/hive-mind-spawn.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/commands/hive-mind/hive-mind-spawn.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `temp_agentic_qe/.claude/commands/hive-mind/hive-mind-status.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/commands/hive-mind/hive-mind-status.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/commands/hive-mind/hive-mind-status.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `temp_agentic_qe/.claude/commands/hive-mind/hive-mind-stop.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/commands/hive-mind/hive-mind-stop.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/commands/hive-mind/hive-mind-stop.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `temp_agentic_qe/.claude/commands/hive-mind/hive-mind-wizard.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/commands/hive-mind/hive-mind-wizard.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/commands/hive-mind/hive-mind-wizard.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `temp_agentic_qe/.claude/commands/hive-mind/hive-mind.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/commands/hive-mind/hive-mind.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/commands/hive-mind/hive-mind.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `temp_agentic_qe/.claude/commands/hooks/README.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/commands/hooks/README.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/commands/hooks/README.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `temp_agentic_qe/.claude/commands/hooks/overview.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/commands/hooks/overview.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/commands/hooks/overview.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: status, consequences) `temp_agentic_qe/.claude/commands/hooks/post-edit.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/commands/hooks/post-edit.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/commands/hooks/post-edit.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: status, context, consequences) `temp_agentic_qe/.claude/commands/hooks/post-task.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/commands/hooks/post-task.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/commands/hooks/post-task.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `temp_agentic_qe/.claude/commands/hooks/pre-edit.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/commands/hooks/pre-edit.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/commands/hooks/pre-edit.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: status, consequences) `temp_agentic_qe/.claude/commands/hooks/pre-task.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/commands/hooks/pre-task.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/commands/hooks/pre-task.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: status, consequences) `temp_agentic_qe/.claude/commands/hooks/session-end.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/commands/hooks/session-end.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/commands/hooks/session-end.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: status, consequences) `temp_agentic_qe/.claude/commands/hooks/setup.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/commands/hooks/setup.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/commands/hooks/setup.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `temp_agentic_qe/.claude/commands/monitoring/README.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/commands/monitoring/README.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/commands/monitoring/README.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `temp_agentic_qe/.claude/commands/monitoring/agent-metrics.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/commands/monitoring/agent-metrics.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/commands/monitoring/agent-metrics.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `temp_agentic_qe/.claude/commands/monitoring/agents.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/commands/monitoring/agents.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/commands/monitoring/agents.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `temp_agentic_qe/.claude/commands/monitoring/real-time-view.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/commands/monitoring/real-time-view.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/commands/monitoring/real-time-view.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `temp_agentic_qe/.claude/commands/monitoring/status.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/commands/monitoring/status.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/commands/monitoring/status.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `temp_agentic_qe/.claude/commands/monitoring/swarm-monitor.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/commands/monitoring/swarm-monitor.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/commands/monitoring/swarm-monitor.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `temp_agentic_qe/.claude/commands/optimization/README.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/commands/optimization/README.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/commands/optimization/README.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `temp_agentic_qe/.claude/commands/optimization/auto-topology.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/commands/optimization/auto-topology.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/commands/optimization/auto-topology.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `temp_agentic_qe/.claude/commands/optimization/cache-manage.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/commands/optimization/cache-manage.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/commands/optimization/cache-manage.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `temp_agentic_qe/.claude/commands/optimization/parallel-execute.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/commands/optimization/parallel-execute.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/commands/optimization/parallel-execute.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `temp_agentic_qe/.claude/commands/optimization/parallel-execution.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/commands/optimization/parallel-execution.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/commands/optimization/parallel-execution.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `temp_agentic_qe/.claude/commands/optimization/topology-optimize.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/commands/optimization/topology-optimize.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/commands/optimization/topology-optimize.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `temp_agentic_qe/.claude/commands/pair/commands.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/commands/pair/commands.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/commands/pair/commands.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: status, decision, consequences) `temp_agentic_qe/.claude/commands/pair/config.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/commands/pair/config.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/commands/pair/config.md`
- ❌ [WARNING] ADR has required sections: 3/4 sections (missing: consequences) `temp_agentic_qe/.claude/commands/pair/examples.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/commands/pair/examples.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/commands/pair/examples.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: status, consequences) `temp_agentic_qe/.claude/commands/pair/modes.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/commands/pair/modes.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/commands/pair/modes.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `temp_agentic_qe/.claude/commands/pair/session.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/commands/pair/session.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/commands/pair/session.md`
- ❌ [WARNING] ADR has required sections: 3/4 sections (missing: consequences) `temp_agentic_qe/.claude/commands/pair/start.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/commands/pair/start.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/commands/pair/start.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `temp_agentic_qe/.claude/commands/sparc/analyzer.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/commands/sparc/analyzer.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/commands/sparc/analyzer.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: status, context, consequences) `temp_agentic_qe/.claude/commands/sparc/architect.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/commands/sparc/architect.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/commands/sparc/architect.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `temp_agentic_qe/.claude/commands/sparc/batch-executor.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/commands/sparc/batch-executor.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/commands/sparc/batch-executor.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `temp_agentic_qe/.claude/commands/sparc/coder.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/commands/sparc/coder.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/commands/sparc/coder.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `temp_agentic_qe/.claude/commands/sparc/debugger.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/commands/sparc/debugger.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/commands/sparc/debugger.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: status, context, consequences) `temp_agentic_qe/.claude/commands/sparc/designer.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/commands/sparc/designer.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/commands/sparc/designer.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `temp_agentic_qe/.claude/commands/sparc/documenter.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/commands/sparc/documenter.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/commands/sparc/documenter.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: status, decision, consequences) `temp_agentic_qe/.claude/commands/sparc/innovator.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/commands/sparc/innovator.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/commands/sparc/innovator.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: status, decision, consequences) `temp_agentic_qe/.claude/commands/sparc/memory-manager.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/commands/sparc/memory-manager.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/commands/sparc/memory-manager.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `temp_agentic_qe/.claude/commands/sparc/optimizer.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/commands/sparc/optimizer.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/commands/sparc/optimizer.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `temp_agentic_qe/.claude/commands/sparc/orchestrator.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/commands/sparc/orchestrator.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/commands/sparc/orchestrator.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `temp_agentic_qe/.claude/commands/sparc/researcher.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/commands/sparc/researcher.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/commands/sparc/researcher.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `temp_agentic_qe/.claude/commands/sparc/reviewer.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/commands/sparc/reviewer.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/commands/sparc/reviewer.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `temp_agentic_qe/.claude/commands/sparc/sparc-modes.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/commands/sparc/sparc-modes.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/commands/sparc/sparc-modes.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `temp_agentic_qe/.claude/commands/sparc/swarm-coordinator.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/commands/sparc/swarm-coordinator.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/commands/sparc/swarm-coordinator.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `temp_agentic_qe/.claude/commands/sparc/tdd.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/commands/sparc/tdd.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/commands/sparc/tdd.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `temp_agentic_qe/.claude/commands/sparc/tester.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/commands/sparc/tester.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/commands/sparc/tester.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `temp_agentic_qe/.claude/commands/sparc/workflow-manager.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/commands/sparc/workflow-manager.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/commands/sparc/workflow-manager.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `temp_agentic_qe/.claude/commands/stream-chain/pipeline.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/commands/stream-chain/pipeline.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/commands/stream-chain/pipeline.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: status, decision, consequences) `temp_agentic_qe/.claude/commands/stream-chain/run.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/commands/stream-chain/run.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/commands/stream-chain/run.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `temp_agentic_qe/.claude/commands/swarm/README.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/commands/swarm/README.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/commands/swarm/README.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `temp_agentic_qe/.claude/commands/swarm/analysis.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/commands/swarm/analysis.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/commands/swarm/analysis.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `temp_agentic_qe/.claude/commands/swarm/development.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/commands/swarm/development.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/commands/swarm/development.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `temp_agentic_qe/.claude/commands/swarm/examples.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/commands/swarm/examples.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/commands/swarm/examples.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `temp_agentic_qe/.claude/commands/swarm/maintenance.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/commands/swarm/maintenance.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/commands/swarm/maintenance.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `temp_agentic_qe/.claude/commands/swarm/optimization.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/commands/swarm/optimization.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/commands/swarm/optimization.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `temp_agentic_qe/.claude/commands/swarm/research.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/commands/swarm/research.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/commands/swarm/research.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `temp_agentic_qe/.claude/commands/swarm/swarm-analysis.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/commands/swarm/swarm-analysis.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/commands/swarm/swarm-analysis.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `temp_agentic_qe/.claude/commands/swarm/swarm-background.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/commands/swarm/swarm-background.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/commands/swarm/swarm-background.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `temp_agentic_qe/.claude/commands/swarm/swarm-init.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/commands/swarm/swarm-init.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/commands/swarm/swarm-init.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `temp_agentic_qe/.claude/commands/swarm/swarm-modes.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/commands/swarm/swarm-modes.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/commands/swarm/swarm-modes.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `temp_agentic_qe/.claude/commands/swarm/swarm-monitor.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/commands/swarm/swarm-monitor.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/commands/swarm/swarm-monitor.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `temp_agentic_qe/.claude/commands/swarm/swarm-spawn.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/commands/swarm/swarm-spawn.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/commands/swarm/swarm-spawn.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `temp_agentic_qe/.claude/commands/swarm/swarm-status.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/commands/swarm/swarm-status.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/commands/swarm/swarm-status.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `temp_agentic_qe/.claude/commands/swarm/swarm-strategies.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/commands/swarm/swarm-strategies.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/commands/swarm/swarm-strategies.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `temp_agentic_qe/.claude/commands/swarm/swarm.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/commands/swarm/swarm.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/commands/swarm/swarm.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `temp_agentic_qe/.claude/commands/swarm/testing.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/commands/swarm/testing.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/commands/swarm/testing.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `temp_agentic_qe/.claude/commands/training/README.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/commands/training/README.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/commands/training/README.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `temp_agentic_qe/.claude/commands/training/model-update.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/commands/training/model-update.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/commands/training/model-update.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `temp_agentic_qe/.claude/commands/training/neural-patterns.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/commands/training/neural-patterns.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/commands/training/neural-patterns.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `temp_agentic_qe/.claude/commands/training/neural-train.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/commands/training/neural-train.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/commands/training/neural-train.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `temp_agentic_qe/.claude/commands/training/pattern-learn.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/commands/training/pattern-learn.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/commands/training/pattern-learn.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `temp_agentic_qe/.claude/commands/training/specialization.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/commands/training/specialization.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/commands/training/specialization.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `temp_agentic_qe/.claude/commands/truth/start.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/commands/truth/start.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/commands/truth/start.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `temp_agentic_qe/.claude/commands/verify/check.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/commands/verify/check.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/commands/verify/check.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `temp_agentic_qe/.claude/commands/verify/start.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/commands/verify/start.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/commands/verify/start.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `temp_agentic_qe/.claude/commands/workflows/README.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/commands/workflows/README.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/commands/workflows/README.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `temp_agentic_qe/.claude/commands/workflows/development.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/commands/workflows/development.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/commands/workflows/development.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `temp_agentic_qe/.claude/commands/workflows/research.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/commands/workflows/research.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/commands/workflows/research.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `temp_agentic_qe/.claude/commands/workflows/workflow-create.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/commands/workflows/workflow-create.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/commands/workflows/workflow-create.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `temp_agentic_qe/.claude/commands/workflows/workflow-execute.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/commands/workflows/workflow-execute.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/commands/workflows/workflow-execute.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `temp_agentic_qe/.claude/commands/workflows/workflow-export.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/commands/workflows/workflow-export.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/commands/workflows/workflow-export.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: status, decision, consequences) `temp_agentic_qe/.claude/skills/README.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/skills/README.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/skills/README.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `temp_agentic_qe/.claude/skills/accessibility-testing/SKILL.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/skills/accessibility-testing/SKILL.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/skills/accessibility-testing/SKILL.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: status, decision, consequences) `temp_agentic_qe/.claude/skills/agentdb-advanced/SKILL.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/skills/agentdb-advanced/SKILL.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/skills/agentdb-advanced/SKILL.md`
- ❌ [WARNING] ADR has required sections: 3/4 sections (missing: consequences) `temp_agentic_qe/.claude/skills/agentdb-learning/SKILL.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/skills/agentdb-learning/SKILL.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/skills/agentdb-learning/SKILL.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: status, consequences) `temp_agentic_qe/.claude/skills/agentdb-memory-patterns/SKILL.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/skills/agentdb-memory-patterns/SKILL.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/skills/agentdb-memory-patterns/SKILL.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `temp_agentic_qe/.claude/skills/agentdb-optimization/SKILL.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/skills/agentdb-optimization/SKILL.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/skills/agentdb-optimization/SKILL.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: decision, consequences) `temp_agentic_qe/.claude/skills/agentdb-vector-search/SKILL.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/skills/agentdb-vector-search/SKILL.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/skills/agentdb-vector-search/SKILL.md`
- ❌ [WARNING] ADR has required sections: 3/4 sections (missing: consequences) `temp_agentic_qe/.claude/skills/agentic-quality-engineering/SKILL.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/skills/agentic-quality-engineering/SKILL.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/skills/agentic-quality-engineering/SKILL.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `temp_agentic_qe/.claude/skills/api-testing-patterns/SKILL.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/skills/api-testing-patterns/SKILL.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/skills/api-testing-patterns/SKILL.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: decision, consequences) `temp_agentic_qe/.claude/skills/bug-reporting-excellence/SKILL.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/skills/bug-reporting-excellence/SKILL.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/skills/bug-reporting-excellence/SKILL.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `temp_agentic_qe/.claude/skills/chaos-engineering-resilience/SKILL.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/skills/chaos-engineering-resilience/SKILL.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/skills/chaos-engineering-resilience/SKILL.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: status, consequences) `temp_agentic_qe/.claude/skills/code-review-quality/SKILL.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/skills/code-review-quality/SKILL.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/skills/code-review-quality/SKILL.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `temp_agentic_qe/.claude/skills/compatibility-testing/SKILL.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/skills/compatibility-testing/SKILL.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/skills/compatibility-testing/SKILL.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `temp_agentic_qe/.claude/skills/compliance-testing/SKILL.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/skills/compliance-testing/SKILL.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/skills/compliance-testing/SKILL.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: status, decision, consequences) `temp_agentic_qe/.claude/skills/consultancy-practices/SKILL.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/skills/consultancy-practices/SKILL.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/skills/consultancy-practices/SKILL.md`
- ❌ [WARNING] ADR has required sections: 3/4 sections (missing: consequences) `temp_agentic_qe/.claude/skills/context-driven-testing/SKILL.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/skills/context-driven-testing/SKILL.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/skills/context-driven-testing/SKILL.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `temp_agentic_qe/.claude/skills/contract-testing/SKILL.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/skills/contract-testing/SKILL.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/skills/contract-testing/SKILL.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `temp_agentic_qe/.claude/skills/database-testing/SKILL.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/skills/database-testing/SKILL.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/skills/database-testing/SKILL.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: decision, consequences) `temp_agentic_qe/.claude/skills/exploratory-testing-advanced/SKILL.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/skills/exploratory-testing-advanced/SKILL.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/skills/exploratory-testing-advanced/SKILL.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `temp_agentic_qe/.claude/skills/flow-nexus-neural/SKILL.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/skills/flow-nexus-neural/SKILL.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/skills/flow-nexus-neural/SKILL.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: decision, consequences) `temp_agentic_qe/.claude/skills/flow-nexus-platform/SKILL.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/skills/flow-nexus-platform/SKILL.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/skills/flow-nexus-platform/SKILL.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `temp_agentic_qe/.claude/skills/flow-nexus-swarm/SKILL.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/skills/flow-nexus-swarm/SKILL.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/skills/flow-nexus-swarm/SKILL.md`
- ✅ [WARNING] ADR has required sections: 4/4 sections `temp_agentic_qe/.claude/skills/github-code-review/SKILL.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/skills/github-code-review/SKILL.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/skills/github-code-review/SKILL.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `temp_agentic_qe/.claude/skills/github-multi-repo/SKILL.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/skills/github-multi-repo/SKILL.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/skills/github-multi-repo/SKILL.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: decision, consequences) `temp_agentic_qe/.claude/skills/github-project-management/SKILL.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/skills/github-project-management/SKILL.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/skills/github-project-management/SKILL.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: decision, consequences) `temp_agentic_qe/.claude/skills/github-release-management/SKILL.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/skills/github-release-management/SKILL.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/skills/github-release-management/SKILL.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: decision, consequences) `temp_agentic_qe/.claude/skills/github-workflow-automation/SKILL.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/skills/github-workflow-automation/SKILL.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/skills/github-workflow-automation/SKILL.md`
- ❌ [WARNING] ADR has required sections: 3/4 sections (missing: consequences) `temp_agentic_qe/.claude/skills/hive-mind-advanced/SKILL.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/skills/hive-mind-advanced/SKILL.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/skills/hive-mind-advanced/SKILL.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: status, consequences) `temp_agentic_qe/.claude/skills/holistic-testing-pact/SKILL.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/skills/holistic-testing-pact/SKILL.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/skills/holistic-testing-pact/SKILL.md`
- ❌ [WARNING] ADR has required sections: 3/4 sections (missing: consequences) `temp_agentic_qe/.claude/skills/hooks-automation/SKILL.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/skills/hooks-automation/SKILL.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/skills/hooks-automation/SKILL.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `temp_agentic_qe/.claude/skills/localization-testing/SKILL.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/skills/localization-testing/SKILL.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/skills/localization-testing/SKILL.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: decision, consequences) `temp_agentic_qe/.claude/skills/mobile-testing/SKILL.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/skills/mobile-testing/SKILL.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/skills/mobile-testing/SKILL.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `temp_agentic_qe/.claude/skills/mutation-testing/SKILL.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/skills/mutation-testing/SKILL.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/skills/mutation-testing/SKILL.md`
- ❌ [WARNING] ADR has required sections: 3/4 sections (missing: consequences) `temp_agentic_qe/.claude/skills/pair-programming/SKILL.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/skills/pair-programming/SKILL.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/skills/pair-programming/SKILL.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `temp_agentic_qe/.claude/skills/performance-analysis/SKILL.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/skills/performance-analysis/SKILL.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/skills/performance-analysis/SKILL.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: context, consequences) `temp_agentic_qe/.claude/skills/performance-testing/SKILL.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/skills/performance-testing/SKILL.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/skills/performance-testing/SKILL.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: status, consequences) `temp_agentic_qe/.claude/skills/quality-metrics/SKILL.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/skills/quality-metrics/SKILL.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/skills/quality-metrics/SKILL.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: status, consequences) `temp_agentic_qe/.claude/skills/reasoningbank-agentdb/SKILL.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/skills/reasoningbank-agentdb/SKILL.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/skills/reasoningbank-agentdb/SKILL.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: status, decision, consequences) `temp_agentic_qe/.claude/skills/reasoningbank-intelligence/SKILL.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/skills/reasoningbank-intelligence/SKILL.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/skills/reasoningbank-intelligence/SKILL.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `temp_agentic_qe/.claude/skills/refactoring-patterns/SKILL.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/skills/refactoring-patterns/SKILL.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/skills/refactoring-patterns/SKILL.md`
- ❌ [WARNING] ADR has required sections: 3/4 sections (missing: consequences) `temp_agentic_qe/.claude/skills/regression-testing/SKILL.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/skills/regression-testing/SKILL.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/skills/regression-testing/SKILL.md`
- ❌ [WARNING] ADR has required sections: 3/4 sections (missing: consequences) `temp_agentic_qe/.claude/skills/risk-based-testing/SKILL.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/skills/risk-based-testing/SKILL.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/skills/risk-based-testing/SKILL.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `temp_agentic_qe/.claude/skills/security-testing/SKILL.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/skills/security-testing/SKILL.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/skills/security-testing/SKILL.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: status, context, consequences) `temp_agentic_qe/.claude/skills/shift-left-testing/SKILL.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/skills/shift-left-testing/SKILL.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/skills/shift-left-testing/SKILL.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `temp_agentic_qe/.claude/skills/shift-right-testing/SKILL.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/skills/shift-right-testing/SKILL.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/skills/shift-right-testing/SKILL.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: status, decision, consequences) `temp_agentic_qe/.claude/skills/skill-builder/SKILL.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/skills/skill-builder/SKILL.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/skills/skill-builder/SKILL.md`
- ❌ [WARNING] ADR has required sections: 3/4 sections (missing: consequences) `temp_agentic_qe/.claude/skills/sparc-methodology/SKILL.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/skills/sparc-methodology/SKILL.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/skills/sparc-methodology/SKILL.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: decision, consequences) `temp_agentic_qe/.claude/skills/stream-chain/SKILL.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/skills/stream-chain/SKILL.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/skills/stream-chain/SKILL.md`
- ❌ [WARNING] ADR has required sections: 3/4 sections (missing: consequences) `temp_agentic_qe/.claude/skills/swarm-advanced/SKILL.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/skills/swarm-advanced/SKILL.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/skills/swarm-advanced/SKILL.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: status, consequences) `temp_agentic_qe/.claude/skills/swarm-orchestration/SKILL.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/skills/swarm-orchestration/SKILL.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/skills/swarm-orchestration/SKILL.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: status, consequences) `temp_agentic_qe/.claude/skills/tdd-london-chicago/SKILL.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/skills/tdd-london-chicago/SKILL.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/skills/tdd-london-chicago/SKILL.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: status, consequences) `temp_agentic_qe/.claude/skills/technical-writing/SKILL.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/skills/technical-writing/SKILL.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/skills/technical-writing/SKILL.md`
- ❌ [WARNING] ADR has required sections: 3/4 sections (missing: consequences) `temp_agentic_qe/.claude/skills/test-automation-strategy/SKILL.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/skills/test-automation-strategy/SKILL.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/skills/test-automation-strategy/SKILL.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `temp_agentic_qe/.claude/skills/test-data-management/SKILL.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/skills/test-data-management/SKILL.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/skills/test-data-management/SKILL.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: status, context, consequences) `temp_agentic_qe/.claude/skills/test-design-techniques/SKILL.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/skills/test-design-techniques/SKILL.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/skills/test-design-techniques/SKILL.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `temp_agentic_qe/.claude/skills/test-environment-management/SKILL.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/skills/test-environment-management/SKILL.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/skills/test-environment-management/SKILL.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: context, consequences) `temp_agentic_qe/.claude/skills/test-reporting-analytics/SKILL.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/skills/test-reporting-analytics/SKILL.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/skills/test-reporting-analytics/SKILL.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `temp_agentic_qe/.claude/skills/verification-quality/SKILL.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/skills/verification-quality/SKILL.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/skills/verification-quality/SKILL.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `temp_agentic_qe/.claude/skills/visual-testing-advanced/SKILL.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/skills/visual-testing-advanced/SKILL.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/skills/visual-testing-advanced/SKILL.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: status, consequences) `temp_agentic_qe/.claude/skills/xp-practices/SKILL.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/.claude/skills/xp-practices/SKILL.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/.claude/skills/xp-practices/SKILL.md`
- ❌ [WARNING] ADR has required sections: 3/4 sections (missing: consequences) `temp_agentic_qe/CHANGELOG.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/CHANGELOG.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/CHANGELOG.md`
- ❌ [WARNING] ADR has required sections: 3/4 sections (missing: consequences) `temp_agentic_qe/CLAUDE.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/CLAUDE.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ✅ [INFO] ADR has date: Date present `temp_agentic_qe/CLAUDE.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: decision, consequences) `temp_agentic_qe/CONTRIBUTING.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/CONTRIBUTING.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/CONTRIBUTING.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: context, consequences) `temp_agentic_qe/PRE-PUBLISH-CHECKLIST.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/PRE-PUBLISH-CHECKLIST.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/PRE-PUBLISH-CHECKLIST.md`
- ❌ [WARNING] ADR has required sections: 3/4 sections (missing: consequences) `temp_agentic_qe/README.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/README.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/README.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `temp_agentic_qe/RELEASE-NOTES.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/RELEASE-NOTES.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/RELEASE-NOTES.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `temp_agentic_qe/ROUTING_IMPLEMENTATION_REPORT.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/ROUTING_IMPLEMENTATION_REPORT.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ✅ [INFO] ADR has date: Date present `temp_agentic_qe/ROUTING_IMPLEMENTATION_REPORT.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `temp_agentic_qe/SECURITY.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/SECURITY.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/SECURITY.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: context, consequences) `temp_agentic_qe/VALIDATION-SUMMARY.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/VALIDATION-SUMMARY.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ✅ [INFO] ADR has date: Date present `temp_agentic_qe/VALIDATION-SUMMARY.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: status, consequences) `temp_agentic_qe/docs/AgentDBManager-Implementation.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/docs/AgentDBManager-Implementation.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/docs/AgentDBManager-Implementation.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `temp_agentic_qe/docs/INIT-LOGGING-BEFORE-AFTER.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/docs/INIT-LOGGING-BEFORE-AFTER.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/docs/INIT-LOGGING-BEFORE-AFTER.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `temp_agentic_qe/docs/PHASE2-FILE-STRUCTURE.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/docs/PHASE2-FILE-STRUCTURE.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/docs/PHASE2-FILE-STRUCTURE.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: context, consequences) `temp_agentic_qe/docs/PHASE2-INTEGRATION-EXECUTIVE-SUMMARY.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/docs/PHASE2-INTEGRATION-EXECUTIVE-SUMMARY.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ✅ [INFO] ADR has date: Date present `temp_agentic_qe/docs/PHASE2-INTEGRATION-EXECUTIVE-SUMMARY.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `temp_agentic_qe/docs/PHASE2-INTEGRATION-TESTS-DELIVERED.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/docs/PHASE2-INTEGRATION-TESTS-DELIVERED.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/docs/PHASE2-INTEGRATION-TESTS-DELIVERED.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `temp_agentic_qe/docs/learning-system-integration-tests-report.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/docs/learning-system-integration-tests-report.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ✅ [INFO] ADR has date: Date present `temp_agentic_qe/docs/learning-system-integration-tests-report.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: decision, consequences) `temp_agentic_qe/security/SECURITY-REMEDIATION-REPORT.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/security/SECURITY-REMEDIATION-REPORT.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ✅ [INFO] ADR has date: Date present `temp_agentic_qe/security/SECURITY-REMEDIATION-REPORT.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `temp_agentic_qe/tests/COVERAGE_REMEDIATION_REPORT.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/tests/COVERAGE_REMEDIATION_REPORT.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/tests/COVERAGE_REMEDIATION_REPORT.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `temp_agentic_qe/tests/PERFORMANCE_ANALYSIS_REPORT.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/tests/PERFORMANCE_ANALYSIS_REPORT.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/tests/PERFORMANCE_ANALYSIS_REPORT.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: status, context, consequences) `temp_agentic_qe/tests/README.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/tests/README.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/tests/README.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `temp_agentic_qe/tests/README_PHASE1.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/tests/README_PHASE1.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/tests/README_PHASE1.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `temp_agentic_qe/tests/disabled/until-implementations/README.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/tests/disabled/until-implementations/README.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/tests/disabled/until-implementations/README.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: status, decision, consequences) `temp_agentic_qe/tests/docs/PHASE1_TESTS.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/tests/docs/PHASE1_TESTS.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/tests/docs/PHASE1_TESTS.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: decision, consequences) `temp_agentic_qe/tests/docs/PHASE1_TEST_SUMMARY.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/tests/docs/PHASE1_TEST_SUMMARY.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ✅ [INFO] ADR has date: Date present `temp_agentic_qe/tests/docs/PHASE1_TEST_SUMMARY.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `temp_agentic_qe/tests/docs/QUICK_START.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/tests/docs/QUICK_START.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/tests/docs/QUICK_START.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: status, decision, consequences) `temp_agentic_qe/tests/fixtures/agentdb/README.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/tests/fixtures/agentdb/README.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/tests/fixtures/agentdb/README.md`
- ❌ [WARNING] ADR has required sections: 0/4 sections (missing: status, context, decision, consequences) `temp_agentic_qe/tests/fixtures/phase2-test-data/README.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/tests/fixtures/phase2-test-data/README.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/tests/fixtures/phase2-test-data/README.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `temp_agentic_qe/tests/integration/README.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/tests/integration/README.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/tests/integration/README.md`
- ❌ [WARNING] ADR has required sections: 2/4 sections (missing: context, consequences) `temp_agentic_qe/tests/integration/agentdb/README.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/tests/integration/agentdb/README.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ✅ [INFO] ADR has date: Date present `temp_agentic_qe/tests/integration/agentdb/README.md`
- ❌ [WARNING] ADR has required sections: 3/4 sections (missing: consequences) `temp_agentic_qe/tests/integration/phase1/README.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/tests/integration/phase1/README.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `temp_agentic_qe/tests/integration/phase1/README.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences) `temp_agentic_qe/tests/verification-report.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `temp_agentic_qe/tests/verification-report.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ✅ [INFO] ADR has date: Date present `temp_agentic_qe/tests/verification-report.md`
- ❌ [WARNING] ADR has required sections: 3/4 sections (missing: consequences) `wsjf_activation_analysis.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `wsjf_activation_analysis.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `wsjf_activation_analysis.md`
- ❌ [WARNING] ADR has required sections: 1/4 sections (missing: status, decision, consequences) `wsjf_prompt_reindex.md`
- ❌ [INFO] ADR has explicit status: Status: NOT FOUND `wsjf_prompt_reindex.md`
  💡 Add 'Status: accepted' (or proposed/deprecated/superseded)
- ❌ [INFO] ADR has date: No date found `wsjf_prompt_reindex.md`

### DDD Checks

- ❌ [INFO] Module has DoR/DoD in docstring: No DoR/DoD in docstring `activation_orchestrator.py`
- ❌ [INFO] Module has DoR/DoD in docstring: No DoR/DoD in docstring `agentic_tribe_orchestrator.py`
- ❌ [INFO] Module has DoR/DoD in docstring: No DoR/DoD in docstring `analyze_swarm_results.py`
- ✅ [INFO] Module has DoR/DoD in docstring: DoR/DoD found `automated_email_format_upgrader.py`
- ❌ [INFO] Module has DoR/DoD in docstring: No DoR/DoD in docstring `automated_roam_swarm_orchestrator.py`
- ❌ [INFO] Module has DoR/DoD in docstring: No DoR/DoD in docstring `chrome_devtools_mcp_server.py`
- ❌ [INFO] Module has DoR/DoD in docstring: No DoR/DoD in docstring `cicd_promotion_gates.py`
- ❌ [INFO] Module has DoR/DoD in docstring: No DoR/DoD in docstring `clean_unify.py`
- ❌ [INFO] Module has DoR/DoD in docstring: No DoR/DoD in docstring `cmd_prod_cycle.py`
- ❌ [INFO] Module has DoR/DoD in docstring: No DoR/DoD in docstring `compliance-scanner.py`
- ❌ [INFO] Module has DoR/DoD in docstring: No DoR/DoD in docstring `comprehensive_email_automation.py`
- ❌ [INFO] Module has DoR/DoD in docstring: No DoR/DoD in docstring `debug_metrics.py`
- ❌ [INFO] Module has DoR/DoD in docstring: No DoR/DoD in docstring `deploy_and_verify.py`
- ❌ [INFO] Module has DoR/DoD in docstring: No DoR/DoD in docstring `device_resolution_sync.py`
- ❌ [INFO] Module has DoR/DoD in docstring: No DoR/DoD in docstring `device_state_tracker_enhanced.py`
- ❌ [INFO] Module has DoR/DoD in docstring: No DoR/DoD in docstring `dt_schema.py`
- ❌ [INFO] Module has DoR/DoD in docstring: No DoR/DoD in docstring `dynamic_context_loader.py`
- ❌ [INFO] Module has DoR/DoD in docstring: No DoR/DoD in docstring `dynamic_mcp_manager.py`
- ❌ [INFO] Module has DoR/DoD in docstring: No DoR/DoD in docstring `find_large_dirs.py`
- ❌ [INFO] Module has DoR/DoD in docstring: No DoR/DoD in docstring `fix-gov.py`
- ❌ [INFO] Module has DoR/DoD in docstring: No DoR/DoD in docstring `fix-lucide-revert.py`
- ❌ [INFO] Module has DoR/DoD in docstring: No DoR/DoD in docstring `fix-lucide.py`
- ❌ [INFO] Module has DoR/DoD in docstring: No DoR/DoD in docstring `fix-nav.py`
- ❌ [INFO] Module has DoR/DoD in docstring: No DoR/DoD in docstring `fix-palette.py`
- ❌ [INFO] Module has DoR/DoD in docstring: No DoR/DoD in docstring `fix_remnants.py`
- ❌ [INFO] Module has DoR/DoD in docstring: No DoR/DoD in docstring `hivelocity_device_check.py`
- ❌ [INFO] Module has DoR/DoD in docstring: No DoR/DoD in docstring `hivelocity_setup_monitoring.py`
- ❌ [INFO] Module has DoR/DoD in docstring: No DoR/DoD in docstring `kms_setup.py`
- ❌ [INFO] Module has DoR/DoD in docstring: No DoR/DoD in docstring `legal_research_dashboard.py`
- ❌ [INFO] Module has DoR/DoD in docstring: No DoR/DoD in docstring `multi_org_sor_analyzer.py`
- ❌ [INFO] Module has DoR/DoD in docstring: No DoR/DoD in docstring `offload_envs.py`
- ❌ [INFO] Module has DoR/DoD in docstring: No DoR/DoD in docstring `passbolt_env_loader.py`
- ❌ [INFO] Module has DoR/DoD in docstring: No DoR/DoD in docstring `passbolt_integration.py`
- ❌ [INFO] Module has DoR/DoD in docstring: No DoR/DoD in docstring `patch-budget.py`
- ❌ [INFO] Module has DoR/DoD in docstring: No DoR/DoD in docstring `phase1c-validation-test-suite.ts`
- ❌ [INFO] Module has DoR/DoD in docstring: No DoR/DoD in docstring `playwright-sweep.config.ts`
- ❌ [INFO] Module has DoR/DoD in docstring: No DoR/DoD in docstring `playwright-visual.config.ts`
- ❌ [INFO] Module has DoR/DoD in docstring: No DoR/DoD in docstring `playwright.config.ts`
- ❌ [INFO] Module has DoR/DoD in docstring: No DoR/DoD in docstring `playwright.trading.config.ts`
- ❌ [INFO] Module has DoR/DoD in docstring: No DoR/DoD in docstring `pre_activation_governance_check.py`
- ❌ [INFO] Module has DoR/DoD in docstring: No DoR/DoD in docstring `prime_commands.py`
- ❌ [INFO] Module has DoR/DoD in docstring: No DoR/DoD in docstring `quick_email_review.py`
- ❌ [INFO] Module has DoR/DoD in docstring: No DoR/DoD in docstring `refactor_admission.py`
- ❌ [INFO] Module has DoR/DoD in docstring: No DoR/DoD in docstring `reverse_recruiting_evaluator.py`
- ❌ [INFO] Module has DoR/DoD in docstring: No DoR/DoD in docstring `reverse_recruiting_orchestrator.py`
- ❌ [INFO] Module has DoR/DoD in docstring: No DoR/DoD in docstring `reverse_recruiting_swarm.py`
- ❌ [INFO] Module has DoR/DoD in docstring: No DoR/DoD in docstring `rewrite_governance.py`
- ❌ [INFO] Module has DoR/DoD in docstring: No DoR/DoD in docstring `roam_wsjf_analyzer.py`
- ❌ [INFO] Module has DoR/DoD in docstring: No DoR/DoD in docstring `rooz_live_workflow_orchestrator.py`
- ❌ [INFO] Module has DoR/DoD in docstring: No DoR/DoD in docstring `secure_key_manager.py`
- ❌ [INFO] Module has DoR/DoD in docstring: No DoR/DoD in docstring `simple_test.py`
- ❌ [INFO] Module has DoR/DoD in docstring: No DoR/DoD in docstring `test-roam.ts`
- ❌ [INFO] Module has DoR/DoD in docstring: No DoR/DoD in docstring `test-scheduler.ts`
- ❌ [INFO] Module has DoR/DoD in docstring: No DoR/DoD in docstring `test_device_improvements.py`
- ❌ [INFO] Module has DoR/DoD in docstring: No DoR/DoD in docstring `test_device_state.py`
- ❌ [INFO] Module has DoR/DoD in docstring: No DoR/DoD in docstring `test_indexer.py`
- ❌ [INFO] Module has DoR/DoD in docstring: No DoR/DoD in docstring `test_invoke.py`
- ❌ [INFO] Module has DoR/DoD in docstring: No DoR/DoD in docstring `test_openstack_stx_bridge.py`
- ❌ [INFO] Module has DoR/DoD in docstring: No DoR/DoD in docstring `test_staging.py`
- ❌ [INFO] Module has DoR/DoD in docstring: No DoR/DoD in docstring `test_variant_controls.py`
- ❌ [INFO] Module has DoR/DoD in docstring: No DoR/DoD in docstring `test_write_status.py`
- ❌ [INFO] Module has DoR/DoD in docstring: No DoR/DoD in docstring `token_tracker.py`
- ❌ [INFO] Module has DoR/DoD in docstring: No DoR/DoD in docstring `unify_gates.py`
- ❌ [INFO] Module has DoR/DoD in docstring: No DoR/DoD in docstring `validate_legal_patterns_cli.py`
- ✅ [INFO] Module has DoR/DoD in docstring: DoR/DoD found `validation_dashboard_tui.py`
- ❌ [INFO] Module has DoR/DoD in docstring: No DoR/DoD in docstring `validation_tui_dashboard.py`
- ❌ [INFO] Module has DoR/DoD in docstring: No DoR/DoD in docstring `vibethinker_settlement_ai.py`
- ❌ [INFO] Module has DoR/DoD in docstring: No DoR/DoD in docstring `vite.config.ts`
- ❌ [INFO] Module has DoR/DoD in docstring: No DoR/DoD in docstring `vite.trading.config.ts`
- ❌ [INFO] Module has DoR/DoD in docstring: No DoR/DoD in docstring `wholeness_validation_framework.py`
- ❌ [CRITICAL] DDD aggregate root present: 0 aggregate root(s) detected
- ✅ [WARNING] DDD value object present: 41 value object(s) detected
- ✅ [WARNING] DDD service present: 50 service(s) detected

### TDD Checks

- ✅ [INFO] Test file follows naming convention: Correct: _pw_test.js `_pw_test.js`
- ❌ [INFO] Test file follows naming convention: Non-standard: phase1c-validation-test-suite.ts `phase1c-validation-test-suite.ts`
- ✅ [INFO] Test file follows naming convention: Correct: simple_test.py `simple_test.py`
- ✅ [INFO] Test file follows naming convention: Correct: test-adjacency.js `test-adjacency.js`
- ✅ [INFO] Test file follows naming convention: Correct: test-command-palette.js `test-command-palette.js`
- ✅ [INFO] Test file follows naming convention: Correct: test-console.js `test-console.js`
- ✅ [INFO] Test file follows naming convention: Correct: test-console2.js `test-console2.js`
- ✅ [INFO] Test file follows naming convention: Correct: test-console3.js `test-console3.js`
- ✅ [INFO] Test file follows naming convention: Correct: test-dashboard.js `test-dashboard.js`
- ✅ [INFO] Test file follows naming convention: Correct: test-dom.js `test-dom.js`
- ✅ [INFO] Test file follows naming convention: Correct: test-governance.js `test-governance.js`
- ✅ [WARNING] Test assertion density ≥ 1.0 per test: 6.6 assertions/test (66 assertions, 10 tests) `test-governance.js`
- ✅ [INFO] Test file follows naming convention: Correct: test-network.js `test-network.js`
- ✅ [INFO] Test file follows naming convention: Correct: test-roam.ts `test-roam.ts`
- ✅ [INFO] Test file follows naming convention: Correct: test-scheduler.ts `test-scheduler.ts`
- ✅ [INFO] Test file follows naming convention: Correct: test_device_improvements.py `test_device_improvements.py`
- ❌ [WARNING] Test assertion density ≥ 1.0 per test: 0.0 assertions/test (0 assertions, 1 tests) `test_device_improvements.py`
- ✅ [INFO] Test file follows naming convention: Correct: test_device_state.py `test_device_state.py`
- ❌ [WARNING] Test assertion density ≥ 1.0 per test: 0.0 assertions/test (0 assertions, 1 tests) `test_device_state.py`
- ✅ [INFO] Test file follows naming convention: Correct: test_indexer.py `test_indexer.py`
- ✅ [INFO] Test file follows naming convention: Correct: test_invoke.py `test_invoke.py`
- ✅ [INFO] Test file follows naming convention: Correct: test_openstack_stx_bridge.py `test_openstack_stx_bridge.py`
- ✅ [WARNING] Test assertion density ≥ 1.0 per test: 2.0 assertions/test (16 assertions, 8 tests) `test_openstack_stx_bridge.py`
- ✅ [INFO] Test file follows naming convention: Correct: test_playwright.js `test_playwright.js`
- ✅ [INFO] Test file follows naming convention: Correct: test_staging.py `test_staging.py`
- ❌ [WARNING] Test assertion density ≥ 1.0 per test: 0.0 assertions/test (0 assertions, 2 tests) `test_staging.py`
- ✅ [INFO] Test file follows naming convention: Correct: test_syntax.js `test_syntax.js`
- ✅ [INFO] Test file follows naming convention: Correct: test_variant_controls.py `test_variant_controls.py`
- ❌ [WARNING] Test assertion density ≥ 1.0 per test: 0.0 assertions/test (0 assertions, 4 tests) `test_variant_controls.py`
- ✅ [INFO] Test file follows naming convention: Correct: test_write_status.py `test_write_status.py`
- ❌ [WARNING] Test assertion density ≥ 1.0 per test: 0.0 assertions/test (0 assertions, 2 tests) `test_write_status.py`
- ✅ [CRITICAL] Unit tests present: 28 test functions found
- ✅ [WARNING] Integration tests present: 7 integration test file(s)
- ✅ [INFO] Total assertion count reasonable: 82 total assertions across 24 files

## Recommendations

- ⚠️ PRD health is 26% — address 669 gap(s)
-   → [WARNING] PRD has required sections: 0/4 sections present (missing: objective, requirements, acceptance criteria, success metric)
-   → [WARNING] PRD has required sections: 1/4 sections present (missing: objective, acceptance criteria, success metric)
-   → [WARNING] PRD has measurable success metrics: Quantifiable metrics: 0 pattern(s) found
- ⚠️ ADR health is 5% — address 498 gap(s)
-   → [WARNING] ADR has required sections: 1/4 sections (missing: status, context, consequences)
-   → [WARNING] ADR has required sections: 1/4 sections (missing: context, decision, consequences)
-   → [WARNING] ADR has required sections: 3/4 sections (missing: consequences)
- ⚠️ DDD health is 8% — address 1 gap(s)
-   → [CRITICAL] DDD aggregate root present: 0 aggregate root(s) detected
-   → [WARNING] Test assertion density ≥ 1.0 per test: 0.0 assertions/test (0 assertions, 1 tests)
-   → [WARNING] Test assertion density ≥ 1.0 per test: 0.0 assertions/test (0 assertions, 1 tests)
-   → [WARNING] Test assertion density ≥ 1.0 per test: 0.0 assertions/test (0 assertions, 2 tests)
- 🏗️ Strengthen domain model: ensure aggregate roots, value objects, and services are clearly defined

## OODA Integration

| Phase | Coherence Action |
|:------|:-----------------|
| **Observe** | Scanned 1524 files across 4 layers |
| **Orient** | Health: PRD=26%, ADR=5%, DDD=8%, TDD=75% |
| **Decide** | Verdict: FAIL at 15% |
| **Act** | 14 recommendations to implement |

---
*Generated by DDD/TDD/ADR Coherence Validator v1.0 | 2026-05-08 12:21:31*