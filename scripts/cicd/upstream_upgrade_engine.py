#!/usr/bin/env python3
"""Upstream Repository Upgrade Validation Engine.

Coordinator script that imports and executes the fetcher, runner, and reporter
slices. Supports --dry-run and --force modes.
"""

import sys
import argparse
import datetime
from pathlib import Path

# Add script directory to sys.path to allow clean sibling imports
SCRIPT_DIR = Path(__file__).parent.resolve()
sys.path.insert(0, str(SCRIPT_DIR))

try:
    import upstream_fetcher
    import upstream_runner
    import upstream_reporter
    import local_upgrader
except ImportError as e:
    print(f"❌ Core import failed: {e}", file=sys.stderr)
    sys.exit(3)


def main():
    parser = argparse.ArgumentParser(
        description="Upstream/Local Repository Upgrade Validation Engine"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="dry-run mode (no test execution, no cache write)",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="force run all integration tests, ignoring cache",
    )
    parser.add_argument(
        "--local",
        action="store_true",
        help="run local repository sweep",
    )
    parser.add_argument(
        "--scan-paths",
        type=str,
        default="/Users/shahroozbhopti/code;/Users/shahroozbhopti/Documents",
        help="semicolon-separated paths to scan for local repositories",
    )
    parser.add_argument(
        "--skip-upstream",
        action="store_true",
        help="skip upstream checks",
    )
    parser.add_argument(
        "--skip-local",
        action="store_true",
        help="skip local repository sweeps",
    )
    args = parser.parse_args()

    project_root = SCRIPT_DIR.parent.parent.resolve()

    # Use timezone-aware UTC representation to prevent deprecation warnings
    timestamp = datetime.datetime.now(datetime.UTC).strftime("%Y%m%dT%H%M%SZ")

    print("=====================================================================")
    print(f"🦅 UPSTREAM/LOCAL VALIDATION ENGINE | {timestamp}")
    if args.dry_run:
        print(
            "🚫 DRY-RUN MODE: No mutations/tests will be executed and "
            "cache will not be written."
        )
    print("=====================================================================")

    results = []
    all_passed = True

    # Load cache
    cache_path = (
        project_root
        / ".goalie"
        / "evidence"
        / "upgrades"
        / "last_known_heads.json"
    )
    cache = upstream_fetcher.load_cache(cache_path)

    # 1. Local sweep
    run_local = args.local and not args.skip_local
    if run_local:
        print("\n🛠️ Running local repository sweep...")
        scan_paths = [
            p.strip() for p in args.scan_paths.split(";") if p.strip()
        ]
        local_results, upgraded, failed = local_upgrader.run_local_sweep(
            scan_paths, dry_run=args.dry_run
        )
        results.extend(local_results)
        if failed > 0:
            all_passed = False

    # 2. Upstream sweep
    run_upstream = not args.skip_upstream
    if run_upstream:
        print("\n☁️ Running upstream repository checks...")
        repos, cache, remote_heads, to_validate = (
            upstream_fetcher.fetch_active_targets(project_root)
        )

        if repos:
            if args.force:
                print(
                    "⚠️  --force passed: forcing validation check for "
                    "all active repositories."
                )
                to_validate = [r for r in repos if r.get("active", False)]

            if args.dry_run:
                print("\n🚫 Dry-run: skipped runner phase.")
                print(
                    f"  Targets that would be validated: "
                    f"{[r['id'] for r in to_validate]}"
                )
                # Create dummy PASS/FAIL results for reporting in dry-run
                for r in repos:
                    if r.get("active", False):
                        results.append({
                            "repository_id": r["id"],
                            "url": r["url"],
                            "branch": r["branch"],
                            "latest_commit_sha": "dry-run-sha",
                            "integration_status": "PASS",
                            "duration_seconds": 0.0,
                            "skipped": r not in to_validate,
                        })
            else:
                upstream_results = upstream_runner.run_validations(
                    repos, to_validate, remote_heads, project_root
                )
                results.extend(upstream_results)
                for res in upstream_results:
                    if res["integration_status"] != "PASS":
                        all_passed = False
        else:
            print("❌ No upstream targets found or configured.")
            if not run_local:
                sys.exit(1)

    # 3. Report
    if results:
        reporter_passed = upstream_reporter.save_report_and_cache(
            results, cache, project_root, timestamp
        )
        if not reporter_passed:
            all_passed = False

    sys.exit(0 if all_passed else 1)


if __name__ == "__main__":
    main()
