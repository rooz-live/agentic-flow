#!/usr/bin/env bash
set -euo pipefail
REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$REPO_ROOT"
OUT_DIR="$REPO_ROOT/.goalie/evidence/mail"
mkdir -p "$OUT_DIR"
RUN_ID="$(date -u +%Y%m%dT%H%M%SZ)-$$"
OUT="$OUT_DIR/stabilization_${RUN_ID}.json"
LATEST="$OUT_DIR/stabilization_latest.json"
SKIP_REMOTE="${MAIL_STAB_SKIP_REMOTE:-0}"

python3 - "$REPO_ROOT" "$OUT" "$LATEST" "$SKIP_REMOTE" <<'PY'
import json, subprocess, sys, time
from pathlib import Path
root, out, latest, skip = Path(sys.argv[1]), Path(sys.argv[2]), Path(sys.argv[3]), sys.argv[4] == "1"
checks = [
    ("webmail_2096", "auto", "curl -skI --connect-timeout 10 https://mail.bhopti.com:2096 | grep -qE 'HTTP/[0-9.]+ [23]'", False),
    ("htaccess_no_8081", "auto", "ssh -o BatchMode=yes -o ConnectTimeout=10 root@cpanel-whm '! grep -q 8081 /home/bhopti/public_html/.htaccess'", False),
    ("comet_vault_ok", "manual", None, False),
    ("mailstore_8081", "auto", "curl -sf --connect-timeout 5 http://127.0.0.1:8081/ >/dev/null", True),
]
results, passed, total = [], 0, 0
for name, mode, cmd, local_only in checks:
    total += 1
    if mode == "manual":
        results.append({"name": name, "mode": "manual", "passed": None})
        continue
    if skip and not local_only:
        results.append({"name": name, "mode": "auto", "passed": None, "note": "skipped"})
        continue
    ok = subprocess.run(["bash", "-lc", cmd], cwd=root, capture_output=True).returncode == 0
    if ok:
        passed += 1
    results.append({"name": name, "mode": "auto", "passed": ok})
pct = int(passed * 100 / total) if total else 0
doc = {"schema": "mail.stabilization.v1", "timestamp_utc": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()), "checks_pass": passed, "checks_total": total, "pct": pct, "current_estimate": f"{passed}/{total} (~{pct}%)", "results": results, "status": "ok" if passed >= 3 else "degraded"}
out.write_text(json.dumps(doc, indent=2) + "\n")
latest.write_text(json.dumps({"path": str(out), **doc}, indent=2) + "\n")
print(f"stabilization_score={doc['current_estimate']}")
import re
yaml_path = root / "deploy/mail/MAIL_WAVE_DOR_DOD.yaml"
if yaml_path.is_file():
    text = yaml_path.read_text()
    text = re.sub(r"current_estimate:.*", f'current_estimate: "{doc["current_estimate"]}"', text, count=1)
    yaml_path.write_text(text)
PY
