# Continuous Improvement & Learning Loop Acceleration Strategy

This document outlines the rigorous process for "Replenishment," "Objective Standups," "Reviews," and "Actionable Retro Refinements" within the Agentic Flow Circles. It integrates financial dimensions ("CapEx/OpEx") and "Method Pattern Availability" into the workflow to ensure sustainable growth and learning.

## 1. The Learning Acceleration Loop (P/D/A Cycle)

The core of our continuous improvement is the **Plan-Do-Act (P/D/A)** cycle, accelerated by forensic verification.

### The Cycle

1.  **Plan (Replenishment & Refinement):**
    *   **Input:** Insights from `QUICK_WINS.md` (tagged `source:retro`), strategic requirements.
    *   **Action:** Circle Leads use `replenish_circle.sh` to pull items into their Circle's `backlog.md`.
    *   **Enrichment:** Items are enriched with:
        *   **Budget:** CapEx (Growth/New) or OpEx (Maintenance/Keep-the-lights-on).
        *   **Method Pattern:** Reference to a proven pattern (e.g., `[Pattern Name](path/to/pattern.md)`).
        *   *Recommended:* Use [CoD/WSJF Prioritization](patterns/cod-wsjf-prioritization.md) for ordering.
    *   **Success Criteria:** A specific, searchable forensic check (e.g., "grep 'function_name' src/file.ts").

2.  **Do (Execution & Flow):**
    *   **Action:** Work is performed. Status moves from `PENDING` -> `IN_PROGRESS` -> `COMPLETE`.
    *   **Standup:** Daily script-driven standups (`daily_standup.sh`) aggregate status across circles without manual reporting overhead.

3.  **Act (Review & Retro):**
    *   **Forensic Verification:** The `Success Criteria` defined in the backlog is validated using `code_search.py` or `doc_query.py`.
    *   **Retro:** Completed items feed back into `QUICK_WINS.md` as new insights or process improvements, restarting the cycle.
    *   **Skill Improvement:** Verified outputs become new Method Patterns or refine existing ones.

---

## 2. Standup & Review Protocol

To maintain velocity and reduce administrative overhead, standups and reviews are script-driven.

### Objective Standups

*   **Mechanism:** A script (`scripts/circles/daily_standup.sh`) aggregates the state of all Circle `backlog.md` files.
*   **Output:** A transient report (stdout) showing:
    *   **Blocked Items:** High priority attention needed.
    *   **In Progress:** Current WIP.
    *   **Recently Completed:** Items verified in the last 24h.
    *   **Budget Split:** Current CapEx vs. OpEx ratio for the sprint.

### Reviews

*   **Mechanism:** Weekly review of the aggregated Backlog vs. `QUICK_WINS.md`.
*   **Focus:**
    *   Did we respect the Budget split?
    *   Did we use the declared Method Patterns?
    *   **Forensic Check:** Run the `Success Criteria` queries for all "COMPLETED" items. If the query returns nothing, the item is NOT done.

---

## 3. Refinement with Dimensionality (Backlog Schema)

The `backlog.md` in each Circle (e.g., `circles/orchestrator/.../backlog.md`) is the single source of truth.

### Schema Definition

```markdown
| ID | Task | Status | Budget | Method Pattern | Success Criteria (Forensic) | DoR (Baseline) | DoD (Verification) |
|---|---|---|---|---|---|---|---|
| FLOW-123 | Optimize Docker Build | IN_PROGRESS | OpEx | [Cache-First Build](patterns/docker-cache.md) | `grep "RUN --mount=type=cache" Dockerfile` | [ ] Baselined | [ ] Verified |
```

### Column Definitions

*   **ID:** Unique identifier (e.g., `FLOW-R-timestamp-random`).
*   **Task:** concise description.
*   **Status:** `PENDING`, `IN_PROGRESS`, `BLOCKED`, `COMPLETE`.
*   **Budget:**
    *   `CapEx`: Capital Expenditure. New features, capability growth, architectural improvements that add asset value.
    *   `OpEx`: Operational Expenditure. Maintenance, bug fixes, "keeping the lights on", paying down debt without new capability.
*   **Method Pattern:** Link to a standard operating procedure or design pattern. Ensures we aren't reinventing the wheel.
*   **Success Criteria (Forensic):** A command or search string that *prove* the work is done.
    *   *Good:* `grep "retry_strategy" src/config.ts`
    *   *Bad:* "Check if it works"

---

## 4. Scaffolding Specifications

### Updated `replenish_circle.sh`

Must be updated to:
1.  Parse the new `QUICK_WINS.md` format or prompt the user for the new columns during replenishment.
2.  Generate the row with empty placeholders for `Budget`, `Method Pattern`, and `Success Criteria` if not provided.
3.  Validation: Warn if `Success Criteria` is missing.

### New `daily_standup.sh`

**Logic:**
1.  Find all `backlog.md` files in `investing/agentic-flow/circles/`.
2.  Parse the table in each backlog.
3.  Filter for `IN_PROGRESS` or `BLOCKED`.
4.  Calculate CapEx/OpEx ratio from `COMPLETE` items in the current sprint (based on ID timestamp or separate date tracking if added).
5.  Output a formatted summary to the terminal.