# TURBOQUANT-DGM: Phase 30 WSJF Capability Freshness & Utilization Routing Matrix

> **Executed Date:** 2026-03-29
> **Execution Bound:** TURBOQUANT_CSQBM_PROMPT.md (Local LLM Loop)
> **Constraint:** Evaluate Temporal Active Capability Freshness & MYM-Alignment Scorer. Map ROAM deprecation risks.

## 1. Temporal Active Capability Freshness Ranking
We rank execution tools across standard evolutionary milestones (from oldest/broadest to highly active `now` context).

| Capability Target | Temporal Freshness | Utilization Proxy (.goalie/metrics_log.jsonl) | Evaluation (TRUTH / TIME / LIVE) |
| --- | --- | --- | --- |
| `scripts/ay.sh` | **Century / Decade** | Low/Replaced | Large legacy router. High ROAM risk if purged without migrating edge capabilities to `ay-aliases.sh` and specific orchestrators. MYM TRUTH mismatch (does too many things). |
| `scripts/ay-integrated-cycle.sh` | **Year / Season** | Moderate | Partial alignment. Represents an earlier DGM architecture. LIVE evaluation is unstable due to dependency on legacy manual wrappers. |
| `scripts/orchestrators/cascade-tunnel.sh` | **Month / Week** | High | Standard routing. Used heavily during STX/Local telemetry tunneling. |
| `_SYSTEM/_AUTOMATION/robust-quality.sh` | **Day / Hour** | High | Replaces broad test automation with tight quality loops. High MYM LIVE score. |
| `scripts/cmd_prod_cycle.py` | **Now / Next** | Highest | Optimal Swarm Lifecycle. Generates current telemetry perfectly aligned to MYM (Intention solved, Documentation fresh, Coherence passes). |

## 2. ROAM Risk Deprecation Tracking
### Risk Assessment: Deleting `ay.sh` (Legacy Sprawl)
- **Risk Identified:** "What happens if we delete legacy sprawl without ensuring 100% active transfer?"
- **Impact (TDD/DDD):** Loss of untested edge wrappers (e.g. `ay eval`, `ay trace`) used historically before python orchestrators existed.
- **Mitigation (ROAM):** *Mitigated* by adopting a structural deprecation path instead. Move `ay.sh` into `archive/scripts/ay.sh` temporarily rather than destructive `rm`. 

## 3. WSJF Swarm Optimization Targets
The "next set of script groups" for optimization, drill, and rewrite, governed strictly by highest WSJF (Cost of Delay ÷ Job Size).

1. **`cmd_prod_cycle.py` (WSJF Rank 1 - Refine & Upgrade)**
    - Highest leverage point for the TURBOQUANT DGM prompt. It is actively generating telemetry anchors (`metrics_log.jsonl`).
2. **`check-infra-health.sh` (WSJF Rank 2 - Update)**
    - Add explicit checking against newly consolidated targets (`CONSOLIDATED_RCA_DDD_MATRIX.md`).
3. **`test_automated_rca.sh` (WSJF Rank 3 - Drill/Pivot)**
    - Pivot to evaluate deep-why against the full aggregation model rather than just standard exit codes.

## 4. Constraint GO / NO-GO Summary
The TURBOQUANT loop confirms that the superproject is *GREEN*. Extending new features is structurally permitted because the previous baseline matrices have been perfectly discovered and consolidated.
