#!/usr/bin/env python3
"""Build a consolidated "run dossier" for a given run_id.

This helper stitches together:
- Pre-flight snapshot: .goalie/preflight_<run_id>.json
- Safe-degrade pattern events: .goalie/pattern_metrics.jsonl
- Metrics: .goalie/metrics_log.jsonl
- Trajectories: .goalie/trajectories.jsonl
- DT datapoints: .goalie/dt_dataset.jsonl

Usage:
  python scripts/analysis/run_dossier.py --run-id <RUN_ID> [--output PATH]

If --output is omitted, the dossier is printed to stdout as pretty JSON.
"""

import argparse
import json
import sys
from pathlib import Path
from typing import Any, Dict, Iterable, List


def _read_jsonl(path: Path) -> Iterable[Dict[str, Any]]:
    if not path.exists():
        return []
    with path.open("r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                yield json.loads(line)
            except Exception:
                # Skip malformed lines but continue
                continue


def build_run_dossier(project_root: Path, run_id: str) -> Dict[str, Any]:
    goalie_root = project_root / ".goalie"

    # 1. Preflight snapshot
    preflight_path = goalie_root / f"preflight_{run_id}.json"
    preflight: Dict[str, Any] | None = None
    if preflight_path.exists():
        try:
            preflight = json.loads(preflight_path.read_text(encoding="utf-8"))
        except Exception:
            preflight = None

    # 2. Pattern events (safe-degrade)
    pattern_log = goalie_root / "pattern_metrics.jsonl"
    guardrail_events: List[Dict[str, Any]] = []
    for ev in _read_jsonl(pattern_log):
        if ev.get("pattern") != "safe-degrade":
            continue
        # Prefer explicit run_id if present; otherwise match on run label + heuristic
        ev_run_id = ev.get("run_id")
        if ev_run_id and ev_run_id != run_id:
            continue
        # If no run_id on the event, accept all and let the caller interpret
        guardrail_events.append(ev)

    # 3. Metrics entries
    metrics_log = goalie_root / "metrics_log.jsonl"
    metrics: List[Dict[str, Any]] = []
    for m in _read_jsonl(metrics_log):
        if m.get("run_id") == run_id:
            metrics.append(m)

    # 4. Trajectories
    trajectories_path = goalie_root / "trajectories.jsonl"
    trajectories: List[Dict[str, Any]] = []
    for t in _read_jsonl(trajectories_path):
        if t.get("run_id") == run_id or not t.get("run_id"):
            trajectories.append(t)

    # 5. DT datapoints
    dt_dataset_path = goalie_root / "dt_dataset.jsonl"
    dt_datapoints: List[Dict[str, Any]] = []
    for d in _read_jsonl(dt_dataset_path):
        if d.get("run_id") == run_id or not d.get("run_id"):
            dt_datapoints.append(d)

    dossier: Dict[str, Any] = {
        "run_id": run_id,
        "paths": {
            "project_root": str(project_root),
            "goalie_root": str(goalie_root),
            "preflight": str(preflight_path),
            "pattern_metrics": str(pattern_log),
            "metrics_log": str(metrics_log),
            "trajectories": str(trajectories_path),
            "dt_dataset": str(dt_dataset_path),
        },
        "preflight": preflight,
        "guardrail_events": guardrail_events,
        "metrics": metrics,
        "trajectories": trajectories,
        "dt_datapoints": dt_datapoints,
    }

    return dossier


def _print_summary(dossier: Dict[str, Any]) -> None:
    """Print a concise human-readable synopsis for quick inspection."""
    run_id = dossier.get("run_id")
    pre = dossier.get("preflight") or {}
    guardrails = dossier.get("guardrail_events") or []
    metrics = dossier.get("metrics") or []
    trajectories = dossier.get("trajectories") or []

    reason = pre.get("safe_degrade_reason") or "none"
    incident_threshold = pre.get("incident_threshold")
    score_threshold = pre.get("score_threshold")

    # Try to infer recent_incidents / average_score from the last guardrail event if present
    recent_incidents = None
    average_score = None
    if guardrails:
        last = guardrails[-1]
        recent_incidents = last.get("recent_incidents")
        average_score = last.get("average_score")

    blocked = bool(reason and reason != "none")
    status = "BLOCKED" if blocked else "HEALTHY"

    print(f"Run {run_id}: {status}")
    if blocked:
        msg = f"  Guardrail: {reason}"
        if recent_incidents is not None and incident_threshold is not None:
            msg += f" | incidents={recent_incidents} (threshold={incident_threshold})"
        if average_score is not None and score_threshold is not None:
            msg += f" | avg_score={average_score} (threshold={score_threshold})"
        print(msg)

    print(f"  Metrics entries: {len(metrics)}")
    print(f"  Trajectories:    {len(trajectories)}")
    print(f"  Safe-degrade events: {len(guardrails)}")


def main(argv: List[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Build a consolidated run dossier for a given run_id")
    parser.add_argument("--run-id", required=True, help="Run ID to build a dossier for")
    parser.add_argument(
        "--project-root",
        help="Project root (defaults to searching upwards for .goalie)",
        default=None,
    )
    parser.add_argument(
        "--output",
        help="Optional path to write the dossier JSON (defaults to stdout)",
        default=None,
    )
    parser.add_argument(
        "--summary",
        action="store_true",
        help="Print a concise human-readable summary before the JSON dossier",
    )

    args = parser.parse_args(argv)

    if args.project_root:
        project_root = Path(args.project_root).resolve()
    else:
        # Start from CWD and search upwards for the nearest .goalie
        project_root = Path.cwd().resolve()
        while project_root != project_root.parent:
            if (project_root / ".goalie").exists():
                break
            project_root = project_root.parent

    dossier = build_run_dossier(project_root, args.run_id)

    if args.summary:
        _print_summary(dossier)

    if args.output:
        out_path = Path(args.output).resolve()
        out_path.parent.mkdir(parents=True, exist_ok=True)
        out_path.write_text(json.dumps(dossier, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    else:
        json.dump(dossier, sys.stdout, indent=2, ensure_ascii=False)
        sys.stdout.write("\n")

    return 0


if __name__ == "__main__":  # pragma: no cover
    raise SystemExit(main())
