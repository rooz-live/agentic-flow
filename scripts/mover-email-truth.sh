#!/usr/bin/env bash
# @business-context WSJF: Mover email state truth path (folder scan + evidence timestamps)
# mover-email-truth.sh — counts drafted/validated/sent/confirmed from canonical tree

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
REPORT_DIR="$PROJECT_ROOT/reports/mover-ops"
OUT_JSON="${1:-$REPORT_DIR/mover-email-truth.json}"

# Canonical mover email roots (override with MOVERS_EMAIL_ROOTS="dir1:dir2")
ROOTS="${MOVERS_EMAIL_ROOTS:-}"
if [[ -z "$ROOTS" ]]; then
  if [[ -n "${LEGAL_ROOT:-}" && -d "${LEGAL_ROOT}/06-EMAILS" ]]; then
    ROOTS="${LEGAL_ROOT}/06-EMAILS"
  elif [[ -d "$HOME/Documents/Personal/CLT/MAA/Uptown/BHOPTI-LEGAL/06-EMAILS" ]]; then
    ROOTS="$HOME/Documents/Personal/CLT/MAA/Uptown/BHOPTI-LEGAL/06-EMAILS"
  else
    ROOTS=""
  fi
fi

mkdir -p "$REPORT_DIR"

python3 - "$ROOTS" "$OUT_JSON" <<'PY'
import json, os, pathlib, sys, time

roots = sys.argv[1]
out_path = pathlib.Path(sys.argv[2])

states = {"drafted": 0, "validated": 0, "sent": 0, "confirmed": 0, "unknown": 0}
files_scanned = 0
evidence = {"latest_mtime_iso": None, "roots": []}

def classify_path(rel: str) -> str:
    low = rel.lower()
    if "draft" in low:
        return "drafted"
    if "valid" in low:
        return "validated"
    if "confirm" in low:
        return "confirmed"
    if "sent" in low or "outbox" in low:
        return "sent"
    return "unknown"

latest = 0.0
if roots.strip():
    for root in roots.split(":"):
        p = pathlib.Path(root).expanduser()
        if not p.is_dir():
            continue
        evidence["roots"].append(str(p))
        for f in p.rglob("*.eml"):
            files_scanned += 1
            try:
                st = f.stat()
                latest = max(latest, st.st_mtime)
            except OSError:
                pass
            rel = str(f.relative_to(p))
            cat = classify_path(rel)
            states[cat] = states.get(cat, 0) + 1
        for f in p.rglob("*.txt"):
            if "email" not in f.name.lower():
                continue
            files_scanned += 1
            try:
                st = f.stat()
                latest = max(latest, st.st_mtime)
            except OSError:
                pass
            rel = str(f.relative_to(p))
            cat = classify_path(rel)
            states[cat] = states.get(cat, 0) + 1

if latest > 0:
    evidence["latest_mtime_iso"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(latest))

doc = {
    "contract": "mover_email_truth",
    "version": "1.0",
    "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    "files_scanned": files_scanned,
    "counts_by_state": states,
    "evidence": evidence,
    "sla_note": "Panel must prefer API + folder mtime; stale-only display is insufficient when evidence.latest_mtime_iso is fresh.",
}
out_path.parent.mkdir(parents=True, exist_ok=True)
out_path.write_text(json.dumps(doc, indent=2), encoding="utf-8")
print(json.dumps(doc, indent=2))
PY
