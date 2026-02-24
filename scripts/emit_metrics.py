#!/usr/bin/env python3
import sys
import json
import uuid
import datetime
import os
import argparse


def main():
    parser = argparse.ArgumentParser(
        description="Emit structured JSON metrics for prod-cycle."
    )
    parser.add_argument(
        "--event-type",
        type=str,
        default="state",
        choices=["state", "action", "reward", "retro_coach_run"],
        help="Type of event to emit"
    )
    parser.add_argument(
        "--run-id",
        type=str,
        help="Run identifier"
    )
    parser.add_argument(
        "--cycle-index",
        type=int,
        required=True,
        help="Current cycle iteration index"
    )
    parser.add_argument(
        "--command",
        type=str,
        help="Action command (required for type=action)"
    )
    parser.add_argument(
        "--target",
        type=str,
        help="Action target (required for type=action)"
    )
    parser.add_argument(
        "--duration-ms",
        type=int,
        help="Duration in milliseconds (required for type=reward)"
    )
    parser.add_argument(
        "--reward-success-term",
        type=float,
        default=None,
        help="Optional precomputed success_term component for composite reward"
    )
    parser.add_argument(
        "--reward-duration-term",
        type=float,
        default=None,
        help="Optional precomputed duration_term component for composite reward"
    )
    parser.add_argument(
        "--reward-roam-term",
        type=float,
        default=None,
        help="Optional precomputed roam_term component for composite reward"
    )
    parser.add_argument(
        "--risk-score-delta",
        type=float,
        default=None,
        help="Optional ROAM / risk score delta used to derive roam_term when not provided explicitly"
    )
    parser.add_argument(
        "--status",
        type=str,
        help="Execution status (required for type=reward)"
    )
    parser.add_argument(
        "--depth",
        type=str,
        default="unknown",
        help="Active depth level"
    )
    parser.add_argument(
        "--circle",
        type=str,
        default="unknown",
        help="Active circle"
    )
    parser.add_argument(
        "--safe-degrade-triggers",
        type=int,
        default=0,
        help="Count of safe degrade triggers (failures)"
    )
    parser.add_argument(
        "--autocommit-candidates",
        type=int,
        default=0,
        help="Number of autocommit candidates"
    )
    parser.add_argument(
        "--autocommit-cycles",
        type=int,
        default=0,
        help="Cycles before confidence (shadow metric)"
    )
    parser.add_argument(
        "--budget-remaining",
        type=int,
        default=0,
        help="Remaining iteration budget"
    )
    parser.add_argument(
        "--budget-consumed",
        type=int,
        default=0,
        help="Consumed iteration budget"
    )
    parser.add_argument(
        "--governor-status",
        type=str,
        default="green",
        help="Governor health status"
    )
    parser.add_argument(
        "--risk-score",
        type=float,
        default=0.0,
        help="Current system risk score"
    )
    parser.add_argument(
        "--recent-incidents",
        type=int,
        default=0,
        help="Count of recent load incidents"
    )
    parser.add_argument(
        "--average-score",
        type=float,
        default=0.0,
        help="Average system score (for retro baseline)"
    )
    parser.add_argument(
        "--risk-distribution",
        type=str,
        default="{}",
        help="Risk distribution JSON string"
    )

    # RCA / health counters (optional; default to 0/empty for backwards compatibility)
    parser.add_argument("--dt-consecutive-failures", type=int, default=0, help="Consecutive dt_dataset_build failures for this run")
    parser.add_argument("--dt-consecutive-failures-threshold-reached", type=int, default=0, help="1 if dt_consecutive_failures crossed its RCA threshold")
    parser.add_argument("--retro-coach-consecutive-nonzero", type=int, default=0, help="Consecutive non-zero retro_coach exit codes")
    parser.add_argument("--retro-coach-consecutive-nonzero-threshold-reached", type=int, default=0, help="1 if retro_coach_consecutive_nonzero crossed its RCA threshold")
    parser.add_argument("--emit-metrics-retry-attempts", type=int, default=0, help="Retry attempts for emit_metrics in this iteration")
    parser.add_argument("--emit-metrics-retry-burst-threshold-reached", type=int, default=0, help="1 if emit_metrics_retry_attempts crossed its RCA threshold")
    parser.add_argument("--iterations-without-progress", type=int, default=0, help="Consecutive iterations without progress signals")
    parser.add_argument("--prod-cycle-stagnation-threshold-reached", type=int, default=0, help="1 if iterations_without_progress crossed its RCA threshold")
    parser.add_argument("--safe-degrade-error-count", type=int, default=0, help="Errors attributed to safe-degrade pattern in this run")
    parser.add_argument("--safe-degrade-overuse-flag", type=int, default=0, help="1 if safe_degrade_error_count crossed its RCA threshold")
    parser.add_argument("--errors-by-circle", type=str, default="{}", help="JSON map of error counts by circle")
    parser.add_argument("--errors-by-pattern", type=str, default="{}", help="JSON map of error counts by pattern")
    parser.add_argument("--retro-coach-exit-code-histogram", type=str, default="{}", help="JSON map of retro_coach exit code histogram")
    parser.add_argument("--vsix-telemetry-gap-count", type=int, default=0, help="Count of VSIX telemetry gaps for this run")
    parser.add_argument("--vsix-telemetry-gap-threshold-reached", type=int, default=0, help="1 if vsix_telemetry_gap_count crossed its RCA threshold")
    parser.add_argument("--rca-safe-degrade-recent-incidents-10m", type=int, default=0, help="system_overload incidents in last 10 minutes for Safe Degrade RCA context")
    parser.add_argument(
        "--log-file",
        type=str,
        required=True,
        help="Path to the metrics log file"
    )

    # Pattern: Safe Degrade
    parser.add_argument("--safe-degrade-actions", type=str, default="[]", help="JSON list of actions taken")
    parser.add_argument("--safe-degrade-recovery-cycles", type=str, default="[]", help="Cycles to recovery")

    # Pattern: Circle Risk Focus
    parser.add_argument("--circle-risk-focus-top-owner", type=str, default="none", help="Circle with highest risk")
    parser.add_argument("--circle-risk-focus-extra-iterations", type=int, default=0, help="Extra iterations allocated")
    parser.add_argument("--circle-risk-focus-roam-reduction", type=int, default=0, help="Risk score reduction")

    # Pattern: Autocommit Shadow
    parser.add_argument("--autocommit-shadow-manual-override", type=int, default=0, help="Count of manual overrides")

    # Pattern: Guardrail Lock
    parser.add_argument("--guardrail-lock-enforced", type=int, default=0, help="Times lock enforced")
    parser.add_argument("--guardrail-lock-health-state", type=str, default="unknown", help="Health state at lock")
    parser.add_argument("--guardrail-lock-user-requests", type=int, default=0, help="Times user requested bypass")

    # Pattern: Failure Strategy
    parser.add_argument("--failure-strategy-mode", type=str, default="none", help="Active failure strategy")
    parser.add_argument("--failure-strategy-abort-iteration-at", type=int, default=0, help="Iteration aborted at")
    parser.add_argument("--failure-strategy-degrade-reason", type=str, default="none", help="Reason for degradation")

    # Pattern: Iteration Budget
    parser.add_argument("--iteration-budget-requested", type=int, default=0, help="Requested iterations")
    parser.add_argument("--iteration-budget-enforced", type=int, default=0, help="Enforced iterations")
    parser.add_argument("--iteration-budget-autocommit-runs", type=int, default=0, help="Cycles with autocommit ON")

    # Pattern: Observability First
    parser.add_argument("--observability-first-metrics-written", type=int, default=0, help="Metrics written count")
    parser.add_argument("--observability-first-missing-signals", type=int, default=0, help="Missing signals count")
    parser.add_argument("--observability-first-suggestion-made", type=int, default=0, help="Suggestions made count")

    # Event Type: retro_coach_run
    parser.add_argument("--retro-method", action="append", help="Retro method used (e.g. 5-whys)")
    parser.add_argument("--retro-design-pattern", action="append", help="Retro design pattern used")
    parser.add_argument("--retro-event-prototype", action="append", help="Retro event prototype")
    parser.add_argument("--retro-exit-code", type=int, default=0, help="Exit code for RCA")
    parser.add_argument("--retro-rca-why", action="append", help="5-Whys RCA entry")
    parser.add_argument("--retro-replenishment-merged", type=int, default=0, help="Duplicates merged")
    parser.add_argument("--retro-replenishment-refined", type=int, default=0, help="Refined actions")
    parser.add_argument("--retro-replenishment-error-tag", action="append", help="Error tag for replenishment")

    args = parser.parse_args()

    # Construct the structured log record
    timestamp = datetime.datetime.now(
        datetime.timezone.utc
    ).isoformat().replace("+00:00", "Z")

    safe_degrade_status = (
        "triggered" if args.safe_degrade_triggers > 0 else "monitoring"
    )

    if args.event_type == "action":
        record = {
            "timestamp": timestamp,
            "type": "action",
            "run_id": args.run_id,
            # In a real RL setup, this should be linked
            "iteration_id": str(uuid.uuid4()),
            "cycle_index": args.cycle_index,
            "command": args.command,
            "target": args.target
        }
    elif args.event_type == "reward":
        # Composite reward schema:
        #   reward.value = 1.0 * success_term + 0.2 * duration_term + 0.3 * roam_term
        success_term = (
            args.reward_success_term if args.reward_success_term is not None else 0.0
        )
        duration_term = (
            args.reward_duration_term if args.reward_duration_term is not None else 0.0
        )
        roam_term = args.reward_roam_term
        if roam_term is None and args.risk_score_delta is not None:
            roam_term = args.risk_score_delta
        if roam_term is None:
            roam_term = 0.0

        reward_value = (
            1.0 * float(success_term)
            + 0.2 * float(duration_term)
            + 0.3 * float(roam_term)
        )

        components = {
            "success": float(success_term),
            "duration": float(duration_term),
            "roam": float(roam_term),
        }

        record = {
            "timestamp": timestamp,
            "type": "reward",
            "run_id": args.run_id,
            # In a real RL setup, this should be linked
            "iteration_id": str(uuid.uuid4()),
            "cycle_index": args.cycle_index,
            "duration_ms": args.duration_ms,
            "status": args.status,
            "reward": {
                "value": reward_value,
                "components": components,
            },
        }
    elif args.event_type == "retro_coach_run":
        record = {
            "timestamp": timestamp,
            "type": "retro_coach_run",
            "run_id": args.run_id,
            "cycle_index": args.cycle_index,
            "methods": args.retro_method or [],
            "design_patterns": args.retro_design_pattern or [],
            "event_prototypes": args.retro_event_prototype or [],
            "exit_code": args.retro_exit_code,
            "rca_5_whys": args.retro_rca_why or [],
            "replenishment": {
                "duplicates_merged": args.retro_replenishment_merged,
                "refined_actions": args.retro_replenishment_refined,
                "error_tags": args.retro_replenishment_error_tag or []
            }
        }
    else:
        # Parse JSON fields safely
        try:
            risk_dist = json.loads(args.risk_distribution)
        except:
            risk_dist = {}

        try:
            safe_degrade_actions = json.loads(args.safe_degrade_actions)
        except:
            safe_degrade_actions = []

        try:
            safe_degrade_recovery_cycles = json.loads(args.safe_degrade_recovery_cycles)
        except:
            # Fallback if it's just a plain number string or invalid
            try:
                safe_degrade_recovery_cycles = int(args.safe_degrade_recovery_cycles)
            except:
                safe_degrade_recovery_cycles = 0

        try:
            errors_by_circle = json.loads(args.errors_by_circle)
        except:
            errors_by_circle = {}

        try:
            errors_by_pattern = json.loads(args.errors_by_pattern)
        except:
            errors_by_pattern = {}

        try:
            retro_exit_hist = json.loads(args.retro_coach_exit_code_histogram)
        except:
            retro_exit_hist = {}

        # Default to "state"
        record = {
            "timestamp": timestamp,
            "type": "state",
            "run_id": args.run_id,
            "iteration_id": str(uuid.uuid4()),
            "cycle_index": args.cycle_index,
            "average_score": args.average_score,
            "risk_distribution": risk_dist,
            "patterns": {
                "depth-ladder": "active",
                "safe-degrade": safe_degrade_status,
                "circle-risk-focus": args.circle if args.circle else "none"
            },
            "metrics": {
                # Safe Degrade
                "safe_degrade.triggers": args.safe_degrade_triggers,
                "safe_degrade.actions": safe_degrade_actions,
                "safe_degrade.recovery_cycles": safe_degrade_recovery_cycles,

                # RCA / health counters
                "rca.dt_consecutive_failures": args.dt_consecutive_failures,
                "rca.dt_consecutive_failures_threshold_reached": args.dt_consecutive_failures_threshold_reached,
                "rca.retro_coach_consecutive_nonzero": args.retro_coach_consecutive_nonzero,
                "rca.retro_coach_consecutive_nonzero_threshold_reached": bool(args.retro_coach_consecutive_nonzero_threshold_reached),
                "rca.emit_metrics_retry_attempts": args.emit_metrics_retry_attempts,
                "rca.emit_metrics_retry_burst_threshold_reached": bool(args.emit_metrics_retry_burst_threshold_reached),
                "rca.iterations_without_progress": args.iterations_without_progress,
                "rca.prod_cycle_stagnation_threshold_reached": bool(args.prod_cycle_stagnation_threshold_reached),
                "rca.safe_degrade_error_count": args.safe_degrade_error_count,
                "rca.safe_degrade_overuse_flag": bool(args.safe_degrade_overuse_flag),
                "rca.errors_by_circle": errors_by_circle,
                "rca.errors_by_pattern": errors_by_pattern,
                "rca.retro_coach_exit_code_histogram": retro_exit_hist,
                "rca.vsix_telemetry_gap_count": args.vsix_telemetry_gap_count,
                "rca.vsix_telemetry_gap_threshold_reached": args.vsix_telemetry_gap_threshold_reached,
                "rca.safe_degrade_recent_incidents_10m": args.rca_safe_degrade_recent_incidents_10m,

                # Circle Risk Focus
                "circle_risk_focus.top_owner": args.circle_risk_focus_top_owner,
                "circle_risk_focus.extra_iterations": args.circle_risk_focus_extra_iterations,
                "circle_risk_focus.roam_reduction": args.circle_risk_focus_roam_reduction,

                # Autocommit Shadow
                "autocommit_shadow.candidates": args.autocommit_candidates,
                "autocommit_shadow.cycles_before_confidence": args.autocommit_cycles,
                "autocommit_shadow.manual_override": args.autocommit_shadow_manual_override,

                # Guardrail Lock
                "guardrail_lock.enforced": args.guardrail_lock_enforced,
                "guardrail_lock.health_state": args.guardrail_lock_health_state,
                "guardrail_lock.user_requests": args.guardrail_lock_user_requests,

                # Failure Strategy
                "failure_strategy.mode": args.failure_strategy_mode,
                "failure_strategy.abort_iteration_at": args.failure_strategy_abort_iteration_at,
                "failure_strategy.degrade_reason": args.failure_strategy_degrade_reason,

                # Iteration Budget
                "iteration_budget.remaining": args.budget_remaining,
                "iteration_budget.consumed": args.budget_consumed,
                "iteration_budget.requested": args.iteration_budget_requested,
                "iteration_budget.enforced": args.iteration_budget_enforced,
                "iteration_budget.autocommit_runs": args.iteration_budget_autocommit_runs,

                # Observability First
                "observability_first.metrics_written": args.observability_first_metrics_written,
                "observability_first.missing_signals": args.observability_first_missing_signals,
                "observability_first.suggestion_made": args.observability_first_suggestion_made
            },
            "governor_health": {
                "status": args.governor_status,
                "risk_score": args.risk_score,
                "recent_incidents": args.recent_incidents,
                "throttle_active": args.recent_incidents > 5 or args.risk_score < 50
            }
        }

    # Append to log file
    try:
        log_dir = os.path.dirname(args.log_file)
        if log_dir:
            os.makedirs(log_dir, exist_ok=True)

        with open(args.log_file, "a") as f:
            f.write(json.dumps(record) + "\n")

        print(f"Metrics emitted to {args.log_file}")
    except Exception as e:
        print(f"Error writing metrics: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
