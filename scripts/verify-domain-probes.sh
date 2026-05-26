#!/usr/bin/env bash
# verify-domain-probes.sh — External DNS/HTTP probe with evidence artifact
# Writes .goalie/evidence/domain-probes/probe_<run_id>.json
# Exit 0 = all domains reachable, Exit 2 = at least one domain unreachable
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
EVIDENCE_DIR="$PROJECT_ROOT/.goalie/evidence/domain-probes"
RUN_ID="$(date +%Y%m%d_%H%M%S)"
PROBE_FILE="$EVIDENCE_DIR/probe_${RUN_ID}.json"

mkdir -p "$EVIDENCE_DIR"

# Domains to probe (derived from src/proxies/edge_gateway.cfg + deploy/k8s/ingress.yaml)
DOMAINS=(
  "billing.bhopti.com"
  "crm.bhopti.com"
  "shop.bhopti.com"
  "api.interface.tag.ooo"
  "git.tag.ooo"
)

# DNS server to test authoritative resolution
AUTH_NS="23.92.79.2"

TOTAL=0
PASS=0
FAIL=0
RESULTS="[]"

for domain in "${DOMAINS[@]}"; do
  TOTAL=$((TOTAL + 1))
  
  # DNS check (via Google DNS)
  dns_result=$(dig +short @8.8.8.8 "$domain" A +time=3 +tries=1 2>/dev/null)
  if [[ -n "$dns_result" ]]; then
    dns_status="RESOLVED"
  else
    dns_status="SERVFAIL"
  fi
  
  # HTTP check (only if DNS resolved)
  if [[ "$dns_status" == "RESOLVED" ]]; then
    http_code=$(curl -sI --connect-timeout 5 --max-time 10 -o /dev/null -w "%{http_code}" "https://$domain/" 2>/dev/null || true)
  else
    http_code="000"
  fi
  
  # Port 53 check on authoritative NS
  auth_dns=$(dig +short @"$AUTH_NS" "$domain" A +time=2 +tries=1 2>/dev/null)
  if [[ -n "$auth_dns" ]]; then
    auth_status="RESPONDING"
  else
    auth_status="DOWN"
  fi
  
  # Determine pass/fail
  if [[ "$dns_status" == "RESOLVED" && "$http_code" =~ ^[1-5][0-9]{2}$ ]]; then
    status="PASS"
    PASS=$((PASS + 1))
  else
    status="FAIL"
    FAIL=$((FAIL + 1))
  fi
  
  RESULTS=$(echo "$RESULTS" | python3 -c "
import json, sys
arr = json.load(sys.stdin)
arr.append({
  'domain': '$domain',
  'dns_status': '$dns_status',
  'http_code': '$http_code',
  'auth_ns_status': '$auth_status',
  'verdict': '$status'
})
print(json.dumps(arr))
")
done

# Write evidence artifact
HEAD_SHA=$(git -C "$PROJECT_ROOT" rev-parse --short HEAD 2>/dev/null || echo "unknown")

python3 -c "
import json
evidence = {
  'probe_id': 'probe_${RUN_ID}',
  'timestamp': '$(date -u +%Y-%m-%dT%H:%M:%SZ)',
  'head_sha': '$HEAD_SHA',
  'summary': {
    'total': $TOTAL,
    'pass': $PASS,
    'fail': $FAIL,
    'verdict': 'ALL_REACHABLE' if $FAIL == 0 else 'DOMAINS_UNREACHABLE'
  },
  'auth_ns': '$AUTH_NS',
  'results': $RESULTS
}
with open('$PROBE_FILE', 'w') as f:
  json.dump(evidence, f, indent=2)
print(json.dumps(evidence['summary'], indent=2))
"

echo ""
echo "Evidence: $PROBE_FILE"

if [[ $FAIL -gt 0 ]]; then
  echo "PROBE VERDICT: DOMAINS_UNREACHABLE ($FAIL/$TOTAL failed)"
  exit 2
else
  echo "PROBE VERDICT: ALL_REACHABLE ($PASS/$TOTAL passed)"
  exit 0
fi
