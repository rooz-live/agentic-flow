#!/usr/bin/env python3
"""Unified timescape.v1 envelope — relate sub-artifacts by reference, no early merge."""
from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SCHEMA = "timescape.v1"


def build_envelope(root: Path | None = None) -> dict:
    root = (root or ROOT).resolve()
    evidence = root / ".goalie" / "evidence"
    
    # Initialize defaults
    ati = 0.0
    rehydration_loop_tick_count = 0
    inbox_zero_percent = 0.0
    inbox_zero_open = 0
    pace_cod_weight = 0.0
    sources = []
    
    # Load agentic_time
    agentic_time_path = evidence / "agentic_time_latest.json"
    if agentic_time_path.is_file():
        try:
            agentic_doc = json.loads(agentic_time_path.read_text(encoding="utf-8"))
            ati = float(agentic_doc.get("clock", {}).get("ati", 0.0))
            pace_cod_weight = float(agentic_doc.get("inputs", {}).get("pace_cod_weight", 0.0))
            sources.append(agentic_time_path.relative_to(root).as_posix())
        except (json.JSONDecodeError, OSError, ValueError, KeyError):
            pass
            
    # Load inbox_zero
    inbox_zero_path = evidence / "inbox_zero_latest.json"
    if inbox_zero_path.is_file():
        try:
            inbox_doc = json.loads(inbox_zero_path.read_text(encoding="utf-8"))
            inbox_zero_percent = float(inbox_doc.get("pct_closed", inbox_doc.get("metrics", {}).get("pct_closed", 0.0)))
            inbox_zero_open = int(inbox_doc.get("open_count", inbox_doc.get("metrics", {}).get("open_count", 0)))
            # prefer pace from inbox_zero if available
            pace_cod_weight = float(inbox_doc.get("pace", inbox_doc.get("metrics", {}).get("pace", pace_cod_weight)))
            sources.append(inbox_zero_path.relative_to(root).as_posix())
        except (json.JSONDecodeError, OSError, ValueError, KeyError):
            pass
            
    # Load rehydration
    rehydration_path = evidence / "learning" / "rehydration_latest.json"
    if rehydration_path.is_file():
        try:
            rehyd_doc = json.loads(rehydration_path.read_text(encoding="utf-8"))
            rehydration_loop_tick_count = int(rehyd_doc.get("loop_tick_count", 0))
            sources.append(rehydration_path.relative_to(root).as_posix())
        except (json.JSONDecodeError, OSError, ValueError, KeyError):
            pass
    else:
        # Fallback to glob in evidence/learning/rehydration_*.json
        learning_dir = evidence / "learning"
        if learning_dir.is_dir():
            candidates = sorted(list(learning_dir.glob("rehydration_*.json")), reverse=True)
            for cand in candidates:
                try:
                    rehyd_doc = json.loads(cand.read_text(encoding="utf-8"))
                    rehydration_loop_tick_count = int(rehyd_doc.get("loop_tick_count", 0))
                    sources.append(cand.relative_to(root).as_posix())
                    break
                except (json.JSONDecodeError, OSError, ValueError, KeyError):
                    pass

    # Status logic
    if ati < 0.05 or inbox_zero_percent < 20.0:
        envelope_status = "BLOCK"
    elif ati >= 0.60 and inbox_zero_percent >= 60.0:
        envelope_status = "TRAIN"
    elif ati >= 0.25 and inbox_zero_percent >= 40.0:
        envelope_status = "TRANSFORM"
    else:
        envelope_status = "RELATE"

    # Disposition logic
    disposition = envelope_status
    
    # Also support artifacts references for backward compatibility with v1 schema tests
    artifacts = {}
    for key, fname in [("inbox", "inbox_zero_latest.json"), 
                       ("agentic_time", "agentic_time_latest.json"), 
                       ("correlation", "timescape_correlation_latest.json")]:
        p = evidence / fname
        if p.is_file():
            try:
                doc = json.loads(p.read_text(encoding="utf-8"))
                artifacts[key] = {
                    "$ref": p.relative_to(root).as_posix(),
                    "schema": doc.get("schema"),
                    "timestamp": doc.get("timestamp"),
                    "synthetic_proxy": doc.get("synthetic_proxy"),
                }
            except (json.JSONDecodeError, OSError):
                pass

    return {
        "$id": "https://goalie.local/schemas/timescape.v1.json",
        "schema": SCHEMA,
        "timestamp": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "relate_only": True,
        "disposition": disposition,
        "artifacts": artifacts,
        # v2 fields
        "ati": ati,
        "rehydration_loop_tick_count": rehydration_loop_tick_count,
        "inbox_zero_percent": inbox_zero_percent,
        "inbox_zero_open": inbox_zero_open,
        "pace_cod_weight": pace_cod_weight,
        "envelope_status": envelope_status,
        "sources": sources,
    }



def enforce_exit(envelope: dict) -> int:
    """Fail-closed when AF_TIMESCAPE_ENFORCE=1 and envelope_status is BLOCK."""
    import os
    import sys
    if os.environ.get("AF_TIMESCAPE_ENFORCE", "0") != "1":
        return 0
    if envelope.get("envelope_status") == "BLOCK":
        print("timescape_envelope: BLOCK enforced (AF_TIMESCAPE_ENFORCE=1)", file=sys.stderr)
        return 1
    return 0


def main() -> int:
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", default=str(ROOT))
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    
    root = Path(args.root).resolve()
    out = build_envelope(root)
    
    if args.dry_run:
        print(json.dumps(out, indent=2))
        return enforce_exit(out)
        
    path = root / ".goalie" / "evidence" / "timescape_latest.json"
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(out, indent=2) + "\n", encoding="utf-8")
    print(f"timescape_envelope: {out['envelope_status']} -> {path}")
    return enforce_exit(out)


if __name__ == "__main__":
    raise SystemExit(main())
