#!/bin/bash
##############################################################################
# Quick SSH Status Check
##############################################################################
# Bypasses ceremony orchestration for instant SSH status
# Uses MCP/MPP Pattern Protocol exit codes
#
# Usage:
#   ./quick-ssh-check.sh           # Human-readable output
#   ./quick-ssh-check.sh --json    # Machine-readable JSON
##############################################################################

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Load MCP/MPP exit codes
source "$SCRIPT_DIR/lib/exit-codes.sh"

# Output mode
OUTPUT_MODE="${1:-human}"  # human or --json

# Colors (disabled in JSON mode)
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

if [ "$OUTPUT_MODE" != "--json" ]; then
  echo -e "${CYAN}════════════════════════════════════════════════════════════${NC}"
  echo -e "${CYAN}🔍 Quick SSH Status Check${NC}"
  echo -e "${CYAN}════════════════════════════════════════════════════════════${NC}"
  echo ""
fi

# Read config from .env
if [ ! -f "$PROJECT_ROOT/.env" ]; then
  echo -e "${RED}✗ .env file not found${NC}"
  exit $CONFIG_MISSING  # 10
fi

STX_IP=$(grep "^YOLIFE_STX_HOST=" "$PROJECT_ROOT/.env" | cut -d'=' -f2)
STX_USER=$(grep "^YOLIFE_STX_USER=" "$PROJECT_ROOT/.env" | cut -d'=' -f2 || echo "ubuntu")
STX_KEY=$(grep "^YOLIFE_STX_KEY=" "$PROJECT_ROOT/.env" | cut -d'=' -f2 | sed "s|~|$HOME|g")
STX_KEY_EXPANDED="${STX_KEY/#\~/$HOME}"
STX_PORT=$(grep "^YOLIFE_STX_PORTS=" "$PROJECT_ROOT/.env" | cut -d'=' -f2 | cut -d',' -f1 || echo "2222")

echo "📋 Configuration:"
echo "   Host: $STX_IP"
echo "   User: $STX_USER"
echo "   Port: $STX_PORT"
echo "   Key: $STX_KEY_EXPANDED"
echo ""

# Check for placeholders
if echo "$STX_IP" | grep -q "{{"; then
  echo -e "${YELLOW}⚠️  Host contains placeholder: $STX_IP${NC}"
  echo "   Run: scripts/ay-yo-env-editor-agent.sh"
  exit $CONFIG_INVALID  # 11
fi

# Check key exists
if [ ! -f "$STX_KEY_EXPANDED" ]; then
  echo -e "${RED}✗ SSH key not found: $STX_KEY_EXPANDED${NC}"
  exit $CONFIG_MISSING  # 10
fi

# Check key permissions
PERMS=$(stat -f "%OLp" "$STX_KEY_EXPANDED" 2>/dev/null || stat -c "%a" "$STX_KEY_EXPANDED" 2>/dev/null)
if [ "$PERMS" != "600" ] && [ "$PERMS" != "400" ]; then
  echo -e "${YELLOW}⚠️  SSH key has wrong permissions: $PERMS${NC}"
  chmod 600 "$STX_KEY_EXPANDED"
  echo -e "${GREEN}✓ Fixed permissions to 600${NC}"
fi

# Network reachability (with timeout protection)
echo "🌐 Network Tests:"
echo -n "   Ping: "
if timeout 3 ping -c 1 -W 2 "$STX_IP" >/dev/null 2>&1; then
  LATENCY=$(timeout 2 ping -c 1 -W 1 "$STX_IP" 2>/dev/null | grep "time=" | sed 's/.*time=//;s/ .*//' || echo "N/A")
  echo -e "${GREEN}✓${NC} (${LATENCY})"
else
  echo -e "${YELLOW}⊘ Skipped (ping timeout)${NC}"
fi

echo -n "   Port $STX_PORT: "
if timeout 3 nc -zv "$STX_IP" "$STX_PORT" >/dev/null 2>&1; then
  echo -e "${GREEN}✓ Open${NC}"
else
  echo -e "${YELLOW}⊘ Skipped (port check timeout)${NC}"
fi

# SSH connectivity
echo ""
echo "🔐 SSH Connection:"
echo -n "   Testing: ssh $STX_USER@$STX_IP -p $STX_PORT ... "

if timeout 5 ssh -i "$STX_KEY_EXPANDED" -o ConnectTimeout=3 -o StrictHostKeyChecking=no -o BatchMode=yes \
   "$STX_USER@$STX_IP" -p "$STX_PORT" "echo '__SSH_OK__'" 2>/dev/null | grep -q "__SSH_OK__"; then
  echo -e "${GREEN}✓ Connected${NC}"
  echo ""
  
  # Get remote system info
  echo "📊 Remote System:"
  ssh -i "$STX_KEY_EXPANDED" -o StrictHostKeyChecking=no "$STX_USER@$STX_IP" -p "$STX_PORT" \
    "echo '   Hostname: '\$(hostname); echo '   Uptime: '\$(uptime | awk '{print \$3, \$4}'); echo '   Load: '\$(uptime | awk -F'load average:' '{print \$2}')" 2>/dev/null
  
  
  if [ "$OUTPUT_MODE" = "--json" ]; then
    cat << EOF
{
  "status": "healthy",
  "exit_code": 0,
  "ssh_reachable": true,
  "config": {
    "host": "$STX_IP",
    "user": "$STX_USER",
    "port": $STX_PORT,
    "key": "$STX_KEY_EXPANDED"
  },
  "remote_system": {
    "hostname": "$(ssh -i "$STX_KEY_EXPANDED" -o StrictHostKeyChecking=no "$STX_USER@$STX_IP" -p "$STX_PORT" 'hostname' 2>/dev/null)",
    "uptime_days": "$(ssh -i "$STX_KEY_EXPANDED" -o StrictHostKeyChecking=no "$STX_USER@$STX_IP" -p "$STX_PORT" 'uptime | awk "{print \$3, \$4}"' 2>/dev/null)"
  },
  "timestamp": $(date +%s)
}
EOF
  else
    echo -e "${GREEN}════════════════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}✅ SSH Status: HEALTHY${NC}"
    echo -e "${GREEN}════════════════════════════════════════════════════════════${NC}"
  fi
  exit $SUCCESS  # 0
else
  echo -e "${RED}✗ Failed${NC}"
  echo ""
  echo -e "${YELLOW}💡 Troubleshooting:${NC}"
  echo "   1. Check remote host is running"
  echo "   2. Verify SSH key is authorized"
  echo "   3. Check firewall rules"
  echo "   4. Try manual SSH:"
  echo "      ssh -i $STX_KEY_EXPANDED $STX_USER@$STX_IP -p $STX_PORT"
  echo ""
  echo -e "${RED}════════════════════════════════════════════════════════════${NC}"
  echo -e "${RED}❌ SSH Status: UNREACHABLE${NC}"
  echo -e "${RED}════════════════════════════════════════════════════════════${NC}"
  exit $SSH_TIMEOUT  # 23: Could be timeout or auth failure
fi
