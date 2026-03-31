# DPC-Driven Validation Consolidation Action Plan
**Date**: February 28, 2026 02:25 UTC  
**DPC Current**: **63** (%/# = 100%, R(t) = 63%)  
**DPC Target**: **95** (%/# = 100%, R(t) = 95%)

---

## TL;DR: **USE FIRST, EXTEND LATER**

**Comprehensive stack WORKS** (9/9 validators pass = 100% coverage):
- ✅ File-level: 5/5 pass (pre-send-email-gate.sh, validation-runner.sh, etc.)
- ✅ Project-level: 4/4 pass (unified-validation-mesh.sh, validate_coherence.py, etc.)
- ⚠️ **Robustness: 63%** (7/11 implemented, 4 stubs/deferred)

**Inversion Strategy**:
1. ✅ **USE comprehensive stack NOW** (compare-all-validators.sh works!)
2. ⏳ **FIX gaps during execution** (not planning)
3. 🎯 **EXTEND post-Trial #1** (with time + money)

---

## DPC Metrics Explained

### One Constant: DPC_R(t) = %/# × R(t)

**Components**:
- **%/#** (State): Discrete coverage = passed/total validators
- **%.#** (Velocity): Rate of change = Δcoverage/Δtime
- **R(t)** (Robustness): Anti-fragility = implemented/declared checks
- **T** (Time): Deadline pressure = T_trial - T_now

**Physics Analogy**:
- **%/#**: Quantum states (countable quanta) - "3/5 validators pass"
- **%.#**: Velocity (continuous) - "+20%/min fixing rate"
- **R(t)**: Implementation integrity - "75% real, 25% stubs"
- **4D Progress Vector**: [coverage, velocity, time_remaining, robustness]

**Current State**:
```
Progress[now] = [
  100%,       // %/# coverage (9/9 validators pass)
  0%/min,     // %.# velocity (no changes in last 89 min)
  4 days,     // T_remaining (Trial #1 on March 3)
  63%         // R(t) robustness (7/11 implemented)
]

DPC_R(now) = 100% × 63% = 63
```

**Target State** (Post-Consolidation):
```
Progress[target] = [
  100%,       // %/# coverage (9/9 validators pass)
  +10%/min,   // %.# velocity (active fixing)
  4 days,     // T_remaining (unchanged)
  95%         // R(t) robustness (10/11 implemented)
]

DPC_R(target) = 100% × 95% = 95
```

---

## Current Architecture (WORKING)

### Core Stack (Pure Functions)
**File**: `validation-core.sh` (23K, 337 lines DDD aggregate)
- Pure functions: `validate_email_aggregate()`, `check_file_exists()`, `compute_file_hash()`
- CLI mode: `./validation-core.sh email --file <path> --check all --json`
- Exit codes: 0 (pass), 1 (fail), 2 (warn), 3 (deps missing)
- **Status**: ✅ IMPLEMENTED (R = 1.0)

### Orchestration (Thin Wrapper)
**File**: `validation-runner.sh` (3.1K)
- Sources `validation-core.sh`
- Aggregates exit codes
- Prints summary verdict
- **Status**: ✅ IMPLEMENTED (R = 1.0)

### Comparison (Truth Report)
**File**: `compare-all-validators.sh` (16K)
- Runs ALL 9 validators (5 file-level + 4 project-level)
- Generates `CONSOLIDATION-TRUTH-REPORT.md`
- Reports DPC metrics (%/#, R(t), %.#)
- **Status**: ✅ IMPLEMENTED (R = 1.0)

### Comprehensive Orchestrator
**File**: `comprehensive-wholeness-validator.sh` (14K)
- 5 validation layers (email, circles, governance, coherence, PI sync)
- 7 feature flags
- Auto-called by `.claude/settings.json`
- **Status**: ✅ IMPLEMENTED (R = 1.0)

### Unified Mesh
**File**: `unified-validation-mesh.sh` (17K)
- TDD/VDD/DDD/ADR/PRD patterns
- 8 feature flags
- Cyclic regression protection
- **Status**: ✅ IMPLEMENTED (R = 1.0)

### Email Gates
**File**: `pre-send-email-gate.sh` (9.9K, Phase 1)
- 5-section gate (core, ROAM, legal, recipients, quality)
- Exit codes: 0/1/2
- **Status**: ✅ IMPLEMENTED (R = 1.0)

**File**: `email-validation-fixes.sh` (11K, NOW phase)
- 6 missing functions (validate_required_recipients, etc.)
- HTML generation
- Attachment encoding
- **Status**: ✅ IMPLEMENTED (R = 1.0)

---

## Stubs / Deferred (Lowering R(t))

### 1. RAG/AgentDB Vector Storage (R = 0.0)
**Status**: Feature flag exists, no actual RAG
**Location**: `unified-validation-mesh.sh` line 43
```bash
export FEATURE_ATTACHMENT_VERIFICATION="${FEATURE_ATTACHMENT_VERIFICATION:-true}"
# ❌ No AgentDB vector storage implementation
```

**Fix** (LATER phase - post-trial):
- Integrate `agentic-qe@latest` fleet orchestration
- Add AgentDB embedding for validation patterns
- Use `ruvector-domain-expansion` for cross-domain transfer

**WSJF**: 5.0 (low time criticality, high effort)

---

### 2. LLMLingua Compression (R = 0.0)
**Status**: Token budget exists, no KV cache
**Location**: None (no code found)

**Fix** (LATER phase):
- Add LLMLingua compression for large email bodies
- Implement KV cache for repeated validation patterns

**WSJF**: 3.0 (low criticality, deferred)

---

### 3. LazyLLM Pruning (R = 0.0)
**Status**: No code
**Location**: None

**Fix** (LATER phase):
- Add LazyLLM pruning for token efficiency

**WSJF**: 2.0 (low criticality, deferred)

---

### 4. BE Tokens (R = 0.0)
**Status**: Unclear what "BE tokens" refers to
**Location**: None

**Fix**: Clarify requirement, defer

**WSJF**: 1.0 (unclear priority)

---

## Exit Code Convention (STANDARDIZED)

All validators follow same convention:
- **0**: PASS (all checks passed)
- **1**: BLOCKER (critical failure, must fix)
- **2**: WARNING (passed with warnings, review recommended)
- **3**: DEPS_MISSING (required tools not installed)

**Verified in**:
- `validation-core.sh` (lines 18-23)
- `pre-send-email-gate.sh` (lines 11-14)
- `email-validation-fixes.sh` (NOW phase)

---

## Semi-Auto vs Full-Auto Modes

### Semi-Auto (NOW - Trial Prep)
**Use Case**: Pre-send email validation during trial prep
**Duration**: ~1 sec
**Checks**: Core only (5 checks)
**Exit Code**: 0 on warnings (exit 2 → 0 conversion)
**CLI**:
```bash
advocate validate-email <file>
# OR
ay validate-email <file>
# OR
./scripts/validation-runner.sh <file>
```

**Features**:
- ✅ Placeholder detection
- ✅ Header validation
- ✅ Contact info
- ✅ Signature block
- ✅ Legal citations (NC statutes)

**Missing** (vs Full-Auto):
- ❌ Circle perspectives (27 roles)
- ❌ WSJF hygiene
- ❌ Coherence validation (COH-001 through COH-010)
- ❌ PI sync readiness

---

### Full-Auto (LATER - CI/CD)
**Use Case**: CI/CD pipeline, comprehensive validation
**Duration**: ~2 sec
**Checks**: Complete (15+ checks)
**Exit Code**: 2 on warnings (strict mode)
**JSON Output**: Yes
**CLI**:
```bash
advocate compare-validators [--latest] [files...]
# OR
./scripts/compare-all-validators.sh <file>
```

**Features**:
- ✅ All Semi-Auto checks
- ✅ Email formatting (inline CSS, UTF-8, subject length)
- ✅ Circle perspectives (27 roles)
- ✅ ROAM staleness check
- ✅ WSJF hygiene validation
- ✅ Coherence validation (COH-001 through COH-010)
- ✅ PI sync readiness
- ✅ ADR logging
- ✅ Cyclic regression protection
- ✅ Auto-fix (unified-validation-mesh.sh)
- ✅ Feature flags (8 domains)

---

## NOW Phase Actions (Next 30 min)

### Action 1: Create CLI Wrappers (15 min)

Create `advocate` CLI (or `ay` alias) for semi-auto mode:

```bash
#!/usr/bin/env bash
# advocate (or ay)
# Usage: advocate validate-email <file>

case "$1" in
  validate-email)
    /Users/shahroozbhopti/Documents/code/investing/agentic-flow/scripts/validation-runner.sh "$2"
    ;;
  compare-validators)
    shift
    /Users/shahroozbhopti/Documents/code/investing/agentic-flow/scripts/compare-all-validators.sh "$@"
    ;;
  *)
    echo "Usage: advocate validate-email <file> | compare-validators [--latest] [files...]"
    exit 1
    ;;
esac
```

**Install**:
```bash
cd /Users/shahroozbhopti/Documents/code/investing/agentic-flow/scripts
chmod +x advocate
ln -s advocate ay  # Alias for Amanda/Yacht
# Add to PATH or create symlinks in ~/.local/bin
```

---

### Action 2: Test End-to-End (10 min)

**Test Semi-Auto (NOW)**:
```bash
advocate validate-email /Users/shahroozbhopti/Documents/Personal/CLT/MAA/Uptown/BHOPTI-LEGAL/12-AMANDA-BECK-110-FRAZIER/SENT/EMAIL-POST-SIGNATURE-CONFIRMATION_2026-02-27.eml
```

**Expected Output**:
```
✅ PASS: Email validation complete (exit 0)
  - Placeholder Check: PASS
  - Email Headers: PASS
  - Contact Info: PASS
  - Signature Block: PASS
  - Legal Citations: N/A
```

**Test Full-Auto (Comparison)**:
```bash
advocate compare-validators /Users/shahroozbhopti/Documents/Personal/CLT/MAA/Uptown/BHOPTI-LEGAL/12-AMANDA-BECK-110-FRAZIER/SENT/EMAIL-POST-SIGNATURE-CONFIRMATION_2026-02-27.eml
```

**Expected Output**:
```
Report written to reports/CONSOLIDATION-TRUTH-REPORT.md
DPC_R(now) = 63 (100% coverage × 63% robustness)
```

---

### Action 3: Document DPC Tracking (5 min)

Create `docs/VALIDATION_METRICS_AND_PROGRESS.md`:

```markdown
# Validation Metrics and Progress (DPC)

## One Constant: DPC_R(t) = %/# × R(t)

### Components
- **%/#** (State): Discrete coverage = passed/total validators
- **%.#** (Velocity): Rate of change = Δcoverage/Δtime
- **R(t)** (Robustness): Anti-fragility = implemented/declared checks
- **T** (Time): Deadline pressure = T_trial - T_now

### Physics Analogy
- **%/#**: Quantum states (countable quanta)
- **%.#**: Velocity (continuous change)
- **R(t)**: Implementation integrity
- **4D Progress Vector**: [coverage, velocity, time_remaining, robustness]

### Current Metrics
- **DPC_R(now)**: 63 (100% × 63%)
- **Target**: 95 (100% × 95%)
- **Velocity**: 0%/min (stable)
- **Time Remaining**: 4 days (Trial #1 on March 3)

### Tracking
Run `advocate compare-validators --latest` to update DPC metrics.
```

---

## NEXT Phase Actions (Tomorrow - March 3)

### Action 1: Fix Amanda Email Placeholder (5 min)
- Send via Mail.app with file picker (manual workaround)
- OR fix sed regex in `email-validation-fixes.sh` line 261

### Action 2: Trial Prep (75 min)
- Practice opening statement 3x (30 min)
- Print exhibits A, B, C, D (20 min)
- Pay move-in costs $5,850 (15 min)
- Coordinate move-in logistics (10 min)

---

## LATER Phase Actions (March 11+ Post-Trial)

### Phase 1.5: Consolidation Completion (8 hours, WSJF 7.5)

**Tasks**:
1. **Audit all 21 scripts** (2 hours)
   - Identify redundant functionality
   - Map Phase 1 functions → comprehensive stack equivalents
   - Generate consolidation matrix

2. **Merge Phase 1 improvements into comprehensive stack** (3 hours)
   - Add HTML generation to `comprehensive-wholeness-validator.sh` Layer 1
   - Add missing 6 functions to `unified-validation-mesh.sh`
   - Update feature flags to include Phase 1 checks

3. **Create CATALOG.md** (1 hour)
   - Document all 21 scripts (purpose, size, status)
   - Mark deprecated scripts
   - Define canonical entry points

4. **Update symlinks** (30 minutes)
   - Point MAA scripts to comprehensive stack (not Phase 1 scripts)
   - Update `.claude/settings.json` hooks

5. **Archive Phase 1 scripts** (30 minutes)
   - Move `validation-core.sh` → `archive/phase1/`
   - Move `pre-send-email-gate.sh` → `archive/phase1/`
   - Move `email-validation-fixes.sh` → `archive/phase1/`
   - Keep symlinks for backward compatibility

6. **Integration testing** (1 hour)
   - Run comprehensive stack on all 2 emails (landlord, Amanda)
   - Verify exit codes (0/1/2/3)
   - Compare output to Phase 1 baseline

**WSJF Calculation**:
- **Business Value**: 30 (eliminates 18 redundant scripts)
- **Time Criticality**: 10 (post-trial, not urgent)
- **Risk Reduction**: 20 (prevents future backsliding)
- **Effort**: 8 hours
- **WSJF**: (30 + 10 + 20) / 8 = **7.5**

---

### Phase 2: Full-Auto CI/CD (23 hours, WSJF 20.0)

**Tasks** (from original plan):
1. Git pre-commit hooks (2h, WSJF 20.0)
2. Claude Flow hooks (3h, WSJF 10.0)
3. JSON schema validation (4h, WSJF 5.6)
4. agentic-qe fleet (6h, WSJF 4.2)
5. RuVector domain expansion (8h, WSJF 1.5)

**DPC Impact**:
- Current: DPC_R = 63 (100% × 63%)
- Post-Phase 1.5: DPC_R = 80 (100% × 80%)
- Post-Phase 2: DPC_R = 95 (100% × 95%)

---

## Robustness Improvements (Raising R(t))

### Immediate (NOW - 5 min each)

1. **Remove continue-on-error from CI** (WSJF 40.0)
   ```yaml
   # .github/workflows/rust-ci.yml
   - name: Clippy
     run: cargo clippy --all-targets --all-features -- -D warnings
     # ❌ Remove: continue-on-error: true
   ```

2. **Add rust/core/** to CI triggers** (WSJF 35.0)
   ```yaml
   on:
     push:
       paths:
         - 'rust/core/**'  # ✅ Add DDD enforcement
         - 'rust/ffi/**'
   ```

3. **Graceful degradation for missing tools** (WSJF 30.0)
   ```bash
   # validation-core.sh
   if ! command_exists "jq"; then
       echo '{"status": "SKIP", "reason": "jq not installed"}' >&2
       return 3  # DEPS_MISSING
   fi
   ```

---

### Deferred (LATER - Post-Trial)

4. **AgentDB vector storage** (WSJF 5.0)
   - Integrate `agentic-qe@latest` fleet
   - Add validation pattern embeddings
   - Use `ruvector-domain-expansion` for cross-domain transfer

5. **LLMLingua compression** (WSJF 3.0)
   - Add token compression for large email bodies

6. **LazyLLM pruning** (WSJF 2.0)
   - Add pruning for token efficiency

---

## Canonical Entry Points (Post-Consolidation)

### For Email Validation (Semi-Auto)
```bash
advocate validate-email <file>
# OR
ay validate-email <file>
```

**Features**: Core checks only (5), ~1 sec, exit 0 on warnings

---

### For Comprehensive Validation (Full-Auto)
```bash
advocate compare-validators [--latest] [files...]
```

**Features**: All 15+ checks, ~2 sec, DPC metrics in report

---

### For Single-Check JSON Output
```bash
./scripts/validation-core.sh email --file <path> --check placeholders --json
```

**Output**:
```json
{
  "check": "placeholders",
  "status": "PASS",
  "file": "EMAIL-POST-SIGNATURE-CONFIRMATION_2026-02-27.eml",
  "exit_code": 0
}
```

---

## DPC Tracking Dashboard

**Current Metrics** (2026-02-28 02:25 UTC):
```
DPC_R(now) = 63
  - %/# coverage: 100% (9/9 validators pass)
  - R(t) robustness: 63% (7/11 implemented)
  - %.# velocity: 0%/min (stable)
  - T_remaining: 4 days (Trial #1)
```

**Target** (Post-Consolidation):
```
DPC_R(target) = 95
  - %/# coverage: 100% (maintained)
  - R(t) robustness: 95% (10/11 implemented)
  - %.# velocity: +10%/min (active)
  - T_remaining: 0 days (post-trial)
```

**Tracking Command**:
```bash
advocate compare-validators --latest
cat reports/CONSOLIDATION-TRUTH-REPORT.md | grep "DPC"
```

---

## Lessons Learned

### What Went Right ✅
1. **Comprehensive stack exists and works** (9/9 validators pass)
2. **DPC metrics clearly show gaps** (63% robustness vs 100% coverage)
3. **Truth report provides ground truth** (CONSOLIDATION-TRUTH-REPORT.md)
4. **"USE FIRST, EXTEND LATER" validated** (stack works NOW)

### What Went Wrong ❌
1. **Phase 1 consolidation duplicated work** (created new scripts vs extending existing)
2. **No discovery phase** (didn't find comprehensive stack)
3. **Scope mismatch** (narrow Phase 1 vs broad comprehensive)
4. **No catalog** (21 scripts, no inventory)

### Prevention Strategy 🛡️
1. **Always audit before consolidating** (run compare-all-validators.sh first)
2. **Create CATALOG.md** (document all scripts)
3. **Define canonical entry points** (advocate CLI)
4. **Use feature flags** (enable/disable domains)
5. **Log ADRs** (track why scripts exist)
6. **Track DPC metrics** (measure robustness, not just coverage)

---

## Next Command (NOW)

**Create advocate CLI wrapper**:
```bash
cd /Users/shahroozbhopti/Documents/code/investing/agentic-flow/scripts
cat > advocate << 'EOF'
#!/usr/bin/env bash
case "$1" in
  validate-email)
    /Users/shahroozbhopti/Documents/code/investing/agentic-flow/scripts/validation-runner.sh "$2"
    ;;
  compare-validators)
    shift
    /Users/shahroozbhopti/Documents/code/investing/agentic-flow/scripts/compare-all-validators.sh "$@"
    ;;
  *)
    echo "Usage: advocate validate-email <file> | compare-validators [--latest] [files...]"
    exit 1
    ;;
esac
EOF
chmod +x advocate
ln -s advocate ay
```

**Test**:
```bash
./advocate validate-email /Users/shahroozbhopti/Documents/Personal/CLT/MAA/Uptown/BHOPTI-LEGAL/12-AMANDA-BECK-110-FRAZIER/SENT/EMAIL-POST-SIGNATURE-CONFIRMATION_2026-02-27.eml
```

---

**Files Referenced**:
- `compare-all-validators.sh` (16K, comprehensive comparison)
- `comprehensive-wholeness-validator.sh` (14K, MASTER orchestrator)
- `unified-validation-mesh.sh` (17K, TDD/VDD/DDD/ADR/PRD)
- `validation-core.sh` (23K, pure functions)
- `validation-runner.sh` (3.1K, orchestration)
- `reports/CONSOLIDATION-TRUTH-REPORT.md` (truth report)
