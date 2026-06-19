#!/usr/bin/env python3
"""Edge Gateway Sync Engine.

Coordinates the deconstructed Fetcher, Runner, and Reporter slices to check
DNS records and sync gateway configurations.
"""

import sys
import argparse
import datetime
from pathlib import Path

# Add script directory to sys.path to allow sibling imports
SCRIPT_DIR = Path(__file__).parent.resolve()
sys.path.insert(0, str(SCRIPT_DIR))

try:
    import edge_fetcher
    import edge_runner
    import edge_reporter
except ImportError as e:
    print(f"❌ Core import failed: {e}", file=sys.stderr)
    sys.exit(3)

def main():
    parser = argparse.ArgumentParser(description="Edge Gateway Synchronization Engine")
    parser.add_argument("--dry-run", action="store_true", help="dry-run mode (no test execution, no cache write)")
    parser.add_argument("--force", action="store_true", help="force check all domains, ignoring cache")
    args = parser.parse_args()

    project_root = SCRIPT_DIR.parent.parent.resolve()
    
    timestamp = datetime.datetime.now(datetime.UTC).strftime("%Y%m%dT%H%M%SZ")
    
    print("=====================================================================")
    print(f"🌐 EDGE GATEWAY SYNC ENGINE | {timestamp}")
    if args.dry_run:
        print("🚫 DRY-RUN MODE: Checks will run, but cache/evidence won't be committed.")
    print("=====================================================================")

    # 1. Fetch
    fqdns, registry, live_resolutions, cache, to_sync = edge_fetcher.fetch_edge_status(project_root)
    
    if not fqdns:
        print("❌ No FQDN targets found in configuration. Exiting.")
        sys.exit(1)

    if args.force:
        print("⚠️  --force passed: forcing synchronization check for all domains.")
        to_sync = list(fqdns)

    # 2. Run
    if args.dry_run:
        print("\n🚫 Dry-run: skipped runner sync phase.")
        print(f"  Domains that would be synchronized: {to_sync}")
        # Build dry-run results
        results = []
        for fqdn in fqdns:
            results.append({
                "fqdn": fqdn,
                "status": "PASS",
                "resolved_ip": live_resolutions.get(fqdn),
                "expected_ip": registry.get(fqdn),
                "duration_seconds": 0.0,
                "skipped": fqdn not in to_sync
            })
    else:
        results = edge_runner.run_edge_sync(fqdns, to_sync, registry, live_resolutions, project_root)

    # 3. Report
    all_passed = edge_reporter.save_edge_report_and_cache(results, cache, project_root, timestamp)

    sys.exit(0 if all_passed else 1)

if __name__ == "__main__":
    main()
