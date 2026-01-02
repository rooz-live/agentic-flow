#!/usr/bin/env python3

import os
import sys
import json
import yaml
import statistics
import argparse
import subprocess
import time
import re
import threading
from datetime import datetime, timezone
from typing import Dict, List, Tuple, Any, Optional, TextIO
import uuid
from dataclasses import dataclass


# =============================================================================
# EVIDENCE_CONFIG: Centralized configuration for all evidence emitters
# All values can be overridden via env vars or .goalie/evidence_config.yaml
# =============================================================================
def _load_evidence_config() -> Dict[str, Any]:
    """Load evidence config from .goalie/evidence_config.yaml with environment support.

    Environment selection: AF_ENV=local|dev|stg|prod (default: from config or 'local')
    """
    # Look for config in project root .goalie directory
    project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    config_path = os.path.join(project_root, ".goalie", "evidence_config.yaml")
    active_env = os.environ.get("AF_ENV", "local")
    # Load YAML config if exists
    config = {}
    if os.path.exists(config_path):
        with open(config_path, 'r') as f:
            config = yaml.safe_load(f) or {}
    
    # Get environment-specific thresholds
    env_config = config.get("environments", {}).get(active_env, {})
    
    # Merge with defaults
    defaults = {
        # Winner-grade thresholds
        "thresholds": {
            "rev_per_h_min": float(os.environ.get("AF_REV_PER_H_MIN", 1000.0)),
            "duration_ok_pct_min": float(os.environ.get("AF_DURATION_OK_PCT_MIN", 50.0)),
            "abort_max": int(os.environ.get(
                "AF_ABORT_MAX", env_config.get("abort_max", 0))),
            "contention_mult_max": float(
                os.environ.get("AF_CONTENTION_MULT_MAX", 2.0)),
            "ok_rate_min": float(os.environ.get(
                "AF_OK_RATE_MIN", env_config.get("ok_rate_min",
                                            80.0) / 100.0)),
        },
        # Stability score factors (total = 100 points)
        "stability_factors": {
            "no_abort_points": float(os.environ.get("AF_STABILITY_NO_ABORT_PTS", 30.0)),
            "no_sys_err_points": float(os.environ.get("AF_STABILITY_NO_ERR_PTS", 20.0)),
            "duration_ok_points": float(os.environ.get("AF_STABILITY_DUR_OK_PTS", 25.0)),
            "low_contention_points": float(os.environ.get("AF_STABILITY_CONTENTION_PTS", 25.0)),
            "contention_threshold": float(os.environ.get("AF_STABILITY_CONTENTION_THRESH", 1.5)),
        },
        # Coverage score factors
        "coverage_factors": {
            "event_multiplier": int(os.environ.get("AF_COVERAGE_EVENT_MULT", 10)),
            "max_coverage_score": int(os.environ.get("AF_COVERAGE_MAX_SCORE", 100)),
            "risk_event_cap": int(os.environ.get("AF_RISK_EVENT_CAP", 10)),
        },
        # CLI defaults for swarm runs
        "cli_defaults": {
            "golden_reps": int(os.environ.get("AF_GOLDEN_REPS", 3)),
            "longrun_reps": int(os.environ.get("AF_LONGRUN_REPS", 2)),
            "golden_iters": int(os.environ.get("AF_GOLDEN_ITERS", 25)),
            "platinum_iters": int(os.environ.get("AF_PLATINUM_ITERS", 100)),
            "max_concurrency": int(os.environ.get("AF_MAX_CONCURRENCY", 2)),
            "ab_reps": int(os.environ.get("AF_AB_REPS", 5)),
            "reference_events": int(os.environ.get("AF_REFERENCE_EVENTS", 1000)),
        },
        # Circle depth targets and decision lenses
        "circles": {
            "analyst": {"lens": "Data Quality & Lineage", "depth_target": int(os.environ.get("AF_ANALYST_DEPTH", 9))},
            "assessor": {"lens": "Performance Assurance", "depth_target": int(os.environ.get("AF_ASSESSOR_DEPTH", 8))},
            "innovator": {"lens": "Investment Council", "depth_target": int(os.environ.get("AF_INNOVATOR_DEPTH", 11))},
            "intuitive": {"lens": "Sensemaking", "depth_target": int(os.environ.get("AF_INTUITIVE_DEPTH", 10))},
            "orchestrator": {"lens": "Cadence & Ceremony", "depth_target": int(os.environ.get("AF_ORCHESTRATOR_DEPTH", 10))},
            "seeker": {"lens": "Exploration", "depth_target": int(os.environ.get("AF_SEEKER_DEPTH", 11))},
        },
        # Autocommit graduation configuration
        "autocommit_graduation": config.get("graduation", {
            "green_streak_required": 5,
            "shadow_cycles_before_recommend": 5,
            "retro_approval_required": True,
            "max_sys_state_err": 0,
            "max_abort": 0,
            "max_autofix_adv_per_cycle": env_config.get("autofix_adv_max", 5),
            "min_stability_score": env_config.get("stability_min", 70.0),
            "min_ok_rate": env_config.get("ok_rate_min", 90.0) / 100.0,
        }),
        # ROAM threshold for owned vs accepted
        "roam_owned_threshold": int(os.environ.get("AF_ROAM_OWNED_THRESHOLD", 10)),
    }
    
    # Field mappings for unified emitter naming
    defaults["field_mappings"] = config.get("field_mappings", {
        "revenue-safe": "economic_compounding",
        "tier-depth": "maturity_coverage",
        "gaps": "observability_gaps",
        "intent-coverage": "pattern_hit_pct",
        "winner-grade": "prod_cycle_qualification",
    })
    
    defaults["_active_env"] = active_env
    return defaults


EVIDENCE_CONFIG = _load_evidence_config()


@dataclass
class RunResult:
    phase: str
    profile: str
    concurrency: str
    run_id: str
    ok: bool
    error: Optional[str]
    summary: Dict[str, Any]


def _should_emit_realtime(line: str) -> bool:
    s = line.strip("\n")
    if not s:
        return False
    if "🏥 Running Mid-Cycle Health Checkpoint" in s:
        return True
    if "Critical Health Drop Detected" in s or "Aborting Cycle" in s:
        return True
    if "📋 Iteration Review (Pre-Retro Standup Sync)" in s:
        return True
    if "🧠 Running Retro Coach" in s:
        return True
    if "=== Retro Coach Insights ===" in s:
        return True
    if "✅ Retro insights generated" in s:
        return True
    if "🔄 Retro → Replenish Feedback Loop" in s:
        return True
    if "🎯 Generating Actionable Recommendations" in s:
        return True
    if re.search(r"^--- Iteration \\d+", s):
        return True
    return False


def _stream_to_log_and_console(proc: subprocess.Popen[str], log_fp, prefix: str, realtime: bool) -> None:
    if proc.stdout is None:
        return
    for line in proc.stdout:
        try:
            log_fp.write(line)
        except Exception:
            pass

        if realtime and _should_emit_realtime(line):
            sys.stdout.write(f"[{prefix}] {line}")
            sys.stdout.flush()


def _uuid() -> str:
    return str(uuid.uuid4()).lower()


def _project_root() -> str:
    return os.environ.get("PROJECT_ROOT") or os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))


def _af_path(project_root: str) -> str:
    return os.path.join(project_root, "scripts", "af")


def _normalize_af_env(value: Optional[str]) -> str:
    v = (value or "local").strip().lower()
    if v not in ("local", "dev", "stg", "prod"):
        raise ValueError(f"Invalid AF_ENV: {value!r}")
    return v


def _apply_af_env_policy(af_env: str, args: argparse.Namespace) -> Dict[str, Any]:
    policy: Dict[str, Any] = {
        "af_env": af_env,
        "no_deploy": False,
        "requested_auto_enable_autocommit": bool(getattr(args, "auto_enable_autocommit", False)),
        "effective_auto_enable_autocommit": bool(getattr(args, "auto_enable_autocommit", False)),
    }

    ci_green = os.environ.get("AF_CI_GREEN") == "1"
    break_glass = os.environ.get("AF_BREAK_GLASS") == "1"
    policy["ci_green"] = ci_green
    policy["break_glass"] = break_glass

    if af_env == "prod":
        os.environ.setdefault("AF_FORCE_MODE", "advisory")
        os.environ["AF_NO_DEPLOY"] = "1"
        os.environ["AF_ALLOW_CODE_AUTOCOMMIT"] = "0"
        os.environ["AF_FULL_CYCLE_AUTOCOMMIT"] = "0"
        os.environ["AF_AUTOCOMMIT_SHADOW"] = "0"
        policy["no_deploy"] = True
        if getattr(args, "auto_enable_autocommit", False):
            args.auto_enable_autocommit = False
            policy["effective_auto_enable_autocommit"] = False
            policy["policy_block"] = "auto_enable_autocommit_disabled_in_prod"

    elif af_env == "dev":
        os.environ["AF_NO_DEPLOY"] = "1"
        os.environ["AF_ALLOW_CODE_AUTOCOMMIT"] = "0"
        os.environ["AF_FULL_CYCLE_AUTOCOMMIT"] = "0"
        os.environ.setdefault("AF_AUTOCOMMIT_SHADOW", "1")
        policy["no_deploy"] = True
        if getattr(args, "auto_enable_autocommit", False):
            args.auto_enable_autocommit = False
            policy["effective_auto_enable_autocommit"] = False
            policy["policy_block"] = "auto_enable_autocommit_disabled_in_dev"

    elif af_env == "stg":
        os.environ.setdefault("AF_AUTOCOMMIT_SHADOW", "1")
        if not (ci_green or break_glass):
            os.environ["AF_NO_DEPLOY"] = "1"
            policy["no_deploy"] = True

    else:
        os.environ.setdefault("AF_AUTOCOMMIT_SHADOW", "1")

    os.environ["AF_ENV"] = af_env
    policy["autocommit_shadow"] = os.environ.get("AF_AUTOCOMMIT_SHADOW") == "1"
    policy["requested_allow_code_autocommit"] = os.environ.get("AF_ALLOW_CODE_AUTOCOMMIT")
    policy["requested_full_cycle_autocommit"] = os.environ.get("AF_FULL_CYCLE_AUTOCOMMIT")
    return policy


def _append_policy_evidence(
    project_root: str,
    run_id: str,
    circle: Optional[str],
    fields: Dict[str, Any],
    tags: List[str],
) -> None:
    evidence_dir = os.path.join(project_root, ".goalie", "evidence")
    os.makedirs(evidence_dir, exist_ok=True)
    path = os.path.join(evidence_dir, f"evidence_{run_id}.jsonl")
    doc = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "emitter": "policy_decision",
        "run_id": run_id,
        "correlation_id": os.environ.get("AF_CORRELATION_ID"),
        "circle": circle,
        "depth": None,
        "mode": "advisory",
        "fields": fields,
        "variant": None,
        "tags": tags,
    }
    try:
        with open(path, "a") as f:
            f.write(json.dumps(doc) + "\n")
    except Exception:
        return


def _write_graduation_artifacts(project_root: str, run_id: str, payload: Dict[str, Any]) -> None:
    goalie_dir = os.path.join(project_root, ".goalie")
    try:
        os.makedirs(goalie_dir, exist_ok=True)
    except Exception:
        return

    latest_path = os.path.join(goalie_dir, "graduation_latest.json")
    scoped_latest_path = os.path.join(goalie_dir, f"graduation_latest_{run_id}.json")
    history_path = os.path.join(goalie_dir, "graduation_history.jsonl")

    try:
        with open(latest_path, "w") as f:
            json.dump(payload, f, indent=2)
    except Exception:
        pass

    try:
        with open(scoped_latest_path, "w") as f:
            json.dump(payload, f, indent=2)
    except Exception:
        pass

    try:
        with open(history_path, "a") as f:
            f.write(json.dumps(payload) + "\n")
    except Exception:
        pass


def _run_prod_cycle(project_root: str, run_id: str, prod_cycle_args: List[str], log_path: str) -> Tuple[bool, str]:
    env = os.environ.copy()
    env["AF_RUN_ID"] = run_id
    cid = os.environ.get("AF_CORRELATION_ID") or os.environ.get("AF_RUN_ID")
    if cid:
        env["AF_CORRELATION_ID"] = cid
    env["PYTHONUNBUFFERED"] = "1"

    cmd = [_af_path(project_root), "prod-cycle"] + prod_cycle_args

    os.makedirs(os.path.dirname(log_path), exist_ok=True)
    with open(log_path, "w", buffering=1) as f:
        p = subprocess.run(cmd, cwd=project_root, env=env, stdout=f, stderr=subprocess.STDOUT, text=True)

    if p.returncode != 0:
        return False, f"prod-cycle exited {p.returncode} (see {log_path})"
    return True, ""


def _run_prod_cycle_realtime(
    project_root: str,
    run_id: str,
    prod_cycle_args: List[str],
    log_path: str,
    prefix: str,
    realtime: bool,
) -> Tuple[bool, str]:
    env = os.environ.copy()
    env["AF_RUN_ID"] = run_id
    cid = os.environ.get("AF_CORRELATION_ID") or os.environ.get("AF_RUN_ID")
    if cid:
        env["AF_CORRELATION_ID"] = cid
    env["PYTHONUNBUFFERED"] = "1"

    cmd = [_af_path(project_root), "prod-cycle"] + prod_cycle_args
    os.makedirs(os.path.dirname(log_path), exist_ok=True)

    with open(log_path, "w", buffering=1) as f:
        p = subprocess.Popen(cmd, cwd=project_root, env=env, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, bufsize=1)
        _stream_to_log_and_console(p, f, prefix=prefix, realtime=realtime)
        rc = p.wait()

    if rc != 0:
        return False, f"prod-cycle exited {rc} (see {log_path})"
    return True, ""


def _run_revenue_safe(project_root: str, run_id: str, hours: int) -> Tuple[bool, str, Dict[str, Any]]:
    cmd = [_af_path(project_root), "revenue-safe", "--hours", str(hours), "--correlation-id", run_id, "--json"]
    p = subprocess.run(cmd, cwd=project_root, capture_output=True, text=True)
    if p.returncode != 0:
        err = (p.stderr or "").strip()
        return False, f"revenue-safe failed (exit {p.returncode}): {err[-800:]}", {}

    raw = (p.stdout or "").strip()
    if not raw:
        return False, "revenue-safe produced empty stdout", {}

    try:
        doc = json.loads(raw)
    except Exception as e:
        preview = raw[:1200]
        return False, f"revenue-safe invalid JSON: {e}; preview={preview!r}", {}

    summary = doc.get("summary") if isinstance(doc, dict) else None
    if not isinstance(summary, dict):
        return False, "revenue-safe JSON missing summary", {}

    return True, "", summary


def _count_telemetry_events(project_root: str, run_id: str) -> int:
    metrics_path = os.path.join(project_root, ".goalie", "pattern_metrics.jsonl")
    if not os.path.exists(metrics_path):
        return 0

    count = 0
    try:
        with open(metrics_path, "r") as f:
            for line in f:
                if not line.strip():
                    continue
                try:
                    ev = json.loads(line)
                except Exception:
                    continue

                cid = (
                    ev.get("correlation_id")
                    or ev.get("run_id")
                    or ev.get("AF_RUN_ID")
                    or (ev.get("data") or {}).get("run_id")
                    or (ev.get("metrics") or {}).get("run_id")
                )
                if cid == run_id:
                    count += 1
    except Exception:
        return 0

    return count


def _run_tier_depth_coverage(project_root: str, run_id: str, circle: str) -> Tuple[bool, str, Dict[str, Any]]:
    cmd = [_af_path(project_root), "tier-depth-coverage", "--correlation-id", run_id]
    circle_norm = (circle or "").strip().lower()
    if circle_norm:
        cmd += ["--circle", circle_norm]
        if circle_norm == "testing":
            cmd += ["--tier1-circles", "orchestrator,assessor,testing"]

    p = subprocess.run(cmd, cwd=project_root, capture_output=True, text=True)
    if p.returncode != 0:
        err = (p.stderr or p.stdout or "").strip()
        return False, f"tier-depth-coverage failed (exit {p.returncode}): {err[-800:]}", {}

    raw = (p.stdout or "").strip()
    if not raw:
        return False, "tier-depth-coverage produced empty stdout", {}

    try:
        doc = json.loads(raw)
    except Exception as e:
        preview = raw[:1200]
        return False, f"tier-depth-coverage invalid JSON: {e}; preview={preview!r}", {}

    backlog_circle = ((doc.get("backlog") or {}).get("per_circle") or {}).get(circle_norm) if circle_norm else None
    telem_circle = ((doc.get("telemetry_coverage") or {}).get("per_circle") or {}).get(circle_norm) if circle_norm else None
    depth_circle = ((doc.get("depth_distribution") or {}).get("per_circle") or {}).get(circle_norm) if circle_norm else None

    out = {
        "tier_backlog_cov_pct": _f((backlog_circle or {}).get("coverage_pct"), 0.0),
        "tier_telemetry_cov_pct": _f((telem_circle or {}).get("coverage_pct"), 0.0),
        "tier_depth_cov_pct": _f((depth_circle or {}).get("tier_depth_coverage_pct"), 0.0),
    }
    return True, "", out


def _maybe_add_tier_depth(project_root: str, run_id: str, circle: str, enabled: bool, summary: Dict[str, Any]) -> None:
    if not enabled:
        return
    tok, terr, fields = _run_tier_depth_coverage(project_root, run_id, circle)
    if tok:
        summary.update(fields)
    else:
        summary.setdefault("tier_depth_error", terr)


def _run_intent_coverage(project_root: str, run_id: str) -> Tuple[bool, str, Dict[str, Any]]:
    """Run intent-coverage analysis for a run."""
    cmd = [
        sys.executable,
        os.path.join(project_root, "scripts", "cmd_prompt_intent_coverage.py"),
        "--correlation-id",
        run_id,
        "--json",
    ]
    try:
        p = subprocess.run(cmd, cwd=project_root, capture_output=True, text=True, timeout=30)
        if p.returncode != 0:
            return False, f"intent-coverage failed (exit {p.returncode})", {}
        doc = json.loads(p.stdout)
        return True, "", {
            "intent_coverage_pct": _f(doc.get("intent_coverage_pct"), 0.0),
            "patterns_hit": len(doc.get("patterns_hit", [])),
            "patterns_missed": len(doc.get("patterns_missed", [])),
        }
    except subprocess.TimeoutExpired:
        return False, "intent-coverage timeout", {}
    except Exception as e:
        return False, str(e), {}


def _maybe_add_intent_coverage(project_root: str, run_id: str, enabled: bool, summary: Dict[str, Any]) -> None:
    if not enabled:
        return
    tok, terr, fields = _run_intent_coverage(project_root, run_id)
    if tok:
        summary.update(fields)
    else:
        summary.setdefault("intent_coverage_error", terr)


def _compute_stability_score(
    summary: Dict[str, Any],
    abort: int,
    sys_state_err: int,
    duration_ok_pct: float,
    dur_mult: float,
) -> float:
    """Compute stability score (0-100) based on safety and consistency factors.

    Higher is better. Factors from EVIDENCE_CONFIG["stability_factors"]:
    - No aborts: +no_abort_points
    - No system state errors: +no_sys_err_points
    - Duration OK: +duration_ok_points (scaled)
    - Low contention: +low_contention_points (scaled)
    """
    sf = EVIDENCE_CONFIG.get("stability_factors", {})
    no_abort_pts = sf.get("no_abort_points", 30.0)
    no_err_pts = sf.get("no_sys_err_points", 20.0)
    dur_ok_pts = sf.get("duration_ok_points", 25.0)
    contention_pts = sf.get("low_contention_points", 25.0)
    contention_thresh = sf.get("contention_threshold", 1.5)

    score = 0.0

    # Abort penalty
    if abort == 0:
        score += no_abort_pts

    # System state error penalty
    if sys_state_err == 0:
        score += no_err_pts

    # Duration OK (scaled by percentage)
    score += min(dur_ok_pts, (duration_ok_pct / 100.0) * dur_ok_pts)

    # Contention multiplier (penalty for high contention)
    if dur_mult <= 1.0:
        score += contention_pts
    elif dur_mult <= contention_thresh:
        score += contention_pts * (contention_thresh - dur_mult) / (contention_thresh - 1.0)
    # else: no points for contention > threshold

    return min(100.0, max(0.0, score))


def _print_maturity_delta_summary(compare_data: Dict[str, Any]) -> None:
    """Print a concise maturity delta summary from swarm-compare JSON output."""
    print("\n" + "-" * 60)
    print("MATURITY DELTA (Prior → Current)")
    print("-" * 60)

    # Key metrics to track for maturity (including economic compounding)
    key_metrics = ["rev_per_h", "stability_score", "duration_ok_pct", "abort", "intent_cov_pct", "tier_depth_cov_pct", "wsjf_per_h", "energy_cost_usd"]

    groups = compare_data.get("groups", {})
    meta = compare_data.get("meta", {})

    if not groups:
        print("  No comparison groups available")
        return

    # Aggregate metrics from all groups comparing prior vs current
    improvements = []
    regressions = []
    current_metrics: Dict[str, float] = {}
    prior_metrics: Dict[str, float] = {}

    for group_key, group_data in groups.items():
        prior_obj = group_data.get("prior") or {}
        current_obj = group_data.get("current") or {}
        prior_data = prior_obj.get("metrics") or {}
        current_data = current_obj.get("metrics") or {}

        for metric in key_metrics:
            prior_metric = prior_data.get(metric)
            current_metric = current_data.get(metric)
            prior_val = prior_metric.get("mean", 0) if isinstance(prior_metric, dict) else 0
            current_val = current_metric.get("mean", 0) if isinstance(current_metric, dict) else 0

            if metric not in current_metrics and current_val:
                current_metrics[metric] = current_val
                prior_metrics[metric] = prior_val

    # Calculate deltas
    for metric in key_metrics:
        prior_val = prior_metrics.get(metric, 0)
        current_val = current_metrics.get(metric, 0)
        delta = current_val - prior_val

        # For abort, lower is better
        if metric == "abort":
            delta = -delta

        if delta > 0.01:
            improvements.append((metric, current_val, prior_val))
        elif delta < -0.01:
            regressions.append((metric, current_val, prior_val))

    # Print improvements
    if improvements:
        print("  ▲ IMPROVEMENTS:")
        for metric, curr, prior in improvements[:5]:
            print(f"    {metric}: {prior:.1f} → {curr:.1f}")

    # Print regressions
    if regressions:
        print("  ▼ REGRESSIONS:")
        for metric, curr, prior in regressions[:5]:
            print(f"    {metric}: {prior:.1f} → {curr:.1f}")

    if not improvements and not regressions:
        print("  No significant changes detected")

    # Overall maturity trend
    total_improvements = len(improvements)
    total_regressions = len(regressions)
    maturity_trend = "IMPROVING" if total_improvements > total_regressions else "STABLE" if total_improvements == total_regressions else "REGRESSING"
    print(f"\n  MATURITY TREND: {maturity_trend} ({total_improvements}↑ {total_regressions}↓)")

    # Files compared
    if meta:
        print(f"\n  Files compared:")
        print(f"    Prior:   {os.path.basename(meta.get('prior', 'N/A'))}")
        print(f"    Current: {os.path.basename(meta.get('current', 'N/A'))}")

    # Economic compounding from current metrics
    rev_mean = current_metrics.get("rev_per_h", 0)
    wsjf_per_h = current_metrics.get("wsjf_per_h", 0)
    energy_cost = current_metrics.get("energy_cost_usd", 0)
    if rev_mean or wsjf_per_h:
        print(f"\n  Economic Compounding:")
        print(f"    rev_per_h:      ${rev_mean:,.2f}")
        print(f"    wsjf_per_h:     {wsjf_per_h:.2f}")
        print(f"    energy_cost:    ${energy_cost:.2f}")
        if rev_mean > 0 and energy_cost > 0:
            value_per_energy = rev_mean / energy_cost
            print(f"    value/energy:   {value_per_energy:.1f}x")

    # Depth ladder efficiency (phase progression)
    phase_metrics = {k: v for k, v in current_metrics.items() if k.startswith("phase_")}
    if phase_metrics:
        print(f"\n  Depth Ladder Efficiency:")
        for phase, count in sorted(phase_metrics.items()):
            print(f"    {phase}: {count}")


def _scan_security_audit_gaps(project_root: str) -> Dict[str, Any]:
    """Scan for SEC-AUDIT-*, DEPENDABOT-CVE-*, and other security patterns in .goalie/ artifacts."""
    import re
    goalie_dir = os.path.join(project_root, ".goalie")
    patterns = {
        "sec_audit": re.compile(r"SEC-AUDIT-\d+"),
        "cve": re.compile(r"(?:DEPENDABOT-)?CVE-\d{4}-\d{4,}"),
        "dependabot": re.compile(r"DEPENDABOT-CVE-\d{4}-\d{4,}"),
        "phase": re.compile(r"PHASE-[A-Z]-\d+"),
        "urgent": re.compile(r"(?:URGENT|CRITICAL|HIGH-PRIORITY)[-:]?\s*\w+"),
    }
    findings: Dict[str, List[str]] = {"sec_audit": [], "cve": [], "dependabot": [], "phase": [], "urgent": []}

    if not os.path.isdir(goalie_dir):
        return {"sec_audit_count": 0, "cve_count": 0, "phase_count": 0, "findings": findings}

    for fname in os.listdir(goalie_dir):
        fpath = os.path.join(goalie_dir, fname)
        if not os.path.isfile(fpath):
            continue
        if not fname.endswith((".md", ".yaml", ".json", ".jsonl", ".txt", ".log")):
            continue
        try:
            with open(fpath, "r", errors="ignore") as f:
                content = f.read()
            for key, pat in patterns.items():
                for match in pat.findall(content):
                    if match not in findings[key]:
                        findings[key].append(match)
        except Exception:
            pass

    return {
        "sec_audit_count": len(findings["sec_audit"]),
        "cve_count": len(findings["cve"]),
        "dependabot_count": len(findings["dependabot"]),
        "phase_count": len(findings["phase"]),
        "urgent_count": len(findings["urgent"]),
        "sec_audit_items": findings["sec_audit"],
        "cve_items": findings["cve"],
        "dependabot_items": findings["dependabot"],
        "phase_items": findings["phase"],
        "urgent_items": findings["urgent"],
    }


def _scan_circle_perspectives(project_root: str) -> Dict[str, Any]:
    """Scan circle backlogs and telemetry for perspective coverage metrics."""
    circles_dir = os.path.join(project_root, "circles")
    goalie_dir = os.path.join(project_root, ".goalie")

    # Circle config from EVIDENCE_CONFIG (env vars / .goalie/evidence_config.json)
    circle_lenses = EVIDENCE_CONFIG.get("circles", {})
    cf = EVIDENCE_CONFIG.get("coverage_factors", {})

    coverage: Dict[str, Dict[str, Any]] = {}
    for circle, info in circle_lenses.items():
        circle_path = os.path.join(circles_dir, circle)
        has_backlog = os.path.exists(os.path.join(circle_path, "backlog.md")) if os.path.isdir(circle_path) else False

        # Check for telemetry events for this circle
        event_count = 0
        metrics_file = os.path.join(goalie_dir, "pattern_metrics.jsonl")
        if os.path.exists(metrics_file):
            try:
                with open(metrics_file, "r") as f:
                    for line in f:
                        if f'"circle":"{circle}"' in line or f'"circle": "{circle}"' in line:
                            event_count += 1
            except Exception:
                pass

        # Depth score: events / depth_target (capped at 100%)
        depth_target = info["depth_target"]
        depth_score = min(100.0, (event_count / depth_target) * 100.0) if depth_target > 0 else 0.0

        coverage[circle] = {
            "lens": info["lens"],
            "depth_target": depth_target,
            "has_backlog": has_backlog,
            "event_count": event_count,
            "depth_score": round(depth_score, 1),
            "coverage_score": min(cf.get("max_coverage_score", 100), event_count * cf.get("event_multiplier", 10)) if has_backlog else 0,
        }

    total_circles = len(circle_lenses)
    circles_with_backlog = sum(1 for c in coverage.values() if c["has_backlog"])
    circles_with_events = sum(1 for c in coverage.values() if c["event_count"] > 0)

    return {
        "circle_coverage_pct": round((circles_with_backlog / total_circles) * 100, 1) if total_circles > 0 else 0,
        "telemetry_coverage_pct": round((circles_with_events / total_circles) * 100, 1) if total_circles > 0 else 0,
        "circles": coverage,
    }


def _compute_intent_coverage(project_root: str, run_id: Optional[str] = None) -> Dict[str, Any]:
    """Compute pattern hit % for required intent atoms from evidence_config."""
    intent_cfg = EVIDENCE_CONFIG.get("intent_coverage", {})
    required_patterns = intent_cfg.get("required_patterns", [
        "safe_degrade", "observability_first", "depth_ladder", "guardrail_lock", "iteration_budget"
    ])
    min_hit_pct = intent_cfg.get("min_hit_pct", 60.0)
    weight_by_depth = intent_cfg.get("weight_by_depth_target", True)

    metrics_file = os.path.join(project_root, ".goalie", "pattern_metrics.jsonl")
    pattern_hits: Dict[str, int] = {p: 0 for p in required_patterns}
    total_events = 0

    if os.path.exists(metrics_file):
        try:
            with open(metrics_file, "r") as f:
                for line in f:
                    if run_id and run_id not in line:
                        continue
                    total_events += 1
                    for pattern in required_patterns:
                        if f'"pattern":"{pattern}"' in line or f'"pattern": "{pattern}"' in line:
                            pattern_hits[pattern] += 1
        except Exception:
            pass

    patterns_hit = sum(1 for v in pattern_hits.values() if v > 0)
    hit_pct = (patterns_hit / len(required_patterns) * 100.0) if required_patterns else 0.0
    meets_threshold = hit_pct >= min_hit_pct

    return {
        "required_patterns": required_patterns,
        "pattern_hits": pattern_hits,
        "patterns_hit": patterns_hit,
        "patterns_total": len(required_patterns),
        "hit_pct": round(hit_pct, 1),
        "min_hit_pct": min_hit_pct,
        "meets_threshold": meets_threshold,
        "total_events_scanned": total_events,
    }


def _analyze_log(log_path: str) -> Dict[str, int]:
    stats = {
        "health_checkpoints": 0,
        "abort_detected": 0,
        "system_state_errors": 0,
        "autofix_advised": 0,
        "autofix_applied": 0,
    }

    try:
        with open(log_path, "r", errors="replace") as f:
            for line in f:
                if "🏥 Running Mid-Cycle Health Checkpoint" in line:
                    stats["health_checkpoints"] += 1
                if "Critical Health Drop Detected" in line or "Aborting Cycle" in line:
                    stats["abort_detected"] += 1
                if "System state error" in line and "timeout" not in line.lower():
                    stats["system_state_errors"] += 1
                if "🤖 Auto-fixable" in line or "Auto-fixable" in line:
                    stats["autofix_advised"] += 1
                if "Auto-fixed" in line or "Auto-fix applied" in line:
                    stats["autofix_applied"] += 1
    except FileNotFoundError:
        return stats
    except Exception:
        return stats

    return stats


def _attach_log_stats(summary: Dict[str, Any], log_path: str) -> None:
    s = summary if isinstance(summary, dict) else {}
    stats = _analyze_log(log_path)
    s["health_ckpt"] = int(stats.get("health_checkpoints", 0) or 0)
    s["abort"] = 1 if int(stats.get("abort_detected", 0) or 0) > 0 else 0
    s["sys_state_err"] = int(stats.get("system_state_errors", 0) or 0)
    s["autofix_adv"] = int(stats.get("autofix_advised", 0) or 0)
    s["autofix_applied"] = int(stats.get("autofix_applied", 0) or 0)


def _print_rep_mini_summary(phase: str, profile: str, concurrency: str, run_id: str, ok: bool, summary: Dict[str, Any], log_path: str) -> None:
    duration_h = _f(summary.get("total_duration_hours"), 0.0)
    rev_per_h = _f(summary.get("revenue_per_hour"), 0.0)
    sentinel = _i(summary.get("duration_sentinel_events"), 0)
    miss = _i(summary.get("duration_missing_events"), 0)
    inv = _i(summary.get("duration_invalid_events"), 0)
    zero = _i(summary.get("duration_zero_events"), 0)
    alloc = _f(summary.get("allocated_revenue"), 0.0)

    log_stats = _analyze_log(log_path)

    print(
        "REP"
        f" phase={phase}"
        f" profile={profile}"
        f" conc={concurrency}"
        f" run={run_id[:8]}"
        f" ok={1 if ok else 0}"
        f" dur_h={duration_h:.4f}"
        f" rev_per_h={rev_per_h:.2f}"
        f" alloc_rev={alloc:.2f}"
        f" miss={miss}"
        f" inv={inv}"
        f" sent={sentinel}"
        f" zero={zero}"
        f" health_ckpt={log_stats['health_checkpoints']}"
        f" abort={1 if log_stats['abort_detected'] else 0}"
        f" sys_state_err={log_stats['system_state_errors']}"
        f" autofix_adv={log_stats['autofix_advised']}"
        f" autofix_applied={log_stats['autofix_applied']}"
    )


def _print_progress(completed_runs: int, total_runs: int, phase: str, profile: str, concurrency: str, run_id: str, ok: bool) -> None:
    pct = (float(completed_runs) / float(total_runs) * 100.0) if total_runs > 0 else 0.0
    print(
        "PROGRESS"
        f" done={completed_runs}/{total_runs}"
        f" pct={pct:.1f}"
        f" phase={phase}"
        f" profile={profile}"
        f" conc={concurrency}"
        f" run={run_id[:8]}"
        f" ok={1 if ok else 0}"
    )


def _run_gaps_json(project_root: str, run_id: str, reference_events: int, save_json: bool) -> Tuple[bool, str, Dict[str, Any]]:
    cmd = [
        _af_path(project_root),
        "detect-observability-gaps",
        "--correlation-id",
        run_id,
        "--safe-degrade-conditional",
        "--normalize-by-events",
        "--reference-events",
        str(reference_events),
        "--json",
    ]
    p = subprocess.run(cmd, cwd=project_root, capture_output=True, text=True)
    if p.returncode != 0:
        err = (p.stderr or p.stdout or "").strip()
        return False, f"detect-observability-gaps failed (exit {p.returncode}): {err[-800:]}", {}

    raw = (p.stdout or "").strip()
    if not raw:
        return False, "detect-observability-gaps produced empty stdout", {}

    try:
        doc = json.loads(raw)
    except Exception as e:
        preview = raw[:1200]
        return False, f"detect-observability-gaps invalid JSON: {e}; preview={preview!r}", {}

    if save_json:
        out_path = os.path.join(project_root, ".goalie", f"gaps_{run_id}.json")
        try:
            os.makedirs(os.path.dirname(out_path), exist_ok=True)
            with open(out_path, "w") as f:
                f.write(json.dumps(doc, indent=2))
        except Exception:
            pass

    return True, "", doc


def _format_gaps_line(run_id: str, gaps_doc: Dict[str, Any]) -> str:
    coverage = gaps_doc.get("coverage") if isinstance(gaps_doc, dict) else None
    if not isinstance(coverage, dict):
        return f"GAPS run={run_id[:8]} error=missing_coverage"

    gaps = coverage.get("gaps")
    not_applicable = coverage.get("not_applicable")
    if not isinstance(gaps, list):
        gaps = []
    if not isinstance(not_applicable, list):
        not_applicable = []

    gap_summ: List[str] = []
    for g in gaps[:4]:
        if not isinstance(g, dict):
            continue
        pat = g.get("pattern")
        deficit = g.get("deficit")
        if pat is None:
            continue
        try:
            d = int(deficit) if deficit is not None else 0
        except Exception:
            d = 0
        gap_summ.append(f"{pat}:{d}")

    na_pats: List[str] = []
    for na in not_applicable[:4]:
        if not isinstance(na, dict):
            continue
        pat = na.get("pattern")
        if isinstance(pat, str) and pat:
            na_pats.append(pat)

    gap_part = "[" + ",".join(gap_summ) + "]" if gap_summ else "[]"
    na_part = "[" + ",".join(na_pats) + "]" if na_pats else "[]"

    return f"GAPS run={run_id[:8]} gaps={len(gaps)} top={gap_part} na={na_part}"


def _post_rep_updates(
    project_root: str,
    completed_runs: int,
    total_runs: int,
    phase: str,
    profile: str,
    concurrency: str,
    run_id: str,
    ok: bool,
    event_count: int,
    gaps_enabled: bool,
    gaps_save_json: bool,
    gaps_reference_events: int,
) -> int:
    completed_runs += 1
    _print_progress(completed_runs, total_runs, phase, profile, concurrency, run_id, ok)

    if gaps_enabled:
        ref_events = int(gaps_reference_events)
        if ref_events <= 0:
            telemetry_events = _count_telemetry_events(project_root, run_id)
            if telemetry_events > 0:
                ref_events = int(telemetry_events)
            elif event_count > 0:
                ref_events = int(event_count)
            else:
                ref_events = EVIDENCE_CONFIG.get("cli_defaults", {}).get("reference_events", 1000)

        gok, gerr, gdoc = _run_gaps_json(project_root, run_id, reference_events=ref_events, save_json=gaps_save_json)
        if gok:
            print(_format_gaps_line(run_id, gdoc))
        else:
            print(f"GAPS run={run_id[:8]} error={gerr}")

    return completed_runs


def _f(v: Any, default: float = 0.0) -> float:
    try:
        if v is None:
            return default
        return float(v)
    except Exception:
        return default


def _i(v: Any, default: int = 0) -> int:
    try:
        if v is None:
            return default
        return int(v)
    except Exception:
        return default


def _mean(vals: List[float]) -> float:
    if not vals:
        return 0.0
    return sum(vals) / max(1, len(vals))


def _print_table(results: List[RunResult], baseline_by_profile: Dict[str, Dict[str, float]], out_fp: Optional[TextIO] = None) -> None:
    headers = [
        "phase",
        "profile",
        "concurrency",
        "run_id",
        "ok",
        "health_ckpt",
        "abort",
        "sys_state_err",
        "autofix_adv",
        "autofix_applied",
        "duration_h",
        "total_actions",
        "actions_per_h",
        "alloc_rev",
        "rev_per_h",
        "rev_per_action",
        "allocation_efficiency_pct",
        "energy_cost_usd",
        "wsjf_per_h",
        "value_per_energy",
        "profit_dividend",
        "event_count",
        "miss",
        "inv",
        "sentinel",
        "zero",
        "duration_ok_pct",
        "dur_mult",
        "eff_mult",
        "tier_backlog_cov_pct",
        "tier_telemetry_cov_pct",
        "tier_depth_cov_pct",
        "intent_cov_pct",
        "stability_score",
    ]

    header_line = "\t".join(headers)
    print(header_line)
    if out_fp is not None:
        out_fp.write(header_line + "\n")

    for r in results:
        s = r.summary
        duration_h = _f(s.get("total_duration_hours"), 0.0)
        total_actions = _i(s.get("total_actions"), 0)
        actions_per_h = (float(total_actions) / duration_h) if (duration_h > 0 and total_actions > 0) else 0.0
        alloc_rev = _f(s.get("allocated_revenue"), 0.0)
        rev_per_h = _f(s.get("revenue_per_hour"), 0.0)
        rev_per_action = _f(s.get("revenue_per_action"), 0.0)
        alloc_eff = _f(s.get("allocation_efficiency_pct"), 0.0)
        energy_cost = _f(s.get("total_energy_cost_usd"), 0.0)
        wsjf_per_h = _f(s.get("wsjf_per_hour"), 0.0)
        value_per_energy = _f(s.get("value_per_energy_usd"), 0.0)
        profit_dividend = _f(s.get("total_profit_dividend_usd"), 0.0)
        event_count = _i(s.get("event_count"), 0)

        miss = _i(s.get("duration_missing_events"), 0)
        inv = _i(s.get("duration_invalid_events"), 0)
        sentinel = _i(s.get("duration_sentinel_events"), 0)
        zero = _i(s.get("duration_zero_events"), 0)

        duration_ok_events = max(0, event_count - (miss + inv + sentinel + zero))
        duration_ok_pct = (float(duration_ok_events) / float(event_count) * 100.0) if event_count > 0 else 0.0

        base = baseline_by_profile.get(r.profile, {})
        base_dur = _f(base.get("duration_h"), 0.0)
        base_eff = _f(base.get("rev_per_h"), 0.0)

        dur_mult = (duration_h / base_dur) if (base_dur > 0 and duration_h > 0) else 0.0
        eff_mult = (rev_per_h / base_eff) if (base_eff > 0) else 0.0

        tier_backlog = _f(s.get("tier_backlog_cov_pct"), 0.0)
        tier_telem = _f(s.get("tier_telemetry_cov_pct"), 0.0)
        tier_depth = _f(s.get("tier_depth_cov_pct"), 0.0)

        health_ckpt = _i(s.get("health_ckpt"), 0)
        abort = _i(s.get("abort"), 0)
        sys_state_err = _i(s.get("sys_state_err"), 0)
        autofix_adv = _i(s.get("autofix_adv"), 0)
        autofix_applied = _i(s.get("autofix_applied"), 0)

        row = [
            r.phase,
            r.profile,
            r.concurrency,
            r.run_id[:8],
            "1" if r.ok else "0",
            str(health_ckpt),
            str(abort),
            str(sys_state_err),
            str(autofix_adv),
            str(autofix_applied),
            f"{duration_h:.4f}",
            str(total_actions),
            f"{actions_per_h:.3f}",
            f"{alloc_rev:.2f}",
            f"{rev_per_h:.2f}",
            f"{rev_per_action:.2f}",
            f"{alloc_eff:.2f}",
            f"{energy_cost:.4f}",
            f"{wsjf_per_h:.2f}",
            f"{value_per_energy:.2f}",
            f"{profit_dividend:.2f}",
            str(event_count),
            str(miss),
            str(inv),
            str(sentinel),
            str(zero),
            f"{duration_ok_pct:.2f}",
            f"{dur_mult:.3f}",
            f"{eff_mult:.3f}",
            f"{tier_backlog:.2f}",
            f"{tier_telem:.2f}",
            f"{tier_depth:.2f}",
            f"{_f(s.get('intent_coverage_pct'), 0.0):.2f}",
            f"{_compute_stability_score(s, abort, sys_state_err, duration_ok_pct, dur_mult):.2f}",
        ]
        line = "\t".join(row)
        print(line)
        if out_fp is not None:
            out_fp.write(line + "\n")

    failed = [r for r in results if not r.ok]
    if failed:
        print("\nFailures:")
        for r in failed:
            print(f"- {r.phase}/{r.profile}/{r.concurrency} run_id={r.run_id}: {r.error}")


def _run_ab_test(
    project_root: str,
    args: Any,
    tier_depth_enabled: bool,
    intent_coverage_enabled: bool,
    gaps_enabled: bool,
) -> int:
    """Run multi-variant test comparing N configurations (A/B/C/D)."""

    ab_reps = max(1, args.ab_reps)

    # Build variant list dynamically (only include variants with iters > 0)
    variants: List[Tuple[str, int]] = []

    # Variant A (default to golden_iters if not specified)
    a_iters = args.variant_a_iters if args.variant_a_iters > 0 else args.golden_iters
    variants.append((args.variant_a_label, a_iters))

    # Variant B (default to platinum_iters if not specified)
    b_iters = args.variant_b_iters if args.variant_b_iters > 0 else args.platinum_iters
    variants.append((args.variant_b_label, b_iters))

    # Variant C (optional, skip if 0)
    if args.variant_c_iters > 0:
        variants.append((args.variant_c_label, args.variant_c_iters))

    # Variant D (optional, skip if 0)
    if args.variant_d_iters > 0:
        variants.append((args.variant_d_label, args.variant_d_iters))

    # Variant E (optional, skip if 0)
    if args.variant_e_iters > 0:
        variants.append((args.variant_e_label, args.variant_e_iters))

    print("=" * 60)
    print(f"MULTI-VARIANT TEST: {len(variants)} variants")
    for label, iters in variants:
        print(f"  {label}: {iters} iters")
    print(f"Reps per variant: {ab_reps}")
    print("=" * 60)

    # Run all variants
    all_variant_results: Dict[str, List[RunResult]] = {}
    all_results: List[RunResult] = []

    for label, iters in variants:
        variant_args = [
            "--mode", "advisory",
            "--no-early-stop",
            "--iterations", str(iters),
            "--circle", args.circle,
        ]
        results: List[RunResult] = []

        print(f"\n--- Variant {label} ({iters} iters) ---")
        for i in range(ab_reps):
            rid = _uuid()
            log_path = os.path.join(project_root, ".goalie", f"ab_variant_{label}_{i+1}_{rid}.log")
            print(f"START {label} rep={i+1} run_id={rid}")
            ok, err = _run_prod_cycle_realtime(project_root, rid, variant_args, log_path, prefix=f"ab/{label}/{i+1}", realtime=args.realtime)
            if not ok:
                summ: Dict[str, Any] = {}
                _attach_log_stats(summ, log_path)
                results.append(RunResult("ab_test", label, "sequential", rid, False, err, summ))
                print(f"REP {label}/{i+1} FAILED: {err}")
                continue
            rok, rerr, summary = _run_revenue_safe(project_root, rid, args.hours)
            _attach_log_stats(summary, log_path)
            if rok:
                _maybe_add_tier_depth(project_root, rid, args.circle, tier_depth_enabled, summary)
                _maybe_add_intent_coverage(project_root, rid, intent_coverage_enabled, summary)
            results.append(RunResult("ab_test", label, "sequential", rid, rok, rerr if not rok else None, summary))
            _print_rep_mini_summary("ab_test", label, "sequential", rid, rok, summary, log_path)

        all_variant_results[label] = results
        all_results.extend(results)

    # Compute statistics
    def _extract_metrics(results: List[RunResult]) -> Dict[str, List[float]]:
        metrics: Dict[str, List[float]] = {
            "rev_per_h": [],
            "duration_h": [],
            "alloc_rev": [],
            "intent_cov_pct": [],
            "stability_score": [],
        }
        for r in results:
            if r.ok:
                s = r.summary
                metrics["rev_per_h"].append(_f(s.get("revenue_per_hour"), 0.0))
                metrics["duration_h"].append(_f(s.get("total_duration_hours"), 0.0))
                metrics["alloc_rev"].append(_f(s.get("total_allocated_revenue"), 0.0))
                metrics["intent_cov_pct"].append(_f(s.get("intent_coverage_pct"), 0.0))
                # Compute stability score for comparison
                abort = _i(s.get("abort"), 0)
                sys_state_err = _i(s.get("sys_state_err"), 0)
                duration_ok_pct = _f(s.get("duration_ok_pct"), 0.0)
                dur_mult = _f(s.get("dur_mult"), 1.0)
                metrics["stability_score"].append(_compute_stability_score(s, abort, sys_state_err, duration_ok_pct, dur_mult))
        return metrics

    def _stats(vals: List[float]) -> Tuple[float, float]:
        if not vals:
            return 0.0, 0.0
        mean = statistics.mean(vals)
        stdev = statistics.stdev(vals) if len(vals) > 1 else 0.0
        return mean, stdev

    # Compute metrics for all variants
    variant_metrics: Dict[str, Dict[str, Tuple[float, float]]] = {}
    for label, _ in variants:
        results = all_variant_results[label]
        extracted = _extract_metrics(results)
        variant_metrics[label] = {k: _stats(v) for k, v in extracted.items()}

    # Print comparison table
    print("\n" + "=" * 80)
    print("MULTI-VARIANT TEST RESULTS")
    print("=" * 80)

    metric_names = ["rev_per_h", "alloc_rev", "duration_h", "intent_cov_pct", "stability_score"]

    # Header
    header = f"{'Metric':<18}"
    for label, _ in variants:
        header += f" {label:>12}"
    header += f" {'Winner':>10}"
    print(header)
    print("-" * len(header))

    # Track wins per variant
    wins: Dict[str, int] = {label: 0 for label, _ in variants}

    for metric_name in metric_names:
        row = f"{metric_name:<18}"
        means = []
        for label, _ in variants:
            mean, std = variant_metrics[label].get(metric_name, (0.0, 0.0))
            row += f" {mean:>12.2f}"
            means.append((label, mean))

        # Determine winner (lower is better for duration_h, higher for others)
        if metric_name == "duration_h":
            valid = [(lbl, m) for lbl, m in means if m > 0]
            if valid:
                winner = min(valid, key=lambda x: x[1])[0]
            else:
                winner = "tie"
        else:
            winner = max(means, key=lambda x: x[1])[0] if any(m > 0 for _, m in means) else "tie"

        if winner != "tie":
            wins[winner] += 1
        row += f" {winner:>10}"
        print(row)

    # Success rates
    print("\n" + "-" * 80)
    sr_row = f"{'Success Rate':<18}"
    for label, _ in variants:
        results = all_variant_results[label]
        ok_count = sum(1 for r in results if r.ok)
        sr_row += f" {ok_count}/{len(results):>9}"
    print(sr_row)

    wins_row = f"{'Metrics Won':<18}"
    for label, _ in variants:
        wins_row += f" {wins[label]:>12}"
    print(wins_row)

    # Overall winner
    max_wins = max(wins.values())
    winners = [lbl for lbl, w in wins.items() if w == max_wins]
    overall_winner = winners[0] if len(winners) == 1 else "TIE"

    print("\n" + "=" * 80)
    print(f"OVERALL WINNER: {overall_winner}")
    if overall_winner != "TIE":
        sorted_wins = sorted(wins.items(), key=lambda x: x[1], reverse=True)
        if len(sorted_wins) > 1:
            margin = sorted_wins[0][1] - sorted_wins[1][1]
            confidence = "HIGH" if margin >= 3 else ("MEDIUM" if margin >= 2 else "LOW")
            print(f"CONFIDENCE: {confidence} ({margin} metric advantage)")
    print("=" * 80)

    # Save results to TSV
    if args.save_table:
        ts = int(time.time())
        label = args.label or "ab_test"
        table_path = args.table_path or os.path.join(project_root, ".goalie", f"swarm_table_{label}_{ts}.tsv")
        with open(table_path, "w") as fp:
            _print_table(all_results, fp)
        print(f"TABLE_SAVED path={table_path}")

    total_ok = sum(1 for r in all_results if r.ok)
    return 0 if total_ok > 0 else 1


def main() -> int:
    parser = argparse.ArgumentParser(description="Run prod-cycle swarms (baseline + capacity) and print revenue-safe comparison table")
    parser.add_argument("--circle", default="testing")
    parser.add_argument("--hours", type=int, default=6)
    parser.add_argument("--golden-reps", type=int, default=3)
    parser.add_argument("--longrun-reps", type=int, default=2)
    parser.add_argument("--golden-iters", type=int, default=25)
    parser.add_argument("--platinum-iters", type=int, default=100)
    parser.add_argument("--realtime", action="store_true")
    parser.add_argument("--max-concurrency", type=int, default=2)
    parser.add_argument("--skip-capacity", action="store_true")
    parser.add_argument("--skip-mixed", action="store_true")
    parser.add_argument("--gaps", action="store_true", help="Emit per-rep detect-observability-gaps summary lines")
    parser.add_argument("--no-gaps", action="store_true", help="Disable per-rep detect-observability-gaps summary lines")
    parser.add_argument("--gaps-save-json", action="store_true", help="Save full detect-observability-gaps JSON to .goalie/gaps_<run_id>.json")
    parser.add_argument("--gaps-reference-events", type=int, default=0)
    parser.add_argument("--tier-depth", action="store_true", help="(default on) Compute tier-depth-coverage per rep and include maturity metrics in table")
    parser.add_argument("--no-tier-depth", action="store_true", help="Disable tier-depth-coverage per rep")
    parser.add_argument("--save-table", action="store_true")
    parser.add_argument("--table-path", default="")
    parser.add_argument("--label", default="")
    parser.add_argument("--compare-prior", default="", help="Path to prior swarm TSV table (enables post-run 3-way compare)")
    parser.add_argument("--compare-auto-ref", default="", help="Path to auto-ref swarm TSV table (enables post-run 3-way compare)")
    parser.add_argument("--compare-out", default="json", choices=["json", "tsv"], help="Output format for post-run compare")
    parser.add_argument("--compare-save", default="", help="Optional path to save post-run compare output")
    parser.add_argument("--auto-compare", action="store_true", help="Automatically compare against prior runs found in .goalie/")
    parser.add_argument("--default-emitters", action="store_true", help="Enable standard evidence emitters: revenue-safe, tier-depth, gaps, intent-coverage")
    parser.add_argument("--intent-coverage", action="store_true", help="Run intent-coverage analysis per rep")
    parser.add_argument("--no-intent-coverage", action="store_true", help="Disable intent-coverage analysis")
    parser.add_argument("--winner-grade", action="store_true", help="Print winner-grade assessment at end of run")
    parser.add_argument("--ab-test", action="store_true", help="Run multi-variant test comparing configurations")
    parser.add_argument("--variant-a-iters", type=int, default=0, help="Iterations for Variant A (overrides golden_iters)")
    parser.add_argument("--variant-b-iters", type=int, default=0, help="Iterations for Variant B (overrides platinum_iters)")
    parser.add_argument("--variant-c-iters", type=int, default=0, help="Iterations for Variant C")
    parser.add_argument("--variant-d-iters", type=int, default=0, help="Iterations for Variant D")
    parser.add_argument("--variant-e-iters", type=int, default=0, help="Iterations for Variant E")
    parser.add_argument("--variant-a-label", default="A", help="Label for Variant A")
    parser.add_argument("--variant-b-label", default="B", help="Label for Variant B")
    parser.add_argument("--variant-c-label", default="C", help="Label for Variant C")
    parser.add_argument("--variant-d-label", default="D", help="Label for Variant D")
    parser.add_argument("--variant-e-label", default="E", help="Label for Variant E")
    parser.add_argument("--ab-reps", type=int, default=3, help="Reps per variant in A/B test mode (default: 3)")
    parser.add_argument("--auto-enable-autocommit", action="store_true", help="Automatically enable autocommit when eligible (requires explicit consent)")
    parser.add_argument("--shadow-cycle", action="store_true", help="Run in shadow mode to accumulate autocommit eligibility cycles")
    parser.add_argument("--json", action="store_true", help="Output final summary as JSON (suppresses some stdout)")
    args = parser.parse_args()

    project_root = _project_root()

    try:
        af_env = _normalize_af_env(os.environ.get("AF_ENV"))
    except Exception as e:
        print(str(e), file=sys.stderr)
        return 2

    swarm_id = os.environ.get("AF_RUN_ID") or _uuid()
    os.environ["AF_RUN_ID"] = swarm_id
    os.environ.setdefault("AF_CORRELATION_ID", swarm_id)

    policy_decision = _apply_af_env_policy(af_env, args)
    _append_policy_evidence(
        project_root=project_root,
        run_id=swarm_id,
        circle=getattr(args, "circle", None),
        fields=policy_decision,
        tags=["policy", f"env:{af_env}", "scope:prod-swarm"],
    )

    # Apply default emitters if requested (overrides defaults unless explicitly disabled)
    if args.default_emitters:
        if not args.no_intent_coverage:
            args.intent_coverage = True
        if not args.no_gaps:
            args.gaps = True
        if not args.no_tier_depth:
            args.tier_depth = True
        args.winner_grade = True
        args.save_table = True
        args.auto_compare = True


    # Command fragments
    golden_args = [
        "--mode",
        "advisory",
        "--no-early-stop",
        "--iterations",
        str(args.golden_iters),
        "--circle",
        args.circle,
    ]
    longrun_args = [
        "--mode",
        "advisory",
        "--profile",
        "longrun",
        "--no-early-stop",
        "--iterations",
        str(args.platinum_iters),
        "--circle",
        args.circle,
    ]

    results: List[RunResult] = []

    golden_reps = max(0, int(args.golden_reps))
    longrun_reps = max(0, int(args.longrun_reps))
    baseline_total = golden_reps + longrun_reps
    capacity_total = 0
    if not args.skip_capacity:
        capacity_total = 4 + (0 if args.skip_mixed else 2)
    total_runs = baseline_total + capacity_total
    completed_runs = 0

    gaps_enabled = bool(args.gaps) and not bool(args.no_gaps)
    tier_depth_enabled = not bool(args.no_tier_depth)
    intent_coverage_enabled = bool(args.intent_coverage) and not bool(args.no_intent_coverage)
    winner_grade_enabled = bool(args.winner_grade)

    # Default emitters: curated fast baseline set for prod-cycle qualification
    #
    # DEFAULT_EMITTERS mapping:
    #   revenue-safe     → economic compounding (energy_cost_usd, wsjf_per_h, profit_dividend)
    #   tier-depth       → maturity coverage (tier_backlog_cov_pct, tier_telemetry_cov_pct, tier_depth_cov_pct)
    #   gaps             → observability gaps (gap detection in .goalie/gaps_{run_id}.json)
    #   intent-coverage  → pattern hit % (intent_cov_pct from prompt intent atoms)
    #   winner-grade     → prod-cycle qualification (ok_rate>=80%, rev_per_h>=1000, duration_ok>=50%, abort==0)
    #   stability-score  → longrun stability (composite: aborts, sys_state_err, duration_ok, contention)
    #
    # Default emitters logic
    if args.default_emitters:
        args.enable_revenue_safe = True
        args.enable_tier_depth = True
        args.enable_gaps = True
        args.enable_intent_coverage = True
        args.enable_winner_grade = True
        print("DEFAULT_EMITTERS: revenue-safe + tier-depth + gaps + intent-coverage + winner-grade + stability-score")

    # A/B Testing Logic
    if args.ab_test or any(getattr(args, f"variant_{x}_iters") > 0 for x in "abcde"):
        # Ensure emitter flags have defaults
        tier_depth_enabled = getattr(args, "enable_tier_depth", False) and not getattr(args, "no_tier_depth", False)
        intent_coverage_enabled = getattr(args, "enable_intent_coverage", False)
        gaps_enabled = getattr(args, "enable_gaps", False)
        return _run_ab_test(
            project_root=project_root,
            args=args,
            tier_depth_enabled=tier_depth_enabled,
            intent_coverage_enabled=intent_coverage_enabled,
            gaps_enabled=gaps_enabled
        )

    # ---- Sequential baseline ----
    golden_run_ids: List[str] = []
    longrun_run_ids: List[str] = []

    for i in range(golden_reps):
        rid = _uuid()
        golden_run_ids.append(rid)
        log_path = os.path.join(project_root, ".goalie", f"swarm_baseline_golden_{i+1}_{rid}.log")
        print(f"START baseline golden rep={i+1} run_id={rid}")
        ok, err = _run_prod_cycle_realtime(project_root, rid, golden_args, log_path, prefix=f"baseline/golden/{i+1}", realtime=args.realtime)
        if not ok:
            summ: Dict[str, Any] = {}
            _attach_log_stats(summ, log_path)
            results.append(RunResult("baseline", "golden", "sequential", rid, False, err, summ))
            _print_rep_mini_summary("baseline", "golden", "sequential", rid, False, {}, log_path)
            completed_runs = _post_rep_updates(
                project_root,
                completed_runs,
                total_runs,
                "baseline",
                "golden",
                "sequential",
                rid,
                False,
                0,
                gaps_enabled,
                bool(args.gaps_save_json),
                int(args.gaps_reference_events),
            )
            continue

        rok, rerr, summary = _run_revenue_safe(project_root, rid, args.hours)
        _attach_log_stats(summary, log_path)
        if rok:
            _maybe_add_tier_depth(project_root, rid, args.circle, tier_depth_enabled, summary)
            _maybe_add_intent_coverage(project_root, rid, intent_coverage_enabled, summary)
        results.append(RunResult("baseline", "golden", "sequential", rid, rok, rerr if not rok else None, summary))
        _print_rep_mini_summary("baseline", "golden", "sequential", rid, rok, summary, log_path)

        completed_runs = _post_rep_updates(
            project_root,
            completed_runs,
            total_runs,
            "baseline",
            "golden",
            "sequential",
            rid,
            rok,
            _i(summary.get("event_count"), 0),
            gaps_enabled,
            bool(args.gaps_save_json),
            int(args.gaps_reference_events),
        )

    for i in range(longrun_reps):
        rid = _uuid()
        longrun_run_ids.append(rid)
        log_path = os.path.join(project_root, ".goalie", f"swarm_baseline_longrun_{i+1}_{rid}.log")
        print(f"START baseline longrun rep={i+1} run_id={rid}")
        ok, err = _run_prod_cycle_realtime(project_root, rid, longrun_args, log_path, prefix=f"baseline/longrun/{i+1}", realtime=args.realtime)
        if not ok:
            summ2: Dict[str, Any] = {}
            _attach_log_stats(summ2, log_path)
            results.append(RunResult("baseline", "longrun", "sequential", rid, False, err, summ2))
            _print_rep_mini_summary("baseline", "longrun", "sequential", rid, False, {}, log_path)
            completed_runs = _post_rep_updates(
                project_root,
                completed_runs,
                total_runs,
                "baseline",
                "longrun",
                "sequential",
                rid,
                False,
                0,
                gaps_enabled,
                bool(args.gaps_save_json),
                int(args.gaps_reference_events),
            )
            continue

        rok, rerr, summary = _run_revenue_safe(project_root, rid, args.hours)
        _attach_log_stats(summary, log_path)
        if rok:
            _maybe_add_tier_depth(project_root, rid, args.circle, tier_depth_enabled, summary)
            _maybe_add_intent_coverage(project_root, rid, intent_coverage_enabled, summary)
        results.append(RunResult("baseline", "longrun", "sequential", rid, rok, rerr if not rok else None, summary))
        _print_rep_mini_summary("baseline", "longrun", "sequential", rid, rok, summary, log_path)

        completed_runs = _post_rep_updates(
            project_root,
            completed_runs,
            total_runs,
            "baseline",
            "longrun",
            "sequential",
            rid,
            rok,
            _i(summary.get("event_count"), 0),
            gaps_enabled,
            bool(args.gaps_save_json),
            int(args.gaps_reference_events),
        )

    # Baseline means (used for multipliers)
    baseline_by_profile: Dict[str, Dict[str, float]] = {}

    for profile in ["golden", "longrun"]:
        dur_vals: List[float] = []
        eff_vals: List[float] = []
        for r in results:
            if r.phase != "baseline" or r.profile != profile or not r.ok:
                continue
            dur_vals.append(_f(r.summary.get("total_duration_hours"), 0.0))
            eff_vals.append(_f(r.summary.get("revenue_per_hour"), 0.0))
        baseline_by_profile[profile] = {
            "duration_h": _mean([v for v in dur_vals if v > 0]),
            "rev_per_h": _mean([v for v in eff_vals if v > 0]),
        }

    # ---- Capacity (concurrency=2) ----
    if not args.skip_capacity:
        # Enforce this runner supports only max_concurrency >= 2 for capacity phases.
        if args.max_concurrency < 2:
            print("ERROR: --max-concurrency must be >= 2 for capacity phases (or use --skip-capacity)", file=sys.stderr)
            return 2

        # Homogeneous: golden+golden
        rid1 = _uuid()
        rid2 = _uuid()
        log1 = os.path.join(project_root, ".goalie", f"swarm_capacity_golden_1_{rid1}.log")
        log2 = os.path.join(project_root, ".goalie", f"swarm_capacity_golden_2_{rid2}.log")

        env1 = {**os.environ, "AF_RUN_ID": rid1, "PYTHONUNBUFFERED": "1"}
        env2 = {**os.environ, "AF_RUN_ID": rid2, "PYTHONUNBUFFERED": "1"}
        f1 = open(log1, "w", buffering=1)
        f2 = open(log2, "w", buffering=1)
        print(f"START capacity_homogeneous golden run_id={rid1}")
        print(f"START capacity_homogeneous golden run_id={rid2}")
        p1 = subprocess.Popen([_af_path(project_root), "prod-cycle"] + golden_args, cwd=project_root, env=env1, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, bufsize=1)
        p2 = subprocess.Popen([_af_path(project_root), "prod-cycle"] + golden_args, cwd=project_root, env=env2, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, bufsize=1)
        t1 = threading.Thread(target=_stream_to_log_and_console, args=(p1, f1, f"cap/golden/{rid1[:8]}", args.realtime), daemon=True)
        t2 = threading.Thread(target=_stream_to_log_and_console, args=(p2, f2, f"cap/golden/{rid2[:8]}", args.realtime), daemon=True)
        t1.start()
        t2.start()
        rc1 = p1.wait()
        rc2 = p2.wait()

        t1.join(timeout=2)
        t2.join(timeout=2)

        f1.close()
        f2.close()

        for (rid, rc, log_path) in [(rid1, rc1, log1), (rid2, rc2, log2)]:
            if rc != 0:
                summ3: Dict[str, Any] = {}
                _attach_log_stats(summ3, log_path)
                results.append(RunResult("capacity_homogeneous", "golden", "concurrent2", rid, False, f"prod-cycle exited {rc} (see {log_path})", summ3))
                _print_rep_mini_summary("capacity_homogeneous", "golden", "concurrent2", rid, False, {}, log_path)
                completed_runs = _post_rep_updates(
                    project_root,
                    completed_runs,
                    total_runs,
                    "capacity_homogeneous",
                    "golden",
                    "concurrent2",
                    rid,
                    False,
                    0,
                    gaps_enabled,
                    bool(args.gaps_save_json),
                    int(args.gaps_reference_events),
                )
                continue
            ok, err = _run_prod_cycle(project_root, rid, golden_args, log_path)
            if not ok:
                summ4: Dict[str, Any] = {}
                _attach_log_stats(summ4, log_path)
                results.append(RunResult("capacity_homogeneous", "golden", "concurrent2", rid, False, err, summ4))
                _print_rep_mini_summary("capacity_homogeneous", "golden", "concurrent2", rid, False, {}, log_path)
                completed_runs = _post_rep_updates(
                    project_root,
                    completed_runs,
                    total_runs,
                    "capacity_homogeneous",
                    "golden",
                    "concurrent2",
                    rid,
                    False,
                    0,
                    gaps_enabled,
                    bool(args.gaps_save_json),
                    int(args.gaps_reference_events),
                )
                continue
            rok, rerr, summary = _run_revenue_safe(project_root, rid, args.hours)
            _attach_log_stats(summary, log_path)
            if rok:
                _maybe_add_tier_depth(project_root, rid, args.circle, tier_depth_enabled, summary)
                _maybe_add_intent_coverage(project_root, rid, intent_coverage_enabled, summary)
            results.append(RunResult("capacity_homogeneous", "golden", "concurrent2", rid, rok, rerr if not rok else None, summary))
            _print_rep_mini_summary("capacity_homogeneous", "golden", "concurrent2", rid, rok, summary, log_path)

            completed_runs = _post_rep_updates(
                project_root,
                completed_runs,
                total_runs,
                "capacity_homogeneous",
                "golden",
                "concurrent2",
                rid,
                rok,
                _i(summary.get("event_count"), 0),
                gaps_enabled,
                bool(args.gaps_save_json),
                int(args.gaps_reference_events),
            )

        # Homogeneous: longrun+longrun
        rid3 = _uuid()
        rid4 = _uuid()
        log3 = os.path.join(project_root, ".goalie", f"swarm_capacity_longrun_1_{rid3}.log")
        log4 = os.path.join(project_root, ".goalie", f"swarm_capacity_longrun_2_{rid4}.log")

        env3 = {**os.environ, "AF_RUN_ID": rid3, "PYTHONUNBUFFERED": "1"}
        env4 = {**os.environ, "AF_RUN_ID": rid4, "PYTHONUNBUFFERED": "1"}
        f3 = open(log3, "w", buffering=1)
        f4 = open(log4, "w", buffering=1)
        print(f"START capacity_homogeneous longrun run_id={rid3}")
        print(f"START capacity_homogeneous longrun run_id={rid4}")
        p3 = subprocess.Popen([_af_path(project_root), "prod-cycle"] + longrun_args, cwd=project_root, env=env3, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, bufsize=1)
        p4 = subprocess.Popen([_af_path(project_root), "prod-cycle"] + longrun_args, cwd=project_root, env=env4, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, bufsize=1)
        t3 = threading.Thread(target=_stream_to_log_and_console, args=(p3, f3, f"cap/longrun/{rid3[:8]}", args.realtime), daemon=True)
        t4 = threading.Thread(target=_stream_to_log_and_console, args=(p4, f4, f"cap/longrun/{rid4[:8]}", args.realtime), daemon=True)
        t3.start()
        t4.start()
        rc3 = p3.wait()
        rc4 = p4.wait()

        t3.join(timeout=2)
        t4.join(timeout=2)

        f3.close()
        f4.close()

        for (rid, rc, log_path) in [(rid3, rc3, log3), (rid4, rc4, log4)]:
            if rc != 0:
                summ5: Dict[str, Any] = {}
                _attach_log_stats(summ5, log_path)
                results.append(RunResult("capacity_homogeneous", "longrun", "concurrent2", rid, False, f"prod-cycle exited {rc} (see {log_path})", summ5))
                _print_rep_mini_summary("capacity_homogeneous", "longrun", "concurrent2", rid, False, {}, log_path)
                completed_runs = _post_rep_updates(
                    project_root,
                    completed_runs,
                    total_runs,
                    "capacity_homogeneous",
                    "longrun",
                    "concurrent2",
                    rid,
                    False,
                    0,
                    gaps_enabled,
                    bool(args.gaps_save_json),
                    int(args.gaps_reference_events),
                )
                continue
            ok, err = _run_prod_cycle(project_root, rid, longrun_args, log_path)
            if not ok:
                summ6: Dict[str, Any] = {}
                _attach_log_stats(summ6, log_path)
                results.append(RunResult("capacity_homogeneous", "longrun", "concurrent2", rid, False, err, summ6))
                _print_rep_mini_summary("capacity_homogeneous", "longrun", "concurrent2", rid, False, {}, log_path)
                completed_runs = _post_rep_updates(
                    project_root,
                    completed_runs,
                    total_runs,
                    "capacity_homogeneous",
                    "longrun",
                    "concurrent2",
                    rid,
                    False,
                    0,
                    gaps_enabled,
                    bool(args.gaps_save_json),
                    int(args.gaps_reference_events),
                )
                continue
            rok, rerr, summary = _run_revenue_safe(project_root, rid, args.hours)
            _attach_log_stats(summary, log_path)
            if rok:
                _maybe_add_tier_depth(project_root, rid, args.circle, tier_depth_enabled, summary)
                _maybe_add_intent_coverage(project_root, rid, intent_coverage_enabled, summary)
            results.append(RunResult("capacity_homogeneous", "longrun", "concurrent2", rid, rok, rerr if not rok else None, summary))
            _print_rep_mini_summary("capacity_homogeneous", "longrun", "concurrent2", rid, rok, summary, log_path)

            completed_runs = _post_rep_updates(
                project_root,
                completed_runs,
                total_runs,
                "capacity_homogeneous",
                "longrun",
                "concurrent2",
                rid,
                rok,
                _i(summary.get("event_count"), 0),
                gaps_enabled,
                bool(args.gaps_save_json),
                int(args.gaps_reference_events),
            )

        # Mixed: golden + longrun overlapping
        if not args.skip_mixed:
            rid_g = _uuid()
            rid_l = _uuid()
            log_g = os.path.join(project_root, ".goalie", f"swarm_capacity_mixed_golden_{rid_g}.log")
            log_l = os.path.join(project_root, ".goalie", f"swarm_capacity_mixed_longrun_{rid_l}.log")

            envg = {**os.environ, "AF_RUN_ID": rid_g, "PYTHONUNBUFFERED": "1"}
            envl = {**os.environ, "AF_RUN_ID": rid_l, "PYTHONUNBUFFERED": "1"}
            fg = open(log_g, "w", buffering=1)
            fl = open(log_l, "w", buffering=1)
            print(f"START capacity_mixed golden run_id={rid_g}")
            print(f"START capacity_mixed longrun run_id={rid_l}")
            pg = subprocess.Popen([_af_path(project_root), "prod-cycle"] + golden_args, cwd=project_root, env=envg, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, bufsize=1)
            pl = subprocess.Popen([_af_path(project_root), "prod-cycle"] + longrun_args, cwd=project_root, env=envl, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, bufsize=1)
            tg = threading.Thread(target=_stream_to_log_and_console, args=(pg, fg, f"mix/golden/{rid_g[:8]}", args.realtime), daemon=True)
            tl = threading.Thread(target=_stream_to_log_and_console, args=(pl, fl, f"mix/longrun/{rid_l[:8]}", args.realtime), daemon=True)
            tg.start()
            tl.start()
            rcg = pg.wait()
            rcl = pl.wait()

            tg.join(timeout=2)
            tl.join(timeout=2)

            fg.close()
            fl.close()

            if rcg != 0:
                summ7: Dict[str, Any] = {}
                _attach_log_stats(summ7, log_g)
                results.append(RunResult("capacity_mixed", "golden", "concurrent2", rid_g, False, f"prod-cycle exited {rcg} (see {log_g})", summ7))
                _print_rep_mini_summary("capacity_mixed", "golden", "concurrent2", rid_g, False, {}, log_g)
                completed_runs = _post_rep_updates(
                    project_root,
                    completed_runs,
                    total_runs,
                    "capacity_mixed",
                    "golden",
                    "concurrent2",
                    rid_g,
                    False,
                    0,
                    gaps_enabled,
                    bool(args.gaps_save_json),
                    int(args.gaps_reference_events),
                )
            else:
                rok, rerr, summary = _run_revenue_safe(project_root, rid_g, args.hours)
                _attach_log_stats(summary, log_g)
                if rok:
                    _maybe_add_tier_depth(project_root, rid_g, args.circle, tier_depth_enabled, summary)
                    _maybe_add_intent_coverage(project_root, rid_g, intent_coverage_enabled, summary)
                results.append(RunResult("capacity_mixed", "golden", "concurrent2", rid_g, rok, rerr if not rok else None, summary))
                _print_rep_mini_summary("capacity_mixed", "golden", "concurrent2", rid_g, rok, summary, log_g)

                completed_runs = _post_rep_updates(
                    project_root,
                    completed_runs,
                    total_runs,
                    "capacity_mixed",
                    "golden",
                    "concurrent2",
                    rid_g,
                    rok,
                    _i(summary.get("event_count"), 0),
                    gaps_enabled,
                    bool(args.gaps_save_json),
                    int(args.gaps_reference_events),
                )

            if rcl != 0:
                summ8: Dict[str, Any] = {}
                _attach_log_stats(summ8, log_l)
                results.append(RunResult("capacity_mixed", "longrun", "concurrent2", rid_l, False, f"prod-cycle exited {rcl} (see {log_l})", summ8))
                _print_rep_mini_summary("capacity_mixed", "longrun", "concurrent2", rid_l, False, {}, log_l)
                completed_runs = _post_rep_updates(
                    project_root,
                    completed_runs,
                    total_runs,
                    "capacity_mixed",
                    "longrun",
                    "concurrent2",
                    rid_l,
                    False,
                    0,
                    gaps_enabled,
                    bool(args.gaps_save_json),
                    int(args.gaps_reference_events),
                )
            else:
                rok, rerr, summary = _run_revenue_safe(project_root, rid_l, args.hours)
                _attach_log_stats(summary, log_l)
                if rok:
                    _maybe_add_tier_depth(project_root, rid_l, args.circle, tier_depth_enabled, summary)
                    _maybe_add_intent_coverage(project_root, rid_l, intent_coverage_enabled, summary)
                results.append(RunResult("capacity_mixed", "longrun", "concurrent2", rid_l, rok, rerr if not rok else None, summary))
                _print_rep_mini_summary("capacity_mixed", "longrun", "concurrent2", rid_l, rok, summary, log_l)

                completed_runs = _post_rep_updates(
                    project_root,
                    completed_runs,
                    total_runs,
                    "capacity_mixed",
                    "longrun",
                    "concurrent2",
                    rid_l,
                    rok,
                    _i(summary.get("event_count"), 0),
                    gaps_enabled,
                    bool(args.gaps_save_json),
                    int(args.gaps_reference_events),
                )

    out_fp: Optional[TextIO] = None
    out_path: Optional[str] = None
    # Ensure table is saved when auto-compare is requested
    compare_requested = args.auto_compare or bool(str(args.compare_prior).strip()) or bool(str(args.compare_auto_ref).strip())
    if bool(args.save_table) or bool(args.table_path) or compare_requested:
        if str(args.table_path).strip():
            p = str(args.table_path).strip()
            out_path = p if os.path.isabs(p) else os.path.join(project_root, p)
        else:
            label = str(args.label).strip() or ("current" if compare_requested else "swarm")
            ts = int(time.time())
            out_path = os.path.join(project_root, ".goalie", f"swarm_table_{label}_{ts}.tsv")
        try:
            os.makedirs(os.path.dirname(out_path), exist_ok=True)
            out_fp = open(out_path, "w", encoding="utf-8")
        except Exception:
            out_fp = None
            out_path = None

    try:
        _print_table(results, baseline_by_profile, out_fp=out_fp)
    finally:
        try:
            if out_fp is not None:
                out_fp.close()
        except Exception:
            pass

    if out_path:
        print(f"TABLE_SAVED path={out_path}")

    # Auto-compare: find latest prior/autoref tables and run 3-way compare
    if args.auto_compare:
        import glob
        goalie_dir = os.path.join(project_root, ".goalie")

        # Find latest current table (must exist)
        current_files = glob.glob(os.path.join(goalie_dir, "swarm_table_current_*.tsv"))
        if not current_files:
            # Fallback: try finding the most recently created table matching swarm_table_*.tsv
            all_tables = glob.glob(os.path.join(goalie_dir, "swarm_table_*.tsv"))
            if all_tables:
                 current_files = [max(all_tables, key=os.path.getmtime)]

        if not current_files:
             print("ERROR: No current swarm table found. Run with --save-table first.", file=sys.stderr)
             return 1

        current_path = max(current_files, key=os.path.getmtime)

        # Find latest prior and autoref tables
        prior_files = glob.glob(os.path.join(goalie_dir, "swarm_table_prior_*.tsv"))
        autoref_files = glob.glob(os.path.join(goalie_dir, "swarm_table_autoref_*.tsv"))

        # Flexible Prior Detection:
        # If no explicit "prior_*" files, look for ANY swarm_table_*.tsv that isn't the current one.
        if not prior_files:
            all_tables = sorted(glob.glob(os.path.join(goalie_dir, "swarm_table_*.tsv")), key=os.path.getmtime, reverse=True)
            # Filter out the current path
            candidates = [t for t in all_tables if os.path.abspath(t) != os.path.abspath(current_path)]
            if candidates:
                prior_files = [candidates[0]] # Use the most recent previous table

        # Flexible Auto-Ref Detection:
        # If no explicit "autoref", reuse prior or find separate if possible.
        # Strict 3-way compare requires 3 files. If we only have 2 (Current, Prior), we can duplicate Prior as AutoRef for diffing?
        # Or just fail gracefully for AutoRef.
        if not autoref_files:
             # Try to find a very old table? Or just duplicate prior to avoid crashing 3-way compare script?
             # For now, let's duplicate prior if we have it, so we at least get Current vs Prior diffs.
             if prior_files:
                 autoref_files = prior_files

        if not prior_files:
            print("ERROR: --auto-compare requires at least one previous table in .goalie", file=sys.stderr)
            return 1

        # Use the latest files
        prior_path = max(prior_files, key=os.path.getmtime)
        autoref_path = max(autoref_files, key=os.path.getmtime) if autoref_files else prior_path

        # Generate timestamped output path
        timestamp = str(int(time.time()))
        compare_save_path = os.path.join(goalie_dir, f"swarm_compare_3way_{timestamp}.json")

        # Set up comparison arguments
        args.compare_prior = prior_path
        args.compare_auto_ref = autoref_path
        args.compare_save = compare_save_path
        args.compare_out = "json"

        print(f"AUTO-COMPARE: prior={os.path.basename(prior_path)} current={os.path.basename(current_path)} auto-ref={os.path.basename(autoref_path)}")
        print(f"AUTO-COMPARE: will save to {os.path.basename(compare_save_path)}")

    if out_path and str(args.compare_prior).strip() and str(args.compare_auto_ref).strip():
        prior_p = str(args.compare_prior).strip()
        auto_p = str(args.compare_auto_ref).strip()
        if not os.path.isabs(prior_p):
            prior_p = os.path.join(project_root, prior_p)
        if not os.path.isabs(auto_p):
            auto_p = os.path.join(project_root, auto_p)

        cmd = [
            sys.executable,
            os.path.join(project_root, "scripts", "cmd_swarm_compare.py"),
            "--prior",
            prior_p,
            "--current",
            out_path,
            "--auto-ref",
            auto_p,
            "--out",
            str(args.compare_out),
        ]
        if str(args.compare_save).strip():
            save_p = str(args.compare_save).strip()
            if not os.path.isabs(save_p):
                save_p = os.path.join(project_root, save_p)
            cmd += ["--save", save_p]

        p = subprocess.run(cmd, cwd=project_root, capture_output=True, text=True)
        if p.returncode != 0:
            err = (p.stderr or p.stdout or "").strip()
            print(f"WARN: swarm-compare failed (exit {p.returncode}): {err[-800:]}", file=sys.stderr)
        else:
            out = (p.stdout or "").strip()
            if out:
                # Parse JSON - extract just the JSON object if there's extra data
                try:
                    # Find the end of the JSON object by matching braces
                    if out.startswith("{"):
                        depth = 0
                        json_end = 0
                        for i, c in enumerate(out):
                            if c == "{":
                                depth += 1
                            elif c == "}":
                                depth -= 1
                                if depth == 0:
                                    json_end = i + 1
                                    break
                        json_str = out[:json_end] if json_end > 0 else out
                    else:
                        json_str = out

                    compare_data = json.loads(json_str)
                    _print_maturity_delta_summary(compare_data)
                except json.JSONDecodeError as e:
                    print(f"WARN: swarm-compare JSON parse failed: {e}")
                except Exception as e:
                    print(f"WARN: maturity delta failed: {e}")
            if str(args.compare_save).strip():
                print(f"SWARM_COMPARE_SAVED path={save_p}")

    # Winner-grade assessment
    if winner_grade_enabled and results:
        print("\n" + "=" * 60)
        print("WINNER-GRADE ASSESSMENT")
        print("=" * 60)

        # Thresholds from EVIDENCE_CONFIG (env vars / .goalie/evidence_config.json)
        THRESHOLDS = EVIDENCE_CONFIG.get("thresholds", {
            "rev_per_h_min": 1000.0,
            "duration_ok_pct_min": 50.0,
            "abort_max": 0,
            "contention_mult_max": 2.0,
            "ok_rate_min": 0.8,
        })

        ok_runs = [r for r in results if r.ok]
        ok_rate = len(ok_runs) / len(results) if results else 0.0

        # Calculate aggregate metrics
        total_rev_per_h = 0.0
        total_duration_ok_pct = 0.0
        total_aborts = 0
        max_dur_mult = 0.0

        for r in ok_runs:
            s = r.summary
            total_rev_per_h += _f(s.get("revenue_per_hour"), 0.0)

            event_count = _i(s.get("event_count"), 0)
            miss = _i(s.get("duration_missing_events"), 0)
            inv = _i(s.get("duration_invalid_events"), 0)
            sentinel = _i(s.get("duration_sentinel_events"), 0)
            zero = _i(s.get("duration_zero_events"), 0)
            ok_events = max(0, event_count - (miss + inv + sentinel + zero))
            dur_ok = (float(ok_events) / float(event_count) * 100.0) if event_count > 0 else 0.0
            total_duration_ok_pct += dur_ok

            total_aborts += _i(s.get("abort"), 0)

            # Contention multiplier from concurrent runs
            if r.concurrency != "sequential":
                base = baseline_by_profile.get(r.profile, {})
                base_dur = _f(base.get("duration_h"), 0.0)
                run_dur = _f(s.get("total_duration_hours"), 0.0)
                if base_dur > 0 and run_dur > 0:
                    mult = run_dur / base_dur
                    max_dur_mult = max(max_dur_mult, mult)

        avg_rev_per_h = total_rev_per_h / len(ok_runs) if ok_runs else 0.0
        avg_duration_ok_pct = total_duration_ok_pct / len(ok_runs) if ok_runs else 0.0

        # Evaluate against thresholds
        checks = [
            ("ok_rate", ok_rate >= THRESHOLDS["ok_rate_min"], f"{ok_rate*100:.1f}% >= {THRESHOLDS['ok_rate_min']*100:.0f}%"),
            ("rev_per_h", avg_rev_per_h >= THRESHOLDS["rev_per_h_min"], f"${avg_rev_per_h:.2f} >= ${THRESHOLDS['rev_per_h_min']:.0f}"),
            ("duration_ok_pct", avg_duration_ok_pct >= THRESHOLDS["duration_ok_pct_min"], f"{avg_duration_ok_pct:.1f}% >= {THRESHOLDS['duration_ok_pct_min']:.0f}%"),
            ("abort", total_aborts <= THRESHOLDS["abort_max"], f"{total_aborts} <= {THRESHOLDS['abort_max']}"),
        ]

        # Only check contention if we have concurrent runs
        if max_dur_mult > 0:
            checks.append(("contention_mult", max_dur_mult <= THRESHOLDS["contention_mult_max"], f"{max_dur_mult:.2f}x <= {THRESHOLDS['contention_mult_max']:.1f}x"))

        passed = 0
        for name, ok, desc in checks:
            status = "PASS" if ok else "FAIL"
            print(f"  {name}: {status} ({desc})")
            if ok:
                passed += 1

        winner_grade = passed == len(checks)
        grade_status = "WINNER-GRADE" if winner_grade else "NOT WINNER-GRADE"
        print(f"\nRESULT: {grade_status} ({passed}/{len(checks)} checks passed)")

        if winner_grade:
            print("RECOMMENDATION: Ready for prod-cycle integration")
        else:
            print("RECOMMENDATION: Address failing checks before integration")
        
        # Contention warning and recommendation
        if max_dur_mult > THRESHOLDS["contention_mult_max"]:
            print(f"\n  ⚠️  CONTENTION WARNING: {max_dur_mult:.2f}x duration multiplier detected")
            print(f"  → System shows stress under concurrent load")
            print(f"  → Recommendation: Reduce --max-concurrency from {args.max_concurrency} to 1")
            print(f"  → Or investigate: af pattern-stats --pattern duration_anomaly --hours 24")

        # =================================================================
        # AUTOCOMMIT GRADUATION ASSESSMENT (Reflexive Toggle Evaluation)
        # =================================================================
        grad_cfg = EVIDENCE_CONFIG.get("autocommit_graduation", {})
        green_streak_req = grad_cfg.get("green_streak_required", 3)
        max_autofix_adv = grad_cfg.get("max_autofix_adv_per_cycle", 5)
        min_stability = grad_cfg.get("min_stability_score", 70.0)
        min_ok_rate_grad = grad_cfg.get("min_ok_rate", 0.9)
        max_sys_err = grad_cfg.get("max_sys_state_err", 0)
        max_abort_grad = grad_cfg.get("max_abort", 0)
        shadow_cycles_req = grad_cfg.get("shadow_cycles_before_recommend", 5)
        retro_required = grad_cfg.get("retro_approval_required", True)
        pattern_triggers = grad_cfg.get("pattern_triggers", {})

        # Compute graduation metrics from current run
        total_autofix_adv = sum(_i(r.summary.get("autofix_adv"), 0) for r in ok_runs)
        total_sys_err = sum(_i(r.summary.get("sys_state_err"), 0) for r in ok_runs)
        
        # Compute stability scores for each run (not stored in summary, calculated inline)
        stability_scores = []
        for r in ok_runs:
            s = r.summary
            abort = _i(s.get("abort"), 0)
            sys_err = _i(s.get("sys_state_err"), 0)
            dur_ok = _f(s.get("duration_ok_pct"), 0.0)
            dur_mult = _f(s.get("dur_mult"), 1.0)
            stability_scores.append(_compute_stability_score(s, abort, sys_err, dur_ok, dur_mult))
        avg_stability = sum(stability_scores) / len(stability_scores) if stability_scores else 0.0

        # Graduation checks
        grad_checks = [
            ("ok_rate", ok_rate >= min_ok_rate_grad, f"{ok_rate*100:.1f}% >= {min_ok_rate_grad*100:.0f}%"),
            ("stability", avg_stability >= min_stability, f"{avg_stability:.1f} >= {min_stability:.0f}"),
            ("autofix_adv", total_autofix_adv <= max_autofix_adv * len(ok_runs), f"{total_autofix_adv} <= {max_autofix_adv * len(ok_runs)}"),
            ("sys_state_err", total_sys_err <= max_sys_err, f"{total_sys_err} <= {max_sys_err}"),
            ("abort", total_aborts <= max_abort_grad, f"{total_aborts} <= {max_abort_grad}"),
        ]

        grad_passed = sum(1 for _, ok, _ in grad_checks if ok)
        grad_eligible = grad_passed == len(grad_checks)

        print(f"\n  AUTOCOMMIT GRADUATION STATUS:")
        for name, ok, desc in grad_checks:
            status = "✓" if ok else "✗"
            print(f"    {status} {name}: {desc}")

        if grad_eligible:
            print(f"\n  → ELIGIBLE for autocommit graduation")
            print(f"  → Requires {shadow_cycles_req} consecutive shadow cycles")
            if retro_required:
                print(f"  → Retro approval required before enabling")
            print(f"  → CMD: AF_ALLOW_CODE_AUTOCOMMIT=1 AF_FULL_CYCLE_AUTOCOMMIT=1 ./scripts/af prod-cycle")
            
            # Auto-enable autocommit if explicitly requested
            if args.auto_enable_autocommit:
                if retro_required:
                    # Check if retro approval exists
                    approval_file = os.path.join(project_root, ".goalie", "approval_log.jsonl")
                    retro_approved = False
                    
                    if os.path.exists(approval_file):
                        with open(approval_file, 'r') as f:
                            for line in f:
                                if line.strip():
                                    approval = json.loads(line)
                                    if approval.get("type") == "autocommit" and approval.get("status") == "approved":
                                        retro_approved = True
                                        break
                    
                    if retro_approved:
                        print(f"\n  ✓ Retro approval verified")
                        # Proceed with autocommit enable
                        policy_path = os.path.join(project_root, ".goalie", "autocommit_policy.yaml")
                        try:
                            if os.path.exists(policy_path):
                                with open(policy_path, 'r') as f:
                                    policy = yaml.safe_load(f) or {}
                            else:
                                policy = {}
                            
                            policy["allow_full_cycle_autocommit"] = True
                            policy["allow_code_autocommit"] = True
                            policy["enabled_at"] = datetime.now().isoformat()
                            policy["graduation_run_id"] = ok_runs[0].run_id if ok_runs else "unknown"
                            policy["retro_approval"] = True
                            
                            with open(policy_path, 'w') as f:
                                yaml.dump(policy, f, default_flow_style=False)
                            
                            print(f"\n  ✅ AUTO-COMMIT ENABLED")
                            print(f"  → Policy updated: {policy_path}")
                            print(f"  → Ready for production use")
                        except Exception as e:
                            print(f"\n  ❌ Failed to enable autocommit: {e}")
                    else:
                        print(f"\n  ⚠️  Cannot auto-enable: Retro approval required")
                        print(f"  → Run retro review first: ./scripts/af retro approve autocommit")
                else:
                    # Update autocommit policy
                    policy_path = os.path.join(project_root, ".goalie", "autocommit_policy.yaml")
                    try:
                        if os.path.exists(policy_path):
                            with open(policy_path, 'r') as f:
                                policy = yaml.safe_load(f) or {}
                        else:
                            policy = {}
                        
                        policy["allow_full_cycle_autocommit"] = True
                        policy["allow_code_autocommit"] = True
                        policy["enabled_at"] = datetime.now().isoformat()
                        policy["graduation_run_id"] = ok_runs[0].run_id if ok_runs else "unknown"
                        
                        with open(policy_path, 'w') as f:
                            yaml.dump(policy, f, default_flow_style=False)
                        
                        print(f"\n  ✅ AUTO-COMMIT ENABLED")
                        print(f"  → Policy updated: {policy_path}")
                        print(f"  → Ready for production use")
                    except Exception as e:
                        print(f"\n  ❌ Failed to enable autocommit: {e}")
        else:
            failing = [name for name, ok, _ in grad_checks if not ok]
            print(f"\n  → NOT ELIGIBLE: {', '.join(failing)} need improvement")
            print(f"  → Continue in advisory/shadow mode")
            print(f"  → ROAM: Track as 'autocommit-readiness' risk")

        failing_checks = [name for name, ok, _ in grad_checks if not ok]
        if total_sys_err > max_sys_err or total_aborts > max_abort_grad:
            grad_status = "BLOCKED"
            grad_reason = "System errors or aborts detected"
        elif grad_eligible:
            grad_status = "READY"
            grad_reason = "All graduation criteria met"
        else:
            grad_status = "NEEDS_STABILITY"
            grad_reason = (
                "Failed: " + ", ".join(failing_checks)
                if failing_checks
                else "Stability or OK rate below threshold"
            )

        run_key = os.environ.get("AF_CORRELATION_ID") or os.environ.get("AF_RUN_ID") or "unknown"
        per_run_autofix = (float(total_autofix_adv) / float(len(ok_runs))) if ok_runs else 0.0

        wsjf_present: Optional[bool] = False
        wsjf_recent: Optional[bool] = None
        wsjf_items_count: Optional[int] = None
        wsjf_age_hours: Optional[float] = None
        try:
            wsjf_path = os.path.join(project_root, ".goalie", "wsjf_scores.jsonl")
            if os.path.exists(wsjf_path) and os.path.getsize(wsjf_path) > 0:
                wsjf_present = True
                cnt = 0
                with open(wsjf_path) as f:
                    for line in f:
                        if line.strip():
                            cnt += 1
                wsjf_items_count = cnt
                age_sec = (
                    datetime.now(timezone.utc)
                    - datetime.fromtimestamp(os.path.getmtime(wsjf_path), timezone.utc)
                ).total_seconds()
                wsjf_age_hours = round(age_sec / 3600.0, 2)
                wsjf_recent = wsjf_age_hours <= 72
            else:
                wsjf_present = False
                wsjf_recent = False
        except Exception:
            wsjf_present = None
            wsjf_recent = None
            wsjf_items_count = None
            wsjf_age_hours = None
        doc = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "source": "prod_cycle_swarm_runner",
            "run_id": run_key,
            "af_env": os.environ.get("AF_ENV", "local"),
            "graduation": {
                "assessment": grad_status,
                "ready_for_graduation": grad_status == "READY",
                "reason": grad_reason,
                "ok_rate": round(ok_rate * 100.0, 1),
                "min_ok_rate": round(min_ok_rate_grad * 100.0, 1),
                "stability_score": round(avg_stability, 1),
                "min_stability_score": round(min_stability, 1),
                "system_state_errors": int(total_sys_err),
                "max_sys_state_err": int(max_sys_err),
                "aborts": int(total_aborts),
                "max_abort": int(max_abort_grad),
                "autofix_adv_per_cycle": round(per_run_autofix, 2),
                "max_autofix_adv_per_cycle": int(max_autofix_adv),
                "shadow_cycles": None,
                "shadow_cycles_required": int(shadow_cycles_req),
                "retro_approval_required": bool(retro_required),
                "wsjf_present": wsjf_present,
                "wsjf_recent": wsjf_recent,
                "wsjf_items_count": wsjf_items_count,
                "wsjf_age_hours": wsjf_age_hours,
            },
        }
        _write_graduation_artifacts(project_root, run_key, doc)

        # Verification loop metrics (Assessor Circle attention)
        insights_generated = len(ok_runs)
        insights_verified = sum(1 for r in ok_runs if r.summary.get("health_checkpoint_passed", True))
        verification_rate = (insights_verified / insights_generated * 100) if insights_generated > 0 else 0
        print(f"\n  VERIFICATION LOOP: {insights_verified}/{insights_generated} verified ({verification_rate:.0f}%)")
        if verification_rate < 100:
            print(f"  → WHO: Assessor Circle | ROAM: Owned")
            print(f"  → CMD: af pattern-stats --pattern health_checkpoint --hours 24")

        # Circle risk-focus (dynamic from circle perspective coverage)
        circle_cov = _scan_circle_perspectives(project_root)
        circles_data = circle_cov.get("circles", {})
        # Build risk list: circles with lowest telemetry but highest depth targets
        risk_items = []
        for circle, data in circles_data.items():
            depth_target = data.get("depth_target", 0)
            events = data.get("event_count", 0)
            lens = data.get("lens", "")
            # Risk = high target but low events
            risk_event_cap = EVIDENCE_CONFIG.get("coverage_factors", {}).get("risk_event_cap", 10)
            risk_score = depth_target - min(events, risk_event_cap)
            risk_items.append((circle.capitalize(), depth_target, events, lens, risk_score))
        # Sort by risk score descending
        risk_items.sort(key=lambda x: x[4], reverse=True)
        print(f"\n  CIRCLE RISK-FOCUS (by gap severity):")
        for circle, target, events, lens, _ in risk_items[:3]:
            status = "⚠️" if events == 0 else "✓"
            print(f"    {circle:<12} Target:{target:<3} Events:{events:<4} {status} {lens}")
        print("=" * 60)

        # Security audit gap scan with 5W+RCA+ROAM
        sec_gaps = _scan_security_audit_gaps(project_root)
        if sec_gaps["sec_audit_count"] > 0 or sec_gaps["cve_count"] > 0:
            print("\n" + "-" * 60)
            print("SECURITY AUDIT GAPS (5W+RCA+ROAM)")
            print("-" * 60)
            if sec_gaps["sec_audit_count"] > 0:
                print(f"  SEC-AUDIT issues: {sec_gaps['sec_audit_count']}")
                for item in sec_gaps["sec_audit_items"][:5]:
                    print(f"    - {item}")
                print(f"  → WHO: Assessor Circle | WHAT: Security verification gap")
                print(f"  → WHY: Unverified security controls | ROAM: Owned")
                print(f"  → CMD: af goalie-gaps --circle assessor --filter SEC-AUDIT")
            if sec_gaps["cve_count"] > 0:
                print(f"  CVE issues: {sec_gaps['cve_count']}")
                for item in sec_gaps["cve_items"][:5]:
                    print(f"    - {item}")
                print(f"  → WHO: Seeker Circle | WHAT: Dependency vulnerability")
                print(f"  → RCA: Outdated deps | ROAM: Mitigated (patch pending)")
                print(f"  → CMD: npm audit fix --force OR pip-audit --fix")

        # Depth ladder phase tracking
        if sec_gaps["phase_count"] > 0:
            print("\n" + "-" * 60)
            print("DEPTH LADDER PHASES")
            print("-" * 60)
            for phase in sec_gaps["phase_items"][:10]:
                print(f"  - {phase}")

        # Circle perspective coverage with actionable ROAM
        circle_cov = _scan_circle_perspectives(project_root)
        print("\n" + "-" * 60)
        print("CIRCLE PERSPECTIVE COVERAGE (Decision Lens Telemetry)")
        print("-" * 60)
        print(f"  Backlog coverage: {circle_cov['circle_coverage_pct']}%")
        print(f"  Telemetry coverage: {circle_cov['telemetry_coverage_pct']}%")
        print(f"\n  {'Circle':<12} {'Backlog':<8} {'Events':<8} {'Depth%':<8} {'Target':<8} Lens")
        print(f"  {'-'*12} {'-'*8} {'-'*8} {'-'*8} {'-'*8} {'-'*20}")

        # Track gaps for actionable recommendations
        gaps_by_priority = []
        for circle, data in circle_cov["circles"].items():
            status = "✓" if data["has_backlog"] else "✗"
            events = data["event_count"]
            depth_pct = data.get("depth_score", 0)
            depth_target = data.get("depth_target", 0)
            print(f"  {circle:<12} {status:<8} {events:<8} {depth_pct:<8.1f} {depth_target:<8} {data['lens']}")

            # Identify actionable gaps
            if not data["has_backlog"] or events == 0:
                gaps_by_priority.append({
                    "circle": circle,
                    "lens": data["lens"],
                    "depth_target": depth_target,
                    "has_backlog": data["has_backlog"],
                    "events": events,
                    "roam": "Owned" if depth_target >= EVIDENCE_CONFIG.get("roam_owned_threshold", 10) else "Accepted"
                })

        # Print actionable recommendations
        if gaps_by_priority:
            print(f"\n  ACTIONABLE GAPS ({len(gaps_by_priority)} circles need attention):")
            # Sort by depth_target (higher = more critical)
            gaps_by_priority.sort(key=lambda x: x["depth_target"], reverse=True)
            for gap in gaps_by_priority[:3]:
                roam = gap["roam"]
                issue = "missing backlog" if not gap["has_backlog"] else "no telemetry"
                print(f"  → {gap['circle'].upper()}: {issue} | Target: {gap['depth_target']} | ROAM: {roam}")
                print(f"    CMD: af pattern-stats --circle {gap['circle']} --hours 24")
        print("=" * 60)

        # Intent coverage (pattern hit %)
        intent_cov = _compute_intent_coverage(project_root)
        print("\n" + "-" * 60)
        print("INTENT COVERAGE (Pattern Hit %)")
        print("-" * 60)
        status = "✓" if intent_cov["meets_threshold"] else "✗"
        print(f"  {status} Pattern hit: {intent_cov['hit_pct']}% (min: {intent_cov['min_hit_pct']}%)")
        print(f"  Patterns: {intent_cov['patterns_hit']}/{intent_cov['patterns_total']} required")
        for pattern, hits in intent_cov["pattern_hits"].items():
            p_status = "✓" if hits > 0 else "✗"
            print(f"    {p_status} {pattern}: {hits} events")
        if not intent_cov["meets_threshold"]:
            print(f"\n  → ROAM: Track 'intent-coverage-gap' as Owned")
            print(f"  → CMD: af pattern-coverage --required-patterns")
        print("=" * 60)

    # JSON Output for machine readability
    if args.json:
        intent_cov = _compute_intent_coverage(project_root)
        json_output = {
            "ok": all(r.ok for r in results),
            "run_count": len(results),
            "table_path": out_path,
            "failed_runs": [r.run_id for r in results if not r.ok],
            "winner_grade": winner_grade if winner_grade_enabled else None,
            "intent_coverage": intent_cov,
            "results_summary": [
                {
                    "run_id": r.run_id,
                    "phase": r.phase,
                    "profile": r.profile,
                    "ok": r.ok,
                    "duration_h": r.summary.get("total_duration_hours"),
                    "economic_compounding": r.summary.get("revenue_per_hour"),
                    "energy_cost_usd": r.summary.get("total_energy_cost_usd"),
                    "profit_dividend_usd": r.summary.get("total_profit_dividend_usd"),
                    "pattern_hit_pct": r.summary.get("intent_coverage_pct"),
                    "maturity_coverage": r.summary.get("tier_depth_cov_pct"),
                    "tier_backlog_cov_pct": r.summary.get("tier_backlog_cov_pct"),
                    "tier_telemetry_cov_pct": r.summary.get("tier_telemetry_cov_pct"),
                    "observability_gaps": len((r.summary.get("observability_gaps") or {}).get("gaps", [])) if r.summary.get("observability_gaps") else None,
                    "prod_cycle_qualification": winner_grade if winner_grade_enabled else None,
                }
                for r in results
            ],
            "security_audit": _scan_security_audit_gaps(project_root),
            "circle_perspectives": _scan_circle_perspectives(project_root),
        }
        print(json.dumps(json_output, indent=2, default=str))
        return 0 if json_output["ok"] else 1

    # Non-zero exit if any run failed
    if any(not r.ok for r in results):
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
