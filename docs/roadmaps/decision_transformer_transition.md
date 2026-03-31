# Phase 3 Technical Roadmap: Decision Transformer Transition

**Status:** Draft
**Date:** 2025-11-21
**Reference Architecture:** `docs/designs/decision_transformer_architecture.md`

## Objective
This roadmap details the transition of the `prod-cycle` control system from static heuristics to an offline Reinforcement Learning approach using Decision Transformers (DT). The goal is to enable dynamic, context-aware governance that optimizes for velocity and stability based on historical trajectories.

---

## Phase 1: Now (Data Engineering)
**Focus:** Generating high-quality training data from existing logs.

The primary bottleneck for training a Decision Transformer is the availability of structured $(s, a, r)$ trajectories. We must bridge the gap between our current logging format and the requirements of sequence modeling.

### 1.1. Trajectory Aggregation
*   **Goal:** Aggregate 100-200 `prod-cycle` runs into a unified dataset.
*   **Tasks:**
    *   Create `scripts/ml/extract_trajectories.py`.
    *   **State ($s_t$):** Consolidate `metrics_log.jsonl` (cycle status) and `incidents.jsonl` (system health).
    *   **Action ($a_t$):** Infer the implicit control actions taken by previous heuristic runs (e.g., "If depth was 3, record Action=SetDepth(3)").
    *   **Reward ($r_t$):** Implement the reward function defined in the architecture doc:
        $$ R_t = 1.0 \cdot \mathbb{I}(Success) + 0.5 \cdot \Delta ROAM - 0.2 \cdot (\frac{t}{T_{max}}) - 2.0 \cdot \mathbb{I}(Unsafe) $$

### 1.2. Feature Normalization & Schema
*   **Goal:** Ensure consistent input scaling for the Transformer.
*   **Tasks:**
    *   **Risk Scores:** Normalize ROAM scores (0-100) to [0, 1].
    *   **Durations:** Log-normalize execution times to handle outliers.
    *   **Categorical Bucketing:**
        *   **Circles:** One-hot encode [Analyst, Assessor, Innovator, Architect, etc.].
        *   **Patterns:** Map discrete patterns (e.g., "Quick Fix", "Deep Dive") to integer IDs.

### 1.3. Data Validation
*   **Goal:** Verify the integrity of the training set.
*   **Tasks:**
    *   Ensure no "future leakage" in state construction.
    *   Verify that high-reward trajectories actually correspond to desirable behavior.

---

## Phase 2: Next (Modeling & Evaluation)
**Focus:** Training a baseline model and validating it safely in production.

We will use a "Shadow Mode" approach where the model predicts actions in parallel with the existing heuristics, allowing us to compare performance without risking system stability.

### 2.1. Baseline Model Training
*   **Goal:** Train a GPT-2 based Decision Transformer.
*   **Stack:** PyTorch + Hugging Face Transformers.
*   **Tasks:**
    *   Implement `scripts/ml/train_dt.py`.
    *   **Architecture:**
        *   Context Length: 20 steps (approx. 1.5 full cycles).
        *   Hidden Size: 128 (Small/Efficient).
    *   **Objective:** Minimize Cross-Entropy loss for discrete actions (Circle, Depth) given past states and target returns.

### 2.2. "Shadow Mode" Implementation
*   **Goal:** Run inference in `governance.py` without executing actions.
*   **Tasks:**
    *   Export trained model to ONNX format for low-latency inference (< 500ms).
    *   Modify `governance.py` to include a non-blocking inference step:
        ```python
        # Conceptual "Shadow Mode"
        heuristic_action = get_heuristic_action()
        model_action = model.predict(current_state, target_return=MAX_REWARD)
        log_comparison(heuristic_action, model_action)
        return heuristic_action # Execute heuristic for now
        ```

### 2.3. Evaluation & Comparison
*   **Goal:** Quantify the potential lift of the DT model.
*   **Metrics:**
    *   **Agreement Rate:** How often does the model match the heuristic?
    *   **Novelty:** Does the model suggest "Innovator" circles in safe contexts where heuristics might be too conservative?
    *   **Safety Check:** Does the model suggest unsafe actions (e.g., deep depth during high load)?

---

## Phase 3: Later (Advanced Control)
**Focus:** deploying the model as the primary controller with safety guardrails.

Once the model is proven in Shadow Mode, we will promote it to the "Hybrid Supervisor" role.

### 3.1. Hybrid Supervisor System
*   **Goal:** Model-in-the-Loop governance.
*   **Architecture:**
    *   **Primary:** Decision Transformer proposes $(Circle, Depth, Autocommit)$.
    *   **Guardrail:** Static heuristics (from Phase 1) act as a "Veto" layer.
    *   **Fallback:** If Model Confidence < Threshold OR Guardrail = Unsafe, revert to heuristic default.

### 3.2. Predictive Error Handling
*   **Goal:** Proactive throttling.
*   **Concept:** Use the model's internal state or an auxiliary head to predict the probability of failure ($P(Fail)$).
*   **Action:** If $P(Fail) > Threshold$, proactively switch to "Safe Degrade" mode before an incident occurs.

### 3.3. Intelligent Dependency Management
*   **Goal:** Context-aware updates.
*   **Concept:** The DT learns to correlate specific upstream dependency updates with cycle instability.
*   **Action:** Automatically schedule "Maintenance Cycles" when risk is low, rather than blocking active development.

### 3.4. Continuous Retraining Loop
*   **Goal:** Adapt to shifting system dynamics.
*   **Pipeline:**
    1.  Daily aggregation of new `metrics_log.jsonl` entries.
    2.  Automated fine-tuning of the existing ONNX model.
    3.  Canary deployment of the new model version.