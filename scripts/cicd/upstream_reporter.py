#!/usr/bin/env python3
"""Upstream Repository Upgrade Validation Reporter.

Generates structured JSON evidence logs and updates the cache.
"""

import json
from pathlib import Path
from typing import Dict, List, Any

def save_report_and_cache(
    results: List[Dict[str, Any]],
    cache: Dict[str, str],
    project_root: Path,
    timestamp: str
) -> bool:
    """Save the validation run report and update the successfully verified cache."""
    evidence_dir = project_root / ".goalie" / "evidence" / "upgrades"
    evidence_dir.mkdir(parents=True, exist_ok=True)

    # 1. Update the cache with passing repository SHAs
    new_cache = dict(cache)
    all_passed = True
    total_duration = 0.0
    skipped_count = 0

    for res in results:
        repo_id = res["repository_id"]
        status = res["integration_status"]
        sha = res["latest_commit_sha"]
        total_duration += res.get("duration_seconds", 0.0)
        
        if res.get("skipped", False):
            skipped_count += 1

        if status == "PASS":
            # Cache successfully verified SHA
            if sha and sha != "offline_or_cached_sha":
                new_cache[repo_id] = sha
        else:
            all_passed = False

    # Save cache file
    cache_file = evidence_dir / "last_known_heads.json"
    try:
        with open(cache_file, "w", encoding="utf-8") as f:
            json.dump(new_cache, f, indent=2)
            f.write("\n")
        print(f"✅ Cache updated: {cache_file}")
    except Exception as e:
        print(f"⚠️ Warning: Failed to write cache: {e}")

    # 2. Write the detailed timestamped report
    report_file = evidence_dir / f"upgrades_report_{timestamp}.json"
    final_output = {
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
        print(f"🎉 Report saved: {report_file}")
    except Exception as e:
        print(f"❌ Error: Failed to write report: {e}")

    # Console Summary
    print("\n============================================================")
    print("📈 Upstream Validation Summary:")
    print(f"  Overall Status: {'PASS' if all_passed else 'FAIL'}")
    print(f"  Total Duration: {round(total_duration, 2)}s")
    print(f"  Skipped (Cached): {skipped_count}")
    print(f"  Active Targets Verified:")
    for res in results:
        skipped_str = " (skipped)" if res.get("skipped", False) else ""
        print(f"    - {res['repository_id']}: {res['integration_status']}{skipped_str}")
    print("============================================================\n")

    return all_passed
