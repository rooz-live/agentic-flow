# Automated RCA Trigger Logic Design

## 1. Mechanism Analysis

To move from reactive logging to proactive, automated Root Cause Analysis (RCA), we need a stateful mechanism within the `GovernanceMiddleware` (in `investing/agentic-flow/scripts/policy/governance.py`) that tracks the *trajectory* of failures, not just individual instances.

### Event Tracking
We will introduce a `FailureContext` or expand the state within the `GovernanceMiddleware` class. This state will track:
*   **Consecutive Exit Codes:** A counter of recent exit codes to detect repetition.
*   **Failure Burst Count:** Number of failures within a sliding window (e.g., last 5 cycles).
*   **Retry Loop Detection:** Tracking if the same command/target pair is failing repeatedly (implicitly handled by the cycle loop in `governance.py`).

### Thresholds
We define strict thresholds that, when violated, shift the system from "Retry" mode to "Analyze" mode.

*   `RCA_CONSECUTIVE_FAILURE_THRESHOLD` (default: 3): If the same error occurs 3 times in a row, standard retries are futile. Stop and Analyze.
*   `RCA_SAFE_DEGRADE_REENTRY_THRESHOLD` (default: 2): If we enter "Safe Degrade" mode more than twice in a session, the degradation logic itself might be the cause.
*   `RCA_RISK_SATURATION_THRESHOLD` (default: < 30): If the Governor Risk Score drops critically low, immediate analysis is required.

## 2. Heuristic Design

The core logic links specific threshold violations to the `retro_coach_run` event schema fields defined in `investing/agentic-flow/scripts/emit_metrics.py`.

### Logic Flow
1.  **Monitor:** After every `af full-cycle` execution in `governance.py`, update the failure counters.
2.  **Evaluate:** Check if any `RCA_*` thresholds are breached.
3.  **Trigger:** If breached, construct the `retro_coach_run` payload and emit it using the `emit_metrics.py` script.

### Mapping Violations to Schema

| Threshold Violation | `methods` (RCA Tool) | `design_patterns` (Context) | `event_prototypes` |
| :--- | :--- | :--- | :--- |
| 3x Consecutive `EXIT_CODE_X` | `["5-whys"]` | `["failure-strategy", "iteration-budget"]` | `["persistent-failure-loop"]` |
| Safe Degrade Triggered > 2x | `["fishbone-analysis"]` | `["safe-degrade", "guardrail-lock"]` | `["instability-oscillation"]` |
| Governor Risk Score < 30 | `["pre-mortem"]` | `["observability-first"]` | `["risk-saturation"]` |

### Pseudocode Implementation

This logic belongs in `investing/agentic-flow/scripts/policy/governance.py`.

```python
class GovernanceMiddleware:
    def __init__(self, ...):
        # ... existing init ...
        self.consecutive_failures = 0
        self.last_exit_code = 0
        self.rca_triggered_for_run = False # Latches to prevent spamming RCAs

    def trigger_rca_if_needed(self, exit_code: int, status: str):
        """
        Evaluates failure state and triggers automated RCA event if thresholds are met.
        Called inside run_cmd_full_cycle() after subprocess execution.
        """
        if status == "success":
            self.consecutive_failures = 0
            return

        # Update State
        self.consecutive_failures += 1
        self.last_exit_code = exit_code

        # Heuristic 1: Persistent Failure Loop
        # If we fail 3 times in a row, we assume a structural issue.
        if self.consecutive_failures >= 3 and not self.rca_triggered_for_run:
            self._emit_rca_event(
                reason="persistent_failure_loop",
                methods=["5-whys"],
                patterns=["failure-strategy", "iteration-budget"],
                exit_code=exit_code,
                initial_why=f"Why did the cycle fail {self.consecutive_failures} consecutive times with exit code {exit_code}?"
            )
            self.rca_triggered_for_run = True 

        # Heuristic 2: Safe Degrade Oscillation
        # If we've triggered safe degrade multiple times, the strategy isn't stabilizing the system.
        if self.safe_degrade_triggers > 2 and not self.rca_triggered_for_run:
             self._emit_rca_event(
                reason="safe_degrade_oscillation",
                methods=["fishbone-analysis"],
                patterns=["safe-degrade", "guardrail-lock"],
                exit_code=exit_code,
                initial_why="Why is the system oscillating in and out of Safe Degrade mode?"
            )
            self.rca_triggered_for_run = True

    def _emit_rca_event(self, reason: str, methods: List[str], patterns: List[str], exit_code: int, initial_why: str):
        """
        Invokes emit_metrics.py with retro_coach_run event type.
        """
        emit_script = Path(__file__).resolve().parent.parent / "emit_metrics.py"
        metrics_log_path = self.project_root / ".goalie/metrics_log.jsonl"

        cmd = [
            "python3", str(emit_script),
            "--event-type", "retro_coach_run",
            "--run-id", self.run_id,
            "--cycle-index", str(self.current_iteration),
            "--retro-exit-code", str(exit_code),
            "--log-file", str(metrics_log_path)
        ]
        
        # Append repeated arguments
        for m in methods:
            cmd.extend(["--retro-method", m])
        for p in patterns:
            cmd.extend(["--retro-design-pattern", p])
        
        # Pass the initial 'Why' to kickstart the analysis
        cmd.extend(["--retro-rca-why", initial_why])
        
        # Add prototype tag
        cmd.extend(["--retro-event-prototype", reason])

        try:
            subprocess.run(cmd, check=False)
            print(f"\n[Governance] 🕵️ AUTOMATED RCA TRIGGERED: {reason}")
            print(f"[Governance] Context: {initial_why}")
        except Exception as e:
            print(f"[Governance] Failed to emit RCA event: {e}")

```

## 3. Traceability Improvement

Standard stateless logging tells you *what* happened at a specific timestamp. This design adds **causal linkage**:

1.  **Run Linkage:** The `run_id` binds the RCA event to the specific sequence of actions (cycles) that preceded it. We can query "Show me the 3 cycles before RCA run X".
2.  **Contextual Headers:** By populating `design_patterns`, we categorize the failure *architecturally* (e.g., "This was a Guardrail Lock failure", not just "Error 500").
3.  **Automated Inquiry:** The `rca_5_whys` field is seeded with the *specific failure context* (e.g., "Why 3x failures?"). This means the Retrospective Agent doesn't start from a blank slate; it starts with a specific investigative prompt derived from the machine state.

```mermaid
sequenceDiagram
    participant Governance
    participant EmitMetrics
    participant RetroCoach

    Governance->>Governance: Run Cycle (Fail)
    Governance->>Governance: consecutive_failures++ (1)
    Governance->>Governance: Run Cycle (Fail)
    Governance->>Governance: consecutive_failures++ (2)
    Governance->>Governance: Run Cycle (Fail)
    Governance->>Governance: consecutive_failures++ (3)
    Governance->>Governance: Threshold Violated!
    
    Note right of Governance: Trigger Automated RCA

    Governance->>EmitMetrics: emit(type="retro_coach_run", method="5-whys")
    EmitMetrics-->>RetroCoach: Log Event (metrics_log.jsonl)
    
    Note right of RetroCoach: Next Retro Session loads this event
    RetroCoach->>User: "I detected a persistent failure loop in Run ID 123. Let's analyze."