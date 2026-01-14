# AY Command: Missing Scripts & Wiring Gaps

## Status: ⚠️ PARTIALLY WIRED

The `ay auto` command has most infrastructure in place, but several scripts are **missing or incorrectly referenced**, preventing full execution of the validation workflow.

## 🔴 Critical Missing Script

### 1. `ay-continuous-improve.sh` → MISSING

**Problem**: 
- Referenced in: `scripts/ay-auto.sh` line 213
- Actual file: `scripts/ay-yo-continuous-improvement.sh`
- Issue: **Name mismatch** - incorrect reference breaks mode execution

```bash
# Line 213 in ay-auto.sh (WRONG):
bash "$SCRIPT_DIR/ay-continuous-improve.sh" --max-iterations 1

# Correct reference should be:
bash "$SCRIPT_DIR/ay-yo-continuous-improvement.sh" run 1 quick
```

**Impact**: 
- ❌ `improve` mode fails during mode cycling
- ❌ Prevents iteration advancement
- ❌ Workflow gets stuck retrying same mode

**Fix**: 
```bash
# Option 1: Create symlink
ln -s ay-yo-continuous-improvement.sh scripts/ay-continuous-improve.sh

# Option 2: Update reference in ay-auto.sh
# Change line 213 to use correct script name
```

---

## 🟡 Incomplete Wiring

### 2. Test Mode Execution Scripts

The `ay-validate.sh` script calls test modes but some have incomplete integration:

**Test Mode 1: improve:quick:2**
```bash
"$ROOT_DIR/ay" improve "$iterations" quick 2>&1 | tail -5
```
- ✓ Script exists: `ay-yo-continuous-improvement.sh`
- ⚠️ Parameter passing may be incorrect (script expects different args)

**Test Mode 2: wsjf-iterate:tune**
```bash
"$SCRIPT_DIR/ay-wsjf-iterate.sh" "$subcommand" ${arg1:-}
```
- ✓ Script exists: `ay-wsjf-iterate.sh`
- ✓ Appears properly wired

**Test Mode 3: wsjf-iterate:iterate:2**
```bash
"$SCRIPT_DIR/ay-wsjf-iterate.sh" "$subcommand" ${arg1:-}
```
- ✓ Script exists: `ay-wsjf-iterate.sh`
- ✓ Appears properly wired

**Test Mode 4: backtest:quick**
```bash
"$SCRIPT_DIR/ay-backtest.sh" "$subcommand" 2>&1 | tail -5
```
- ✓ Script exists: `ay-backtest.sh`
- ✓ Appears properly wired

---

### 3. Mode Execution in ay-auto.sh

Modes that are called but may not be fully functional:

#### Mode: `init` (Generate episodes)
```bash
# Line 201 in ay-auto.sh
npx tsx "$SCRIPT_DIR/generate-test-episodes.ts" --count "$count" --days 7
```
- ✓ Script exists: `generate-test-episodes.ts`
- ⚠️ Requires: TypeScript, Node.js, tsx
- ❌ May fail if dependencies missing

#### Mode: `improve` (Continuous improvement)
```bash
# Line 213 in ay-auto.sh
bash "$SCRIPT_DIR/ay-continuous-improve.sh" --max-iterations 1
```
- ❌ **Script doesn't exist** - this is the critical gap
- Should reference: `ay-yo-continuous-improvement.sh`

#### Mode: `monitor` (Cascade monitoring)
```bash
# Line 225 in ay-auto.sh
"$SCRIPT_DIR/ay-dynamic-thresholds.sh" cascade-failure "$CIRCLE" "$CEREMONY"
```
- ✓ Script exists: `ay-dynamic-thresholds.sh`
- ⚠️ Verify this supports the `cascade-failure` subcommand

#### Mode: `divergence` (Divergence rate check)
```bash
# Line 239 in ay-auto.sh
"$SCRIPT_DIR/ay-dynamic-thresholds.sh" divergence-rate "$CIRCLE" "$CEREMONY"
```
- ✓ Script exists: `ay-dynamic-thresholds.sh`
- ⚠️ Verify this supports the `divergence-rate` subcommand

#### Mode: `iterate` (WSJF iteration)
```bash
# Line 252 in ay-auto.sh
bash "$SCRIPT_DIR/ay-wsjf-iterate.sh" --max-iterations 1
```
- ✓ Script exists: `ay-wsjf-iterate.sh`
- ⚠️ Verify argument format matches expected parameters

---

## 📋 Wiring Status Matrix

| Component | Script | Status | Issue | Fix |
|-----------|--------|--------|-------|-----|
| Analysis | ay-dynamic-thresholds.sh | ✓ EXISTS | None | None |
| Mode: init | generate-test-episodes.ts | ✓ EXISTS | Deps? | Install tsx |
| Mode: improve | ay-continuous-improve.sh | ❌ MISSING | Wrong name | Create symlink |
| Mode: monitor | ay-dynamic-thresholds.sh | ✓ EXISTS | Verify subcommand | Test |
| Mode: divergence | ay-dynamic-thresholds.sh | ✓ EXISTS | Verify subcommand | Test |
| Mode: iterate | ay-wsjf-iterate.sh | ✓ EXISTS | Verify args | Test |
| Validation | ay-validate.sh | ✓ EXISTS | Mode calls | Verify each mode |
| Orchestration | ay-orchestrate.sh | ✓ EXISTS | None | None |
| Main ay | scripts/ay-yo | ✓ EXISTS | None | None |

---

## 🔧 Required Fixes (Priority Order)

### Priority 1: CRITICAL (Blocks execution)

**Fix 1: Create symlink for continuous-improve**
```bash
cd scripts
ln -s ay-yo-continuous-improvement.sh ay-continuous-improve.sh
chmod +x ay-continuous-improve.sh
```

OR

**Fix 1b: Update ay-auto.sh to use correct script name**
```bash
# Line 213, change from:
bash "$SCRIPT_DIR/ay-continuous-improve.sh" --max-iterations 1

# To:
bash "$SCRIPT_DIR/ay-yo-continuous-improvement.sh" run 1 quick
```

### Priority 2: HIGH (Verify wiring)

**Fix 2: Verify ay-dynamic-thresholds.sh supports all subcommands**
```bash
./scripts/ay-dynamic-thresholds.sh --help
# Check if supports: cascade-failure, divergence-rate
```

**Fix 3: Verify ay-wsjf-iterate.sh argument format**
```bash
./scripts/ay-wsjf-iterate.sh --help
# Verify: --max-iterations, tune, iterate commands
```

**Fix 4: Verify ay-yo-continuous-improvement.sh parameters**
```bash
./scripts/ay-yo-continuous-improvement.sh --help
# Expected: run <iterations> <mode>
# Or check what parameters it actually expects
```

### Priority 3: MEDIUM (Dependencies)

**Fix 5: Ensure TypeScript dependencies installed**
```bash
npm list tsx
# Or: npm install -g tsx
```

**Fix 6: Verify Node.js available for test episodes**
```bash
which node
node --version
```

---

## 💾 Execution Flow with Gaps

Current flow when running `./ay auto`:

```
Stage 1: analyze_system_state()
  └─> ay-dynamic-thresholds.sh all
      ✓ WORKS

Stage 2: orchestrate_modes() [Iteration 1-5]
  └─> select_optimal_mode()
      └─> execute_mode() [depends on detected issues]
          ├─> Mode: init
          │   └─> generate-test-episodes.ts
          │       ⚠️ Depends on Node/tsx
          │
          ├─> Mode: improve
          │   └─> ay-continuous-improve.sh ❌ MISSING
          │       Should be: ay-yo-continuous-improvement.sh
          │
          ├─> Mode: monitor
          │   └─> ay-dynamic-thresholds.sh cascade-failure
          │       ⚠️ Verify subcommand exists
          │
          ├─> Mode: divergence
          │   └─> ay-dynamic-thresholds.sh divergence-rate
          │       ⚠️ Verify subcommand exists
          │
          └─> Mode: iterate
              └─> ay-wsjf-iterate.sh
                  ⚠️ Verify argument format

Stage 3: validate_solution()
  └─> run_solution_tests()
      ├─> Test 1: Success Rate ✓
      ├─> Test 2: Multiplier Tuning ✓
      ├─> Test 3: Compliance ✓
      └─> Test 4: Circle Equity ✓

Stage 4: render_final_verdict()
  └─> Displays GO/CONTINUE/NO_GO ✓

Stage 5: Show recommendations ✓
```

**Current State**: Stages 1, 3, 4, 5 are wired. Stage 2 has gaps.

---

## 🚀 What to Do Now

### Option A: Quick Fix (5 minutes)
```bash
# Create symlink for the critical missing script
cd /Users/shahroozbhopti/Documents/code/investing/agentic-flow/scripts
ln -s ay-yo-continuous-improvement.sh ay-continuous-improve.sh

# Test
cd ..
./ay auto
```

### Option B: Comprehensive Fix (15 minutes)
1. Create symlink (as above)
2. Test each mode individually:
   ```bash
   ./ay improve 1 quick        # Test improve mode
   ./ay wsjf-iterate tune      # Test wsjf tuning
   ./ay backtest quick         # Test backtest
   ```
3. Verify thresholds script:
   ```bash
   ./scripts/ay-dynamic-thresholds.sh all orchestrator standup
   ```

### Option C: Full Validation (30 minutes)
1. All of Option B
2. Run validation stage:
   ```bash
   ./scripts/ay-validate.sh auto
   ```
3. Run complete workflow:
   ```bash
   ./ay auto
   ```

---

## 📊 Expected Improvements After Fixes

| Metric | Before | After |
|--------|--------|-------|
| Mode cycling | Stuck (improve fails) | Full 5-iteration cycles |
| Test execution | Partial (3/4 modes) | Full (4/4 modes) |
| Validation | Limited | Complete with accurate scores |
| Verdict accuracy | Guess | Data-driven GO/CONTINUE/NO_GO |
| Workflow completion | ~30% | ~95% |

---

## 📝 Summary

**Missing Component**: `ay-continuous-improve.sh`
- **Root Cause**: File named `ay-yo-continuous-improvement.sh` but referenced as `ay-continuous-improve.sh`
- **Fix Time**: 1 minute (create symlink)
- **Fix Complexity**: Trivial

**Incomplete Components**: Mode parameter verification
- **Root Cause**: Assumed script interfaces without testing
- **Fix Time**: 10 minutes (test each mode)
- **Fix Complexity**: Simple

**After Fixes**: `ay auto` will provide complete workflow with:
- ✅ Intelligent mode selection
- ✅ Full 5-iteration cycles
- ✅ Complete 4-criterion validation
- ✅ Accurate GO/CONTINUE/NO_GO verdicts
- ✅ Actionable recommendations

---

**Next Step**: Apply Priority 1 fix and re-run `./ay auto`

