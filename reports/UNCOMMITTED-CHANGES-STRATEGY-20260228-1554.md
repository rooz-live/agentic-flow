# 📦 Uncommitted Changes Strategy

**Date**: 2026-02-28 20:45 UTC
**Branch**: feature/phase1-2-clean
**Changes**: 1,484 additions, 598 deletions across 9 files

---

## 📊 Change Analysis

### High-Value Changes (KEEP & COMMIT)

#### 1. Cargo.toml (+9 lines)
**Type**: Workspace dependency consolidation
**Value**: HIGH ✅
```toml
+ packages/neural-trader  # Neural trader integration
+ chrono, rand, ruvector-domain-expansion  # Shared deps
+ duckdb, arrow, parquet  # WSJF data pipeline
```
**Decision**: These support the WSJF domain bridge - commit to new branch.

#### 2. scripts/validation-core.sh (+6 lines)
**Type**: Enhanced placeholder detection
**Value**: HIGH ✅
```bash
+ '[INSERT_*]', '[PLACEHOLDER]', '[TBD]', '[TODO]', '[FILL_IN]'
```
**Decision**: Improves Trial #1 email validation - commit.

#### 3. scripts/validation-runner.sh (+23 lines)
**Type**: DPC_R(t) metric implementation
**Value**: HIGH ✅
```bash
+ DPC_R(t) = coverage × robustness
+ JSON output with metrics
```
**Decision**: Core DPC framework implementation - commit.

#### 4. reports/CONSOLIDATION-TRUTH-REPORT.md (+46/-46)
**Type**: Documentation updates
**Value**: MEDIUM 📄
**Decision**: Updated metrics from discovery phase - commit.

### Low-Priority Changes (STASH OR DEFER)

#### 5. docs/research/README.md (+586/-586)
**Type**: Documentation reformatting
**Value**: LOW 📝
**Decision**: Large diff, likely auto-formatting - stash for review.

#### 6. examples/climate-prediction/docs/ARCHITECTURE.md (+811/-811)
**Type**: Example documentation
**Value**: LOW 📝
**Decision**: Not critical for PR - stash.

#### 7. packages/neural-trader/package.json (-3 lines)
**Type**: Deleted file
**Value**: CONFLICT ⚠️
**Decision**: Rust migration replaces Node package - commit deletion.

#### 8. VisionFlow, external/VisionFlow (submodules)
**Type**: Submodule pointer changes
**Value**: LOW 🔗
**Decision**: Unrelated to PR scope - reset.

---

## 🎯 Recommended Strategy: "Progressive Commit Pattern"

### Pattern: Layer Changes by Value + Scope

Instead of "all or nothing", commit changes in **thematic layers**:

```
Layer 1: Core Infrastructure (Cargo.toml, neural-trader migration)
Layer 2: Validation Improvements (scripts/validation-*)
Layer 3: Documentation (reports/CONSOLIDATION-*)
Layer 4: Defer (docs/research, examples)
```

### Commands (Execute in Order)

#### Step 1: Create Feature Branch for New Work
```bash
git checkout -b feature/validation-dpc-metrics

# Layer 1: Infrastructure
git add Cargo.toml packages/neural-trader/package.json
git commit -m "feat(workspace): add neural-trader + shared deps for WSJF bridge

- Add packages/neural-trader to workspace members
- Consolidate shared deps: chrono, rand, ruvector-domain-expansion
- Add DuckDB + Arrow/Parquet for WSJF data pipeline
- Remove obsolete Node.js package.json (migrated to Rust)

Related: #WSJF-domain-bridge
"

# Layer 2: Validation
git add scripts/validation-core.sh scripts/validation-runner.sh
git commit -m "feat(validation): implement DPC_R(t) metrics + enhanced placeholders

- Add DPC_R(t) calculation: coverage × robustness
- Enhanced placeholder detection: [INSERT_*], [TBD], [TODO], [FILL_IN]
- JSON output with coverage, robustness, and DPC_R metrics
- Supports Trial #1 email validation gates

Metrics:
- Coverage: pass_count / total_checks
- Robustness: actual_checks / declared_checks (4)
- DPC_R(t): coverage × robustness

Related: validation-consolidation Phase 1
"

# Layer 3: Documentation
git add reports/CONSOLIDATION-TRUTH-REPORT.md
git commit -m "docs(reports): update consolidation metrics from Phase 1 discovery

- Update validator counts: 112 total (73 CLT, 39 repo)
- Add DPC baseline: 71.8% robust coverage
- Document Phase 1 completion status

Related: CONSOLIDATION-ROADMAP
"
```

#### Step 2: Stash Low-Value Changes
```bash
# Stash docs changes for later review
git stash push -m "WIP: docs formatting (research README + climate example)" \
  docs/research/README.md \
  examples/climate-prediction/docs/ARCHITECTURE.md
```

#### Step 3: Reset Submodule Drift
```bash
# Reset submodule pointers (unrelated to PR)
git submodule update --init --recursive
git checkout -- VisionFlow external/VisionFlow
```

#### Step 4: Push New Branch
```bash
git push origin feature/validation-dpc-metrics
```

---

## 🔀 Alternative Patterns (Choose Based on Preference)

### Pattern A: "Amend + Force Push" (If no PR yet)
```bash
# Add changes to last commit on feature/phase1-2-clean
git add Cargo.toml scripts/validation-*.sh
git commit --amend --no-edit
git push origin feature/phase1-2-clean --force-with-lease
```
**Pros**: Single commit, clean history
**Cons**: Force push required (safe if no PR yet)

### Pattern B: "Stash Everything, Cherry-Pick Later"
```bash
# Stash all changes with descriptive message
git stash push -m "WIP: validation DPC metrics + workspace deps + docs"

# List stashes
git stash list

# Apply later when creating follow-up PRs
git stash apply stash@{0}
```
**Pros**: Clean working directory, flexible recovery
**Cons**: Must remember to apply stash

### Pattern C: "Worktree Isolation" (Advanced)
```bash
# Create separate worktree for experiments
git worktree add ../agentic-flow-validation feature/validation-dpc-metrics

# Work there without affecting main worktree
cd ../agentic-flow-validation
# ... make changes, commit, push

# Remove worktree when done
git worktree remove ../agentic-flow-validation
```
**Pros**: Multiple branches active simultaneously
**Cons**: More complex, disk space

### Pattern D: "Patch Export + Import" (Portable)
```bash
# Export changes as patch file
git diff > ~/patches/validation-dpc-$(date +%Y%m%d).patch

# Reset working directory
git checkout -- .

# Import patch later on any branch
git apply ~/patches/validation-dpc-20260228.patch
```
**Pros**: Portable, version-controlled patches
**Cons**: Manual patch management

---

## 🎯 Recommended: Progressive Commit (Pattern Default)

**Why**: Preserves high-value changes in logical commits, defers low-value for review.

**Workflow**:
1. ✅ Create `feature/validation-dpc-metrics` branch
2. ✅ Commit Layer 1 (infrastructure)
3. ✅ Commit Layer 2 (validation)
4. ✅ Commit Layer 3 (documentation)
5. ✅ Stash Layer 4 (defer)
6. ✅ Push branch to origin
7. ✅ Create PR for original branch: feature/phase1-2-clean
8. ⬜ Later: Create second PR from feature/validation-dpc-metrics

---

## 📋 Decision Matrix

| Change | Value | Action | Branch |
|--------|-------|--------|--------|
| Cargo.toml | HIGH | Commit | validation-dpc-metrics |
| validation-core.sh | HIGH | Commit | validation-dpc-metrics |
| validation-runner.sh | HIGH | Commit | validation-dpc-metrics |
| CONSOLIDATION-TRUTH-REPORT.md | MEDIUM | Commit | validation-dpc-metrics |
| neural-trader/package.json | HIGH | Commit (delete) | validation-dpc-metrics |
| docs/research/README.md | LOW | Stash | - |
| climate-prediction/ARCHITECTURE.md | LOW | Stash | - |
| VisionFlow submodules | LOW | Reset | - |

---

## 🚀 Next Steps

### Immediate (5 min)
```bash
# Execute Progressive Commit pattern
bash scripts/progressive-commit-validation-dpc.sh
```

### After PR #1 Merged
Create PR #2 from `feature/validation-dpc-metrics` with:
- Title: "feat(validation): DPC_R(t) metrics + WSJF workspace consolidation"
- Description: Building on Phase 1, adds DPC framework and neural-trader integration

---

*Generated by Uncommitted Changes Strategy Planner*
*Pattern: Progressive Commit > Stash > Discard*
*Philosophy: Preserve value, defer low-priority, reset noise*
