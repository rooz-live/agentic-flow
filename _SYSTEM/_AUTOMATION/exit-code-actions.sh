#!/bin/bash
# _SYSTEM/_AUTOMATION/exit-code-actions.sh
# Exit Code to Action Mapping for Tunnel Orchestration
# Maps semantic exit codes to actionable dashboard commands

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/exit-codes-robust.sh" 2>/dev/null || true

# Exit Code Action Registry
# Format: CODE|SEVERITY|ACTION|COMMAND|DESCRIPTION

declare -A EXIT_ACTIONS=(
    # Success Zone (0-9)
    [0]="SUCCESS|info|none|echo 'Tunnel active'|All systems operational"
    [1]="SUCCESS|info|log|echo 'Tunnel active with warnings'|Success with non-critical warnings"
    
    # Client/Config Errors (10-49)
    [10]="ERROR|high|fix_args|echo 'Usage: cascade-tunnel.sh {start|stop|status|url} [port]'|Invalid arguments provided"
    [11]="ERROR|high|check_file|echo 'Verify email file path exists'|File not found"
    
    # Validation Errors (100-149)
    [110]="ERROR|high|fix_dates|echo 'Rewrite temporal references with concrete dates'|Date in past or stale temporal reference detected"
    [111]="ERROR|high|replace_placeholders|echo 'Replace all {{PLACEHOLDER}} tokens before send'|Template placeholders detected in outbound artifact"
    [120]="WARNING|medium|dedupe|echo 'Check sent fingerprints to avoid duplicates'|Duplicate artifact detected"
    
    # Tunnel Orchestration Infrastructure Errors (211-221)
    [211]="ERROR|critical|kill_port|lsof -ti:8080 | xargs kill|Port 8080 already in use - kill existing process"
    [212]="ERROR|critical|restart_http|cd ~/Documents/Personal/CLT/MAA/Uptown/BHOPTI-LEGAL && python3 -m http.server 8080|HTTP server failed to start - manual restart required"
    [213]="WARNING|medium|next_tier|echo 'Falling back to ngrok...'|Tailscale tunnel failed - auto-failover engaged"
    [214]="WARNING|medium|ngrok_v3_check|ngrok config check && ngrok config add-authtoken <token>|ngrok tunnel failed - check v3 config and api_key"
    [215]="WARNING|medium|next_tier|echo 'Falling back to localtunnel...'|Cloudflare tunnel failed - auto-failover engaged"
    [216]="WARNING|high|manual|echo 'All automated tunnels failed. Try: ./cascade-tunnel.sh start'|localtunnel failed - manual intervention required"
    [217]="ERROR|critical|restart_all|./cascade-tunnel.sh start|All tunnel providers failed - full restart required"
    [218]="WARNING|medium|refresh|./cascade-tunnel.sh status|Tunnel URL expired - refresh status"
    [219]="ERROR|high|restart_http|./cascade-tunnel.sh start|Error 1033: Origin unreachable - restart tunnel"
    [221]="WARNING|medium|health_check|curl -I http://localhost:8080|Health check failed - verify HTTP server"
    
    # ngrok v3 Specific (170-179)
    [170]="ERROR|high|ngrok_auth|ngrok config add-authtoken <YOUR_TOKEN>|ngrok api_key missing or invalid"
    [171]="WARNING|medium|ngrok_config|cp _SYSTEM/_AUTOMATION/ngrok-v3-config.yml ~/.ngrok2/ngrok.yml|ngrok v3 config file missing"
    [172]="INFO|low|ngrok_reserve|ngrok http 8080 --domain=interface-tag-vote.ngrok.io|Upgrade to ngrok Basic for reserved domain"
    
    # Multi-Ledger Domain Actions (150-153)
    [150]="ERROR|high|check_legal|echo 'Review legal context and citations'|Legal context (law) failed - check case citations"
    [151]="ERROR|high|check_wsjf|echo 'Validate WSJF score and purpose'|Purpose validation (pur) failed - review WSJF score"
    [152]="ERROR|high|check_habitability|echo 'Document habitability evidence'|Habitability (hab) evidence failed - update documentation"
    [153]="ERROR|high|check_filing|echo 'Verify filing permissions and status'|Filing (file) execution failed - check file access"
    
    # Governance / ROAM
    [156]="WARNING|high|update_roam|./scripts/contract-enforcement-gate.sh verify|ROAM tracker stale - refresh required"
)

# Get action for exit code
get_exit_action() {
    local code=$1
    local action_info="${EXIT_ACTIONS[$code]:-"UNKNOWN|critical|manual|echo 'Unknown exit code: $code'|No action defined"}"
    
    echo "$action_info"
}

# Get severity level
get_severity() {
    local code=$1
    local action_info
    action_info=$(get_exit_action "$code")
    echo "$action_info" | cut -d'|' -f2
}

# Get recommended action
get_action() {
    local code=$1
    local action_info
    action_info=$(get_exit_action "$code")
    echo "$action_info" | cut -d'|' -f3
}

# Get command to execute
get_command() {
    local code=$1
    local action_info
    action_info=$(get_exit_action "$code")
    echo "$action_info" | cut -d'|' -f4
}

# Get human-readable description
get_description() {
    local code=$1
    local action_info
    action_info=$(get_exit_action "$code")
    echo "$action_info" | cut -d'|' -f5
}

# Generate JSON for dashboard consumption
export_exit_metrics() {
    local code=${1:-0}
    local output_file="${2:-/tmp/exit-metrics.json}"
    
    cat > "$output_file" << EOF
{
  "exit_code": $code,
  "severity": "$(get_severity "$code")",
  "action": "$(get_action "$code")",
  "command": "$(get_command "$code" | sed 's/"/\\"/g')",
  "description": "$(get_description "$code")",
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ | tr -d '\n')"
}
EOF
}

# Main execution
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    code=${1:-0}
    
    echo "Exit Code: $code"
    echo "Severity: $(get_severity "$code")"
    echo "Action: $(get_action "$code")"
    echo "Command: $(get_command "$code")"
    echo "Description: $(get_description "$code")"
    
    # Export metrics for dashboard
    export_exit_metrics "$code" "/tmp/exit-metrics.json"
    echo ""
    echo "Metrics exported to: /tmp/exit-metrics.json"
fi
