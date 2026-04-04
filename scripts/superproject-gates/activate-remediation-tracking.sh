#!/bin/bash
####################################################################
# Activate Remediation Effectiveness Tracking
####################################################################
# One-command setup for:
# - Before/after state snapshots
# - Causal learning instrumentation
# - Enhanced ceremony audit logging
####################################################################

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "════════════════════════════════════════════════════════════"
echo "🚀 Activating Remediation Effectiveness Tracking"
echo "════════════════════════════════════════════════════════════"
echo ""

# ═══════════════════════════════════════════════════════════════
# Step 1: Apply Database Migration
# ═══════════════════════════════════════════════════════════════

echo "📋 Step 1: Applying database migration..."
cd "$PROJECT_ROOT"

if sqlite3 agentdb.db < scripts/migrations/001_add_remediations.sql 2>&1; then
  echo "   ✅ Migration applied"
else
  echo "   ⚠️  Migration may have already been applied"
fi

# Verify tables
REMED_COUNT=$(sqlite3 agentdb.db "SELECT COUNT(*) FROM sqlite_master WHERE name='remediations'" 2>/dev/null || echo "0")
if [ "$REMED_COUNT" = "1" ]; then
  echo "   ✅ remediations table exists"
else
  echo "   ❌ remediations table missing!"
  exit 1
fi

echo ""

# ═══════════════════════════════════════════════════════════════
# Step 2: Rebuild TypeScript
# ═══════════════════════════════════════════════════════════════

echo "🔨 Step 2: Rebuilding TypeScript..."
if npm run build > /tmp/build.log 2>&1; then
  echo "   ✅ Build successful"
else
  echo "   ⚠️  Build had errors (check /tmp/build.log)"
fi

# Verify ceremony instrumentation module
if [ -f "$PROJECT_ROOT/dist/core/ceremony-instrumentation.js" ]; then
  echo "   ✅ ceremony-instrumentation.js compiled"
else
  echo "   ❌ ceremony-instrumentation.js missing!"
  exit 1
fi

echo ""

# ═══════════════════════════════════════════════════════════════
# Step 3: Test State Capture
# ═══════════════════════════════════════════════════════════════

echo "🔍 Step 3: Testing state capture..."
TEST_STATE=$(node -e "import('./dist/core/ceremony-instrumentation.js').then(async m => {
  const state = await m.captureSystemState();
  console.log(JSON.stringify(state, null, 2));
  process.exit(state.timestamp > 0 ? 0 : 1);
})" 2>/dev/null || echo "FAILED")

if [ "$TEST_STATE" != "FAILED" ]; then
  echo "   ✅ State capture working"
  
  # Show sample state
  SSH_REACHABLE=$(echo "$TEST_STATE" | grep -o '"ssh_reachable":[^,]*' | cut -d':' -f2 | tr -d ' ')
  CONFIG_VALID=$(echo "$TEST_STATE" | grep -o '"config_valid":[^,]*' | cut -d':' -f2 | tr -d ' ')
  echo "   📊 Current state:"
  echo "      ssh_reachable: $SSH_REACHABLE"
  echo "      config_valid: $CONFIG_VALID"
else
  echo "   ❌ State capture failed!"
  exit 1
fi

echo ""

# ═══════════════════════════════════════════════════════════════
# Step 4: Verify Integration
# ═══════════════════════════════════════════════════════════════

echo "✅ Step 4: Verifying integration..."

# Check ay-yo-resolve-action.sh exists
if [ -f "$PROJECT_ROOT/scripts/ay-yo-resolve-action.sh" ]; then
  echo "   ✅ ay-yo-resolve-action.sh found"
else
  echo "   ⚠️  ay-yo-resolve-action.sh not found"
fi

# Check migrations directory
if [ -d "$PROJECT_ROOT/scripts/migrations" ]; then
  echo "   ✅ migrations directory exists"
else
  echo "   ⚠️  migrations directory not found"
fi

echo ""

# ═══════════════════════════════════════════════════════════════
# Final Summary
# ═══════════════════════════════════════════════════════════════

echo "════════════════════════════════════════════════════════════"
echo "✅ REMEDIATION EFFECTIVENESS TRACKING ACTIVATED"
echo "════════════════════════════════════════════════════════════"
echo ""
echo "📊 What's enabled:"
echo "   • Before/after state snapshots"
echo "   • Causal learning instrumentation"
echo "   • Enhanced ceremony audit logging"
echo ""
echo "🔍 Quick verification:"
echo "   sqlite3 agentdb.db '.tables' | grep -E 'remed|causal'"
echo ""
echo "📖 Documentation:"
echo "   docs/REMEDIATION_EFFECTIVENESS_QUICKSTART.md"
echo ""
echo "🚀 Usage:"
echo "   ay yo"
echo "   # Press 1 (infrastructure)"
echo "   # Remediation will now track before/after state!"
echo ""
echo "📊 Query results:"
echo "   sqlite3 agentdb.db 'SELECT * FROM recent_remediations LIMIT 5;'"
echo ""
