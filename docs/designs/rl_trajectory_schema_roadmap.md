# RL Trajectory Telemetry Schema & Roadmap

**Status:** Draft
**Owner:** Architect
**Context:** Upgrading `investing/agentic-flow` telemetry to capture full Reinforcement Learning trajectories (State-Action-Reward) for future Decision Transformer training.

## 1. Conceptual Model

To train a Decision Transformer (DT) or other offline RL agents, we need to treat the `prod-cycle` execution as a sequential decision process (Markov Decision Process).

A trajectory $\tau$ consists of a sequence of timesteps:
$$ \tau = (s_1, a_1, r_1, s_2, a_2, r_2, ..., s_T, a_T, r_T) $$

*   **$s_t$ (State):** The observation of the environment at step $t$. Includes current iteration, depth, circle focus, system risk metrics, and active governance patterns.
*   **$a_t$ (Action):** The discrete or continuous choice made by the agent (or the hardcoded script logic acting as the agent). Includes specific CLI commands, parameter adjustments, or flow control decisions.
*   **$r_t$ (Reward):** The scalar feedback received after taking action $a_t$ in state $s_t$. Includes success/failure signals, latency penalties, and efficiency bonuses.

## 2. Schema Extensions

We will extend the existing `.goalie/metrics_log.jsonl` stream. Currently, it heavily favors **State**. We will introduce explicit **Action** and **Reward** event types.

### 2.1. State Schema ($s_t$)
*Refines existing `prod_cycle_iteration` event.*

```json
{
  "type": "trajectory_state",
  "timestamp": "2025-11-21T12:00:00Z",
  "run_id": "uuid-v4",
  "step_id": 1,                 // Monotonic step counter within the trajectory
  "state": {
    "iteration_index": 1,       // 1..12
    "circle": "innovator",      // analyst | assessor | innovator | ...
    "depth_level": 3,           // 1..5
    "system_risk_score": 45,    // 0..100
    "governor_status": "green", // green | yellow | red
    "budget_remaining": 11,
    "active_patterns": ["safe-degrade", "depth-ladder"]
  }
}
```

### 2.2. Action Schema ($a_t$)
*New event type.*

```json
{
  "type": "trajectory_action",
  "timestamp": "2025-11-21T12:00:05Z",
  "run_id": "uuid-v4",
  "step_id": 1,
  "action": {
    "kind": "governance",       // governance | execution
    "command": "set_depth",     // e.g., set_depth, run_test, git_commit, extend_budget
    "params": {
      "target_depth": 4,
      "force": false
    },
    "agent": "governance.py"    // Source of the action
  }
}
```

### 2.3. Reward Schema ($r_t$)
*New event type.*

```json
{
  "type": "trajectory_reward",
  "timestamp": "2025-11-21T12:01:30Z",
  "run_id": "uuid-v4",
  "step_id": 1,
  "reward": {
    "value": 1.0,               // Scalar reward signal
    "components": {             // Breakdown for reward shaping
      "outcome": 1.0,           // +1 for success, -1 for failure
      "duration_penalty": -0.05,// -0.01 per second
      "risk_penalty": 0.0       // Penalty for unsafe actions
    },
    "source": "cmd_test_exit_code"
  }
}
```

## 3. Injection Points

### 3.1. `scripts/policy/governance.py` (Governance Actions)

This script acts as the high-level "policy" (Orchestrator).

| Logic Block | Event Type | Description |
| :--- | :--- | :--- |
| `check_safe_degrade()` | **Action** | `disable_autocommit` vs `allow_autocommit` |
| `calculate_depth_ladder()` | **Action** | `set_depth` (mutation of base depth) |
| `determine_circle_focus()` | **Action** | `select_circle` |
| `check_iteration_budget()` | **Action** | `extend_budget` (if budget exceeded but extension allowed) |
| `check_iteration_budget()` | **Reward** | Penalty for using an extension (e.g., -0.5 per extension) |
| `run_cmd_full_cycle()` | **Reward** | `duration_s` (latency penalty) and `status` (success/fail reward) |

### 3.2. `scripts/af` (Execution Actions)

This script performs the low-level "environment steps".

| Function | Event Type | Description |
| :--- | :--- | :--- |
| `cmd_test()` | **Action** | `run_tests` |
| `cmd_test()` | **Reward** | Exit code 0 (+1) vs non-zero (-1) |
| `cmd_validate()` | **Action** | `run_governor_validation` |
| `cmd_validate()` | **Reward** | Validation success/failure |
| `cmd_commit()` | **Action** | `git_commit` |
| `cmd_commit()` | **Reward** | Commit success (files changed vs empty) |

## 4. Implementation Roadmap

### Phase 1: Now (Schema & Design)
*   [x] Analyze existing telemetry (`emit_metrics.py`).
*   [x] Define $(s_t, a_t, r_t)$ schema extensions.
*   [x] Map injection points.

### Phase 2: Next (Instrumentation)
*   [ ] **Step 1:** Update `emit_metrics.py` (or create `emit_trajectory.py`) to support the new `trajectory_*` event types.
*   [ ] **Step 2:** Instrument `scripts/policy/governance.py`.
    *   Import the emitter.
    *   Emit `trajectory_state` at the start of the loop.
    *   Emit `trajectory_action` inside pattern logic (`calculate_depth_ladder`, etc.).
    *   Emit `trajectory_reward` at end of cycle (duration/status).
*   [ ] **Step 3:** Instrument `scripts/af`.
    *   Add calls to emitter inside `cmd_full_cycle` loop (before/after tests and commits).
*   [ ] **Step 4:** Validation.
    *   Run a dry-run cycle.
    *   Verify `.goalie/metrics_log.jsonl` contains interleaved State-Action-Reward triplets.

### Phase 3: Later (Data Pipeline)
*   [ ] **Sequence Formatting:** Create a script to process `.goalie/metrics_log.jsonl` and group events by `run_id`, then sort by `timestamp`.
*   [ ] **Reward Shaping:** Implement offline logic to propagate delayed rewards (e.g., a failure in step 5 discounts the reward of step 4).
*   [ ] **Tokenization:** Map discrete actions and states to token IDs for Transformer input.