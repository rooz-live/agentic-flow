#!/usr/bin/env bash
# COG edge smoke — honest exit codes (anti-CVT)
# Exit 0: all reachable checks pass
# Exit 2: DNS/edge blocked (not a false green)
# Exit 1: reachable but failing assertions
set -u

BASE="${COG_SMOKE_BASE:-https://interface.tag.vote}"
REF="${COGNITUM_REF:-2rbzTT}"
EVIDENCE_DIR="${COG_EVIDENCE_DIR:-.goalie/evidence/cog-upgrade}"
TS="$(date -u +%Y%m%dT%H%M%SZ)"
OUT="${EVIDENCE_DIR}/smoke_${TS}.json"

# Load COGNITUM_WEBHOOK_SECRET from .env if unset
if [ -z "${COGNITUM_WEBHOOK_SECRET:-}" ]; then
  for env_file in .env ../.env ../../.env; do
    if [ -f "$env_file" ]; then
      COGNITUM_WEBHOOK_SECRET=$(grep "^COGNITUM_WEBHOOK_SECRET=" "$env_file" | cut -d'=' -f2- | tr -d '"'\')
      if [ -n "$COGNITUM_WEBHOOK_SECRET" ]; then
        break
      fi
    fi
  done
fi

SECRET="${COGNITUM_WEBHOOK_SECRET:-}"

mkdir -p "$EVIDENCE_DIR"

health_code="000"
cog_code="000"
cog_location=""
webhook_code="-1"
webhook_skip=0
edge_blocked=0
pass=1

health_code="$(curl -sS -o /dev/null -w '%{http_code}' --connect-timeout 10 --max-time 20 "${BASE}/health" 2>/dev/null || echo "000")"
if [[ "$health_code" == "000" ]]; then
  edge_blocked=1
fi

cog_headers="$(curl -sS -I --connect-timeout 10 --max-time 20 "${BASE}/cog" 2>/dev/null || true)"
if [[ -z "$cog_headers" ]]; then
  cog_code="000"
  edge_blocked=1
else
  cog_code="$(echo "$cog_headers" | awk 'toupper($1) ~ /^HTTP/{print $2; exit}')"
  cog_location="$(echo "$cog_headers" | awk 'tolower($1)=="location:"{print $2; exit}' | tr -d '\r')"
fi

if [[ -n "$SECRET" ]]; then
  webhook_code="$(curl -sS -o /dev/null -w '%{http_code}' --connect-timeout 10 --max-time 20 \
    -X POST "${BASE}/webhooks/cognitum" \
    -H 'Content-Type: application/json' \
    -H 'x-cognitum-signature: invalid-smoke-test' \
    -d '{"test":true}' 2>/dev/null || echo "000")"
  if [[ "$webhook_code" == "000" ]]; then
    edge_blocked=1
  fi
else
  webhook_skip=1
fi

[[ "$health_code" == "200" ]] || pass=0
[[ "$cog_code" == "302" ]] || pass=0
[[ "$cog_location" == *"ref=${REF}"* ]] || pass=0
if [[ "$webhook_skip" -eq 0 && "$webhook_code" == "404" ]]; then
  pass=0
fi

python3 - "$OUT" "$TS" "$BASE" "$REF" "$health_code" "$cog_code" "$cog_location" "$webhook_code" "$webhook_skip" "$edge_blocked" "$pass" << 'PY'
import json, sys
out, ts, base, ref, health, cog, loc, wh, skip, blocked, p = sys.argv[1:12]
payload = {
  "timestamp": ts,
  "base": base,
  "ref": ref,
  "checks": {
    "health": {"code": health, "expect": 200},
    "cog": {"code": cog, "location": loc, "expect": f"302 with ref={ref}"},
    "webhook": {"code": wh, "skipped": skip == "1", "expect": "401 when secret set, else skip"},
  },
  "edge_blocked": blocked == "1",
  "pass": p == "1" and blocked != "1",
}
open(out, "w").write(json.dumps(payload, indent=2) + "\n")
print(f"Wrote {out}")
PY

if [[ "$edge_blocked" -eq 1 ]]; then
  echo "BLOCKED: edge/DNS unreachable — exit 2"
  exit 2
fi
if [[ "$pass" -eq 0 ]]; then
  echo "FAIL: reachable checks did not pass — exit 1"
  exit 1
fi
echo "PASS: all reachable checks OK — exit 0"
exit 0
