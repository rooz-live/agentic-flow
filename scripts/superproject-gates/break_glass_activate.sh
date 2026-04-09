#!/usr/bin/env bash
#
# break_glass_activate.sh
#
# Break-Glass Emergency Access Activation Script
# Enables controlled override of safety checks for critical operations
#
# Usage: 
#   ./scripts/break_glass_activate.sh --reason "Description" --ticket "CHG-XXXX"
#   ./scripts/break_glass_activate.sh --deactivate
#   ./scripts/break_glass_activate.sh --status
#
# Reference: docs/BREAK_GLASS_PROCEDURES.md
#
# Created: 2026-01-03T05:27:00Z
# Phase: B - Environment Preparation
# Target: StarlingX AIO at 23.92.79.2:2222
#

set -euo pipefail

# ============================================================================
# CONFIGURATION
# ============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
AUDIT_LOG="$PROJECT_ROOT/.goalie/break_glass_audit.jsonl"
STATE_FILE="$PROJECT_ROOT/.goalie/break_glass_state.json"
BREAK_GLASS_PROC_DOC="$PROJECT_ROOT/docs/BREAK_GLASS_PROCEDURES.md"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m'
BOLD='\033[1m'

# STX Target Configuration
STX_TARGET_HOST="${STX_TARGET_HOST:-23.92.79.2}"
STX_SSH_PORT="${STX_SSH_PORT:-2222}"
STX_SSH_USER="${STX_SSH_USER:-ubuntu}"

# ============================================================================
# FUNCTIONS
# ============================================================================

print_banner() {
    echo ""
    echo -e "${RED}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${RED}║                                                            ║${NC}"
    echo -e "${RED}║  ${BOLD}⚠️  BREAK-GLASS EMERGENCY ACCESS SYSTEM  ⚠️${NC}${RED}               ║${NC}"
    echo -e "${RED}║                                                            ║${NC}"
    echo -e "${RED}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

print_status() {
    local status="$1"
    local message="$2"
    case "$status" in
        "ok")     echo -e "  ${GREEN}✓${NC} $message" ;;
        "warn")   echo -e "  ${YELLOW}⚠${NC} $message" ;;
        "error")  echo -e "  ${RED}✗${NC} $message" ;;
        "info")   echo -e "  ${CYAN}ℹ${NC} $message" ;;
        "alert")  echo -e "  ${RED}🚨${NC} $message" ;;
    esac
}

usage() {
    cat << EOF
${BOLD}Break-Glass Emergency Access Activation${NC}

Usage:
  $0 --reason "Reason for activation" --ticket "CHG-XXXX"
  $0 --deactivate
  $0 --status
  $0 --audit [--last N]

Options:
  --reason, -r      Reason for break-glass activation (required for activation)
  --ticket, -t      Change ticket ID (required for activation)
  --cab-approval    CAB approval ID (alternative to ticket)
  --deactivate, -d  Deactivate break-glass mode
  --status, -s      Show current break-glass status
  --audit           View audit log
  --last N          Show last N audit entries (default: 10)
  --force           Skip confirmation prompts
  --help, -h        Show this help message

Environment Variables (set on activation):
  AF_BREAK_GLASS=1
  AF_BREAK_GLASS_REASON="<reason>"
  AF_CHANGE_TICKET="<ticket>"
  BREAK_GLASS_ENABLED=true

Examples:
  # Activate break-glass for deployment
  $0 --reason "Phase C OBS3 deployment - high-risk infrastructure changes" \\
     --ticket "CHG-2026-0103-001"

  # Check current status
  $0 --status

  # View audit trail
  $0 --audit --last 20

  # Deactivate when complete
  $0 --deactivate

Reference: docs/BREAK_GLASS_PROCEDURES.md
EOF
}

ensure_goalie_dir() {
    mkdir -p "$PROJECT_ROOT/.goalie"
}

generate_activation_id() {
    if command -v uuidgen >/dev/null 2>&1; then
        uuidgen
    else
        echo "BG-$(date +%Y%m%d%H%M%S)-$$"
    fi
}

log_event() {
    local event_type="$1"
    local details="$2"
    
    ensure_goalie_dir
    
    local timestamp
    timestamp=$(date -u +%Y-%m-%dT%H:%M:%SZ)
    
    local log_entry
    log_entry=$(cat <<EOF
{
  "timestamp": "$timestamp",
  "event_type": "$event_type",
  "user": "$(whoami)",
  "hostname": "$(hostname)",
  "target_host": "$STX_TARGET_HOST",
  "target_port": "$STX_SSH_PORT",
  "target_user": "$STX_SSH_USER",
  "details": $details
}
EOF
)
    
    echo "$log_entry" >> "$AUDIT_LOG"
}

save_state() {
    local activation_id="$1"
    local reason="$2"
    local ticket="$3"
    local cab_approval="${4:-}"
    
    ensure_goalie_dir
    
    local timestamp
    timestamp=$(date -u +%Y-%m-%dT%H:%M:%SZ)
    
    cat > "$STATE_FILE" << EOF
{
  "active": true,
  "activation_id": "$activation_id",
  "activated_at": "$timestamp",
  "activated_by": "$(whoami)",
  "reason": "$reason",
  "change_ticket": "$ticket",
  "cab_approval": "$cab_approval",
  "target_host": "$STX_TARGET_HOST",
  "target_port": "$STX_SSH_PORT",
  "target_user": "$STX_SSH_USER",
  "env_vars": {
    "AF_BREAK_GLASS": "1",
    "AF_BREAK_GLASS_REASON": "$reason",
    "AF_CHANGE_TICKET": "$ticket",
    "BREAK_GLASS_ENABLED": "true"
  }
}
EOF
}

clear_state() {
    if [[ -f "$STATE_FILE" ]]; then
        rm -f "$STATE_FILE"
    fi
}

get_current_state() {
    if [[ -f "$STATE_FILE" ]]; then
        cat "$STATE_FILE"
    else
        echo '{"active": false}'
    fi
}

is_active() {
    if [[ -f "$STATE_FILE" ]]; then
        if command -v jq >/dev/null 2>&1; then
            local active
            active=$(jq -r '.active // false' "$STATE_FILE")
            [[ "$active" == "true" ]]
        else
            grep -q '"active": true' "$STATE_FILE"
        fi
    else
        return 1
    fi
}

show_status() {
    print_banner
    
    echo -e "${BOLD}Current Break-Glass Status${NC}"
    echo ""
    
    if is_active; then
        echo -e "  Status: ${RED}${BOLD}ACTIVE${NC}"
        echo ""
        
        if command -v jq >/dev/null 2>&1 && [[ -f "$STATE_FILE" ]]; then
            local activation_id reason ticket activated_at activated_by
            activation_id=$(jq -r '.activation_id' "$STATE_FILE")
            reason=$(jq -r '.reason' "$STATE_FILE")
            ticket=$(jq -r '.change_ticket' "$STATE_FILE")
            activated_at=$(jq -r '.activated_at' "$STATE_FILE")
            activated_by=$(jq -r '.activated_by' "$STATE_FILE")
            
            echo -e "  ${CYAN}Activation Details:${NC}"
            echo "    Activation ID: $activation_id"
            echo "    Reason: $reason"
            echo "    Change Ticket: $ticket"
            echo "    Activated At: $activated_at"
            echo "    Activated By: $activated_by"
            echo ""
            echo -e "  ${CYAN}Target:${NC}"
            echo "    Host: $(jq -r '.target_host' "$STATE_FILE")"
            echo "    Port: $(jq -r '.target_port' "$STATE_FILE")"
            echo "    User: $(jq -r '.target_user' "$STATE_FILE")"
        fi
        echo ""
        echo -e "  ${YELLOW}Environment Variables to Source:${NC}"
        echo "    export AF_BREAK_GLASS=1"
        echo "    export AF_BREAK_GLASS_REASON=\"\$(jq -r .reason $STATE_FILE)\""
        echo "    export AF_CHANGE_TICKET=\"\$(jq -r .change_ticket $STATE_FILE)\""
        echo "    export BREAK_GLASS_ENABLED=true"
        echo ""
        echo -e "  ${RED}⚠️  High-risk operations are ALLOWED while break-glass is active${NC}"
    else
        echo -e "  Status: ${GREEN}INACTIVE${NC}"
        echo ""
        echo "  Break-glass mode is not currently enabled."
        echo "  High-risk operations will be blocked."
        echo ""
        echo "  To activate, run:"
        echo "    $0 --reason \"<reason>\" --ticket \"<CHG-XXXX>\""
    fi
    echo ""
}

show_audit() {
    local last_n="${1:-10}"
    
    print_banner
    
    echo -e "${BOLD}Break-Glass Audit Log${NC}"
    echo "  Log file: $AUDIT_LOG"
    echo "  Showing last $last_n entries"
    echo ""
    
    if [[ -f "$AUDIT_LOG" ]]; then
        if command -v jq >/dev/null 2>&1; then
            tail -n "$last_n" "$AUDIT_LOG" | while IFS= read -r line; do
                local timestamp event_type user
                timestamp=$(echo "$line" | jq -r '.timestamp')
                event_type=$(echo "$line" | jq -r '.event_type')
                user=$(echo "$line" | jq -r '.user')
                
                case "$event_type" in
                    "break_glass_activated")
                        echo -e "  ${RED}●${NC} [$timestamp] ${RED}ACTIVATED${NC} by $user"
                        ;;
                    "break_glass_deactivated")
                        echo -e "  ${GREEN}●${NC} [$timestamp] ${GREEN}DEACTIVATED${NC} by $user"
                        ;;
                    *)
                        echo -e "  ${CYAN}●${NC} [$timestamp] $event_type by $user"
                        ;;
                esac
            done
        else
            tail -n "$last_n" "$AUDIT_LOG"
        fi
    else
        echo "  No audit entries found."
    fi
    echo ""
}

activate_break_glass() {
    local reason="$1"
    local ticket="$2"
    local cab_approval="${3:-}"
    local force="${4:-false}"
    
    print_banner
    
    # Validation
    if [[ -z "$reason" ]]; then
        print_status "error" "Reason is required for break-glass activation"
        echo "  Use: --reason \"Description of why break-glass is needed\""
        return 1
    fi
    
    if [[ -z "$ticket" ]] && [[ -z "$cab_approval" ]]; then
        print_status "error" "Either change ticket or CAB approval is required"
        echo "  Use: --ticket \"CHG-XXXX\" or --cab-approval \"CAB-XXXX\""
        return 1
    fi
    
    # Check if already active
    if is_active; then
        print_status "warn" "Break-glass is already active"
        show_status
        return 0
    fi
    
    # Confirmation
    if [[ "$force" != "true" ]]; then
        echo -e "${RED}${BOLD}⚠️  WARNING: BREAK-GLASS ACTIVATION${NC}"
        echo ""
        echo "  You are about to enable break-glass mode for high-risk operations."
        echo "  This will bypass normal safety checks and must be used responsibly."
        echo ""
        echo -e "  ${CYAN}Details:${NC}"
        echo "    Reason: $reason"
        echo "    Ticket: ${ticket:-$cab_approval}"
        echo "    Target: $STX_SSH_USER@$STX_TARGET_HOST:$STX_SSH_PORT"
        echo ""
        echo -e "  ${YELLOW}Allowed High-Risk Operations:${NC}"
        echo "    - Package installation (apt, dnf, rpm)"
        echo "    - Service control (systemctl start/stop/restart)"
        echo "    - Docker/container management"
        echo "    - Kubernetes modifications"
        echo "    - Critical file modifications"
        echo "    - Remote SSH state-modifying commands"
        echo ""
        read -p "Type 'BREAK-GLASS' to confirm activation: " confirm
        echo ""
        
        if [[ "$confirm" != "BREAK-GLASS" ]]; then
            print_status "info" "Activation cancelled"
            return 1
        fi
    fi
    
    # Generate activation ID
    local activation_id
    activation_id=$(generate_activation_id)
    
    # Save state
    save_state "$activation_id" "$reason" "${ticket:-}" "${cab_approval:-}"
    
    # Log activation
    log_event "break_glass_activated" "{\"activation_id\": \"$activation_id\", \"reason\": \"$reason\", \"change_ticket\": \"${ticket:-}\", \"cab_approval\": \"${cab_approval:-}\"}"
    
    # Export environment variables
    export AF_BREAK_GLASS=1
    export AF_BREAK_GLASS_REASON="$reason"
    export AF_CHANGE_TICKET="${ticket:-$cab_approval}"
    export BREAK_GLASS_ENABLED="true"
    
    echo -e "${GREEN}${BOLD}✓ BREAK-GLASS ACTIVATED${NC}"
    echo ""
    echo "  Activation ID: $activation_id"
    echo "  Reason: $reason"
    echo "  Ticket: ${ticket:-$cab_approval}"
    echo "  Time: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
    echo ""
    echo -e "  ${CYAN}Environment Variables Set:${NC}"
    echo "    AF_BREAK_GLASS=1"
    echo "    AF_BREAK_GLASS_REASON=\"$reason\""
    echo "    AF_CHANGE_TICKET=\"${ticket:-$cab_approval}\""
    echo "    BREAK_GLASS_ENABLED=true"
    echo ""
    echo -e "  ${YELLOW}IMPORTANT: Source this script in your shell to set variables:${NC}"
    echo "    source $0 --status  # This will show current env vars"
    echo ""
    echo -e "  ${YELLOW}To export in current shell, run:${NC}"
    echo "    export AF_BREAK_GLASS=1"
    echo "    export AF_BREAK_GLASS_REASON=\"$reason\""
    echo "    export AF_CHANGE_TICKET=\"${ticket:-$cab_approval}\""
    echo "    export BREAK_GLASS_ENABLED=true"
    echo ""
    echo -e "  ${RED}⚠️  Remember to deactivate when complete:${NC}"
    echo "    $0 --deactivate"
    echo ""
    
    return 0
}

deactivate_break_glass() {
    local force="${1:-false}"
    
    print_banner
    
    if ! is_active; then
        print_status "info" "Break-glass is not currently active"
        return 0
    fi
    
    # Get current state for logging
    local activation_id reason
    if command -v jq >/dev/null 2>&1 && [[ -f "$STATE_FILE" ]]; then
        activation_id=$(jq -r '.activation_id' "$STATE_FILE")
        reason=$(jq -r '.reason' "$STATE_FILE")
    else
        activation_id="unknown"
        reason="unknown"
    fi
    
    # Confirmation
    if [[ "$force" != "true" ]]; then
        echo "  Current break-glass session:"
        echo "    Activation ID: $activation_id"
        echo "    Reason: $reason"
        echo ""
        read -p "Confirm deactivation? (y/N) " -n 1 -r
        echo ""
        
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            print_status "info" "Deactivation cancelled"
            return 1
        fi
    fi
    
    # Log deactivation
    log_event "break_glass_deactivated" "{\"activation_id\": \"$activation_id\", \"reason\": \"$reason\"}"
    
    # Clear state
    clear_state
    
    # Unset environment variables
    unset AF_BREAK_GLASS
    unset AF_BREAK_GLASS_REASON
    unset AF_CHANGE_TICKET
    unset BREAK_GLASS_ENABLED
    
    echo -e "${GREEN}${BOLD}✓ BREAK-GLASS DEACTIVATED${NC}"
    echo ""
    echo "  Activation ID: $activation_id"
    echo "  Deactivated At: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
    echo ""
    echo "  Environment variables have been unset in this script context."
    echo "  If you exported them in your shell, run:"
    echo "    unset AF_BREAK_GLASS AF_BREAK_GLASS_REASON AF_CHANGE_TICKET BREAK_GLASS_ENABLED"
    echo ""
    
    return 0
}

# ============================================================================
# HIGH-RISK COMMAND CATEGORIES (from BREAK_GLASS_PROCEDURES.md)
# ============================================================================

# These patterns are used to detect high-risk commands
HIGH_RISK_PATTERNS=(
    "apt install|apt upgrade|apt remove"
    "dnf install|dnf upgrade|dnf remove"
    "yum install|yum upgrade|yum remove"
    "rpm -[iUe]"
    "systemctl start|systemctl stop|systemctl restart|systemctl enable|systemctl disable"
    "systemctl disable docker"
    "rm -rf /var/lib/docker"
    "kubeadm init|kubeadm reset"
    "kubectl delete"
    "rm -rf /etc/kubernetes"
    "chmod /etc/containerd|chmod /etc/kubernetes"
    "chown /etc/kubernetes"
    "ssh.*apt install|ssh.*systemctl"
    "rm -rf /usr|rm -rf /var|rm -rf /etc"
    "ip route add|ip route delete"
    "iptables"
    "firewall-cmd"
    "ufw enable|ufw disable"
)

check_command() {
    local cmd="$1"
    
    echo -e "${BOLD}Checking command risk level:${NC}"
    echo "  Command: $cmd"
    echo ""
    
    local is_high_risk=false
    local risk_category=""
    
    for pattern in "${HIGH_RISK_PATTERNS[@]}"; do
        if echo "$cmd" | grep -qE "$pattern"; then
            is_high_risk=true
            risk_category="$pattern"
            break
        fi
    done
    
    if [[ "$is_high_risk" == "true" ]]; then
        echo -e "  Risk Level: ${RED}HIGH${NC}"
        echo "  Category: $risk_category"
        echo ""
        
        if is_active; then
            echo -e "  ${GREEN}✓ Break-glass is ACTIVE - command is ALLOWED${NC}"
            return 0
        else
            echo -e "  ${RED}✗ Break-glass is NOT active - command would be BLOCKED${NC}"
            echo ""
            echo "  To proceed, activate break-glass:"
            echo "    $0 --reason \"<reason>\" --ticket \"<CHG-XXXX>\""
            return 1
        fi
    else
        echo -e "  Risk Level: ${GREEN}LOW${NC}"
        echo ""
        echo "  This command does not require break-glass approval."
        return 0
    fi
}

# ============================================================================
# MAIN EXECUTION
# ============================================================================

main() {
    local action=""
    local reason=""
    local ticket=""
    local cab_approval=""
    local force=false
    local last_n=10
    local check_cmd=""
    
    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --reason|-r)
                reason="$2"
                action="activate"
                shift 2
                ;;
            --ticket|-t)
                ticket="$2"
                shift 2
                ;;
            --cab-approval)
                cab_approval="$2"
                shift 2
                ;;
            --deactivate|-d)
                action="deactivate"
                shift
                ;;
            --status|-s)
                action="status"
                shift
                ;;
            --audit)
                action="audit"
                shift
                ;;
            --last)
                last_n="$2"
                shift 2
                ;;
            --check)
                action="check"
                check_cmd="$2"
                shift 2
                ;;
            --force)
                force=true
                shift
                ;;
            --help|-h)
                usage
                exit 0
                ;;
            *)
                echo "Unknown option: $1"
                usage
                exit 1
                ;;
        esac
    done
    
    # Default to status if no action specified
    if [[ -z "$action" ]]; then
        action="status"
    fi
    
    # Execute action
    case "$action" in
        activate)
            activate_break_glass "$reason" "$ticket" "$cab_approval" "$force"
            ;;
        deactivate)
            deactivate_break_glass "$force"
            ;;
        status)
            show_status
            ;;
        audit)
            show_audit "$last_n"
            ;;
        check)
            check_command "$check_cmd"
            ;;
        *)
            usage
            exit 1
            ;;
    esac
}

# Execute main function
main "$@"
