#!/bin/bash
# TLD Server Configuration - Non-localhost HTTP server setup
# Configures dashboard servers for public TLD domains

set -euo pipefail

# Load default configuration if exists
# Use local-like scoped variable preventing PROJECT_ROOT pollution on the caller
TLD_SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TLD_PROJECT_ROOT="$(cd "$TLD_SCRIPT_DIR/../.." && pwd)"
CONFIG_FILE="$TLD_PROJECT_ROOT/.tld-config"

if [[ -f "$CONFIG_FILE" ]]; then
    source "$CONFIG_FILE"
fi

# TLD Domain Configuration (with defaults)
export DASHBOARD_DOMAIN="${DASHBOARD_DOMAIN:-${DASHBOARD_DOMAIN_STAGING:-interface.rooz.live}}"
export DASHBOARD_PORT="${DASHBOARD_PORT:-${DASHBOARD_DEFAULT_PORT:-80}}"
export DASHBOARD_SSL="${DASHBOARD_SSL:-${DASHBOARD_SSL_ENABLED:-true}}"
export DASHBOARD_PROTOCOL="${DASHBOARD_PROTOCOL:-https}"

# Server configuration
export SERVER_BIND_ADDRESS="${SERVER_BIND_ADDRESS:-0.0.0.0}"
export SERVER_WORKERS="${SERVER_WORKERS:-4}"
export SERVER_ACCESS_LOG="${SERVER_ACCESS_LOG:-/var/log/dashboard-access.log}"

# Tunnel provider preferences
export TUNNEL_PROVIDER_PREFERENCE="${TUNNEL_PROVIDER_PREFERENCE:-ngrok,tailscale,cloudflare,localtunnel}"

# Alternative domains for different environments mapping (macOS Bash 3.2 compatible)
get_domain_for_env() {
    local env="${1:-prod}"
    case "$env" in
        "prod") echo "interface.rooz.live" ;;
        "staging") echo "staging.interface.rooz.live" ;;
        "dev") echo "dev.interface.rooz.live" ;;
        "gateway") echo "pur.tag.vote" ;;
        "evidence") echo "hab.yo.life" ;;
        "process") echo "file.720.chat" ;;
        *) echo "$DASHBOARD_DOMAIN" ;;
    esac
}

# Public URL generation
generate_public_url() {
    local env="${1:-prod}"
    local domain=$(get_domain_for_env "$env")
    local port="${2:-$DASHBOARD_PORT}"
    
    # Early Exit: Secure Protocol Path
    if [[ "$DASHBOARD_SSL" == "true" ]]; then
        echo "${DASHBOARD_PROTOCOL}://${domain}:${port}"
        return 0
    fi
    
    # Default Path
    echo "http://${domain}:${port}"
}

# Server startup configuration
configure_server() {
    local env="${1:-prod}"
    local port="${2:-8080}"
    local domain=$(get_domain_for_env "$env")
    
    echo "Configuring server for environment: $env"
    echo "Domain: $domain"
    echo "Public URL: $(generate_public_url $env $port)"
    
    # Export configuration for other scripts
    export DASHBOARD_ENV="$env"
    export DASHBOARD_PUBLIC_URL="$(generate_public_url $env $port)"
    export DASHBOARD_LOCAL_PORT="$port"
}

# Pre-flight checks for TLD setup
check_tld_readiness() {
    echo "Checking TLD readiness..."
    
    # Early Exit: Dependency Injection & Precondition Check
    if ! command -v dig >/dev/null 2>&1; then
        echo "❌ ERROR: Critical Dependency missing: 'dig'. Required for domain resolution validation. Blocked via Early Exit." >&2
        return 1
    fi
    
    if ! command -v lsof >/dev/null 2>&1; then
        echo "❌ ERROR: Critical Dependency missing: 'lsof'. Required for port availability matrix validation. Blocked via Early Exit." >&2
        return 1
    fi
    
    # Early Exit: Domain resolution precondition bound
    local dig_result=$(dig +short "$DASHBOARD_DOMAIN" 2>/dev/null || echo "")
    if [[ -z "$dig_result" ]]; then
        echo "❌ ERROR: Domain $DASHBOARD_DOMAIN is not resolving. Blocked via Early Exit." >&2
        return 1
    fi
    
    # Early Exit: SSL certificates precondition bound
    if [[ "$DASHBOARD_SSL" == "true" ]] && [[ ! -d "/etc/letsencrypt/live/$DASHBOARD_DOMAIN" ]]; then
        echo "❌ ERROR: SSL certificates absent at /etc/letsencrypt/live/$DASHBOARD_DOMAIN. Configure SSL before binding. Blocked via Early Exit." >&2
        return 1
    fi
    
    # Early Exit: Port availability precondition bound
    echo "Checking port $DASHBOARD_PORT..."
    if lsof -i:"$DASHBOARD_PORT" >/dev/null 2>&1; then
        echo "❌ ERROR: Port $DASHBOARD_PORT is already in use. Blocked via Early Exit." >&2
        return 1
    fi
    
    echo "✅ All physical TLD preconditions evaluated gracefully!"
    return 0
}

# Usage info
show_usage() {
    echo "Usage: $0 [command] [options]"
    echo ""
    echo "Commands:"
    echo "  config <env> <port>  Configure server for environment"
    echo "  check               Run pre-flight checks"
    echo "  url <env> <port>    Generate public URL"
    echo ""
    echo "Environments: prod staging dev gateway evidence process"
    echo ""
    echo "Examples:"
    echo "  $0 config prod 80"
    echo "  $0 url staging 8080"
    echo "  $0 check"
}

# Main execution
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    case "${1:-config}" in
        config)
            configure_server "${2:-prod}" "${3:-80}"
            ;;
        check)
            check_tld_readiness
            ;;
        url)
            generate_public_url "${2:-prod}" "${3:-80}"
            ;;
        --help|-h)
            show_usage
            ;;
        *)
            echo "Unknown command: $1"
            show_usage
            exit 1
            ;;
    esac
fi
