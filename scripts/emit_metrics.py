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
        choices=["state", "action", "reward"],
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
        type=int,
        default=0,
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
                "safe_degrade.recovery_cycles": args.safe_degrade_recovery_cycles,

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
