#!/usr/bin/env python3
"""Analyze DT CI history from ci_dt_check_history.jsonl.

This script is intentionally dependency-light so it can be run anywhere the
analysis tooling runs. It computes aggregate pass/fail stats and simple
quantiles over the suggested production pass-rate field.
"""
from __future__ import annotations

import argparse
import json
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional

PROJECT_ROOT = Path(__file__).resolve().parents[2]
GOALIE_DIR = PROJECT_ROOT / ".goalie"
DEFAULT_HISTORY = GOALIE_DIR / "ci_dt_check_history.jsonl"
DEFAULT_OUTPUT = GOALIE_DIR / "dt_ci_analysis_summary.json"
ISO_FMT = "%Y-%m-%dT%H:%M:%SZ"


@dataclass
class CiRecord:
    timestamp: Optional[datetime]
    exit_code: int
    suggested_production_pass_rate: Optional[float]


def _parse_timestamp(value: Any) -> Optional[datetime]:
    if not isinstance(value, str) or not value:
        return None
    try:
        # Accept either bare ISO or with offset / Z.
        txt = value.strip()
        if "T" not in txt:
            return datetime.fromisoformat(txt)
        if txt.endswith("Z"):
            return datetime.fromisoformat(txt.replace("Z", "+00:00")).astimezone(tz=None).replace(tzinfo=None)
        dt = datetime.fromisoformat(txt)
        if dt.tzinfo is not None:
            dt = dt.astimezone(tz=None).replace(tzinfo=None)
        return dt
    except Exception:
        return None


def load_history(path: Path, window: int) -> List[CiRecord]:
    if not path.is_file():
        return []

    records: List[CiRecord] = []
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            data = json.loads(line)
        except json.JSONDecodeError:
            continue
        exit_code = int(data.get("exit_code", 1))
        spr = data.get("suggested_production_pass_rate")
        spr_val: Optional[float]
        try:
            spr_val = float(spr) if spr is not None else None
        except (TypeError, ValueError):
            spr_val = None
        ts = _parse_timestamp(data.get("timestamp"))
        records.append(CiRecord(timestamp=ts, exit_code=exit_code, suggested_production_pass_rate=spr_val))

    # Keep ordering as written; truncate to last `window` entries.
    if window > 0 and len(records) > window:
        records = records[-window:]
    return records


def _quantiles(values: Iterable[float]) -> Dict[str, float]:
    vals = sorted(values)
    if not vals:
        return {}

    def _pct(p: float) -> float:
        if not vals:
            return 0.0
        if len(vals) == 1:
            return vals[0]
        k = (len(vals) - 1) * p
        lo = int(k)
        hi = min(len(vals) - 1, lo + 1)
        if lo == hi:
            return vals[lo]
        frac = k - lo
        return vals[lo] + (vals[hi] - vals[lo]) * frac

    return {
        "min": vals[0],
        "p25": _pct(0.25),
        "median": _pct(0.5),
        "p75": _pct(0.75),
        "max": vals[-1],
    }


def analyze(records: List[CiRecord]) -> Dict[str, Any]:
    total = len(records)
    pass_count = sum(1 for r in records if r.exit_code == 0)
    fail_count = total - pass_count
    pass_rate = (pass_count / total) if total else None

    # Simple trend: compare pass-rate in first vs second half of the window.
    trend: Dict[str, Any]
    if total < 4:
        trend = {"classification": "insufficient-data"}
    else:
        mid = total // 2
        first = records[:mid]
        second = records[mid:]
        first_rate = sum(1 for r in first if r.exit_code == 0) / len(first)
        second_rate = sum(1 for r in second if r.exit_code == 0) / len(second)
        delta = second_rate - first_rate
        if delta > 0.05:
            cls = "improving"
        elif delta < -0.05:
            cls = "degrading"
        else:
            cls = "stable"
        trend = {
            "classification": cls,
            "first_half_rate": first_rate,
            "second_half_rate": second_rate,
            "delta": delta,
        }

    spr_values = [r.suggested_production_pass_rate for r in records if isinstance(r.suggested_production_pass_rate, (int, float))]
    spr_stats: Dict[str, Any] = {"count": len(spr_values)}
    if spr_values:
        spr_stats.update(_quantiles(spr_values))

    # Time range from available timestamps.
    timestamps = [r.timestamp for r in records if r.timestamp is not None]
    if timestamps:
        time_range = {
            "start": min(timestamps).strftime(ISO_FMT),
            "end": max(timestamps).strftime(ISO_FMT),
        }
    else:
        time_range = None

    return {
        "total_runs": total,
        "pass_count": pass_count,
        "fail_count": fail_count,
        "pass_rate": pass_rate,
        "pass_rate_trend": trend,
        "suggested_production_pass_rate_stats": spr_stats,
        "time_range": time_range,
    }


def main(argv: Optional[List[str]] = None) -> int:
    parser = argparse.ArgumentParser(description="Analyze DT CI history from ci_dt_check_history.jsonl")
    parser.add_argument("--history-file", type=Path, default=DEFAULT_HISTORY, help="Path to ci_dt_check_history.jsonl")
    parser.add_argument("--output-json", type=Path, default=DEFAULT_OUTPUT, help="Path to write dt_ci_analysis_summary.json")
    parser.add_argument("--window", type=int, default=30, help="Number of most recent runs to analyze (0 = all)")

    args = parser.parse_args(argv)

    records = load_history(args.history_file, args.window)
    summary = analyze(records)

    args.output_json.parent.mkdir(parents=True, exist_ok=True)
    args.output_json.write_text(json.dumps(summary, indent=2, sort_keys=True), encoding="utf-8")

    # Human-readable summary for quick CLI usage.
    total = summary["total_runs"]
    pass_rate = summary["pass_rate"]
    trend = summary["pass_rate_trend"]["classification"] if summary["pass_rate_trend"] else "n/a"
    print(f"Analyzed {total} DT CI runs (window={args.window}).")
    print(f"Pass rate: {pass_rate!r} (trend: {trend})")
    print(f"Wrote summary to {args.output_json}")

    return 0


if __name__ == "__main__":  # pragma: no cover - CLI entry point
    raise SystemExit(main())

