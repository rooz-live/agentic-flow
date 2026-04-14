#!/usr/bin/env bash
# dns-zone-audit.sh — Audit DNS zones and DNSSEC chain of trust
#
# Detects the exact class of issues that broke Passbolt SSL renewal:
#   - Child zones with DNSKEY but no DS in parent (broken chain)
#   - NSEC3 opt-out=0 with unsigned delegations
#   - Orphaned DS records at registrar pointing to non-existent keys
#   - Zones where DNSSEC validation returns SERVFAIL
#
# Usage: ./dns-zone-audit.sh [--fix] [--zone ZONE]
#   --fix   Apply safe fixes (disable DNSSEC on child zones with broken chains)
#   --zone  Audit a specific zone only
#
# Requires: SSH access to server (SSH_ALIAS), dig, openssl
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${SCRIPT_DIR}/../credentials/.env.cpanel"

# Source credentials
if [[ -f "$ENV_FILE" ]]; then
    # shellcheck source=/dev/null
    source "$ENV_FILE"
else
    echo "[WARN] No .env.cpanel found; using defaults. Copy .env.cpanel.template → .env.cpanel"
    SSH_ALIAS="${SSH_ALIAS:-rooz-aws}"
    DNSSEC_ZONES="${DNSSEC_ZONES:-tag.ooo rooz.live}"
fi

FIX_MODE=false
SINGLE_ZONE=""
ISSUES=0
FIXES=0

while [[ $# -gt 0 ]]; do
    case "$1" in
        --fix)  FIX_MODE=true; shift ;;
        --zone) SINGLE_ZONE="$2"; shift 2 ;;
        *)      echo "Unknown option: $1"; exit 1 ;;
    esac
done

ssh_cmd() {
    ssh -o ConnectTimeout=10 -o BatchMode=yes "$SSH_ALIAS" "$@" 2>/dev/null
}

# Safe SSH helper: always returns output, never fails the pipeline
ssh_lines() { ssh_cmd "$@" || true; }

# Safe SSH grep -c: always returns a clean integer
ssh_count() {
    local result
    result=$(ssh_cmd "$@" 2>/dev/null || true)
    result=$(echo "$result" | tail -1 | tr -dc '0-9')
    echo "${result:-0}"
}

log()  { echo "[$(date -u +%H:%M:%S)] $*"; }
ok()   { echo "  ✓ $*"; }
warn() { echo "  ⚠ $*"; ISSUES=$((ISSUES + 1)); }
fail() { echo "  ✗ $*"; ISSUES=$((ISSUES + 1)); }

# ─── 1. Discover all PowerDNS zones ──────────────────────────────────────────
log "Discovering PowerDNS zones via SSH..."
ALL_ZONES=$(ssh_lines "sudo pdnsutil list-all-zones 2>/dev/null" | grep -v '^$' | sort || true)

if [[ -z "$ALL_ZONES" ]]; then
    echo "[ERROR] Could not list zones. Check SSH connectivity to ${SSH_ALIAS}."
    exit 1
fi

ZONE_COUNT=$(echo "$ALL_ZONES" | wc -l | tr -d ' ')
log "Found ${ZONE_COUNT} zones"

# If single zone requested, filter
if [[ -n "$SINGLE_ZONE" ]]; then
    ALL_ZONES="$SINGLE_ZONE"
fi

# ─── 2. Check each zone's DNSSEC status ─────────────────────────────────────
log "Auditing DNSSEC configuration..."

# Get zones that have DNSSEC keys
SIGNED_ZONES=$(ssh_lines "for z in $ALL_ZONES; do sudo pdnsutil show-zone \$z 2>/dev/null | grep -q 'ID = ' && echo \$z; done")

for zone in $SIGNED_ZONES; do
    echo ""
    log "Zone: ${zone}"

    # Get zone DNSSEC details
    ZONE_INFO=$(ssh_lines "sudo pdnsutil show-zone $zone 2>/dev/null")

    # Extract key info
    KEY_COUNT=$(echo "$ZONE_INFO" | grep -c 'ID = ' || echo "0")
    NSEC_TYPE=$(echo "$ZONE_INFO" | grep -oP 'Zone has \K.*?semantics' || echo "unknown")
    NSEC3_PARAMS=$(echo "$ZONE_INFO" | grep 'NSEC3PARAM' | head -1 | awk '{print $2}' || true)

    ok "Keys: ${KEY_COUNT}, ${NSEC_TYPE}"

    # ── Check 2a: NSEC3 opt-out flag ──
    if [[ -n "$NSEC3_PARAMS" ]]; then
        OPT_OUT=$(echo "$NSEC3_PARAMS" | cut -d' ' -f2)
        if [[ "$OPT_OUT" == "0" ]]; then
            warn "NSEC3 opt-out=0 — unsigned child zone delegations will cause SERVFAIL"
            if $FIX_MODE; then
                log "  → Fixing: Setting NSEC3 opt-out=1 on ${zone}"
                ALGO=$(echo "$NSEC3_PARAMS" | cut -d' ' -f1)
                ITER=$(echo "$NSEC3_PARAMS" | cut -d' ' -f3)
                SALT=$(echo "$NSEC3_PARAMS" | cut -d' ' -f4)
                ssh_cmd "sudo pdnsutil set-nsec3 ${zone} '${ALGO} 1 ${ITER} ${SALT}' narrow && sudo pdnsutil rectify-zone ${zone} && sudo pdns_control reload" && {
                    ok "Fixed NSEC3 opt-out on ${zone}"
                    FIXES=$((FIXES + 1))
                } || fail "Failed to fix NSEC3 on ${zone}"
            fi
        else
            ok "NSEC3 opt-out=1 (unsigned delegations allowed)"
        fi
    fi

    # ── Check 2b: DNSSEC validation from public resolvers ──
    VALIDATION=$(dig @9.9.9.9 "$zone" SOA +dnssec +time=5 2>/dev/null | grep -oP 'status: \K\w+' || echo "TIMEOUT")
    if [[ "$VALIDATION" == "NOERROR" ]]; then
        ok "Public DNSSEC validation: NOERROR"
    elif [[ "$VALIDATION" == "SERVFAIL" ]]; then
        fail "Public DNSSEC validation: SERVFAIL — chain of trust broken"
    else
        warn "Public DNSSEC validation: ${VALIDATION}"
    fi

    # ── Check 2c: DS records match DNSKEY ──
    DS_AT_PARENT=$(dig +short DS "$zone" 2>/dev/null || true)
    DNSKEY_TAGS=$(echo "$ZONE_INFO" | grep -oP 'tag = \K\d+' | sort -u || true)

    if [[ -n "$DS_AT_PARENT" ]]; then
        DS_TAGS=$(echo "$DS_AT_PARENT" | awk '{print $1}' | sort -u)
        for ds_tag in $DS_TAGS; do
            if echo "$DNSKEY_TAGS" | grep -q "^${ds_tag}$"; then
                ok "DS tag ${ds_tag} matches active DNSKEY"
            else
                warn "DS tag ${ds_tag} at parent has NO matching DNSKEY (orphaned DS)"
            fi
        done
    fi
done

# ─── 3. Check for child zones with broken DNSSEC delegation ─────────────────
echo ""
log "Checking child zone DNSSEC delegation chains..."

# Find zones that are subdomains of other zones (e.g. passbolt.yocloud.com under yocloud.com)
for zone in $ALL_ZONES; do
    # Check if this zone is a child of another zone we manage
    PARENT=$(echo "$zone" | sed 's/^[^.]*\.//')
    if echo "$ALL_ZONES" | grep -q "^${PARENT}$"; then
        # This is a child zone. Check if it has DNSSEC but parent has no DS for it
        CHILD_HAS_KEYS=$(ssh_count "sudo pdnsutil show-zone $zone 2>/dev/null | grep -c 'ID = '")

        if [[ "$CHILD_HAS_KEYS" -gt 0 ]]; then
            # Child has DNSSEC keys — check if parent has DS delegation
            PARENT_HAS_DS=$(ssh_count "sudo pdnsutil list-zone $PARENT 2>/dev/null | grep -c 'IN.*DS.*${zone}'")
            NS_DELEGATION=$(ssh_count "sudo pdnsutil list-zone $PARENT 2>/dev/null | grep -c '${zone}.*IN.*NS'")

            if [[ "$PARENT_HAS_DS" -eq 0 ]]; then
                fail "Child zone ${zone} has DNSSEC keys but parent ${PARENT} has NO DS record → broken chain"
                if $FIX_MODE; then
                    log "  → Fixing: Disabling DNSSEC on child zone ${zone}"
                    ssh_cmd "sudo pdnsutil disable-dnssec ${zone} && sudo pdns_control reload" && {
                        ok "Disabled DNSSEC on ${zone}"
                        FIXES=$((FIXES + 1))
                    } || fail "Failed to disable DNSSEC on ${zone}"
                fi
            fi
        else
            ok "Child zone ${zone} (parent: ${PARENT}) — no DNSSEC (safe)"
        fi
    fi
done

# ─── 4. Verify DNSSEC-monitored zones resolve from public DNS ────────────────
echo ""
log "Verifying public resolution for monitored zones..."

for zone in ${DNSSEC_ZONES:-}; do
    RESULT=$(dig @9.9.9.9 "$zone" A +short +time=5 2>/dev/null)
    if [[ -n "$RESULT" ]]; then
        ok "${zone} resolves from Quad9"
    else
        fail "${zone} DOES NOT resolve from Quad9 (possible DNSSEC failure)"
    fi
done

# ─── Summary ─────────────────────────────────────────────────────────────────
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [[ $ISSUES -eq 0 ]]; then
    echo "DNS Zone Audit: ALL CLEAR (${ZONE_COUNT} zones checked)"
else
    echo "DNS Zone Audit: ${ISSUES} issue(s) found"
    if $FIX_MODE; then
        echo "Auto-fixes applied: ${FIXES}"
    else
        echo "Run with --fix to auto-remediate safe issues"
    fi
fi
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
exit $( [[ $ISSUES -eq 0 ]] && echo 0 || echo 1 )
