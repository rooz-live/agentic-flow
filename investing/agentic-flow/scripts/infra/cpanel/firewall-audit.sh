#!/usr/bin/env bash
# firewall-audit.sh — Audit CSF/iptables firewall configuration
#
# Compares live CSF config against expected port baseline.
# Detects: unexpected open ports, missing expected ports, CSF service status,
# blocked IPs count, and iptables rule count anomalies.
#
# Usage: ./firewall-audit.sh [--snapshot] [--diff SNAPSHOT_FILE]
#   --snapshot  Save current config as baseline snapshot
#   --diff      Compare current config against a previous snapshot
#
# Requires: SSH access to server (SSH_ALIAS)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${SCRIPT_DIR}/../credentials/.env.cpanel"
SNAPSHOT_DIR="${SCRIPT_DIR}/../snapshots"

if [[ -f "$ENV_FILE" ]]; then
    source "$ENV_FILE"
else
    SSH_ALIAS="${SSH_ALIAS:-rooz-aws}"
    EXPECTED_TCP_IN="${EXPECTED_TCP_IN:-20,21,22,25,53,80,110,143,443,465,587,993,995,2077,2078,2079,2080,2082,2083,2086,2087,2095,2096}"
fi

SNAPSHOT_MODE=false
DIFF_FILE=""
ISSUES=0

while [[ $# -gt 0 ]]; do
    case "$1" in
        --snapshot) SNAPSHOT_MODE=true; shift ;;
        --diff)     DIFF_FILE="$2"; shift 2 ;;
        *)          echo "Unknown option: $1"; exit 1 ;;
    esac
done

ssh_cmd() {
    ssh -o ConnectTimeout=10 -o BatchMode=yes "$SSH_ALIAS" "$@" 2>/dev/null
}

log()  { echo "[$(date -u +%H:%M:%S)] $*"; }
ok()   { echo "  ✓ $*"; }
warn() { echo "  ⚠ $*"; ((ISSUES++)); }
fail() { echo "  ✗ $*"; ((ISSUES++)); }

log "Firewall Audit — ${SSH_ALIAS}"
echo ""

# ─── 1. CSF service status ──────────────────────────────────────────────────
log "Checking CSF service status..."
CSF_STATUS=$(ssh_cmd "sudo csf -l 2>/dev/null | head -3" || echo "CSF NOT AVAILABLE")

if echo "$CSF_STATUS" | grep -q "iptables"; then
    ok "CSF is active"
else
    fail "CSF may not be running or not installed"
fi

# Check if CSF is in TESTING mode
CSF_TESTING=$(ssh_cmd "sudo grep '^TESTING ' /etc/csf/csf.conf 2>/dev/null | awk -F'\"' '{print \$2}'" || echo "unknown")
if [[ "$CSF_TESTING" == "1" ]]; then
    warn "CSF is in TESTING mode — firewall rules are temporary"
elif [[ "$CSF_TESTING" == "0" ]]; then
    ok "CSF is in production mode (TESTING=0)"
fi

# ─── 2. TCP_IN port comparison ───────────────────────────────────────────────
echo ""
log "Comparing TCP_IN ports against baseline..."

LIVE_TCP_IN=$(ssh_cmd "sudo grep '^TCP_IN' /etc/csf/csf.conf 2>/dev/null | head -1 | awk -F'\"' '{print \$2}'" || echo "")

if [[ -z "$LIVE_TCP_IN" ]]; then
    fail "Could not read TCP_IN from CSF config"
else
    # Convert to sorted arrays for comparison
    LIVE_PORTS=$(echo "$LIVE_TCP_IN" | tr ',' '\n' | sort -n)
    EXPECTED_PORTS=$(echo "$EXPECTED_TCP_IN" | tr ',' '\n' | sort -n)

    # Find unexpected ports (in live but not expected)
    UNEXPECTED=$(comm -23 <(echo "$LIVE_PORTS") <(echo "$EXPECTED_PORTS"))
    if [[ -n "$UNEXPECTED" ]]; then
        for port in $UNEXPECTED; do
            warn "Unexpected open port: TCP ${port} (in CSF but not in baseline)"
        done
    else
        ok "No unexpected TCP_IN ports"
    fi

    # Find missing ports (in expected but not live)
    MISSING=$(comm -13 <(echo "$LIVE_PORTS") <(echo "$EXPECTED_PORTS"))
    if [[ -n "$MISSING" ]]; then
        for port in $MISSING; do
            warn "Missing expected port: TCP ${port} (in baseline but not in CSF)"
        done
    else
        ok "All expected ports are open"
    fi
fi

# ─── 3. TCP_OUT check ────────────────────────────────────────────────────────
echo ""
log "Checking TCP_OUT configuration..."
LIVE_TCP_OUT=$(ssh_cmd "sudo grep '^TCP_OUT' /etc/csf/csf.conf 2>/dev/null | head -1 | awk -F'\"' '{print \$2}'" || echo "")
if [[ -n "$LIVE_TCP_OUT" ]]; then
    # Critical outbound ports that must be open
    for required in 25 53 80 443; do
        if echo "$LIVE_TCP_OUT" | tr ',' '\n' | grep -q "^${required}$"; then
            ok "TCP_OUT ${required} open"
        else
            fail "TCP_OUT ${required} CLOSED — may break outbound mail/DNS/HTTP"
        fi
    done
fi

# ─── 4. Blocked IPs count ────────────────────────────────────────────────────
echo ""
log "Checking blocked IPs..."
DENY_COUNT=$(ssh_cmd "sudo wc -l < /etc/csf/csf.deny 2>/dev/null" || echo "0")
ok "Blocked IPs: ${DENY_COUNT}"
if [[ "$DENY_COUNT" -gt 10000 ]]; then
    warn "High deny count (${DENY_COUNT}) — may impact performance. Consider pruning."
fi

# ─── 5. iptables rule count ──────────────────────────────────────────────────
echo ""
log "Checking iptables rule count..."
RULE_COUNT=$(ssh_cmd "sudo iptables -L -n 2>/dev/null | wc -l" || echo "0")
ok "iptables rules: ${RULE_COUNT} lines"
if [[ "$RULE_COUNT" -gt 5000 ]]; then
    warn "Very high iptables rule count (${RULE_COUNT}) — may impact network performance"
fi

# ─── 6. Snapshot mode ────────────────────────────────────────────────────────
if $SNAPSHOT_MODE; then
    mkdir -p "$SNAPSHOT_DIR"
    SNAP_FILE="${SNAPSHOT_DIR}/firewall-$(date -u +%Y%m%d-%H%M%S).snapshot"
    {
        echo "# Firewall snapshot $(date -u)"
        echo "TCP_IN=${LIVE_TCP_IN}"
        echo "TCP_OUT=${LIVE_TCP_OUT}"
        echo "CSF_TESTING=${CSF_TESTING}"
        echo "DENY_COUNT=${DENY_COUNT}"
        echo "IPTABLES_RULES=${RULE_COUNT}"
    } > "$SNAP_FILE"
    ok "Snapshot saved: ${SNAP_FILE}"
fi

# ─── 7. Diff against previous snapshot ───────────────────────────────────────
if [[ -n "$DIFF_FILE" && -f "$DIFF_FILE" ]]; then
    echo ""
    log "Comparing against snapshot: ${DIFF_FILE}"
    PREV_TCP_IN=$(grep '^TCP_IN=' "$DIFF_FILE" | cut -d= -f2)
    if [[ "$LIVE_TCP_IN" != "$PREV_TCP_IN" ]]; then
        warn "TCP_IN has CHANGED since snapshot"
        echo "    Previous: ${PREV_TCP_IN}"
        echo "    Current:  ${LIVE_TCP_IN}"
    else
        ok "TCP_IN unchanged since snapshot"
    fi
fi

# ─── Summary ─────────────────────────────────────────────────────────────────
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [[ $ISSUES -eq 0 ]]; then
    echo "Firewall Audit: ALL CLEAR"
else
    echo "Firewall Audit: ${ISSUES} issue(s) found"
fi
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
exit $( [[ $ISSUES -eq 0 ]] && echo 0 || echo 1 )
