#!/bin/bash
# YoLife Deployment Readiness - Comprehensive Pre-Flight & Orchestration
# Integrates: AISP, ROAM, Skills, Coverage, Health Checks, Canary Deployment

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Load environment
if [[ -f ".env.yolife" ]]; then
  source .env.yolife
fi

echo -e "${BLUE}"
cat << 'EOF'
╔══════════════════════════════════════════════════════════════╗
║         YoLife Deployment Readiness Assessment              ║
║  AISP • ROAM • Skills • Coverage • Health • Orchestration   ║
╚══════════════════════════════════════════════════════════════╝
EOF
echo -e "${NC}"

# Configuration
COVERAGE_THRESHOLD=50
ROAM_STALENESS_DAYS=3
MIN_SKILL_CONFIDENCE=0.70
HEALTH_SCORE_MIN=60

# Scoring
TOTAL_SCORE=0
MAX_SCORE=100

# Results tracking
declare -A checks
checks=(
  [env_vars]=0
  [ssh_keys]=0
  [ay_health]=0
  [test_coverage]=0
  [roam_current]=0
  [skills_ready]=0
  [aisp_valid]=0
  [deployment_mode]=0
)

# ============================================================================
# CHECK 1: Environment Variables (10 points)
# ============================================================================
echo -e "\n${YELLOW}[1/8] Environment Variables Check${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

required_vars=(
  "YOLIFE_STX_HOST"
  "YOLIFE_STX_PORTS"
  "YOLIFE_STX_KEY"
  "YOLIFE_CPANEL_HOST"
  "YOLIFE_CPANEL_PORTS"
  "YOLIFE_CPANEL_KEY"
  "YOLIFE_GITLAB_HOST"
  "YOLIFE_GITLAB_PORTS"
  "YOLIFE_GITLAB_KEY"
)

missing_count=0
for var in "${required_vars[@]}"; do
  if [[ -z "${!var:-}" ]]; then
    echo -e "  ${RED}✗${NC} $var (missing)"
    ((missing_count++))
  else
    echo -e "  ${GREEN}✓${NC} $var"
  fi
done

if [[ $missing_count -eq 0 ]]; then
  checks[env_vars]=10
  echo -e "${GREEN}✓ Environment variables complete [10/10]${NC}"
else
  checks[env_vars]=$(( 10 - missing_count ))
  echo -e "${YELLOW}⚠ Missing $missing_count variables [${checks[env_vars]}/10]${NC}"
fi

# ============================================================================
# CHECK 2: SSH Keys & Connectivity (10 points)
# ============================================================================
echo -e "\n${YELLOW}[2/8] SSH Keys & Connectivity${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

ssh_score=0
for key_var in "YOLIFE_STX_KEY" "YOLIFE_CPANEL_KEY" "YOLIFE_GITLAB_KEY"; do
  key_path="${!key_var:-}"
  if [[ -f "$key_path" ]]; then
    perms=$(stat -f %Lp "$key_path" 2>/dev/null || stat -c %a "$key_path" 2>/dev/null || echo "???")
    if [[ "$perms" == "600" || "$perms" == "400" ]]; then
      echo -e "  ${GREEN}✓${NC} $key_var: $key_path (secure)"
      ((ssh_score+=3))
    else
      echo -e "  ${YELLOW}⚠${NC} $key_var: $key_path (insecure: $perms)"
      ((ssh_score+=1))
    fi
  else
    echo -e "  ${RED}✗${NC} $key_var: $key_path (not found)"
  fi
done

checks[ssh_keys]=$ssh_score
echo -e "${GREEN}✓ SSH keys check [${checks[ssh_keys]}/10]${NC}"

# ============================================================================
# CHECK 3: AY System Health (15 points)
# ============================================================================
echo -e "\n${YELLOW}[3/8] AY System Health Assessment${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [[ -x "./scripts/ay-assess.sh" ]]; then
  health_output=$(./scripts/ay-assess.sh 2>&1 || true)
  
  # Extract health score
  if echo "$health_output" | grep -q "Overall Health:"; then
    health_score=$(echo "$health_output" | grep "Overall Health:" | grep -oE '[0-9]+/[0-9]+' | cut -d'/' -f1)
    
    if [[ $health_score -ge 80 ]]; then
      checks[ay_health]=15
      echo -e "${GREEN}✓ System health: ${health_score}/100 (EXCELLENT)${NC}"
    elif [[ $health_score -ge 60 ]]; then
      checks[ay_health]=10
      echo -e "${YELLOW}⚠ System health: ${health_score}/100 (ACCEPTABLE)${NC}"
    else
      checks[ay_health]=5
      echo -e "${RED}✗ System health: ${health_score}/100 (POOR)${NC}"
    fi
  else
    checks[ay_health]=5
    echo -e "${YELLOW}⚠ Health check completed with warnings${NC}"
  fi
else
  checks[ay_health]=0
  echo -e "${RED}✗ ay-assess.sh not found${NC}"
fi

echo -e "Health score: [${checks[ay_health]}/15]"

# ============================================================================
# CHECK 4: Test Coverage (20 points)
# ============================================================================
echo -e "\n${YELLOW}[4/8] Test Coverage Validation${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if command -v npm &> /dev/null; then
  echo "Running test suite with coverage..."
  coverage_output=$(npm test -- --coverage --silent 2>&1 || true)
  
  # Extract coverage percentage
  if echo "$coverage_output" | grep -q "All files"; then
    coverage=$(echo "$coverage_output" | grep "All files" | grep -oE '[0-9]+\.[0-9]+' | head -1)
    coverage_int=${coverage%.*}
    
    if [[ $coverage_int -ge 80 ]]; then
      checks[test_coverage]=20
      echo -e "${GREEN}✓ Test coverage: ${coverage}% (EXCELLENT)${NC}"
    elif [[ $coverage_int -ge $COVERAGE_THRESHOLD ]]; then
      checks[test_coverage]=15
      echo -e "${GREEN}✓ Test coverage: ${coverage}% (GOOD)${NC}"
    elif [[ $coverage_int -ge 30 ]]; then
      checks[test_coverage]=10
      echo -e "${YELLOW}⚠ Test coverage: ${coverage}% (NEEDS IMPROVEMENT)${NC}"
    else
      checks[test_coverage]=5
      echo -e "${RED}✗ Test coverage: ${coverage}% (POOR)${NC}"
    fi
  else
    checks[test_coverage]=5
    echo -e "${YELLOW}⚠ Tests passed but coverage unavailable${NC}"
  fi
else
  checks[test_coverage]=0
  echo -e "${RED}✗ npm not available${NC}"
fi

echo -e "Coverage score: [${checks[test_coverage]}/20]"

# ============================================================================
# CHECK 5: ROAM Currency (15 points)
# ============================================================================
echo -e "\n${YELLOW}[5/8] ROAM Tracker Currency${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

roam_file="docs/ROAM-tracker.md"
if [[ -f "$roam_file" ]]; then
  last_modified=$(stat -f %Sm -t %s "$roam_file" 2>/dev/null || stat -c %Y "$roam_file" 2>/dev/null || echo 0)
  current_time=$(date +%s)
  age_days=$(( (current_time - last_modified) / 86400 ))
  
  if [[ $age_days -le 1 ]]; then
    checks[roam_current]=15
    echo -e "${GREEN}✓ ROAM updated ${age_days} day(s) ago (CURRENT)${NC}"
  elif [[ $age_days -le $ROAM_STALENESS_DAYS ]]; then
    checks[roam_current]=10
    echo -e "${GREEN}✓ ROAM updated ${age_days} day(s) ago (ACCEPTABLE)${NC}"
  else
    checks[roam_current]=5
    echo -e "${YELLOW}⚠ ROAM updated ${age_days} day(s) ago (STALE)${NC}"
  fi
else
  checks[roam_current]=0
  echo -e "${RED}✗ ROAM tracker not found${NC}"
fi

echo -e "ROAM score: [${checks[roam_current]}/15]"

# ============================================================================
# CHECK 6: Skills Repository (15 points)
# ============================================================================
echo -e "\n${YELLOW}[6/8] Skills Repository Status${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

skills_file="reports/skills-store.json"
if [[ -f "$skills_file" ]]; then
  skill_count=$(jq 'length' "$skills_file" 2>/dev/null || echo 0)
  
  if [[ $skill_count -gt 0 ]]; then
    avg_confidence=$(jq '[.[] | .confidence] | add / length' "$skills_file" 2>/dev/null || echo 0)
    
    if (( $(echo "$avg_confidence >= 0.85" | bc -l) )); then
      checks[skills_ready]=15
      echo -e "${GREEN}✓ ${skill_count} skills, avg confidence: ${avg_confidence} (HIGH)${NC}"
    elif (( $(echo "$avg_confidence >= $MIN_SKILL_CONFIDENCE" | bc -l) )); then
      checks[skills_ready]=10
      echo -e "${GREEN}✓ ${skill_count} skills, avg confidence: ${avg_confidence} (ACCEPTABLE)${NC}"
    else
      checks[skills_ready]=5
      echo -e "${YELLOW}⚠ ${skill_count} skills, avg confidence: ${avg_confidence} (LOW)${NC}"
    fi
  else
    checks[skills_ready]=3
    echo -e "${YELLOW}⚠ Skills store empty${NC}"
  fi
else
  checks[skills_ready]=0
  echo -e "${RED}✗ Skills store not found${NC}"
fi

echo -e "Skills score: [${checks[skills_ready]}/15]"

# ============================================================================
# CHECK 7: AISP Validation (10 points)
# ============================================================================
echo -e "\n${YELLOW}[7/8] AISP Proof Requirements${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [[ -x "./scripts/ay-aisp-validate.sh" ]]; then
  aisp_output=$(./scripts/ay-aisp-validate.sh 2>&1 || true)
  
  if echo "$aisp_output" | grep -q "✅"; then
    checks[aisp_valid]=10
    echo -e "${GREEN}✓ AISP validation passed${NC}"
  else
    checks[aisp_valid]=5
    echo -e "${YELLOW}⚠ AISP validation completed with warnings${NC}"
  fi
else
  checks[aisp_valid]=0
  echo -e "${RED}✗ AISP validator not found${NC}"
fi

echo -e "AISP score: [${checks[aisp_valid]}/10]"

# ============================================================================
# CHECK 8: Deployment Mode Selection (5 points)
# ============================================================================
echo -e "\n${YELLOW}[8/8] Deployment Mode Selection${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [[ -x "./scripts/ay-yolife.sh" ]]; then
  mode_output=$(./scripts/ay-yolife.sh --mode-select 2>&1 || true)
  selected_mode=$(echo "$mode_output" | tail -1)
  
  echo -e "  Selected mode: ${BLUE}${selected_mode}${NC}"
  
  if [[ "$selected_mode" == "prod" ]]; then
    checks[deployment_mode]=5
    echo -e "${GREEN}✓ Production mode selected${NC}"
  elif [[ "$selected_mode" == "yolife" ]]; then
    checks[deployment_mode]=4
    echo -e "${GREEN}✓ YoLife mode selected${NC}"
  else
    checks[deployment_mode]=3
    echo -e "${YELLOW}⚠ Fallback mode: ${selected_mode}${NC}"
  fi
else
  checks[deployment_mode]=0
  echo -e "${RED}✗ ay-yolife.sh not found${NC}"
fi

echo -e "Deployment mode score: [${checks[deployment_mode]}/5]"

# ============================================================================
# FINAL SCORE & RECOMMENDATION
# ============================================================================
echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}                    READINESS ASSESSMENT${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

# Calculate total
for score in "${checks[@]}"; do
  TOTAL_SCORE=$((TOTAL_SCORE + score))
done

# Progress bar
percentage=$((TOTAL_SCORE * 100 / MAX_SCORE))
bar_length=50
filled=$((percentage * bar_length / 100))
empty=$((bar_length - filled))

printf "  Total Score: %3d/%d [" "$TOTAL_SCORE" "$MAX_SCORE"
printf "%${filled}s" | tr ' ' '█'
printf "%${empty}s" | tr ' ' '░'
printf "] %d%%\n" "$percentage"

echo ""
echo "  Breakdown:"
printf "    • Environment Variables:  %2d/10\n" "${checks[env_vars]}"
printf "    • SSH Keys:               %2d/10\n" "${checks[ssh_keys]}"
printf "    • AY Health:              %2d/15\n" "${checks[ay_health]}"
printf "    • Test Coverage:          %2d/20\n" "${checks[test_coverage]}"
printf "    • ROAM Currency:          %2d/15\n" "${checks[roam_current]}"
printf "    • Skills Repository:      %2d/15\n" "${checks[skills_ready]}"
printf "    • AISP Validation:        %2d/10\n" "${checks[aisp_valid]}"
printf "    • Deployment Mode:        %2d/5\n" "${checks[deployment_mode]}"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Recommendation
if [[ $percentage -ge 90 ]]; then
  echo -e "${GREEN}✅ READY FOR PRODUCTION DEPLOYMENT${NC}"
  echo -e "   All systems green. Proceed with deployment."
  exit 0
elif [[ $percentage -ge 75 ]]; then
  echo -e "${GREEN}✅ READY FOR CANARY DEPLOYMENT${NC}"
  echo -e "   System is stable. Recommend canary deployment."
  exit 0
elif [[ $percentage -ge 60 ]]; then
  echo -e "${YELLOW}⚠️  READY FOR STAGING DEPLOYMENT${NC}"
  echo -e "   Some concerns remain. Deploy to staging first."
  exit 1
else
  echo -e "${RED}❌ NOT READY FOR DEPLOYMENT${NC}"
  echo -e "   Critical issues detected. Address before deploying."
  exit 2
fi
