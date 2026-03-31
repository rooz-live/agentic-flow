# DPC — Delivery Progress Constant

## Canonical Definition
**DPC(t) = Coverage × Robustness** — a steady-state metric measuring what fraction of declared quality gates are green.

**DPC_R(t) = (C/100) × (T_remain/T_total) × R(t)** — time-adjusted variant that decays toward 0 as deadline approaches.

**DPC_U(t) = DPC(t) × urgency_factor** — pressure gauge that rises near deadline if DPC is maintained.

## Formulas
```
DPC(t)   = coverage_pct × robustness / 100          # Range: [0, 100]
DPC_R(t) = coverage_pct × time_ratio × robustness / 10000   # Range: [0, 100], decays → 0
DPC_U(t) = DPC(t) × urgency_factor / 100            # Unbounded upward, capped at 999

Where:
  coverage_pct    = passing_checks / total_checks × 100
  robustness      = green_validators / declared_validators × 100
  time_ratio      = time_remaining_days / total_sprint_days × 100
  urgency_factor  = 10000 / time_ratio  (inverse, capped at 10000)
```

## Enhancements (2026-03-01)
```
DPC_R_decay  = DPC_R × e^(-λ × (1 - T_ratio))      # Exponential decay signal (λ=3)
T_remain_h   = hourly granularity (not just daily)
projection   = gap to DPC≥60, required velocity/day, feasibility classification
```

## All Valid Interpretations

### 1. Delivery Progress Constant (Canonical)
Steady-state metric: `Coverage × Robustness`. Measures the fraction of declared quality gates that are green. Used in `compare-all-validators.sh` lines 305-440.

### 2. Domain Passing Checks
How many DDD domains have all validators passing. Related to robustness: `implemented / declared` (3/9 green validators on feature branch).

### 3. Discovery → Production Convergence
Phase transition metric: DPC rose from 9% → 28% over the sprint. Measures how close the codebase is to being production-ready. The exponential decay signal (`DPC_R_decay`) makes this visible.

### 4. Dependency Patch Compliance
BIP (Basis-point) reading of how many dependencies are patched. Not yet implemented as a separate metric, but the 172 GitHub security vulnerabilities (5 critical, 107 high) represent a 0% DPC in this interpretation.

### 5. Declared Quality Gates
`% compliance = green_validators / declared_validators`. Currently 33% (3/9). This is the `robustness` factor in the DPC formula.

## Implementation: `compare-all-validators.sh`

The script computes DPC honestly via dynamic discovery:

1. **Discover validators** — scans `scripts/validators/file/` and `scripts/validators/project/` for executable `.sh` files
2. **Run each validator** — executes with real test files, captures exit codes
3. **Count green** — validators where ALL test files pass (not just some)
4. **Compute coverage** — `passing_checks / total_checks`
5. **Compute robustness** — `green_validators / declared_validators`
6. **Compute time metrics** — `T_remain / T_total` with sprint dates `T_START=2026-02-18`, `T_TARGET=2026-03-03`
7. **Compute DPC/DPC_R/DPC_U** — all three variants
8. **Track velocity** — EMA of coverage change rate over time via `.validation-baseline.json`

## Making Validators Discoverable Unblocks DPC

**Yes.** The DPC formula depends on `declared` (total validators found) and `implemented` (those that pass). If validators are scattered across non-canonical directories, the discovery step misses them, artificially lowering the DPC denominator. Consolidating validators into canonical homes (`scripts/validators/file/`, `scripts/validators/project/`) ensures honest counting.

## CLI API Inconsistency (RCA)

| Validator | Pattern | Reason |
|-----------|---------|--------|
| `mail-capture-validate.sh` | `--file FILE` | POSIX-style explicit flag |
| `validation-runner.sh` | `FILE` (positional) | Bash idiom simplicity |
| `comprehensive-wholeness-validator.sh` | `--target-file FILE` | Avoids flag collision |
| `unified-validation-mesh.sh` | No file arg | Directory scanner, stateful |

**Resolution:** All validators should source `validation-core.sh` for consistent CLI parsing. This is a consolidation task (WSJF deferred post-trial).

## Current Scores (2026-03-01, feature/phase1-2-clean)
```
DPC(t)     = 9        (28% coverage × 33% robustness)
DPC_R(t)   = 1        (time-adjusted, 2d remaining / 13d sprint)
DPC_U(t)   = ~39      (DPC × urgency)
C          = 28%      (5/18 checks passing)
R          = 33%      (3/9 validators green)
T          = 15%      (2d / 13d time remaining)
Zone       = RED      (<25% time budget)
Decay      = exponential (λ=3)
Projection = gap=51, need 25+ DPC/day → unlikely before trial
```

## Source Files
- `scripts/compare-all-validators.sh` (lines 305-530) — DPC engine + self-test
- `scripts/lib-dynamic-thresholds.sh` — statistical threshold calculations
- `docs/ROAM-tracker.md` — DPC dashboard
- `reports/.validation-baseline.json` — velocity tracking
