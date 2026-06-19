#!/usr/bin/env bash
# deploy-edge-cfg.sh — DNS integrity gate for edge_gateway.cfg
#
# NEW script. Closes the SPOF where Caddy config and live DNS drift apart
# silently because ci_assessor.sh soft-skips on TLD outage.
#
# What it does:
#   1. Parse every `fqdn { ... }` block from edge_gateway.cfg.
#   2. For each FQDN, run `dig +short` and compare against the expected
#      origin IP in config/fqdn_registry.yaml.
#   3. Fail (exit 1) if:
#      - FQDN has no A record (DNS not provisioned)
#      - FQDN resolves to an IP not matching fqdn_registry.yaml origin
#      - FQDN appears in edge_gateway.cfg but is absent from fqdn_registry.yaml
#   4. Emit a structured DoD artifact with per-FQDN status.
#
# DoR:  dig available; python3 available; config/ files present.
# DoD:  .goalie/evidence/edge_cfg_deploy_{run_id}.json written.
#
# Usage:
#   bash scripts/deploy/deploy-edge-cfg.sh [--dry-run]
#   --dry-run  — report issues without exiting non-zero (advisory mode)
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ARTIFACT_DIR="$ROOT_DIR/.goalie/evidence"
EDGE_CFG="$ROOT_DIR/src/proxies/edge_gateway.cfg"
FQDN_REGISTRY="$ROOT_DIR/config/fqdn_registry.yaml"

DRY_RUN=false
[[ "${1:-}" == "--dry-run" ]] && DRY_RUN=true

red()    { printf "\033[31m%s\033[0m\n" "$1"; }
green()  { printf "\033[32m%s\033[0m\n" "$1"; }
yellow() { printf "\033[33m%s\033[0m\n" "$1"; }

echo "====================================================================="
echo "🌐 DEPLOY-EDGE-CFG: DNS Integrity Gate"
echo "====================================================================="

# ── DoR: required files ───────────────────────────────────────────────────────
for req in "$EDGE_CFG" "$FQDN_REGISTRY"; do
    if [[ ! -f "$req" ]]; then
        red "❌ [DoR FAIL] Required file missing: $req"
        exit 1
    fi
done

if ! command -v dig &>/dev/null; then
    red "❌ [DoR FAIL] dig is not installed (install bind-utils / dnsutils)."
    exit 1
fi

# ── Parse edge_gateway.cfg: extract FQDNs ────────────────────────────────────
# Lines of the form:  hostname.tld {  or  hostname1.tld, hostname2.tld {
# We strip comments, trailing {, split on commas, strip whitespace.
EDGE_FQDNS=$(python3 - "$EDGE_CFG" <<'PY'
import re, sys

with open(sys.argv[1]) as f:
    content = f.read()

# Remove comment lines
lines = [l for l in content.splitlines() if not l.strip().startswith('#')]

fqdns = []
for line in lines:
    line = line.strip()
    # Match lines that look like: domain.tld {  or  d1.tld, d2.tld {
    # Must contain a dot, end with optional whitespace + {
    if re.search(r'[a-z0-9][\w.-]+\.[a-z]{2,}\s*\{?$', line, re.I):
        # Strip trailing {
        line = line.rstrip('{').strip()
        # Split on comma (multiple vhosts)
        for part in line.split(','):
            part = part.strip()
            # Filter out bare IPs and local addresses (h2c://..., 127.0.0.1:...)
            if re.match(r'^[a-zA-Z0-9][\w.-]+\.[a-zA-Z]{2,}$', part):
                fqdns.append(part)

# Unique, preserving order
seen = set()
for f in fqdns:
    if f not in seen:
        seen.add(f)
        print(f)
PY
)

if [[ -z "$EDGE_FQDNS" ]]; then
    yellow "⚠️  No FQDNs extracted from $EDGE_CFG — check parser regex."
    exit 0
fi

echo "FQDNs found in edge_gateway.cfg:"
while IFS= read -r fqdn; do
    echo "  - $fqdn"
done <<< "$EDGE_FQDNS"
echo ""

# ── Load fqdn_registry.yaml: build FQDN→origin map ──────────────────────────
declare -A REGISTRY_ORIGINS
while IFS='|' read -r rfqdn rorigin; do
    REGISTRY_ORIGINS["$rfqdn"]="$rorigin"
done < <(python3 - "$FQDN_REGISTRY" <<'PY'
import sys

# Simple YAML parser — only needs the domains list structure
with open(sys.argv[1]) as f:
    content = f.read()

import re

# Find all fqdn: and origin: pairs under domains:
entries = re.findall(r'fqdn:\s*([\w.\-]+).*?origin:\s*"?([^\s"]+)"?', content, re.DOTALL)
for fqdn, origin in entries:
    # Skip template placeholders like ${VAR}
    if not origin.startswith('${'):
        print(f"{fqdn}|{origin}")
PY
)

# ── DNS check loop ────────────────────────────────────────────────────────────
VIOLATIONS=0
declare -A RESULTS

while IFS= read -r FQDN; do
    [[ -z "$FQDN" ]] && continue

    RESOLVED=$(dig +short "$FQDN" A 2>/dev/null | head -1 || true)
    EXPECTED="${REGISTRY_ORIGINS[$FQDN]:-}"

    if [[ -z "$RESOLVED" ]]; then
        RESULTS["$FQDN"]="NO_ARECORD"
        red "  ❌ $FQDN — NO A record (DNS not provisioned)"
        VIOLATIONS=$((VIOLATIONS + 1))
    elif [[ -z "$EXPECTED" ]]; then
        RESULTS["$FQDN"]="NOT_IN_REGISTRY"
        yellow "  ⚠️  $FQDN → $RESOLVED — resolves but NOT in fqdn_registry.yaml"
        VIOLATIONS=$((VIOLATIONS + 1))
    elif [[ "$RESOLVED" == "$EXPECTED" ]]; then
        RESULTS["$FQDN"]="OK"
        green "  ✓  $FQDN → $RESOLVED (matches registry)"
    else
        RESULTS["$FQDN"]="IP_MISMATCH"
        red "  ❌ $FQDN → $RESOLVED (expected $EXPECTED from registry) — MISMATCH"
        VIOLATIONS=$((VIOLATIONS + 1))
    fi
done <<< "$EDGE_FQDNS"

echo ""

# ── DoD artifact ──────────────────────────────────────────────────────────────
RUN_ID=$(date +%s)
HASH=$(git rev-parse HEAD 2>/dev/null || echo "no-git")
mkdir -p "$ARTIFACT_DIR"
ARTIFACT_PATH="$ARTIFACT_DIR/edge_cfg_deploy_${RUN_ID}.json"

# Build JSON results array
JSON_RESULTS="["
FIRST=true
for FQDN in "${!RESULTS[@]}"; do
    [[ "$FIRST" == "true" ]] || JSON_RESULTS+=","
    FIRST=false
    JSON_RESULTS+="{\"fqdn\":\"$FQDN\",\"status\":\"${RESULTS[$FQDN]}\"}"
done
JSON_RESULTS+="]"

cat > "$ARTIFACT_PATH" <<EOF
{
  "gate": "deploy-edge-cfg",
  "run_id": "$RUN_ID",
  "hash": "$HASH",
  "timestamp": "$(date -u +'%Y-%m-%dT%H:%M:%SZ')",
  "violations": $VIOLATIONS,
  "dry_run": $DRY_RUN,
  "results": $JSON_RESULTS
}
EOF
ln -sf "$(basename "$ARTIFACT_PATH")" "$ARTIFACT_DIR/last_edge_cfg_deploy.json"
echo "DoD artifact: $ARTIFACT_PATH"

# ── Gate decision ─────────────────────────────────────────────────────────────
if [[ $VIOLATIONS -gt 0 ]]; then
    echo ""
    red "====================================================================="
    red "❌ DNS INTEGRITY GATE: $VIOLATIONS violation(s)"
    red ""
    red "   Most common fix for api.interface.tag.ooo:"
    red "   → Provision A record: api.interface.tag.ooo → 23.92.79.2"
    red "   → Add entry to config/fqdn_registry.yaml"
    red "====================================================================="
    if [[ "$DRY_RUN" == "true" ]]; then
        yellow "   --dry-run mode: exit 0 (advisory only)"
        exit 0
    fi
    exit 1
fi

green "====================================================================="
green "✅ DEPLOY-EDGE-CFG GATE PASSED — all FQDNs resolve correctly"
green "====================================================================="
