#!/bin/bash
# YoLife Deployment Readiness - Simple Version (Bash 3.2+ compatible)

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║         YoLife Deployment Readiness Assessment              ║"
echo "║  AISP • ROAM • Skills • Coverage • Health • Orchestration   ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# Load environment
[[ -f ".env.yolife" ]] && source .env.yolife

# Scoring (simple variables)
score_env=0
score_ssh=0
score_health=0
score_coverage=0
score_roam=0
score_skills=0
score_aisp=0
score_mode=0

# CHECK 1: Environment Variables
echo "[1/8] Environment Variables"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
missing=0
[[ -n "${YOLIFE_STX_HOST:-}" ]] && echo "  ✓ YOLIFE_STX_HOST" || { echo "  ✗ YOLIFE_STX_HOST"; ((missing++)); }
[[ -n "${YOLIFE_CPANEL_HOST:-}" ]] && echo "  ✓ YOLIFE_CPANEL_HOST" || { echo "  ✗ YOLIFE_CPANEL_HOST"; ((missing++)); }
[[ -n "${YOLIFE_GITLAB_HOST:-}" ]] && echo "  ✓ YOLIFE_GITLAB_HOST" || { echo "  ✗ YOLIFE_GITLAB_HOST"; ((missing++)); }
score_env=$((10 - missing))
echo "Score: [$score_env/10]"

# CHECK 2: SSH Keys
echo ""
echo "[2/8] SSH Keys"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
[[ -f "$HOME/.ssh/starlingx_key" ]] && { echo "  ✓ starlingx_key"; ((score_ssh+=5)); } || echo "  ✗ starlingx_key"
[[ -f "$HOME/pem/rooz.pem" ]] && { echo "  ✓ rooz.pem"; ((score_ssh+=5)); } || echo "  ✗ rooz.pem"
echo "Score: [$score_ssh/10]"

# CHECK 3: AY Health
echo ""
echo "[3/8] AY System Health"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [[ -x "./scripts/ay-assess.sh" ]]; then
  health=$(./scripts/ay-assess.sh 2>&1 | grep "Overall Health:" | grep -oE '[0-9]+/[0-9]+' | cut -d'/' -f1 || echo "0")
  if [[ $health -ge 80 ]]; then score_health=15
  elif [[ $health -ge 60 ]]; then score_health=10
  else score_health=5; fi
  echo "  Health: ${health}/100"
else
  echo "  ✗ ay-assess.sh not found"
fi
echo "Score: [$score_health/15]"

# CHECK 4: Test Coverage
echo ""
echo "[4/8] Test Coverage"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if command -v npm &>/dev/null; then
  echo "  Running tests..."
  npm test -- --coverage --silent 2>&1 | grep -q "PASS" && score_coverage=15 || score_coverage=5
else
  echo "  ✗ npm not available"
fi
echo "Score: [$score_coverage/20]"

# CHECK 5: ROAM Currency
echo ""
echo "[5/8] ROAM Currency"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [[ -f "docs/ROAM-tracker.md" ]]; then
  age=$(( ($(date +%s) - $(stat -f %m docs/ROAM-tracker.md 2>/dev/null || stat -c %Y docs/ROAM-tracker.md)) / 86400 ))
  if [[ $age -le 1 ]]; then score_roam=15
  elif [[ $age -le 3 ]]; then score_roam=10
  else score_roam=5; fi
  echo "  ROAM age: ${age} days"
else
  echo "  ✗ ROAM tracker not found"
fi
echo "Score: [$score_roam/15]"

# CHECK 6: Skills Repository
echo ""
echo "[6/8] Skills Repository"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [[ -f "reports/skills-store.json" ]]; then
  count=$(jq 'length' reports/skills-store.json 2>/dev/null || echo 0)
  if [[ $count -gt 0 ]]; then
    score_skills=10
    echo "  ✓ ${count} skills stored"
  else
    score_skills=3
    echo "  ⚠ Skills store empty"
  fi
else
  echo "  ✗ Skills store not found"
fi
echo "Score: [$score_skills/15]"

# CHECK 7: AISP Validation
echo ""
echo "[7/8] AISP Validation"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [[ -x "./scripts/ay-aisp-validate.sh" ]]; then
  ./scripts/ay-aisp-validate.sh 2>&1 | grep -q "✅" && score_aisp=10 || score_aisp=5
  echo "  AISP check complete"
else
  echo "  ✗ AISP validator not found"
fi
echo "Score: [$score_aisp/10]"

# CHECK 8: Deployment Mode
echo ""
echo "[8/8] Deployment Mode"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [[ -x "./scripts/ay-yolife.sh" ]]; then
  mode=$(./scripts/ay-yolife.sh --mode-select 2>&1 | tail -1)
  echo "  Selected: $mode"
  [[ "$mode" == "prod" ]] && score_mode=5 || score_mode=4
else
  echo "  ✗ ay-yolife.sh not found"
fi
echo "Score: [$score_mode/5]"

# FINAL SCORE
total=$((score_env + score_ssh + score_health + score_coverage + score_roam + score_skills + score_aisp + score_mode))
percentage=$((total * 100 / 100))

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "                    READINESS ASSESSMENT"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  Total Score: $total/100 ($percentage%)"
echo ""
echo "  Breakdown:"
echo "    • Environment Variables:  $score_env/10"
echo "    • SSH Keys:               $score_ssh/10"
echo "    • AY Health:              $score_health/15"
echo "    • Test Coverage:          $score_coverage/20"
echo "    • ROAM Currency:          $score_roam/15"
echo "    • Skills Repository:      $score_skills/15"
echo "    • AISP Validation:        $score_aisp/10"
echo "    • Deployment Mode:        $score_mode/5"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [[ $percentage -ge 90 ]]; then
  echo "✅ READY FOR PRODUCTION DEPLOYMENT"
  exit 0
elif [[ $percentage -ge 75 ]]; then
  echo "✅ READY FOR CANARY DEPLOYMENT"
  exit 0
elif [[ $percentage -ge 60 ]]; then
  echo "⚠️  READY FOR STAGING DEPLOYMENT"
  exit 1
else
  echo "❌ NOT READY FOR DEPLOYMENT"
  exit 2
fi
