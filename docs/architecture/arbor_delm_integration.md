# Arbor-HTR + DeLM Integration Design
# Wave-9 Architecture Decision Record

**Status:** PROPOSED  
**Date:** 2026-06-22  
**Context:** Post-Wave-8 CI/CD harness expansion  
**Papers:**
- Arbor (2606.11926): Hypothesis Tree Refinement — persistent coordinator + short-lived executors
- DeLM (2606.10662): Decentralized Multi-Agent Systems via shared verified context
- LEI (2604.09607): LLM-assisted Agentic Edge Intelligence

---

## Problem

The current `upstream_upgrade_engine.py` runs a linear fetch→run→report cycle. Each wave is
manually triggered and evidence is flat (JSONL + one DoD artifact per run). There is no
persistent tree linking:
- Prior run results → current hypotheses about which upstreams are healthy
- Evidence accumulated across waves → forward-looking prediction of which repos are likely to
  degrade next
- Parallel sub-agent execution → coordinated result aggregation without a single orchestrator
  becoming the bottleneck

This mirrors exactly the gap Arbor addresses in autonomous research: "a long-lived coordinator
managing short-lived executors" with a **Hypothesis Tree** (HT) that accumulates evidence across
iterations.

---

## Proposed Architecture

### Layer 1 — Hypothesis Tree (HT) [from Arbor/HTR]

```
.goalie/evidence/upgrades/hypothesis_tree.json
├── root_hypothesis: "all 13 upstream repos are integration-stable"
├── nodes:
│   ├── H001: "gemma-pytorch is stable"  [status: OPEN, evidence: []]
│   ├── H002: "adk-python is stable"     [status: OPEN, evidence: []]
│   ├── H003: "needle-in-haystack is stable" [status: OPEN, evidence: []]
│   └── ...
└── global_frontier: [H001, H002, H003]   ← what the coordinator schedules next
```

**Coordinator** (`upstream_upgrade_engine.py`) reads the HT, picks hypotheses from the frontier,
dispatches short-lived executor sub-processes (one per repo), and writes evidence back to the
tree. The tree persists across runs — it is the memory substrate across waves.

**Refinement loop** (HTR): after each run, a lightweight scoring function updates node
confidence based on: SHA drift, test outcome, retry count, harness_type. Nodes with confidence
below threshold are re-queued. High-confidence stable nodes are pruned from the frontier (they
skip fetch/run until SHA drifts again).

### Layer 2 — Decentralized Execution [from DeLM]

Replace serial `ThreadPoolExecutor` with a shared task queue backed by a file-system lock file
per repo (already partially implemented via `DecentralizedLock`). Each executor reads from the
shared queue independently — no central orchestrator assigns work. This eliminates the:
- Central thread-pool bottleneck at scale (>20 repos)
- Deadlock risk on executor failure

**Shared context** = `.goalie/evidence/upgrades/shared_context.jsonl` — append-only log that
all parallel executors write results to. The coordinator merges at the end.

### Layer 3 — Edge-Adaptive Programs [from LEI]

For repos with `harness_type=cargo` or `harness_type=python`, the LEI pattern applies: rather
than running a fixed `integration_test` command, generate a lightweight probe script per-repo
based on the repo's current manifest (Cargo.toml / pyproject.toml) and the last known test
outcome. The probe is validated against repo structure before execution.

**Concretely for this codebase:**
- Cargo repos: LEI generates `cargo check --message-format=json | python3 scripts/cicd/cargo_probe_parser.py`
- Pytest repos: LEI generates `python3 -m pytest tests/ -q --co -q 2>&1 | head -5` (collection
  only, 2s probe) before running full suite
- Unknown harness: LEI synthesizes a probe from `git ls-tree HEAD --name-only` + README heuristics

---

## New Relationships Introduced

| Relationship | Type | Load-bearing? |
|---|---|---|
| HT node ↔ repo result | Evidence accumulation | YES — enables skip-on-stable optimization |
| Shared context queue ↔ parallel executor | Decentralized coordination | YES — eliminates orchestrator bottleneck |
| Harness type ↔ probe generator | Adaptive test synthesis | YES — reduces probe time from 120s → 2s for collection probes |
| HT confidence score ↔ SHA drift | Forward prediction | YES — enables "skip unless changed" with proof |

---

## Implementation Plan (Wave-9)

| Step | File | Change |
|---|---|---|
| W9-1 | `.goalie/evidence/upgrades/hypothesis_tree.json` | Create HT schema + initial nodes for 13 repos |
| W9-2 | `scripts/cicd/upstream_fetcher.py` | Write HT nodes after fetch; mark frontier |
| W9-3 | `scripts/cicd/upstream_runner.py` | Read from shared_context.jsonl; write result to HT node |
| W9-4 | `scripts/cicd/upstream_upgrade_engine.py` | Coordinator reads HT frontier; prunes stable nodes |
| W9-5 | `scripts/cicd/ht_reporter.py` | NEW: confidence scoring, HTR refinement, DoD artifact |
| W9-6 | `tests/gates/test_ht_engine.sh` | TDD: 10+ tests covering HT create/update/prune/refine |

---

## Tail Risks (ROAM)

| Risk | Disposition | Manipulable Variable |
|---|---|---|
| HT grows unbounded (memory leak) | M — cap node count at 50; prune resolved nodes | `max_ht_nodes` config param |
| Shared context JSONL race condition | M — file-level append is atomic on macOS/Linux | confirm via `O_APPEND` semantics |
| HTR confidence threshold too aggressive (skips real failures) | O — start at 0.95, tune down if false negatives appear | `confidence_threshold` config |
| LEI probe generator hallucinates commands | M — validate every generated command via `git ls-files` check before exec | `probe_validation_gate` flag |
| Wave-9 takes >200 lines in upstream_upgrade_engine.py | M — extract HT logic to `upstream_ht.py` module | monolith guard at 200 lines |

---

## Scorecard Pre-Registration

```
originality:
  new_relationship: "HT node confidence score ↔ SHA drift (forward prediction)"
  improbability: "applying HTR from ML research to CI/CD harness is non-obvious"
  coherence: "builds on existing upstream_runner.py harness_type field from Wave-8"
impact:
  baseline_value: "from 13 repos polled flat → 13 repos with skip-on-stable optimization"
  reward_direction: positive  # next diff: add collection probes, reduce avg cycle time
  tail_penalty: 0.3           # HT schema change requires migration on existing evidence files
  cod_weight: 1.0
  reversibility: 1            # rollback = --no-ht flag in engine, falls back to current behavior
```

**Expected disposition: SHIP** (impact_net = (baseline + positive - 0.3) × 1.0 > 2.0)

---

## DeLM Relevance to Edge Gateway Sync

The `edge_gateway_sync_engine.py` currently runs FQDNs serially with a per-FQDN health probe.
DeLM's shared-context coordination applies directly:

1. Each FQDN health probe becomes a DeLM "sub-task" that writes result to a shared context file
2. No central orchestrator — the engine just starts all probes and reads the shared result file
3. Scales from 9 FQDNs (current) to 100+ without thread-pool reconfiguration

**Concrete change:** Replace `ThreadPoolExecutor` in `edge_runner.py` with append-only
`.goalie/evidence/public-edge/shared_probe_results.jsonl` + parallel `subprocess.Popen` calls.

---

## LEI Relevance to Local Upgrader

`local_upgrader.py` currently runs a static upgrade command per directory. The LEI adaptive
program generation pattern applies:

1. Scan `local_path` for manifest files (Cargo.toml, package.json, pyproject.toml)
2. Generate a targeted upgrade command from the manifest (e.g., `cargo update --aggressive` vs
   `pip3 install --upgrade -r requirements.txt`)
3. Validate generated command against `git ls-files` before execution
4. Cache the generated program fingerprint alongside the dependency hash

This eliminates the current pattern where `local_upgrader.py` uses a generic
`"python3 -c 'import sys; sys.exit(0)'"` placeholder for many repos.
