#!/usr/bin/env bash
# cpanel-dns-mass-edit.sh — Manage DNS records via cPanel UAPI (DNS::mass_edit_zone)
#
# Business Context: WSJF-1 Infrastructure Automation
# Risk Level: HIGH (Direct mutation of DNS records and traffic routing)
#
# Usage:
#   ./cpanel-dns-mass-edit.sh <zone> <action=payload> [action=payload ...]
#
# Example:
#   ./cpanel-dns-mass-edit.sh example.com 'add={"dname":"test","ttl":14400,"record_type":"A","data":["10.0.0.1"]}'

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# 1. Resolve and source credentials
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../../../.." && pwd)"
ENV_FILE="${PROJECT_ROOT}/credentials/.env.cpanel"

if [[ -f "$ENV_FILE" ]]; then
    log_info "Sourcing credentials from $ENV_FILE"
    source "$ENV_FILE"
else
    log_warn "Credential file not found at $ENV_FILE. Relying on exported environment variables."
fi

# Ensure required credentials are set
CPANEL_DOMAIN="${CPANEL_DOMAIN:-}"
CPANEL_USER="${CPANEL_USER:-}"
CPANEL_TOKEN="${CPANEL_TOKEN:-}"
CPANEL_HOST="${CPANEL_HOST:-$CPANEL_DOMAIN}" # Fallback to domain if host isn't explicitly defined

if [[ -z "$CPANEL_DOMAIN" || -z "$CPANEL_USER" || -z "$CPANEL_TOKEN" ]]; then
    log_error "Missing required credentials (CPANEL_DOMAIN, CPANEL_USER, CPANEL_TOKEN)."
    log_info "Please ensure credentials/.env.cpanel is properly populated."
    exit 1
fi

# 2. Parse Arguments
if [[ $# -lt 2 ]]; then
    log_error "Insufficient arguments provided."
    echo "Usage: $0 <zone> <action_key=action_json> ..."
    echo "Example: $0 example.com 'add={\"dname\":\"sub\",\"ttl\":300,\"record_type\":\"A\",\"data\":[\"1.2.3.4\"]}'"
    exit 1
fi

ZONE="$1"
shift

# 3. Construct API Request
API_URL="https://${CPANEL_HOST}:2083/execute/DNS/mass_edit_zone"

CURL_ARGS=(
    -sS
    -X POST
    -H "Authorization: cpanel ${CPANEL_USER}:${CPANEL_TOKEN}"
    --data-urlencode "zone=${ZONE}"
)

# Append dynamic operations (add, edit, remove)
for OPERATION in "$@"; do
    CURL_ARGS+=( --data-urlencode "$OPERATION" )
done

log_info "Executing DNS::mass_edit_zone on zone: ${ZONE} at ${CPANEL_HOST}"

# 4. Execute API Call
RESPONSE=$(curl "${CURL_ARGS[@]}" "${API_URL}")

# 5. Output Handling
if command -v jq >/dev/null 2>&1; then
    # Parse for UAPI errors
    ERRORS=$(echo "$RESPONSE" | jq -r '.errors // empty')
    if [[ "$ERRORS" != "[]" && -n "$ERRORS" ]]; then
        log_error "API returned errors:"
        echo "$RESPONSE" | jq '.errors'
        exit 1
    else
        log_info "DNS operation completed successfully."
        echo "$RESPONSE" | jq '.'
    fi
else
    log_warn "jq not found. Outputting raw response:"
    echo "$RESPONSE"

    # Basic textual fallback for error detection
    if echo "$RESPONSE" | grep -q '"errors":\['; then
        # Check if the array is empty by removing whitespace
        if ! echo "$RESPONSE" | grep -q '"errors": *\[ *\]'; then
            log_error "API operation encountered an error. See raw output above."
            exit 1
        fi
    fi
fi
