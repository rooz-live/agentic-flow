#!/usr/bin/env python3
"""
Governance Middleware for Agentic Flow Production Maturity.

Implements the 8 Governance Patterns:
1. Safe Degrade
2. Circle Risk Focus
3. Autocommit Shadow
4. Guardrail Lock
5. Failure Strategy
6. Iteration Budget
7. Observability First
8. Depth Ladder

This script orchestrates the 'prod-cycle' execution loop, invoking `af` commands
as necessary and maintaining system state and telemetry.
"""

import os
import sys
import json
import time
import uuid
import subprocess
import argparse
import yaml

# Monkey-patch argparse to allow unknown args (e.g. --environment)
# This is required because governance.py is often called with extra flags
# that are intended for the underlying scripts it orchestrates.
original_parse_args = argparse.ArgumentParser.parse_args

def parse_known_args_wrapper(self, args=None, namespace=None):
    return self.parse_known_args(args, namespace)[0]

argparse.ArgumentParser.parse_args = parse_known_args_wrapper

from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Dict, Any, List, Optional

# Constants
DEFAULT_ITERATIONS = 100
DEFAULT_DEPTH = 3
CIRCLES = [
    "analyst", "assessor", "innovator",
    "intuitive", "orchestrator", "seeker"
]
SAFE_DEGRADE_THRESHOLD_SCORE = 50
SAFE_DEGRADE_THRESHOLD_INCIDENTS = 8


class TelemetryLogger:
    """Handles 'Observability First' pattern logging."""

    def __init__(self, project_root: Path):
        self.goalie_dir = project_root / ".goalie"
        self.goalie_dir.mkdir(parents=True, exist_ok=True)
        self.metrics_log = self.goalie_dir / "metrics_log.jsonl"
        self.pattern_log = self.goalie_dir / "pattern_metrics.jsonl"
        self.test_log = self.goalie_dir / "test_results.jsonl"

    def log_pattern_event(self, event: Dict[str, Any]):
        """Log a governance pattern event."""
        # Ensure ISO8601 timestamp
        if "ts" not in event:
            now = datetime.now(timezone.utc)
            event["ts"] = now.isoformat().replace("+00:00", "Z")

        with open(self.pattern_log, "a") as f:
            f.write(json.dumps(event) + "\n")

    def log_metric(self, metric: Dict[str, Any]):
        """Log a quantitative metric."""
        if "timestamp" not in metric:
            now = datetime.now(timezone.utc)
            metric["timestamp"] = now.isoformat().replace("+00:00", "Z")

        with open(self.metrics_log, "a") as f:
            f.write(json.dumps(metric) + "\n")


class GovernanceMiddleware:
    def __init__(self, args: argparse.Namespace, project_root: Path):
        self.args = args
        self.project_root = project_root
        self.telemetry = TelemetryLogger(project_root)
        self.run_id = str(uuid.uuid4())
        self.environment = getattr(args, "environment", None)

        # State
        self.current_iteration = 1
        self.max_iterations = args.iterations
        self.extensions_used = 0
        self.max_extensions = 3
        self.is_safe = True
        self.safe_degrade_reason = "none"
        self.active_circle = args.circle
        self.current_depth = args.depth

        # Pattern metrics (fed into AF_PC_* env vars for shell logger)
        self.safe_degrade_triggers = 0
        self.safe_degrade_actions: list[str] = []
        self.safe_degrade_recovery_cycles: list[int] = []
        self.safe_degrade_active_since: Optional[int] = None

        self.autocommit_shadow_override = 0
        self.autocommit_runs = 0

        self.circle_risk_roam_delta = 0

        self.last_failure_strategy_mode = "none"
        self.last_failure_strategy_abort_at = 0
        self.last_failure_strategy_reason = "none"

        self.guardrail_lock_enforced = 0
        self.guardrail_lock_requests = 0
        self.guardrail_lock_health = "unknown"

        self.observability_metrics_written = 0
        self.observability_missing_signals = 0
        self.observability_suggestions = 0

        # Minimal RCA state (per run)
        self.dt_consecutive_failures = 0
        self.retro_coach_consecutive_nonzero = 0
        self.emit_metrics_retry_attempts = 0
        self.iterations_without_progress = 0
        self.safe_degrade_error_count = 0
        self.vsix_telemetry_gap_count = 0
        self.safe_degrade_recent_incidents_10m = 0

        self.current_avg_score: float = 100.0
        self.avg_score_samples: int = 0

        self.progress_log_path = self.project_root / ".goalie" / "prod_cycle_progress.log"

    def log_progress(self) -> None:
        """Emit a lightweight progress line for long prod-cycle runs."""

        message = (
            f"[prod-cycle] run {self.run_id} cycle {self.current_iteration}/"
            f"{self.max_iterations} circle={self.active_circle or 'unknown'} "
            f"depth={self.current_depth} safe={self.is_safe}"
        )
        print(message)

        try:
            self.progress_log_path.parent.mkdir(parents=True, exist_ok=True)
            timestamp = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
            with self.progress_log_path.open("a", encoding="utf-8") as handle:
                handle.write(f"{timestamp} {message}\n")
        except Exception:
            # Progress logging must never break prod-cycle
            pass

    def update_rca_counters(self, status: str):
        """Update RCA counters based on cycle status."""
        if status == "failure":
            self.iterations_without_progress += 1
            # If we are in safe degrade mode and failing, increment the error count
            if self.safe_degrade_triggers > 0:
                self.safe_degrade_error_count += 1
        else:
            # Reset progress counter on success
            self.iterations_without_progress = 0

        # VSIX Telemetry Gap Logic
        # Check if pattern_metrics.jsonl has been modified recently (e.g. last 5 minutes)
        # This assumes VSIX or some other process is writing to it.
        # If not, increment gap count.
        pattern_log = self.project_root / ".goalie" / "pattern_metrics.jsonl"
        is_fresh = False
        if pattern_log.exists():
            try:
                mtime = pattern_log.stat().st_mtime
                if time.time() - mtime < 300:  # 5 minutes
                    is_fresh = True
            except Exception:
                pass

        if not is_fresh:
            self.vsix_telemetry_gap_count += 1
        else:
            self.vsix_telemetry_gap_count = 0

    def trigger_rca_if_needed(self, exit_code: int, status: str):
        """
        Evaluates failure state and triggers automated RCA event if thresholds are met.
        Called inside run_cmd_full_cycle() after subprocess execution.
        """
        # Define thresholds
        RCA_CONSECUTIVE_FAILURE_THRESHOLD = 3
        RCA_STAGNATION_THRESHOLD = 3
        RCA_SAFE_DEGRADE_OVERUSE_THRESHOLD = 3

        rca_triggered = False
        reason = "none"
        initial_why = "none"
        methods = []
        patterns = []

        # Heuristic 1: Persistent Failure Loop
        if self.dt_consecutive_failures >= RCA_CONSECUTIVE_FAILURE_THRESHOLD:
            rca_triggered = True
            reason = "persistent_failure_loop"
            initial_why = f"Cycle failed {self.dt_consecutive_failures} times in a row (exit code {exit_code})."
            methods = ["5-whys", "timeline-analysis"]
            patterns = ["ml-training-guardrail", "iteration-budget"]

        # Heuristic 2: Stagnation (No Progress)
        elif self.iterations_without_progress >= RCA_STAGNATION_THRESHOLD:
            rca_triggered = True
            reason = "stagnation"
            initial_why = f"No progress detected for {self.iterations_without_progress} iterations."
            methods = ["5-whys", "value-stream-mapping"]
            patterns = ["governance-review", "circle-risk-focus"]

        # Heuristic 3: Safe Degrade Overuse
        elif self.safe_degrade_error_count >= RCA_SAFE_DEGRADE_OVERUSE_THRESHOLD:
            rca_triggered = True
            reason = "safe_degrade_overuse"
            initial_why = f"Safe degrade triggered {self.safe_degrade_error_count} times with errors."
            methods = ["5-whys", "fishbone"]
            patterns = ["safe-degrade", "iteration-budget"]

        if rca_triggered:
            self._emit_rca_event(reason, initial_why, methods, patterns, exit_code)

    def _emit_rca_event(self, reason: str, initial_why: str, methods: List[str], patterns: List[str], exit_code: int):
        """Helper to emit the actual retro_coach_run event."""
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

        for m in methods:
            cmd.extend(["--retro-method", m])
        for p in patterns:
            cmd.extend(["--retro-design-pattern", p])

        cmd.extend(["--retro-rca-why", initial_why])
        cmd.extend(["--retro-event-prototype", reason])

        try:
            subprocess.run(cmd, check=False)
            print(f"\n[Governance] 🕵️ AUTOMATED RCA TRIGGERED: {reason}")
            print(f"[Governance] Context: {initial_why}")
        except Exception as e:
            print(f"[Governance] Failed to emit RCA event: {e}")

    def _write_preflight_snapshot(self, context: Dict[str, Any]) -> None:
        """Persist a compact JSON snapshot of the guardrail state before iteration loop.

        This is written once per run to .goalie/preflight_<run_id>.json so that
        we can later reconstruct what the system believed about itself at
        pre-flight time (incidents window, scores, autocommit flags, paths).
        """
        try:
            goalie_dir = self.project_root / ".goalie"
            goalie_dir.mkdir(parents=True, exist_ok=True)
            snapshot_path = goalie_dir / f"preflight_{self.run_id}.json"
            base_payload: Dict[str, Any] = {
                "run_id": self.run_id,
                "iteration": self.current_iteration,
                "circle": self.active_circle,
                "depth": self.current_depth,
                "timestamp": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
                "project_root": str(self.project_root),
                "goalie_dir": str(goalie_dir),
            }
            base_payload.update(context)
            with snapshot_path.open("w", encoding="utf-8") as f:
                json.dump(base_payload, f, ensure_ascii=False, indent=2)
        except Exception:
            # Best-effort only; failures here must not break prod-cycle.
            pass

    def check_safe_degrade(self) -> bool:
        """
        Pattern 1: Safe Degrade
        Prevents automated actions when system is stressed or risky.
        """
        incidents_file = self.project_root / "logs/governor_incidents.jsonl"
        recent_incidents = 0
        incident_tail: List[str] = []
        if incidents_file.exists():
            # Time-window based filtering: count system_overload incidents in the last 10 minutes.
            try:
                now = datetime.now(timezone.utc)
                window = timedelta(minutes=10)
                cutoff = now - window

                with open(incidents_file, "r") as f:
                    # Read a reasonable tail; older entries are ignored via timestamp anyway.
                    lines = f.readlines()[-200:]

                incident_tail = [ln.strip() for ln in lines[-5:]]

                recent_incidents = 0
                for line in lines:
                    stripped = line.strip()
                    if not stripped:
                        continue
                    try:
                        data = json.loads(stripped)
                    except json.JSONDecodeError:
                        continue

                    reason = data.get("reason", "")
                    ts_str = data.get("timestamp")
                    if "system_overload" not in reason or not ts_str:
                        continue

                    try:
                        ts = datetime.fromisoformat(ts_str.replace("Z", "+00:00"))
                    except ValueError:
                        continue

                    if ts >= cutoff:
                        recent_incidents += 1
            except Exception:
                recent_incidents = 0

        # Persist recent incident count for downstream RCA metrics
        self.safe_degrade_recent_incidents_10m = recent_incidents

        metrics_file = self.project_root / ".goalie/metrics_log.jsonl"
        avg_score_from_metrics: Optional[float] = None
        if metrics_file.exists():
            try:
                with open(metrics_file, "r") as f:
                    # Only consider a recent window for performance and relevance
                    lines = f.readlines()[-200:]

                # First pass: prefer samples for the current run_id
                for line in lines:
                    try:
                        data = json.loads(line)
                    except Exception:
                        continue
                    if data.get("run_id") != self.run_id:
                        continue
                    if "average_score" in data:
                        avg_score_from_metrics = data["average_score"]
                        break

                # If we have no samples for this run, fall back to any recent samples
                if avg_score_from_metrics is None:
                    for line in lines:
                        try:
                            data = json.loads(line)
                        except Exception:
                            continue
                        if "average_score" in data:
                            avg_score_from_metrics = data["average_score"]
                            break
            except Exception:
                avg_score_from_metrics = None

        if isinstance(avg_score_from_metrics, (int, float)):
            self.current_avg_score = float(avg_score_from_metrics)

        avg_score = self.current_avg_score

        # Require a minimal baseline of score samples before enforcing the score guard.
        # This prevents cold-start runs or sparse metrics from being blocked solely due
        # to avg_score=0.0.
        has_metrics_baseline = avg_score_from_metrics is not None
        has_score_baseline = self.avg_score_samples >= 5 or has_metrics_baseline

        # Allow relaxing the score-based guard via env in dev/lab mode while keeping
        # incident-based blocking intact.
        relax_score_guard = os.environ.get("AF_PROD_RELAX_SCORE_GUARD", "0") == "1"

        is_unsafe_load = recent_incidents > SAFE_DEGRADE_THRESHOLD_INCIDENTS
        is_unsafe_score = (not relax_score_guard) and has_score_baseline and avg_score < SAFE_DEGRADE_THRESHOLD_SCORE

        previously_active = self.safe_degrade_active_since is not None

        if is_unsafe_load:
            self.safe_degrade_reason = f"high_system_load_incidents_{recent_incidents}"
            self.is_safe = False
        elif is_unsafe_score:
            self.safe_degrade_reason = f"low_risk_score_{avg_score}"
            self.is_safe = False
        else:
            self.safe_degrade_reason = "none"
            self.is_safe = True

        if not self.is_safe:
            if not previously_active:
                self.safe_degrade_active_since = self.current_iteration
            self.safe_degrade_triggers += 1
            self.safe_degrade_actions.append(self.safe_degrade_reason)
        elif previously_active and self.safe_degrade_active_since is not None:
            recovery = max(0, self.current_iteration - self.safe_degrade_active_since)
            self.safe_degrade_recovery_cycles.append(recovery)
            self.safe_degrade_active_since = None

        # Log event with explicit guardrail inputs for traceability
        self.telemetry.log_pattern_event({
            "run": "prod-cycle",
            "iteration": self.current_iteration,
            "circle": self.active_circle if self.active_circle else "pre-flight",
            "depth": self.current_depth,
            "pattern": "safe-degrade",
            "mode": "enforce",
            "mutation": not self.is_safe,
            "gate": "system-risk",
            "reason": self.safe_degrade_reason,
            "action": "disable-autocommit" if not self.is_safe else "allow-autocommit",
            "recent_incidents": recent_incidents,
            "incident_threshold": SAFE_DEGRADE_THRESHOLD_INCIDENTS,
            "average_score": avg_score,
            "score_threshold": SAFE_DEGRADE_THRESHOLD_SCORE,
            "incident_tail": incident_tail,
        })

        return self.is_safe

    def determine_circle_focus(self):
        """
        Pattern 2: Circle Risk Focus
        Rotate focus or prioritize specific circle.
        """
        if self.args.circle:
            self.active_circle = self.args.circle
            mode = "fixed"
        elif self.args.rotate_circles:
            # Round-robin
            idx = (self.current_iteration - 1) % len(CIRCLES)
            self.active_circle = CIRCLES[idx]
            mode = "rotate"
        else:
            self.active_circle = CIRCLES[0]
            mode = "default"

        self.update_circle_roam_delta()

        # TODO: Implement Risk-Aware priority query here in future

        self.telemetry.log_pattern_event({
            "run": "prod-cycle",
            "iteration": self.current_iteration,
            "circle": self.active_circle,
            "depth": self.current_depth,
            "pattern": "circle-risk-focus",
            "mode": "enforce",
            "mutation": False,
            "gate": "selection",
            "reason": mode,
            "action": f"select-{self.active_circle}"
        })

    def calculate_depth_ladder(self):
        """
        Pattern 8: Depth Ladder
        Adjust depth based on circle/risk.
        """
        base_depth = self.args.depth

        if self.active_circle == "orchestrator":
            self.current_depth = base_depth + 1
        elif self.active_circle == "innovator":
            self.current_depth = base_depth
        elif self.active_circle == "assessor":
            self.current_depth = base_depth + 2
        else:
            self.current_depth = base_depth

        self.telemetry.log_pattern_event({
            "run": "prod-cycle",
            "iteration": self.current_iteration,
            "circle": self.active_circle,
            "depth": self.current_depth,
            "pattern": "depth-ladder",
            "mode": "mutate",
            "mutation": self.current_depth != base_depth,
            "gate": "calibration",
            "reason": f"circle-{self.active_circle}",
            "action": f"set-depth-{self.current_depth}"
        })

    def check_iteration_budget(self) -> bool:
        """
        Pattern 6: Iteration Budget
        Dynamic extension logic.
        """
        # Check if we are at the limit
        if self.current_iteration > self.max_iterations:
            # Check if we should extend
            # Logic: If we are unsafe (autocommit disabled) but unfinished, maybe extend?
            # Simplified: If unsafe, we might not have committed, so extend to try to finish cleanly?
            # Design says: "If cycle completes successfully but 'unfinished business' remains... extend"

            # For this implementation, if we were forced to disable autocommit, we extend
            if not self.is_safe and self.extensions_used < self.max_extensions:
                self.max_iterations += 1
                self.extensions_used += 1

                self.telemetry.log_pattern_event({
                    "run": "prod-cycle",
                    "iteration": self.current_iteration,
                    "circle": self.active_circle,
                    "depth": self.current_depth,
                    "pattern": "iteration-budget",
                    "mode": "mutate",
                    "mutation": True,
                    "gate": "completion-check",
                    "reason": "unfinished-business-unsafe",
                    "action": "extend-budget"
                })
                return True # Continue
            else:
                return False # Stop

        return True # Continue

    def _emit_metrics_event(self, args: List[str]):
        try:
            subprocess.run(args, check=False)
            self.observability_metrics_written += 1
        except Exception as exc:
            print(f"[Governance] Failed to emit metrics: {exc}")

    def update_circle_roam_delta(self):
        cycle_log = self.project_root / ".goalie" / "cycle_log.jsonl"
        if not cycle_log.exists() or not self.active_circle:
            self.circle_risk_roam_delta = 0
            return

        try:
            scores: List[float] = []
            with open(cycle_log, "r") as f:
                for line in f:
                    line = line.strip()
                    if not line:
                        continue
                    try:
                        data = json.loads(line)
                    except json.JSONDecodeError:
                        continue
                    if data.get("circle") != self.active_circle:
                        continue
                    score = data.get("roam_score")
                    if isinstance(score, (int, float)):
                        scores.append(float(score))
            if len(scores) >= 2:
                self.circle_risk_roam_delta = scores[-1] - scores[-2]
            else:
                self.circle_risk_roam_delta = 0
        except Exception as exc:
            print(f"[Governance] Failed to compute ROAM delta: {exc}")
            self.circle_risk_roam_delta = 0

    def export_env_metrics(self, env: Dict[str, str]):
        env["AF_PC_SAFE_DEGRADE_TRIGGERS"] = str(self.safe_degrade_triggers)
        env["AF_PC_SAFE_DEGRADE_ACTIONS"] = json.dumps(self.safe_degrade_actions[-10:])
        env["AF_PC_SAFE_DEGRADE_RECOVERY_CYCLES"] = json.dumps(self.safe_degrade_recovery_cycles[-10:])
        env["AF_PC_SAFE_DEGRADE_REASON"] = self.safe_degrade_reason

        env["AF_PC_AUTOCOMMIT_RUNS"] = str(self.autocommit_runs)
        env["AF_PC_AUTOCOMMIT_SHADOW_MANUAL_OVERRIDE"] = str(self.autocommit_shadow_override)

        env["AF_PC_CIRCLE_RISK_FOCUS_TOP_OWNER"] = self.active_circle or "unknown"
        env["AF_PC_CIRCLE_RISK_FOCUS_EXTRA_ITERATIONS"] = str(self.extensions_used)
        env["AF_PC_CIRCLE_RISK_FOCUS_ROAM_REDUCTION"] = str(self.circle_risk_roam_delta)

        env["AF_PC_GUARDRAIL_LOCK_ENFORCED"] = str(self.guardrail_lock_enforced)
        env["AF_PC_GUARDRAIL_LOCK_HEALTH_STATE"] = self.guardrail_lock_health
        env["AF_PC_GUARDRAIL_LOCK_USER_REQUESTS"] = str(self.guardrail_lock_requests)

        env["AF_PC_FAILURE_STRATEGY_MODE"] = self.last_failure_strategy_mode
        env["AF_PC_FAILURE_STRATEGY_ABORT_AT"] = str(self.last_failure_strategy_abort_at)
        env["AF_PC_FAILURE_STRATEGY_DEGRADE_REASON"] = self.last_failure_strategy_reason

        env["AF_PC_ITERATION_BUDGET_ENFORCED"] = str(self.current_iteration)

        env["AF_PC_OBSERVABILITY_METRICS_WRITTEN"] = str(self.observability_metrics_written)
        env["AF_PC_OBSERVABILITY_MISSING_SIGNALS"] = str(self.observability_missing_signals)
        env["AF_PC_OBSERVABILITY_SUGGESTION_MADE"] = str(self.observability_suggestions)

        risk_distribution = {self.active_circle or "unknown": self.circle_risk_roam_delta}
        env["AF_PC_RISK_DISTRIBUTION"] = json.dumps(risk_distribution)
        env["AF_PC_CURRENT_RISK_SCORE"] = f"{self.current_avg_score:.3f}"
        env["AF_PC_RECENT_LOAD_INCIDENTS"] = str(self.safe_degrade_recent_incidents_10m)
        env["AF_PC_MAX_ITER"] = str(self.max_iterations)
        env["AF_PC_REQUESTED_ITERATIONS"] = str(self.max_iterations)

    def run_iris_checks(self) -> None:
        """Invoke IRIS health/evaluate commands after each full-cycle iteration.

        IRIS failures must never abort prod-cycle; they are logged as warnings.
        """
        af_script = Path(__file__).resolve().parent.parent / "af"
        if af_script.exists():
            base_cmd = [str(af_script)]
        else:
            base_cmd = ["af"]

        env = os.environ.copy()
        env["AF_RUN_ID"] = self.run_id
        env["AF_RUN_KIND"] = "prod-cycle"
        env["AF_RUN_ITERATION"] = str(self.current_iteration)
        env["AF_CIRCLE"] = self.active_circle
        env["AF_DEPTH_LEVEL"] = str(self.current_depth)
        if self.environment:
            env["AF_IRIS_ENVIRONMENT"] = self.environment
            env["AF_ENVIRONMENT"] = self.environment

        commands = [
            base_cmd + ["iris-health", "--log-goalie"],
            base_cmd + ["iris-evaluate", "--log-goalie"],
        ]

        for cmd in commands:
            try:
                print(f"[Governance] Running IRIS hook: {' '.join(cmd)}")
                subprocess.run(cmd, env=env, check=False)
            except Exception as exc:
                print(f"[Governance] IRIS hook failed but was ignored: {exc}")

    def run_cmd_full_cycle(self):
        """
        Executes the `af full-cycle 1` command with appropriate environment variables.
        Handles Pattern 3 (Autocommit Shadow), Pattern 4 (Guardrail Lock), Pattern 5 (Failure Strategy).
        """

        # Setup Environment
        env = os.environ.copy()
        env["AF_RUN_ID"] = self.run_id
        env["AF_RUN_KIND"] = "prod-cycle"
        env["AF_RUN_ITERATION"] = str(self.current_iteration)
        env["AF_CIRCLE"] = self.active_circle
        env["AF_DEPTH_LEVEL"] = str(self.current_depth)
        if self.environment:
            env["AF_IRIS_ENVIRONMENT"] = self.environment
            env["AF_ENVIRONMENT"] = self.environment

        # Pattern 3: Autocommit Shadow
        if self.args.dry_run:
            env["AF_PROD_SHADOW_MODE"] = "1"
            # In shadow mode, we might want to disable actual commits in af or rely on af to handle shadow flag
            # The design says: "If enabled, cmd_commit prints ... but does not run git commit"
            # We pass this down via ENV.

        # Handle Autocommit Flag based on Safe Degrade
        if self.is_safe and self.args.autocommit and not self.args.dry_run:
            env["AF_FULL_CYCLE_AUTOCOMMIT"] = "1"
            env["AF_ALLOW_CODE_AUTOCOMMIT"] = "1"
        else:
            env["AF_FULL_CYCLE_AUTOCOMMIT"] = "0"
            env["AF_ALLOW_CODE_AUTOCOMMIT"] = "0"

        self.observability_missing_signals = 0 if (self.project_root / ".goalie" / "pattern_metrics.jsonl").exists() else 1
        self.observability_suggestions = 1 if self.observability_missing_signals else 0

        self.export_env_metrics(env)

        # Execute
        # Calculate af script path relative to this script
        # This script: .../scripts/policy/governance.py
        # af script: .../scripts/af
        af_script = Path(__file__).resolve().parent.parent / "af"

        if af_script.exists():
            cmd = [str(af_script), "full-cycle", "1"]
        else:
            # Fallback to PATH or assume 'af' is available
            cmd = ["af", "full-cycle", "1"]

        print(f"\n[Governance] Running Cycle {self.current_iteration}/{self.max_iterations} | Circle: {self.active_circle} | Depth: {self.current_depth} | Safe: {self.is_safe}")

        # Emit 'Action' Metric
        emit_script = (
            Path(__file__).resolve().parent.parent / "emit_metrics.py"
        )
        metrics_log_path = self.project_root / ".goalie/metrics_log.jsonl"

        # Pre-action emit
        self._emit_metrics_event([
            "python3", str(emit_script),
            "--event-type", "action",
            "--run-id", self.run_id,
            "--cycle-index", str(self.current_iteration),
            "--command", "full-cycle",
            "--target", str(self.current_iteration),
            "--log-file", str(metrics_log_path)
        ])

        start_time = time.time()
        return_code = 0
        try:
            # Pattern 5: Failure Strategy - Retry Logic could be wrapped here
            # Design says: "Retry: If af test fails... retry once."
            # But af full-cycle calls af test. We can't easily intercept just the test part unless we break down full-cycle.
            # For now, we run full-cycle. If it fails (return code != 0), we log it.

            subprocess.run(cmd, env=env, check=True)
            status = "success"
        except subprocess.CalledProcessError as e:
            status = "failure"
            return_code = e.returncode
            print(f"[Governance] Cycle failed with exit code {e.returncode}")

            # Treat full-cycle failure as a dt_dataset_build failure for RCA seed purposes.
            self.dt_consecutive_failures += 1

            # Pattern 5: Failure Strategy - Abort on critical failure?
            # For MVP, we log and continue to next iteration unless it's catastrophic.
            self.telemetry.log_pattern_event({
                "run": "prod-cycle",
                "iteration": self.current_iteration,
                "circle": self.active_circle,
                "depth": self.current_depth,
                "pattern": "failure-strategy",
                "mode": "enforce",
                "mutation": False,
                "gate": "cycle-execution",
                "reason": f"exit-code-{e.returncode}",
                "action": "log-failure"
            })

        self.update_rca_counters(status)
        self.trigger_rca_if_needed(return_code, status)

        if status == "success":
            # Reset simple RCA counters when the cycle succeeds.
            self.dt_consecutive_failures = 0
            # iterations_without_progress is handled in update_rca_counters

        duration = time.time() - start_time
        duration_ms = int(duration * 1000)

        # Composite reward components
        # success_term: +1 for success, -1 for failure, 0 otherwise
        success_term = 1.0 if status == "success" else -1.0

        # duration_term: shorter durations are better; normalize by simple heuristic
        # Map duration_ms into roughly [-1, 1] using a soft scale around 60s
        scale_ms = 60000.0
        dur_norm = max(min(1.0 - (duration_ms / scale_ms), 1.0), -1.0)
        duration_term = dur_norm

        # roam_term: future hook for ROAM/risk reduction; currently derived from
        # change in governor risk score when available (placeholder 0.0 here).
        roam_term = 0.0

        reward_value = (
            1.0 * float(success_term)
            + 0.2 * float(duration_term)
            + 0.3 * float(roam_term)
        )

        # Emit 'Reward' Metric with composite reward schema
        self._emit_metrics_event([
            "python3", str(emit_script),
            "--event-type", "reward",
            "--run-id", self.run_id,
            "--cycle-index", str(self.current_iteration),
            "--duration-ms", str(duration_ms),
            "--status", status,
            "--reward-success-term", str(success_term),
            "--reward-duration-term", str(duration_term),
            "--reward-roam-term", str(roam_term),
            "--log-file", str(metrics_log_path)
        ])

        # Log Cycle Metrics via emit_metrics.py (State Event)
        state_args = [
            "python3", str(emit_script),
            "--event-type", "state",
            "--run-id", self.run_id,
            "--cycle-index", str(self.current_iteration),
            "--circle", self.active_circle,
            "--depth", str(self.current_depth),
            "--safe-degrade-triggers", str(self.safe_degrade_triggers),
            "--safe-degrade-actions", json.dumps(self.safe_degrade_actions[-10:]),
            "--safe-degrade-recovery-cycles", json.dumps(self.safe_degrade_recovery_cycles[-10:]),
            "--circle-risk-focus-top-owner", self.active_circle,
            "--circle-risk-focus-extra-iterations", str(self.extensions_used),
            "--circle-risk-focus-roam-reduction", str(self.circle_risk_roam_delta),
            "--autocommit-shadow-manual-override", str(self.autocommit_shadow_override),
            "--guardrail-lock-enforced", str(self.guardrail_lock_enforced),
            "--guardrail-lock-health-state", self.guardrail_lock_health,
            "--guardrail-lock-user-requests", str(self.guardrail_lock_requests),
            "--failure-strategy-mode", "degrade-and-continue" if status == "failure" else self.last_failure_strategy_mode,
            "--failure-strategy-abort-iteration-at", str(self.current_iteration if status == "failure" else self.last_failure_strategy_abort_at),
            "--failure-strategy-degrade-reason", f"exit-code-{return_code}" if status == "failure" else self.last_failure_strategy_reason,
            "--iteration-budget-requested", str(self.max_iterations),
            "--iteration-budget-enforced", str(self.current_iteration),
            "--iteration-budget-autocommit-runs", str(self.autocommit_runs),
            "--observability-first-metrics-written", str(self.observability_metrics_written),
            "--observability-first-missing-signals", str(self.observability_missing_signals),
            "--observability-first-suggestion-made", str(self.observability_suggestions),
            "--dt-consecutive-failures", str(self.dt_consecutive_failures),
            "--dt-consecutive-failures-threshold-reached", "1" if self.dt_consecutive_failures >= 3 else "0",
            "--retro-coach-consecutive-nonzero", str(self.retro_coach_consecutive_nonzero),
            "--retro-coach-consecutive-nonzero-threshold-reached", "1" if self.retro_coach_consecutive_nonzero >= 2 else "0",
            "--emit-metrics-retry-attempts", str(self.emit_metrics_retry_attempts),
            "--emit-metrics-retry-burst-threshold-reached", "1" if self.emit_metrics_retry_attempts >= 5 else "0",
            "--iterations-without-progress", str(self.iterations_without_progress),
            "--prod-cycle-stagnation-threshold-reached", "1" if self.iterations_without_progress >= 2 else "0",
            "--safe-degrade-error-count", str(self.safe_degrade_error_count),
            "--safe-degrade-overuse-flag", "1" if self.safe_degrade_error_count >= 3 else "0",
            "--errors-by-circle", json.dumps({}),
            "--errors-by-pattern", json.dumps({}),
            "--retro-coach-exit-code-histogram", json.dumps({}),
            "--vsix-telemetry-gap-count", str(self.vsix_telemetry_gap_count),
            "--vsix-telemetry-gap-threshold-reached", "1" if self.vsix_telemetry_gap_count >= 2 else "0",
            "--rca-safe-degrade-recent-incidents-10m", str(self.safe_degrade_recent_incidents_10m),
            "--risk-score", f"{self.current_avg_score:.3f}",
            "--average-score", f"{self.current_avg_score:.3f}",
            "--recent-incidents", str(self.safe_degrade_recent_incidents_10m),
            "--log-file", str(metrics_log_path)
        ]
        self._emit_metrics_event(state_args)
        self.record_score_sample(reward_value)

    def record_score_sample(self, reward_value: float):
        normalized = max(0.0, min(100.0, reward_value * 100.0))
        self.avg_score_samples += 1
        if self.avg_score_samples == 1:
            self.current_avg_score = normalized
            return

        smoothing = 0.35
        self.current_avg_score = (
            (1.0 - smoothing) * self.current_avg_score + smoothing * normalized
        )

    def run(self):
        print(f"Starting Prod-Cycle (Run ID: {self.run_id})")

        # Persist last_run_id for downstream tools (e.g., run_dossier helper)
        try:
            goalie_dir = self.project_root / ".goalie"
            goalie_dir.mkdir(parents=True, exist_ok=True)
            last_run_path = goalie_dir / "last_run_id"
            last_run_path.write_text(self.run_id + "\n", encoding="utf-8")
        except Exception:
            # Best-effort only; must not break prod-cycle
            pass

        # Strict Pre-Flight Gate for PI Sync
        if not self.args.force:
            self.check_safe_degrade()
            if not self.is_safe:
                # Best-effort pre-flight snapshot for blocked runs
                self._write_preflight_snapshot({
                    "safe_degrade_reason": self.safe_degrade_reason,
                    "safe_degrade_triggers": self.safe_degrade_triggers,
                    "safe_degrade_actions": self.safe_degrade_actions[-10:],
                    "guardrail": "safe-degrade",
                    "incident_threshold": SAFE_DEGRADE_THRESHOLD_INCIDENTS,
                    "score_threshold": SAFE_DEGRADE_THRESHOLD_SCORE,
                })
                print(f"[Governance] CRITICAL: System Health Check FAILED ({self.safe_degrade_reason}).")
                print("[Governance] Execution BLOCKED for PI Sync stability.")
                print("[Governance] Exiting before iteration loop; reason=" + self.safe_degrade_reason)
                print("[Governance] Use --force to override (NOT RECOMMENDED).")

                # Optional: generate a run dossier for investigations if enabled
                if os.environ.get("AF_PROD_DOSSIER") == "1":
                    try:
                        subprocess.run(
                            [
                                sys.executable,
                                str(self.project_root / "scripts/analysis/run_dossier.py"),
                                "--run-id",
                                self.run_id,
                                "--summary",
                                "--output",
                                str(goalie_dir / f"run_dossier_{self.run_id}.json"),
                            ],
                            check=False,
                        )
                    except Exception:
                        # Best-effort only
                        pass
                sys.exit(1)
            print("[Governance] System Health Check: GREEN")

        print(
            f"[Governance] Starting iteration loop | iterations={self.max_iterations} "
            f"| start_circle={self.active_circle} | force={self.args.force}"
        )

        while self.check_iteration_budget():
            print(
                f"[Governance] Iteration {self.current_iteration}/{self.max_iterations} "
                f"| safe={self.is_safe} | circle={self.active_circle or 'unknown'}"
            )
            # Pre-flight checks
            self.check_safe_degrade()
            self.determine_circle_focus()
            self.calculate_depth_ladder()

            # Lightweight telemetry for long-running batches
            self.log_progress()

            # Execute
            self.run_cmd_full_cycle()
            self.run_iris_checks()

            # Increment
            self.current_iteration += 1

        print("Prod-Cycle Complete.")
        self.telemetry.log_metric({
             "run_id": self.run_id,
             "event": "completion",
             "total_iterations": self.current_iteration - 1,
             "extensions_used": self.extensions_used
        })

        # Optional: generate a run dossier for completed runs if enabled
        if os.environ.get("AF_PROD_DOSSIER") == "1":
            try:
                goalie_dir = self.project_root / ".goalie"
                subprocess.run(
                    [
                        sys.executable,
                        str(self.project_root / "scripts/analysis/run_dossier.py"),
                        "--run-id",
                        self.run_id,
                        "--summary",
                        "--output",
                        str(goalie_dir / f"run_dossier_{self.run_id}.json"),
                    ],
                    check=False,
                )
            except Exception:
                # Best-effort only
                pass

def main():
    parser = argparse.ArgumentParser(description="Agentic Flow Governance Middleware")
    parser.add_argument("--iterations", type=int, default=DEFAULT_ITERATIONS, help="Number of cycles")
    parser.add_argument("--depth", type=int, default=DEFAULT_DEPTH, help="Base depth level")
    parser.add_argument("--circle", type=str, help="Focus on specific circle")
    parser.add_argument("--rotate-circles", action="store_true", default=True, help="Enable circle rotation")
    parser.add_argument("--no-rotate-circles", action="store_false", dest="rotate_circles")
    parser.add_argument("--autocommit", action="store_true", default=True, help="Enable autocommit")
    parser.add_argument("--no-autocommit", action="store_false", dest="autocommit")
    parser.add_argument("--dry-run", "--shadow", action="store_true", help="Shadow mode (no commits)")
    parser.add_argument("--force", action="store_true", help="Bypass pre-flight checks")
    parser.add_argument("--environment", type=str, help="Logical environment name (e.g. prod, staging)")

    # Handle env var overrides
    if os.environ.get("AF_PROD_ITERATIONS"):
        sys.argv.append(f"--iterations={os.environ['AF_PROD_ITERATIONS']}")
    if os.environ.get("AF_PROD_DEPTH"):
        sys.argv.append(f"--depth={os.environ['AF_PROD_DEPTH']}")
    if os.environ.get("AF_PROD_CIRCLE"):
        sys.argv.append(f"--circle={os.environ['AF_PROD_CIRCLE']}")
    if os.environ.get("AF_PROD_AUTOCOMMIT") == "0":
        sys.argv.append("--no-autocommit")
    if os.environ.get("AF_PROD_SHADOW_MODE") == "1":
        sys.argv.append("--dry-run")

    args, unknown = parser.parse_known_args()

    # Find project root by searching for .goalie
    script_path = Path(__file__).resolve()
    project_root = script_path.parent

    # Search upwards for .goalie
    while project_root != project_root.parent:
        if (project_root / ".goalie").exists():
            break
        project_root = project_root.parent
    else:
        # Fallback to CWD if not found
        project_root = Path(os.getcwd())

    middleware = GovernanceMiddleware(args, project_root)
    middleware.run()

if __name__ == "__main__":
    main()
