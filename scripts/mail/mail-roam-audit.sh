#!/usr/bin/env bash
# Write mail ROAM audit evidence from stabilization (does not rewrite ROAM yaml).
set -euo pipefail
REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$REPO_ROOT"
export MAIL_STAB_SKIP_REMOTE="${MAIL_STAB_SKIP_REMOTE:-0}"
bash "$REPO_ROOT/scripts/mail/mail-stabilization-score.sh" >/dev/null
python3 - "$REPO_ROOT" <<'PY'
import json, sys, time, yaml
from pathlib import Path
root = Path(sys.argv[1])
ev = root / ".goalie/evidence/mail"
stab = json.loads((ev / "stabilization_latest.json").read_text())
passed, total = stab.get("checks_pass", 0), stab.get("checks_total", 4)
roam = yaml.safe_load((root / ".goalie/ROAM_TRACKER_COG.yaml").read_text())
mail_rows = {r["id"]: r.get("status") for r in roam.get("risks", []) if str(r.get("id", "")).startswith(("R13", "R-MAIL"))}
wave_e = json.loads((ev / "wave_e_latest.json").read_text()) if (ev / "wave_e_latest.json").is_file() else {}
imap = json.loads((ev / "imap_source_latest.json").read_text()) if (ev / "imap_source_latest.json").is_file() else {}
ms = sorted(ev.glob("mailstore_*.json"))
ms_doc = json.loads(ms[-1].read_text()) if ms else {}
cv = ev / "comet_vault_latest.json"
if cv.is_file():
    comet_doc = json.loads(cv.read_text())
else:
    cj = sorted(ev.glob("comet_job_*.json"))
    comet_doc = json.loads(cj[-1].read_text()) if cj else {}
recommend = {}
comet_probe = comet_doc.get("comet_probe") or (
        "vault_proven" if comet_doc.get("primary_verified") and comet_doc.get("destinations_count", 0) > 0
        else ("stub_db" if comet_doc.get("primary_verified") else None)
    )
if comet_probe in ("stub_db", "ssh_ok_job_pending", "ssh_blocked") and mail_rows.get("R-MAIL-01") == "mitigated":
    recommend["R-MAIL-01"] = f"open_fail — comet_probe={comet_probe}; {comet_doc.get('detail', 'no vault')}"
elif comet_probe == "vault_proven" and mail_rows.get("R-MAIL-01") == "open_fail":
    recommend["R-MAIL-01"] = "mitigated — Comet vault_proven with destinations>0"
if ms_doc.get("imap_ingest_verified") is False and mail_rows.get("R13") == "mitigated":
    recommend["R13"] = "open_fail — mock noop only; imap_ingest_verified=false"
if wave_e.get("https_ok") and mail_rows.get("R-MAIL-02") == "open_fail":
    recommend["R-MAIL-02"] = "mitigated — wave_e https_ok=true"
if wave_e.get("https_ok") is False and mail_rows.get("R-MAIL-02") == "mitigated":
    recommend["R-MAIL-02"] = "open_fail — wave_e https_ok=false"
if passed < 2:
    for rid in ("R13", "R-MAIL-02"):
        if mail_rows.get(rid) == "mitigated" and rid not in recommend:
            recommend[rid] = "open_fail — stabilization below threshold; FA live verify required"
out_dir = ev
out_dir.mkdir(parents=True, exist_ok=True)
doc = {
    "schema": "mail.roam_audit.v1",
    "timestamp_utc": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    "stabilization": f"{passed}/{total}",
    "wave_e_https_ok": wave_e.get("https_ok"),
    "imap_source_reachable": imap.get("reachable"),
    "imap_ingest_verified": ms_doc.get("imap_ingest_verified"),
    "comet_probe": comet_probe,
    "comet_destinations": comet_doc.get("destinations_count"),
    "current_roam_status": mail_rows,
    "recommendations": recommend,
}
out = out_dir / f"roam_audit_{time.strftime('%Y%m%dT%H%M%SZ', time.gmtime())}.json"
out.write_text(json.dumps(doc, indent=2) + "\n")
(out_dir / "roam_audit_latest.json").write_text(json.dumps({"path": str(out), **doc}, indent=2) + "\n")
print(f"mail_roam_audit={out} stabilization={passed}/{total}")
PY