#!/usr/bin/env python3
"""Edge Gateway Sync Engine.

Coordinates the deconstructed Fetcher, Runner, and Reporter slices to check
DNS records, health-probe public endpoints, sync gateway configurations, and
emit a DoD artefact.
"""

import argparse
import datetime
import json
import subprocess
import sys
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

# Shared CICD receipt envelope (monolith deconstruct contract)
sys.path.insert(0, str(SCRIPT_DIR / "lib"))
import receipt


def _current_head(project_root: Path) -> str:
    """Return current git HEAD SHA."""
    try:
        return subprocess.check_output(
            ["git", "rev-parse", "HEAD"],
            cwd=str(project_root),
            text=True,
            timeout=10,
        ).strip()
    except Exception:
        return "unknown"


def check_coherence(project_root: Path) -> tuple[bool, str]:
    """Return (ok, reason).  ok=True means coherence is PASS and bound to HEAD."""
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
        return False, (
            f"coherence artefact bound to {recorded_head[:12]} but HEAD is "
            f"{current[:12]} — re-run `cargo check && pytest` to refresh"
        )
    return True, f"coherence=PASS at HEAD {current[:12]}"


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
    evidence_dir = project_root / ".goalie" / "evidence" / "edge_gateway"
    evidence_dir.mkdir(parents=True, exist_ok=True)
    path = evidence_dir / f"edge_sync_{run_id}.json"
    doc = {
        "gate": "edge-gateway-sync",
        "run_id": run_id,
        "timestamp": timestamp,
        "git_head": _current_head(project_root),
        "status": status,
        "coherence_check": {"ok": coherence_ok, "reason": coherence_reason},
        "domains": [
            {
                "fqdn": r["fqdn"],
                "status": r["status"],
                "skipped": r.get("skipped", False),
                "resolved_ip": r.get("resolved_ip"),
                "expected_ip": r.get("expected_ip"),
                "duration_s": r.get("duration_seconds", 0),
            }
            for r in results
        ],
    }
    path.write_text(json.dumps(doc, indent=2) + "\n", encoding="utf-8")
    # Symlink latest (absolute target to avoid relative-directory breakage)
    symlink = project_root / ".goalie" / "evidence" / "last_edge_sync_engine.json"
    try:
        symlink.unlink(missing_ok=True)
    except IsADirectoryError:
        pass
    try:
        symlink.symlink_to(path)
    except FileExistsError:
        # Race or stale regular file: remove and retry once
        symlink.unlink(missing_ok=True)
        symlink.symlink_to(path)
    print(f"✅ DoD artefact: {path}")


def _write_receipt_artifact(
    project_root: Path,
    run_id: str,
    timestamp: str,
    status: str,
    results: list,
    coherence_ok: bool,
    coherence_reason: str,
    exit_code: int,
) -> Path:
    """Write a standard cicd.receipt.v1 artifact for fetch-run-report."""
    failed_domains = [r["fqdn"] for r in results if r.get("status") != "PASS" and not r.get("skipped", False)]
    skipped_domains = [r["fqdn"] for r in results if r.get("skipped", False)]
    signals = [
        {
            "name": "edge_dns_sync",
            "ok": status == "PASS",
            "required": True,
            "details": {
                "domains_checked": len(results),
                "domains_passed": len([r for r in results if r.get("status") == "PASS"]),
                "domains_failed": failed_domains,
                "domains_skipped": skipped_domains,
            },
        },
        {
            "name": "coherence_gate",
            "ok": coherence_ok,
            "required": True,
            "details": {"reason": coherence_reason},
        },
    ]
    rcpt = receipt.make(
        context="edge",
        status=status,
        command="scripts/cicd/edge_gateway_sync_engine.py",
        exit_code=exit_code,
        duration_seconds=sum(r.get("duration_seconds", 0) for r in results),
        signals=signals,
        errors=failed_domains,
        warnings=skipped_domains,
        meta={
            "run_id": run_id,
            "git_head": _current_head(project_root),
            "coherence_ok": coherence_ok,
            "coherence_reason": coherence_reason,
            "domains": [
                {
                    "fqdn": r["fqdn"],
                    "status": r["status"],
                    "skipped": r.get("skipped", False),
                    "resolved_ip": r.get("resolved_ip"),
                    "expected_ip": r.get("expected_ip"),
                }
                for r in results
            ],
        },
        timestamp=timestamp,
    )
    evidence_dir = project_root / ".goalie" / "evidence" / "edge_gateway"
    receipt_path = evidence_dir / f"receipt_edge_sync_{run_id}.json"
    receipt.write(rcpt, receipt_path)
    # Symlink latest receipt
    symlink = project_root / ".goalie" / "evidence" / "edge_gateway" / "last_receipt.json"
    symlink.unlink(missing_ok=True)
    symlink.symlink_to(receipt_path.name)
    print(f"🧾 Receipt artefact: {receipt_path}")
    return receipt_path


def main():
    parser = argparse.ArgumentParser(description="Edge Gateway Synchronization Engine")
    parser.add_argument("--dry-run", action="store_true", help="dry-run mode (no test execution, no cache write)")
    parser.add_argument("--force", action="store_true", help="force check all domains, ignoring cache")
    parser.add_argument("--json", dest="json_output", action="store_true", help="emit summary JSON to stdout")
    parser.add_argument("--no-coherence", dest="skip_coherence", action="store_true", help="skip coherence gate (CI / dry-run only)")
    parser.add_argument("--print-receipt", action="store_true", help="print the canonical CICD receipt path on completion")
    args = parser.parse_args()

    project_root = SCRIPT_DIR.parent.parent.resolve()
    
    timestamp = datetime.datetime.now(datetime.timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    run_id = timestamp
    
    print("=====================================================================")
    print(f"🌐 EDGE GATEWAY SYNC ENGINE | {timestamp}")
    if args.dry_run:
        print("🚫 DRY-RUN MODE: Checks will run, but cache/evidence won't be committed.")
    print("=====================================================================")

    # Coherence gate
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
            _write_dod_artifact(project_root, run_id, timestamp, "BLOCK", [], coherence_ok, coherence_reason)
            sys.exit(2)

    # 1. Fetch
    fqdns, registry, live_resolutions, cache, to_sync, fqdn_metadata = edge_fetcher.fetch_edge_status(project_root)

    if not fqdn_metadata:
        print("❌ FQDN registry (config/fqdn_registry.yaml) missing or empty. Exiting.")
        _write_dod_artifact(project_root, run_id, timestamp, "FAIL", [], coherence_ok, coherence_reason)
        sys.exit(1)

    if not fqdns:
        print("❌ No FQDN targets found in edge_gateway.cfg. Exiting.")
        _write_dod_artifact(project_root, run_id, timestamp, "FAIL", [], coherence_ok, coherence_reason)
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
                "skipped": fqdn not in to_sync,
                "roam_risk_id": fqdn_metadata.get(fqdn, {}).get("roam_risk_id"),
            })
    else:
        results = edge_runner.run_edge_sync(
            fqdns, to_sync, registry, live_resolutions, project_root,
            fqdn_metadata=fqdn_metadata,
            run_id=run_id,
        )

    # 3. Report
    all_passed, summary = edge_reporter.save_edge_report_and_cache(
        results, cache, project_root, timestamp,
        run_id=run_id,
        fqdn_metadata=fqdn_metadata,
    )

    overall_status = "PASS" if all_passed else "FAIL"
    exit_code = 0 if all_passed else 1
    _write_dod_artifact(project_root, run_id, timestamp, overall_status, results, coherence_ok, coherence_reason)
    _write_receipt_artifact(
        project_root, run_id, timestamp, overall_status, results,
        coherence_ok, coherence_reason, exit_code,
    )

    if args.json_output:
        print(json.dumps(summary, indent=2))

    if args.print_receipt:
        receipt_path = project_root / ".goalie" / "evidence" / "last_edge_receipt.json"
        print(f"🧾 CICD receipt: {receipt_path}")

    sys.exit(0 if all_passed else 1)


if __name__ == "__main__":
    main()
