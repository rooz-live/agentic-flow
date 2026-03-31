# Superproject Rollback Procedure: Risk Analytics DGM Bounding

> This document defines the exact execution matrix for reverting the Swarm explicitly avoiding uncontrolled sprawl or cascading index destruction inherently mapped via `R-2026-016`.

## 1. Trigger Conditions (Error Budget Exhaustion)
A Rollback is mandated if any of the following constraints are violated dynamically during the initial 120-minute CSQBM inspection window:
1.  **Hardware Ingestion Failures**: `scripts/ci/hostbill-sync-agent.py` continuously fails to output valid integer `Watts` measurements or breaks the `$150.27 USD` threshold loop natively.
2.  **Pointer Submodule Lock Exhaustion**: `check-infra-health.sh` hangs continuously forcing MacOS native lock errors bypassing the local `-uno` trace limit.
3.  **Governance Trace Disconnect**: `.goalie/go_no_go_ledger.md` is inaccessible or fails to trace within the Git object graph actively blocking `check-csqbm.sh`.

## 2. Hard Reversion Syntax (Core Execution Map)
To explicitly roll back the superproject cleanly bypassing macOS-native cyclic limit locks, enforce the following sequence utilizing the local `/usr/bin/git` bypass proxy:

```bash
# STAGE 1: Purge existing pointer constraints & release local file locks natively
export TRUST_GIT=/usr/bin/git
pkill -f git
rm -f .git/index.lock

# STAGE 2: Enforce historical state boundary via hard reset bypassing current cycle
$TRUST_GIT reset --hard HEAD~1

# STAGE 3: Recursive Rehydration
./scripts/ci/repair-nested-submodules.sh .integrations/aisp-open-core
# Or if explicitly repairing all mappings across the graph natively:
$TRUST_GIT submodule sync --recursive
$TRUST_GIT submodule update --init --recursive --force
```

## 3. Recovery Validation
Post-rollback, the infrastructure gate must assert absolute structural integrity:
```bash
./scripts/validators/project/check-infra-health.sh
# Expected Output: [SUCCESS] INFRASTRUCTURE HEALTH GO. Parity mapped safely.
```
If the gate fails, initiate the hitl-audit-safeguard.sh extraction loop and record the anomaly inside `docs/BLOCKER_ANALYSIS.md`.
