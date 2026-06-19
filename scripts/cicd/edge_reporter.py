#!/usr/bin/env python3
"""Edge Gateway Configuration Reporter.

Generates structured JSON evidence logs and updates the synchronization cache.
"""

import json
from pathlib import Path
from typing import Dict, List, Any

def save_edge_report_and_cache(
    results: List[Dict[str, Any]],
    cache: Dict[str, str],
    project_root: Path,
    timestamp: str
) -> bool:
    """Save the Edge validation run report and update the successfully verified cache."""
    evidence_dir = project_root / ".goalie" / "evidence" / "edge_gateway"
    evidence_dir.mkdir(parents=True, exist_ok=True)

    new_cache = dict(cache)
    all_passed = True
    total_duration = 0.0
    skipped_count = 0

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

    # Save cache file
    cache_file = evidence_dir / "last_known_state.json"
    try:
        with open(cache_file, "w", encoding="utf-8") as f:
            json.dump(new_cache, f, indent=2)
            f.write("\n")
        print(f"✅ Edge cache updated: {cache_file}")
    except Exception as e:
        print(f"⚠️ Warning: Failed to write edge cache: {e}")

    # Write detailed report
    report_file = evidence_dir / f"edge_report_{timestamp}.json"
    final_output = {
        "gate": "deploy-edge-cfg",
        "status": "PASS" if all_passed else "FAIL",
        "timestamp": timestamp,
        "total_duration_seconds": round(total_duration, 2),
        "skipped_count": skipped_count,
        "results": results
    }

    try:
        with open(report_file, "w", encoding="utf-8") as f:
            json.dump(final_output, f, indent=2)
            f.write("\n")
        print(f"🎉 Edge Report saved: {report_file}")
        
        # Symlink as last_edge_cfg_deploy.json to keep DoD gate compatible
        last_link = project_root / ".goalie" / "evidence" / "last_edge_cfg_deploy.json"
        with open(last_link, "w", encoding="utf-8") as f:
            json.dump(final_output, f, indent=2)
            f.write("\n")
    except Exception as e:
        print(f"❌ Error: Failed to write edge report: {e}")

    # Console Summary
    print("\n============================================================")
    print("📈 Edge Gateway Sync Summary:")
    print(f"  Overall Status: {'PASS' if all_passed else 'FAIL'}")
    print(f"  Total Duration: {round(total_duration, 2)}s")
    print(f"  Skipped (Cached): {skipped_count}")
    print(f"  Domains Status:")
    for res in results:
        skipped_str = " (skipped)" if res.get("skipped", False) else ""
        print(f"    - {res['fqdn']}: {res['status']}{skipped_str} (IP: {res['resolved_ip']})")
    print("============================================================\n")

    return all_passed
