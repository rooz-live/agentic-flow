#!/usr/bin/env bash
set -euo pipefail

# Phase 1: Centralize Timeout Configuration
# Estimated time: 2-3 hours

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "🔧 Phase 1: Centralizing Timeout Configuration"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Step 1: Create runtime config loader
echo "📝 Creating config/runtime-config.sh..."
cat > "$PROJECT_ROOT/config/runtime-config.sh" <<'EOF'
#!/usr/bin/env bash
# Runtime Configuration Loader
# Loads all runtime parameters from config/prod-cycle.json

CONFIG_FILE="${AY_CONFIG:-${PROJECT_ROOT:-$(pwd)}/config/prod-cycle.json}"

load_config() {
  local key="$1"
  local default="$2"
  jq -r "$key // $default" "$CONFIG_FILE" 2>/dev/null || echo "$default"
}

# Timeouts (convert milliseconds to seconds for timeout command)
export TIMEOUT_MCP_HEALTH=$(($(load_config '.budgets.timeouts.mcpHealthCheck' 2000) / 1000))
export TIMEOUT_SKILL_LOOKUP=$(($(load_config '.budgets.timeouts.skillLookup' 5000) / 1000))
export TIMEOUT_CEREMONY=$(($(load_config '.budgets.timeouts.ceremonyExecution' 180000) / 1000))
export TIMEOUT_CIRCLE_SKILLS=$(($(load_config '.budgets.timeouts.circleSkillsQuery' 3000) / 1000))
export TIMEOUT_EPISODE_STORE=$(($(load_config '.budgets.timeouts.episodeStorage' 10000) / 1000))
export TIMEOUT_YOLIFE=$(($(load_config '.budgets.timeouts.yolifeExecution' 30000) / 1000))

# Limits
export MAX_SCAN_DEPTH=$(load_config '.budgets.limits.maxScanDepth' 3)
export MAX_ENV_FILES=$(load_config '.budgets.limits.maxEnvFiles' 20)
export MAX_SKILLS_QUERY=$(load_config '.budgets.limits.maxSkillsPerQuery' 10)

# Guardrails
export SAFE_DEGRADE_ENABLED=$(load_config '.guardrails.safeDegrade.enabled' true)
export RATE_LIMIT_RPS=$(load_config '.guardrails.rateLimits.requestsPerSecond' 10)

# Export for downstream scripts
export AY_CONFIG_LOADED=1
EOF
chmod +x "$PROJECT_ROOT/config/runtime-config.sh"
echo "✅ Created config/runtime-config.sh"

# Step 2: Update prod-cycle.json with missing timeouts
echo ""
echo "📝 Updating config/prod-cycle.json with missing values..."
jq '. + {
  "budgets": (.budgets + {
    "timeouts": (.budgets.timeouts + {
      "circleSkillsQuery": 3000,
      "episodeStorage": 10000,
      "yolifeExecution": 30000
    }),
    "limits": {
      "maxScanDepth": 3,
      "maxEnvFiles": 20,
      "maxSkillsPerQuery": 10
    }
  })
}' "$PROJECT_ROOT/config/prod-cycle.json" > "$PROJECT_ROOT/config/prod-cycle.json.tmp"
mv "$PROJECT_ROOT/config/prod-cycle.json.tmp" "$PROJECT_ROOT/config/prod-cycle.json"
echo "✅ Updated config/prod-cycle.json"

# Step 3: Update ay-prod-cycle.sh to source config
echo ""
echo "📝 Updating scripts/ay-prod-cycle.sh..."
cd "$PROJECT_ROOT"

# Backup original
cp scripts/ay-prod-cycle.sh scripts/ay-prod-cycle.sh.pre-phase1

# Add source statement after PROJECT_ROOT definition (around line 10)
awk '/^PROJECT_ROOT=/ {
  print
  print ""
  print "# Load runtime configuration"
  print "source \"$PROJECT_ROOT/config/runtime-config.sh\""
  next
}
{print}' scripts/ay-prod-cycle.sh.pre-phase1 > scripts/ay-prod-cycle.sh

# Replace hardcoded timeouts
sed -i.bak \
  -e 's/timeout 2s npx/timeout ${TIMEOUT_MCP_HEALTH}s npx/g' \
  -e 's/timeout 5s "\$SCRIPT_DIR/timeout ${TIMEOUT_SKILL_LOOKUP}s "$SCRIPT_DIR/g' \
  -e 's/timeout 3s npx/timeout ${TIMEOUT_CIRCLE_SKILLS}s npx/g' \
  scripts/ay-prod-cycle.sh

echo "✅ Updated scripts/ay-prod-cycle.sh"

# Step 4: Update ay-yolife-with-skills.sh
echo ""
echo "📝 Updating scripts/ay-yolife-with-skills.sh..."
if [ -f scripts/ay-yolife-with-skills.sh ]; then
  cp scripts/ay-yolife-with-skills.sh scripts/ay-yolife-with-skills.sh.pre-phase1
  
  # Add config source at top
  awk 'NR==3 {
    print "SCRIPT_DIR=\"$(cd \"$(dirname \"${BASH_SOURCE[0]}\")\" && pwd)\""
    print "source \"$SCRIPT_DIR/../config/runtime-config.sh\""
    print ""
  }
  {print}' scripts/ay-yolife-with-skills.sh.pre-phase1 > scripts/ay-yolife-with-skills.sh
  
  echo "✅ Updated scripts/ay-yolife-with-skills.sh"
fi

# Step 5: Validation
echo ""
echo "🧪 Validating configuration..."
source "$PROJECT_ROOT/config/runtime-config.sh"

echo "  TIMEOUT_MCP_HEALTH: ${TIMEOUT_MCP_HEALTH}s"
echo "  TIMEOUT_SKILL_LOOKUP: ${TIMEOUT_SKILL_LOOKUP}s"
echo "  TIMEOUT_CEREMONY: ${TIMEOUT_CEREMONY}s"
echo "  TIMEOUT_CIRCLE_SKILLS: ${TIMEOUT_CIRCLE_SKILLS}s"
echo "  MAX_SCAN_DEPTH: $MAX_SCAN_DEPTH"

# Check for remaining hardcoded timeouts
echo ""
echo "🔍 Checking for remaining hardcoded timeouts..."
HARDCODED=$(grep -n 'timeout [0-9]s' scripts/ay-prod-cycle.sh | grep -v TIMEOUT_ || true)
if [ -n "$HARDCODED" ]; then
  echo "⚠️  Found hardcoded timeouts:"
  echo "$HARDCODED"
else
  echo "✅ No hardcoded timeouts found"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Phase 1 Complete: Timeout Configuration Centralized"
echo ""
echo "Next steps:"
echo "  1. Test: ./scripts/ay-prod-cycle.sh orchestrator standup advisory"
echo "  2. Proceed to Phase 2: Exit Code Standardization"
