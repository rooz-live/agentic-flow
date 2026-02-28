# Local CI Quick Reference

## Single Command Workflows

```bash
# Pre-send gate (Trial #1 ready?)
./scripts/pre-send-gate.sh

# Full validation (pre-push)
./scripts/local-ci-validation.sh

# Fast coherence check (30s)
./scripts/local-ci-validation.sh --coherence

# Create pushable branch (no LFS)
./scripts/create-pushable-branch.sh
git push origin feature/phase1-2-no-lfs
```

## Individual Gates

```bash
# 1. Coherence (99%+ threshold)
python3 scripts/validate_coherence_fast.py

# 2. Rust compilation
cargo check --manifest-path src/rust/core/Cargo.toml

# 3. Python linting
ruff check src/ scripts/

# 4. ROAM staleness
python3 scripts/governance/check_roam_staleness.py

# 5. Git status
git status --porcelain
```

## Exit Codes
- `0` = Pass (safe to push)
- `1` = Fail (do NOT push)
- `2` = Warnings (review)

## Logs
`.local-ci/validation-YYYYMMDD-HHMMSS.log`

## Trial #1 Checklist
- [x] 99.9% coherence
- [x] DDD aggregates
- [x] CI/CD configured
- [x] Local validation
- [ ] Git push (use create-pushable-branch.sh)
- [ ] Pre-send gate verified

**T-2 days**: March 3, 2026
