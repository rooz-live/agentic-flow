#!/usr/bin/env python3
"""Upstream Repository Upgrade Validation Engine.

Coordinator that imports and sequences the fetcher, runner, and reporter
slices.  New capabilities vs. the previous stub:

  CLI flags
  ---------
  --dry-run      Fetch only; print what would run; exit 0.
  --force        Force-validate all active repos even if cached/up-to-date.
  --parallel     Run integration tests in parallel (ThreadPoolExecutor).
  --json         Emit final summary JSON to stdout (in addition to evidence file).
  --no-coherence Skip the coherence gate binding check.

  DoR check (coherence gate)
  --------------------------
  Before running validations, reads .goalie/evidence/coherence_results.json
  and verifies:
    1. coherence == "PASS"
    2. git_head in file == current HEAD
  Stale or absent artifact => exits 2 unless --no-coherence is passed.

  DoD artefact
  ------------
  Always writes .goalie/evidence/upstream_engine_{run_id}.json at exit,
  regardless of pass/fail.  Contains gate name, run_id, git HEAD, overall
  status, and a per-repo summary.

  ROAM / DLQ passthrough
  ----------------------
  Delegated to upstream_reporter.save_report_and_cache.
"""
from __future__ import annotations

import argparse
import datetime
import json
import os
import subprocess
import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).parent.resolve()
sys.path.insert(0, str(SCRIPT_DIR))

try:
    import upstream_fetcher
    import upstream_runner
    import upstream_reporter
except ImportError as exc:
    print(f"\u274c Core import failed: {exc}", file=sys.stderr)
    sys.exit(3)


# ─────────────────────────────────────────────────────────────────────────────
# Coherence gate binding
# ─────────────────────────────────────────────────────────────────────────────

def _current_head(project_root: Path) -> str:
    try:
        return subprocess.check_output(
            ["git", "rev-parse", "HEAD"],
            cwd=str(project_root),
            text=True,
            timeout=10,
        ).strip()
    except Exception:
        return "unknown"


def check_coherence(project_root: Path) -> tuple:
    """Return (ok: bool, reason: str).  ok=True iff coherence=PASS and bound to HEAD."""
    path = project_root / ".goalie" / "evidence" / "coherence_results.json"
    if not path.exists():
        return False, "coherence_results.json absent — run cargo check + pytest first"
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except Exception as exc:
        return False, f"coherence_results.json unreadable: {exc}"

    coherence = str(data.get("coherence", "")).upper()
    recorded_head = data.get("git_head", "")
    current = _current_head(project_root)

    if coherence != "PASS":
        return False, f"coherence={coherence} (expected PASS)"
    if recorded_head != current:
        return (
            False,
            f"coherence artifact bound to {recorded_head[:12]} "
            f"but HEAD is {current[:12]} — re-run `cargo check && pytest` to refresh",
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
    # Update latest symlink
    symlink = evidence_dir / "last_upstream_engine.json"
    try:
        symlink.unlink(missing_ok=True)
        symlink.symlink_to(path.name)
    except Exception:
        pass
    print(f"\u2705 DoD artefact: {path}")


# ─────────────────────────────────────────────────────────────────────────────
# Main
# ─────────────────────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(
        description="Upstream Repository Upgrade Validation Engine",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument("--dry-run", action="store_true",
                        help="Fetch only; print plan; do not execute tests")
    parser.add_argument("--force", action="store_true",
                        help="Force validate all active repos, ignoring SHA cache")
    parser.add_argument("--parallel", action="store_true",
                        help="Run integration tests in parallel across repos")
    parser.add_argument("--json", dest="json_output", action="store_true",
                        help="Print final summary JSON to stdout")
    parser.add_argument("--no-coherence", dest="skip_coherence", action="store_true",
                        help="Skip coherence gate (CI / --dry-run bypass only)")
    args = parser.parse_args()

    project_root = SCRIPT_DIR.parent.parent.resolve()
    timestamp = datetime.datetime.now(datetime.timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    run_id = timestamp

    print("=" * 65)
    print(f"\U0001f985 UPSTREAM VALIDATION ENGINE  |  {timestamp}")
    if args.dry_run:
        print("\U0001f6ab DRY-RUN: No tests will execute; cache will not be written.")
    if args.parallel:
        print("\u26a1 PARALLEL: Integration tests run concurrently.")
    print("=" * 65)

    # ── Coherence gate ────────────────────────────────────────────────────────
    coherence_ok = True
    coherence_reason = "skipped (--no-coherence)"
    if not args.skip_coherence:
        coherence_ok, coherence_reason = check_coherence(project_root)
        if coherence_ok:
            print(f"\u2705 Coherence gate: {coherence_reason}")
        else:
            print(f"\u274c Coherence gate FAIL: {coherence_reason}")
            print("   Run: cargo check && python3 -m pytest tests/billing/ tests/pytest/ -q")
            print("   Then re-run.  Pass --no-coherence to skip (CI / dry-run only).")
            _write_dod_artifact(project_root, run_id, timestamp, "BLOCK",
                                [], coherence_ok, coherence_reason)
            sys.exit(2)

    # ── Phase 1: Fetch ────────────────────────────────────────────────────────
    repos, cache, remote_heads, to_validate = upstream_fetcher.fetch_active_targets(
        project_root, parallel=True
    )

    if not repos:
        print("\u274c No targets configured. Exiting.")
        sys.exit(1)

    if args.force:
        print("\u26a0\ufe0f  --force: queuing all active repos for validation.")
        to_validate = [r for r in repos if r.get("active", False)]

    if args.dry_run:
        print(f"\n\U0001f6ab Dry-run: would validate {[r['id'] for r in to_validate]}")
        skipped = [r["id"] for r in repos if r.get("active") and r["id"] not in {x["id"] for x in to_validate}]
        print(f"   Would skip (cached): {skipped}")
        sys.exit(0)

    # ── Phase 2: Run ──────────────────────────────────────────────────────────
    cfg: dict = {}
    try:
        cfg_path = project_root / "config" / "cicd" / "upstream_registry.json"
        cfg = json.loads(cfg_path.read_text(encoding="utf-8")).get("upgrades_configuration", {})
    except Exception:
        pass

    results = upstream_runner.run_validations(
        repos,
        to_validate,
        remote_heads,
        project_root,
        parallel=args.parallel,
        default_run_timeout_s=int(cfg.get("default_run_timeout_s", 120)),
        default_retry=int(cfg.get("default_retry", 1)),
        log_truncate_bytes=int(cfg.get("log_truncate_bytes", 8192)),
    )

    # ── Phase 3: Report + cache + DLQ/ROAM ───────────────────────────────────
    all_passed = upstream_reporter.save_report_and_cache(
        results,
        cache,
        project_root,
        timestamp,
        run_id=run_id,
        registry_repos=repos,
        json_output=args.json_output,
    )

    # ── DoD artefact ─────────────────────────────────────────────────────────
    overall_status = "PASS" if all_passed else "FAIL"
    _write_dod_artifact(
        project_root, run_id, timestamp, overall_status,
        results, coherence_ok, coherence_reason,
    )

    sys.exit(0 if all_passed else 1)


if __name__ == "__main__":
    main()
