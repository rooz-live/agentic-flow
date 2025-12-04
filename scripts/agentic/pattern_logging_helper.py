# -*- coding: utf-8 -*-
"""pattern_logging_helper.py
================================

Central helper used by af/governance tooling to append rich pattern telemetry to
`.goalie/pattern_metrics.jsonl` and `.goalie/metrics_log.jsonl`.

Capabilities
------------
1. Structured logging for governance patterns such as safe_degrade, guardrail_lock,
   iteration_budget, depth_ladder, observability_first, etc.
2. Optional workload metadata blocks for HPC / ML / Stats scenarios so VS Code
   dashboards and retro tooling can render specialized charts.
3. Sample data generator (`--generate-samples`) that appends representative
   HPC/ML/Stats records for visualization tests without touching production
   telemetry.

The helper is intentionally standalone (invoked via ``python3 scripts/agentic/
pattern_logging_helper.py <args>``) so bash wrappers like `scripts/af` can emit
pattern events without embedding complex JSON logic.
"""

from __future__ import annotations

import argparse
import json
import os
import socket
import subprocess
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional


PROJECT_ROOT = Path(__file__).resolve().parents[2]
GOALIE_DIR = PROJECT_ROOT / ".goalie"
PATTERN_LOG = GOALIE_DIR / "pattern_metrics.jsonl"
METRICS_LOG = GOALIE_DIR / "metrics_log.jsonl"


def ensure_risk_baseline_db(force: bool = False) -> Path:
    """Ensure metrics/risk_analytics_baseline.db exists."""
    metrics_dir = PROJECT_ROOT / "metrics"
    db_path = metrics_dir / "risk_analytics_baseline.db"
    metrics_dir.mkdir(parents=True, exist_ok=True)

    if db_path.exists() and not force:
        return db_path

    init_script = PROJECT_ROOT / "scripts" / "metrics" / "init_risk_analytics_db.py"
    if not init_script.exists():
        # Create empty file so downstream code does not fail, but warn.
        db_path.touch(exist_ok=True)
        return db_path

    try:
        import sys
        cmd = [sys.executable, str(init_script)]
        if force:
            cmd.append("--force")
        subprocess.run(cmd, check=True)
    except subprocess.CalledProcessError as exc:
        raise RuntimeError(f"Failed to initialize risk analytics DB: {exc}") from exc

    return db_path
GOALIE_DIR = PROJECT_ROOT / ".goalie"
PATTERN_LOG = GOALIE_DIR / "pattern_metrics.jsonl"
METRICS_LOG = GOALIE_DIR / "metrics_log.jsonl"


def _ts() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def _get_observability_context() -> Dict[str, Any]:
    """Gather host, environment, process context for observability."""
    return {
        "host": socket.gethostname(),
        "pid": os.getpid(),
        "user": os.environ.get("USER", os.environ.get("USERNAME", "unknown")),
        "environment": os.environ.get("ENVIRONMENT", os.environ.get("NODE_ENV", "development")),
        "python_version": f"{os.sys.version_info.major}.{os.sys.version_info.minor}.{os.sys.version_info.micro}",
    }


def _ensure_dirs() -> None:
    GOALIE_DIR.mkdir(parents=True, exist_ok=True)


def _serialize(event: Dict[str, Any]) -> str:
    return json.dumps(event, ensure_ascii=False, sort_keys=True)


def _write_line(path: Path, payload: Dict[str, Any]) -> None:
    with path.open("a", encoding="utf-8") as handle:
        handle.write(_serialize(payload) + "\n")


def build_pattern_event(
    *,
    pattern: str,
    circle: str,
    depth: int,
    gate: Optional[str],
    mode: str,
    tags: Iterable[str],
    pattern_state: Dict[str, Any],
    workload: Optional[Dict[str, Any]] = None,
    run_id: Optional[str] = None,
    iteration: Optional[int] = None,
    metadata: Optional[Dict[str, Any]] = None,
    behavioral_type: str = "observability",
    include_observability: bool = True,
) -> Dict[str, Any]:
    event: Dict[str, Any] = {
        "ts": _ts(),
        "pattern": pattern,
        "circle": circle,
        "depth": depth,
        "mode": mode,
        "behavioral_type": behavioral_type,
        "tags": sorted({tag for tag in tags if tag}),
        "pattern_state": pattern_state,
    }

    # Add observability context by default
    if include_observability:
        event["observability"] = _get_observability_context()

    if gate:
        event["gate"] = gate
    if run_id:
        event["run_id"] = run_id
    if iteration is not None:
        event["iteration"] = iteration
    if workload:
        event["workload"] = workload
    if metadata:
        event["metadata"] = metadata
    return event


def log_pattern_event(event: Dict[str, Any], *, mirror_metrics: bool = False) -> None:
    _ensure_dirs()
    _write_line(PATTERN_LOG, event)

    if mirror_metrics:
        summary = {
            "type": "pattern_summary",
            "timestamp": event.get("ts", _ts()),
            "pattern": event.get("pattern"),
            "circle": event.get("circle"),
            "depth": event.get("depth"),
            "mode": event.get("mode"),
            "gate": event.get("gate"),
            "metrics": {
                "safe_degrade_triggers": event.get("pattern_state", {})
                .get("safe_degrade", {})
                .get("triggers"),
                "guardrail_lock_enforced": event.get("pattern_state", {})
                .get("guardrail_lock", {})
                .get("enforced"),
                "iteration_budget_enforced": event.get("pattern_state", {})
                .get("iteration_budget", {})
                .get("enforced"),
            },
        }
        _write_line(METRICS_LOG, summary)


def _parse_metrics_json(raw: Optional[str]) -> Dict[str, Any]:
    if not raw:
        return {}
    try:
        return json.loads(raw)
    except json.JSONDecodeError as exc:
        raise SystemExit(f"Invalid JSON payload: {exc}") from exc


def _sample_workloads() -> List[Dict[str, Any]]:
    samples: List[Dict[str, Any]] = []

    samples.append(
        build_pattern_event(
            pattern="safe_degrade",
            circle="orchestrator",
            depth=4,
            gate="gate:deploy",
            mode="advisory",
            tags=["pattern:safe-degrade", "HPC", "guardrail:code"],
            pattern_state={
                "safe_degrade": {
                    "triggers": 3,
                    "actions": ["depth:4->3", "no_deploy"],
                    "recovery_cycles": 2,
                },
                "guardrail_lock": {"enforced": 1, "health_state": "amber"},
                "iteration_budget": {"requested": 5, "enforced": 3},
            },
            workload={
                "type": "hpc-batch-window",
                "gpu_util_pct": 86.5,
                "throughput_samples_sec": 1900,
                "p99_latency_ms": 420,
                "node_count": 32,
            },
            metadata={"framework": "rust-gov-agent", "scheduler": "slurm"},
        )
    )

    samples.append(
        build_pattern_event(
            pattern="observability_first",
            circle="analyst",
            depth=2,
            gate="gate:health",
            mode="mutate",
            tags=["pattern:observability-first", "ML", "bml:measure"],
            pattern_state={
                "observability_first": {
                    "metrics_written": 14,
                    "missing_signals": 1,
                    "suggestion_made": True,
                },
                "failure_strategy": {"mode": "fail-fast", "degrade_reason": "validate"},
            },
            workload={
                "type": "ml-training-guardrail",
                "max_epochs": 120,
                "early_stop_triggered": False,
                "grad_explosions": 0,
                "nan_batches": 1,
            },
            metadata={"framework": "pytorch", "dataset": "iris-v2"},
        )
    )

    samples.append(
        build_pattern_event(
            pattern="iteration_budget",
            circle="seeker",
            depth=3,
            gate="gate:iteration",
            mode="advisory",
            tags=["pattern:iteration-budget", "Stats", "limit:cycles"],
            pattern_state={
                "iteration_budget": {
                    "requested": 8,
                    "enforced": 6,
                    "autocommit_runs": 0,
                },
                "safe_degrade": {"triggers": 0, "actions": []},
            },
            workload={
                "type": "stat-robustness-sweep",
                "num_seeds": 15,
                "num_datasets": 4,
                "coverage_score": 0.82,
                "pvalue_min": 0.014,
            },
            metadata={"analysis_window": "2025-W46"},
        )
    )

    return samples


def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Enhanced pattern logging helper")
    parser.add_argument("--ensure-risk-db", action="store_true", help="Ensure risk analytics DB exists and exit")
    parser.add_argument("--force-risk-db", action="store_true", help="Force reinitialization of risk analytics DB when used with --ensure-risk-db")
    parser.add_argument("--pattern", help="Pattern identifier (e.g. safe_degrade)")
    parser.add_argument("--circle", default="orchestrator")
    parser.add_argument("--depth", type=int, default=3)
    parser.add_argument("--gate", default=None)
    parser.add_argument("--mode", default="advisory")
    parser.add_argument("--behavioral-type", dest="behavioral_type", default="observability", help="Behavioral type: mutation, advisory, observability, enforcement")
    parser.add_argument("--tags", nargs="*", default=[])
    parser.add_argument("--run-id", dest="run_id")
    parser.add_argument("--iteration", type=int)
    parser.add_argument("--pattern-state", dest="pattern_state_json", help="JSON blob with pattern metrics")
    parser.add_argument("--workload-json", dest="workload_json")
    parser.add_argument("--metadata-json", dest="metadata_json")
    parser.add_argument("--mirror-metrics", action="store_true", help="Also append summary to metrics_log.jsonl")
    parser.add_argument(
        "--generate-samples",
        action="store_true",
        help="Append representative HPC/ML/Stats events for visualization tests",
    )
    return parser.parse_args()


def main() -> int:
    args = _parse_args()

    if args.ensure_risk_db:
        ensure_risk_baseline_db(force=args.force_risk_db)
        print("Risk analytics DB ready")
        return 0

    if args.generate_samples:
        for sample in _sample_workloads():
            log_pattern_event(sample, mirror_metrics=True)
        print("Generated sample HPC/ML/Stats pattern events.")
        return 0

    if not args.pattern_state_json:
        raise SystemExit("--pattern-state is required when not generating samples")

    try:
        pattern_state = json.loads(args.pattern_state_json)
    except json.JSONDecodeError as exc:
        raise SystemExit(f"Invalid JSON for --pattern-state: {exc}") from exc

    workload = _parse_metrics_json(args.workload_json)
    metadata = _parse_metrics_json(args.metadata_json)

    event = build_pattern_event(
        pattern=args.pattern,
        circle=args.circle,
        depth=args.depth,
        gate=args.gate,
        mode=args.mode,
        behavioral_type=args.behavioral_type,
        tags=args.tags,
        pattern_state=pattern_state,
        workload=workload or None,
        run_id=args.run_id,
        iteration=args.iteration,
        metadata=metadata or None,
    )
    log_pattern_event(event, mirror_metrics=args.mirror_metrics)
    print(f"Logged pattern event for {args.pattern} (circle={args.circle}, depth={args.depth}).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
