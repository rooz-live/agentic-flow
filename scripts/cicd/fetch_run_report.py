#!/usr/bin/env python3
"""Fetch-Run-Report CLI over the CICD receipt store.

Scans .goalie/evidence for cicd.receipt.v1 artefacts produced by
upstream, local, edge, and orchestration contexts. Supports filtering by
context, status, and date, and emits either a summary or a JSON report.
"""
from __future__ import annotations

import argparse
import datetime
import json
import sys
from pathlib import Path
from typing import Any

# Shared CICD receipt envelope
LIB_DIR = Path(__file__).resolve().parent / "lib"
if str(LIB_DIR) not in sys.path:
    sys.path.insert(0, str(LIB_DIR))
import receipt


DEFAULT_EVIDENCE_DIR = Path(".goalie") / "evidence"


def _is_valid_receipt(data: dict) -> bool:
    return receipt.validate(data) == []


def _parse_iso(ts: str) -> datetime.datetime:
    # Python 3.11+ handles Z suffix directly; older versions need coercion
    if ts.endswith("Z"):
        ts = ts[:-1] + "+00:00"
    return datetime.datetime.fromisoformat(ts)


def _collect_receipts(
    evidence_dir: Path,
    *,
    contexts: set[str] | None = None,
    statuses: set[str] | None = None,
    since: datetime.datetime | None = None,
    until: datetime.datetime | None = None,
) -> list[dict]:
    found: list[dict] = []
    if not evidence_dir.exists():
        return found

    for path in evidence_dir.rglob("receipt_*.json"):
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
        except Exception:
            continue
        if not _is_valid_receipt(data):
            continue
        if contexts and data.get("context") not in contexts:
            continue
        if statuses and data.get("status") not in statuses:
            continue
        if since or until:
            ts = data.get("timestamp")
            if not ts:
                continue
            try:
                dt = _parse_iso(ts)
            except Exception:
                continue
            if since and dt < since:
                continue
            if until and dt > until:
                continue
        data["_path"] = str(path)
        found.append(data)

    found.sort(key=lambda r: r.get("timestamp", ""), reverse=True)
    return found


def _summarize(receipts: list[dict]) -> dict:
    by_context: dict[str, dict[str, int]] = {}
    overall_ok = True
    for r in receipts:
        ctx = r.get("context", "unknown")
        status = r.get("status", "UNKNOWN")
        by_context.setdefault(ctx, {"PASS": 0, "FAIL": 0, "BLOCK": 0, "SKIP": 0, "TIMEOUT": 0, "total": 0})
        if status in by_context[ctx]:
            by_context[ctx][status] += 1
        by_context[ctx]["total"] += 1
        if status not in {"PASS", "SKIP"}:
            overall_ok = False

    return {
        "overall_ok": overall_ok,
        "total_receipts": len(receipts),
        "by_context": by_context,
        "latest": receipts[0] if receipts else None,
    }


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Fetch-Run-Report over CICD receipts")
    parser.add_argument("--evidence-dir", type=Path, default=DEFAULT_EVIDENCE_DIR)
    parser.add_argument("--context", action="append", help="Filter by context (upstream, local, edge, ...)")
    parser.add_argument("--status", action="append", help="Filter by status (PASS, FAIL, ...)")
    parser.add_argument("--since", help="ISO timestamp lower bound")
    parser.add_argument("--until", help="ISO timestamp upper bound")
    parser.add_argument("--json", action="store_true", help="Emit raw receipts as JSON")
    parser.add_argument("--summary", action="store_true", help="Emit summary only")
    args = parser.parse_args(argv)

    since = datetime.datetime.fromisoformat(args.since) if args.since else None
    until = datetime.datetime.fromisoformat(args.until) if args.until else None
    contexts = set(args.context) if args.context else None
    statuses = set(args.status) if args.status else None

    receipts = _collect_receipts(
        args.evidence_dir,
        contexts=contexts,
        statuses=statuses,
        since=since,
        until=until,
    )

    if args.json:
        print(json.dumps(receipts, indent=2))
        return 0 if _summarize(receipts)["overall_ok"] else 1

    if args.summary:
        print(json.dumps(_summarize(receipts), indent=2, default=str))
        return 0 if _summarize(receipts)["overall_ok"] else 1

    # Human-readable default
    summary = _summarize(receipts)
    icon = "✅" if summary["overall_ok"] else "🛑"
    print(f"{icon} fetch-run-report: {summary['total_receipts']} receipts")
    for ctx, counts in summary["by_context"].items():
        print(f"  {ctx}: {counts}")
    if summary["latest"]:
        latest = summary["latest"]
        print(f"  latest: {latest['context']} {latest['status']} at {latest['timestamp']} ({latest['_path']})")
    return 0 if summary["overall_ok"] else 1


if __name__ == "__main__":
    sys.exit(main())
