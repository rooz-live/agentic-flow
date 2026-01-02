# Scaffolding Specifications

## 1. `replenish_circle.sh` Modifications

**Current Location:** `investing/agentic-flow/scripts/circles/replenish_circle.sh`
**Goal:** Enforce new dimensionality (Budget, Method Patterns) during the replenishment process.

### Changes Implemented:
1.  **Interactive Prompts:** The script now pauses for each new item found in `QUICK_WINS.md` to ask the Circle Lead for:
    *   **Budget:** Classification as `CapEx` (Investment/New) or `OpEx` (Run/Fix). Defaults to `OpEx`.
    *   **Method Pattern:** The architectural or process pattern being applied (e.g., "Strangler Fig", "TDD"). Defaults to `TDD`.
    *   **Success Criteria:** A specific, forensic check to validate completion. Defaults to `[ ] Action verified`.

2.  **Schema Update:** The target `backlog.md` table format is updated to:
    `| ID | Task | Status | Budget | Method Pattern | Success Criteria |`

## 2. `daily_standup.sh` Implementation

**New Location:** `investing/agentic-flow/scripts/circles/daily_standup.sh`
**Goal:** Provide visibility into the new dimensions without creating artifact clutter.

### Functionality:
1.  **Aggregation:** Scans all `backlog.md` files in the `circles/` directory.
2.  **Filtering:** Displays only `IN_PROGRESS` and `PENDING` items.
3.  **Reporting:**
    *   Lists tasks with their ID, Status, and **Budget** classification.
    *   Provides a summary of Total Active Items, CapEx/OpEx split, and the **OpEx Ratio**.
4.  **Guardrails:** Issues a warning if OpEx exceeds 40% of the active workload, prompting a review of priorities.