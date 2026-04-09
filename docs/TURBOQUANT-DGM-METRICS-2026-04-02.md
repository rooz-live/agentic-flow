# TurboQuant DGM Metrics and Alignment Scales (2026-04-02)

## @business-context WSJF-139.B: TurboQuant Swarm Limits Optimization
**Abstract**: The Darwin Gödel Machine (DGM) orchestration dictates that context tokens must be dynamically compressed scaling precisely with physical memory boundaries. This configuration implements the TurboQuant ruleset ensuring recursive token limits do not exceed environmental bounds, structurally eliminating hallucination loops caused by context window fragmentation.

## 1. Context Trimming Bounds (TRUTH / TIME)

The DGM limits bounds trace against explicit limits scaling structurally based on DBOS memory profiles (STX):

### Token Ceiling Bounds (Swarm Nodes):
- **Base Subagent Connectome [STX.10]**: `Limit = 8000 Tokens` (Recursive Pruning enabled via CSQBM)
- **Aggregator Orchestration [STX.11]**: `Limit = 32000 Tokens` (Requires `check-csqbm.sh --deep-why`)
- **Fleet-Wide Map (TurboQuant Baseline)**: `Limit = 64000 Tokens` (Maximum persistent span mapping)

*Constraint R-2026-048*: Token bounds must be explicitly defined natively in any API bounds utilizing `.jsonl` trace buffers.

## 2. Evidence Threshold Configurations (LIVE)

All execution gates inside `investing/` must evaluate explicitly bounded token limits structurally preventing infinite evaluation loops.

| Domain Metric | Limit Bound | Hard Fallback Rule |
| :--- | :---: | :--- |
| **Max Retention History** | `15 cycles` | Drop oldest vectors retaining base WSJF targets. |
| **Commit Payload Span** | `5000 chars` | Summarize via TurboQuant compression regex structurally. |
| **Gate Bypass Rules** | `0%` | Unconditional failure upon try/except swalling metric exceptions. |

## 3. Implementation Matrix Constraints

When binding external interfaces (e.g., `governance.py`), memory tracing variables MUST map logically without blanket swallows:
1. `CSQBM_DEEP_WHY` must map context to explicit `SystemLoadSensor` limits.
2. If token windows exceed `$TURBOQUANT_LIMIT`, the stream rejects gracefully generating Red-Green TDD bounds indicating `Context Overflow`.
