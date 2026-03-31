# Git Push Options for LFS Fork Issue

## Problem
Public fork `rooz-live/agentic-flow` lacks LFS permissions:
```
batch response: @rooz-live can not upload new objects to public fork
```

## Solutions

### Option A: Push to Upstream (Recommended)
**Requires**: Write access to upstream `ruvnet/agentic-flow`

```bash
git remote add upstream git@github.com:ruvnet/agentic-flow.git
git push upstream feature/phase1-2-clean
```

Then create PR from upstream branch to upstream main.

### Option B: Disable LFS for Push
**Tradeoff**: Pushes without LFS objects (incomplete repo state)

```bash
git lfs uninstall  # Temporarily
git push origin feature/phase1-2-clean
git lfs install    # Re-enable
```

### Option C: Request LFS Permissions
Contact upstream maintainer to grant LFS write access to `@rooz-live`.

### Option D: Push Code-Only Branch
Create a branch with ONLY code changes (no history with LFS):

```bash
git checkout --orphan phase1-2-code-only
git rm -rf .
git checkout feature/phase1-2-clean -- \
  src/rust/core/Cargo.toml \
  .github/workflows/rust-ci.yml \
  vibesthinker/*.py \
  scripts/*.sh \
  LOCAL-CI-QUICK-REF.md
git commit -m "feat(phase1-2): Code changes only (no LFS history)"
git push origin phase1-2-code-only
```

**Recommended**: Try Option A (push to upstream) first.
