# PI Sync Retrospective & Roadmap: RL Telemetry & Agentic Flow

**Date:** November 21, 2025
**Status:** ✅ Implemented & Active

## 1. Now: Retrospective & Status

We have successfully implemented the foundational **RL Telemetry System** for `investing/agentic-flow`'s `prod-cycle`. This system captures full Reinforcement Learning trajectories (State, Action, Reward), enabling the transition from heuristic scripting to data-driven decision making.

### Key Technical Wins

*   **`af` Shell Instrumentation**:
    *   The unified `af` interface has been instrumented to emit events during the `prod-cycle` execution.
    *   It captures the context of every iteration (`AF_RUN_ITERATION`, `AF_CIRCLE`, `AF_DEPTH_LEVEL`).
    *   **Impact**: Zero-overhead capture of "State" (where are we?) and "Action" (what are we running?).

*   **Schema Validation (`emit_metrics.py`)**:
    *   We extended `scripts/emit_metrics.py` to enforce a strict schema for `state`, `action`, and `reward` events.
    *   It standardizes fields like `cycle_index`, `run_id`, and `timestamp` to ensure downstream compatibility.
    *   **Impact**: Guarantees that the data we collect is clean, structured, and ready for ML ingestion.

*   **Trajectory Stitching (`stitch_trajectories.py`)**:
    *   We developed a data processing pipeline that ingests raw event logs (`metrics_log.jsonl`) and groups them into coherent trajectories.
    *   It handles partial sequences and ensures that a "Trajectory" consists of the complete tuple $(S_t, A_t, R_{t+1})$.
    *   **Impact**: Transforms raw logs into training datasets compatible with Decision Transformers.

### Status Confirmation
The system is currently **active** and generating data in `.goalie/metrics_log.jsonl`. Every `prod-cycle` iteration now logs a structured state record, and `af` actions are being tracked.

---

## 2. Next: Immediate Priorities (Coming Weeks)

With the pipeline established, our focus shifts to data quality and model readiness.

1.  **Validation at Scale**:
    *   Run the telemetry system on larger, multi-iteration `prod-cycle` runs to ensure `stitch_trajectories.py` correctly handles complex sequences and edge cases (e.g., crashes, interruptions).

2.  **Data Lake Setup**:
    *   Determine the storage strategy for the generated JSONL files.
    *   *Decision needed*: Will we push `trajectories.jsonl` to S3, a dedicated artifact repository, or a Git LFS pointer?

3.  **Offline Model Prototyping**:
    *   Begin initial experiments using `huggingface/transformers`.
    *   Load the `trajectories.jsonl` data into a standard Dataset format.
    *   Train a small prototype Decision Transformer to predict the "Next Action" based on the current "State".

---

## 3. Later: Strategic Vision

**From Heuristic Control to Model-Based Control**

*   **Current State**: "Heuristic Control" (Bash `if/else`). The `af` script uses static logic and environmental variables (e.g., `AF_FULL_CYCLE_TEST_FIRST`) to decide whether to run tests, commit code, or degrade safely.
*   **Future State**: "Model-Based Control". The Decision Transformer will act as the "Governor".
    *   It will ingest the current `State` (Project health, git status, time of day, recent incidents).
    *   It will predict the optimal `Action` (e.g., "Skip tests this time to save budget," or "Force deep validation due to high risk") to maximize the `Reward` (Successful deployment, low incidents).

---

## Appendix: Telemetry Data Pipeline

```mermaid
graph TD
    subgraph "Runtime (af Shell)"
        A[prod-cycle Start] --> B{Action Decision}
        B -->|Execute| C[Run Command]
        C -->|Result| D[Calculate Reward]
    end

    subgraph "Telemetry Layer"
        E[emit_metrics.py --event-type state]
        F[emit_metrics.py --event-type action]
        G[emit_metrics.py --event-type reward]
        
        A -.-> E
        B -.-> F
        D -.-> G
    end

    subgraph "Storage"
        H[(".goalie/metrics_log.jsonl")]
        E --> H
        F --> H
        G --> H
    end

    subgraph "Processing"
        I[scripts/stitch_trajectories.py]
        H --> I
        I --> J[(".goalie/trajectories.jsonl")]
    end

    subgraph "Training (Future)"
        J --> K[HuggingFace Dataset]
        K --> L[Decision Transformer]
    end