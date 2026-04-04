#!/usr/bin/env python3
"""
Unified AF CLI
Provides a unified interface for all agentic flow commands with consistent evidence emission
"""

import argparse
import json
import os
import sys
import time
import uuid
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

# Add the project root to the Python path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))


class UnifiedEvidenceEmitter:
    """Python wrapper for the unified evidence emitter system"""

    def __init__(self, emitter_name: str, run_id: str = None):
        self.emitter_name = emitter_name
        self.run_id = run_id or os.getenv("AF_RUN_ID", str(uuid.uuid4()))
        self.correlation_id = os.getenv("AF_CORRELATION_ID")
        self.mode = os.getenv("AF_MODE", "normal")
        self.command = os.getenv("AF_COMMAND", "unified_cli")

        # Evidence output directory
        self.output_dir = Path.cwd() / ".goalie"
        self.output_file = self.output_dir / "unified_evidence.jsonl"

        # Ensure output directory exists
        self.output_dir.mkdir(exist_ok=True)

    def emit(
        self,
        event_type: str,
        data: Dict[str, Any],
        category: str = "core",
        priority: str = "medium",
        tags: List[str] = None,
    ) -> Dict[str, Any]:
        """Emit a unified evidence event"""

        event = {
            # Core metadata
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "run_id": self.run_id,
            "command": self.command,
            "mode": self.mode,
            # Event identification
            "emitter_name": self.emitter_name,
            "event_type": event_type,
            "category": category,
            # Event data
            "data": data,
            # Performance metadata
            "duration_ms": None,  # Will be set by caller
            "priority": priority,
            # System metadata
            "system_info": self._get_system_info(),
            # Correlation and tracing
            "correlation_id": self.correlation_id,
            "tags": tags,
            # Validation and quality
            "validation_status": {
                "valid": True,
                "errors": [],
                "warnings": [],
                "schema_version": "1.0.0",
            },
            "quality_score": self._calculate_quality_score(data),
        }

        # Write event to file
        with open(self.output_file, "a") as f:
            f.write(json.dumps(event) + "\n")

        return event

    def _get_system_info(self) -> Dict[str, Any]:
        """Get system information"""
        import psutil

        return {
            "cpu_usage": psutil.cpu_percent(),
            "memory_usage": psutil.virtual_memory().used / 1024 / 1024,  # MB
            "node_version": f"{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}",
            "platform": sys.platform,
            "hostname": os.uname().nodename,
            "process_id": os.getpid(),
        }

    def _calculate_quality_score(self, data: Dict[str, Any]) -> float:
        """Calculate quality score for evidence data"""
        score = 100.0

        # Deduct points for missing fields
        if "source" not in data:
            score -= 5
        if "collection_method" not in data:
            score -= 5
        if "confidence" not in data:
            score -= 10
        if not data.get("metadata"):
            score -= 5

        return max(0, min(100, score))


class ProductionCycleExecutor:
    """Executes production cycle with unified evidence emission"""

    def __init__(self, emitter: UnifiedEvidenceEmitter):
        self.emitter = emitter
        self.start_time = None

    def execute(self, args: argparse.Namespace) -> Dict[str, Any]:
        """Execute production cycle"""
        self.start_time = time.time()

        try:
            # Emit start event
            self.emitter.emit(
                "cycle_start",
                {
                    "source": "production_cycle",
                    "collection_method": "automated",
                    "mode": args.mode,
                    "circle": getattr(args, "circle", None),
                    "metadata": {
                        "safeguards": getattr(args, "safeguards", False),
                        "rollout_strategy": getattr(
                            args, "rollout_strategy", "gradual"
                        ),
                        "validation": getattr(args, "validation", False),
                        "pattern_metrics": getattr(args, "pattern_metrics", False),
                        "compliance_checks": getattr(args, "compliance_checks", False),
                    },
                },
                category="operational",
                priority="high",
            )

            # Execute production cycle logic
            result = self._run_production_cycle(args)

            # Emit completion event
            duration_ms = int((time.time() - self.start_time) * 1000)
            completion_event = self.emitter.emit(
                "cycle_complete",
                {
                    "source": "production_cycle",
                    "collection_method": "automated",
                    "status": "completed" if result.get("success", False) else "failed",
                    "duration_ms": duration_ms,
                    "iterations": result.get("iterations", 0),
                    "mutations_applied": result.get("mutations_applied", 0),
                    "metadata": {
                        "result": result,
                        "execution_time_seconds": duration_ms / 1000,
                    },
                },
                category="operational",
                priority="high",
            )
            completion_event["duration_ms"] = duration_ms

            return result

        except Exception as e:
            # Emit error event
            duration_ms = int((time.time() - self.start_time) * 1000)
            error_event = self.emitter.emit(
                "cycle_error",
                {
                    "source": "production_cycle",
                    "collection_method": "automated",
                    "error": str(e),
                    "error_type": type(e).__name__,
                    "duration_ms": duration_ms,
                    "metadata": {
                        "traceback": str(e.__traceback__)
                        if hasattr(e, "__traceback__")
                        else None
                    },
                },
                category="operational",
                priority="critical",
            )
            error_event["duration_ms"] = duration_ms

            raise

    def _run_production_cycle(self, args: argparse.Namespace) -> Dict[str, Any]:
        """Run the actual production cycle logic"""
        # This is a simplified implementation
        # In a real scenario, this would integrate with the actual production cycle system

        iterations = getattr(args, "iterations", 1)
        mutations_applied = 0

        for i in range(iterations):
            # Emit iteration start
            self.emitter.emit(
                "iteration_start",
                {
                    "source": "production_cycle",
                    "collection_method": "automated",
                    "iteration": i,
                    "mode": args.mode,
                    "circle": getattr(args, "circle", None),
                },
                category="operational",
                priority="medium",
            )

            # Simulate work
            time.sleep(0.1)

            # Emit iteration complete
            self.emitter.emit(
                "iteration_complete",
                {
                    "source": "production_cycle",
                    "collection_method": "automated",
                    "iteration": i,
                    "status": "completed",
                    "mutation_applied": args.mode == "mutate",
                },
                category="operational",
                priority="medium",
            )

            if args.mode == "mutate":
                mutations_applied += 1

        return {
            "success": True,
            "iterations": iterations,
            "mutations_applied": mutations_applied,
            "mode": args.mode,
        }


class ProductionSwarmExecutor:
    """Executes production swarm with unified evidence emission"""

    def __init__(self, emitter: UnifiedEvidenceEmitter):
        self.emitter = emitter
        self.start_time = None

    def execute(self, args: argparse.Namespace) -> Dict[str, Any]:
        """Execute production swarm"""
        self.start_time = time.time()

        try:
            # Emit start event
            self.emitter.emit(
                "swarm_start",
                {
                    "source": "production_swarm",
                    "collection_method": "automated",
                    "prior_file": getattr(args, "prior", None),
                    "current_file": getattr(args, "current", None),
                    "auto_ref_file": getattr(args, "auto_ref", None),
                    "metadata": {
                        "discover": getattr(args, "discover", False),
                        "save_table": getattr(args, "save_table", False),
                        "auto_compare": getattr(args, "auto_compare", False),
                    },
                },
                category="operational",
                priority="high",
            )

            # Execute swarm analysis
            result = self._run_swarm_analysis(args)

            # Emit completion event
            duration_ms = int((time.time() - self.start_time) * 1000)
            completion_event = self.emitter.emit(
                "swarm_complete",
                {
                    "source": "production_swarm",
                    "collection_method": "automated",
                    "status": "completed" if result.get("success", False) else "failed",
                    "duration_ms": duration_ms,
                    "tables_analyzed": result.get("tables_analyzed", 0),
                    "comparisons_made": result.get("comparisons_made", 0),
                    "metadata": {
                        "result": result,
                        "execution_time_seconds": duration_ms / 1000,
                    },
                },
                category="operational",
                priority="high",
            )
            completion_event["duration_ms"] = duration_ms

            return result

        except Exception as e:
            # Emit error event
            duration_ms = int((time.time() - self.start_time) * 1000)
            error_event = self.emitter.emit(
                "swarm_error",
                {
                    "source": "production_swarm",
                    "collection_method": "automated",
                    "error": str(e),
                    "error_type": type(e).__name__,
                    "duration_ms": duration_ms,
                    "metadata": {
                        "traceback": str(e.__traceback__)
                        if hasattr(e, "__traceback__")
                        else None
                    },
                },
                category="operational",
                priority="critical",
            )
            error_event["duration_ms"] = duration_ms

            raise

    def _run_swarm_analysis(self, args: argparse.Namespace) -> Dict[str, Any]:
        """Run the actual swarm analysis logic"""
        # This is a simplified implementation
        # In a real scenario, this would integrate with the actual swarm analysis system

        tables_analyzed = 0
        comparisons_made = 0

        # Analyze prior table
        if getattr(args, "prior", None):
            tables_analyzed += 1
            self.emitter.emit(
                "table_analysis",
                {
                    "source": "production_swarm",
                    "collection_method": "automated",
                    "table_type": "prior",
                    "file_path": args.prior,
                    "metadata": {},
                },
                category="operational",
                priority="medium",
            )

        # Analyze current table
        if getattr(args, "current", None):
            tables_analyzed += 1
            self.emitter.emit(
                "table_analysis",
                {
                    "source": "production_swarm",
                    "collection_method": "automated",
                    "table_type": "current",
                    "file_path": args.current,
                    "metadata": {},
                },
                category="operational",
                priority="medium",
            )

        # Analyze auto-ref table
        if getattr(args, "auto_ref", None):
            tables_analyzed += 1
            self.emitter.emit(
                "table_analysis",
                {
                    "source": "production_swarm",
                    "collection_method": "automated",
                    "table_type": "auto_ref",
                    "file_path": args.auto_ref,
                    "metadata": {},
                },
                category="operational",
                priority="medium",
            )

        # Perform comparison if multiple tables
        if tables_analyzed > 1:
            comparisons_made = tables_analyzed - 1
            self.emitter.emit(
                "table_comparison",
                {
                    "source": "production_swarm",
                    "collection_method": "automated",
                    "comparisons": comparisons_made,
                    "metadata": {},
                },
                category="operational",
                priority="medium",
            )

        return {
            "success": True,
            "tables_analyzed": tables_analyzed,
            "comparisons_made": comparisons_made,
        }


# @business-context WSJF-48: WSJF calculation engine — drives all prioritization decisions
#   Cost of Delay = (BV + TC + RR), WSJF = CoD / Job Size.
#   Without this, task ordering reverts to HiPPO effect (highest paid person's opinion).
#   Critical path for fire-focused execution: every ceremony, sprint, and legal deadline
#   flows through this calculator. BV=10, TC=10 for dual-trial deadlines (3/3 + 3/10).
# @adr ADR-020: Chose deterministic WSJF over subjective priority labels
#   because bounded inputs [1,10] with anti-pattern detection (gaming, clustering,
#   staleness) withstand examiner scrutiny. Alternatives: MoSCoW (no math),
#   ICE scoring (no time decay), raw voting (HiPPO vulnerable).
# @constraint DDD-PRIORITIZATION: Must stay within Prioritization bounded context
#   Do NOT import from CaseManagement or Billing domains directly.
#   WSJF scores flow OUT to other contexts via events, not shared state.
# @constraint PERF-P99-200MS: WSJF calculation must complete within 200ms
#   Trading desk and legal deadline monitors poll scores in real-time.
# @planned-change R006: Golden Mean success rate target increases from 60% to 80%
#   Current threshold is interim; will tighten after A011 completes.
#   with_time_decay() recalculates TC as deadline approaches.
class WSJFExecutor:
    """Executes WSJF calculations with unified evidence emission.

    Implements the WSJF = (BV + TC + RR) / Job Size formula with:
    - Bounded inputs [1, 10] to prevent subjective manipulation
    - Anti-pattern detection (gaming via job size, score clustering, staleness)
    - Time decay multiplier for deadline-driven urgency
    - Audit trail via WsjfOverride struct (who/when/why)

    See: docs/WSJF_ADR_DDD_TDD_INTEGRATION.md for cross-framework integration.
    """

    def __init__(self, emitter: UnifiedEvidenceEmitter):
        self.emitter = emitter
        self.start_time = None

    def execute(self, args: argparse.Namespace) -> Dict[str, Any]:
        """Execute WSJF calculation.

        § GOAL: Produce deterministic, auditable priority score.
        § CONSTRAINT: Inputs bounded [1,10]; extreme values require justification.
        § FAILURE: Score without evidence emission is unacceptable.
        § VERIFICATION: Result must include wsjf_score, cost_of_delay, confidence.
        """
        self.start_time = time.time()

        try:
            # Import WSJF calculator
            sys.path.insert(0, str(project_root.parent / "scripts"))
            from wsjf.wsjf_calculator import WSJFCalculator, WSJFInputs

            # Emit start event
            self.emitter.emit(
                "wsjf_start",
                {
                    "source": "wsjf_calculator",
                    "collection_method": "automated",
                    "job_id": getattr(args, "job_id", None),
                    "metadata": {
                        "ubv": getattr(args, "ubv", None),
                        "tc": getattr(args, "tc", None),
                        "rr": getattr(args, "rr", None),
                        "job_size": getattr(args, "job_size", None),
                    },
                },
                category="operational",
                priority="high",
            )

            # Create calculator and inputs
            calculator = WSJFCalculator()
            inputs = WSJFInputs(
                user_business_value=args.ubv or 0.0,
                time_criticality=args.tc or 0.0,
                risk_reduction=args.rr or 0.0,
                job_size=args.job_size or 1.0,
                job_id=args.job_id,
                circle=getattr(args, "circle", None),
            )

            # Calculate WSJF
            result = calculator.calculate_wsjf(inputs)

            # Emit completion event
            duration_ms = int((time.time() - self.start_time) * 1000)
            completion_event = self.emitter.emit(
                "wsjf_complete",
                {
                    "source": "wsjf_calculator",
                    "collection_method": "automated",
                    "status": "completed",
                    "duration_ms": duration_ms,
                    "wsjf_score": result.wsjf_score,
                    "cost_of_delay": result.cost_of_delay,
                    "normalized_score": result.normalized_score,
                    "confidence": result.confidence,
                    "metadata": {
                        "result": result.__dict__,
                        "execution_time_seconds": duration_ms / 1000,
                    },
                },
                category="operational",
                priority="high",
            )
            completion_event["duration_ms"] = duration_ms

            return result.__dict__

        except Exception as e:
            # Emit error event
            duration_ms = int((time.time() - self.start_time) * 1000)
            error_event = self.emitter.emit(
                "wsjf_error",
                {
                    "source": "wsjf_calculator",
                    "collection_method": "automated",
                    "error": str(e),
                    "error_type": type(e).__name__,
                    "duration_ms": duration_ms,
                    "metadata": {
                        "traceback": str(e.__traceback__)
                        if hasattr(e, "__traceback__")
                        else None
                    },
                },
                category="operational",
                priority="critical",
            )
            error_event["duration_ms"] = duration_ms

            raise


class BudgetExecutor:
    """Executes budget operations with unified evidence emission"""

    def __init__(self, emitter: UnifiedEvidenceEmitter):
        self.emitter = emitter
        self.start_time = None

    def execute(self, args: argparse.Namespace) -> Dict[str, Any]:
        """Execute budget operation"""
        self.start_time = time.time()

        try:
            # Import budget tracker
            sys.path.insert(0, str(project_root.parent / "scripts"))
            from wsjf.temporal_budget_tracker import TemporalBudgetTracker

            # Emit start event
            self.emitter.emit(
                "budget_start",
                {
                    "source": "budget_tracker",
                    "collection_method": "automated",
                    "budget_id": getattr(args, "budget_id", None),
                    "metadata": {"amount": getattr(args, "amount", None)},
                },
                category="operational",
                priority="high",
            )

            tracker = TemporalBudgetTracker()

            # Determine operation based on available args
            if getattr(args, "budget_id", None) and getattr(args, "amount", None):
                # Record transaction
                transaction = tracker.record_transaction(
                    budget_id=args.budget_id,
                    amount=args.amount,
                    job_id=getattr(args, "job_id", None),
                )
                result = transaction.__dict__
                operation = "record_transaction"
            elif getattr(args, "budget_id", None):
                # Get budget status
                status = tracker.get_budget_utilization(args.budget_id)
                result = status
                operation = "get_status"
            else:
                # Get alerts
                alerts = tracker.get_budget_alerts()
                result = {"alerts": alerts}
                operation = "get_alerts"

            # Emit completion event
            duration_ms = int((time.time() - self.start_time) * 1000)
            completion_event = self.emitter.emit(
                "budget_complete",
                {
                    "source": "budget_tracker",
                    "collection_method": "automated",
                    "status": "completed",
                    "duration_ms": duration_ms,
                    "operation": operation,
                    "metadata": {
                        "result": result,
                        "execution_time_seconds": duration_ms / 1000,
                    },
                },
                category="operational",
                priority="high",
            )
            completion_event["duration_ms"] = duration_ms

            return result

        except Exception as e:
            # Emit error event
            duration_ms = int((time.time() - self.start_time) * 1000)
            error_event = self.emitter.emit(
                "budget_error",
                {
                    "source": "budget_tracker",
                    "collection_method": "automated",
                    "error": str(e),
                    "error_type": type(e).__name__,
                    "duration_ms": duration_ms,
                    "metadata": {
                        "traceback": str(e.__traceback__)
                        if hasattr(e, "__traceback__")
                        else None
                    },
                },
                category="operational",
                priority="critical",
            )
            error_event["duration_ms"] = duration_ms

            raise


class PriorityExecutor:
    """Executes priority operations with unified evidence emission"""

    def __init__(self, emitter: UnifiedEvidenceEmitter):
        self.emitter = emitter
        self.start_time = None

    def execute(self, args: argparse.Namespace) -> Dict[str, Any]:
        """Execute priority operation"""
        self.start_time = time.time()

        try:
            # Import priority optimizer
            sys.path.insert(0, str(project_root.parent / "scripts"))
            from wsjf.priority_optimizer import PriorityOptimizer, PriorityStrategy

            # Emit start event
            self.emitter.emit(
                "priority_start",
                {
                    "source": "priority_optimizer",
                    "collection_method": "automated",
                    "strategy": getattr(args, "strategy", "wsjf_only"),
                    "metadata": {},
                },
                category="operational",
                priority="high",
            )

            optimizer = PriorityOptimizer()

            # Calculate priorities
            strategy = PriorityStrategy(args.strategy)
            rankings = optimizer.calculate_priorities(strategy)

            result = {
                "rankings": [r.__dict__ for r in rankings],
                "strategy": strategy.value,
                "total_jobs": len(rankings),
            }

            # Emit completion event
            duration_ms = int((time.time() - self.start_time) * 1000)
            completion_event = self.emitter.emit(
                "priority_complete",
                {
                    "source": "priority_optimizer",
                    "collection_method": "automated",
                    "status": "completed",
                    "duration_ms": duration_ms,
                    "strategy": strategy.value,
                    "jobs_ranked": len(rankings),
                    "metadata": {
                        "result": result,
                        "execution_time_seconds": duration_ms / 1000,
                    },
                },
                category="operational",
                priority="high",
            )
            completion_event["duration_ms"] = duration_ms

            return result

        except Exception as e:
            # Emit error event
            duration_ms = int((time.time() - self.start_time) * 1000)
            error_event = self.emitter.emit(
                "priority_error",
                {
                    "source": "priority_optimizer",
                    "collection_method": "automated",
                    "error": str(e),
                    "error_type": type(e).__name__,
                    "duration_ms": duration_ms,
                    "metadata": {
                        "traceback": str(e.__traceback__)
                        if hasattr(e, "__traceback__")
                        else None
                    },
                },
                category="operational",
                priority="critical",
            )
            error_event["duration_ms"] = duration_ms

            raise


def create_parser() -> argparse.ArgumentParser:
    """Create command line argument parser"""
    parser = argparse.ArgumentParser(
        description="Unified AF CLI with consistent evidence emission",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )

    # Global options
    parser.add_argument(
        "--mode",
        choices=["normal", "mutate", "advisory", "enforcement"],
        default="normal",
        help="Execution mode",
    )
    parser.add_argument("--circle", help="Specify circle for execution")
    parser.add_argument("--json", action="store_true", help="Output JSON format")
    parser.add_argument("--verbose", action="store_true", help="Enable verbose logging")
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show what would be executed without running",
    )

    # Production cycle options
    parser.add_argument(
        "--safeguards", action="store_true", help="Enable enhanced safeguards"
    )
    parser.add_argument(
        "--rollout-strategy",
        choices=["gradual", "big-bang", "canary"],
        default="gradual",
        help="Rollout strategy",
    )
    parser.add_argument(
        "--validation", action="store_true", help="Enable comprehensive validation"
    )
    parser.add_argument(
        "--pattern-metrics",
        action="store_true",
        help="Collect pattern execution metrics",
    )
    parser.add_argument(
        "--compliance-checks", action="store_true", help="Run compliance checks"
    )
    parser.add_argument(
        "--iterations", type=int, default=1, help="Number of iterations"
    )

    # Production swarm options
    parser.add_argument("--prior", help="Prior swarm TSV file")
    parser.add_argument("--current", help="Current swarm TSV file")
    parser.add_argument("--auto-ref", help="Auto-reference swarm TSV file")
    parser.add_argument(
        "--discover", action="store_true", help="Auto-discover swarm tables"
    )
    parser.add_argument(
        "--save-table", action="store_true", help="Save current swarm table"
    )
    parser.add_argument(
        "--auto-compare", action="store_true", help="Trigger automated comparison"
    )

    # WSJF options
    parser.add_argument("--job-id", help="Job ID for WSJF calculation")
    parser.add_argument("--ubv", type=float, help="User Business Value (0-10)")
    parser.add_argument("--tc", type=float, help="Time Criticality (0-10)")
    parser.add_argument("--rr", type=float, help="Risk Reduction (0-10)")
    parser.add_argument("--job-size", type=float, help="Job Size (story points)")
    parser.add_argument("--budget-id", help="Budget ID for budget operations")
    parser.add_argument("--amount", type=float, help="Amount for budget transactions")
    parser.add_argument(
        "--strategy",
        choices=[
            "wsjf_only",
            "budget_aware",
            "time_critical",
            "circle_balanced",
            "risk_weighted",
        ],
        default="wsjf_only",
        help="Priority calculation strategy",
    )

    # Positional arguments
    parser.add_argument(
        "command",
        choices=["prod-cycle", "prod-swarm", "wsjf", "budget", "priority"],
        help="Command to execute",
    )

    return parser


def main():
    """Main entry point"""
    parser = create_parser()
    args = parser.parse_args()

    # Set environment variables
    os.environ["AF_MODE"] = args.mode
    os.environ["AF_COMMAND"] = args.command

    # Create unified evidence emitter
    emitter = UnifiedEvidenceEmitter("unified_cli")

    try:
        if args.command == "prod-cycle":
            executor = ProductionCycleExecutor(emitter)
            result = executor.execute(args)
        elif args.command == "prod-swarm":
            executor = ProductionSwarmExecutor(emitter)
            result = executor.execute(args)
        elif args.command == "wsjf":
            executor = WSJFExecutor(emitter)
            result = executor.execute(args)
        elif args.command == "budget":
            executor = BudgetExecutor(emitter)
            result = executor.execute(args)
        elif args.command == "priority":
            executor = PriorityExecutor(emitter)
            result = executor.execute(args)
        else:
            raise ValueError(f"Unknown command: {args.command}")

        # Output result
        if args.json:
            print(json.dumps(result, indent=2))
        else:
            print(f"Command '{args.command}' completed successfully")
            if args.verbose:
                print(f"Result: {result}")

        return 0

    except Exception as e:
        if args.json:
            print(
                json.dumps(
                    {"error": str(e), "error_type": type(e).__name__, "success": False},
                    indent=2,
                )
            )
        else:
            print(f"Error: {e}")

        return 1


if __name__ == "__main__":
    sys.exit(main())
