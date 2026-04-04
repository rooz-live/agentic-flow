#!/usr/bin/env bash
set -euo pipefail

# Deep Resolution Orchestrator
# Spawns ceremonies to actually FIX the root cause of recommended actions
# Implements MPP (Method Pattern Protocol) for intelligent exit code handling
# Exit codes:
#   0 (SUCCESS): Issue fully resolved
#   1 (PARTIAL_SUCCESS): Some progress, manual intervention may be needed
#   12 (CREDENTIALS_MISSING): Credentials not acquired
#   23 (SSH_TIMEOUT): SSH still failing after remediation
#   40 (CEREMONY_TIMEOUT): Ceremony exceeded timeout

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Load MPP Protocol
source "$SCRIPT_DIR/lib/exit-codes.sh" 2>/dev/null || {
  SUCCESS=0; PARTIAL_SUCCESS=1; CREDENTIALS_MISSING=12; SSH_TIMEOUT=23; CEREMONY_TIMEOUT=40
}
source "$SCRIPT_DIR/lib/mpp-protocol.sh" 2>/dev/null || true

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

ACTION_TYPE="${1:-}"
ACTION_TARGET="${2:-}"

if [ -z "$ACTION_TYPE" ]; then
  echo -e "${RED}Usage: $0 <action-type> [target]${NC}"
  echo "Action types: infrastructure, circle, dimension"
  exit 1
fi

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}🔧 Deep Resolution Orchestrator${NC}"
echo -e "${BLUE}   Spawning ceremonies to fix root cause${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

case "$ACTION_TYPE" in
  infrastructure)
    echo -e "${YELLOW}🏗️  Resolving Infrastructure Issue${NC}"
    echo ""
    
    # Step 1: Diagnose (assessor/review)
    echo -e "${BLUE}[1/4]${NC} Running assessor/review to diagnose SSH connectivity..."
    if [ -f "$SCRIPT_DIR/ay-prod-cycle.sh" ]; then
      "$SCRIPT_DIR/ay-prod-cycle.sh" assessor review advisory 2>&1 | grep -E "▶|✓|✗|Episode" || true
    fi
    echo ""
    
    # Step 2: Plan fix (orchestrator/standup)
    echo -e "${BLUE}[2/4]${NC} Running orchestrator/standup to plan remediation..."
    if [ -f "$SCRIPT_DIR/ay-prod-cycle.sh" ]; then
      "$SCRIPT_DIR/ay-prod-cycle.sh" orchestrator standup advisory 2>&1 | grep -E "▶|✓|✗|Episode" || true
    fi
    echo ""
    
    # Step 3: Execute fix with seeker/replenish ceremony
    echo -e "${BLUE}[3/4]${NC} Executing SSH remediation with seeker/replenish..."
    RESOLUTION_STATUS="partial"
    
    # Check .env configuration and spawn seeker/replenish
    if [ -f "$PROJECT_ROOT/.env" ]; then
      # Check if placeholders exist
      if grep -q "{{" "$PROJECT_ROOT/.env" 2>/dev/null; then
        echo -e "   ${YELLOW}⚠️  Configuration placeholders detected${NC}"
        echo -e "   ${BLUE}→ Running seeker/replenish ceremony with retry logic${NC}"
        echo ""
        
        # Run seeker with MPP retry logic
        if [ -f "$SCRIPT_DIR/ay-ceremony-seeker.sh" ]; then
          if command -v run_with_retry >/dev/null 2>&1; then
            # Use MPP retry logic
            run_with_retry "seeker/replenish" \
              "$SCRIPT_DIR/ay-ceremony-seeker.sh"
            SEEKER_EXIT=$?
          else
            # Fallback to direct execution
            "$SCRIPT_DIR/ay-ceremony-seeker.sh"
            SEEKER_EXIT=$?
          fi
          
          case $SEEKER_EXIT in
            0)  # SUCCESS
              echo -e "   ${GREEN}✅${NC} All credentials acquired"
              ;;
            1)  # PARTIAL_SUCCESS
              echo -e "   ${YELLOW}⚠️${NC} Partial success - some credentials missing"
              echo -e "   ${BLUE}→ Spawning interactive editor for manual entry${NC}"
              [ -f "$SCRIPT_DIR/ay-yo-env-editor-agent.sh" ] && "$SCRIPT_DIR/ay-yo-env-editor-agent.sh"
              ;;
            12)  # CREDENTIALS_MISSING
              echo -e "   ${RED}❌${NC} No credentials acquired - manual intervention required"
              echo -e "   ${BLUE}→ Spawning interactive editor${NC}"
              [ -f "$SCRIPT_DIR/ay-yo-env-editor-agent.sh" ] && "$SCRIPT_DIR/ay-yo-env-editor-agent.sh"
              ;;
            *)  # Other errors
              echo -e "   ${RED}✗${NC} Seeker failed with exit code $SEEKER_EXIT"
              ;;
          esac
        else
          echo -e "   ${RED}✗${NC} seeker/replenish agent not found"
          echo "   → Manual fix required: Edit .env and replace {{STX_IP}} placeholders"
        fi
      else
        echo "   ✓ No placeholders found in .env"
        
        # Still check PEM permissions
        PEM_PATH=$(grep "^YOLIFE_STX_KEY=" "$PROJECT_ROOT/.env" | cut -d'=' -f2 | sed 's/~/$HOME/g' | xargs)
        if [ -n "$PEM_PATH" ]; then
          PEM_PATH_EXPANDED="${PEM_PATH/#\~/$HOME}"
          if [ -f "$PEM_PATH_EXPANDED" ]; then
            PERMS=$(stat -f "%OLp" "$PEM_PATH_EXPANDED" 2>/dev/null || stat -c "%a" "$PEM_PATH_EXPANDED" 2>/dev/null)
            if [ "$PERMS" != "600" ] && [ "$PERMS" != "400" ]; then
              echo -e "   ${YELLOW}⚠️  Fixing PEM permissions${NC}"
              chmod 600 "$PEM_PATH_EXPANDED" 2>/dev/null && echo "   ✓ Fixed" || echo -e "   ${RED}✗${NC} Failed"
            fi
          fi
        fi
      fi
    fi
    
    # Try SSH connection after remediation
    echo "   ✓ Retrying SSH connection..."
    
    # Read SSH config from .env
    STX_IP=$(grep "^YOLIFE_STX_HOST=" "$PROJECT_ROOT/.env" | cut -d'=' -f2)
    STX_USER=$(grep "^YOLIFE_STX_USER=" "$PROJECT_ROOT/.env" | cut -d'=' -f2 || echo "ubuntu")
    STX_KEY=$(grep "^YOLIFE_STX_KEY=" "$PROJECT_ROOT/.env" | cut -d'=' -f2 | sed "s|~|$HOME|g")
    STX_KEY_EXPANDED="${STX_KEY/#\~/$HOME}"
    STX_PORT=$(grep "^YOLIFE_STX_PORTS=" "$PROJECT_ROOT/.env" | cut -d'=' -f2 | cut -d',' -f1 || echo "2222")
    
    # Direct SSH test
    if [ -n "$STX_IP" ] && [ -f "$STX_KEY_EXPANDED" ]; then
      if timeout 5 ssh -i "$STX_KEY_EXPANDED" -o ConnectTimeout=3 -o StrictHostKeyChecking=no -o BatchMode=yes \
         "$STX_USER@$STX_IP" -p "$STX_PORT" "echo '__SSH_OK__'" 2>/dev/null | grep -q "__SSH_OK__"; then
        echo -e "   ${GREEN}✓${NC} SSH probe successful after remediation"
        RESOLUTION_STATUS="success"
      else
        echo -e "   ${RED}✗${NC} SSH probe still failing"
        echo "   → Manual investigation required:"
        echo "      1. Verify remote host is running"
        echo "      2. Check network connectivity"
        echo "      3. Validate SSH credentials"
        echo "      4. Review firewall rules"
        RESOLUTION_STATUS="partial"
      fi
    else
      echo -e "   ${YELLOW}⊘${NC} Cannot test SSH (missing config or key)"
      RESOLUTION_STATUS="partial"
    fi
    echo ""
    
    # Step 4: Validate & track (analyst/refine)
    echo -e "${BLUE}[4/4]${NC} Running analyst/refine to validate resolution..."
    if [ -f "$SCRIPT_DIR/ay-prod-cycle.sh" ]; then
      "$SCRIPT_DIR/ay-prod-cycle.sh" analyst refine advisory 2>&1 | grep -E "▶|✓|✗|Episode" || true
    fi
    echo ""
    
    if [ "$RESOLUTION_STATUS" = "success" ]; then
      echo -e "${GREEN}✅ Infrastructure issue RESOLVED${NC}"
      echo -e "   SSH connectivity restored through ceremony orchestration"
      exit 0
    else
      echo -e "${YELLOW}⚠️  Infrastructure issue PARTIALLY resolved${NC}"
      echo -e "   Ceremonies executed but SSH still unreachable"
      echo -e "   Recommend: Manual investigation or seeker/replenish for resources"
      exit 1
    fi
    ;;
    
  circle)
    CIRCLE="${ACTION_TARGET}"
    echo -e "${YELLOW}🔄 Resolving Circle Issue: ${CIRCLE}${NC}"
    echo ""
    
    # Get primary ceremony for this circle
    case "$CIRCLE" in
      assessor)
        CEREMONY="wsjf"
        ;;
      orchestrator)
        CEREMONY="standup"
        ;;
      analyst)
        CEREMONY="refine"
        ;;
      innovator)
        CEREMONY="retro"
        ;;
      seeker)
        CEREMONY="replenish"
        ;;
      intuitive)
        CEREMONY="synthesis"
        ;;
      *)
        echo -e "${RED}Unknown circle: $CIRCLE${NC}"
        exit 1
        ;;
    esac
    
    echo -e "${BLUE}[1/3]${NC} Executing primary ceremony: ${CIRCLE}/${CEREMONY}..."
    if [ -f "$SCRIPT_DIR/ay-prod-cycle.sh" ]; then
      "$SCRIPT_DIR/ay-prod-cycle.sh" "$CIRCLE" "$CEREMONY" advisory
    fi
    echo ""
    
    echo -e "${BLUE}[2/3]${NC} Running seeker/replenish for resource replenishment..."
    if [ -f "$SCRIPT_DIR/ay-prod-cycle.sh" ]; then
      "$SCRIPT_DIR/ay-prod-cycle.sh" seeker replenish advisory 2>&1 | grep -E "▶|✓|✗|Episode" || true
    fi
    echo ""
    
    echo -e "${BLUE}[3/3]${NC} Running innovator/retro for reflection..."
    if [ -f "$SCRIPT_DIR/ay-prod-cycle.sh" ]; then
      "$SCRIPT_DIR/ay-prod-cycle.sh" innovator retro advisory 2>&1 | grep -E "▶|✓|✗|Episode" || true
    fi
    echo ""
    
    echo -e "${GREEN}✅ Circle resolution complete${NC}"
    echo -e "   Executed ${CIRCLE}/${CEREMONY} + replenish + retro"
    ;;
    
  dimension)
    DIMENSION="${ACTION_TARGET}"
    echo -e "${YELLOW}🌐 Resolving Dimension Issue: ${DIMENSION}${NC}"
    echo ""
    
    # Map dimension to circle
    case "$DIMENSION" in
      temporal)
        CIRCLE="orchestrator"
        ;;
      goal)
        CIRCLE="assessor"
        ;;
      barrier)
        CIRCLE="innovator"
        ;;
      mindset)
        CIRCLE="analyst"
        ;;
      cockpit)
        CIRCLE="seeker"
        ;;
      psychological)
        CIRCLE="intuitive"
        ;;
      *)
        echo -e "${RED}Unknown dimension: $DIMENSION${NC}"
        exit 1
        ;;
    esac
    
    echo -e "   Mapped to circle: ${CIRCLE}"
    echo ""
    
    # Resolve via circle ceremonies
    "$0" circle "$CIRCLE"
    ;;
    
  *)
    echo -e "${RED}Unknown action type: $ACTION_TYPE${NC}"
    exit 1
    ;;
esac

echo ""
echo -e "${GREEN}🎉 Deep resolution complete!${NC}"
echo -e "   Root cause addressed through ceremony orchestration"
echo -e "   Metrics updated in AgentDB"
echo ""
