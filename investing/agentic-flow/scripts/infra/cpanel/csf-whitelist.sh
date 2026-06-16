#!/usr/bin/env bash
# csf-whitelist.sh — Automated CSF IP whitelisting via WHM API
#
# Breaks the SSH lockout cycle: CSF blocks IP → can't SSH → more timeouts → deeper block
# Uses WHM API over HTTPS (port 2087) which is never blocked by CSF.
#
# Credential chain: 1Password → WHM API token → CSF unblock + allow
#
# Usage:
#   ./csf-whitelist.sh              # Unblock + whitelist current IP
#   ./csf-whitelist.sh --check      # Check if current IP is blocked
#   ./csf-whitelist.sh --ip X.X.X.X # Whitelist a specific IP
#   ./csf-whitelist.sh --setup      # Store WHM API token in 1Password
#
# Prerequisites:
#   - 1Password CLI (`op`) installed and account configured
#   - WHM API token (generate: WHM → Development → Manage API Tokens)
#   - Or: set WHM_API_TOKEN environment variable to skip 1Password
#
# The WHM API token can be generated at:
#   https://yo.tag.ooo:2087 → Development → Manage API Tokens
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${SCRIPT_DIR}/../credentials/.env.cpanel"

# Defaults
SERVER_HOSTNAME="yo.tag.ooo"
WHM_PORT="2087"
WHM_USER="root"
OP_ITEM="YoCloud - root"
OP_TOKEN_FIELD="WHM API Token"

# Source env if available
if [[ -f "$ENV_FILE" ]]; then
    source "$ENV_FILE"
    SERVER_HOSTNAME="${SERVER_HOSTNAME:-yo.tag.ooo}"
fi

MODE="whitelist"
TARGET_IP=""

while [[ $# -gt 0 ]]; do
    case "$1" in
        --check) MODE="check"; shift ;;
        --setup) MODE="setup"; shift ;;
        --ip)    TARGET_IP="$2"; shift 2 ;;
        *)       echo "Unknown: $1"; exit 1 ;;
    esac
done

# ─── Get current public IP ────────────────────────────────────────────────────
get_my_ip() {
    curl -sS --connect-timeout 5 https://ifconfig.me 2>/dev/null \
        || curl -sS --connect-timeout 5 https://api.ipify.org 2>/dev/null \
        || curl -sS --connect-timeout 5 https://checkip.amazonaws.com 2>/dev/null
}

# ─── Get WHM API token ────────────────────────────────────────────────────────
get_whm_token() {
    # 1. Check environment variable first
    if [[ -n "${WHM_API_TOKEN:-}" ]]; then
        echo "$WHM_API_TOKEN"
        return 0
    fi

    # 2. Check .env.cpanel
    if [[ -f "$ENV_FILE" ]] && grep -q 'WHM_API_TOKEN=' "$ENV_FILE" 2>/dev/null; then
        grep 'WHM_API_TOKEN=' "$ENV_FILE" | cut -d= -f2- | tr -d '"'
        return 0
    fi

    # 3. Try 1Password
    if command -v op &>/dev/null; then
        local token
        token=$(op item get "$OP_ITEM" --fields label="$OP_TOKEN_FIELD" 2>/dev/null)
        if [[ -n "$token" && "$token" != *"isn't a field"* ]]; then
            echo "$token"
            return 0
        fi
    fi

    return 1
}

# ─── WHM API call ─────────────────────────────────────────────────────────────
whm_api() {
    local endpoint="$1"
    local token
    token=$(get_whm_token) || {
        echo "[ERROR] No WHM API token found."
        echo "  Set WHM_API_TOKEN env var, add to .env.cpanel, or run: $0 --setup"
        exit 1
    }

    curl -ksS --connect-timeout 10 \
        -H "Authorization: whm ${WHM_USER}:${token}" \
        "https://${SERVER_HOSTNAME}:${WHM_PORT}/${endpoint}" 2>/dev/null
}

# ─── Setup: store WHM API token in 1Password ─────────────────────────────────
setup_token() {
    echo "=== WHM API Token Setup ==="
    echo ""
    echo "1. Log into WHM: https://${SERVER_HOSTNAME}:${WHM_PORT}"
    echo "2. Go to: Development → Manage API Tokens"
    echo "3. Create a new token with these ACLs:"
    echo "   - ConfigServer Security & Firewall (or 'all')"
    echo "4. Copy the token string"
    echo ""
    echo "Paste your WHM API token (input hidden):"
    read -rs TOKEN_INPUT
    echo ""

    if [[ -z "$TOKEN_INPUT" ]]; then
        echo "[ERROR] No token provided."
        exit 1
    fi

    # Verify the token works
    echo "Verifying token..."
    local result
    result=$(curl -ksS --connect-timeout 10 \
        -H "Authorization: whm ${WHM_USER}:${TOKEN_INPUT}" \
        "https://${SERVER_HOSTNAME}:${WHM_PORT}/json-api/version" 2>/dev/null)

    if echo "$result" | grep -q '"version"'; then
        echo "✓ Token verified — WHM API accessible"

        # Store in 1Password if available
        if command -v op &>/dev/null; then
            echo "Storing in 1Password (${OP_ITEM})..."
            op item edit "$OP_ITEM" "${OP_TOKEN_FIELD}=${TOKEN_INPUT}" 2>/dev/null && {
                echo "✓ Stored in 1Password"
            } || {
                echo "⚠ Could not update 1Password item. Storing in .env.cpanel instead."
                echo "WHM_API_TOKEN=\"${TOKEN_INPUT}\"" >> "$ENV_FILE"
                echo "✓ Stored in .env.cpanel"
            }
        else
            echo "Storing in .env.cpanel..."
            echo "WHM_API_TOKEN=\"${TOKEN_INPUT}\"" >> "$ENV_FILE"
            echo "✓ Stored in .env.cpanel"
        fi
    else
        echo "✗ Token verification failed. Check the token and try again."
        exit 1
    fi
}

# ─── Main ─────────────────────────────────────────────────────────────────────
IP="${TARGET_IP:-$(get_my_ip)}"

if [[ -z "$IP" ]]; then
    echo "[ERROR] Could not determine public IP."
    exit 1
fi

case "$MODE" in
    setup)
        setup_token
        ;;

    check)
        echo "Checking CSF status for ${IP}..."
        RESULT=$(whm_api "json-api/cpanel_api_call?cpanel_jsonapi_user=root&cpanel_jsonapi_apiversion=2&cpanel_jsonapi_module=CSF&cpanel_jsonapi_func=grep&ip=${IP}" 2>/dev/null)
        if echo "$RESULT" | grep -q "DENY\|BLOCK"; then
            echo "✗ ${IP} is BLOCKED in CSF"
        else
            echo "✓ ${IP} is NOT blocked"
        fi
        ;;

    whitelist)
        echo "=== CSF Whitelist: ${IP} ==="

        # Step 1: Remove from deny list
        echo "  Removing from deny list..."
        whm_api "json-api/csf_unblock?api.version=1&ip=${IP}" > /dev/null 2>&1
        echo "  ✓ Deny removal sent"

        # Step 2: Add to allow list
        echo "  Adding to allow list..."
        RESULT=$(whm_api "json-api/csf_allow?api.version=1&ip=${IP}&comment=Automated+whitelist+$(date -u +%Y%m%d)")
        if echo "$RESULT" | grep -q '"result":1\|"status":1'; then
            echo "  ✓ Added to CSF allow list"
        else
            # Try alternative API endpoint
            whm_api "json-api/csf_allow?api.version=1&ip=${IP}" > /dev/null 2>&1
            echo "  ✓ Allow request sent"
        fi

        # Step 3: Verify SSH
        echo ""
        echo "  Testing SSH (5s timeout)..."
        sleep 2
        if ssh -o ConnectTimeout=5 -o BatchMode=yes "${SSH_ALIAS:-rooz-aws}" "hostname" 2>/dev/null; then
            echo "  ✓ SSH working"
        else
            echo "  ⚠ SSH still blocked — CSF may need manual restart or the API endpoint may differ"
            echo "    Manual fallback: WHM → ConfigServer Security & Firewall → Quick Allow → ${IP}"
        fi
        ;;
esac
