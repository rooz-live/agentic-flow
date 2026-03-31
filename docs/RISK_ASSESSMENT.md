# Risk Assessment: Lean-Agentic Integration & Environment Restoration

## Overview
This assessment evaluates the risks associated with the Lean-Agentic integration milestone and the environment restoration process. It applies the ROAM (Resolved, Owned, Accepted, Mitigated) framework.

## Risk Matrix

| Risk ID | Description | Impact | Probability | Status | Mitigation Strategy |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **R-001** | **Learning Continuity Loss**<br>Loss of `episodes.db` during environment restoration resets agent learning. | High | High | **Owned** | Update restoration scripts to include this file. Manual backup required until automation is patched. |
| **R-002** | **Metrics Baseline Reset**<br>Loss of `risk_analytics_baseline.db` leads to invalid calibration. | High | Medium | **Resolved** | Schema patched to unify definitions. Backup requirement identified in Audit. |
| **R-003** | **Schema Divergence**<br>Inconsistent DB schemas causing pipeline failures. | Medium | Low | **Resolved** | Unified schema in `init_risk_analytics_db.py`. |
| **R-004** | **Config Drift**<br>Local config changes lost during restoration. | Medium | Medium | **Accepted** | Developers must commit config changes or manually back up. Standard practice for now. |
| **R-005** | **Hallucination Risk**<br>Agents operating without grounded ontology. | High | Medium | **Mitigated** | Integration of DreamLab AI Ontology and strict learning hooks (judgments). |

## Knowledge Gap Analysis

*   **Gap**: Consistency of "verdict" judgments in learning hooks.
    *   **Action**: Monitor `logs/learning/events.jsonl` for false positive rates.
*   **Gap**: Full impact of "Affiliate Affinity" integration on system load.
    *   **Action**: Enable `system_metrics` collection (now supported in DB) and monitor CPU/Memory during affiliate workflows.

## Effects Analysis

*   **Positive**: Unified metrics DB allows for cross-correlation between process metrics (cycle time) and code quality (PR metrics).
*   **Negative**: Increased backup size due to `episodes.db` and metrics DB inclusion.

## Remediation Roadmap

1.  **Now**: Enforce unified DB schema (Done).
2.  **Next**: Patch `restore-environment.sh` to prevent data loss.
3.  **Later**: Implement automated "Safe Restore" that verifies backup contents before wiping the environment.

## Validation & Test Alignment

*   **Test Suite**: Run `collect_metrics.py` to verify it writes to the unified DB without error.
*   **Validation**: Check `risk_analytics_baseline.db` for presence of all 6 tables.

