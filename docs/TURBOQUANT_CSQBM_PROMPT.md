# TURBOQUANT-DGM Local LLM Loop Template

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
