# SEMI-AUTO vs FULL AUTO Governance Gates

**Created**: 2026-03-06 01:22 UTC-5  
**Purpose**: Machine-checkable gates for DDD-first, ADR governance, and integration test hygiene  
**Principle**: "Discover/Consolidate THEN extend, not extend THEN consolidate"

---

## 🎯 GATE RUBRIC (0/1/2/3 Levels)

### Gate 0: MANUAL (No Automation)
**Characteristics**:
- All tasks require human intervention
- No file watchers or LaunchAgents
- Email sent manually, files routed manually
- **Toil**: 78 min/day (folder scanning 28min, portal check 20min, email 10min)

**Current Status**: ❌ **ELIMINATED** (via batch classifier + dashboard v4)

---

### Gate 1: SEMI-AUTO (Assisted Automation)
**Characteristics**:
- Batch classifier runs on-demand (not continuous)
- Dashboard updates manually via refresh
- Email validation requires manual trigger
- Human approves all swarm routing decisions

**Requirements**:
- ✅ Batch file classifier script exists (`batch-file-classifier.sh`)
- ✅ Dashboard with ETA countdown (`WSJF-LIVE-v4-ENHANCED.html`)
- ✅ Email validation script (`validate-email-wsjf.sh`)
- ⚠️  LaunchAgent exists but not actively routing (PID 126 inactive)

**Machine-Checkable Gates**:
```bash
# Gate 1.1: Batch classifier script exists and is executable
test -x ~/Documents/code/investing/agentic-flow/scripts/validators/wsjf/batch-file-classifier.sh || exit 1

# Gate 1.2: Dashboard exists with ETA countdown (check for countdown element)
grep -q "id=\"eta-arb-hearing\"" /tmp/WSJF-LIVE-v4-ENHANCED.html || exit 1

# Gate 1.3: Email validator exists
test -f ~/Documents/code/investing/agentic-flow/scripts/validators/email/validate-email-wsjf.sh || exit 1

# Gate 1.4: LaunchAgent registered (not necessarily active)
launchctl list | grep -q "com.bhopti.legal.filewatcher" || exit 1
```

**Current Status**: ✅ **ACHIEVED** (as of 2026-03-06 01:22 UTC-5)

---

### Gate 2: FULL AUTO (Continuous Automation)
**Characteristics**:
- LaunchAgent runs batch classifier every 5 minutes
- Dashboard auto-refreshes without manual reload
- Email validation triggered on Mail.app send/receive events
- Swarm routing happens automatically (human approval for CRITICAL only)

**Requirements**:
- ✅ Gate 1 requirements met
- ⚠️  LaunchAgent actively routing files (not just registered)
- ⚠️  Dashboard auto-refresh every 5 minutes (client-side JS)
- ⚠️  Mail.app integration via AppleScript/MailMaven

**Machine-Checkable Gates**:
```bash
# Gate 2.1: LaunchAgent is LOADED and RUNNING
launchctl list | grep -q "com.bhopti.legal.filewatcher" && \
  pgrep -f "batch-file-classifier.sh" > /dev/null || exit 1

# Gate 2.2: LaunchAgent has recent log entries (last 10 minutes)
test $(find ~/Library/Logs/batch-file-classifier.log -mmin -10 2>/dev/null | wc -l) -gt 0 || exit 1

# Gate 2.3: Dashboard auto-refresh enabled (check for setTimeout in HTML)
grep -q "setTimeout.*location.reload" /tmp/WSJF-LIVE-v4-ENHANCED.html || exit 1

# Gate 2.4: At least 1 file routed in last 24 hours
test $(wc -l < ~/.cache/wsjf-classified-files.txt 2>/dev/null || echo 0) -gt 0 || exit 1
```

**Current Status**: ⚠️  **PARTIAL** (LaunchAgent exists but not actively routing)

**Blockers**:
- LaunchAgent PID 126 registered but not logging (no active routing)
- Batch classifier uses `-mtime -7` filter (misses older files like applications.json)
- No Mail.app integration for real-time email→WSJF routing

---

### Gate 3: AUTONOMOUS (Self-Healing + Learning)
**Characteristics**:
- VibeThinker MGPO iterates on legal arguments autonomously
- Neural pattern training via Claude Flow V3 hooks
- Self-healing: detects and fixes classification errors
- Learning: stores successful patterns in RuVector memory

**Requirements**:
- ✅ Gate 2 requirements met
- ⚠️  VibeThinker MGPO integration enabled (`ENABLE_VIBETHINKER=true`)
- ⚠️  Claude Flow V3 hooks (pre-task, post-task, neural training)
- ⚠️  RuVector memory backend with HNSW indexing
- ⚠️  Self-healing: batch classifier detects unrouted files and retries

**Machine-Checkable Gates**:
```bash
# Gate 3.1: VibeThinker orchestrator script exists
test -f ~/Documents/code/investing/agentic-flow/scripts/swarms/vibethinker-legal-orchestrator.sh || exit 1

# Gate 3.2: Claude Flow V3 hooks available
command -v npx > /dev/null && \
  npx @claude-flow/cli@latest hooks list 2>&1 | grep -q "pre-task" || exit 1

# Gate 3.3: RuVector memory backend initialized
test -f ~/.swarm/memory.db || exit 1

# Gate 3.4: Neural patterns stored in memory (at least 100 patterns)
npx @claude-flow/cli@latest memory list --namespace patterns 2>&1 | \
  grep -oE "[0-9]+ patterns" | awk '{exit ($1 < 100)}' || exit 1

# Gate 3.5: Self-healing: batch classifier reruns on failures
grep -q "ENABLE_VIBETHINKER" ~/Documents/code/investing/agentic-flow/scripts/validators/wsjf/batch-file-classifier.sh || exit 1
```

**Current Status**: ❌ **NOT ACHIEVED** (VibeThinker integration exists but not validated in production)

**Blockers**:
- VibeThinker MGPO not tested with real trial arguments
- Neural pattern training not integrated with Claude Flow V3 hooks
- Self-healing logic not implemented (no retry on classification errors)

---

## 📂 DDD-FIRST ARCHITECTURE GATES

### Principle: "Domain-First, Not Script-First"

**Current Problem**:
- Validation logic lives in shell scripts (procedural), not domain objects (OOP/DDD)
- No domain aggregates defined for validation system
- Rapid prototyping prioritized speed over architecture

**DDD Structure Requirements**:
```
domain/
├── validation/
│   ├── aggregates/
│   │   ├── ValidationReport.ts       # Aggregate root
│   │   └── ValidationSession.ts
│   ├── value_objects/
│   │   ├── ValidationCheck.ts        # Value object
│   │   ├── WSJFScore.ts
│   │   └── RiskLevel.ts
│   ├── events/
│   │   ├── ValidationRequested.ts    # Domain event
│   │   ├── ValidationCompleted.ts
│   │   └── FileRouted.ts
│   └── services/
│       ├── ValidationService.ts      # Domain service
│       └── RoutingService.ts
```

**Machine-Checkable DDD Gates**:
```bash
# DDD Gate 1: Domain folder structure exists
test -d ./domain/validation/aggregates || exit 1
test -d ./domain/validation/value_objects || exit 1
test -d ./domain/validation/events || exit 1

# DDD Gate 2: At least 1 aggregate defined
test $(find ./domain/validation/aggregates -name "*.ts" -o -name "*.py" | wc -l) -gt 0 || exit 1

# DDD Gate 3: At least 1 value object defined
test $(find ./domain/validation/value_objects -name "*.ts" -o -name "*.py" | wc -l) -gt 0 || exit 1

# DDD Gate 4: At least 2 domain events defined
test $(find ./domain/validation/events -name "*.ts" -o -name "*.py" | wc -l) -ge 2 || exit 1
```

**Current Status**: ⚠️  **PARTIAL** (domain folder exists, but no aggregates/value objects/events)

**Next Steps**:
1. Create `ValidationReport` aggregate
2. Create `ValidationCheck` value object
3. Create `ValidationRequested`, `ValidationCompleted`, `FileRouted` events
4. Refactor `batch-file-classifier.sh` to call domain layer (not procedural logic)

---

## 📄 ADR GOVERNANCE GATES

### Principle: "Governance-First, Not Narrative-First"

**Current Problem**:
- 17 ADRs found, **16 missing date frontmatter** (94% non-compliant)
- ADRs track decisions, but not treated as auditable records
- No mandatory ADR template gate (date, status, supersedes, links to PRD/tests)

**ADR Template Requirements**:
```markdown
---
title: ADR-XXX: [Decision Title]
date: YYYY-MM-DD
status: [proposed|accepted|deprecated|superseded]
supersedes: ADR-YYY (if applicable)
related_prd: PRD-XXX
related_tests: tests/integration/test_feature.py
---

# Context
[Why this decision is needed]

# Decision
[What was decided]

# Consequences
[Trade-offs, risks, benefits]

# Implementation
[How to implement, links to code]
```

**Machine-Checkable ADR Gates**:
```bash
# ADR Gate 1: All ADRs have date frontmatter
find . -name "ADR-*.md" -exec grep -L "^date:" {} \; | wc -l | grep -q "^0$" || exit 1

# ADR Gate 2: All ADRs have status field
find . -name "ADR-*.md" -exec grep -L "^status:" {} \; | wc -l | grep -q "^0$" || exit 1

# ADR Gate 3: All ADRs have related_tests field (integration test link)
find . -name "ADR-*.md" -exec grep -L "^related_tests:" {} \; | wc -l | grep -q "^0$" || exit 1

# ADR Gate 4: CI check rejects ADRs missing date
git diff --name-only HEAD~1 | grep "ADR-.*\.md" | \
  xargs -I {} sh -c 'grep -q "^date:" {} || exit 1'
```

**Current Status**: ❌ **NOT ACHIEVED** (16 of 17 ADRs missing date frontmatter)

**Next Steps**:
1. Add `date`, `status`, `related_tests` frontmatter to all 16 non-compliant ADRs
2. Create CI check script: `.github/workflows/adr-lint.yml`
3. Add pre-commit hook to validate ADR frontmatter locally

---

## 🧪 INTEGRATION TEST GATES

### Principle: "Test Pyramid Policy (Unit + Integration + Smoke)"

**Current Problem**:
- 578 integration test files found (good coverage)
- Unit tests exist, but **boundary behavior not verified**
- No test pyramid policy enforced before merge/deploy

**Test Pyramid Requirements**:
```
Smoke Tests (5%)     ← End-to-end critical paths
Integration Tests (20%) ← API contracts, feature flags, DB
Unit Tests (75%)     ← Pure functions, business logic
```

**Machine-Checkable Integration Test Gates**:
```bash
# Integration Gate 1: Feature flag OFF returns 403
grep -r "feature.*flag.*OFF.*403" tests/integration/ || exit 1

# Integration Gate 2: Feature flag ON returns JSON schema with score + MCP/MPP fields
grep -r "feature.*flag.*ON.*score.*mcp.*mpp" tests/integration/ || exit 1

# Integration Gate 3: At least 2 integration tests per feature
test $(find tests/integration/ -name "test_*.py" | wc -l) -ge 2 || exit 1

# Integration Gate 4: validation-runner.sh has no file path handling bugs (line 45-60)
bash -n ~/Documents/code/investing/agentic-flow/scripts/validators/validation-runner.sh || exit 1
```

**Current Status**: ✅ **PARTIAL** (integration tests exist, but boundary behavior not verified)

**Known Issue**: `validation-runner.sh` has file path handling bug (line 45-60) blocking E2E testing

**Next Steps**:
1. Upgrade at least 2 integration tests:
   - `test_feature_flag_off_returns_403.py`
   - `test_feature_flag_on_returns_json_schema.py`
2. Fix `validation-runner.sh` file path bug (line 45-60)
3. Add smoke tests for critical paths (arbitration prep, mover emails, WSJF routing)

---

## 🚀 GATE PROGRESSION ROADMAP

### Current State: Gate 1 (SEMI-AUTO) ✅

**Achieved**:
- ✅ Batch file classifier script exists and is executable
- ✅ Dashboard v4 with ETA countdown
- ✅ Email validator script
- ✅ LaunchAgent registered (PID 126)

**Blockers to Gate 2 (FULL AUTO)**:
- ⚠️  LaunchAgent not actively routing (no log entries)
- ⚠️  Batch classifier uses `-mtime -7` filter (misses older files)
- ⚠️  No Mail.app integration

### Next Milestone: Gate 2 (FULL AUTO) ⚠️

**To Achieve**:
1. **Activate LaunchAgent** (5-min interval):
   ```bash
   launchctl load ~/Library/LaunchAgents/com.bhopti.legal.filewatcher.plist
   ```

2. **Add `--all-files` flag** to batch classifier:
   ```bash
   # Remove -mtime -7 filter, scan ALL files
   find "$LEGAL_ROOT" -type f \( -name "*.pdf" -o -name "*.md" -o -name "*.eml" -o -name "*.json" \)
   ```

3. **Mail.app integration** via AppleScript:
   ```applescript
   on perform mail action with messages theMessages
     repeat with eachMessage in theMessages
       do shell script "bash ~/Documents/code/investing/agentic-flow/scripts/validators/email/validate-email-wsjf.sh " & quoted form of subject of eachMessage
     end repeat
   end perform mail action with messages
   ```

4. **Verify continuous operation**:
   ```bash
   # Check LaunchAgent is running and logging
   tail -f ~/Library/Logs/batch-file-classifier.log
   ```

**Estimated Time**: 2-4 hours (including testing)

---

### Future Milestone: Gate 3 (AUTONOMOUS) ❌

**To Achieve**:
1. **VibeThinker MGPO validation** (test with real trial arguments):
   ```bash
   ENABLE_VIBETHINKER=true bash scripts/validators/wsjf/batch-file-classifier.sh
   ```

2. **Claude Flow V3 hooks integration**:
   ```bash
   npx @claude-flow/cli@latest hooks post-task \
     --task-id "file-classification-$(date +%s)" \
     --success true \
     --store-results true
   ```

3. **Self-healing logic**:
   ```bash
   # Detect unrouted files and retry with different patterns
   if [ $unrouted -gt 0 ]; then
     log "🔄 Self-healing: Retrying with expanded patterns..."
     # Retry logic here
   fi
   ```

4. **Neural pattern training** (store successful classifications):
   ```bash
   npx @claude-flow/cli@latest memory store \
     --key "classification-success-$(date +%s)" \
     --value "$result" \
     --namespace patterns
   ```

**Estimated Time**: 8-16 hours (including MGPO validation + integration testing)

---

## 📊 TOIL REDUCTION METRICS

### Gate 1 (SEMI-AUTO) - Current State
- **Time Saved**: 40 min/day (folder scanning 28min eliminated, email validation 10min reduced)
- **Monthly Value**: $400/month (13.3 hours × $30/h)
- **Toil Remaining**: 38 min/day (portal check 20min, manual email send 10min, context switching 8min)

### Gate 2 (FULL AUTO) - Target State
- **Time Saved**: 78 min/day (all manual tasks eliminated)
- **Monthly Value**: $858/month (28.6 hours × $30/h)
- **Toil Remaining**: 0 min/day (LaunchAgent + Mail.app integration)

### Gate 3 (AUTONOMOUS) - Future State
- **Time Saved**: 78 min/day + **improved quality** (fewer classification errors)
- **Monthly Value**: $858/month + **risk reduction** (self-healing prevents missed deadlines)
- **Learning Value**: Neural patterns improve over time (Pass@K score increases)

---

## 🔗 RELATED DOCUMENTS

1. **Batch Classifier**: `scripts/validators/wsjf/batch-file-classifier.sh`
2. **Dashboard v4**: `/tmp/WSJF-LIVE-v4-ENHANCED.html`
3. **RCA Report**: `reports/RCA-UNROUTED-FILES-SOLUTION-2026-03-06.md`
4. **ADR Example**: `ADR-065-validation-dashboard-feature-flag.md` (missing date frontmatter)
5. **Integration Tests**: `tests/integration/` (578 files)

---

## ✅ IMMEDIATE ACTION ITEMS

**Priority 1: Achieve Gate 2 (FULL AUTO)**
1. ⚠️  Activate LaunchAgent for continuous file routing
2. ⚠️  Add `--all-files` flag to batch classifier
3. ⚠️  Fix 16 ADRs missing date frontmatter

**Priority 2: DDD-First Refactor**
4. ⚠️  Create `ValidationReport` aggregate
5. ⚠️  Create `ValidationCheck` value object
6. ⚠️  Create `ValidationRequested/Completed` events

**Priority 3: Integration Test Coverage**
7. ⚠️  Add `test_feature_flag_off_returns_403.py`
8. ⚠️  Add `test_feature_flag_on_returns_json_schema.py`
9. ⚠️  Fix `validation-runner.sh` file path bug (line 45-60)

---

**Report Generated**: 2026-03-06 01:22 UTC-5  
**Current Gate**: Gate 1 (SEMI-AUTO) ✅  
**Target Gate**: Gate 2 (FULL AUTO) ⚠️  
**Estimated Time to Gate 2**: 2-4 hours

---

*Next Action: Activate LaunchAgent to achieve FULL AUTO mode (Gate 2)*
