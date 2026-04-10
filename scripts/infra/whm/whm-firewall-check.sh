#!/bin/bash
# whm-firewall-check.sh — Check/manage WHM firewall rules and account status
# @business-context WSJF-42: WHM infrastructure automation
# @adr ADR-018: Security boundary enforcement
#
# PASSIVE (read-only) commands — no gate required:
#   ./whm-firewall-check.sh status          # Firewall + CSF status
#   ./whm-firewall-check.sh accounts        # List cPanel accounts
#   ./whm-firewall-check.sh blocked         # Show blocked IPs
#
# ACTIVE (write) commands — require --confirm flag:
#   ./whm-firewall-check.sh allow <ip> --confirm   # Whitelist an IP
#   ./whm-firewall-check.sh deny  <ip> --confirm   # Block an IP
#
# The --confirm flag prevents accidental invocation from scripts or
# copy-paste errors. All write actions are logged to .goalie/whm-audit.jsonl.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../credentials/.env.cpanel" 2>/dev/null || true

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'
log() { echo -e "${CYAN}[WHM]${NC} $*"; }
success() { echo -e "${GREEN}[✓]${NC} $*"; }
warn() { echo -e "${YELLOW}[⚠]${NC} $*"; }
error() { echo -e "${RED}[✗]${NC} $*" >&2; }

if [[ -z "${WHM_API_TOKEN:-}" ]]; then
    error "WHM_API_TOKEN not set. Source credentials/.env.cpanel or export it."
    exit 1
fi

WHM_API="https://${WHM_HOST}:2087/json-api"

whm_api() {
    local func="$1"
    shift
    curl -sk -H "Authorization: whm ${WHM_USER}:${WHM_API_TOKEN}" \
        "${WHM_API}/${func}?api.version=1" "$@"
}

# Check firewall / CSF status
check_status() {
    log "Checking server security status..."

    # Server load
    local load
    load=$(whm_api loadavg 2>/dev/null)
    if [[ -n "$load" ]]; then
        echo "$load" | python3 -c "
import json, sys
try:
    d = json.load(sys.stdin)
    data = d.get('data', d)
    one = data.get('one', '?')
    five = data.get('five', '?')
    fifteen = data.get('fifteen', '?')
    print(f'  Load average: {one} / {five} / {fifteen} (1/5/15 min)')
except: print('  Load: unable to parse')
" 2>/dev/null || warn "Could not parse load average"
    fi

    # Apache status
    local apache
    apache=$(whm_api servicestatus -d "service=httpd" 2>/dev/null)
    if [[ -n "$apache" ]]; then
        echo "$apache" | python3 -c "
import json, sys
try:
    d = json.load(sys.stdin)
    services = d.get('data', {}).get('service', [])
    for s in (services if isinstance(services, list) else [services]):
        name = s.get('name', '?')
        running = '✅ UP' if s.get('running', 0) else '❌ DOWN'
        print(f'  {name}: {running}')
except: print('  Services: unable to parse')
" 2>/dev/null || warn "Could not parse service status"
    fi

    # CSF firewall (via SSH if available)
    if [[ -n "${CPANEL_SSH_KEY:-}" ]] && [[ -f "${CPANEL_SSH_KEY/#\~/$HOME}" ]]; then
        log "Checking CSF firewall via SSH..."
        local csf_status
        csf_status=$(ssh -i "${CPANEL_SSH_KEY/#\~/$HOME}" -p "${CPANEL_SSH_PORT:-22}" \
            "${WHM_USER}@${WHM_HOST}" "csf -l 2>/dev/null | head -20" 2>/dev/null) || true
        if [[ -n "$csf_status" ]]; then
            echo "$csf_status"
            success "CSF firewall active."
        else
            warn "CSF not accessible via SSH (may need root)."
        fi
    else
        warn "SSH key not configured — skipping CSF check. Set CPANEL_SSH_KEY."
    fi
}

# List cPanel accounts
list_accounts() {
    log "Listing cPanel accounts..."
    local result
    result=$(whm_api listaccts 2>/dev/null)

    echo "$result" | python3 -c "
import json, sys
try:
    d = json.load(sys.stdin)
    accts = d.get('data', {}).get('acct', d.get('acct', []))
    print(f'cPanel Accounts ({len(accts)} total):')
    print(f'{\"User\":<20} {\"Domain\":<35} {\"Plan\":<15} {\"Suspended\":<10}')
    print('-' * 85)
    for a in accts:
        user = a.get('user', '?')
        domain = a.get('domain', '?')
        plan = a.get('plan', '?')
        susp = '⛔ YES' if a.get('suspended', 0) else 'No'
        print(f'{user:<20} {domain:<35} {plan:<15} {susp:<10}')
except Exception as e:
    print(f'Error parsing accounts: {e}')
" 2>/dev/null
}

# Show blocked IPs (CSF deny list)
show_blocked() {
    log "Fetching blocked IPs..."
    if [[ -n "${CPANEL_SSH_KEY:-}" ]] && [[ -f "${CPANEL_SSH_KEY/#\~/$HOME}" ]]; then
        ssh -i "${CPANEL_SSH_KEY/#\~/$HOME}" -p "${CPANEL_SSH_PORT:-22}" \
            "${WHM_USER}@${WHM_HOST}" "csf -g '' 2>/dev/null | grep -c DENY; echo 'total blocked IPs'; csf -d 2>/dev/null | tail -20" 2>/dev/null || \
            warn "Could not fetch CSF deny list."
    else
        warn "SSH key not configured. Set CPANEL_SSH_KEY for firewall operations."
    fi
}

# Allow/deny IP — requires --confirm flag
manage_ip() {
    local action="$1" ip="$2" confirmed="${3:-}"

    # ── Write gate: require --confirm to prevent accidental mutations ─────────────
    if [[ "$confirmed" != "--confirm" ]]; then
        error "Write operation '${action} ${ip}' requires explicit --confirm flag."
        error "Usage: $0 ${action} ${ip} --confirm"
        error "This prevents accidental IP changes from scripts or copy-paste errors."
        exit 1
    fi

    if [[ -z "${CPANEL_SSH_KEY:-}" ]] || [[ ! -f "${CPANEL_SSH_KEY/#\~/$HOME}" ]]; then
        error "SSH key required for firewall operations. Set CPANEL_SSH_KEY."
        exit 1
    fi

    local csf_cmd
    case "$action" in
        allow) csf_cmd="csf -a $ip 'Added via whm-firewall-check.sh'" ;;
        deny)  csf_cmd="csf -d $ip 'Blocked via whm-firewall-check.sh'" ;;
        *) error "Unknown action: $action"; exit 1 ;;
    esac

    # ── Audit log before execution ────────────────────────────────────────────
    local audit_dir; audit_dir="${PROJECT_ROOT:-.}/.goalie"
    mkdir -p "$audit_dir"
    printf '{"timestamp":"%s","action":"%s","ip":"%s","host":"%s","user":"%s"}\n' \
        "$(date -u +'%Y-%m-%dT%H:%M:%SZ')" "$action" "$ip" "$WHM_HOST" "$(whoami)" \
        >> "$audit_dir/whm-audit.jsonl"

    log "${action^}ing IP ${ip} (confirmed)..."
    ssh -i "${CPANEL_SSH_KEY/#\~/$HOME}" -p "${CPANEL_SSH_PORT:-22}" \
        "${WHM_USER}@${WHM_HOST}" "$csf_cmd" 2>&1 && \
        success "IP ${ip} ${action}ed." || \
        error "Failed to ${action} IP ${ip}."
}

# Main
case "${1:-help}" in
    status)
        check_status
        ;;
    accounts)
        list_accounts
        ;;
    blocked)
        show_blocked
        ;;
    allow)
        [[ -z "${2:-}" ]] && { error "Usage: $0 allow <ip> --confirm"; exit 1; }
        manage_ip "allow" "$2" "${3:-}"
        ;;
    deny|block)
        [[ -z "${2:-}" ]] && { error "Usage: $0 deny <ip> --confirm"; exit 1; }
        manage_ip "deny" "$2" "${3:-}"
        ;;
    help|--help|-h)
        echo "WHM Firewall & Account Manager"
        echo ""
        echo "Usage: $0 <command> [args]"
        echo ""
        echo "PASSIVE commands (read-only):"
        echo "  status              Server load, services, CSF firewall"
        echo "  accounts            List cPanel accounts"
        echo "  blocked             Show CSF blocked IPs"
        echo ""
        echo "ACTIVE commands (require --confirm):"
        echo "  allow <ip> --confirm    Whitelist an IP in CSF"
        echo "  deny <ip>  --confirm    Block an IP in CSF"
        echo ""
        echo "Write actions are logged to .goalie/whm-audit.jsonl"
        echo "Environment: WHM_HOST, WHM_USER, WHM_API_TOKEN, CPANEL_SSH_KEY"
        ;;
    *)
        error "Unknown command: $1. Use --help for usage."
        exit 1
        ;;
esac
