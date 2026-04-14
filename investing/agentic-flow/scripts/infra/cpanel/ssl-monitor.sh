#!/usr/bin/env bash
# ssl-monitor.sh — Monitor SSL certificate expiry across all domains
#
# Runs locally (no SSH needed). Checks each domain's cert via TLS handshake.
# Reports: OK (>30d), WARN (<30d), CRITICAL (<7d), EXPIRED
#
# Usage: ./ssl-monitor.sh [--json] [--domain DOMAIN]
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${SCRIPT_DIR}/../credentials/.env.cpanel"

if [[ -f "$ENV_FILE" ]]; then
    source "$ENV_FILE"
else
    SSH_ALIAS="${SSH_ALIAS:-rooz-aws}"
    MONITOR_DOMAINS="${MONITOR_DOMAINS:-passbolt.tag.ooo yo.tag.ooo bhopti.com rooz.live}"
    SSL_WARN_DAYS="${SSL_WARN_DAYS:-30}"
    SSL_CRIT_DAYS="${SSL_CRIT_DAYS:-7}"
fi

JSON_MODE=false
SINGLE_DOMAIN=""
ISSUES=0

while [[ $# -gt 0 ]]; do
    case "$1" in
        --json)   JSON_MODE=true; shift ;;
        --domain) SINGLE_DOMAIN="$2"; shift 2 ;;
        *)        echo "Unknown option: $1"; exit 1 ;;
    esac
done

DOMAINS="${SINGLE_DOMAIN:-$MONITOR_DOMAINS}"
NOW_EPOCH=$(date +%s)
JSON_OUT="["

check_cert() {
    local domain="$1"
    local port="${2:-443}"

    CERT_INFO=$(echo | openssl s_client -connect "${domain}:${port}" -servername "$domain" 2>/dev/null | openssl x509 -noout -dates -subject -issuer 2>/dev/null || true)

    if [[ -z "$CERT_INFO" ]]; then
        echo "  ✗ ${domain}:${port} — could not retrieve certificate"
        ISSUES=$((ISSUES + 1))
        return
    fi

    NOT_AFTER=$(echo "$CERT_INFO" | grep notAfter | cut -d= -f2)
    ISSUER=$(echo "$CERT_INFO" | grep issuer | sed 's/.*CN=//' | cut -d'/' -f1)

    # Convert expiry to epoch (macOS and GNU compatible)
    if date -j -f "%b %d %H:%M:%S %Y %Z" "$NOT_AFTER" +%s >/dev/null 2>&1; then
        EXPIRY_EPOCH=$(date -j -f "%b %d %H:%M:%S %Y %Z" "$NOT_AFTER" +%s)
    else
        EXPIRY_EPOCH=$(date -d "$NOT_AFTER" +%s 2>/dev/null || echo "0")
    fi

    DAYS_LEFT=$(( (EXPIRY_EPOCH - NOW_EPOCH) / 86400 ))

    if [[ $DAYS_LEFT -lt 0 ]]; then
        STATUS="EXPIRED"
        echo "  ✗ ${domain} — EXPIRED ${DAYS_LEFT#-} days ago (issuer: ${ISSUER})"
        ISSUES=$((ISSUES + 1))
    elif [[ $DAYS_LEFT -lt $SSL_CRIT_DAYS ]]; then
        STATUS="CRITICAL"
        echo "  ✗ ${domain} — expires in ${DAYS_LEFT}d (issuer: ${ISSUER})"
        ISSUES=$((ISSUES + 1))
    elif [[ $DAYS_LEFT -lt $SSL_WARN_DAYS ]]; then
        STATUS="WARNING"
        echo "  ⚠ ${domain} — expires in ${DAYS_LEFT}d (issuer: ${ISSUER})"
        ISSUES=$((ISSUES + 1))
    else
        STATUS="OK"
        echo "  ✓ ${domain} — ${DAYS_LEFT}d remaining (issuer: ${ISSUER})"
    fi

    if $JSON_MODE; then
        JSON_OUT="${JSON_OUT}{\"domain\":\"${domain}\",\"days_left\":${DAYS_LEFT},\"status\":\"${STATUS}\",\"issuer\":\"${ISSUER}\",\"expires\":\"${NOT_AFTER}\"},"
    fi
}

echo "[$(date -u +%H:%M:%S)] SSL Certificate Monitor"
echo ""

for domain in $DOMAINS; do
    check_cert "$domain"
done

# Also check WHM/cPanel ports if main server
if echo "$DOMAINS" | grep -q "${SERVER_HOSTNAME:-yo.tag.ooo}"; then
    echo ""
    echo "  Service ports on ${SERVER_HOSTNAME:-yo.tag.ooo}:"
    for port in 2083 2087; do
        check_cert "${SERVER_HOSTNAME:-yo.tag.ooo}" "$port"
    done
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [[ $ISSUES -eq 0 ]]; then
    echo "SSL Monitor: ALL CLEAR"
else
    echo "SSL Monitor: ${ISSUES} issue(s)"
    echo "Trigger AutoSSL: ssh ${SSH_ALIAS} 'sudo /usr/local/cpanel/bin/autossl_check --user=USER'"
fi
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if $JSON_MODE; then
    JSON_OUT="${JSON_OUT%,}]"
    echo "$JSON_OUT" | python3 -m json.tool 2>/dev/null || echo "$JSON_OUT"
fi

exit $( [[ $ISSUES -eq 0 ]] && echo 0 || echo 1 )
