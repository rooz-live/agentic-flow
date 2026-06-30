#!/usr/bin/env bash
# Tie Ruflo standup/review/retro/PI ceremonies to evidence artifacts.
set -euo pipefail
ROOT="${REPO_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
cd "$ROOT"
CEREMONY="${1:-standup}"
EVIDENCE_DIR="$ROOT/.goalie/evidence"
mkdir -p "$EVIDENCE_DIR"

case "$CEREMONY" in
  standup)
    bash "$ROOT/scripts/ruflo/doctor_remediate.sh" || true
    ;;
  review)
    if [[ -f "$ROOT/scripts/dod-gate.sh" ]]; then
      AGENT_SLICE=publication bash "$ROOT/scripts/dod-gate.sh" --perceive 2>/dev/null || true
    fi
    ;;
  retro)
    python3 - "$EVIDENCE_DIR/ceremony_ruflo_retro_latest.json" <<'PY'
import json, sys
from datetime import datetime, timezone
from pathlib import Path
p = Path(sys.argv[1])
p.write_text(json.dumps({
    "schema": "ruflo_retro.v1",
    "at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
    "note": "invert: intelligence off while config claims v3 — enable HNSW after doctor green",
}, indent=2) + "\n", encoding="utf-8")
print(f"wrote {p}")
PY
    ;;
  pi_prep|pi_sync)
    bash "$ROOT/scripts/cicd/exec_wsjf_ruflo.sh" || true
    bash "$ROOT/scripts/cicd/pi_plan_sync.sh" 2>/dev/null || true
    ;;
  *)
    echo "unknown ceremony: $CEREMONY" >&2
    exit 2
    ;;
esac

python3 - "$EVIDENCE_DIR/ruflo_ceremony_latest.json" "$CEREMONY" <<'PY'
import json, sys
from datetime import datetime, timezone
from pathlib import Path
out, ceremony = Path(sys.argv[1]), sys.argv[2]
payload = {
    "schema": "ruflo_ceremony.v1",
    "ceremony": ceremony,
    "at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
}
for name in ("ruflo_doctor_latest.json", "pi_plan_sync_latest.json", "inbox_zero_latest.json"):
    p = out.parent / name
    if p.is_file():
        payload[name.replace(".json", "")] = json.loads(p.read_text(encoding="utf-8"))
out.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
print(f"ruflo ceremony {ceremony} synced")
PY
