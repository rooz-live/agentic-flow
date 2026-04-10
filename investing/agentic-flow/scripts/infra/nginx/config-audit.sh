#!/usr/bin/env bash
# config-audit.sh — Audit Nginx configuration for drift and failure risks
#
# Detects the exact class of issues that caused the Nginx/cPanel outage:
#   - Upstream hostnames that don't resolve (prevents nginx start)
#   - proxy_pass with hostnames but NO resolver directive (static DNS = fragile)
#   - Config syntax errors (nginx -t)
#   - Missing PHP-FPM extensions that cause HTTP 500
#
# Usage: ./config-audit.sh [--fix-resolver]
#   --fix-resolver  Add resolver directive to proxy configs that reference hostnames
#
# Requires: SSH access to server (SSH_ALIAS)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${SCRIPT_DIR}/../credentials/.env.cpanel"

if [[ -f "$ENV_FILE" ]]; then
    source "$ENV_FILE"
else
    SSH_ALIAS="${SSH_ALIAS:-rooz-aws}"
fi

FIX_RESOLVER=false
ISSUES=0

while [[ $# -gt 0 ]]; do
    case "$1" in
        --fix-resolver) FIX_RESOLVER=true; shift ;;
        *)              echo "Unknown option: $1"; exit 1 ;;
    esac
done

ssh_cmd() {
    ssh -o ConnectTimeout=10 -o BatchMode=yes "$SSH_ALIAS" "$@" 2>/dev/null
}

log()  { echo "[$(date -u +%H:%M:%S)] $*"; }
ok()   { echo "  ✓ $*"; }
warn() { echo "  ⚠ $*"; ISSUES=$((ISSUES + 1)); }
fail() { echo "  ✗ $*"; ISSUES=$((ISSUES + 1)); }

log "Nginx Configuration Audit — ${SSH_ALIAS}"
echo ""

# ─── 1. Nginx service status ─────────────────────────────────────────────────
log "Checking Nginx service..."
NGINX_RUNNING=$(ssh_cmd "sudo systemctl is-active nginx 2>/dev/null || sudo systemctl is-active ea-nginx 2>/dev/null" || echo "inactive")
if [[ "$NGINX_RUNNING" == "active" ]]; then
    ok "Nginx is running"
else
    fail "Nginx is NOT running (status: ${NGINX_RUNNING})"
fi

# ─── 2. Config syntax test ───────────────────────────────────────────────────
log "Testing Nginx configuration syntax..."
NGINX_TEST=$(ssh_cmd "sudo nginx -t 2>&1" || true)
if echo "$NGINX_TEST" | grep -q "syntax is ok"; then
    ok "nginx -t: syntax OK"
else
    fail "nginx -t: SYNTAX ERROR"
    echo "$NGINX_TEST" | grep -i "error" | head -5 | sed 's/^/    /'
fi

# ─── 3. Find proxy_pass directives with hostnames (not IPs) ──────────────────
echo ""
log "Scanning for fragile proxy_pass patterns..."

# Find all proxy_pass directives that use hostnames (not 127.0.0.1/localhost/IPs)
FRAGILE_CONFIGS=$(ssh_cmd "sudo grep -rn 'proxy_pass.*https\?://' /etc/nginx/conf.d/ 2>/dev/null | grep -vE '(127\.0\.0\.\d+|localhost|\\\$|_backend_)' | grep -vE '^\s*#'" || true)

if [[ -n "$FRAGILE_CONFIGS" ]]; then
    while IFS= read -r line; do
        CONFIG_FILE=$(echo "$line" | cut -d: -f1)
        LINE_NUM=$(echo "$line" | cut -d: -f2)
        CONTENT=$(echo "$line" | cut -d: -f3-)

        # Check if the same config block has a resolver directive
        HAS_RESOLVER=$(ssh_cmd "sudo grep -c 'resolver ' '$CONFIG_FILE'" | tail -1 | tr -dc '0-9')
        HAS_RESOLVER=${HAS_RESOLVER:-0}

        if [[ "$HAS_RESOLVER" -eq 0 ]]; then
            warn "Fragile proxy_pass (no resolver): ${CONFIG_FILE}:${LINE_NUM}"
            echo "    ${CONTENT}"
        else
            ok "proxy_pass with resolver present: $(basename "$CONFIG_FILE")"
        fi
    done <<< "$FRAGILE_CONFIGS"
else
    ok "No fragile proxy_pass patterns found"
fi

# ─── 4. Check upstream blocks resolve ────────────────────────────────────────
echo ""
log "Checking upstream block resolution..."

UPSTREAM_HOSTS=$(ssh_cmd "sudo grep -rhoP 'upstream\s+\K\S+' /etc/nginx/conf.d/ 2>/dev/null | sort -u" || true)
UPSTREAM_SERVERS=$(ssh_cmd "sudo grep -rhoP 'server\s+\K[^:;\s]+' /etc/nginx/conf.d/ 2>/dev/null | grep -v '^\d' | sort -u" || true)

# Check that key hostnames in server directives resolve
for host in $UPSTREAM_SERVERS; do
    # Skip IPs, variables, unix sockets, short tokens, nginx syntax fragments
    if [[ "$host" =~ ^[0-9] || "$host" =~ ^\$ || "$host" =~ ^unix: || "$host" == "localhost" || ${#host} -lt 4 || "$host" =~ ^[{}_] || ! "$host" =~ \. ]]; then
        continue
    fi
    RESOLVES=$(ssh_cmd "getent hosts $host 2>/dev/null | head -1" || true)
    if [[ -n "$RESOLVES" ]]; then
        ok "Upstream '${host}' resolves"
    else
        fail "Upstream '${host}' DOES NOT resolve — will prevent Nginx startup"
    fi
done

# ─── 5. PHP-FPM health check ─────────────────────────────────────────────────
echo ""
log "Checking PHP-FPM status..."

PHP_FPM_RUNNING=$(ssh_cmd "sudo systemctl is-active ea-php*-php-fpm 2>/dev/null | head -1" || echo "unknown")
if [[ "$PHP_FPM_RUNNING" == "active" ]]; then
    ok "PHP-FPM is running"
else
    warn "PHP-FPM status: ${PHP_FPM_RUNNING}"
fi

# Check critical PHP extensions for Passbolt
PASSBOLT_EXTS=$(ssh_cmd "/opt/cpanel/ea-php84/root/usr/bin/php -m 2>/dev/null" || true)
for ext in gnupg gd intl mbstring curl openssl; do
    if echo "$PASSBOLT_EXTS" | grep -qi "^${ext}$"; then
        ok "PHP extension: ${ext}"
    else
        fail "PHP extension MISSING: ${ext} — Passbolt will return HTTP 500"
    fi
done

# ─── 6. Check for recently modified configs (drift detection) ─────────────────
echo ""
log "Checking for recently modified Nginx configs (last 24h)..."
RECENT_CHANGES=$(ssh_cmd "sudo find /etc/nginx/conf.d/ -name '*.conf' -mmin -1440 2>/dev/null" || true)
if [[ -n "$RECENT_CHANGES" ]]; then
    echo "$RECENT_CHANGES" | while IFS= read -r f; do
        warn "Recently modified: ${f}"
    done
else
    ok "No Nginx configs changed in last 24h"
fi

# ─── Summary ─────────────────────────────────────────────────────────────────
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [[ $ISSUES -eq 0 ]]; then
    echo "Nginx Audit: ALL CLEAR"
else
    echo "Nginx Audit: ${ISSUES} issue(s) found"
fi
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
exit $( [[ $ISSUES -eq 0 ]] && echo 0 || echo 1 )
