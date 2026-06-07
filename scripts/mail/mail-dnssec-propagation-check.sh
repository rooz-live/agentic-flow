#!/usr/bin/env bash
set -euo pipefail
REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
source "$(dirname "$0")/_mail_infra_env.sh"
DOMAIN="${1:-bhopti.com}"
OUT_DIR="$REPO_ROOT/.goalie/evidence/mail"
mkdir -p "$OUT_DIR"
OUT="$OUT_DIR/dnssec_propagation_$(date -u +%Y%m%dT%H%M%SZ)-$$.json"
LATEST="$OUT_DIR/dnssec_propagation_latest.json"
EXPORT="$OUT_DIR/dnssec_${DOMAIN}_latest.json"

bash "$REPO_ROOT/scripts/mail/whm-dnssec-export.sh" "$DOMAIN" >/dev/null 2>&1 || true

python3 - "$EXPORT" "$DOMAIN" "$OUT" "$LATEST" <<'PY'
import json, subprocess, sys, time
from pathlib import Path
export_p = Path(sys.argv[1])
domain = str(sys.argv[2])
out = Path(sys.argv[3])
latest = Path(sys.argv[4])
wanted = []
if export_p.is_file():
    for ln in json.loads(export_p.read_text()).get("registrar_ds_lines", []):
        part = ln.split(" IN DS ", 1)[-1].strip()
        if " 2 " in f" {part} ":
            wanted.append(part)
pub = subprocess.run(["dig", "+short", "DS", domain, "@8.8.8.8"], capture_output=True, text=True)
public = []
for line in pub.stdout.splitlines():
    line = line.strip()
    if not line or line.startswith("DS "):
        continue
    parts = line.split()
    if len(parts) >= 4:
        digest = "".join(parts[3:]).lower()
        public.append(f"{parts[0]} {parts[1]} {parts[2]} {digest}".lower())
matched = [w for w in wanted if w.lower() in public]
ok = bool(wanted) and len(matched) >= 1
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
for m in matched:
    print(f"  OK {m}")
for w in wanted:
    if w not in matched:
        print(f"  PENDING {w}")
sys.exit(0 if ok else 2)
PY
