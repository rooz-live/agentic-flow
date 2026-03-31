# Roadmap for Decision Transformer Integration in Agentic Flow

**Context:**
Evolve the `investing/agentic-flow` ecosystem by utilizing `metrics_log.jsonl` as offline training data for a Decision Transformer (DT). The goal is to transition from shell-script heuristics to sequence-modeling-based control for `prod-cycle`.

**References:**
*   [Awesome Decision Transformer](https://github.com/opendilab/awesome-decision-transformer)
*   [Decision Transformer (Original)](https://github.com/kzl/decision-transformer)

## 1. Feasibility & Gap Analysis

### Current State Analysis
*   **Data Sources:**
    *   `metrics_log.jsonl`: Records iteration outcomes (`status`, `duration_s`) and high-level state (`circle`, `depth`, `safe_degrade`).
    *   `pattern_metrics.jsonl`: Records discrete governance actions (`action` field like `disable-autocommit`, `set-depth-3`) and specific pattern context (`reason`, `gate`).
*   **Trajectory Mapping $(R, s, a)$:**
    *   **State ($s_t$):**
        *   *Available:* `circle`, `depth`, `safe_degrade` status, `budget_remaining`, `governor_health`, `cycle_index`.
        *   *Gap:* Need to consolidate `pattern_metrics` context into the main state vector or link them reliably. We need a snapshot of *observations* before the action.
    *   **Action ($a_t$):**
        *   *Available:* Discrete actions are logged in `pattern_metrics.jsonl` (e.g., `extend-budget`, `select-analyst`).
        *   *Gap:* `metrics_log.jsonl` records the *result* of the cycle, not the control decision that initiated it. We need to explicitly log the *Control Action* (e.g., `Action: Run_Cycle(Circle=Analyst, Depth=3, Autocommit=True)`).
    *   **Reward ($r_t$):**
        *   *Available:* `status` ("success"/"failure") in `metrics_log.jsonl`.
        *   *Gap:* Need a continuous reward signal.
            *   *Proposed Reward Function:* $R = w_1 \cdot \mathbb{I}(\text{Success}) + w_2 \cdot (1 - \text{Duration}/\text{MaxTime}) - w_3 \cdot \text{RiskPenalty}$
            *   We need to log "verified insights" or "value delivered" to incentivize quality, not just speed.

### Missing Components
1.  **Unified Event Stream:** Currently, state and actions are split across two files. We need a single "Decision Event" log that captures $(s_t, a_t, r_{t+1})$.
2.  **Explicit Control Step:** The `prod-cycle` script calculates parameters (`determine_circle_focus`, `calculate_depth_ladder`) and then runs. We should log this calculation as a discrete "Control Step" before execution.

## 2. Technical Roadmap ("Now, Next, Later")

### Phase 1: Now (Data & Instrumentation)
**Goal:** Generate "Sequence-Ready" Logs.

1.  **Refactor `governance.py` to emit "Decision Events":**
    *   Instead of just logging `pattern_metrics`, create a consolidated `DecisionRecord`:
        ```json
        {
          "timestamp": "...",
          "run_id": "...",
          "step_index": k,
          "observation": {
            "cycle_index": i,
            "system_load": "...",
            "previous_outcome": "...",
            "budget_remaining": ...
          },
          "action": {
            "type": "configure_cycle",
            "params": {
              "target_circle": "analyst",
              "target_depth": 3,
              "allow_autocommit": true
            }
          },
          "outcome": null  // Populated after execution
        }
        ```
2.  **Enhance `emit_metrics.py`:**
    *   Ensure it accepts a `run_id` and `step_index` to link the execution metrics back to the decision record.
    *   Add "Reward" fields: `value_delivered` (e.g., number of commits, passing tests, new insights).
### Phase 1.1: Composite Reward & Readiness Validation

As of the initial production integration, the following concrete pieces are implemented:

- **Composite reward schema:**
  - Canonical field: `reward.value` (float) on each transition in `trajectories.jsonl`.
  - Components: `reward.components.success`, `reward.components.duration`, `reward.components.roam`.
  - Formula (weights can be revisited as experience grows):
    - `reward.value = 1.0 * success_term + 0.2 * duration_term + 0.3 * roam_term`.
  - `success_term` is derived from iteration outcome (e.g., +1 on success, -1 on failure).
  - `duration_term` is a normalized inverse of cycle duration.
  - `roam_term` is reserved for ROAM / risk-reduction signals.

- **Telemetry emission:**
  - `governance.py` computes the reward components for each prod-cycle iteration.
  - `emit_metrics.py` receives `--reward-success-term`, `--reward-duration-term`, and `--reward-roam-term` (or `--risk-score-delta`) and writes structured reward objects:
    - `{"reward": {"value": ..., "components": {...}}}` into `.goalie/metrics_log.jsonl`.

- **Trajectory validation:**
  - `scripts/analysis/validate_dt_trajectories.py` stitches `.goalie/trajectories.jsonl` into episodes and computes:
    - Horizon statistics and histograms.
    - Reward statistics, malformed reward fraction, and histograms.
    - State feature and action coverage.
  - A configuration file `.goalie/dt_validation_thresholds.yaml` defines readiness thresholds such as `min_episodes`, `max_horizon_variance`, and `min_reward_diversity`.
  - The validator supports a strict mode (`--strict`) with a configurable malformed reward tolerance (`--tolerance`), making it usable both as an exploratory tool and a hard gate.

- **Production success integration:**
  - `scripts/analysis/validate_success_criteria.sh` invokes `af validate-dt --json`, inspects `readiness.warnings`, and treats non-empty warnings as a failure for the "DT Training Readiness" criterion.

This closes Phase 1 for DT integration: we now have a concrete reward signal, sequence-ready trajectories, and a production maturity gate that keeps DT usage honest.

3.  **Data Validation:**
    *   Create a script `scripts/ml/validate_trajectories.py` to verify that logs can be parsed into valid $(s, a, r)$ sequences.

### Phase 2: Next (Offline Training & Modeling)
**Goal:** Train a prototype Decision Transformer.

1.  **Pipeline Setup:**
    *   **Library:** Use `huggingface/transformers` (has generic `DecisionTransformerModel`) or a lightweight PyTorch implementation tailored for non-image/text states.
    *   **Preprocessing:** Convert `jsonl` logs to tokenized sequences.
        *   *State Encoder:* Simple MLP to project numerical/categorical state features into embedding dimension $d_{model}$.
        *   *Action Encoder:* Learnable embeddings for discrete actions (Circle selection, Depth level).
        *   *Reward Encoder:* Scalar projection.
2.  **Context Window:**
    *   A `prod-cycle` is typically 12 iterations. The context window $K$ should cover at least one full cycle ($K \approx 12-20$).
3.  **Training Objective:**
    *   Maximize likelihood of action $a_t$ given sequence of past states, actions, and *future* returns-to-go ($\hat{R}_t$).
    *   $\mathcal{L} = \sum_t (a_t - \pi_\theta(s_t, \hat{R}_t, ...))^2$ (for continuous) or Cross-Entropy (for discrete).

### Phase 3: Later (Inference & Control)
**Goal:** Replace Heuristics with Model Inference.

1.  **Model Serving:**
    *   Export trained model to ONNX or run via a lightweight Python sidecar (`governor_agent.py`).
2.  **Control Loop Integration:**
    *   Modify `governance.py`:
        *   *Current:* `if unsafe: disable_autocommit()`
        *   *Future:*
            1.  Gather $s_t$ (Current metrics + History).
            2.  Define target Return $\hat{R}_{target}$ (e.g., "High Success + Low Risk").
            3.  Query Model: $a_t = \text{Model}(s_{t-K:t}, \hat{R}_{target})$.
            4.  Execute $a_t$ (Set Circle, Depth, Autocommit).
3.  **Safety Guardrails:**
    *   Wrap model output in "Safe Bounds" (e.g., never allow depth > 5 regardless of model output).
    *   Fallback to heuristics if model confidence is low or if "Safe Degrade" is triggered.

## 3. Immediate Action Items
1.  Create `scripts/ml` directory for data processing scripts.
2.  Modify `governance.py` to implement the `DecisionRecord` schema.
3.  Update `af` script to pass `run_id` through to all subprocesses for tracing.