# Phase 2: Decision Transformer Implementation Architecture

**Status:** Draft
**Owner:** Architect
**Date:** 2025-11-21
**Context:** Moving `prod-cycle` governance from static heuristics to offline reinforcement learning using Decision Transformers (DT).

## 1. Executive Summary

This document details the architecture for implementing a Decision Transformer (DT) to control the `prod-cycle` workflow. The system will transition from a purely heuristic-based approach (in `governance.py`) to a hybrid **Model-in-the-Loop** system where the DT predicts optimal governance actions (Circle, Depth, Autocommit) based on historical trajectories, while existing heuristics serve as hard safety guardrails.

**Key Decisions:**
*   **Framework:** PyTorch (training) / ONNX Runtime (inference).
*   **Architecture:** Causal Transformer (GPT-2 style) conditioned on Returns-to-Go (RTG).
*   **Safety:** Heuristics (Safe Degrade, Depth Limits) remain as non-negotiable overrides.
*   **Latency:** Inference budget < 500ms per iteration.

---

## 2. Transition Strategy: Hybrid Control

We will not replace `governance.py` logic wholesale. Instead, we will inject the model as a "Advisor".

### 2.1. Control Flow
```mermaid
graph TD
    A[Start Iteration] --> B{Gather State s_t}
    B --> C[Query Heuristics]
    B --> D[Query Decision Transformer]
    C --> E[Safe Degrade Status]
    D --> F[Suggested Action a_pred]
    E --> G{Is Unsafe?}
    G -- Yes --> H[Override: Force Safe Mode]
    G -- No --> I[Apply a_pred]
    H --> J[Execute Action]
    I --> J
    J --> K[Log Trajectory (s, a, r)]
```

### 2.2. Integration Points in `governance.py`

| Governance Pattern | Current Logic | New Logic (Model + Guardrail) |
| :--- | :--- | :--- |
| **Circle Risk Focus** | Round-Robin or Fixed | `model.predict_action(s_t)` -> Select optimized Circle |
| **Depth Ladder** | Static mapping (e.g., Innovator=Base) | `model.predict_action(s_t)` -> Dynamic Depth (1-5) |
| **Safe Degrade** | Threshold check (Load/Score) | **HARD GUARDRAIL:** Model is ignored if `is_unsafe=True`. |
| **Iteration Budget** | Extend if unsafe & unfinished | `model.predict_action(s_t)` -> Decide if extension adds value. |

---

## 3. Data Engineering Plan

We need to transform existing logs into `(State, Action, Reward)` trajectories.

### 3.1. Data Sources
1.  **`logs/governor_incidents.jsonl`**: Source for system load/risk alerts.
2.  **`.goalie/metrics_log.jsonl`**: Source for cycle outcomes, duration, and governance state.
3.  **`.goalie/pattern_metrics.jsonl`**: Source for discrete governance decisions.

### 3.2. Trajectory Extraction

We will transform raw logs into structured `(State, Action, Reward)` trajectories. A trajectory is a sequence of timesteps: $\tau = (s_1, a_1, r_1, \dots, s_T, a_T, r_T)$.

#### **1. Trajectory Schema**
The training data will follow this JSON schema for each timestep $t$:

*   **State ($s_t$):**
    *   `risk_score` (float): Normalized ROAM score (0.0-1.0), sourced from `metrics_log.jsonl`.
    *   `system_load` (int): Count of `governor_incidents.jsonl` events in the last 10 minutes.
    *   `circle` (one-hot/string): Current active circle (e.g., "analyst", "innovator").
    *   `depth` (int): Current depth ladder setting (1-5).
    *   `budget_remaining` (float/int): Iterations remaining in the current cycle budget.

*   **Action ($a_t$):**
    *   `command` (string/index): The governance command issued (e.g., "full-cycle").
    *   `depth_setting` (int): The depth requested for the next iteration.
    *   `autocommit` (binary/bool): Whether autocommit was enabled (1) or disabled (0).

*   **Reward ($r_t$):**
    The reward function balances success, risk reduction, and cost efficiency.
    $$ R_t = \alpha \cdot \mathbb{I}(\text{Success}) + \beta \cdot \Delta \text{Risk} - \gamma \cdot \text{Cost} $$
    *   $\alpha = 1.0$: Bonus for successful iteration completion.
    *   $\beta = 0.3$: Bonus for reduction in Risk (ROAM) score.
    *   $\gamma = 0.2$: Penalty for Duration (Cost).

#### **2. Pipeline Logic**

*   **Data Merging:**
    We execute a join operation between:
    1.  `logs/governor_incidents.jsonl`: Source of system load and incident alerts.
    2.  `.goalie/metrics_log.jsonl`: Source of governance state, actions, and outcomes.
    *   **Join Key:** Timestamps and `run_id` / `execution_id`. Incident counts are aggregated over a rolling window leading up to the `metrics_log` timestamp.

*   **Returns-to-Go (RTG):**
    For each trajectory, we compute the "Returns-to-Go" $\hat{R}_t$ by summing future rewards backwards from the end of the sequence:
    $$ \hat{R}_t = \sum_{k=t}^T r_k $$
    This guides the model to predict actions that lead to high *future* cumulative rewards.

*   **Normalization:**
    *   **Continuous Features:** `risk_score` and `system_load` are normalized using Z-score normalization ($\frac{x - \mu}{\sigma}$) based on global dataset statistics.
    *   **Categorical Features:** `circle` and `command` are mapped to learned embeddings or one-hot encoded vectors.

#### **3. Context Window Strategy**

*   **Fixed Window ($K=20$):**
    The model operates on a fixed context window of the last $K=20$ steps to capture temporal dependencies within a governance cycle.
    
*   **Handling Sequences:**
    *   **Padding:** If a trajectory is shorter than $K$ steps (e.g., start of a cycle), we left-pad the sequence with zeros (or a special masking token) to fill the window.
    *   **Truncation:** If a trajectory exceeds $K$ steps, we keep the most recent $K$ steps ($t-K+1$ to $t$) for inference, ensuring the model reacts to the immediate history.

---

## 4. Model Architecture

### 4.1. Specification
*   **Base Architecture:** GPT-2 (Decoder-only Transformer).
*   **Context Length ($K$):** **20**. Covers a full standard cycle (12 iterations) plus buffer/extensions.
*   **Hidden Size ($d_{model}$):** 128 (Small/Efficient) to 256.
*   **Heads:** 4.
*   **Layers:** 3.

### 4.2. Inputs
1.  **Returns-to-Go ($\hat{R}_t$):** Target return (e.g., "Perfect Cycle" = 12.0).
2.  **State ($s_t$):** Linear projection of concatenated features.
3.  **Action ($a_{t-1}$):** Learned embedding of previous action.
4.  **Timestep ($t$):** Learned positional embedding.

### 4.3. Training Pipeline
1.  **Offline Dataset:** aggregated trajectories from `metrics_log.jsonl`.
2.  **Loss:** Cross-Entropy (for discrete actions) + MSE (for any continuous control).
3.  **Library:** Hugging Face `transformers` + PyTorch.

---

## 5. Inference Integration

To maintain the lightweight nature of `governance.py` (which runs frequently), we will decouple the heavy ML runtime.

### 5.1. Runtime Environment
*   **Format:** Export trained PyTorch model to **ONNX**.
*   **Engine:** `onnxruntime` (CPU execution provider).
*   **Latency Target:** < 500ms total (loading + inference).

### 5.2. Implementation Plan for `governance.py`
1.  **Model Loader:** Lazy-load the ONNX session on first access.
2.  **Feature Extractor:** Helper function to scrape `metrics_log.jsonl` and `incidents.jsonl` to build $s_t$.
3.  **Target Setter:** Heuristic to define $\hat{R}_{target}$. Start conservatively (e.g., 80% of max observed return).
4.  **Guardrail Wrapper:**
    ```python
    # Pseudocode
    if check_safe_degrade():
        # Heuristic Override
        action = safe_degrade_action()
    else:
        # Model Inference
        state = build_state_vector()
        action = model.predict(state, target_return)
        
        # Bounds Check
        action = apply_safety_bounds(action) 
    ```

## 6. Next Steps
1.  **Data:** Implement `scripts/ml/extract_trajectories.py` to build the training set.
2.  **Training:** Create `scripts/ml/train_dt.py` using PyTorch.
3.  **Inference:** Prototype `scripts/policy/model_inference.py` with ONNX Runtime.