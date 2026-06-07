#!/usr/bin/env bash
set -euo pipefail
REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
source "$(dirname "$0")/_mail_infra_env.sh"
OUT_DIR="$REPO_ROOT/.goalie/evidence/mail"
mkdir -p "$OUT_DIR"
DOMAIN="${1:-bhopti.com}"
RUN_ID="$(date -u +%Y%m%dT%H%M%SZ)-$$"
OUT="$OUT_DIR/dnssec_${DOMAIN}_${RUN_ID}.json"
LATEST="$OUT_DIR/dnssec_${DOMAIN}_latest.json"
HEAD_SHA="$(cd "$REPO_ROOT" && git rev-parse HEAD 2>/dev/null || echo unknown)"
RAW="$(ssh -o BatchMode=yes -o ConnectTimeout=20 "$CPANEL_SSH_HOST" \
  "whmapi1 --output=json fetch_ds_records_for_domains domain=${DOMAIN}")"
python3 - "$RAW" "$OUT" "$LATEST" "$DOMAIN" "$RUN_ID" "$HEAD_SHA" <<'PY'
import json, sys, time
from pathlib import Path
raw, out, latest, domain, run_id, head = sys.argv[1:7]
doc_in = json.loads(raw)
meta = doc_in.get("metadata") or {}
keys = ((doc_in.get("data") or {}).get("domains") or [{}])[0].get("ds_records", {}).get("keys") or {}
registrar_lines, ksk_records = [], []
for tag, info in keys.items():
    if (info.get("key_type") or "") not in ("KSK", "CSK"):
        continue
    algo, key_tag = int(info.get("algo_num") or 13), int(info.get("key_tag") or tag)
    for dg in info.get("digests") or []:
        dtype, digest = int(dg.get("algo_num") or 2), (dg.get("digest") or "").strip()
        if digest:
            ksk_records.append({"key_tag": key_tag, "algorithm": algo, "digest_type": dtype, "digest": digest, "key_type": info.get("key_type")})
            registrar_lines.append(f"{domain}. IN DS {key_tag} {algo} {dtype} {digest}")
ok = int(meta.get("result") or 0) == 1
doc = {"schema": "mail.dnssec.ds_export.v1", "domain": domain, "run_id": run_id, "head_sha": head,
       "timestamp_utc": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()), "whm_ok": ok,
       "registrar_ds_lines": registrar_lines, "ksk_ds_records": ksk_records,
       "fa_action": "Paste SHA-256 (digest type 2) DS at registrar; remove stale DS", "roam_touch": "R-MAIL-02",
       "exit_code": 0 if ok and ksk_records else 1}
Path(out).write_text(json.dumps(doc, indent=2) + "\n")
Path(latest).write_text(json.dumps({"path": str(out), **doc}, indent=2) + "\n")
print(f"wrote {out}")
for ln in registrar_lines:
    if " 2 " in f" {ln.split(' IN DS ')[-1]} " or ln.endswith(" 2 " + ln.split()[-1]):
        print(f"REGISTRAR_DS: {ln}")
sys.exit(0 if ok and ksk_records else 1)
PY
