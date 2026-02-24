# Contract Enforcement Integration Guide
**Version**: 1.0  
**Date**: 2026-02-20  
**Status**: Implementation Ready

---

## Executive Summary

**Problem**: "ALWAYS" statements become meaningless without enforcement machinery.  
**Solution**: Verifiable gates that validate contracts post-task, turning aspirational rules into enforceable constraints.

**Key Insight**: Instead of saying "ALWAYS use real data", we run `./scripts/contract-enforcement-gate.sh verify` post-task to ensure:
- Schema validation (Pydantic models exist)
- Anti-pattern detection (WSJF gaming caught)
- Retry mechanisms (tenacity decorators present)
- Circuit breakers (external API protection)
- Test coverage ≥80%
- Annotation audit (context preserved)
- ROAM freshness ≤96h
- Observability (structured logging)

---

## Integration Points

| Hook | When | How | Exit Code Behavior |
|------|------|-----|-------------------|
| `BaseAgent.onPostTask` | After every agent task | Shell exec → `contract-enforcement-gate.sh verify` | Non-zero = task failed |
| `ay-prod-cycle-with-dor.sh` | DoD validation phase | Calls enforcement gate at DoD | Blocks deployment |
| `.pre-commit-config.yaml` | Before every commit | Annotation audit on changed files | Blocks commit |
| CI/CD pipeline | On PR/merge | Full verification + annotation audit | Fails build |

---

## 1. BaseAgent Post-Task Hook

### TypeScript Integration (`.agentic-qe`)

```typescript
// File: .agentic-qe/src/agent/BaseAgent.ts

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export abstract class BaseAgent {
  /**
   * Post-task hook: Run contract enforcement gate
   * 
   * @business-context Ensures every agent output meets quality contracts
   * @adr ADR-042: Contract enforcement prevents drift from standards
   * @constraint Must run synchronously before task marked complete
   */
  async onPostTask(postTaskData: PostTaskData): Promise<void> {
    const { assignment, result } = postTaskData;
    
    // Execute contract enforcement gate
    const gatePath = path.join(__dirname, '../../../scripts/contract-enforcement-gate.sh');
    
    try {
      const { stdout, stderr } = await execAsync(`${gatePath} verify`, {
        cwd: path.join(__dirname, '../../..'),
        timeout: 60000 // 60s timeout
      });
      
      this.logInfo('Contract enforcement passed', { stdout });
    } catch (error: any) {
      this.logError('Contract enforcement FAILED', { 
        error: error.message, 
        stderr: error.stderr,
        task: assignment.task.description 
      });
      
      // Option 1: Fail the task
      throw new Error(`Contract enforcement gate failed: ${error.message}`);
      
      // Option 2: Log warning and continue (degraded mode)
      // this.logWarning('Contract enforcement failed - proceeding in degraded mode');
    }
  }
  
  async performTask(assignment: TaskAssignment): Promise<TaskResult> {
    const startTime = Date.now();
    
    try {
      const result = await this.executeTask(assignment.task);
      
      // Run post-task hooks (includes contract enforcement)
      const postTaskData: PostTaskData = { assignment, result };
      await this.onPostTask(postTaskData);
      await this.executeHook('post-task', postTaskData);
      
      this.updatePerformanceMetrics(startTime, true);
      return result;
    } catch (error) {
      this.updatePerformanceMetrics(startTime, false);
      throw error;
    }
  }
}
```

### Configuration

```typescript
// File: .agentic-qe/config/enforcement.config.ts

export const ENFORCEMENT_CONFIG = {
  enabled: process.env.CONTRACT_ENFORCEMENT_ENABLED !== 'false',
  mode: process.env.CONTRACT_ENFORCEMENT_MODE || 'strict', // 'strict' | 'warn' | 'disabled'
  gates: {
    schema: true,
    antiPatterns: true,
    retry: true,
    circuitBreaker: true,
    testCoverage: true,
    annotations: false, // Enable after Phase 1
    roamFreshness: true,
    observability: true
  },
  thresholds: {
    testCoverage: 80,
    roamMaxAgeHours: 96,
    annotationMinCount: 10
  }
};
```

---

## 2. Production Cycle Integration

### ay-prod-cycle-with-dor.sh Integration

```bash
#!/bin/bash
# File: scripts/ay-prod-cycle-with-dor.sh

# ... existing DoR checks ...

# ═══════════════════════════════════════════════════════════════
# DoD Phase: Contract Enforcement Gate
# ═══════════════════════════════════════════════════════════════
run_dod_validation() {
    echo "════════════════════════════════════════════════════"
    echo "DoD VALIDATION: Contract Enforcement"
    echo "════════════════════════════════════════════════════"
    
    # Run contract enforcement gate
    if ! ./scripts/contract-enforcement-gate.sh verify; then
        echo "❌ DoD FAILED: Contract enforcement gate blocked deployment"
        exit 1
    fi
    
    # Additional DoD checks
    run_health_check
    run_coherence_validation
    verify_test_coverage
    
    echo "✅ DoD PASSED: All validation gates passed"
}

# Main cycle
main() {
    validate_dor
    execute_task
    run_dod_validation  # ← Contract enforcement here
    deploy_if_passed
}

main "$@"
```

---

## 3. Pre-Commit Hook Integration

### .pre-commit-config.yaml

```yaml
# File: .pre-commit-config.yaml

repos:
  - repo: local
    hooks:
      - id: annotation-audit
        name: Annotation Audit (Contract Enforcement)
        entry: scripts/contract-enforcement-gate.sh audit
        language: script
        pass_filenames: false
        always_run: true
        stages: [commit]
        
      - id: roam-freshness
        name: ROAM Freshness Check
        entry: scripts/contract-enforcement-gate.sh roam
        language: script
        pass_filenames: false
        always_run: true
        stages: [commit]
        files: '.*\.py$|.*\.ts$|.*\.rs$'
```

### Installation

```bash
# Install pre-commit framework
pip install pre-commit

# Install hooks
pre-commit install

# Test hooks
pre-commit run --all-files
```

---

## 4. CI/CD Pipeline Integration

### GitHub Actions

```yaml
# File: .github/workflows/contract-enforcement.yml

name: Contract Enforcement Gate

on:
  pull_request:
    branches: [main, develop]
  push:
    branches: [main]

jobs:
  enforce-contract:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      
      - name: Install dependencies
        run: |
          pip install -r requirements.txt
          pip install pytest pytest-cov tenacity pydantic
      
      - name: Run Contract Enforcement Gate
        run: |
          chmod +x scripts/contract-enforcement-gate.sh
          ./scripts/contract-enforcement-gate.sh verify
      
      - name: Generate Enforcement Report
        if: always()
        run: |
          ./scripts/contract-enforcement-gate.sh report
          cat ENFORCEMENT_REPORT.json
      
      - name: Upload Report
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: enforcement-report
          path: ENFORCEMENT_REPORT.json
```

---

## 5. Annotation Convention

### ANNOTATION_CONVENTION.md

```markdown
# Annotation Convention

## Purpose
Preserve context across 4 dimensions:
1. **Business Context** (`@business-context`) - Why this rule exists
2. **Historical Context** (`@adr`) - Why we chose this
3. **Constraint Context** (`@constraint`) - What limits options
4. **Future Context** (`@planned-change`) - What we plan to change

## Format

### Python
```python
# @business-context WSJF-42: Evidence bundle generation is the 
#   highest BV item — this function is on the critical path.
# @adr ADR-017: Chose PostgreSQL over Redis for knowledge graph
#   because graph traversals require JOINs, not key-value lookups.
# @constraint DDD-CASE-MGMT: Must stay within CaseManagement 
#   bounded context. Do NOT import from Billing domain.
# @planned-change R003: Pattern naming will change when A002 lands.
#   Current name "EvidenceBundle" becomes "CaseEvidence".
class EvidenceBundle:
    pass
```

### TypeScript
```typescript
/**
 * @business-context WSJF-42: Evidence bundle generation is the 
 *   highest BV item — this function is on the critical path.
 * @adr ADR-017: Chose PostgreSQL over Redis for knowledge graph
 *   because graph traversals require JOINs, not key-value lookups.
 * @constraint DDD-CASE-MGMT: Must stay within CaseManagement 
 *   bounded context. Do NOT import from Billing domain.
 * @planned-change R003: Pattern naming will change when A002 lands.
 *   Current name "EvidenceBundle" becomes "CaseEvidence".
 */
export class EvidenceBundle implements ICaseArtifact {
  // ...
}
```

## Enforcement

The `contract-enforcement-gate.sh audit` command scans for these annotations:
- Counts each annotation type
- Warns if total count < 10
- Fails if high-WSJF files lack context

## Recommended Targets

Prioritize annotations on:
1. High-WSJF components (WSJF > 15)
2. Cross-bounded-context interfaces
3. External API integrations
4. Critical path functions

---

## 6. ROAM_TRACKER.yaml Integration

### Template

```yaml
# File: ROAM_TRACKER.yaml

version: 1.0
last_updated: 2026-02-20T21:47:31Z

risks:
  - id: R-2026-007
    type: ACCEPTED  # RESOLVED | OWNED | ACCEPTED | MITIGATED
    description: "MAA filed 26CV007491-590 eviction during settlement talks"
    impact: HIGH
    probability: CERTAIN  # Already filed
    owner: SB
    mitigation: |
      - File Answer by 2/24 (WSJF 30.0)
      - Motion to Consolidate with 26CV005596
      - Use filing as retaliation evidence
    deadline: 2026-03-10
    wsjf: 30.0
    status: ACTIVE
    
  - id: R-2026-006
    type: MITIGATED
    description: "Test coverage below 80% in validation_dashboard_tui.py"
    impact: MEDIUM
    probability: HIGH
    owner: Validation Team
    mitigation: |
      - Add unit tests for RobustValidator
      - Add integration tests for CircuitBreaker
      - Property-based tests for WSJF invariants
    deadline: 2026-02-27
    wsjf: 12.0
    status: IN_PROGRESS
```

### Staleness Check

```bash
# Automated check runs daily
./scripts/contract-enforcement-gate.sh roam

# If stale (>96h), gate fails:
# ERROR: ROAM_TRACKER.yaml is STALE. Age: 120h (Limit: 96h)
```

---

## 7. Contract Template

### CONTRACT.md Structure

```markdown
---
contract: true
version: 1.0
task: "Implement Phase 1 Critical Robustness Fixes"
---

## § GOAL (Success Metric)
Achieve 95%+ robustness score by implementing 7 critical fixes:
- WSJF-R001: Input validation (Pydantic schemas)
- WSJF-R002: Anti-pattern detection (gaming checks)
- VAL-R001: Retry mechanism (tenacity decorators)
- VAL-R002: Circuit breaker (3-state: CLOSED/OPEN/HALF_OPEN)
- VAL-R007: Validation timeout (30s default)
- WHO-R001: Schema validation (document types)
- GOV-R001: Auto-remediation (policy violations)

## § CONSTRAINTS (Hard Boundaries)
- Token budget: ≤ 50,000 tokens per fix
- File scope: Only modify files listed in ROBUSTNESS_ANALYSIS_2026-02-20.md
- Dependency restrictions: Use tenacity, pydantic, asyncio (no new major dependencies)
- Performance: Each validation must complete within 30s timeout

## § OUTPUT FORMAT (Structure Specification)
Return: {
  "summary": "Implemented 7 critical fixes with 95% test coverage",
  "files_modified": ["scripts/cmd_wsjf.py", "validation_dashboard_tui.py", ...],
  "metrics": {
    "before": {"robustness": 70, "test_coverage": 30},
    "after": {"robustness": 95, "test_coverage": 82}
  },
  "gates_passed": ["schema", "anti-pattern", "retry", "circuit-breaker", "timeout", "schema-validation", "auto-remediation"],
  "gates_failed": []
}

Do NOT return prose. Return structured JSON with embedded code examples.

## § FAILURE CONDITIONS (Rejection Criteria)
Output is UNACCEPTABLE if:
- Any implementation uses mocks where real validation logic should exist
- Test coverage < 80% after implementation
- Any gate still fails after "completion"
- Token budget exceeded
- Files outside ROBUSTNESS_ANALYSIS scope modified

## § VERIFICATION (How We Know It Worked)
Run: `./scripts/contract-enforcement-gate.sh verify`
Parse: Exit code 0 AND all 8 gates passed
Expected: GATE_PASSED >= 8, GATE_FAILED = 0
```

---

## 8. Enforcement Modes

### Strict Mode (Default)
- Contract enforcement failures **block** task completion
- Non-zero exit code propagates to calling process
- CI/CD pipeline fails on gate failure

### Warn Mode (Degraded)
- Contract enforcement failures **log warnings**
- Task completion proceeds
- Metrics logged for analysis

### Disabled Mode (Emergency)
- Contract enforcement skipped entirely
- Use only for emergency hotfixes
- Requires explicit approval

### Configuration

```bash
# Environment variables
export CONTRACT_ENFORCEMENT_MODE=strict  # strict | warn | disabled
export CONTRACT_ENFORCEMENT_ENABLED=true
```

---

## 9. Observability & Metrics

### Structured Logging

```python
import structlog

logger = structlog.get_logger()

# Log contract enforcement events
logger.info(
    "contract_enforcement_passed",
    gates_passed=8,
    gates_failed=0,
    duration_ms=1234,
    task_id="task_abc123"
)
```

### Metrics Collection

```json
{
  "timestamp": "2026-02-20T21:47:31Z",
  "event": "contract_enforcement",
  "status": "PASSED",
  "gates": {
    "schema": "PASS",
    "anti_patterns": "PASS",
    "retry": "PASS",
    "circuit_breaker": "PASS",
    "test_coverage": "PASS",
    "annotations": "WARN",
    "roam": "PASS",
    "observability": "PASS"
  },
  "duration_ms": 1234,
  "task_id": "task_abc123"
}
```

---

## 10. Rollout Plan

### Phase 1 (Week 1): NOW
- ✅ Contract enforcement gate script exists
- [ ] Wire into `BaseAgent.onPostTask`
- [ ] Add to `ay-prod-cycle-with-dor.sh`
- [ ] Configure strict mode
- [ ] Test on single agent

### Phase 2 (Week 2): NEXT
- [ ] Pre-commit hook integration
- [ ] CI/CD pipeline integration
- [ ] Annotation audit enforcement
- [ ] ROAM freshness monitoring

### Phase 3 (Week 3-4): LATER
- [ ] Metrics dashboard
- [ ] Enforcement report visualization
- [ ] Automated remediation suggestions
- [ ] Contract template generator

---

## 11. Troubleshooting

### Gate Failures

**Symptom**: `contract-enforcement-gate.sh verify` exits 1  
**Diagnosis**: Check which gate failed in output  
**Fix**: Address specific gate requirements (see ROBUSTNESS_ANALYSIS_2026-02-20.md)

**Common Issues**:
- **Schema validation fails**: Add Pydantic models to scripts/cmd_wsjf.py
- **Anti-pattern detection missing**: Implement detect_anti_patterns() function
- **Test coverage <80%**: Add unit/integration tests
- **ROAM stale**: Update ROAM_TRACKER.yaml with current risks

### Performance Issues

**Symptom**: Contract enforcement takes >30s  
**Diagnosis**: Profile gate execution time  
**Fix**: 
- Skip expensive gates in dev (use warn mode)
- Cache validation results (5min TTL)
- Run gates in parallel where possible

---

## 12. References

- **Robustness Analysis**: `ROBUSTNESS_ANALYSIS_2026-02-20.md`
- **Annotation Convention**: `docs/ANNOTATION_CONVENTION.md`
- **ROAM Tracker**: `ROAM_TRACKER.yaml`
- **Contract Template**: `scripts/contract-enforcement-gate.sh init`

---

**Next Steps**:
1. Review this integration guide
2. Wire contract enforcement into `BaseAgent.onPostTask`
3. Test on single task with strict mode
4. Roll out to all agents after validation
5. Monitor metrics and adjust thresholds

---

**Generated**: 2026-02-20T21:47:31Z  
**Author**: Contract Enforcement Integration Team  
**Next Review**: After Phase 1 completion (1 week)
