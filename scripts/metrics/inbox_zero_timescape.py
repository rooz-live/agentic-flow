#!/usr/bin/env python3
"""Emit inbox-zero timescape metrics to .goalie/evidence/inbox_zero_latest.json."""
from __future__ import annotations

import json
import os
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

import yaml

PROJECT_ROOT = Path(__file__).resolve().parents[2]
SCHEMA_VERSION = "1.0.0"
DEFAULT_WINDOW_HOURS = 24.0
# Hook point: swap emergent_time_source when ATI crate is a direct dependency.
EMERGENT_TIME_SOURCE = "wall_clock"


def _git_head(root: Path) -> str:
    try:
        return subprocess.check_output(
            ["git", "-C", str(root), "rev-parse", "HEAD"], text=True, timeout=10,
        ).strip()
    except (subprocess.CalledProcessError, subprocess.TimeoutExpired, OSError):
        return "unknown"


def _count_roam(path: Path) -> tuple[int, int]:
    open_count = closed_count = 0
    if not path.is_file():
        return open_count, closed_count
    data = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
    for b in data.get("blockers", []):
        if str(b.get("roam_status", "")).upper() == "RESOLVED":
            closed_count += 1
        else:
            open_count += 1
    for d in data.get("dependencies", []):
        if str(d.get("status", "")).lower() == "resolved":
            closed_count += 1
        else:
            open_count += 1
    for r in data.get("risks", []):
        status = str(r.get("status", r.get("roam_status", ""))).lower()
        if status in ("mitigated", "accepted", "resolved"):
            closed_count += 1
        else:
            open_count += 1
    return open_count, closed_count


def _count_upstream(path: Path) -> tuple[int, int]:
    open_count = closed_count = 0
    if not path.is_file():
        return open_count, closed_count
    data = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
    for act in data.get("actions", []):
        status = str(act.get("status", "")).lower()
        if status in ("done", "complete", "resolved"):
            closed_count += 1
        else:
            open_count += 1
    return open_count, closed_count


def _dlq_rows(path: Path) -> int:
    if not path.is_file():
        return 0
    with path.open(encoding="utf-8") as fh:
        return sum(1 for _ in fh)


def _pace_from_lnnnl(path: Path) -> float:
    if not path.is_file():
        return 0.5
    import sys
    sys.path.insert(0, str(path.resolve().parents[2] / "scripts" / "metrics"))
    from pace_from_lnnnl import pace_from_lnnnl_doc
    data = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
    return pace_from_lnnnl_doc(data)


def _anti_cvt_untracked(root: Path) -> int:
    try:
        res = subprocess.run(
            ["git", "status", "--porcelain"], cwd=root, capture_output=True, text=True, check=False,
        )
        return sum(1 for line in res.stdout.splitlines() if line.startswith("??"))
    except OSError:
        return 0



def _policy_utilization(root: Path, pace: float) -> dict:
    try:
        import sys
        sys.path.insert(0, str(root / "scripts" / "cicd" / "lib"))
        from tick_cycle_policy import load_policy
        return load_policy(root, pace=pace)
    except Exception:
        return {"aqe_utilization_pct": 0.0, "harness_utilization_pct": 0.0, "utilize_mode": "unknown"}


def _anti_cvt_unobservable(root: Path, *, stale_hours: float = 24.0) -> int:
    """1 when correlate/timescape evidence missing or stale."""
    from datetime import datetime, timezone, timedelta

    evidence = root / ".goalie" / "evidence" / "inbox_zero_latest.json"
    if not evidence.is_file():
        return 1
    try:
        import json

        payload = json.loads(evidence.read_text(encoding="utf-8"))
        ts = payload.get("timestamp") or ""
        if not ts:
            return 1
        updated = datetime.strptime(ts, "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=timezone.utc)
        if datetime.now(timezone.utc) - updated > timedelta(hours=stale_hours):
            return 1
    except (OSError, ValueError, json.JSONDecodeError):
        return 1
    return 0


def _anti_cvt_unorchestrated(root: Path) -> int:
    """1 when ceremony/loop tick state never advanced."""
    import json

    state_path = root / ".goalie" / "cron_state" / "ceremony_state.json"
    if not state_path.is_file():
        return 1
    try:
        state = json.loads(state_path.read_text(encoding="utf-8"))
        return 1 if int(state.get("tick_count", 0)) <= 0 else 0
    except (OSError, json.JSONDecodeError, TypeError, ValueError):
        return 1


def _anti_cvt_breakdown(root: Path, policy: dict) -> dict:
    untracked = _anti_cvt_untracked(root)
    unobservable = _anti_cvt_unobservable(root)
    unorchestrated = _anti_cvt_unorchestrated(root)
    unutilized = min(100, max(0, int(100.0 - float(policy.get("aqe_utilization_pct", 0)))))
    total = untracked + unobservable + unorchestrated + unutilized
    return {
        "total": total,
        "untracked": untracked,
        "unobservable": unobservable,
        "unorchestrated": unorchestrated,
        "unutilized": unutilized,
    }


def _ceremony_bounded(root: Path) -> dict:
    p = root / ".goalie" / "evidence" / "ceremony_unit_latest.json"
    if not p.is_file():
        return {}
    try:
        doc = json.loads(p.read_text(encoding="utf-8"))
        return doc.get("bounded_slice") or {}
    except (json.JSONDecodeError, OSError):
        return {}


def _max_roi(root: Path) -> dict:
    try:
        import sys
        sys.path.insert(0, str(root / "scripts" / "metrics"))
        from max_roi_cycles import compute
        return compute(root)
    except Exception:
        return {}


def build_timescape(root: Path | None = None, *, window_hours: float = DEFAULT_WINDOW_HOURS) -> dict:
    root = root or PROJECT_ROOT
    open_roam, closed_roam = _count_roam(root / ".goalie" / "ROAM_TRACKER.yaml")
    cog_open, cog_closed = _count_roam(root / ".goalie" / "ROAM_TRACKER_COG.yaml")
    open_roam += cog_open
    closed_roam += cog_closed
    open_upstream, closed_upstream = _count_upstream(root / ".goalie" / "UPSTREAM_ACTIONS.yaml")
    dlq_rows = _dlq_rows(root / "dlq.jsonl")
    pace = _pace_from_lnnnl(root / ".goalie" / "LNNNL.yaml")

    open_count = open_roam + open_upstream + dlq_rows
    closed_count = closed_roam + closed_upstream
    total = open_count + closed_count
    pct_closed = (closed_count / total * 100.0) if total > 0 else 100.0
    velocity = closed_count / window_hours if window_hours > 0 else 0.0

    policy = _policy_utilization(root, pace)
    anti = _anti_cvt_breakdown(root, policy)
    roi = _max_roi(root)
    velocity_fmt = f"{pct_closed:.1f}.{open_count}"
    pace_fmt = f"{open_count}.{pace:.1f}"

    return {
        "schema_version": SCHEMA_VERSION,
        "timestamp": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "metrics": {
            "pct_closed": round(pct_closed, 2),
            "open_count": open_count,
            "velocity": round(velocity, 4),
            "pace": pace,
            "velocity_fmt": velocity_fmt,
            "pace_fmt": pace_fmt,
        },
        "pct_closed": round(pct_closed, 2),
        "open_count": open_count,
        "velocity": round(velocity, 4),
        "pace": pace,
        "velocity_fmt": velocity_fmt,
        "pace_fmt": pace_fmt,
        "anti_cvt": anti,
        "aqe_utilization_pct": policy.get("aqe_utilization_pct", 0),
        "harness_utilization_pct": policy.get("harness_utilization_pct", 0),
        "utilize_mode": policy.get("utilize_mode", "unknown"),
        "max_roi_cycles_per_hour": roi.get("roi_cycles_per_hour"),
        "target_roi_cycles_per_hour": roi.get("target_roi_cycles_per_hour"),
        "roi_gap": roi.get("roi_gap"),
        "ceremony_in_idle": roi.get("ceremony_in_idle"),
        "bounded_slice": _ceremony_bounded(root),
        "burst_roi_cycles_per_hour": roi.get("burst_roi_cycles_per_hour"),
        "window_hours": window_hours,
        "head_sha": _git_head(root),
        "emergent_time_source": EMERGENT_TIME_SOURCE,
        "details": {
            "open_roam": open_roam,
            "closed_roam": closed_roam,
            "open_upstream": open_upstream,
            "closed_upstream": closed_upstream,
            "dlq_rows": dlq_rows,
        },
        # Legacy aliases for downstream readers during migration.
        "completion_ratio_percent": round(pct_closed, 2),
        "absolute_open_items": open_count,
        "velocity_items_per_hour": round(velocity, 4),
        "pace_cod_weight": pace,
        "anti_cvt_score": anti["total"],
    }


def main() -> int:
    root = Path(os.environ.get("REPO_ROOT", PROJECT_ROOT))
    window = float(os.environ.get("TIMESCAPE_WINDOW_HOURS", DEFAULT_WINDOW_HOURS))
    output_path = root / ".goalie" / "evidence" / "inbox_zero_latest.json"
    output_path.parent.mkdir(parents=True, exist_ok=True)
    payload = build_timescape(root, window_hours=window)
    output_path.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(f"Successfully generated inbox_zero_latest.json at {output_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
