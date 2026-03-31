#!/bin/bash
# tunnel-url-tracker.sh — Track free tunnel URLs for splitcite affiliate branding upgrade path
# Purpose: Archive Tailscale/ngrok URLs until ready for paid custom domain

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
EXIT_CODES_REGISTRY="${EXIT_CODES_REGISTRY:-$PROJECT_ROOT/_SYSTEM/_AUTOMATION/exit-codes-robust.sh}"
# shellcheck disable=SC1090
source "$EXIT_CODES_REGISTRY" 2>/dev/null || true
EXIT_SUCCESS="${EXIT_SUCCESS:-0}"
EXIT_INVALID_ARGS="${EXIT_INVALID_ARGS:-10}"
EXIT_INVALID_FORMAT="${EXIT_INVALID_FORMAT:-12}"

TRACKER_FILE="${HOME}/Documents/code/investing/agentic-flow/.tunnel-url-history.jsonl"
mkdir -p "$(dirname "$TRACKER_FILE")"

# Initialize if empty
if [[ ! -f "$TRACKER_FILE" ]]; then
    echo '{"event":"init","timestamp":"'$(date -Iseconds)'","note":"Tunnel URL tracker for splitcite affiliate branding"}' > "$TRACKER_FILE"
fi

log_url() {
    local provider="$1"
    local url="$2"
    local purpose="${3:-dashboard}"
    local upgrade_ready="${4:-false}"
    if [[ -z "$provider" || -z "$url" ]]; then
        echo "[ERROR] Usage: $0 log <provider> <url> [purpose] [upgrade_ready]" >&2
        return "$EXIT_INVALID_ARGS"
    fi
    
    local entry="{\"timestamp\":\"$(date -Iseconds)\",\"provider\":\"$provider\",\"url\":\"$url\",\"purpose\":\"$purpose\",\"upgrade_ready\":$upgrade_ready,\"upgrade_target\":\"interface.rooz.live\",\"notes\":\"\"}"
    
    echo "$entry" >> "$TRACKER_FILE"
    echo "[TRACKED] $provider: $url"
    return "$EXIT_SUCCESS"
}

current_status() {
    echo "═══════════════════════════════════════════════════════════════"
    echo "TUNNEL URL TRACKER — Splitcite Affiliate Branding Path"
    echo "═══════════════════════════════════════════════════════════════"
    echo ""
    
    if [[ -f "$TRACKER_FILE" ]]; then
        echo "Recent URLs (last 10):"
        tail -10 "$TRACKER_FILE" | while read -r line; do
            if echo "$line" | grep -q '"url"'; then
                local provider=$(echo "$line" | grep -o '"provider":"[^"]*"' | cut -d'"' -f4)
                local url=$(echo "$line" | grep -o '"url":"[^"]*"' | cut -d'"' -f4)
                local time=$(echo "$line" | grep -o '"timestamp":"[^"]*"' | cut -d'"' -f4 | cut -d'T' -f1)
                echo "  [$time] $provider: $url"
            fi
        done
    fi
    
    echo ""
    echo "Upgrade Target: interface.rooz.live"
    echo "Current Provider Strategy:"
    echo "  - Tailscale Funnel: Free, requires DNS CNAME"
    echo "  - ngrok Free: Random URLs, webhook inspection"
    echo "  - ngrok Pro (\$20/mo): Static domain, WAF, OAuth"
    echo "═══════════════════════════════════════════════════════════════"
}

# Command dispatch
case "${1:-status}" in
    log)
        log_url "${2:-}" "${3:-}" "${4:-dashboard}" "${5:-false}"
        ;;
    status)
        current_status
        ;;
    history)
        if [[ ! -f "$TRACKER_FILE" ]]; then
            echo "No history yet"
            exit "$EXIT_INVALID_FORMAT"
        fi
        cat "$TRACKER_FILE"
        ;;
    clear)
        > "$TRACKER_FILE"
        echo '{"event":"cleared","timestamp":"'$(date -Iseconds)'"}' > "$TRACKER_FILE"
        echo "History cleared"
        ;;
    *)
        echo "Usage: $0 {log <provider> <url> [purpose] [upgrade_ready]|status|history|clear}"
        exit "$EXIT_INVALID_ARGS"
        ;;
esac

exit "$EXIT_SUCCESS"
