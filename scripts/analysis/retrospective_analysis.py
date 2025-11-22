#!/usr/bin/env python3
"""
Retrospective analysis for Agentic Flow production maturity (Part 7).

Reads telemetry from .goalie/ and logs/ and answers high-level questions
about Safe Degrade, Depth Ladder, Circle Risk Focus, Autocommit Shadow,
and Iteration Budget.

Usage:
  python scripts/analysis/retrospective_analysis.py [--json]
      [--since ISO8601] [--until ISO8601]
      [--pattern NAME] [--compare A,B,C,D] [--roam]

  Or via af CLI (after wiring):
  ./scripts/af retro-analysis [--json] [--since ...] [--until ...]
      [--pattern ...] [--compare ...] [--roam]
"""

import argparse
import json
import sys
from collections import Counter, defaultdict
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

import yaml  # requires PyYAML, shared with flow_metrics.py

ROOT = Path(__file__).resolve().parents[2]
GOALIE = ROOT / ".goalie"
LOGS = ROOT / "logs"

ISO_FMT = "%Y-%m-%dT%H:%M:%SZ"


def parse_time(value: Optional[str]) -> Optional[datetime]:
    """Parse a timestamp into a *naive UTC* datetime.

    We normalise everything to naive UTC to avoid offset-aware/naive
    comparison issues when mixing Z-suffixed and bare ISO8601 strings.
    """
    if not value:
        return None
    try:
        txt = value.strip()
        if "T" not in txt:
            dt = datetime.fromisoformat(txt)
        else:
            dt = datetime.fromisoformat(txt.replace("Z", "+00:00"))
        # Convert to naive UTC
        if dt.tzinfo is not None:
            dt = dt.astimezone(tz=None).replace(tzinfo=None)
        return dt
    except Exception:
        return None


def within_range(ts: Optional[str], since: Optional[datetime], until: Optional[datetime]) -> bool:
    if not ts:
        return True
    try:
        dt = parse_time(ts)
    except Exception:
        dt = None
    if dt is None:
        return True
    if since and dt < since:
        return False
    if until and dt > until:
        return False
    return True


def read_jsonl(path: Path, since: Optional[datetime], until: Optional[datetime]) -> List[Dict[str, Any]]:
    if not path.exists():
        return []
    out: List[Dict[str, Any]] = []
    with path.open("r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                obj = json.loads(line)
            except Exception:
                continue
            ts = obj.get("timestamp")
            if within_range(ts, since, until):
                out.append(obj)
    return out


def analyze_safe_degrade(metrics: List[Dict[str, Any]], incidents: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Analyze Safe Degrade behaviour across iterations.

    Supports both legacy metrics where ``safe_degrade`` is a boolean and
    normalized metrics where ``safe_degrade`` is a structured dict.
    """

    safe = {
        "trigger_count": 0,
        "reasons": Counter(),
        "with_incident": len(incidents),
        "total_iterations": len(metrics),
        "aggressive_cases": 0,
        "insights": [],
    }

    for m in metrics:
        raw_sd = m.get("safe_degrade")
        sd: Dict[str, Any]
        if isinstance(raw_sd, dict):
            sd = raw_sd
        else:
            # Legacy boolean or missing field
            sd = {"enabled": bool(raw_sd), "triggers": 1 if raw_sd else 0}

        enabled = bool(sd.get("enabled"))
        triggers = int(sd.get("triggers") or 0)
        reason = sd.get("reason") or "unknown"
        if triggers > 0 or enabled:
            safe["trigger_count"] += 1
            safe["reasons"][reason] += 1

    if safe["trigger_count"] > 0 and safe["with_incident"] == 0:
        safe["aggressive_cases"] = safe["trigger_count"]
        safe["insights"].append(
            "Safe Degrade triggered without any recorded incidents; may be too conservative."
        )

    # Feedback quality heuristic: presence of non-empty reason values
    noisy = sum(1 for r in safe["reasons"].keys() if r in ("none", "unknown"))
    if noisy and safe["trigger_count"]:
        safe["insights"].append(
            f"{noisy} Safe Degrade events had vague reasons; improve logging for root-cause analysis."
        )

    return safe


def analyze_depth_ladder(metrics: List[Dict[str, Any]]) -> Dict[str, Any]:
    depths = []
    success_flags = []
    for m in metrics:
        depth = m.get("depth")
        if depth is None:
            continue
        depths.append(int(depth))
        # heuristic: regard presence of autocommit + no safe-degrade as a success proxy
        auto = (m.get("autocommit") or {}).get("allow_code")
        sd = m.get("safe_degrade") or {}
        success = bool(auto) and not sd.get("triggers")
        success_flags.append((int(depth), success))

    by_depth: Dict[int, Dict[str, Any]] = defaultdict(lambda: {"count": 0, "success": 0})
    for depth, success in success_flags:
        by_depth[depth]["count"] += 1
        if success:
            by_depth[depth]["success"] += 1

    return {
        "depth_counts": {d: v["count"] for d, v in by_depth.items()},
        "depth_success_rate": {
            d: (v["success"] / v["count"] if v["count"] else 0.0)
            for d, v in by_depth.items()
        },
    }


def analyze_circle_risk(metrics: List[Dict[str, Any]]) -> Dict[str, Any]:
    circle_counts: Counter = Counter()
    circle_risk: Dict[str, List[float]] = defaultdict(list)

    for m in metrics:
        circle = m.get("circle") or "unknown"
        circle_counts[circle] += 1
        system = m.get("system") or {}
        risk = system.get("risk_score")
        if risk is not None:
            circle_risk[circle].append(float(risk))

    avg_risk = {
        c: (sum(vals) / len(vals) if vals else 0.0)
        for c, vals in circle_risk.items()
    }

    return {
        "iteration_distribution": dict(circle_counts),
        "avg_risk_by_circle": avg_risk,
    }


def analyze_iteration_budget(metrics: List[Dict[str, Any]]) -> Dict[str, Any]:
    requested_total = 0
    enforced_total = 0
    extensions_total = 0
    runs: Dict[str, Dict[str, Any]] = {}

    for m in metrics:
        ib = m.get("iteration_budget") or {}
        requested = int(ib.get("requested") or 0)
        enforced = int(ib.get("enforced") or 0)
        requested_total += requested
        enforced_total += enforced
        if enforced > requested:
            extensions_total += enforced - requested

        run_id = m.get("run_id") or m.get("run") or "unknown"
        if run_id not in runs:
            runs[run_id] = {"requested": 0, "enforced": 0, "max_budget_hit": 0}
        runs[run_id]["requested"] += requested
        runs[run_id]["enforced"] += enforced
        # Treat enforced == requested as max-budget "hit" when requested > 0.
        if enforced >= requested and requested > 0:
            runs[run_id]["max_budget_hit"] += 1

    run_count = len(runs) if runs else 0
    max_budget_hits = sum(int(v.get("max_budget_hit") or 0) for v in runs.values())
    extension_runs = sum(1 for v in runs.values() if v["enforced"] > v["requested"])

    avg_extensions_per_run = (
        extensions_total / run_count if run_count else 0.0
    )
    extension_frequency = (
        extension_runs / run_count if run_count else 0.0
    )

    return {
        "requested_total": requested_total,
        "enforced_total": enforced_total,
        "extra_iterations": extensions_total,
        "run_count": run_count,
        "avg_extensions_per_run": avg_extensions_per_run,
        "max_budget_hit_count": max_budget_hits,
        "extension_frequency": extension_frequency,
    }


def analyze_autocommit_shadow(metrics: List[Dict[str, Any]]) -> Dict[str, Any]:
    enabled_count = 0
    allow_code_true = 0
    allow_code_false = 0

    for m in metrics:
        auto = m.get("autocommit") or {}
        if auto.get("shadow_enabled"):
            enabled_count += 1
        if auto.get("allow_code"):
            allow_code_true += 1
        else:
            allow_code_false += 1

    return {
        "shadow_enabled_iterations": enabled_count,
        "autocommit_allowed_iterations": allow_code_true,
        "autocommit_blocked_iterations": allow_code_false,
    }


def analyze_executor(
    executor_log: List[Dict[str, Any]],
    executor_summary: Optional[Dict[str, Any]],
) -> Dict[str, Any]:
    total = len(executor_log)
    applied = sum(1 for e in executor_log if e.get("status") == "applied")
    skipped = sum(1 for e in executor_log if e.get("status") == "skipped")
    failed = sum(1 for e in executor_log if e.get("status") == "failed")

    patterns: Counter = Counter()
    for e in executor_log:
        patt = e.get("pattern") or "unknown"
        patterns[patt] += 1

    summary = executor_summary or {}
    rollback = bool(summary.get("rollback"))
    failure_rate = float(summary.get("failureRate") or 0.0)

    return {
        "total_proposals": total,
        "applied": applied,
        "skipped": skipped,
        "failed": failed,
        "by_pattern": dict(patterns),
        "rollback": rollback,
        "failure_rate": failure_rate,
    }


def analyze_autocommit_vs_executor(
    metrics: List[Dict[str, Any]], executor_log: List[Dict[str, Any]]
) -> Dict[str, Any]:
    """Correlate autocommit/autocommit-shadow with executor outcomes.

    We operate on *normalized* metrics produced by ``normalize_metrics``.
    """

    by_run: Dict[str, Dict[str, Any]] = {}

    for m in metrics:
        run_id = m.get("run_id") or m.get("run")
        if not run_id:
            continue
        info = by_run.setdefault(
            run_id,
            {
                "iterations": 0,
                "autocommit_runs": 0,
                "shadow_enabled": 0,
            },
        )
        info["iterations"] += 1
        auto = m.get("autocommit") or {}
        if auto.get("shadow_enabled"):
            info["shadow_enabled"] += 1
        if auto.get("allow_code"):
            info["autocommit_runs"] += 1

    exec_by_run: Dict[str, Dict[str, int]] = {}
    for e in executor_log:
        run_id = e.get("runId") or e.get("run_id")
        if not run_id:
            continue
        bucket = exec_by_run.setdefault(
            run_id,
            {"proposals": 0, "applied": 0, "skipped": 0, "failed": 0},
        )
        bucket["proposals"] += 1
        status = e.get("status")
        if status in ("applied", "skipped", "failed"):
            bucket[status] += 1

    categories: Dict[str, Dict[str, Any]] = {
        "shadow_enabled": {"runs": 0, "proposals": 0, "failures": 0},
        "autocommit_allowed": {"runs": 0, "proposals": 0, "failures": 0},
        "autocommit_blocked": {"runs": 0, "proposals": 0, "failures": 0},
    }

    for run_id, info in by_run.items():
        exec_info = exec_by_run.get(run_id)
        if not exec_info:
            continue
        has_autocommit = info["autocommit_runs"] > 0
        shadow = info["shadow_enabled"] > 0

        if shadow:
            cat = categories["shadow_enabled"]
            cat["runs"] += 1
            cat["proposals"] += exec_info["proposals"]
            cat["failures"] += exec_info["failed"]

        if has_autocommit:
            cat = categories["autocommit_allowed"]
            cat["runs"] += 1
            cat["proposals"] += exec_info["proposals"]
            cat["failures"] += exec_info["failed"]
        else:
            cat = categories["autocommit_blocked"]
            cat["runs"] += 1
            cat["proposals"] += exec_info["proposals"]
            cat["failures"] += exec_info["failed"]

    def rate(x: Dict[str, Any]) -> float:
        if not x["proposals"]:
            return 0.0
        return x["failures"] / x["proposals"]

    return {
        name: {
            **vals,
            "failure_rate": rate(vals),
        }
        for name, vals in categories.items()
    }


def load_actions() -> List[Dict[str, Any]]:
    path = GOALIE / "CONSOLIDATED_ACTIONS.yaml"
    if not path.exists():
        return []
    try:
        data = yaml.safe_load(path.read_text("utf-8")) or {}
    except Exception:
        return []
    items = data.get("items")
    return items or []


def load_roam() -> Dict[str, Any]:
    path = GOALIE / "ROAM_TRACKER.yaml"
    if not path.exists():
        return {"blockers": [], "dependencies": [], "risks": []}
    try:
        data = yaml.safe_load(path.read_text("utf-8")) or {}
    except Exception:
        return {"blockers": [], "dependencies": [], "risks": []}
    return {
        "blockers": data.get("blockers") or [],
        "dependencies": data.get("dependencies") or [],
        "risks": data.get("risks") or [],
    }


def analyze_roam_risks(
    roam: Dict[str, Any],
    actions: List[Dict[str, Any]],
    metrics: List[Dict[str, Any]],
) -> Dict[str, Any]:
    """Summarise ROAM trackers and WSJF impact for this window.

    This is intentionally compact: it reports counts and basic linkage to
    WSJF items rather than a full risk engine.
    """

    status_counts: Counter = Counter()
    open_blockers = 0
    open_dependencies = 0
    open_risks = 0

    blocked_wsjf = set()
    enabled_wsjf = set()

    closed_statuses = {"RESOLVED", "MITIGATED"}

    # Blockers
    for b in roam.get("blockers", []) or []:
        status = (b.get("roam_status") or b.get("status") or "UNKNOWN").upper()
        status_counts[status] += 1
        if status not in closed_statuses:
            open_blockers += 1
        for wsjf_id in b.get("blocks_wsjf") or []:
            blocked_wsjf.add(str(wsjf_id))

    # Dependencies
    for d in roam.get("dependencies", []) or []:
        status = (d.get("roam_status") or d.get("status") or "UNKNOWN").upper()
        status_counts[status] += 1
        if status not in closed_statuses:
            open_dependencies += 1
        for wsjf_id in d.get("enables_wsjf") or []:
            enabled_wsjf.add(str(wsjf_id))

    # Risks
    risk_scores = []
    for r in roam.get("risks", []) or []:
        status = (r.get("roam_status") or r.get("status") or "UNKNOWN").upper()
        status_counts[status] += 1
        if status not in closed_statuses:
            open_risks += 1
        score = r.get("risk_score")
        if score is not None:
            try:
                risk_scores.append(float(score))
            except Exception:
                pass
        for wsjf_id in r.get("enables_wsjf") or []:
            enabled_wsjf.add(str(wsjf_id))

    avg_roam_risk = (
        sum(risk_scores) / len(risk_scores) if risk_scores else 0.0
    )

    # Observed system risk from metrics
    observed_scores = []
    for m in metrics:
        system = m.get("system") or {}
        score = system.get("risk_score")
        if score is not None:
            try:
                observed_scores.append(float(score))
            except Exception:
                pass

    avg_observed_risk = (
        sum(observed_scores) / len(observed_scores) if observed_scores else 0.0
    )

    return {
        "status_counts": dict(status_counts),
        "open": {
            "blockers": open_blockers,
            "dependencies": open_dependencies,
            "risks": open_risks,
        },
        "wsjf": {
            "blocked_ids": sorted(blocked_wsjf),
            "enabled_ids": sorted(enabled_wsjf),
            "blocked_count": len(blocked_wsjf),
            "enabled_count": len(enabled_wsjf),
        },
        "risk": {
            "avg_roam_risk_score": avg_roam_risk,
            "avg_observed_risk_score": avg_observed_risk,
            "observed_iterations_with_risk": len(observed_scores),
        },
    }



def load_data(args: argparse.Namespace) -> Dict[str, Any]:
    since = parse_time(args.since)
    until = parse_time(args.until)

    metrics = read_jsonl(GOALIE / "metrics_log.jsonl", since, until)
    pattern_metrics = read_jsonl(
        GOALIE / "pattern_metrics.jsonl", since, until
    )
    executor_log = read_jsonl(
        GOALIE / "executor_log.jsonl", since, until
    )
    incidents = read_jsonl(
        LOGS / "governor_incidents.jsonl", since, until
    )

    executor_summary_path = GOALIE / "executor_summary.json"
    executor_summary: Optional[Dict[str, Any]] = None
    if executor_summary_path.exists():
        try:
            executor_summary = json.loads(
                executor_summary_path.read_text("utf-8")
            )
        except Exception:
            executor_summary = None

    return {
        "metrics": metrics,
        "pattern_metrics": pattern_metrics,
        "executor_log": executor_log,
        "executor_summary": executor_summary,
        "incidents": incidents,
    }


def print_human(summary: Dict[str, Any]) -> None:
    print("=== Retrospective Analysis (Agentic Flow Prod-Cycle) ===")
    print()

    # Safe Degrade
    s = summary.get("safe_degrade", {})
    print("## Safe Degrade")
    print(f"  Total iterations: {s.get('total_iterations', 0)}")
    print(f"  Safe Degrade triggers: {s.get('trigger_count', 0)}")
    if s.get("trigger_count"):
        print("  Reasons:")
        for r, c in s.get("reasons", {}).items():
            print(f"    - {r}: {c}")
        print(f"  Incidents in window: {s.get('with_incident', 0)}")
    for insight in s.get("insights", []):
        print(f"  * Insight: {insight}")
    print()

    # Depth Ladder
    d = summary.get("depth_ladder", {})
    print("## Depth Ladder")
    print("  Depth usage:")
    for depth, count in sorted(d.get("depth_counts", {}).items()):
        rate = d.get("depth_success_rate", {}).get(depth, 0.0)
        msg = (
            "    - depth "
            f"{depth}: {count} iterations "
            f"(success rate ~{rate:.2%})"
        )
        print(msg)
    print()

    # Circle Risk Focus
    c = summary.get("circle_risk", {})
    print("## Circle Risk Focus")
    print("  Iteration distribution by circle:")
    for circle, count in c.get("iteration_distribution", {}).items():
        avg = c.get("avg_risk_by_circle", {}).get(circle)
        if avg is not None:
            print(f"    - {circle}: {count} iterations, avg risk {avg:.2f}")
        else:
            print(f"    - {circle}: {count} iterations, avg risk n/a")
    print()

    # Autocommit Shadow
    a = summary.get("autocommit_shadow", {})
    print("## Autocommit Shadow")
    print(
        "  Shadow-enabled iterations: "
        f"{a.get('shadow_enabled_iterations', 0)}"
    )
    print(
        "  Autocommit allowed: "
        f"{a.get('autocommit_allowed_iterations', 0)}"
    )
    print(
        "  Autocommit blocked: "
        f"{a.get('autocommit_blocked_iterations', 0)}"
    )
    print()

    # Iteration Budget
    ib = summary.get("iteration_budget", {})
    print("## Iteration Budget")
    print(
        "  Requested iterations (sum over runs): "
        f"{ib.get('requested_total', 0)}"
    )
    print(
        "  Enforced iterations (sum over runs): "
        f"{ib.get('enforced_total', 0)}"
    )
    print(
        "  Extra iterations granted: "
        f"{ib.get('extra_iterations', 0)}"
    )
    print()

    # Executor
    ex = summary.get("executor", {})
    print("## Governance Executor")
    print(f"  Proposals total: {ex.get('total_proposals', 0)}")
    print(f"    Applied: {ex.get('applied', 0)}")
    print(f"    Skipped: {ex.get('skipped', 0)}")
    print(f"    Failed: {ex.get('failed', 0)}")
    if ex.get("by_pattern"):
        print("  By pattern:")
        for patt, cnt in ex["by_pattern"].items():
            print(f"    - {patt}: {cnt}")
    print()

    # ROAM (optional)
    roam = summary.get("roam")
    if roam:
        print("## ROAM (Blockers / Dependencies / Risks)")
        open_section = roam.get("open", {})
        print(
            "  Open blockers: " f"{open_section.get('blockers', 0)}"
        )
        print(
            "  Open dependencies: " f"{open_section.get('dependencies', 0)}"
        )
        print(
            "  Open risks: " f"{open_section.get('risks', 0)}"
        )
        wsjf = roam.get("wsjf", {})
        if wsjf.get("blocked_count") or wsjf.get("enabled_count"):
            print(
                "  WSJF items: "
                f"{wsjf.get('blocked_count', 0)} blocked, "
                f"{wsjf.get('enabled_count', 0)} enabled"
            )
        risk = roam.get("risk", {})
        avg_roam = risk.get("avg_roam_risk_score")
        avg_obs = risk.get("avg_observed_risk_score")
        if avg_roam is not None:
            print(f"  Avg ROAM risk score: {avg_roam:.2f}")
        if avg_obs is not None:
            print(f"  Avg observed system risk: {avg_obs:.2f}")
        print()


def filter_metrics_by_pattern(
    metrics: List[Dict[str, Any]], pattern: Optional[str]
) -> List[Dict[str, Any]]:
    if not pattern:
        return metrics
    key_map = {
        "safe-degrade": "pattern_safe_degrade",
        "depth-ladder": "pattern_depth_ladder",
        "circle-risk-focus": "pattern_circle_risk_focus",
        "autocommit-shadow": "pattern_autocommit_shadow",
        "iteration-budget": "pattern_iteration_budget",
        "guardrail-lock": "pattern_guardrail_lock",
        "failure-strategy": "pattern_failure_strategy",
        "observability-first": "pattern_observability_first",
    }
    tag_key = key_map.get(pattern)
    if not tag_key:
        return metrics
    filtered = []
    for m in metrics:
        tags = m.get("pattern_tags") or {}
        if tags.get(tag_key):
            filtered.append(m)
    return filtered


def normalize_metrics(raw_metrics: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Normalize legacy and new metrics into a common iteration-level schema.

    Legacy records may lack ``type`` and use top-level fields like
    ``circle``, ``depth``, ``safe_degrade`` (bool), ``run_id``.

    New records from emit_metrics.py use ``type: state`` and embed
    pattern metrics under ``metrics`` plus governor health.
    """

    normalized: List[Dict[str, Any]] = []

    for m in raw_metrics:
        m_type = m.get("type")
        if not m_type or m_type == "prod_cycle_iteration":
            # Legacy iteration record; pass through while ensuring expected keys
            norm = dict(m)
            if "run_id" not in norm and "run" in norm:
                norm["run_id"] = norm["run"]
            # Wrap bare safe_degrade bool into dict form for analyzers
            if isinstance(norm.get("safe_degrade"), bool):
                norm["safe_degrade"] = {
                    "enabled": bool(norm["safe_degrade"]),
                    "triggers": 1 if norm["safe_degrade"] else 0,
                }
            normalized.append(norm)
            continue

        if m_type != "state":
            # We currently normalise only state/iteration-style records
            continue

        metrics_block = m.get("metrics") or {}
        governor = m.get("governor_health") or {}

        run_id = m.get("run_id") or m.get("run") or "unknown"
        iteration = m.get("cycle_index") or m.get("iteration") or 0

        # Derive safe_degrade structure
        sd_triggers = int(metrics_block.get("safe_degrade.triggers") or 0)
        sd_reason = None
        # Prefer explicit failure_strategy.degrade_reason when present
        fs_reason = metrics_block.get("failure_strategy.degrade_reason")
        if fs_reason and fs_reason != "none":
            sd_reason = fs_reason
        elif sd_triggers > 0:
            sd_reason = "threshold-exceeded"

        safe_degrade = {
            "enabled": sd_triggers > 0,
            "triggers": sd_triggers,
            "reason": sd_reason,
        }

        # Autocommit view from iteration_budget/autocommit metrics if present
        autocommit = {
            "shadow_enabled": True,  # prod-cycle uses shadow-first by design
            "allow_code": bool(metrics_block.get("iteration_budget.autocommit_runs")),
        }

        iteration_budget = {
            "requested": int(metrics_block.get("iteration_budget.requested") or 0),
            "enforced": int(metrics_block.get("iteration_budget.enforced") or 0),
            "autocommit_runs": int(
                metrics_block.get("iteration_budget.autocommit_runs") or 0
            ),
        }

        system = {
            "risk_score": governor.get("risk_score"),
            "status": governor.get("status"),
            "recent_incidents": governor.get("recent_incidents"),
        }

        circle = m.get("patterns", {}).get("circle-risk-focus") or metrics_block.get(
            "circle_risk_focus.top_owner", "unknown"
        )

        depth = None
        # Depth ladder currently encoded as pattern status only; keep as None

        normalized.append(
            {
                "type": "prod_cycle_iteration",
                "run_id": run_id,
                "iteration": iteration,
                "circle": circle,
                "depth": depth,
                "safe_degrade": safe_degrade,
                "autocommit": autocommit,
                "iteration_budget": iteration_budget,
                "system": system,
            }
        )

    return normalized


def compute_deltas(a: Dict[str, Any], b: Dict[str, Any]) -> Dict[str, Any]:
    """Compute numeric deltas between two summary dicts.

    We focus on a stable subset of numeric fields to keep output compact.
    """

    def extract_numbers(summary: Dict[str, Any]) -> Dict[str, float]:
        out: Dict[str, float] = {}

        sd = summary.get("safe_degrade", {})
        out["safe_degrade.trigger_count"] = float(sd.get("trigger_count", 0))

        ib = summary.get("iteration_budget", {})
        out["iteration_budget.requested_total"] = float(
            ib.get("requested_total", 0)
        )
        out["iteration_budget.enforced_total"] = float(
            ib.get("enforced_total", 0)
        )
        out["iteration_budget.extra_iterations"] = float(
            ib.get("extra_iterations", 0)
        )

        ex = summary.get("executor", {})
        out["executor.total_proposals"] = float(ex.get("total_proposals", 0))
        out["executor.applied"] = float(ex.get("applied", 0))
        out["executor.failed"] = float(ex.get("failed", 0))
        out["executor.failure_rate"] = float(ex.get("failure_rate", 0.0))

        auto_exec = summary.get("autocommit_vs_executor", {})
        for cat, payload in auto_exec.items():
            key = f"autocommit_vs_executor.{cat}.failure_rate"
            out[key] = float(payload.get("failure_rate", 0.0))

        return out

    a_nums = extract_numbers(a)
    b_nums = extract_numbers(b)
    keys = sorted(set(a_nums.keys()) | set(b_nums.keys()))

    deltas: Dict[str, Dict[str, float]] = {}
    for key in keys:
        av = a_nums.get(key, 0.0)
        bv = b_nums.get(key, 0.0)
        deltas[key] = {"from": av, "to": bv, "delta": bv - av}

    return deltas


def build_summary(args: argparse.Namespace, data: Dict[str, Any]) -> Dict[str, Any]:
    raw_metrics = data["metrics"]
    metrics = normalize_metrics(raw_metrics)
    metrics = filter_metrics_by_pattern(metrics, args.pattern)

    base = {
        "safe_degrade": analyze_safe_degrade(metrics, data["incidents"]),
        "depth_ladder": analyze_depth_ladder(metrics),
        "circle_risk": analyze_circle_risk(metrics),
        "autocommit_shadow": analyze_autocommit_shadow(metrics),
        "iteration_budget": analyze_iteration_budget(metrics),
        "executor": analyze_executor(
            data["executor_log"], data.get("executor_summary")
        ),
        "autocommit_vs_executor": analyze_autocommit_vs_executor(
            metrics, data["executor_log"]
        ),
        "time_window": {"since": args.since, "until": args.until},
        "pattern": args.pattern,
    }

    if getattr(args, "roam", False):
        actions = load_actions()
        roam = load_roam()
        base["roam"] = analyze_roam_risks(roam, actions, metrics)

    if args.pattern:
        keep = {
            "safe-degrade": "safe_degrade",
            "depth-ladder": "depth_ladder",
            "circle-risk-focus": "circle_risk",
            "autocommit-shadow": "autocommit_shadow",
            "iteration-budget": "iteration_budget",
            "guardrail-lock": "iteration_budget",
            "failure-strategy": "iteration_budget",
            "observability-first": "circle_risk",
        }.get(args.pattern)
        if keep and keep in base:
            return {
                keep: base[keep],
                "time_window": base["time_window"],
                "pattern": args.pattern,
            }
    return base


def main(argv: Optional[List[str]] = None) -> int:
    parser = argparse.ArgumentParser(
        description="Agentic Flow production maturity retrospective analysis",
    )
    parser.add_argument("--json", action="store_true", help="Output JSON summary")
    parser.add_argument("--since", help="Start time (ISO8601)")
    parser.add_argument("--until", help="End time (ISO8601)")
    parser.add_argument(
        "--pattern",
        help=(
            "Optional pattern focus: safe-degrade, depth-ladder, "
            "circle-risk-focus, autocommit-shadow, iteration-budget, "
            "guardrail-lock, failure-strategy, observability-first"
        ),
    )
    parser.add_argument(
        "--compare",
        help=(
            "Compare two windows: SINCE1,UNTIL1,SINCE2,UNTIL2 "
            "(times are ISO8601). If omitted, analyse a single window."
        ),
    )
    parser.add_argument(
        "--roam",
        action="store_true",
        help="Include ROAM risk overlays in JSON output.",
    )

    args = parser.parse_args(argv)

    if args.compare:
        parts = [p.strip() for p in args.compare.split(",")]
        if len(parts) != 4:
            print(
                "--compare requires 4 comma-separated timestamps: "
                "SINCE1,UNTIL1,SINCE2,UNTIL2",
                file=sys.stderr,
            )
            return 1
        since1, until1, since2, until2 = parts
        args1_kwargs = {**vars(args), "since": since1, "until": until1}
        args2_kwargs = {**vars(args), "since": since2, "until": until2}
        args1 = argparse.Namespace(**args1_kwargs)
        args2 = argparse.Namespace(**args2_kwargs)
        data1 = load_data(args1)
        data2 = load_data(args2)
        summary1 = build_summary(args1, data1)
        summary2 = build_summary(args2, data2)
        result = {
            "period_1": summary1,
            "period_2": summary2,
            "delta": compute_deltas(summary1, summary2),
        }
        if args.json:
            print(json.dumps(result, indent=2, sort_keys=True))
        else:
            print("=== Comparison: Period 1 ===")
            print_human(summary1)
            print("=== Comparison: Period 2 ===")
            print_human(summary2)
        return 0

    data = load_data(args)
    summary = build_summary(args, data)
    if args.json:
        print(json.dumps(summary, indent=2, sort_keys=True))
    else:
        print_human(summary)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
