#!/usr/bin/env bash
set -euo pipefail

# cPanel DNS Zone Manager
# Manages DNS records via cPanel UAPI (DNS::mass_edit_zone, DNS::parse_zone)
# Requires: CPANEL_HOST, CPANEL_USER, CPANEL_TOKEN (from .env.cpanel)

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=../lib/source-cpanel-env.sh
source "$SCRIPT_DIR/../lib/source-cpanel-env.sh"
source_cpanel_env_init "$SCRIPT_DIR"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

CPANEL_HOST="${CPANEL_HOST:-}"
CPANEL_USER="${CPANEL_USER:-}"
CPANEL_TOKEN="${CPANEL_TOKEN:-}"

check_config() {
    if [ -z "$CPANEL_HOST" ] || [ -z "$CPANEL_USER" ] || [ -z "$CPANEL_TOKEN" ]; then
        echo -e "${RED}Error: cPanel credentials not configured${NC}"
        echo "Copy config/.env.cpanel.template or credentials/.env.cpanel.example → config/.env.cpanel"
        exit 1
    fi
}

call_uapi() {
    local module=$1
    local function=$2
    shift 2
    curl -s -H "Authorization: cpanel $CPANEL_USER:$CPANEL_TOKEN" \
        "https://$CPANEL_HOST:2083/execute/$module/$function?$*"
}

# List all DNS records for a zone
list_zone() {
    local domain="${1:?Usage: $0 list <domain>}"
    echo -e "${CYAN}DNS records for $domain:${NC}"
    echo ""
    call_uapi DNS parse_zone "zone=$domain" | \
        jq -r '.data[] | select(.type != null) | "\(.type)\t\(.name)\t\(.ttl)\t\(.record // .address // .cname // .exchange // .txtdata // "")"' | \
        column -t -s $'\t'
}

# Add a DNS record
add_record() {
    local domain="${1:?Usage: $0 add <domain> <type> <name> <value> [ttl]}"
    local rtype="${2:?Missing record type (A, CNAME, MX, TXT)}"
    local name="${3:?Missing record name}"
    local value="${4:?Missing record value}"
    local ttl="${5:-14400}"

    rtype=$(echo "$rtype" | tr '[:lower:]' '[:upper:]')

    echo -e "${CYAN}Adding $rtype record: $name → $value (TTL: $ttl)${NC}"

    local params="zone=$domain&serial=1"
    case "$rtype" in
        A)
            params+="&add={\"dname\":\"$name\",\"ttl\":$ttl,\"record_type\":\"A\",\"data\":[\"$value\"]}"
            ;;
        CNAME)
            params+="&add={\"dname\":\"$name\",\"ttl\":$ttl,\"record_type\":\"CNAME\",\"data\":[\"$value\"]}"
            ;;
        MX)
            local priority="${6:-10}"
            params+="&add={\"dname\":\"$name\",\"ttl\":$ttl,\"record_type\":\"MX\",\"data\":[\"$priority\",\"$value\"]}"
            ;;
        TXT)
            params+="&add={\"dname\":\"$name\",\"ttl\":$ttl,\"record_type\":\"TXT\",\"data\":[\"$value\"]}"
            ;;
        *)
            echo -e "${RED}Unsupported record type: $rtype${NC}"
            exit 1
            ;;
    esac

    response=$(call_uapi DNS mass_edit_zone "$params")

    if echo "$response" | jq -e '.status == 1' > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Record added${NC}"
    else
        echo -e "${RED}✗ Failed${NC}"
        echo "$response" | jq -r '.errors[]' 2>/dev/null || echo "$response"
    fi
}

# Delete a DNS record by line number
delete_record() {
    local domain="${1:?Usage: $0 delete <domain> <line_number>}"
    local line="${2:?Missing line number (use 'list' to find it)}"

    echo -e "${YELLOW}Deleting record at line $line from $domain...${NC}"

    response=$(call_uapi DNS mass_edit_zone "zone=$domain&serial=1&remove=$line")

    if echo "$response" | jq -e '.status == 1' > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Record deleted${NC}"
    else
        echo -e "${RED}✗ Failed${NC}"
        echo "$response" | jq -r '.errors[]' 2>/dev/null || echo "$response"
    fi
}

# Quick lookup — resolve from public DNS
lookup() {
    local name="${1:?Usage: $0 lookup <fqdn>}"
    echo -e "${CYAN}Public DNS resolution for $name:${NC}"
    echo -n "  A:     " && dig +short "$name" A
    echo -n "  CNAME: " && dig +short "$name" CNAME
    echo -n "  MX:    " && dig +short "$name" MX
    echo -n "  NS:    " && dig +short "$name" NS
}

show_usage() {
    cat << EOF
cPanel DNS Zone Manager

Usage: $0 <command> [options]

Commands:
  list   <domain>                          List all DNS records
  add    <domain> <type> <name> <value>    Add a record (A, CNAME, MX, TXT)
  delete <domain> <line_number>            Delete a record by line number
  lookup <fqdn>                            Public DNS lookup

Examples:
  $0 list bhopti.com
  $0 add bhopti.com A api 203.0.113.10
  $0 add bhopti.com CNAME www bhopti.com.
  $0 add bhopti.com MX bhopti.com. mail.bhopti.com. 10
  $0 add bhopti.com TXT bhopti.com. "v=spf1 include:_spf.google.com ~all"
  $0 delete bhopti.com 15
  $0 lookup api.bhopti.com

Credentials:
  Source config/.env.cpanel or set CPANEL_HOST, CPANEL_USER, CPANEL_TOKEN

EOF
}

case "${1:-help}" in
    list|l)     check_config; list_zone "${2:-}" ;;
    add|a)      check_config; shift; add_record "$@" ;;
    delete|d)   check_config; delete_record "${2:-}" "${3:-}" ;;
    lookup|q)   lookup "${2:-}" ;;
    help|h|*)   show_usage ;;
esac
