#!/usr/bin/env python3
"""Edge Gateway Configuration Reporter.

Generates structured JSON evidence logs, updates the synchronization cache,
writes DLQ/ROAM signals on failure, and can emit a machine-readable summary.
"""

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


def _dlq_path(project_root: Path) -> Path:
    """Default DLQ path for edge gateway failures."""
    mapping_file = project_root / "config" / "cicd" / "dlq_roam_mapping.yaml"
    if mapping_file.exists():
        try:
            for line in mapping_file.read_text(encoding="utf-8").splitlines():
                line = line.strip()
                if line.startswith("dlq_path:"):
                    raw = line.split(":", 1)[1].strip()
                    return project_root / raw
        except Exception:
            pass
    return project_root / ".goalie" / "evidence" / "edge_gateway" / "dlq.jsonl"


def _write_dlq_entry(dlq_path: Path, fqdn: str, run_id: str, status: str,
                     roam_risk_id: Optional[str]) -> None:
    """Append a single DLQ JSONL line for a failed edge sync check."""
    dlq_path.parent.mkdir(parents=True, exist_ok=True)
    entry = {
        "timestamp": __import__("datetime").datetime.now(__import__("datetime").timezone.utc).isoformat(),
        "source": "edge_gateway_sync_engine",
        "run_id": run_id,
        "fqdn": fqdn,
        "status": status,
        "roam_risk_id": roam_risk_id,
        "category": "edge_sync_fail",
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
            ["python3", str(script), "edge_sync_fail", run_id, str(project_root)],
            capture_output=True, text=True, timeout=15,
        )
        if proc.returncode == 0:
            print(f"  🔴 ROAM triggered: {roam_risk_id} re-opened")
        else:
            print(f"  ⚠️  ROAM trigger failed (exit {proc.returncode}): {proc.stderr.strip()}")
    except Exception as exc:
        print(f"  ⚠️  ROAM trigger exception: {exc}")


def save_edge_report_and_cache(
    results: List[Dict[str, Any]],
    cache: Dict[str, str],
    project_root: Path,
    timestamp: str,
    run_id: str = "",
    fqdn_metadata: Optional[Dict[str, Dict[str, Any]]] = None,
    json_output: bool = False,
) -> bool:
    """Save the Edge validation run report and update the successfully verified cache.

    Args:
        results: Per-FQDN result dicts from edge_runner.
        cache: Existing last-known-state cache.
        project_root: Repo root Path.
        timestamp: ISO-format run timestamp string.
        run_id: Unique run identifier (used in DLQ/ROAM and file names).
        fqdn_metadata: Registry metadata for notify_on_fail / roam_risk_id lookup.
        json_output: If True, print summary JSON to stdout.

    Returns:
        True if all active (non-skipped) results passed.
    """
    evidence_dir = project_root / ".goalie" / "evidence" / "edge_gateway"
    evidence_dir.mkdir(parents=True, exist_ok=True)

    dlq_p = _dlq_path(project_root)
    meta = fqdn_metadata or {}

    new_cache = dict(cache)
    all_passed = True
    total_duration = 0.0
    skipped_count = 0
    roam_signals = []

    for res in results:
        fqdn = res["fqdn"]
        status = res["status"]
        live_ip = res["resolved_ip"]
        total_duration += res.get("duration_seconds", 0.0)
        
        if res.get("skipped", False):
            skipped_count += 1

        if status == "PASS":
            if live_ip and live_ip != "offline_or_unresolved":
                new_cache[fqdn] = live_ip
        else:
            all_passed = False
            domain_meta = meta.get(fqdn, {})
            roam_risk_id = domain_meta.get("roam_risk_id")
            notify = domain_meta.get("notify_on_fail", False)
            if notify:
                _write_dlq_entry(dlq_p, fqdn, run_id, status, roam_risk_id)
                if roam_risk_id:
                    _trigger_roam(project_root, roam_risk_id, run_id)
                    roam_signals.append({
                        "roam_risk_id": roam_risk_id,
                        "fqdn": fqdn,
                        "run_id": run_id,
                        "timestamp": timestamp,
                    })

    # Calculate hash of edge_gateway.cfg for caching and reporting
    cfg_file = project_root / "src" / "proxies" / "edge_gateway.cfg"
    cfg_hash = "unknown"
    if cfg_file.exists():
        try:
            import hashlib
            cfg_hash = hashlib.sha256(cfg_file.read_bytes()).hexdigest()
        except Exception:
            pass

    if all_passed and cfg_hash != "unknown":
        new_cache["_cfg_hash"] = cfg_hash

    # Save cache file
    cache_file = evidence_dir / "last_known_state.json"
    try:
        with open(cache_file, "w", encoding="utf-8") as f:
            json.dump(new_cache, f, indent=2)
            f.write("\n")
        print(f"✅ Edge cache updated: {cache_file}")
    except Exception as e:
        print(f"⚠️ Warning: Failed to write edge cache: {e}")

    violations_count = sum(1 for res in results if res.get("status") == "FAIL")
    throughput = 3600.0 / max(1.0, total_duration)

    # Write detailed report
    report_file = evidence_dir / f"edge_report_{timestamp}.json"
    final_output = {
        "gate": "deploy-edge-cfg",
        "status": "PASS" if all_passed else "FAIL",
        "timestamp": timestamp,
        "run_id": run_id,
        "hash": cfg_hash,
        "violations": violations_count,
        "total_duration_seconds": round(total_duration, 2),
        "throughput_deliveries_per_hour": round(throughput, 2),
        "skipped_count": skipped_count,
        "results": results
    }

    try:
        with open(report_file, "w", encoding="utf-8") as f:
            json.dump(final_output, f, indent=2)
            f.write("\n")
        print(f"🎉 Edge Report saved: {report_file}")

        # Symlink as last_edge_cfg_deploy.json to keep DoD gate compatible
        last_cfg_link = project_root / ".goalie" / "evidence" / "last_edge_cfg_deploy.json"
        with open(last_cfg_link, "w", encoding="utf-8") as f:
            json.dump(final_output, f, indent=2)
            f.write("\n")

        # Symlink as last_edge_sync.json (new canonical edge-sync DoD artefact)
        last_sync_link = project_root / ".goalie" / "evidence" / "last_edge_sync.json"
        with open(last_sync_link, "w", encoding="utf-8") as f:
            json.dump(final_output, f, indent=2)
            f.write("\n")

        # Standard CICD receipt v1 (monolith deconstruct)
        signals = []
        for res in results:
            status = res.get("status", "FAIL")
            signals.append({
                "name": f"edge:{res['fqdn']}",
                "ok": status == "PASS" or res.get("skipped", False),
                "required": not res.get("skipped", False),
                "details": {
                    "status": status,
                    "resolved_ip": res.get("resolved_ip", ""),
                    "skipped": res.get("skipped", False),
                },
            })
        receipt_data = receipt.make(
            context="edge",
            status="PASS" if all_passed else "FAIL",
            command=f"edge_gateway_sync_engine run_id={run_id}",
            exit_code=0 if all_passed else 1,
            duration_seconds=round(total_duration, 2),
            signals=signals,
            errors=[f"{r['fqdn']}: {r.get('status')}" for r in results if r.get("status") != "PASS" and not r.get("skipped", False)],
            warnings=[f"{r['fqdn']}: skipped" for r in results if r.get("skipped", False)],
            meta={
                "run_id": run_id,
                "hash": cfg_hash,
                "violations": violations_count,
                "throughput_deliveries_per_hour": round(throughput, 2),
                "skipped_count": skipped_count,
            },
        )
        receipt_file = evidence_dir / f"receipt_edge_sync_{timestamp}.json"
        with open(receipt_file, "w", encoding="utf-8") as f:
            json.dump(receipt_data, f, indent=2)
            f.write("\n")
        print(f"🧾 CICD receipt: {receipt_file}")

        # Symlink as last_edge_receipt.json (canonical DoD receipt artefact)
        last_receipt_link = project_root / ".goalie" / "evidence" / "last_edge_receipt.json"
        with open(last_receipt_link, "w", encoding="utf-8") as f:
            json.dump(receipt_data, f, indent=2)
            f.write("\n")
    except Exception as e:
        print(f"❌ Error: Failed to write edge report: {e}")

    # ROAM signal file for any re-opened risks
    if roam_signals:
        roam_file = evidence_dir / "roam_signal.json"
        try:
            with open(roam_file, "w", encoding="utf-8") as f:
                json.dump({"run_id": run_id, "signals": roam_signals}, f, indent=2)
                f.write("\n")
            print(f"🚨 ROAM signal file: {roam_file}")
        except Exception as e:
            print(f"⚠️ Warning: Failed to write ROAM signal file: {e}")

    # Console Summary
    print("\n============================================================")
    print("📈 Edge Gateway Sync Summary:")
    print(f"  Overall Status: {'PASS' if all_passed else 'FAIL'}")
    print(f"  Total Duration: {round(total_duration, 2)}s")
    print(f"  Throughput (deliveries/hr): {round(throughput, 2)}")
    print(f"  Skipped (Cached): {skipped_count}")
    print(f"  Domains Status:")
    for res in results:
        skipped_str = " (skipped)" if res.get("skipped", False) else ""
        print(f"    - {res['fqdn']}: {res['status']}{skipped_str} (IP: {res['resolved_ip']})")
    print("============================================================\n")

    return all_passed, final_output
