#!/usr/bin/env python3
"""
Graduated Autocommit Assessment

Implements reflexive graduation triggers for autocommit capabilities.
Reads evidence from learning_evidence.jsonl and compounding_benefits.jsonl
to assess if the system is ready for graduated autocommit permissions.

Safety Gates:
- Green streak: Consecutive passing cycles
- Stability score: System reliability percentage
- OK rate: Success rate minimum
- System state errors: Must be zero
- Aborts: Must be zero
- Shadow cycles: Trust-building period
"""

import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Optional, Set, Tuple

# Configuration defaults
DEFAULT_CONFIG = {
    "graduation": {
        "green_streak_required": 10,
        "max_autofix_adv_per_cycle": 3,
        "min_stability_score": 80,
        "min_ok_rate": 90,
        "max_sys_state_err": 0,
        "max_abort": 0,
        "shadow_cycles_before_recommend": 5,
        "retro_approval_required": True
    }
}

def _current_run_id() -> str:
    return os.environ.get("AF_CORRELATION_ID") or os.environ.get("AF_RUN_ID") or "unknown"


def _load_latest_graduation_for_run(run_id: str) -> Optional[Dict[str, object]]:
    path = Path(".goalie/graduation_latest.json")
    if not path.exists():
        return None
    try:
        doc = json.load(open(path))
    except Exception:
        return None
    if not isinstance(doc, dict):
        return None
    if (doc.get("run_id") or "") != run_id:
        return None
    return doc


def _write_graduation_artifacts(run_id: str, payload: Dict[str, object]) -> None:
    goalie_dir = Path(".goalie")
    try:
        goalie_dir.mkdir(parents=True, exist_ok=True)
    except Exception:
        return

    latest_path = goalie_dir / "graduation_latest.json"
    scoped_latest_path = goalie_dir / f"graduation_latest_{run_id}.json"
    history_path = goalie_dir / "graduation_history.jsonl"

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


def load_config() -> Dict:
    """Load graduation configuration from evidence_config.json or use defaults."""
    config_path = Path("config/evidence_config.json")
    if config_path.exists():
        try:
            with open(config_path) as f:
                config = json.load(f)
                if "graduation" in config:
                    return config
        except Exception as e:
            print(
                f"Warning: Could not load config from {config_path}: {e}",
                file=sys.stderr,
            )
    return DEFAULT_CONFIG


def load_config_from_path(config_path: Optional[str]) -> Dict:
    """Load configuration from an explicit path if provided."""
    if not config_path:
        return load_config()

    path = Path(config_path)
    if not path.exists():
        print(
            f"Warning: Config path not found: {path}",
            file=sys.stderr,
        )
        return load_config()

    try:
        with open(path) as f:
            config = json.load(f)
            if "graduation" in config:
                return config
    except Exception as e:
        print(
            f"Warning: Could not load config from {path}: {e}",
            file=sys.stderr,
        )
    return load_config()


def load_learning_evidence() -> List[Dict]:
    """Load learning evidence from .goalie/learning_evidence.jsonl"""
    candidate_paths = [
        Path(".goalie/prod_learning_evidence.jsonl"),
        Path(".goalie/learning_evidence.jsonl"),
    ]

    evidence: List[Dict] = []
    seen: Set[str] = set()
    primary = candidate_paths[0]
    secondary = candidate_paths[1]

    for evidence_path in candidate_paths:
        if not evidence_path.exists():
            continue

        with open(evidence_path) as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue

                try:
                    obj = json.loads(line)
                except json.JSONDecodeError:
                    continue

                key = json.dumps(obj, sort_keys=True)
                if key in seen:
                    continue

                seen.add(key)
                evidence.append(obj)

    # Backfill secondary if empty but primary has data
    try:
        if primary.exists() and (
            not secondary.exists() or secondary.stat().st_size == 0
        ):
            if evidence:
                secondary.parent.mkdir(parents=True, exist_ok=True)
                with open(secondary, "w") as f:
                    for obj in evidence:
                        f.write(json.dumps(obj) + "\n")
    except Exception:
        pass

    return evidence


def load_compounding_benefits() -> List[Dict]:
    """Load compounding benefits from .goalie/compounding_benefits.jsonl"""
    benefits_path = Path(".goalie/compounding_benefits.jsonl")

    benefits: List[Dict] = []
    if benefits_path.exists():
        with open(benefits_path) as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    benefits.append(json.loads(line))
                except json.JSONDecodeError:
                    continue

    if benefits:
        return benefits

    # Fallback: .goalie/compound_history.jsonl is what the system currently appends
    history_path = Path(".goalie/compound_history.jsonl")
    if not history_path.exists():
        return []

    transformed: List[Dict] = []
    with open(history_path) as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                entry = json.loads(line)
            except json.JSONDecodeError:
                continue

            comp = entry.get("compounding", {}) or {}
            maturity_score = float(comp.get("maturity_score", 0) or 0)
            success = maturity_score >= 70.0
            total_multiplier = float(comp.get("total_multiplier", 0) or 0)
            transformed.append({
                "timestamp": entry.get("timestamp"),
                "status": "ok" if success else "fail",
                "success": success,
                "maturity_score": maturity_score,
                "total_multiplier": total_multiplier,
                "mode": entry.get("mode"),
            })

    # Backfill compounding_benefits.jsonl so downstream tooling can read it
    try:
        if transformed:
            benefits_path.parent.mkdir(parents=True, exist_ok=True)
            with open(benefits_path, "w") as f:
                for obj in transformed:
                    f.write(json.dumps(obj) + "\n")
    except Exception:
        pass

    return transformed


def calculate_green_streak(evidence: List[Dict]) -> int:
    """
    Calculate consecutive green (passing) cycles.
    A cycle is green if maturity_score >= 70 and no critical issues.
    """
    if not evidence:
        return 0
    
    streak = 0
    for entry in reversed(evidence):
        maturity = entry.get("maturity_score", 0)
        has_critical_issues = entry.get("critical_issues", 0) > 0
        
        if maturity >= 70 and not has_critical_issues:
            streak += 1
        else:
            break
    
    return streak


def calculate_stability_score(evidence: List[Dict]) -> float:
    """
    Calculate stability score as percentage of successful cycles.
    Considers last 20 cycles or all if fewer than 20.
    """
    if not evidence:
        return 0.0
    
    recent_evidence = evidence[-20:]  # Last 20 cycles
    successful = sum(1 for e in recent_evidence if e.get("maturity_score", 0) >= 70)
    return (successful / len(recent_evidence)) * 100


def calculate_ok_rate(benefits: List[Dict]) -> float:
    """
    Calculate OK rate from compounding benefits.
    Looks for success indicators in recent cycles.
    """
    if not benefits:
        return 0.0
    
    recent_benefits = benefits[-20:]  # Last 20 cycles
    successful = sum(1 for b in recent_benefits if b.get("status") == "ok" or b.get("success", False))
    return (successful / len(recent_benefits)) * 100 if recent_benefits else 0.0


def count_system_errors(evidence: List[Dict]) -> int:
    """Count system state errors in recent cycles."""
    recent_evidence = evidence[-10:]  # Last 10 cycles
    return sum(e.get("system_state_errors", 0) for e in recent_evidence)


def count_aborts(evidence: List[Dict]) -> int:
    """Count aborts in recent cycles."""
    recent_evidence = evidence[-10:]  # Last 10 cycles
    return sum(e.get("aborts", 0) for e in recent_evidence)


def count_autofix_advisories(evidence: List[Dict]) -> int:
    """Count autofix advisories per cycle (average over recent cycles)."""
    recent_evidence = evidence[-10:]  # Last 10 cycles
    if not recent_evidence:
        return 0
    total_advisories = sum(e.get("autofix_advisories", 0) for e in recent_evidence)
    return int(total_advisories / len(recent_evidence))


def assess_graduation(
    evidence: List[Dict],
    benefits: List[Dict],
    config: Dict
) -> Tuple[str, Dict]:
    """
    Assess graduation readiness based on evidence and configuration.
    
    Returns:
        status: READY, BUILDING_TRUST, NEEDS_STABILITY, or BLOCKED
        metrics: Dictionary of assessment metrics
    """
    grad_config = config["graduation"]
    
    min_stability_score = float(grad_config.get("min_stability_score", 0) or 0)
    if 0 < min_stability_score <= 1:
        min_stability_score *= 100
    min_ok_rate = float(grad_config.get("min_ok_rate", 0) or 0)
    if 0 < min_ok_rate <= 1:
        min_ok_rate *= 100

    # Calculate metrics
    green_streak = calculate_green_streak(evidence)
    sys_state_errors = count_system_errors(evidence)
    aborts = count_aborts(evidence)
    autofix_adv = count_autofix_advisories(evidence)

    stability_source: Optional[str] = None
    ok_rate_source: Optional[str] = None
    stability_score_val: Optional[float] = None
    ok_rate_val: Optional[float] = None

    # Primary telemetry: compounding benefits (status/success)
    if benefits:
        ok_rate_val = calculate_ok_rate(benefits)
        stability_score_val = ok_rate_val
        ok_rate_source = "compounding_benefits"
        stability_source = "compounding_benefits"
    else:
        # Secondary telemetry: learning evidence maturity_score (if present)
        maturity_present = any(
            isinstance(entry, dict) and ("maturity_score" in entry)
            for entry in evidence
        )
        if maturity_present:
            stability_score_val = calculate_stability_score(evidence)
            stability_source = "learning_evidence"

        # Fallback telemetry: site_health snapshots (if present)
        if stability_score_val is None:
            samples: List[Tuple[Optional[float], str]] = []
            for entry in evidence:
                if not isinstance(entry, dict):
                    continue
                sources = entry.get("sources") or {}
                if not isinstance(sources, dict):
                    continue
                site_health = sources.get("site_health") or {}
                if not isinstance(site_health, dict):
                    continue
                hp = site_health.get("health_pct")
                status = str(site_health.get("status") or "")
                if hp is None and not status:
                    continue
                hp_val: Optional[float]
                try:
                    hp_val = float(hp) if hp is not None else None
                except Exception:
                    hp_val = None
                samples.append((hp_val, status))

            if samples:
                recent = samples[-20:]
                ok = 0
                for hp_val, status in recent:
                    status_upper = status.upper()
                    if hp_val is not None and hp_val >= 80 and status_upper not in {"CRITICAL", "DOWN", "FAIL"}:
                        ok += 1
                pct = (ok / len(recent)) * 100 if recent else 0.0
                stability_score_val = pct
                ok_rate_val = pct
                stability_source = "site_health"
                ok_rate_source = "site_health"

    stability_score = round(stability_score_val, 1) if stability_score_val is not None else None
    ok_rate = round(ok_rate_val, 1) if ok_rate_val is not None else None

    wsjf_present: Optional[bool] = False
    wsjf_recent: Optional[bool] = None
    wsjf_items_count: Optional[int] = None
    wsjf_age_hours: Optional[float] = None
    try:
        wsjf_path = Path(".goalie/wsjf_scores.jsonl")
        if wsjf_path.exists() and wsjf_path.stat().st_size > 0:
            wsjf_present = True
            cnt = 0
            with open(wsjf_path) as f:
                for line in f:
                    if line.strip():
                        cnt += 1
            wsjf_items_count = cnt
            age_sec = (
                datetime.now(timezone.utc)
                - datetime.fromtimestamp(wsjf_path.stat().st_mtime, timezone.utc)
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
    
    metrics = {
        "green_streak_count": green_streak,
        "green_streak_required": grad_config["green_streak_required"],
        "stability_score": stability_score,
        "min_stability_score": round(min_stability_score, 1),
        "ok_rate": ok_rate,
        "min_ok_rate": round(min_ok_rate, 1),
        "system_state_errors": sys_state_errors,
        "max_sys_state_err": grad_config["max_sys_state_err"],
        "aborts": aborts,
        "max_abort": grad_config["max_abort"],
        "autofix_adv_per_cycle": autofix_adv,
        "max_autofix_adv_per_cycle": grad_config["max_autofix_adv_per_cycle"],
        "shadow_cycles": len(evidence),
        "shadow_cycles_required": grad_config["shadow_cycles_before_recommend"],
        "retro_approval_required": grad_config["retro_approval_required"],
        "stability_source": stability_source,
        "ok_rate_source": ok_rate_source,
        "wsjf_present": wsjf_present,
        "wsjf_recent": wsjf_recent,
        "wsjf_items_count": wsjf_items_count,
        "wsjf_age_hours": wsjf_age_hours,
    }
    
    # Determine status
    if sys_state_errors > grad_config["max_sys_state_err"] or aborts > grad_config["max_abort"]:
        status = "BLOCKED"
        metrics["reason"] = "System errors or aborts detected"
    elif len(evidence) < grad_config["shadow_cycles_before_recommend"]:
        status = "BUILDING_TRUST"
        metrics["reason"] = f"Need {grad_config['shadow_cycles_before_recommend'] - len(evidence)} more shadow cycles"
    elif stability_score is None or ok_rate is None:
        status = "BUILDING_TRUST"
        metrics["reason"] = "Insufficient telemetry for stability/OK rate"
    elif stability_score < min_stability_score or ok_rate < min_ok_rate:
        status = "NEEDS_STABILITY"
        metrics["reason"] = "Stability or OK rate below threshold"
    elif green_streak < grad_config["green_streak_required"]:
        status = "BUILDING_TRUST"
        metrics["reason"] = f"Need {grad_config['green_streak_required'] - green_streak} more green cycles"
    elif autofix_adv > grad_config["max_autofix_adv_per_cycle"]:
        status = "NEEDS_STABILITY"
        metrics["reason"] = "Too many autofix advisories per cycle"
    else:
        status = "READY"
        metrics["reason"] = "All graduation criteria met"
        if grad_config["retro_approval_required"]:
            metrics["next_step"] = "Requires retrospective approval before enabling"
    
    return status, metrics


def format_output(status: str, metrics: Dict, json_mode: bool = False) -> str:
    """Format graduation assessment output."""
    if json_mode:
        return json.dumps({
            "graduation": {
                "assessment": status,
                "ready_for_graduation": status == "READY",
                **metrics
            },
            "timestamp": datetime.now(timezone.utc).isoformat()
        }, indent=2)
    
    # Text output
    lines = []
    lines.append("")
    lines.append("🎓 AUTOCOMMIT GRADUATION ASSESSMENT")
    lines.append("=" * 50)
    
    # Status with emoji
    status_emoji = {
        "READY": "✅",
        "BUILDING_TRUST": "🔨",
        "NEEDS_STABILITY": "⚠️ ",
        "BLOCKED": "🚫"
    }
    lines.append(f"Status: {status_emoji.get(status, '')} {status}")
    lines.append(f"Reason: {metrics.get('reason', 'N/A')}")
    lines.append("")
    
    # Metrics
    lines.append("Metrics:")
    gs_count = metrics.get('green_streak_count')
    gs_req = metrics.get('green_streak_required')
    lines.append(f"  Green Streak: {gs_count if gs_count is not None else 'n/a'}/{gs_req if gs_req is not None else 'n/a'}")

    stability_score = metrics.get('stability_score')
    min_stability_score = metrics.get('min_stability_score')
    ok_rate = metrics.get('ok_rate')
    min_ok_rate = metrics.get('min_ok_rate')

    lines.append(f"  Stability: {stability_score if stability_score is not None else 'n/a'}%/{min_stability_score if min_stability_score is not None else 'n/a'}%")
    lines.append(f"  OK Rate: {ok_rate if ok_rate is not None else 'n/a'}%/{min_ok_rate if min_ok_rate is not None else 'n/a'}%")
    lines.append(f"  System Errors: {metrics.get('system_state_errors', 'n/a')}/{metrics.get('max_sys_state_err', 'n/a')}")
    lines.append(f"  Aborts: {metrics.get('aborts', 'n/a')}/{metrics.get('max_abort', 'n/a')}")
    lines.append(f"  Autofix Adv/Cycle: {metrics.get('autofix_adv_per_cycle', 'n/a')}/{metrics.get('max_autofix_adv_per_cycle', 'n/a')}")
    sc = metrics.get('shadow_cycles')
    scr = metrics.get('shadow_cycles_required')
    lines.append(f"  Shadow Cycles: {sc if sc is not None else 'n/a'}/{scr if scr is not None else 'n/a'}")

    wsjf_present = metrics.get("wsjf_present")
    if wsjf_present is True:
        lines.append(
            f"  WSJF/Backlog: present (items={metrics.get('wsjf_items_count', 'n/a')}, age_hours={metrics.get('wsjf_age_hours', 'n/a')})"
        )
    elif wsjf_present is False:
        lines.append("  WSJF/Backlog: missing (recommend wsjf-replenish)")
        lines.append("    CMD: ./scripts/circles/replenish_all_circles.sh --auto-calc-wsjf")
    else:
        lines.append("  WSJF/Backlog: n/a")
    lines.append("")
    
    if "next_step" in metrics:
        lines.append(f"Next Step: {metrics['next_step']}")
        lines.append("")
    
    return "\n".join(lines)


def main():
    """Main entry point."""
    import argparse
    
    parser = argparse.ArgumentParser(description="Assess autocommit graduation readiness")
    parser.add_argument("--assess", action="store_true", help="Run graduation assessment")
    parser.add_argument("--json", action="store_true", help="Output JSON format")
    parser.add_argument("--config", help="Path to evidence config (default: config/evidence_config.json)")
    parser.add_argument("--force-recompute", action="store_true", help="Ignore cached .goalie/graduation_latest.json for this run")
    
    args = parser.parse_args()
    
    if not args.assess:
        parser.print_help()
        return 1
    
    run_id = _current_run_id()

    if not args.force_recompute:
        cached = _load_latest_graduation_for_run(run_id)
        if cached and isinstance(cached.get("graduation"), dict):
            grad = cached.get("graduation")
            status = str(grad.get("assessment") or "NEEDS_STABILITY")
            metrics = dict(grad)
            metrics.setdefault("source", cached.get("source"))
            metrics.setdefault("run_id", cached.get("run_id"))
            out = format_output(status, metrics, args.json)
            print(out)
            return 0

    # Load configuration
    config = load_config_from_path(args.config)
    
    # Load evidence
    evidence = load_learning_evidence()
    benefits = load_compounding_benefits()
    
    if not evidence and not benefits:
        if args.json:
            print(json.dumps({
                "error": "No evidence found",
                "message": "No learning evidence or compounding benefits found in .goalie/"
            }))
        else:
            print("❌ No evidence found. Run production cycles first.", file=sys.stderr)
        return 1
    
    # Assess graduation
    status, metrics = assess_graduation(evidence, benefits, config)

    metrics["source"] = "autocommit_graduation"
    metrics["run_id"] = run_id

    payload: Dict[str, object] = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "source": "autocommit_graduation",
        "run_id": run_id,
        "af_env": os.environ.get("AF_ENV", "local"),
        "graduation": {
            "assessment": status,
            "ready_for_graduation": status == "READY",
            **metrics,
        },
    }
    _write_graduation_artifacts(run_id, payload)
    
    # Output results
    output = format_output(status, metrics, args.json)
    print(output)
    
    return 0


if __name__ == "__main__":
    sys.exit(main())
