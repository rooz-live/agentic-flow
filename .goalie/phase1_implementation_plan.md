# Phase 1 Implementation Plan
**Sprint 1 - Week 1: Core Foundation**  
**Generated:** 2026-01-08T21:08:43Z  
**Target:** Production-ready `ay yo` command with safety guardrails

---

## 📋 Sprint 1 Scope (Items #1-3 from WSJF Backlog)

### **Deliverables:**
1. ✅ `ay yo prod-cycle` - Integrated convergence workflow
2. ✅ Break-glass audit logging for destructive ops
3. ✅ Test suite foundation (>80% coverage for new code)

### **Definition of Done:**
- All acceptance criteria met from WSJF backlog
- Tests pass in CI
- Documentation updated
- No new security vulnerabilities
- DoR budget compliance validated
- Convergence reporting verified

---

## 🧪 Test-First Development Approach

### **Testing Pyramid:**
```
        /\
       /E2E\      <- 10% (Full prod-cycle scenarios)
      /------\
     /  INT  \    <- 30% (Hook chains, episode storage)
    /--------\
   /   UNIT   \   <- 60% (Individual functions, utilities)
  /----------\
```

### **Test Execution Order:**
1. **Write failing test** (Red)
2. **Implement minimal code** (Green)
3. **Refactor with confidence** (Refactor)
4. **Document behavior** (Commit)

---

## 📦 Feature 1: `ay yo prod-cycle` Integration

### **Task Breakdown:**

#### **1.1 Define CLI Interface** (1 hour)
**Test First:**
```bash
# tests/cli/test_ay_yo_prod_cycle.sh
test_prod_cycle_command_exists() {
  ay yo --help | grep -q "prod-cycle"
  assert_exit_code 0
}

test_prod_cycle_accepts_options() {
  # Should not fail on valid options
  ay yo prod-cycle --help
  assert_exit_code 0
}

test_prod_cycle_validates_arguments() {
  # Should fail on invalid arguments
  ay yo prod-cycle --invalid-flag 2>&1 | grep -q "Invalid"
  assert_exit_code 1
}
```

**Implementation:**
- Add `prod-cycle` case to `scripts/ay-yo`
- Parse options: `--circles`, `--analyze`, `--report-only`
- Validate arguments with clear error messages

**Acceptance Test:**
```bash
ay yo prod-cycle --circles orchestrator,assessor
```

---

#### **1.2 Integrate Existing Scripts** (2 hours)
**Test First:**
```bash
# tests/integration/test_prod_cycle_integration.sh
test_prod_cycle_calls_wsjf_runner() {
  mock_script "scripts/ay-wsjf-runner.sh"
  ay yo prod-cycle --circles orchestrator
  assert_script_called "ay-wsjf-runner.sh" "balance"
}

test_prod_cycle_calls_convergence_report() {
  ay yo prod-cycle --circles orchestrator
  assert_file_exists ".goalie/convergence_report_*.md"
}

test_prod_cycle_respects_dor_budgets() {
  ay yo prod-cycle --circles orchestrator
  assert_file_contains "config/dor-budgets.json" "orchestrator"
}
```

**Implementation:**
- Call `ay-wsjf-runner.sh balance`
- Call `ay-prod-cycle-with-dor.sh` if DoR budgets exist
- Generate convergence report
- Log to `.goalie/prod_cycle_runs.jsonl`

**Integration Points:**
```bash
ay yo prod-cycle \
  -> ay-wsjf-runner.sh balance 15 \
  -> ay-prod-learn-loop.sh --analyze 20 \
  -> generate_convergence_report() \
  -> validate_dor_compliance()
```

---

#### **1.3 Convergence Reporting** (3 hours)
**Test First:**
```python
# tests/unit/test_convergence_calculator.py
def test_convergence_score_calculation():
    metrics = {
        "circle_equity": 0.85,
        "success_rate": 0.90,
        "proficiency": 0.75,
        "wsjf_stability": 0.80
    }
    score = calculate_convergence(metrics)
    assert 0.82 <= score <= 0.84  # Expected: 0.825

def test_convergence_threshold_detection():
    assert is_production_ready(0.85) == True
    assert is_production_ready(0.84) == False
    assert is_optimal(0.90) == True
```

**Implementation:**
- Python module: `scripts/lib/convergence.py`
- Formula: `(equity*0.25 + success*0.35 + prof*0.20 + wsjf*0.20)`
- Thresholds: 0.70 (operational), 0.85 (prod-ready), 0.90 (optimal)
- Output: `.goalie/convergence_report_TIMESTAMP.md`

**Report Template:**
```markdown
# Convergence Report - 2026-01-08

## Score: 0.87 🟢 PRODUCTION READY

### Component Breakdown:
- Circle Equity: 0.85 (25% weight)
- Success Rate: 0.90 (35% weight)
- Proficiency: 0.75 (20% weight)
- WSJF Stability: 0.80 (20% weight)

### Recommendations:
- ✅ Deploy to production
- ⚠️ Monitor proficiency metrics
```

---

#### **1.4 DoR/DoD Budget Enforcement** (2 hours)
**Test First:**
```bash
# tests/unit/test_dor_budget_validator.sh
test_dor_budget_loads_config() {
  validate_dor_config "config/dor-budgets.json"
  assert_exit_code 0
}

test_ceremony_respects_time_budget() {
  # Mock ceremony that takes 6 minutes
  timeout 6m mock_ceremony "orchestrator" "standup"
  # Should fail (budget is 5 min)
  assert_exit_code 124  # timeout exit code
}

test_budget_violation_logged() {
  run_ceremony_with_timeout "orchestrator" "standup"
  assert_file_contains ".goalie/budget_violations.jsonl" "orchestrator"
}
```

**Implementation:**
- Load `config/dor-budgets.json` at ceremony start
- Wrap ceremony execution with `timeout` command
- Log violations to `.goalie/budget_violations.jsonl`
- Report in convergence output

---

## 🔒 Feature 2: Break-Glass Audit Logging

### **Task Breakdown:**

#### **2.1 Destructive Operation Detection** (1 hour)
**Test First:**
```bash
# tests/unit/test_break_glass_detection.sh
test_detects_destructive_package_install() {
  is_destructive "apt-get install redis"
  assert_exit_code 0
}

test_detects_destructive_service_restart() {
  is_destructive "systemctl restart docker"
  assert_exit_code 0
}

test_allows_safe_read_operations() {
  is_destructive "kubectl get pods"
  assert_exit_code 1  # Not destructive
}
```

**Implementation:**
```bash
# scripts/lib/break_glass.sh
is_destructive() {
  local command="$1"
  case "$command" in
    *"install"*|*"restart"*|*"rm -rf"*|*"disable"*|*"stop"*)
      return 0  # Destructive
      ;;
    *)
      return 1  # Safe
      ;;
  esac
}
```

**Destructive Patterns:**
- Package management: `apt-get install`, `yum install`, `pip install`
- Service control: `systemctl restart/stop/disable`
- File operations: `rm -rf`, `mv` to critical paths
- Runtime changes: `disable docker`, `modify kubeconfig`

---

#### **2.2 Environment Variable Gating** (1 hour)
**Test First:**
```bash
# tests/integration/test_break_glass_gate.sh
test_blocks_destructive_op_without_flag() {
  unset AF_BREAK_GLASS
  ay yo stx install-package redis 2>&1 | grep -q "BLOCKED"
  assert_exit_code 1
}

test_requires_reason_field() {
  AF_BREAK_GLASS=1 ay yo stx install-package redis 2>&1 \
    | grep -q "AF_BREAK_GLASS_REASON"
  assert_exit_code 1
}

test_allows_with_full_context() {
  AF_BREAK_GLASS=1 \
  AF_BREAK_GLASS_REASON="Redis needed for caching layer" \
  AF_CHANGE_TICKET="JIRA-1234" \
    ay yo stx install-package redis
  assert_exit_code 0
}
```

**Implementation:**
```bash
check_break_glass() {
  local operation="$1"
  
  if is_destructive "$operation"; then
    if [[ "${AF_BREAK_GLASS:-0}" != "1" ]]; then
      log_audit_denial "$operation"
      echo "🚨 BLOCKED: Destructive operation requires break-glass approval"
      echo ""
      echo "To proceed, set:"
      echo "  export AF_BREAK_GLASS=1"
      echo "  export AF_BREAK_GLASS_REASON='<reason>'"
      echo "  export AF_CHANGE_TICKET='<ticket-id>'"
      echo ""
      echo "Then re-run: $operation"
      exit 1
    fi
    
    # Validate required context
    if [[ -z "${AF_BREAK_GLASS_REASON:-}" ]]; then
      echo "🚨 BLOCKED: AF_BREAK_GLASS_REASON required"
      exit 1
    fi
    
    log_audit_approval "$operation"
  fi
}
```

---

#### **2.3 Audit Trail Persistence** (2 hours)
**Test First:**
```python
# tests/unit/test_audit_logger.py
def test_audit_log_structure():
    entry = create_audit_entry(
        operation="systemctl restart docker",
        user="admin",
        approved=True,
        reason="Emergency fix for hung containers",
        ticket="OPS-789"
    )
    
    assert entry["operation"] == "systemctl restart docker"
    assert entry["approved"] == True
    assert entry["timestamp"] is not None
    assert "reason" in entry
    assert "ticket" in entry

def test_audit_log_appends():
    log_audit_approval("test operation")
    log_audit_approval("another operation")
    
    with open(".goalie/break_glass_audit.jsonl") as f:
        lines = f.readlines()
        assert len(lines) == 2
```

**Implementation:**
```bash
# scripts/lib/audit_logger.sh
log_audit_approval() {
  local operation="$1"
  local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
  
  cat >> .goalie/break_glass_audit.jsonl <<EOF
{"timestamp":"$timestamp","operation":"$operation","approved":true,"user":"$(whoami)","reason":"${AF_BREAK_GLASS_REASON:-}","ticket":"${AF_CHANGE_TICKET:-}","host":"$(hostname)"}
EOF
}

log_audit_denial() {
  local operation="$1"
  local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
  
  cat >> .goalie/break_glass_audit.jsonl <<EOF
{"timestamp":"$timestamp","operation":"$operation","approved":false,"user":"$(whoami)","host":"$(hostname)"}
EOF
}
```

**Audit Log Schema:**
```json
{
  "timestamp": "2026-01-08T21:08:43Z",
  "operation": "systemctl restart docker",
  "approved": true,
  "user": "admin",
  "reason": "Emergency container fix",
  "ticket": "OPS-789",
  "host": "stx-aio-0.corp.interface.tag.ooo"
}
```

---

#### **2.4 CI Compatibility** (1 hour)
**Test First:**
```yaml
# .github/workflows/test-break-glass.yml
name: Break Glass Tests
on: [push]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Test break-glass blocks without approval
        run: |
          ./scripts/ay yo stx restart-service docker 2>&1 | grep -q "BLOCKED"
          test $? -eq 0
      - name: Test break-glass allows with approval
        env:
          AF_BREAK_GLASS: 1
          AF_BREAK_GLASS_REASON: "CI test"
          AF_CHANGE_TICKET: "CI-AUTO"
        run: |
          # Should not block in CI with proper env vars
          echo "Test would run here"
```

**Implementation:**
- No interactive prompts
- All validation via env vars
- Clear error messages with remediation steps
- Exit codes: 0 (allowed), 1 (blocked)

---

## 🧪 Feature 3: Test Suite Foundation

### **Task Breakdown:**

#### **3.1 Test Framework Setup** (1 hour)
**Tools:**
- **bash-unit**: Shell script unit tests
- **pytest**: Python test runner
- **bats**: Bash Automated Testing System

**Directory Structure:**
```
tests/
├── unit/
│   ├── test_convergence_calculator.py
│   ├── test_dor_budget_validator.sh
│   └── test_break_glass_detection.sh
├── integration/
│   ├── test_prod_cycle_integration.sh
│   ├── test_hook_chains.sh
│   └── test_episode_storage.sh
├── e2e/
│   ├── test_full_prod_cycle.sh
│   └── test_convergence_reporting.sh
├── fixtures/
│   ├── sample_dor_budgets.json
│   └── mock_episode_data.json
└── helpers/
    ├── assertions.sh
    └── mocks.sh
```

---

#### **3.2 Coverage Tooling** (1 hour)
**Bash Coverage:**
```bash
# Use kcov for bash coverage
kcov --exclude-pattern=/usr coverage/ ./scripts/ay-yo prod-cycle
```

**Python Coverage:**
```bash
pytest --cov=scripts/lib --cov-report=html --cov-report=term
```

**Coverage Gates:**
```yaml
# .github/workflows/coverage.yml
- name: Check coverage
  run: |
    coverage report --fail-under=80
```

---

#### **3.3 CI Integration** (2 hours)
**GitHub Actions Workflow:**
```yaml
# .github/workflows/phase1-tests.yml
name: Phase 1 Test Suite
on: [push, pull_request]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run unit tests
        run: |
          cd tests/unit
          bash-unit test_*.sh
          pytest test_*.py
  
  integration-tests:
    runs-on: ubuntu-latest
    needs: unit-tests
    steps:
      - uses: actions/checkout@v3
      - name: Run integration tests
        run: |
          cd tests/integration
          bats test_*.sh
  
  e2e-tests:
    runs-on: ubuntu-latest
    needs: integration-tests
    steps:
      - uses: actions/checkout@v3
      - name: Run E2E tests
        run: |
          cd tests/e2e
          ./test_full_prod_cycle.sh
  
  coverage:
    runs-on: ubuntu-latest
    needs: [unit-tests, integration-tests]
    steps:
      - uses: actions/checkout@v3
      - name: Generate coverage report
        run: |
          kcov --exclude-pattern=/usr coverage/ ./scripts/ay-yo prod-cycle
          pytest --cov=scripts/lib --cov-report=json
      - name: Upload to Codecov
        uses: codecov/codecov-action@v3
```

---

## 📅 Sprint 1 Timeline

### **Day 1: Setup & Planning**
- [ ] Review WSJF backlog
- [ ] Set up test framework
- [ ] Create test templates
- [ ] Initialize `.goalie/` structure

### **Day 2: Feature 1 (ay yo prod-cycle)**
- [ ] Task 1.1: CLI interface + tests
- [ ] Task 1.2: Script integration + tests
- [ ] Task 1.3: Convergence reporting + tests

### **Day 3: Feature 2 (Break-Glass)**
- [ ] Task 2.1: Destructive op detection + tests
- [ ] Task 2.2: Env var gating + tests
- [ ] Task 2.3: Audit logging + tests
- [ ] Task 2.4: CI compatibility + tests

### **Day 4: Feature 3 (Test Suite)**
- [ ] Task 3.1: Framework setup
- [ ] Task 3.2: Coverage tooling
- [ ] Task 3.3: CI integration

### **Day 5: Integration & Polish**
- [ ] Run full test suite
- [ ] Fix failures
- [ ] Update documentation
- [ ] Demo to stakeholders

---

## 🎯 Success Criteria

### **Functional:**
- [ ] `ay yo prod-cycle` completes successfully
- [ ] Convergence score calculated correctly
- [ ] Break-glass blocks destructive ops without approval
- [ ] Audit trail persisted to `.goalie/`
- [ ] All tests pass in CI

### **Non-Functional:**
- [ ] Test coverage >80%
- [ ] Zero security vulnerabilities
- [ ] Documentation updated
- [ ] Performance: prod-cycle completes in <5 minutes

### **Operational:**
- [ ] Can deploy to production
- [ ] Rollback procedure documented
- [ ] Monitoring alerts configured
- [ ] Team trained on new commands

---

## 🚀 Deployment Checklist

### **Pre-Deployment:**
- [ ] All tests green in CI
- [ ] Code review approved
- [ ] Documentation reviewed
- [ ] Rollback plan documented

### **Deployment:**
```bash
# 1. Backup current state
cp scripts/ay-yo scripts/ay-yo.backup

# 2. Deploy new version
git checkout main
git pull origin main

# 3. Verify installation
ay yo --help | grep prod-cycle
ay yo prod-cycle --help

# 4. Run smoke tests
ay yo prod-cycle --circles orchestrator --report-only
```

### **Post-Deployment:**
- [ ] Verify convergence reports generated
- [ ] Check audit logs created
- [ ] Monitor for errors in `.goalie/`
- [ ] Gather user feedback

### **Rollback (if needed):**
```bash
cp scripts/ay-yo.backup scripts/ay-yo
git revert <commit-hash>
```

---

## 📊 Metrics to Track

### **Development Metrics:**
- Test count: Unit/Integration/E2E
- Coverage percentage
- Build time
- Test execution time

### **Operational Metrics:**
- Convergence score trend
- DoR budget compliance rate
- Break-glass approval rate
- Ceremony execution time

### **Business Metrics:**
- Developer productivity (ceremonies/day)
- Deployment frequency
- Mean time to convergence
- Incident reduction rate

---

## 📝 Notes

- **Test-first is non-negotiable** - Write failing tests before implementation
- **Keep tests fast** - Unit tests <1s, integration <10s, E2E <60s
- **Use fixtures** - Don't hit real APIs in tests
- **Mock external dependencies** - Isolate what you're testing
- **Document test scenarios** - Future developers will thank you

---

**Next Action:** Begin Day 1 tasks - Set up test framework and create test templates.
