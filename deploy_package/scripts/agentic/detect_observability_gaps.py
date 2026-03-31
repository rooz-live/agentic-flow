#!/usr/bin/env python3
"""Detect observability gaps by correlating failures with nearby metrics.

Inputs (from $PROJECT_ROOT/.goalie):
- cycle_log.jsonl
- deployment_log.jsonl
- metrics_log.jsonl
- pattern_metrics.jsonl (optional)

Outputs:
- Writes ROAM risks with category="observability" into insights_log.jsonl
  unless --dry-run is provided, in which case they are printed to stdout.

Idempotency:
- Existing observability ROAM risks (same failure_id + gap_severity) are
  not duplicated.
"""

import argparse
import json
import sys
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Tuple

GOALIE_FILES = {
    "cycle": "cycle_log.jsonl",
    "deploy": "deployment_log.jsonl",
    "metrics": "metrics_log.jsonl",
    "pattern": "pattern_metrics.jsonl",
    "insights": "insights_log.jsonl",
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Detect observability gaps from Goalie logs")
    parser.add_argument("--goalie-dir", default=".goalie", help="Path to Goalie directory (default: .goalie)")
    parser.add_argument("--since", help="Only consider failures at or after this timestamp (ISO or YYYYMMDD_HHMMSS)")
    parser.add_argument("--dry-run", action="store_true", help="Print gaps to stdout instead of writing insights_log.jsonl")
    return parser.parse_args()


def _try_parse_timestamp(value: Any) -> Optional[datetime]:
    if value is None:
        return None

    # Numeric epoch seconds
    if isinstance(value, (int, float)):
        try:
            return datetime.fromtimestamp(float(value), tz=timezone.utc)
        except Exception:
            return None

    if not isinstance(value, str):
        return None

    s = value.strip()
    # Common compact forms
    for fmt in ("%Y%m%d_%H%M%S", "%Y%m%d%H%M%S"):
        try:
            return datetime.strptime(s, fmt).replace(tzinfo=timezone.utc)
        except Exception:
            pass

    # ISO-like forms (with optional Z and fractional seconds)
    iso = s.replace("Z", "+00:00")
    try:
        dt = datetime.fromisoformat(iso)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc)
    except Exception:
        return None


def _load_jsonl(path: Path) -> Iterable[Dict[str, Any]]:
    if not path.is_file():
        return []
    records: List[Dict[str, Any]] = []
    with path.open("r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                records.append(json.loads(line))
            except Exception:
                # Best-effort: skip malformed lines
                continue
    return records


def _extract_failure_ts_and_id(rec: Dict[str, Any], source: str) -> Optional[Tuple[datetime, str, str]]:
    """Return (timestamp, failure_id, failure_type) or None if not a failure."""

    # Generic status-based failure detection
    status = str(rec.get("status", "")).lower()
    result = str(rec.get("result", "")).lower()
    if status in {"failed", "error", "blocked"} or result in {"fail", "failed", "error"}:
        is_failure = True
    else:
        is_failure = False

    # Deployment-specific failure detection
    if source == "deployment_log.jsonl":
        target = rec.get("target")
        phase = rec.get("phase")
        dep_status = str(rec.get("status", "")).lower()
        if target == "npm" and dep_status in {"tests_failed", "published_failed"}:
            is_failure = True
        if target == "discord_bot" and dep_status in {"error", "blocked"}:
            is_failure = True
        if phase == "deploy" and dep_status not in {"success", "ok", "info"}:
            # Conservatively treat non-success deploys as failures
            is_failure = True

    if not is_failure:
        return None

    # Timestamp: prefer "timestamp", then "ts"
    ts_val = rec.get("timestamp") or rec.get("ts")
    ts = _try_parse_timestamp(ts_val)
    if ts is None:
        return None

    # Failure id: prefer explicit ids, with fallbacks
    failure_id = (
        str(rec.get("cycle_id")
            or rec.get("action")
            or rec.get("id")
            or rec.get("commit")
            or rec.get("event")
            or rec.get("phase")
            or f"{source}-{ts_val}")
    )

    failure_type = str(
        rec.get("action_type")
        or rec.get("phase")
        or rec.get("type")
        or rec.get("target")
        or "unknown"
    )

    return ts, failure_id, failure_type


@dataclass
class FailureEvent:
    ts: datetime
    failure_id: str
    failure_type: str
    source_log: str
    raw: Dict[str, Any]


def collect_failures(goalie_dir: Path, since: Optional[datetime]) -> List[FailureEvent]:
    failures: List[FailureEvent] = []

    cycle_path = goalie_dir / GOALIE_FILES["cycle"]
    for rec in _load_jsonl(cycle_path):
        info = _extract_failure_ts_and_id(rec, cycle_path.name)
        if not info:
            continue
        ts, fid, ftype = info
        if since and ts < since:
            continue
        failures.append(FailureEvent(ts=ts, failure_id=fid, failure_type=ftype, source_log=cycle_path.name, raw=rec))

    deploy_path = goalie_dir / GOALIE_FILES["deploy"]
    for rec in _load_jsonl(deploy_path):
        info = _extract_failure_ts_and_id(rec, deploy_path.name)
        if not info:
            continue
        ts, fid, ftype = info
        if since and ts < since:
            continue
        failures.append(FailureEvent(ts=ts, failure_id=fid, failure_type=ftype, source_log=deploy_path.name, raw=rec))

    return failures


def collect_metric_timestamps(goalie_dir: Path) -> List[datetime]:
    timestamps: List[datetime] = []

    metrics_path = goalie_dir / GOALIE_FILES["metrics"]
    for rec in _load_jsonl(metrics_path):
        ts = _try_parse_timestamp(rec.get("timestamp") or rec.get("ts"))
        if ts is not None:
            timestamps.append(ts)

    pattern_path = goalie_dir / GOALIE_FILES["pattern"]
    for rec in _load_jsonl(pattern_path):
        ts = _try_parse_timestamp(rec.get("timestamp") or rec.get("ts"))
        if ts is not None:
            timestamps.append(ts)

    return timestamps


def classify_gap(failure_ts: datetime, metric_ts_list: List[datetime], window_sec: int = 5) -> Tuple[str, int]:
    """Return (gap_severity, count) where gap_severity in {no_metrics, partial_metrics, full_metrics}."""
    if not metric_ts_list:
        return "no_metrics", 0

    window = window_sec
    count = 0
    for mts in metric_ts_list:
        if abs((mts - failure_ts).total_seconds()) <= window:
            count += 1

    if count == 0:
        return "no_metrics", 0
    if count == 1:
        return "partial_metrics", 1
    return "full_metrics", count


def load_existing_observability_risks(insights_path: Path) -> set:
    existing: set = set()
    if not insights_path.is_file():
        return existing
    for rec in _load_jsonl(insights_path):
        if (
            rec.get("type") == "roam_risk"
            and rec.get("category") == "observability"
        ):
            key = (str(rec.get("failure_id")), str(rec.get("gap_severity")))
            existing.add(key)
    return existing


def build_risk_record(failure: FailureEvent, gap_severity: str) -> Dict[str, Any]:
    risk_level = "high" if gap_severity == "no_metrics" else "medium"
    return {
        "timestamp": datetime.now(tz=timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "type": "roam_risk",
        "category": "observability",
        "risk_level": risk_level,
        "pattern": "observability-first",
        "failure_id": failure.failure_id,
        "failure_type": failure.failure_type,
        "gap_severity": gap_severity,
        "tags": ["pattern:observability-first", "gap:metrics"],
        "actionable": True,
        "suggested_action": f"Add metrics logging to affected script/component for {failure.failure_type} failures",
        "failure_context": {
            "timestamp": failure.ts.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "source_log": failure.source_log,
            "details": json.dumps(failure.raw, ensure_ascii=False)[:800],
        },
    }


def main() -> int:
    args = parse_args()
    goalie_dir = Path(args.goalie_dir)

    since_dt: Optional[datetime] = None
    if args.since:
        since_dt = _try_parse_timestamp(args.since)

    failures = collect_failures(goalie_dir, since_dt)
    if not failures:
        return 0

    metric_ts_list = collect_metric_timestamps(goalie_dir)

    insights_path = goalie_dir / GOALIE_FILES["insights"]
    existing_keys = load_existing_observability_risks(insights_path)

    new_risks: List[Dict[str, Any]] = []
    for failure in failures:
        gap_severity, _ = classify_gap(failure.ts, metric_ts_list)
        if gap_severity == "full_metrics":
            continue
        key = (failure.failure_id, gap_severity)
        if key in existing_keys:
            continue
        new_risks.append(build_risk_record(failure, gap_severity))

    if not new_risks:
        return 0

    if args.dry_run:
        for rec in new_risks:
            sys.stdout.write(json.dumps(rec) + "\n")
        return 0

    # Append to insights_log.jsonl
    insights_path.parent.mkdir(parents=True, exist_ok=True)
    with insights_path.open("a", encoding="utf-8") as f:
        for rec in new_risks:
            f.write(json.dumps(rec, ensure_ascii=False) + "\n")

    return 0


if __name__ == "__main__":  # pragma: no cover
    raise SystemExit(main())

