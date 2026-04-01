# TURBOQUANT-DGM Local LLM Loop Template

## Active Index (first-stop map for search/grep/vector routing)

This header is an **active index**: the fastest “where do I look?” map before you burn tokens. Prefer *narrow paths first*, then expand.

### Truth / Trust Gates (the “blocks trust” surface)

- **Contract enforcement (root)**: `scripts/contract-enforcement-gate.sh`
  - Primary: `./scripts/contract-enforcement-gate.sh verify`
  - Contains hard gates for: **CSQBM** + **TypeScript typecheck** + **ESLint quiet** (when relevant files changed).
- **Trust-path repair helper**: `scripts/git/trust-path-repair-agentic-flow-submodule.sh`
- **Agentic-flow trust bundle**: `investing/agentic-flow/scripts/validate-foundation.sh` (`--trust-path`)
- **CI strict validation**: `investing/agentic-flow/.github/workflows/strict-validation.yml`
- **CSQBM (Current-State Query Before Merge)**: `investing/agentic-flow/scripts/validators/project/check-csqbm.sh`
  - CI deterministic mode: `CSQBM_CI_MODE=true` (uses `.agentdb/agentdb.sqlite`, `sqlite3`)
  - Local trace mode: scans recent traces + freshness of `.agentdb/agentdb.sqlite`
- **Date semantics validator (email-oriented)**: `investing/agentic-flow/scripts/validators/semantic/validate-dates.sh`
- **Validator meta-orchestrator**: `investing/agentic-flow/scripts/compare-all-validators.sh`

### “What fails today that blocks trust?” quick probes

Run these first when trust is in doubt:

```bash
# Repo integrity / object health
git fsck --full

# Pre-commit / pre-push hooks (what actually runs)
pre-commit run --all-files

# Root enforcement bundle (evidence-backed merge loop)
./scripts/contract-enforcement-gate.sh verify

# Agentic-flow trust path bundle (heavier; produces trust snapshots)
TRUST_GIT=/usr/bin/git bash investing/agentic-flow/scripts/validate-foundation.sh --trust-path
```

### High-signal code search starting points

- **Core TS project**: `agentic-flow-core/`
  - **Lint**: `agentic-flow-core/package.json` (`scripts.lint`)
  - **Typecheck**: `agentic-flow-core/package.json` (`scripts.typecheck`)
  - **Tests**: `agentic-flow-core/src/tests/` + `agentic-flow-core/tests/`
- **Governance / retro / metrics (agentic-flow)**: `investing/agentic-flow/scripts/governance/`, `investing/agentic-flow/scripts/agentic/`, `.goalie/`

### Grep routing (fast path recipes)

```bash
# Where is CSQBM enforced?
rg -n "CSQBM|check-csqbm" investing/agentic-flow/scripts scripts/contract-enforcement-gate.sh

# Where is validate-foundation / trust-path referenced?
rg -n "validate-foundation|trust-path" investing/agentic-flow/scripts scripts

# Where are pre-commit gates defined?
rg -n "contract-enforcement|roam-staleness|annotation-audit" .pre-commit-config.yaml investing/agentic-flow/.pre-commit-config.yaml

# Where is date validation wired?
rg -n "validate-dates|DATE-CHECK" investing/agentic-flow/scripts/validators
```

## Core Objective
Continuously generate, evaluate, and self-modify Agentic QE swarm targets mapping the OpenStack HostBill integration bounds accurately.

### The Swarm Loop: P#.# -> P*.*
```markdown
[TURBOQUANT-DGM-PROMPT-V1]
TARGET_BASELINE: `.goalie/metrics`
EVALUATION_GATE: `.goalie/metrics_log.jsonl`

**Context Bounds (Token Efficiency):**
- Evaluate the exact physical memory utilization within `.goalie/metrics_log.jsonl`.
- Enforce the **Layer Aggregation Model** (Gate Evidence: `check-csqbm.sh` | Causal Metrics: `governance.py` | Retro Synthesis: `cmd_retro.py`) before proposing logic extensions. Do not create new sprawl.

**Iteration Logic (%/#):**
1. Read current PI Sync State (`Now -> Next -> Later`).
2. Evaluate Governance Alignment via **MYM-Alignment Scorer**:
    - **Intention Alignment (TRUTH)**: Does the action solve the objective safely?
    - **Documentation Accuracy (TIME)**: Is the telemetry fully preserved temporally?
    - **Implementation Coherence (LIVE)**: Do the integration constraints compile successfully?
3. Execute **Temporal Active Capability Freshness**: Rank existing structural elements natively (`century`, `decade`, `year`, `season`, `month`, `week`, `day`, `hour`, `now`, `next`, `later`). Prioritize high-utilization metrics within `.goalie/metrics_log.jsonl`.
4. Implement Red/Green TDD Refactor across [Upstream][Downstream][SA][FA].
5. For P(i) in Range(1, MAX_BOUND):
    Determine CSQBM Deep-Why Root Cause.
    Map ROAM Risk Mitigation cleanly to filter out execution waste.
    Output: `.goalie/go_no_go_ledger.md` -> [GREEN].
6. **Temporal WSJF Sync:** Evaluate and explicitly score Return-on-Investment (ROI) integration bounds. Do not extend functionality until all underlying `metrics` indicate 100% test pass logic integration parity.

**Constraint Target:** 100% Traceability across CSM Matrix dynamically triggering PI merge strictly when Infrastructure + CSQBM = GREEN.
```

### Operational local preflight (trust path)

Before a swarm / DGM cycle, run the bundled gate (git + CSQBM + representative shell tests + contract):

`TRUST_GIT=/usr/bin/git bash scripts/validate-foundation.sh --trust-path`

Snapshots land under `.goalie/trust_snapshots/`. **Merge GO** (per ledger) still requires infra + CSQBM green; the script fails the whole bundle if any trust test or contract verify is red.

### Prompt Execution Trace
To run this explicitly:
1. Target Model: `deepseek-coder:1.3b` or `qwen3-coder` (TurboQuant Extreme Compression).
2. Map `agentdb.db` via dynamic `.usage().total_tokens` tracker strictly evaluating < 96h limits safely.
