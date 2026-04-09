#!/bin/bash
# Break Glass Hooks for AF CLI
#
# Source this in AF CLI for break glass protection on dangerous operations.
#
# Usage:
#   source scripts/af/break_glass_hooks.sh
#   
#   # Then use hooks before dangerous operations:
#   hook_package_install "nginx" || exit 1
#   apt install -y nginx
#
# Environment Variables:
#   AF_BREAK_GLASS=1              # Enable break glass mode
#   AF_BREAK_GLASS_REASON="..."   # Justification
#   AF_CHANGE_TICKET="CHG..."     # Change ticket (for high-risk)
#   AF_CAB_APPROVAL_ID="..."      # Alternative to change ticket
#   AF_BREAK_GLASS_TTL=3600       # Session TTL in seconds

set -euo pipefail

# Get the directory where this script lives
BREAK_GLASS_SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BREAK_GLASS_PY="${BREAK_GLASS_SCRIPT_DIR}/break_glass.py"

# Verify break_glass.py exists
if [[ ! -f "$BREAK_GLASS_PY" ]]; then
    echo "ERROR: break_glass.py not found at $BREAK_GLASS_PY" >&2
    exit 2
fi

# =============================================================================
# Core Functions
# =============================================================================

# Validate a typed action using the Python module
# Args: $1=action, $2=target
# Returns: 0 if approved, 1 if blocked
require_break_glass() {
    local action="$1"
    local target="$2"
    
    python3 "$BREAK_GLASS_PY" validate --action "$action" --target "$target"
    return $?
}

# Check a command pattern (legacy pattern-based approach)
# Args: $1=command
# Returns: 0 if approved, 1 if blocked
check_break_glass_command() {
    local command="$1"
    
    python3 "$BREAK_GLASS_PY" check "$command"
    return $?
}

# Get break glass status
break_glass_status() {
    python3 "$BREAK_GLASS_PY" status "$@"
}

# View audit trail
break_glass_audit() {
    python3 "$BREAK_GLASS_PY" audit "$@"
}

# Get session info
break_glass_session() {
    python3 "$BREAK_GLASS_PY" session --info "$@"
}

# List available actions
break_glass_actions() {
    python3 "$BREAK_GLASS_PY" actions "$@"
}

# =============================================================================
# Hook Functions - Use these before dangerous operations
# =============================================================================

# Hook: Package installation
# Usage: hook_package_install "nginx" || exit 1
hook_package_install() {
    local target="${1:-unknown}"
    require_break_glass "package_install" "$target"
}

# Hook: Service restart
# Usage: hook_service_restart "docker" || exit 1
hook_service_restart() {
    local target="${1:-unknown}"
    require_break_glass "service_restart" "$target"
}

# Hook: Runtime change (HIGH-RISK)
# Usage: hook_runtime_change "containerd" || exit 1
hook_runtime_change() {
    local target="${1:-unknown}"
    require_break_glass "runtime_change" "$target"
}

# Hook: Docker disable (HIGH-RISK)
# Usage: hook_docker_disable "node01" || exit 1
hook_docker_disable() {
    local target="${1:-unknown}"
    require_break_glass "docker_disable" "$target"
}

# Hook: Kubelet modify (HIGH-RISK)
# Usage: hook_kubelet_modify "cluster01" || exit 1
hook_kubelet_modify() {
    local target="${1:-unknown}"
    require_break_glass "kubelet_modify" "$target"
}

# Hook: Kubeconfig modify (HIGH-RISK)
# Usage: hook_kubeconfig_modify "/etc/kubernetes/admin.conf" || exit 1
hook_kubeconfig_modify() {
    local target="${1:-unknown}"
    require_break_glass "kubeconfig_modify" "$target"
}

# Hook: Firewall modify (HIGH-RISK)
# Usage: hook_firewall_modify "ufw" || exit 1
hook_firewall_modify() {
    local target="${1:-unknown}"
    require_break_glass "firewall_modify" "$target"
}

# Hook: Certificate rotate (HIGH-RISK)
# Usage: hook_certificate_rotate "kubernetes-ca" || exit 1
hook_certificate_rotate() {
    local target="${1:-unknown}"
    require_break_glass "certificate_rotate" "$target"
}

# Hook: File modify
# Usage: hook_file_modify "/etc/kubernetes/manifests" || exit 1
hook_file_modify() {
    local target="${1:-unknown}"
    require_break_glass "file_modify" "$target"
}

# Hook: Destructive rm (HIGH-RISK)
# Usage: hook_destructive_rm "/var/lib/docker" || exit 1
hook_destructive_rm() {
    local target="${1:-unknown}"
    require_break_glass "destructive_rm" "$target"
}

# Hook: Network modify
# Usage: hook_network_modify "eth0" || exit 1
hook_network_modify() {
    local target="${1:-unknown}"
    require_break_glass "network_modify" "$target"
}

# Hook: SSH state modify
# Usage: hook_ssh_state_modify "remote-host" || exit 1
hook_ssh_state_modify() {
    local target="${1:-unknown}"
    require_break_glass "ssh_state_modify" "$target"
}

# =============================================================================
# Convenience Functions
# =============================================================================

# Print break glass environment setup example
break_glass_help() {
    cat <<'EOF'
Break Glass Hook System - Shell Integration

SETUP:
  source scripts/af/break_glass_hooks.sh

USAGE:
  # Before dangerous operations, call the appropriate hook:
  hook_package_install "nginx" || exit 1
  apt install -y nginx

ENVIRONMENT VARIABLES:
  Required:
    AF_BREAK_GLASS=1              Enable break glass mode
    AF_BREAK_GLASS_REASON="..."   Justification for the operation

  For High-Risk Operations:
    AF_CHANGE_TICKET="CHG..."     Change ticket reference
    AF_CAB_APPROVAL_ID="..."      Or CAB approval ID

  Optional:
    AF_BREAK_GLASS_TTL=3600       Session timeout in seconds (default: 1hr)

EXAMPLE:
  AF_BREAK_GLASS=1 \
  AF_BREAK_GLASS_REASON="Emergency: prod incident INC123" \
  AF_CHANGE_TICKET="CHG-2026-0103-001" \
  ./scripts/af prod deploy

AVAILABLE HOOKS:
  hook_package_install <target>    Package installation
  hook_service_restart <target>    Service restart
  hook_runtime_change <target>     Runtime change (HIGH-RISK)
  hook_docker_disable <target>     Docker disable (HIGH-RISK)
  hook_kubelet_modify <target>     Kubelet modification (HIGH-RISK)
  hook_kubeconfig_modify <target>  Kubeconfig modification (HIGH-RISK)
  hook_firewall_modify <target>    Firewall modification (HIGH-RISK)
  hook_certificate_rotate <target> Certificate rotation (HIGH-RISK)
  hook_file_modify <target>        Critical file modification
  hook_destructive_rm <target>     Destructive removal (HIGH-RISK)
  hook_network_modify <target>     Network modification
  hook_ssh_state_modify <target>   Remote SSH state modification

HIGH-RISK actions require either AF_CHANGE_TICKET or AF_CAB_APPROVAL_ID.

COMMANDS:
  break_glass_status               Show current configuration status
  break_glass_audit                View audit trail
  break_glass_session              View session TTL info
  break_glass_actions              List all available actions
  break_glass_help                 Show this help message
EOF
}

# Check if break glass is currently enabled
is_break_glass_enabled() {
    [[ "${AF_BREAK_GLASS:-0}" == "1" ]]
}

# Ensure break glass is set up, or print help and exit
ensure_break_glass() {
    if ! is_break_glass_enabled; then
        echo "ERROR: Break glass mode not enabled" >&2
        echo "" >&2
        echo "To enable, set environment variables:" >&2
        echo "  AF_BREAK_GLASS=1" >&2
        echo "  AF_BREAK_GLASS_REASON=\"your reason here\"" >&2
        echo "  AF_CHANGE_TICKET=\"CHG-XXXX\" (for high-risk operations)" >&2
        echo "" >&2
        echo "Run 'break_glass_help' for more information." >&2
        return 1
    fi
    return 0
}

# =============================================================================
# Auto-export functions for use in subshells
# =============================================================================

export -f require_break_glass 2>/dev/null || true
export -f check_break_glass_command 2>/dev/null || true
export -f hook_package_install 2>/dev/null || true
export -f hook_service_restart 2>/dev/null || true
export -f hook_runtime_change 2>/dev/null || true
export -f hook_docker_disable 2>/dev/null || true
export -f hook_kubelet_modify 2>/dev/null || true
export -f hook_kubeconfig_modify 2>/dev/null || true
export -f hook_firewall_modify 2>/dev/null || true
export -f hook_certificate_rotate 2>/dev/null || true
export -f hook_file_modify 2>/dev/null || true
export -f hook_destructive_rm 2>/dev/null || true
export -f hook_network_modify 2>/dev/null || true
export -f hook_ssh_state_modify 2>/dev/null || true
export -f is_break_glass_enabled 2>/dev/null || true
export -f ensure_break_glass 2>/dev/null || true

# Export the Python script path for subshells
export BREAK_GLASS_PY
