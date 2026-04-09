#!/usr/bin/env bash
set -euo pipefail

# Interactive .env Editor Agent
# Spawned by seeker/replenish ceremony when configuration issues detected
# Guides user through fixing placeholders and missing values
# Exit Codes (MCP/MPP compliant):
#   0 (SUCCESS): All placeholders resolved, config valid
#   11 (CONFIG_INVALID): Placeholders still present after editing

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_FILE="$PROJECT_ROOT/.env"

# Load MPP exit codes
source "$SCRIPT_DIR/lib/exit-codes.sh" 2>/dev/null || {
  SUCCESS=0
  CONFIG_INVALID=11
}

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}🤖 Interactive .env Editor Agent${NC}"
echo -e "${CYAN}   seeker/replenish ceremony - Resource acquisition${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

if [ ! -f "$ENV_FILE" ]; then
  echo -e "${RED}✗ .env file not found: $ENV_FILE${NC}"
  echo -e "${YELLOW}→ Creating from .env.example...${NC}"
  if [ -f "$PROJECT_ROOT/.env.example" ]; then
    cp "$PROJECT_ROOT/.env.example" "$ENV_FILE"
    echo -e "${GREEN}✓ Created .env from template${NC}"
  else
    echo -e "${RED}✗ .env.example also not found${NC}"
    exit 1
  fi
fi

echo -e "${BLUE}📋 Scanning .env for configuration issues...${NC}"
echo ""

# Track issues
ISSUES_FOUND=0
ISSUES_FIXED=0

# Check for placeholders
echo -e "${YELLOW}[1/5]${NC} Checking for placeholder values..."
PLACEHOLDERS=$(grep -E "\{\{[^}]+\}\}" "$ENV_FILE" || true)

if [ -n "$PLACEHOLDERS" ]; then
  echo -e "${YELLOW}⚠️  Found placeholder values:${NC}"
  echo "$PLACEHOLDERS" | while IFS= read -r line; do
    echo "   $line"
  done
  echo ""
  
  # Interactive replacement
  while IFS= read -r line; do
    VAR_NAME=$(echo "$line" | cut -d'=' -f1)
    PLACEHOLDER=$(echo "$line" | cut -d'=' -f2)
    
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${YELLOW}Variable: $VAR_NAME${NC}"
    echo -e "${YELLOW}Current:  $PLACEHOLDER${NC}"
    echo ""
    
    # Provide context-specific guidance
    case "$VAR_NAME" in
      *IP*|*HOST*)
        echo -e "${BLUE}💡 This looks like an IP address or hostname${NC}"
        echo -e "   Examples: 192.168.1.100, server.example.com, stx-aio"
        ;;
      *KEY*|*PEM*)
        echo -e "${BLUE}💡 This looks like a path to a key file${NC}"
        echo -e "   Examples: ~/pem/mykey.pem, /Users/you/.ssh/id_rsa"
        ;;
      *PORT*)
        echo -e "${BLUE}💡 This looks like a port number${NC}"
        echo -e "   Examples: 22, 2222, 8080"
        ;;
      *USER*)
        echo -e "${BLUE}💡 This looks like a username${NC}"
        echo -e "   Examples: ubuntu, admin, root"
        ;;
    esac
    echo ""
    
    read -p "Enter new value (or 'skip' to leave as-is): " NEW_VALUE
    
    if [ "$NEW_VALUE" != "skip" ] && [ -n "$NEW_VALUE" ]; then
      # Use simple string replacement instead of regex (avoids escaping issues)
      # Create temp file with new value
      awk -v var="$VAR_NAME" -v newval="$NEW_VALUE" '
        BEGIN { FS=OFS="=" }
        $1 == var { $2 = newval; print; next }
        { print }
      ' "$ENV_FILE" > "${ENV_FILE}.tmp"
      
      # Backup and replace
      mv "$ENV_FILE" "${ENV_FILE}.bak"
      mv "${ENV_FILE}.tmp" "$ENV_FILE"
      
      echo -e "${GREEN}✓ Updated $VAR_NAME${NC}"
      ISSUES_FIXED=$((ISSUES_FIXED + 1))
    else
      echo -e "${YELLOW}⊘ Skipped $VAR_NAME${NC}"
    fi
    echo ""
    
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
  done <<< "$PLACEHOLDERS"
else
  echo -e "${GREEN}✓ No placeholders found${NC}"
fi
echo ""

# Check for missing required variables
echo -e "${YELLOW}[2/5]${NC} Checking for missing required variables..."
REQUIRED_VARS=(
  "YOLIFE_STX_HOST"
  "YOLIFE_STX_USER"
  "YOLIFE_STX_KEY"
)

for VAR in "${REQUIRED_VARS[@]}"; do
  if ! grep -q "^${VAR}=" "$ENV_FILE"; then
    echo -e "${RED}✗ Missing: $VAR${NC}"
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
    
    read -p "Enter value for $VAR (or 'skip'): " NEW_VALUE
    if [ "$NEW_VALUE" != "skip" ] && [ -n "$NEW_VALUE" ]; then
      echo "${VAR}=${NEW_VALUE}" >> "$ENV_FILE"
      echo -e "${GREEN}✓ Added $VAR${NC}"
      ISSUES_FIXED=$((ISSUES_FIXED + 1))
    fi
  else
    echo -e "${GREEN}✓ Found: $VAR${NC}"
  fi
done
echo ""

# Check PEM file existence
echo -e "${YELLOW}[3/5]${NC} Validating PEM key file..."
PEM_PATH=$(grep "^YOLIFE_STX_KEY=" "$ENV_FILE" | cut -d'=' -f2 | sed "s|~|$HOME|g" | xargs)

if [ -n "$PEM_PATH" ]; then
  PEM_PATH_EXPANDED="${PEM_PATH/#\~/$HOME}"
  
  if [ -f "$PEM_PATH_EXPANDED" ]; then
    echo -e "${GREEN}✓ PEM file exists: $PEM_PATH${NC}"
    
    # Check permissions
    PERMS=$(stat -f "%OLp" "$PEM_PATH_EXPANDED" 2>/dev/null || stat -c "%a" "$PEM_PATH_EXPANDED" 2>/dev/null)
    if [ "$PERMS" != "600" ] && [ "$PERMS" != "400" ]; then
      echo -e "${YELLOW}⚠️  PEM file has wrong permissions: $PERMS${NC}"
      read -p "Fix permissions to 600? (y/n): " FIX_PERMS
      if [ "$FIX_PERMS" = "y" ]; then
        chmod 600 "$PEM_PATH_EXPANDED"
        echo -e "${GREEN}✓ Fixed permissions: chmod 600${NC}"
        ISSUES_FIXED=$((ISSUES_FIXED + 1))
      fi
    else
      echo -e "${GREEN}✓ PEM permissions OK: $PERMS${NC}"
    fi
  else
    echo -e "${RED}✗ PEM file not found: $PEM_PATH${NC}"
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
    
    echo ""
    echo -e "${BLUE}💡 Options:${NC}"
    echo "   1. Create a new PEM key: ssh-keygen -t rsa -b 4096 -f $PEM_PATH_EXPANDED"
    echo "   2. Copy existing key to: $PEM_PATH_EXPANDED"
    echo "   3. Update YOLIFE_STX_KEY in .env with correct path"
    echo ""
    
    read -p "Would you like to update YOLIFE_STX_KEY path? (y/n): " UPDATE_PATH
    if [ "$UPDATE_PATH" = "y" ]; then
      read -p "Enter correct PEM key path: " NEW_PEM_PATH
      if [ -n "$NEW_PEM_PATH" ]; then
        sed -i.bak "s|^YOLIFE_STX_KEY=.*|YOLIFE_STX_KEY=${NEW_PEM_PATH}|" "$ENV_FILE"
        echo -e "${GREEN}✓ Updated YOLIFE_STX_KEY${NC}"
        ISSUES_FIXED=$((ISSUES_FIXED + 1))
      fi
    fi
  fi
else
  echo -e "${YELLOW}⚠️  YOLIFE_STX_KEY not set${NC}"
fi
echo ""

# Test SSH connection
echo -e "${YELLOW}[4/5]${NC} Testing SSH connection..."
STX_HOST=$(grep "^YOLIFE_STX_HOST=" "$ENV_FILE" | cut -d'=' -f2 | xargs)
STX_USER=$(grep "^YOLIFE_STX_USER=" "$ENV_FILE" | cut -d'=' -f2 | xargs)
STX_KEY=$(grep "^YOLIFE_STX_KEY=" "$ENV_FILE" | cut -d'=' -f2 | sed "s|~|$HOME|g" | xargs)
STX_KEY_EXPANDED="${STX_KEY/#\~/$HOME}"

if [ -n "$STX_HOST" ] && [ -n "$STX_USER" ] && [ -f "$STX_KEY_EXPANDED" ]; then
  echo "   Attempting: ssh -i $STX_KEY $STX_USER@$STX_HOST -p 2222"
  
  if timeout 5 ssh -i "$STX_KEY_EXPANDED" -o ConnectTimeout=5 -o StrictHostKeyChecking=no \
     "$STX_USER@$STX_HOST" -p 2222 "echo '__AF_OK__'" 2>/dev/null | grep -q "__AF_OK__"; then
    echo -e "${GREEN}✓ SSH connection successful${NC}"
  else
    echo -e "${RED}✗ SSH connection failed${NC}"
    echo ""
    echo -e "${BLUE}💡 Troubleshooting steps:${NC}"
    echo "   1. Verify remote host is running"
    echo "   2. Check network connectivity: ping $STX_HOST"
    echo "   3. Test manual SSH: ssh -i $STX_KEY $STX_USER@$STX_HOST -p 2222"
    echo "   4. Check firewall rules"
    echo "   5. Verify SSH key is authorized on remote host"
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
  fi
else
  echo -e "${YELLOW}⊘ Skipping SSH test (missing configuration)${NC}"
fi
echo ""

# Store episode for seeker/replenish ceremony
echo -e "${YELLOW}[5/5]${NC} Recording seeker/replenish episode..."
EPISODE_ID="ep_$(date +%s)_seeker_replenish"
EPISODE_FILE="/tmp/ay-prod-episode-${EPISODE_ID}.json"

OUTCOME="success"
COMPLETION_PCT=100

if [ $ISSUES_FOUND -gt 0 ] && [ $ISSUES_FIXED -eq 0 ]; then
  OUTCOME="failure"
  COMPLETION_PCT=0
elif [ $ISSUES_FOUND -gt 0 ] && [ $ISSUES_FIXED -lt $ISSUES_FOUND ]; then
  OUTCOME="partial"
  COMPLETION_PCT=$((ISSUES_FIXED * 100 / ISSUES_FOUND))
fi

cat > "$EPISODE_FILE" << EOF
{
  "episode_id": "$EPISODE_ID",
  "circle": "seeker",
  "ceremony": "replenish",
  "outcome": "$OUTCOME",
  "completion_pct": $COMPLETION_PCT,
  "confidence": 0.9,
  "timestamp": $(date +%s)000,
  "metadata": {
    "issues_found": $ISSUES_FOUND,
    "issues_fixed": $ISSUES_FIXED,
    "env_file": "$ENV_FILE"
  }
}
EOF

echo -e "${GREEN}✓ Episode saved: $EPISODE_FILE${NC}"
echo ""

# Summary
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}📊 Summary${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "   Issues Found: $ISSUES_FOUND"
echo -e "   Issues Fixed: $ISSUES_FIXED"
echo -e "   Outcome: $OUTCOME ($COMPLETION_PCT%)"
echo ""

if [ "$OUTCOME" = "success" ]; then
  echo -e "${GREEN}✅ seeker/replenish ceremony complete!${NC}"
  echo -e "${GREEN}   All configuration issues resolved${NC}"
  EXIT_CODE=$SUCCESS  # 0
elif [ "$OUTCOME" = "partial" ]; then
  echo -e "${YELLOW}⚠️  seeker/replenish ceremony partially complete${NC}"
  echo -e "${YELLOW}   Some issues remain - review troubleshooting steps above${NC}"
  EXIT_CODE=$CONFIG_INVALID  # 11
else
  echo -e "${RED}❌ seeker/replenish ceremony incomplete${NC}"
  echo -e "${RED}   Configuration issues detected but not resolved${NC}"
  EXIT_CODE=$CONFIG_INVALID  # 11
fi

echo ""
echo -e "${BLUE}💾 Episode tracked in AgentDB for learning${NC}"
echo ""

# Check for remaining placeholders before final exit
REMAINING_PLACEHOLDERS=$(grep -E "\{\{[^}]+\}\}" "$ENV_FILE" 2>/dev/null || true)
if [ -n "$REMAINING_PLACEHOLDERS" ]; then
  echo -e "${YELLOW}⚠️  Warning: Placeholders still present in .env${NC}"
  echo "$REMAINING_PLACEHOLDERS" | while IFS= read -r line; do
    echo "   $line"
  done
  exit $CONFIG_INVALID  # 11
fi

exit $EXIT_CODE
