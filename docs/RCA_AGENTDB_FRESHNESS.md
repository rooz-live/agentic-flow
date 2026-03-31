# Root Cause Analysis: AgentDB Freshness and Pre-Merge Consultation Failures

## The Problem

"How often may no 'current state' source of truth be consulted, and why are `agentdb` and various evidential files not reviewed before potentially making false or inaccurate statements?"

### Incident Baseline
- `agentdb.db` shows extreme staleness (99 days old, 0 active records verified).
- Existing validation flows check static files (e.g. `CASE_REGISTRY.yaml`, `WSJF-PACK-MOVE-CHECKLIST.md`), but dynamic vector/state DBs like `research_validated.db` and `agentdb.db` are bypassed.
- This creates a **logic-layer gap** prior to critical PI Syncs, Retro, Replenishment, Refinement, and Standup procedures.

---

## 5 Whys Analysis

1. **Why are statements sometimes made without current-state consultation?**
   Because the agentic pipeline defaults to static file reads (`grep`, `cat` on markdown/yaml) rather than live database querying when gathering context prior to an action.
2. **Why does it default to static file reads instead of DB queries?**
   Because parsing `agentdb.db` requires active SQLite/Vector plugin invocation, which was not explicitly hardcoded as a mandatory step in the `validate_coherence.py` or pre-merge BATS tests. 
3. **Why wasn't DB invocation hardcoded into the pre-merge test suite?**
   Because the orchestration logic prioritizing DB reads was deferred to "Phase 8" (or similar), allowing `CASE_REGISTRY.yaml` to act as an incomplete proxy for truth.
4. **Why did we allow an incomplete proxy for truth to bypass the gate?**
   Because there is no active Git Hook (`pre-commit` or `pre-merge`) that mathematically queries the last-modified timestamp of `agentdb.db` and blocks execution if it exceeds the 96-hour ROAM staleness threshold limit.
5. **Why is there no automated decay mechanism for DB staleness?**
   The architecture treats databases as isolated "storage" rather than "live constraint checks". The system's definition of "DoR" (Definition of Ready) checks files but does not execute a SQL/Vector state check to verify real-world alignment.

---

## Architectural/Logic-Layer Gaps

- **The Illusion of Freshness**: Text evidence (`.md`, `.yaml`) is fresh (7 days), creating a false sense of security, masking the dead `agentdb.db`.
- **Missing TDD Constraint**: There are no tests enforcing that DB mutation occurs concurrently with YAML mutation.

## Actionable Fixes (PI Prep / Standup Integration)

### 1. Pre-Merge Current-State Query Hook
Consolidated a direct SQLite count query and `-mmin` file age check for `agentdb.db` into the existing `compare-all-validators.sh` and primary gate scripts. If staleness > 96 hours, the merge natively fails with Exit Code 1. This provides the Data-layer constraint in the Structural Decision Layers.

### 2. Replenishment/Retro Enforcement
Incorporated a mandatory `aqe kg stats --verbose` and DB audit snippet in the `compare-all-validators.sh` meta-orchestrator. Every validator comparison physically touches the DB before emitting a "PASS".

### 3. Upgrade Ruvector & Vector Search Portfolio
Prior to next PI Sync, deploy the `ruvector-domain-expansion` upgrade to ensure `agentdb.db` is not just a relational store but an active semantic graph evaluated *before* every context-building prompt.

---

## 6. 2026-03-27 Update: Trust-path blocker before merge

### New finding
- Nested repo `.integrations/aisp-open-core` fails integrity checks (`bad object HEAD`, truncated packfile), which blocks trusted `git status` and therefore release-grade traceability.

### Why this matters (first principles)
- If VCS integrity is untrusted, then change lineage, blast radius, and rollback confidence are partially blind.
- This is an **Infrastructure + Process** blocker independent of validator logic quality.

### Controlled response adopted
1. Keep bounded-parallel work active (CSQBM/tests/contract checks continue).
2. Enforce NO-GO for merge/release until nested repo integrity is repaired.
3. Preserve retention covenants (`email-hash` evidence paths untouched).

### Repair-first hypothesis
- In-place `fsck/gc/repack` is insufficient due to missing objects and invalid refs.
- Next viable action is controlled nested-repo rehydrate/reclone, then rerun checkpoint A.

## 7. 2026-03-27 Recovery update: rehydrate succeeded with toolchain caveat

### What changed
- Executed forensic-first flow: evidence capture -> backup/quarantine -> controlled reclone.
- Archived broken worktree snapshot at `backups/submodule-rehydrate/aisp-open-core-pre-rehydrate-20260327-113601.tar.gz`.
- Rehydrated `.integrations/aisp-open-core` from origin and pinned to `bcd1e4820c155a284ed7deca529c94ae2cd082ce`.

### Checkpoint outcome
- Infrastructure gate is now green when executed with native `/usr/bin/git`.
- CSQBM, targeted validator/DGM tests, and contract verification all passed in the same cycle.

### Residual risk
- `/usr/local/bin/git` is crashing under Rosetta emulation for this workspace while `/usr/bin/git` is healthy.
- Risk classification: **Process/Toolchain risk (medium)**, not repository integrity risk.

### Immediate control
- Enforce checkpoint commands via `/usr/bin/git` until the local toolchain crash is remediated.
