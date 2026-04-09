#!/usr/bin/env bash
set -euo pipefail

# WHM Firewall (CSF) Status & Management
# Checks CSF rules, verifies critical ports, optionally restarts
# Connects via SSH (uses CPANEL_SSH_HOST from .env.cpanel)

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"

if [ -f "$PROJECT_ROOT/config/.env.cpanel" ]; then
    source "$PROJECT_ROOT/config/.env.cpanel"
fi

SSH_HOST="${CPANEL_SSH_HOST:-rooz-aws}"
SSH_OPTS="-o ConnectTimeout=10 -o BatchMode=yes"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

# Required ports for cPanel/WHM/web
REQUIRED_PORTS="22,25,53,80,110,143,443,465,587,993,995,2082,2083,2086,2087,2095,2096"

run_remote() {
    ssh $SSH_OPTS "$SSH_HOST" "$@"
}

check_status() {
    echo -e "${CYAN}━━━ CSF Firewall Status ━━━${NC}"
    echo ""

    echo -e "${CYAN}CSF version:${NC}"
    run_remote "sudo csf -v 2>&1 | head -1"

    echo ""
    echo -e "${CYAN}LFD (Login Failure Daemon):${NC}"
    run_remote "systemctl is-active lfd 2>&1"

    echo ""
    echo -e "${CYAN}TESTING mode:${NC}"
    run_remote "sudo grep '^TESTING ' /etc/csf/csf.conf"

    echo ""
    echo -e "${CYAN}TCP_IN (allowed inbound):${NC}"
    run_remote "sudo grep '^TCP_IN' /etc/csf/csf.conf"

    echo ""
    echo -e "${CYAN}TCP_OUT (allowed outbound):${NC}"
    run_remote "sudo grep '^TCP_OUT' /etc/csf/csf.conf"
}

verify_ports() {
    echo ""
    echo -e "${CYAN}━━━ Port Verification ━━━${NC}"
    echo ""

    local issues=0
    IFS=',' read -ra PORTS <<< "$REQUIRED_PORTS"

    # Get TCP_IN from server
    local tcp_in
    tcp_in=$(run_remote "sudo grep '^TCP_IN' /etc/csf/csf.conf" | cut -d'"' -f2)

    for port in "${PORTS[@]}"; do
        if echo ",$tcp_in," | grep -q ",$port,"; then
            echo -e "  Port $port: ${GREEN}✓ allowed${NC}"
        else
            echo -e "  Port $port: ${RED}✗ BLOCKED${NC}"
            ((issues++))
        fi
    done

    echo ""
    if [ $issues -gt 0 ]; then
        echo -e "${RED}$issues port(s) not in CSF TCP_IN allowlist${NC}"
        return 1
    else
        echo -e "${GREEN}All required ports allowed${NC}"
    fi
}

check_services() {
    echo ""
    echo -e "${CYAN}━━━ Service Listening Check ━━━${NC}"
    echo ""

    run_remote "
        for port in 80 443 2083 2087; do
            printf '  Port %s: ' \$port
            if sudo ss -tlnp | grep -q \":\$port \"; then
                echo '✓ listening'
            else
                echo '✗ NOT listening'
            fi
        done
        echo ''
        echo 'Nginx:' \$(systemctl is-active nginx 2>&1)
        echo 'Apache:' \$(systemctl is-active httpd 2>&1)
        echo 'cPanel:' \$(systemctl is-active cpanel 2>&1 || echo 'N/A')
    "
}

check_blocks() {
    echo ""
    echo -e "${CYAN}━━━ Recent CSF Blocks (last 10) ━━━${NC}"
    echo ""
    run_remote "sudo grep 'Blocked' /var/log/lfd.log 2>/dev/null | tail -10 | awk '{print \"  \" \$0}'" || echo "  No blocks found"
}

restart_csf() {
    echo -e "${YELLOW}Restarting CSF firewall...${NC}"
    run_remote "sudo csf -r 2>&1 | tail -3"
    echo -e "${GREEN}✓ CSF restarted${NC}"
}

show_usage() {
    cat << EOF
WHM Firewall (CSF) Check & Management

Usage: $0 <command>

Commands:
  status    Show CSF configuration and status
  ports     Verify required ports are allowed
  services  Check if services are listening
  blocks    Show recent CSF/LFD blocks
  restart   Restart CSF (applies current rules)
  full      Run all checks
  help      Show this help

Environment:
  CPANEL_SSH_HOST  SSH config host name (default: rooz-aws)

EOF
}

case "${1:-full}" in
    status|s)    check_status ;;
    ports|p)     verify_ports ;;
    services|sv) check_services ;;
    blocks|b)    check_blocks ;;
    restart|r)   restart_csf ;;
    full|f)      check_status; verify_ports; check_services; check_blocks ;;
    help|h)      show_usage ;;
    *)           show_usage ;;
esac
