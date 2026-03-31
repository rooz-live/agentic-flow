#!/bin/bash
# TLD Server Configuration - Non-localhost HTTP server setup
# Configures dashboard servers for public TLD domains

set -euo pipefail

# Load default configuration if exists
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$(dirname "$SCRIPT_DIR/..")" && pwd)"
CONFIG_FILE="$PROJECT_ROOT/.tld-config"

if [[ -f "$CONFIG_FILE" ]]; then
    source "$CONFIG_FILE"
fi

# TLD Domain Configuration (with defaults)
export DASHBOARD_DOMAIN="${DASHBOARD_DOMAIN:-${DASHBOARD_DOMAIN_STAGING:-interface.rooz.live}}"
export DASHBOARD_PORT="${DASHBOARD_PORT:-${DASHBOARD_DEFAULT_PORT:-80}}"
export DASHBOARD_SSL="${DASHBOARD_SSL:-${DASHBOARD_SSL_ENABLED:-true}}"
export DASHBOARD_PROTOCOL="${DASHBOARD_PROTOCOL:-https}"

# Alternative domains for different environments
declare -A DOMAIN_MAPPINGS=(
    ["prod"]="interface.rooz.live"
    ["staging"]="staging.interface.rooz.live"
    ["dev"]="dev.interface.rooz.live"
    ["gateway"]="pur.tag.vote"
    ["evidence"]="hab.yo.life"
    ["process"]="file.720.chat"
)

# Server configuration
export SERVER_BIND_ADDRESS="${SERVER_BIND_ADDRESS:-0.0.0.0}"
export SERVER_WORKERS="${SERVER_WORKERS:-4}"
export SERVER_ACCESS_LOG="${SERVER_ACCESS_LOG:-/var/log/dashboard-access.log}"

# Tunnel provider preferences
export TUNNEL_PROVIDER_PREFERENCE="${TUNNEL_PROVIDER_PREFERENCE:-ngrok,tailscale,cloudflare,localtunnel}"

# Public URL generation
generate_public_url() {
    local env="${1:-prod}"
    local domain="${DOMAIN_MAPPINGS[$env]:-$DASHBOARD_DOMAIN}"
    local port="${2:-$DASHBOARD_PORT}"
    
    if [[ "$DASHBOARD_SSL" == "true" ]]; then
        echo "${DASHBOARD_PROTOCOL}://${domain}:${port}"
    else
        echo "http://${domain}:${port}"
    fi
}

# Server startup configuration
configure_server() {
    local env="${1:-prod}"
    local port="${2:-8080}"
    
    echo "Configuring server for environment: $env"
    echo "Domain: ${DOMAIN_MAPPINGS[$env]}"
    echo "Public URL: $(generate_public_url $env $port)"
    
    # Export configuration for other scripts
    export DASHBOARD_ENV="$env"
    export DASHBOARD_PUBLIC_URL="$(generate_public_url $env $port)"
    export DASHBOARD_LOCAL_PORT="$port"
}

# Pre-flight checks for TLD setup
check_tld_readiness() {
    echo "Checking TLD readiness..."
    
    # Check domain resolution
    if command -v dig >/dev/null 2>&1; then
        echo "Checking domain resolution for $DASHBOARD_DOMAIN..."
        dig +short "$DASHBOARD_DOMAIN" || echo "⚠️ Domain not resolving"
    fi
    
    # Check SSL certificates
    if [[ "$DASHBOARD_SSL" == "true" ]]; then
        echo "SSL enabled - checking certificates..."
        if [[ -d "/etc/letsencrypt/live/$DASHBOARD_DOMAIN" ]]; then
            echo "✅ SSL certificates found"
        else
            echo "⚠️ SSL certificates not found at /etc/letsencrypt/live/$DASHBOARD_DOMAIN"
        fi
    fi
    
    # Check port availability
    echo "Checking port $DASHBOARD_PORT..."
    if lsof -i:"$DASHBOARD_PORT" >/dev/null 2>&1; then
        echo "⚠️ Port $DASHBOARD_PORT already in use"
    else
        echo "✅ Port $DASHBOARD_PORT is available"
    fi
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
    echo "Environments: ${!DOMAIN_MAPPINGS[*]}"
    echo ""
    echo "Examples:"
    echo "  $0 config prod 80"
    echo "  $0 url staging 8080"
    echo "  $0 check"
}

# Main execution
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
