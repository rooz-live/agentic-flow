## PI SYNC / MERGE — GO / NO-GO LEDGER

**Last trust bundle run:** 2026-03-29 (local)

### Policy (authoritative)

| Rule | Detail |
|------|--------|
| **Merge GO** | **Infrastructure git** (rev-parse, status, `submodule status --recursive` exit 0) **and** **CSQBM** (`CSQBM_DEEP_WHY=true` path) both **GREEN**. |
| **Trust bundle NO-GO** | Any of: infra RED, CSQBM RED, trust shell tests RED, contract verify RED — even if Merge GO would be true on infra+CSQBM alone. |
| **Toolchain** | On macOS prefer **`TRUST_GIT=/usr/bin/git`**; Rosetta `/usr/local/bin/git` has been a crash vector during submodule work. |

### Operational commands

| Gate | Command |
|------|---------|
| **Full trust bundle** | `TRUST_GIT=/usr/bin/git bash scripts/validate-foundation.sh --trust-path` |
| **Forensic snapshots** | Written under `.goalie/trust_snapshots/<UTC>/` (gitmodules hash, refs, packs, submodule-status, csqbm tail). |
| **Optional fsck** | `TRUST_FSCK=1` (bounded; see script header). |
| **CI** | `.github/workflows/strict-validation.yml` runs **CSQBM** and other jobs; **full trust-path** (recursive submodules + contract bundle) remains **local/dev** until checkout depth and runtime are proven stable in Actions. |
| **Nested submodule repair** | Controlled: `scripts/ci/repair-nested-submodules.sh`; superproject bump for `external/VisionFlow` when nested `.gitmodules` is fixed upstream. |

### Related docs

- `docs/STX_RETRO_AND_BACKLOG.md` — STX / HostBill / K8s backlog (WSJF-ranked).
- `docs/TURBOQUANT_CSQBM_PROMPT.md` — TurboQuant–CSQBM loop; trust-path as local preflight.
- `docs/CONSOLIDATED_RCA_DDD_MATRIX.md` — Infra vs CSQBM matrix and RCA links.

### Actively integrated optimal cycle (increment vs iteration)

- **Increment:** one bounded outcome with **before/after trust-path** evidence (infra + CSQBM + tests you touched).
- **Iteration:** same scope, refine metrics / prompts / ordering without expanding file blast radius.
- **Program “cycle”:** standup → CSQBM evidence → WSJF pull → merge only on **Merge GO** (infra + CSQBM); trust bundle for destructive submodule work.

### Single WSJF-scored thread of record (anti–R-2026-018 fragmentation)

Run **one** primary thread per PI day/cycle. Everything else (RuVector #298, TurboQuant experiments, SCION, new MCP installs, long repo lists) waits in **Next/Later** until this thread is **GREEN** or explicitly parked with a ROAM line.

| Field | Choice |
|-------|--------|
| **Thread ID** | **T1 — Trust + evidence loop** |
| **What it is** | Re-establish **Merge GO** truth, write **one** metrics line, optionally tighten **one** retro/RCA link — **no** second feature theme in the same cycle. |
| **WSJF (qualitative)** | **BV** = unblocks all merges and protects validation/email/dual-track (**R-2026-016**). **RR** = avoids silent capability loss + stale ROAM (**R-005**). **TC** = tied to calendar-driven legal/comms gates. **Job size** = *small* (commands + at most one file touch for metrics/ROAM). → **High WSJF vs. almost all “research/install” items** that expand attention surface. |
| **WIP** | **1** active narrative: T1 only. A second PR/theme = explicit ROAM exception or **next** cycle. |

**T1 cadence (build → measure → learn, minimal moving parts):**

1. **Standup / PI Prep:** Name only T1; defer other links to backlog.
2. **Build / verify:** `TRUST_GIT=/usr/bin/git bash scripts/validate-foundation.sh --trust-path` (local) and/or rely on `strict-validation.yml` CSQBM on push.
3. **Measure:** Append **one** JSON line to `.goalie/metrics_log.jsonl` (exit codes, `head_sha`, `trust_path` snapshot path if any). If you use emitters, prefer existing `scripts/emit_metrics.py` / `scripts/policy/governance.py` paths already in tree.
4. **Learn / retro:** At most **one** of: `scripts/feedback-loop-analyzer.sh`, `scripts/link_metrics_to_retro.sh`, `scripts/cmd_retro.py` — only if T1 surfaced a delta worth recording; otherwise a single line in `.goalie/retro_summary.md` is enough.
5. **Replenish / refine:** Pull **one** `Next` item from `docs/STX_RETRO_AND_BACKLOG.md` **only after** T1 GREEN; else replenish = fix trust/submodule only.
6. **PI Sync:** Merge only on **Merge GO**; treat full trust bundle NO-GO as **stop the line** for T1.

**Iterate:** Repeat T1; **do not** add a parallel “P2” until T1 has been GREEN for a full cycle or you have written the parking reason under **R-2026-018** / ROAM.

**T1 red / green — `%/#` (record in `.goalie/metrics_log.jsonl`):**

| Granularity | # Green / # Total | % Green | Meaning |
|-------------|-------------------|---------|---------|
| **Merge GO** (policy) | `m/2` | `100×m/2` % | `m=2` only if **infra** pillar AND **CSQBM** pillar both green (`validate-foundation.sh --trust-path` output). |
| **Trust bundle** (full local T1) | `b/4` | `100×b/4` % | Four pillars: **infra** (rev-parse + status + `submodule status --recursive` as one pillar), **CSQBM**, **trust shell tests**, **contract verify**. `b=4` ⇒ script prints “Trust bundle: ALL GREEN”. |
| **Infra atomic** (optional drill-down) | `i/3` | `100×i/3` % | `i` = count of green among: `rev-parse HEAD`, `status -sb`, `submodule status --recursive`. Omit **TRUST_FSCK** unless you set `TRUST_FSCK=1` (then add +1 to denominator and numerator if you score it). |

Examples: Merge GO **2/2 = 100%**; full bundle **3/4 = 75%** (one pillar red); infra only **3/3 = 100%** but bundle still NO-GO if CSQBM red.

**T1 TDD — `%.#` (trust-path shell harness only):**

| Metric | Definition | GREEN target |
|--------|------------|--------------|
| **T1_TDD** | `(shell tests passed) / 2` × 100 | **100.0%** = `tests/test-dgm-prototype.sh` and `tests/test-validate-email.sh` both exit 0 in the same `--trust-path` run. |

If you changed production code under T1, extend TDD reporting with your normal test runner (e.g. `cargo test` / `pytest`) as **separate** fields in `metrics_log.jsonl` — do **not** fold them into **T1_TDD**; keep **T1_TDD** strictly the two trust shell scripts so the score stays comparable cycle-to-cycle.

| Horizon | Product / program focus | This repo (agentic-flow) |
|---------|-------------------------|---------------------------|
| **Now** | Trustworthy merge path + nested submodule truth | `validate-foundation.sh --trust-path`, `repair-nested-submodules.sh`, R-2026-016 safe cleanup |
| **Next** | STX / HostBill / K8 prep (WSJF in `docs/STX_RETRO_AND_BACKLOG.md`) | `hostbill-sync-agent.py` + ledger; OpenStack telemetry baselines; no new sprawl scripts |
| **Later** | Path-isolated infra between sites (optional) | [SCION](https://github.com/GoogleCloudPlatform/scion) is **infra isolation** only — does **not** replace CSQBM, git health, or contract evidence |

**Orthogonal (swarm org, not gates):** [Agent Teams](https://code.claude.com/docs/en/agent-teams) = people/process pattern for multi-role agents; compatible with “swarm” narrative but **independent** of `check-csqbm.sh` / `validate-foundation.sh` / contract gate.

### Layer aggregation (discover / consolidate before extend)

| Layer | Role | Primary artifacts |
|-------|------|-------------------|
| **Gate evidence** | Block false “done” | `scripts/validators/project/check-csqbm.sh`, `.github/workflows/strict-validation.yml`, local `--trust-path`, superproject `scripts/monitoring/validate-claims.sh` (pre-commit; mirrors `gate_no_false_claims` intent) |
| **Causal metrics** | Why red/green happened | `scripts/policy/governance.py`, `scripts/emit_metrics.py`, `.goalie/metrics_log.jsonl` |
| **Retro synthesis** | Close the loop | `scripts/feedback-loop-analyzer.sh`, `scripts/link_metrics_to_retro.sh`, `scripts/cmd_retro.py`, `scripts/circles/retro_insights.sh`, `scripts/agentic/retro_replenish_workflow.py` |

Telemetry anchors (consume, do not treat as logic): `.goalie/rca_findings.md`, `.goalie/retro_summary.md`.

### Safe cleanup pass (WIP + substitution map) — scope split

Keep **cleanup / de-sprawl** in a **separate workstream** from feature PI work so merges stay reviewable and ROAM stays honest.

| Dimension | Rule |
|-----------|------|
| **ROAM** | **R-2026-016** (capability-loss on delete/archive). No path removal until a **substitution row** exists: *what replaces the capability* (test, script, doc, or “explicitly retired with HITL sign-off”). |
| **WSJF** | Score **(BV + RR + TC) / job size** (same formula as backlog items). For cleanup, treat **BV** ≈ merge/disk/incident avoidance, **RR** ≈ compliance / dual-track risk, **TC** time-critical if blocking PI. Prefer **one submodule depth** or **one blast radius** per PR. |
| **WIP** | Cap concurrent cleanup threads (align with repo **WIPLimits** / guardrails): e.g. **one** active “delete or relocate” PR, **one** nested rehydrate, unless ROAM lists an exception. |
| **Superproject vs submodule** | Order: **trust-path GREEN →** edit **deepest submodule first** (commit + push) **→** superproject gitlink bump **→** trust-path again. Never mix unrelated superproject edits in the same commit as submodule mapping fixes. |
| **Reversible steps** | Prefer **feature flag / duplicate path / shadow** → prove with gates → **then** cut; data-quality QA or migration **before** delete when state lives in DB or HASH_DB. |

**PR template (empty row — copy per candidate):**

| Remove / archive | Canonical replacement | Evidence (test / gate / ADR) | ROAM note |
|------------------|----------------------|-----------------------------|-----------|
| *path or dir* | *path or “none — retained read-only”* | *e.g. `--trust-path`, targeted test* | *R-2026-016 / capability_delta* |

**Seed rows — R-2026-016 `capability_inventory` (do not cut without substitution + dual-track contract):**

| Remove / archive | Canonical replacement | Evidence | ROAM note |
|------------------|----------------------|----------|-----------|
| `scripts/email-hash-db.sh` | Keep; or merge with `_SYSTEM/_AUTOMATION/email-hash-db.sh` only per `docs/architecture/VALIDATION-DUAL-TRACK-CONTRACT.md` + tests for HASH_DB CRUD | `validate-foundation` / email harness; dual-track sign-off | R-2026-016 inventory |
| `_SYSTEM/_AUTOMATION/email-hash-db.sh` | Twin of above; **no** silent delete of either tree | Same | R-2026-016 + dual-track |
| `scripts/validation-core.sh` | **Retain** — validation gate core | CI + `validation-runner` JSON contract | R-2026-016 inventory |
| `scripts/validators/file/validation-runner.sh` | **Retain** — `RUNNER_EXIT` / `good_enough_to_send` orchestration | Consumer tests / MCP descriptor | R-2026-016 inventory |
| `_SYSTEM/_AUTOMATION/validate-email.sh` | **Retain** pre critical deadlines; BHOPTI path per inventory | `tests/test-validate-email.sh`, `SKIP_ARBITRATION_WINDOW` for harness only | R-2026-016 inventory |
| `scripts/validators/file/semantic-validation-gate.sh` | **Retain**; `SKIP_SEMANTIC_VALIDATION` for CI only | Semantic gate job / local verify | R-2026-016 inventory |
| `scripts/validators/project/check-csqbm.sh` | **Retain** — Superproject STANDUP constraint validator | `--trust-path` DoD verification | R-2026-016 formal mapping |
| `scripts/policy/governance.py` | **Retain** — Core RCA telemetry evaluation pipeline | `--trust-path` DoD verification | R-2026-016 formal mapping |
| `scripts/emit_metrics.py` | **Retain** — Emit metric bounds into JSONL timeseries | `--trust-path` DoD verification | R-2026-016 formal mapping |
| `scripts/feedback-loop-analyzer.sh` | **Retain** — RETRO synthesis loop engine | `--trust-path` DoD verification | R-2026-016 formal mapping |
| `scripts/link_metrics_to_retro.sh` | **Retain** — Binds causal data traces into retro records | `--trust-path` DoD verification | R-2026-016 formal mapping |
| `scripts/cmd_retro.py` | **Retain** — Generates execution checkpoints and ROAM synthesis | `--trust-path` DoD verification | R-2026-016 formal mapping |
| Superproject pre-commit `claims-evidence` (was missing script + `\|\| true`) | `scripts/monitoring/validate-claims.sh` — bounded check: recent commits with test/coverage success language require an on-disk artifact | Pre-commit GREEN + `./scripts/contract-enforcement-gate.sh verify --advisory` | R-2026-016 capability traceability; R-2026-018 anti–completion-theater |

### T2 — Superproject validate-claims (hook parity)

- **Thread:** One commit: add `scripts/monitoring/validate-claims.sh`, remove pre-commit `|| true` masking.
- **Substitution:** Pre-commit hook capability “claims have evidence” → real script (aligned with `scripts/contract-enforcement-gate.sh` `gate_no_false_claims` paths, including `agentic-flow-core/` trees).
- **Advisory escape:** `VALIDATE_CLAIMS_ADVISORY=1` skips failure (CI/local emergency only); default is **blocking**.

**Seed rows — indexed submodule paths (`.gitmodules`; operational targets = health/rehydrate, not casual delete):**

| Path | Remote (summary) | Cleanup meaning |
|------|------------------|-----------------|
| `VisionFlow` | DreamLab-AI/VisionFlow | **REMOVED** (Phase 22 R-2026-016 Safe Cleanup). Replaced canonically by `external/VisionFlow`. |
| `external/VisionFlow` | rooz-live/VisionFlow | Nested `.gitmodules` authoritative; retained as single source of truth. |
| `.integrations/aisp-open-core` | bar181/aisp-open-core | Controlled sync; `repair-nested-submodules.sh` if corrupted |
| `external/agentic-drift` | driftwise | One-PR submodule updates |
| `external/lionagi-qe-fleet` | rooz-live | Retained as canonical. Root `lionagi-qe-fleet` **REMOVED** (Phase 22 R-2026-016 cleanup). |
| `external/ruvector` | rooz-live | Retained as canonical. Root `ruvector` **REMOVED** (Phase 22 R-2026-016 cleanup). |
| `external/turbo-flow` | marcuspat/turbo-flow | Submodule health only |
| `gitlab-environment-toolkit` | gitlab-org | Submodule health only |
| `rust/ffi/forge` | ikennaokpala/forge | Submodule health only |

**Preflight / DoD:** `TRUST_GIT=/usr/bin/git bash scripts/validate-foundation.sh --trust-path` **before** and **after** the cleanup PR; if infra or CSQBM goes RED, **stop** and revert or repair before expanding scope.

### Latest status (2026-03-30)

- **T2:** Superproject `scripts/monitoring/validate-claims.sh` tracked; pre-commit `claims-evidence` no longer masked by `|| true` (use `VALIDATE_CLAIMS_ADVISORY=1` only when intentionally non-blocking).
- Infra: `git submodule status --recursive` **GREEN** (includes nested `external/VisionFlow` `.gitmodules` for `whelk-rs` + `vircadia-world-sdk-ts`; duplicate `scripts/whelk-rs` gitlink removed in VisionFlow).
- Superproject: removed phantom `[submodule "scripts/whelk-rs"]` from `.gitmodules` (path was not indexed).
- CSQBM deep-why, DGM test, **validate-email harness** (with `SKIP_ARBITRATION_WINDOW=1` for automated exit-code checks only), contract verify: **GREEN** on last local `--trust-path` run.

### Cycle E — Safe Cleanup Pass & Submodule Scope Split (2026-03-30)
- **Thread:** Phase 34 Formalized "Safe Cleanup Pass" to desprawl deprecated backups and explicitly rehydrate submodules.
- **Substitution Map (R-2026-016 Explicit Evidence):**

| Remove / Archive Path | Canonical Replacement / Operation | Evidence (Test / Gate / ADR) | ROAM Anchor |
|-----------------------|-----------------------------------|------------------------------|-------------|
| `VisionFlow_backup_broken_1774623870` | Recursive removal of untracked backup | Authoritative `external/VisionFlow` submodule | R-2026-016 |
| `.agentic-qe-v2-backup-20260302` | Recursive removal of untracked QA backup | `.integrations` native test path | R-2026-016 |
| `.integrations/aisp-open-core` | Submodule Rehydration & HEAD Pin | `git submodule status --recursive` GREEN | R-2026-016 |

- **Verify:** Pre-commit Contract Enforcement Gate + `validate-foundation.sh --trust-path`.

### Cycle F — Phase 35: STX-AIO IPMI Baseline & Telecom Data Pipeline (2026-03-30)
- **Thread:** Execute physical IPMI readouts and TurboQuant neural heartbeat execution targeting STX-AIO (`23.92.79.2`) to establish the baseline matrix limits.
- **Substitution Map (STX 12/13 Incremental Milestone 1 Tracking):**

| Physical Hardware Target | Capability Operation | Evidence (Test/Gate/Telemetry) | ROAM Anchor |
|-------------------------|-----------------------|---------------------------------|-------------|
| `root@23.92.79.2` | Active baseline capture (`chassis status`, `sensor list`, `mc info`, `lan print`) | STX 12 Integration Milestone 1 Validation | R-2026-018 |
| `test_device_24460_ssh_ipmi_enhanced.py` | Neural debug heartbeat execution measuring high-latency and anomaly patterns | `metrics_log.jsonl` integration trace emit | R-2026-018 |

- **Verify:** Superproject `check-csqbm.sh --deep-why` + `validate-foundation.sh --trust-path`.

### Cycle G — Phase 36: K8s v1.33 Conformance (WSJF 76) (2026-03-30)
- **Thread:** Extract CNCF Kubernetes 1.33 compliance via a Sonobuoy execution trace on the STX-AIO hardware boundaries.
- **Substitution Map (STX 13 Incremental Milestone 1 Tracking):**

| Cluster Target | Capability Operation | Evidence (Test/Gate/Telemetry) | ROAM Anchor |
|-------------------------|-----------------------|---------------------------------|-------------|
| `root@23.92.79.2` K8s | Execute `sonobuoy run --mode=quick` e2e test | `.junit XML` telemetry generation | R-2026-018 |
| `.goalie/metrics_log.jsonl` | Record conformal test pipeline pass state | STX 13 Integration compliance validation | R-2026-018 |

- **Verify:** Superproject `check-csqbm.sh --deep-why` + `validate-foundation.sh --trust-path`.
### Cycle A — Gate script audit + ROAM dedupe (2026-03-29)
- **Thread:** Superproject gate script tracking (Cycle A of gate-scripts + ROAM hygiene plan).
- **Gate scripts:** Audited via `/usr/bin/git ls-files`; `check-csqbm.sh`, `governance.py`, `emit_metrics.py`, `feedback-loop-analyzer.sh`, `link_metrics_to_retro.sh`, `cmd_retro.py`, `retro_replenish_workflow.py`, `test_automated_rca.sh` — **already tracked** (no `git add` required for those paths).
- **ROAM:** Removed duplicate `risks[]` stubs for **R-2026-016** / **R-2026-018** (short MACRO entries after R001); canonical full entries retained. **`cycle_34_changes`** + evidence line on R-2026-016.
- **Verify:** `TRUST_GIT=/usr/bin/git bash scripts/validate-foundation.sh --trust-path` — **ALL GREEN** post-change.
- **Note:** Default `git` on this host can segfault; use **`/usr/bin/git`** for status/ls-files (see Policy table).
- **Next:** Cycle B — parent `Documents/code` repo audit (separate commit/PR).

### Cycle B — Safe Cleanup Pass & Submodule Rehydration (2026-03-29)
- **Thread:** Parameterized nested repo cleanup targeting the out-of-sync integration `external` footprints.
- **Substitution Map:** 
  - `external/VisionFlow` → Inherits authoritative objects via zero-trust `repair-nested-submodules.sh`.
  - `external/agentic-drift` → Retained as one-PR update target.
  - `external/ruvector` → Retained as canonical.
  - `gitlab-environment-toolkit` → Evaluated for operational health mapping.
### Cycle C — Superproject Consolidation & Gate Script Tracking (2026-03-29)
- **Thread**: Enforce tracking continuity (DoD context annotations) across untracked load-bearing gate infrastructure.
- **Substitution Map**:
  - `check-csqbm.sh` → Maps CSQBM limits binding.
  - `governance.py` → RCA Governance policies constraint.
  - `emit_metrics.py` → R-2026-016 Causal metrics emission.
  - `feedback-loop-analyzer.sh` → Retro synthesis tracing.
  - `link_metrics_to_retro.sh` → Loop tracking mapping.
  - `cmd_retro.py` → Checkpoint formalization.
  - `retro_insights.sh` → Retro insight aggregation constraint.
  - `retro_replenish_workflow.py` → Replenishment alignment parameters.
- **Verify**: Pre-commit Contract Enforcement Gate + `validate-foundation.sh --trust-path`.

### Cycle D — Phase 28 TimesFM Dynamic ACG Integration
- **Thread**: Define Centralized Agentic Workspace for TimesFM 2.5 Time-Series XReg generation.
- **Substitution Map**:
  - `scripts/agentic/timesfm_xreg_acg.py` → Dynamic API ACG orchestrator mapping (ADR-005).
- **Verify**: Pre-commit Contract Enforcement Gate + `validate-foundation.sh --trust-path`.


## Cycle T3: Cross-Tree Gate Script Consolidation (2026-03-29)
- Thread: BHOPTI-LEGAL gate script tracking (WSJF HIGH)
- Scripts consolidated: validate-email.sh, validate-email-depth.sh
- Pre-commit: 6 tests PASS, shellcheck PASS
- ROAM: R-2026-016 MITIGATED (scripts now tracked)
- WIP: 1 active narrative maintained (R-2026-018 compliance)


## Cycle T4: Vector Graph Synchronization (2026-03-30)
- Issue: CSQBM Vector Provisioning TDD Check FAIL
- Root Cause: agentdb.db stale (>120 minutes)
- Resolution: Auto-sync restored freshness (3 minutes)
- Status: CSQBM GREEN, Graph Paralysis mitigated
- R-2026-021: MITIGATED


## Cycle T5: K8s Conformance v1.33 (2026-03-30)
- Issue: CNCF compliance evidence needed for hybrid deployments
- Action: Retrieved existing Sonobuoy results from STX
- Results: PASSED (2026-03-27 test run)
- Evidence: docs/k8s-conformance/202603272100_sonobuoy_*.tar.gz
- Blocker: Aggregator access prevented fresh test run
- Status: Evidence collected, compliance verified


### Cycle G — Superproject Consolidation — Gate Script Tracking (2026-03-31)
- **Thread:** Phase 36 "Discover/Consolidate THEN Extend" - Tracking load-bearing gate infrastructure currently floating as untracked files in the superproject. Single-thread WSJF.
- **Substitution Map (R-2026-016 / R-2026-018 Formal Tracking):**

| Untracked Script Path | Canonical Capability / Operation | Evidence (Test/Gate/Telemetry) | ROAM Anchor |
|-----------------------|-----------------------------------|---------------------------------|-------------|
| `scripts/validators/project/check-csqbm.sh` | Current-State Query Before Merge Gate | CI `strict-validation.yml` / local `--trust-path` | R-2026-018 |
| `scripts/policy/governance.py` | RCA Signal Source & Governor Checks | Metrics pipeline | R-2026-018 |
| `scripts/emit_metrics.py` | Central RCA Metrics Emitter | `.goalie/metrics_log.jsonl` | R-2026-018 |
| `scripts/feedback-loop-analyzer.sh` | Retro-to-Code friction & recommendations | `.goalie/retro_summary.md` | R-2026-018 |
| `scripts/link_metrics_to_retro.sh` | Binds causal data traces into retro | `.goalie/rca_findings.md` | R-2026-018 |
| `scripts/cmd_retro.py` | Generates execution checkpoints and ROAM | Governance evidence | R-2026-018 |
| `scripts/circles/retro_insights.sh` | Retro execution surface | Aggregator input | R-2026-018 |
| `.github/workflows/strict-validation.yml` | Strict CI validation orchestrator | GitHub Actions | R-2026-018 |
| `.goalie/metrics_log.jsonl` | Primary RCA time-series DBOS telemetry | DBOS Execution / Dashboard | R-2026-018 |

