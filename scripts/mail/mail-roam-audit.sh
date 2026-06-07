#!/usr/bin/env bash
# Write mail ROAM audit evidence from stabilization (does not rewrite ROAM yaml).
set -euo pipefail
REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$REPO_ROOT"
export MAIL_STAB_SKIP_REMOTE="${MAIL_STAB_SKIP_REMOTE:-1}"
bash "$REPO_ROOT/scripts/mail/mail-stabilization-score.sh" >/dev/null
python3 - "$REPO_ROOT" <<'PY'
import json, sys, time, yaml
from pathlib import Path
root = Path(sys.argv[1])
stab = json.loads((root / ".goalie/evidence/mail/stabilization_latest.json").read_text())
passed, total = stab.get("checks_pass", 0), stab.get("checks_total", 4)
roam = yaml.safe_load((root / ".goalie/ROAM_TRACKER_COG.yaml").read_text())
mail_rows = {r["id"]: r.get("status") for r in roam.get("risks", []) if str(r.get("id", "")).startswith(("R13", "R-MAIL"))}
recommend = {}
if passed < 2:
    for rid in ("R13", "R-MAIL-02"):
        if mail_rows.get(rid) == "mitigated":
            recommend[rid] = "open_fail — stabilization below threshold; FA live verify required"
elif passed >= 3:
    recommend["note"] = "stabilization OK — FA may bump last_verified on ROAM rows"
out_dir = root / ".goalie/evidence/mail"
out_dir.mkdir(parents=True, exist_ok=True)
doc = {
    "schema": "mail.roam_audit.v1",
    "timestamp_utc": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    "stabilization": f"{passed}/{total}",
    "current_roam_status": mail_rows,
    "recommendations": recommend,
}
out = out_dir / f"roam_audit_{time.strftime('%Y%m%dT%H%M%SZ', time.gmtime())}.json"
out.write_text(json.dumps(doc, indent=2) + "\n")
(out_dir / "roam_audit_latest.json").write_text(json.dumps({"path": str(out), **doc}, indent=2) + "\n")
print(f"mail_roam_audit={out} stabilization={passed}/{total}")
PY
