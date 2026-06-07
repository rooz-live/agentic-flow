#!/usr/bin/env bash
# Compare public DS (8.8.8.8) to cPanel export — exit 0 when SHA-256 DS match.
set -euo pipefail
REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
source "$(dirname "$0")/_mail_infra_env.sh"
DOMAIN="${1:-bhopti.com}"
OUT_DIR="$REPO_ROOT/.goalie/evidence/mail"
mkdir -p "$OUT_DIR"
RUN_ID="$(date -u +%Y%m%dT%H%M%SZ)-$$"
OUT="$OUT_DIR/dnssec_propagation_${RUN_ID}.json"
LATEST="$OUT_DIR/dnssec_propagation_latest.json"

bash "$REPO_ROOT/scripts/mail/whm-dnssec-export.sh" "$DOMAIN" >/dev/null 2>&1 || true
EXPORT="$OUT_DIR/dnssec_${DOMAIN}_latest.json"

python3 - "$EXPORT" "$DOMAIN" "$OUT" "$LATEST" <<'PY'
import json, subprocess, sys, time
from pathlib import Path
export_p, domain, out, latest = [Path(x) for x in sys.argv[1:5]]
wanted = []
if export_p.is_file():
    for ln in json.loads(export_p.read_text()).get("registrar_ds_lines", []):
        if " IN DS " in ln and " 2 " in ln.split(" IN DS ", 1)[-1]:
            wanted.append(ln.split(" IN DS ", 1)[-1].strip())
pub = subprocess.run(["dig", "+short", "DS", domain, "@8.8.8.8"], capture_output=True, text=True)
public = [l.strip() for l in pub.stdout.splitlines() if l.strip() and not l.startswith("DS ")]
matched = [w for w in wanted if w in public]
ok = len(wanted) > 0 and len(matched) >= min(1, len(wanted))
doc = {
    "schema": "mail.dnssec.propagation.v1",
    "domain": domain,
    "timestamp_utc": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    "cpanel_ds_sha256": wanted,
    "public_ds": public,
    "matched": matched,
    "propagated": ok,
    "exit_code": 0 if ok else 2,
}
out.write_text(json.dumps(doc, indent=2) + "\n")
latest.write_text(json.dumps({"path": str(out), **doc}, indent=2) + "\n")
print(f"dnssec_propagated={ok} matched={len(matched)}/{len(wanted)}")
sys.exit(0 if ok else 2)
PY
