#!/bin/bash
# cpanel-dns-zone.sh — Manage DNS records via cPanel UAPI
# @business-context WSJF-42: cPanel workflow automation
# @adr ADR-018: Subdomain hierarchy management
#
# Usage:
#   ./cpanel-dns-zone.sh list <domain>
#   ./cpanel-dns-zone.sh add <domain> <name> <type> <value> [ttl]
#   ./cpanel-dns-zone.sh delete <domain> <line_number>
#   ./cpanel-dns-zone.sh check-propagation <domain>

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../credentials/.env.cpanel" 2>/dev/null || true

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'
log() { echo -e "${CYAN}[DNS]${NC} $*"; }
success() { echo -e "${GREEN}[✓]${NC} $*"; }
error() { echo -e "${RED}[✗]${NC} $*" >&2; }

# Validate credentials
if [[ -z "${CPANEL_API_TOKEN:-}" ]]; then
    error "CPANEL_API_TOKEN not set. Source credentials/.env.cpanel or export it."
    exit 1
fi

CPANEL_API="https://${CPANEL_HOST}:2083/execute"

cpanel_api() {
    local module="$1" func="$2"
    shift 2
    curl -s -H "Authorization: cpanel ${CPANEL_USER}:${CPANEL_API_TOKEN}" \
        "${CPANEL_API}/${module}/${func}" "$@"
}

# List all DNS records for a domain
list_records() {
    local domain="$1"
    log "Fetching DNS zone for ${domain}..."
    local result
    result=$(cpanel_api DNS parse_zone -d "zone=${domain}")

    if echo "$result" | python3 -c "import json,sys; d=json.load(sys.stdin); assert d.get('status')==1" 2>/dev/null; then
        echo "$result" | python3 -c "
import json, sys
d = json.load(sys.stdin)
records = d.get('data', [])
print(f'DNS records for domain ({len(records)} total):')
print(f'{\"Line\":>5} {\"Name\":<40} {\"Type\":<8} {\"Value\":<50} {\"TTL\":<8}')
print('-' * 115)
for r in records:
    if isinstance(r, dict):
        line = r.get('line_index', '?')
        name = r.get('dname', r.get('name', ''))
        rtype = r.get('record_type', r.get('type', ''))
        data = r.get('data_b64', r.get('record', r.get('address', '')))
        ttl = r.get('ttl', '')
        print(f'{line:>5} {name:<40} {rtype:<8} {str(data):<50} {str(ttl):<8}')
"
        success "Zone parsed."
    else
        error "Failed to fetch DNS zone."
        echo "$result" | python3 -m json.tool 2>/dev/null || echo "$result"
        return 1
    fi
}

# Add a DNS record
add_record() {
    local domain="$1" name="$2" type="$3" value="$4" ttl="${5:-14400}"
    log "Adding ${type} record: ${name} -> ${value} (TTL ${ttl})"

    local result
    result=$(cpanel_api DNS mass_edit_zone \
        -d "zone=${domain}" \
        -d "add={\"dname\":\"${name}\",\"ttl\":${ttl},\"record_type\":\"${type}\",\"data\":[\"${value}\"]}")

    if echo "$result" | python3 -c "import json,sys; d=json.load(sys.stdin); assert d.get('status')==1" 2>/dev/null; then
        success "Record added: ${name} ${type} ${value}"
    else
        error "Failed to add record."
        echo "$result" | python3 -m json.tool 2>/dev/null || echo "$result"
        return 1
    fi
}

# Delete a DNS record by line number
delete_record() {
    local domain="$1" line="$2"
    log "Deleting record at line ${line} from ${domain}..."

    local result
    result=$(cpanel_api DNS mass_edit_zone \
        -d "zone=${domain}" \
        -d "remove=${line}")

    if echo "$result" | python3 -c "import json,sys; d=json.load(sys.stdin); assert d.get('status')==1" 2>/dev/null; then
        success "Record at line ${line} deleted."
    else
        error "Failed to delete record."
        echo "$result" | python3 -m json.tool 2>/dev/null || echo "$result"
        return 1
    fi
}

# Check DNS propagation
check_propagation() {
    local domain="$1"
    log "Checking DNS propagation for ${domain}..."

    local resolvers=("8.8.8.8" "1.1.1.1" "208.67.222.222" "9.9.9.9")
    local resolver_names=("Google" "Cloudflare" "OpenDNS" "Quad9")

    for i in "${!resolvers[@]}"; do
        local ip
        ip=$(dig +short "$domain" @"${resolvers[$i]}" 2>/dev/null | head -1)
        if [[ -n "$ip" ]]; then
            success "${resolver_names[$i]} (${resolvers[$i]}): ${ip}"
        else
            echo -e "${YELLOW}[⚠]${NC} ${resolver_names[$i]} (${resolvers[$i]}): no response"
        fi
    done
}

# Main
case "${1:-help}" in
    list)
        [[ -z "${2:-}" ]] && { error "Usage: $0 list <domain>"; exit 1; }
        list_records "$2"
        ;;
    add)
        [[ -z "${4:-}" ]] && { error "Usage: $0 add <domain> <name> <type> <value> [ttl]"; exit 1; }
        add_record "$2" "$3" "$4" "$5" "${6:-14400}"
        ;;
    delete)
        [[ -z "${3:-}" ]] && { error "Usage: $0 delete <domain> <line_number>"; exit 1; }
        delete_record "$2" "$3"
        ;;
    check-propagation|propagation)
        [[ -z "${2:-}" ]] && { error "Usage: $0 check-propagation <domain>"; exit 1; }
        check_propagation "$2"
        ;;
    help|--help|-h)
        echo "cPanel DNS Zone Manager"
        echo ""
        echo "Usage: $0 <command> [args]"
        echo ""
        echo "Commands:"
        echo "  list <domain>                          List all DNS records"
        echo "  add <domain> <name> <type> <value>     Add a DNS record"
        echo "  delete <domain> <line_number>          Delete a record by line"
        echo "  check-propagation <domain>             Check DNS propagation"
        echo ""
        echo "Environment: CPANEL_HOST, CPANEL_USER, CPANEL_API_TOKEN"
        ;;
    *)
        error "Unknown command: $1. Use --help for usage."
        exit 1
        ;;
esac
