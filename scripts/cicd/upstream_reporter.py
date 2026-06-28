#!/usr/bin/env python3
"""Upstream Repository Upgrade Validation — Reporter.

Generates structured JSON evidence artefacts and updates the SHA cache.
New vs. previous behaviour:

  • DLQ write: appends a JSONL entry to dlq_roam_mapping.yaml-configured dlq_path
    for every FAIL result that has notify_on_fail=true.
  • ROAM trigger: calls lib/dlq_roam_apply.py for repos that declare roam_risk_id.
  • UPSTREAM_ACTIONS lane annotation: tags each result with its lane from
    config/cicd/UPSTREAM_ACTIONS.yaml when the action id matches repo id.
  • --json / json_output=True: prints the final summary dict as JSON to stdout
    in addition to writing the evidence file.
  • Retry count surfaced in the per-repo evidence record.
"""

from __future__ import annotations

import datetime
import json
import subprocess
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional

# Shared CICD receipt envelope (monolith deconstruct foundation)
LIB_DIR = Path(__file__).resolve().parent / "lib"
if str(LIB_DIR) not in sys.path:
    sys.path.insert(0, str(LIB_DIR))
import receipt


# ─────────────────────────────────────────────────────────────────────────────
# DLQ helpers
# ─────────────────────────────────────────────────────────────────────────────

def _dlq_path(project_root: Path) -> Optional[Path]:
    """Resolve the DLQ path from config/cicd/dlq_roam_mapping.yaml, or use default."""
    mapping_file = project_root / "config" / "cicd" / "dlq_roam_mapping.yaml"
    if mapping_file.exists():
        try:
            # minimal inline YAML parse — avoid hard-dep on pyyaml
            for line in mapping_file.read_text(encoding="utf-8").splitlines():
                line = line.strip()
                if line.startswith("dlq_path:"):
                    raw = line.split(":", 1)[1].strip()
                    return project_root / raw
        except Exception:  # noqa: BLE001
            pass
    return project_root / ".goalie" / "evidence" / "learning" / "dlq.jsonl"


def _write_dlq_entry(dlq_path: Path, repo_id: str, run_id: str, status: str,
                     roam_risk_id: Optional[str]) -> None:
    """Append a single DLQ JSONL line for a failed upstream check."""
    dlq_path.parent.mkdir(parents=True, exist_ok=True)
    entry = {
        "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "source": "upstream_upgrade_engine",
        "run_id": run_id,
        "repository_id": repo_id,
        "status": status,
        "roam_risk_id": roam_risk_id,
        "category": "upstream_fail",
    }
    with open(dlq_path, "a", encoding="utf-8") as fh:
        fh.write(json.dumps(entry) + "\n")


def _trigger_roam(project_root: Path, roam_risk_id: str, run_id: str) -> None:
    """Invoke dlq_roam_apply.py to re-open the ROAM risk entry."""
    script = project_root / "scripts" / "cicd" / "lib" / "dlq_roam_apply.py"
    if not script.exists():
        print(f"  ⚠️  dlq_roam_apply.py not found — ROAM trigger skipped for {roam_risk_id}")
        return
    try:
        proc = subprocess.run(
            ["python3", str(script), "upstream_fail", run_id, str(project_root)],
            capture_output=True, text=True, timeout=15,
        )
        if proc.returncode == 0:
            print(f"  🔴 ROAM triggered: {roam_risk_id} re-opened")
        else:
            print(f"  ⚠️  ROAM trigger failed (exit {proc.returncode}): {proc.stderr.strip()}")
    except Exception as exc:  # noqa: BLE001
        print(f"  ⚠️  ROAM trigger exception: {exc}")


# ─────────────────────────────────────────────────────────────────────────────
# UPSTREAM_ACTIONS lane lookup
# ─────────────────────────────────────────────────────────────────────────────

def _load_lane_map(project_root: Path) -> Dict[str, str]:
    """Return {action_id → lane} from UPSTREAM_ACTIONS.yaml (best-effort)."""
    path = project_root / "config" / "cicd" / "UPSTREAM_ACTIONS.yaml"
    if not path.exists():
        return {}
    lane_map: Dict[str, str] = {}
    current_id: Optional[str] = None
    try:
        for line in path.read_text(encoding="utf-8").splitlines():
            s = line.strip()
            if s.startswith("- id:"):
                current_id = s.split(":", 1)[1].strip()
            elif s.startswith("lane:") and current_id:
                lane_map[current_id] = s.split(":", 1)[1].strip()
                current_id = None
    except Exception:  # noqa: BLE001
        pass
    return lane_map


# ─────────────────────────────────────────────────────────────────────────────
# Error taxonomy + throughput helpers
# ─────────────────────────────────────────────────────────────────────────────

def _classify_failure(log: Optional[str], status: str) -> str:
    """Classify a non-PASS result into a failure category."""
    if status == "PASS":
        return "none"
    text = (log or "").lower()
    # Git clone failure is a specific transport failure; check first
    if "git clone failed" in text or "clone failed" in text:
        return "clone_failed"
    # HTTP status codes (specific before generic)
    if "403" in text or "forbidden" in text:
        return "forbidden"
    if "500" in text or "internal server error" in text:
        return "server_error"
    if "502" in text or "bad gateway" in text:
        return "bad_gateway"
    if "503" in text or "service unavailable" in text:
        return "service_unavailable"
    if "504" in text or "gateway timeout" in text:
        return "gateway_timeout"
    if "not found" in text or "404" in text or "enotfound" in text:
        return "not_found"
    if "timeout" in text or "[timeout" in text:
        return "timeout"
    if "[exception" in text or "traceback" in text:
        return "exception"
    if "permission denied" in text or "eacces" in text:
        return "permission_denied"
    return "command_failed"


def _eta_seconds(queue_depth: int, throughput_per_hour: float) -> float:
    """Estimate seconds to clear queue at current throughput."""
    if throughput_per_hour <= 0:
        return float("inf")
    return round(queue_depth / throughput_per_hour * 3600.0, 2)


# ─────────────────────────────────────────────────────────────────────────────
# Main reporter
# ─────────────────────────────────────────────────────────────────────────────

def save_report_and_cache(
    results: List[Dict[str, Any]],
    cache: Dict[str, str],
    project_root: Path,
    timestamp: str,
    *,
    run_id: str,
    registry_repos: Optional[List[Dict[str, Any]]] = None,
    json_output: bool = False,
) -> bool:
    """Save evidence artefact, update SHA cache, emit DLQ/ROAM signals on failure.

    Args:
        results:          Per-repo result dicts from upstream_runner.
        cache:            Existing SHA cache (mutated in-place, then persisted).
        project_root:     Repo root Path.
        timestamp:        ISO-format run timestamp string.
        run_id:           Unique run identifier (used in file names and DLQ).
        registry_repos:   Full registry list for notify_on_fail / roam_risk_id lookup.
        json_output:      If True, print summary JSON to stdout.

    Returns:
        True if all active (non-skipped) results passed.
    """
    evidence_dir = project_root / ".goalie" / "evidence" / "upgrades"
    evidence_dir.mkdir(parents=True, exist_ok=True)

    # Build a lookup for registry metadata
    repo_meta: Dict[str, Dict[str, Any]] = {}
    if registry_repos:
        for r in registry_repos:
            repo_meta[r["id"]] = r

    lane_map = _load_lane_map(project_root)
    dlq_p = _dlq_path(project_root)

    all_passed = True
    total_duration = 0.0
    skipped_count = 0
    active_count = 0
    active_passed = 0
    new_cache = dict(cache)

    # ── Per-result processing ────────────────────────────────────────────────
    enriched_results: List[Dict[str, Any]] = []
    for res in results:
        repo_id = res["repository_id"]
        status = res["integration_status"]
        sha = res["latest_commit_sha"]
        total_duration += res.get("duration_seconds", 0.0)
        is_skipped = res.get("skipped", False)

        if is_skipped:
            skipped_count += 1
        else:
            active_count += 1
            if status == "PASS":
                active_passed += 1

        meta = repo_meta.get(repo_id, {})
        roam_risk_id = meta.get("roam_risk_id")
        notify = meta.get("notify_on_fail", False)

        # Annotate with lane from UPSTREAM_ACTIONS
        lane = lane_map.get(repo_id, meta.get("lane", None))

        failure_category = _classify_failure(res.get("log"), status)
        enriched = {**res, "lane": lane, "failure_category": failure_category}
        enriched_results.append(enriched)

        if status == "PASS":
            if sha and sha not in ("offline_or_cached_sha", "unknown"):
                new_cache[repo_id] = sha
        else:
            all_passed = False
            if not is_skipped and notify:
                _write_dlq_entry(dlq_p, repo_id, run_id, status, roam_risk_id)
                if roam_risk_id:
                    _trigger_roam(project_root, roam_risk_id, run_id)

    # ── Write SHA cache ──────────────────────────────────────────────────────
    cache_file = evidence_dir / "last_known_heads.json"
    try:
        cache_file.write_text(json.dumps(new_cache, indent=2) + "\n", encoding="utf-8")
        print(f"✅ SHA cache updated: {cache_file}")
    except Exception as exc:  # noqa: BLE001
        print(f"⚠️  Warning: Failed to write SHA cache: {exc}")

    # ── Write timestamped evidence artefact ──────────────────────────────────
    report_file = evidence_dir / f"upgrades_report_{timestamp}.json"
    throughput = 3600.0 / max(1.0, total_duration)
    success_rate = round(active_passed / max(1, active_count), 4)
    queue_depth = active_count - active_passed
    eta_seconds = _eta_seconds(queue_depth, throughput)
    summary = {
        "status": "PASS" if all_passed else "FAIL",
        "timestamp": timestamp,
        "run_id": run_id,
        "total_duration_seconds": round(total_duration, 2),
        "skipped_count": skipped_count,
        "active_count": active_count,
        "active_passed": active_passed,
        "success_rate": success_rate,
        "queue_depth": queue_depth,
        "throughput_deliveries_per_hour": round(throughput, 2),
        "eta_seconds": eta_seconds,
        "results": enriched_results,
    }
    try:
        report_file.write_text(json.dumps(summary, indent=2) + "\n", encoding="utf-8")
        print(f"🎉 Evidence artefact: {report_file}")
    except Exception as exc:  # noqa: BLE001
        print(f"❌ Failed to write evidence artefact: {exc}")

    # ── Standard CICD receipt v1 artefact (monolith deconstruct) ────────────────
    signals = []
    for res in enriched_results:
        signals.append({
            "name": f"repo:{res['repository_id']}",
            "ok": res["integration_status"] == "PASS" or res.get("skipped", False),
            "required": not res.get("skipped", False),
            "details": {
                "status": res["integration_status"],
                "skipped": res.get("skipped", False),
                "failure_category": res.get("failure_category"),
                "lane": res.get("lane"),
                "app_store_readiness": res.get("app_store_readiness", "skipped"),
            },
        })
    # DoR/DoD acceptability metrics
    dor_results = [r.get("dor_status", "skipped") for r in enriched_results]
    dor_passed = all(d in {"pass", "skipped"} for d in dor_results)
    dod_passed = all_passed
    receipt_data = receipt.make(
        context="upstream",
        status="PASS" if all_passed else "FAIL",
        command=f"upstream_upgrade_engine run_id={run_id}",
        exit_code=0 if all_passed else 1,
        duration_seconds=round(total_duration, 2),
        signals=signals,
        errors=[f"{r['repository_id']}: {r['integration_status']}" for r in enriched_results if r["integration_status"] != "PASS" and not r.get("skipped", False)],
        warnings=[f"{r['repository_id']}: skipped" for r in enriched_results if r.get("skipped", False)],
        meta={
            "run_id": run_id,
            "active_count": active_count,
            "active_passed": active_passed,
            "queue_depth": queue_depth,
            "throughput_deliveries_per_hour": round(throughput, 2),
            "eta_seconds": eta_seconds,
            "dor_passed": dor_passed,
            "dod_passed": dod_passed,
        },
    )
    receipt_file = evidence_dir / f"receipt_{timestamp}.json"
    try:
        receipt_file.write_text(json.dumps(receipt_data, indent=2) + "\n", encoding="utf-8")
        print(f"🧾 CICD receipt: {receipt_file}")

        # Canonical DoD receipt symlink
        latest_receipt_dir = project_root / ".goalie" / "evidence"
        latest_receipt_dir.mkdir(parents=True, exist_ok=True)
        latest_receipt = latest_receipt_dir / "last_upstream_receipt.json"
        latest_receipt.write_text(json.dumps(receipt_data, indent=2) + "\n", encoding="utf-8")
        print(f"🧾 CICD receipt: {latest_receipt}")
    except Exception as exc:  # noqa: BLE001
        print(f"⚠️  Failed to write CICD receipt: {exc}")

    # ── Console summary ──────────────────────────────────────────────────────
    print("\n" + "=" * 60)
    print(f"📈 Upstream Validation Summary  [{timestamp}]")
    print(f"   Overall:  {'PASS' if all_passed else 'FAIL'}")
    print(f"   Duration: {round(total_duration, 2)}s")
    print(f"   Skipped (cached): {skipped_count}")
    print(f"   Active: {active_passed}/{active_count}  (success_rate={success_rate:.2%})")
    print(f"   Queue depth: {queue_depth}  ETA: {eta_seconds}s")
    print(f"   Throughput: {round(throughput, 2)} deliveries/hour")
    for res in enriched_results:
        flag = " (skipped)" if res.get("skipped") else ""
        lane_tag = f"  [{res['lane']}]" if res.get("lane") else ""
        attempts = res.get("attempts", 0)
        attempt_tag = f"  attempts={attempts}" if attempts > 1 else ""
        cat_tag = f"  cat={res['failure_category']}" if res.get("failure_category") and res["failure_category"] != "none" else ""
        print(f"   - {res['repository_id']}: {res['integration_status']}"
              f"{flag}{lane_tag}{attempt_tag}{cat_tag}")
    print("=" * 60)

    if json_output:
        print(json.dumps(summary, indent=2))

    return all_passed
