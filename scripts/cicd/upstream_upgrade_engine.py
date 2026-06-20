#!/usr/bin/env python3
"""Upstream Repository Upgrade Validation Engine.

Coordinator that imports and sequences the fetcher, runner, and reporter
slices. Supports both remote upstream targets and local workspace sweeps.
"""

import argparse
import datetime
import json
import os
import subprocess
import sys
from pathlib import Path

# Add script directory to sys.path to allow clean sibling imports
SCRIPT_DIR = Path(__file__).parent.resolve()
sys.path.insert(0, str(SCRIPT_DIR))

try:
    import upstream_fetcher
    import upstream_runner
    import upstream_reporter
    import local_upgrader
except ImportError as exc:
    print(f"❌ Core import failed: {exc}", file=sys.stderr)
    sys.exit(3)


# ─────────────────────────────────────────────────────────────────────────────
# Coherence gate binding
# ─────────────────────────────────────────────────────────────────────────────

def _current_head(project_root: Path) -> str:
    """Return current git HEAD SHA."""
    try:
        return subprocess.check_output(
            ["git", "rev-parse", "HEAD"],
            cwd=str(project_root),
            text=True,
            timeout=10,
        ).strip()
    except Exception:  # noqa: BLE001
        return "unknown"


def check_coherence(project_root: Path) -> tuple[bool, str]:
    """Return (ok, reason).  ok=True means coherence is PASS and bound to HEAD."""
    path = project_root / ".goalie" / "evidence" / "coherence_results.json"
    if not path.exists():
        return False, "coherence_results.json absent — run cargo check + pytest first"
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except Exception as exc:  # noqa: BLE001
        return False, f"coherence_results.json unreadable: {exc}"

    coherence = str(data.get("coherence", "")).upper()
    recorded_head = data.get("git_head", "")
    current = _current_head(project_root)

    if coherence != "PASS":
        return False, f"coherence={coherence} (expected PASS)"
    if recorded_head != current:
        return False, (
            f"coherence artefact bound to {recorded_head[:12]} but HEAD is "
            f"{current[:12]} — re-run `cargo check && pytest` to refresh"
        )
    return True, f"coherence=PASS at HEAD {current[:12]}"


# ─────────────────────────────────────────────────────────────────────────────
# DoD artefact
# ─────────────────────────────────────────────────────────────────────────────

def _write_dod_artifact(
    project_root: Path,
    run_id: str,
    timestamp: str,
    status: str,
    results: list,
    coherence_ok: bool,
    coherence_reason: str,
) -> None:
    """Write gate verification evidence JSON to .goalie/evidence."""
    evidence_dir = project_root / ".goalie" / "evidence"
    evidence_dir.mkdir(parents=True, exist_ok=True)
    path = evidence_dir / f"upstream_engine_{run_id}.json"
    doc = {
        "gate": "upstream-upgrade-engine",
        "run_id": run_id,
        "timestamp": timestamp,
        "git_head": _current_head(project_root),
        "status": status,
        "coherence_check": {"ok": coherence_ok, "reason": coherence_reason},
        "repos": [
            {
                "id": r["repository_id"],
                "status": r["integration_status"],
                "skipped": r.get("skipped", False),
                "attempts": r.get("attempts", 0),
                "duration_s": r.get("duration_seconds", 0),
            }
            for r in results
        ],
    }
    path.write_text(json.dumps(doc, indent=2) + "\n", encoding="utf-8")
    # Symlink latest
    symlink = evidence_dir / "last_upstream_engine.json"
    symlink.unlink(missing_ok=True)
    symlink.symlink_to(path.name)
    print(f"✅ DoD artefact: {path}")


# ─────────────────────────────────────────────────────────────────────────────
# Main Coordinator
# ─────────────────────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(
        description="Upstream/Local Repository Upgrade Validation Engine",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Fetch only; print plan; do not execute tests",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Force validate all active repos, ignoring SHA cache",
    )
    parser.add_argument(
        "--parallel",
        action="store_true",
        help="Run integration tests in parallel across repos",
    )
    parser.add_argument(
        "--json",
        dest="json_output",
        action="store_true",
        help="Print final summary JSON to stdout",
    )
    parser.add_argument(
        "--no-coherence",
        dest="skip_coherence",
        action="store_true",
        help="Skip coherence gate (CI / --dry-run bypass only)",
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
    parser.add_argument(
        "--decentralized",
        action="store_true",
        help="Run in decentralized mode using coordinate lock files",
    )
    parser.add_argument(
        "--htr-verify",
        action="store_true",
        help="Verify the persistent Hypothesis Tree structure",
    )
    args = parser.parse_args()

    project_root = SCRIPT_DIR.parent.parent.resolve()

    if args.htr_verify:
        tree_path = project_root / ".goalie" / "evidence" / "htr_tree.json"
        print(f"🌲 Verifying Hypothesis Tree: {tree_path}")
        if not tree_path.exists():
            print("❌ Hypothesis Tree file does not exist.")
            sys.exit(1)
        try:
            tree = json.loads(tree_path.read_text(encoding="utf-8"))
            nodes = tree.get("nodes", [])
            for node in nodes:
                required = ["id", "parent_id", "hypothesis", "status", "metrics"]
                for field in required:
                    if field not in node:
                        raise ValueError(f"Missing required field '{field}' in node {node.get('id', 'unknown')}")
            print(f"✅ Hypothesis Tree is valid. Found {len(nodes)} nodes.")
            sys.exit(0)
        except Exception as exc:
            print(f"❌ Hypothesis Tree verification failed: {exc}")
            sys.exit(1)
    timestamp = datetime.datetime.now(datetime.timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    run_id = timestamp

    print("=" * 65)
    print(f"🦅 UPSTREAM/LOCAL VALIDATION ENGINE  |  {timestamp}")
    if args.dry_run:
        print("🚫 DRY-RUN: No tests will execute; cache will not be written.")
    if args.parallel:
        print("⚡ PARALLEL: Integration tests run concurrently.")
    print("=" * 65)

    # ── Coherence gate ────────────────────────────────────────────────────────
    coherence_ok = True
    coherence_reason = "skipped (--no-coherence)"
    if not args.skip_coherence:
        coherence_ok, coherence_reason = check_coherence(project_root)
        if coherence_ok:
            print(f"✅ Coherence gate: {coherence_reason}")
        else:
            print(f"❌ Coherence gate FAIL: {coherence_reason}")
            print("   Run: cargo check && python3 -m pytest tests/billing/ tests/pytest/ -q")
            print("   Then re-run.  Pass --no-coherence to skip (CI / dry-run only).")
            _write_dod_artifact(project_root, run_id, timestamp, "BLOCK",
                                [], coherence_ok, coherence_reason)
            sys.exit(2)

    # Load cache
    cache_path = (
        project_root
        / ".goalie"
        / "evidence"
        / "upgrades"
        / "last_known_heads.json"
    )
    cache = upstream_fetcher.load_cache(cache_path)
    results = []
    all_passed = True

    # 1. Local sweep
    run_local = args.local and not args.skip_local
    if run_local:
        print("\n🛠️ Running local repository sweep...")
        scan_paths = [
            p.strip() for p in args.scan_paths.split(";") if p.strip()
        ]
        local_results, upgraded, failed = local_upgrader.run_local_sweep(
            scan_paths,
            dry_run=args.dry_run,
            json_output=args.json_output,
            decentralized=args.decentralized,
        )
        results.extend(local_results)
        if failed > 0:
            all_passed = False

    # 2. Upstream sweep
    run_upstream = not args.skip_upstream
    repos = []
    if run_upstream:
        print("\n☁️ Running upstream repository checks...")
        repos, cache, remote_heads, to_validate = (
            upstream_fetcher.fetch_active_targets(project_root, parallel=True)
        )

        if repos:
            if args.force:
                print("⚠️  --force: queuing all active repos for validation.")
                to_validate = [r for r in repos if r.get("active", False)]

            if args.dry_run:
                print(f"\n🚫 Dry-run: would validate {[r['id'] for r in to_validate]}")
                skipped = [
                    r["id"]
                    for r in repos
                    if r.get("active") and r["id"] not in {x["id"] for x in to_validate}
                ]
                print(f"   Would skip (cached): {skipped}")
                # Populate dummy dry-run results for reporting
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
                cfg: dict = {}
                try:
                    cfg_path = project_root / "config" / "cicd" / "upstream_registry.json"
                    cfg = json.loads(cfg_path.read_text(encoding="utf-8")).get(
                        "upgrades_configuration", {}
                    )
                except Exception:
                    pass

                upstream_results = upstream_runner.run_validations(
                    repos,
                    to_validate,
                    remote_heads,
                    project_root,
                    parallel=args.parallel,
                    decentralized=args.decentralized,
                    default_run_timeout_s=int(cfg.get("default_run_timeout_s", 120)),
                    default_retry=int(cfg.get("default_retry", 1)),
                    log_truncate_bytes=int(cfg.get("log_truncate_bytes", 8192)),
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
            results,
            cache,
            project_root,
            timestamp,
            run_id=run_id,
            registry_repos=repos,
            json_output=args.json_output,
        )
        if not reporter_passed:
            all_passed = False

    # 4. DoD artefact
    overall_status = "PASS" if all_passed else "FAIL"
    _write_dod_artifact(
        project_root,
        run_id,
        timestamp,
        overall_status,
        results,
        coherence_ok,
        coherence_reason,
    )

    sys.exit(0 if all_passed else 1)


if __name__ == "__main__":
    main()
