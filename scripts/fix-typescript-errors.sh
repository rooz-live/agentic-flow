#!/usr/bin/env bash
# Fix Remaining 62 TypeScript Errors
# Focused on: Discord bot, MCP transports, AISP, governance, integrations

set -euo pipefail

cd "$(dirname "$0")/.."

echo "🔧 Fixing 62 TypeScript Errors"
echo "═══════════════════════════════════════════════════════"
echo ""

# Count initial errors
initial_errors=$(npx tsc --noEmit 2>&1 | grep -c "error TS" || echo "0")
echo "📊 Initial errors: $initial_errors"
echo ""

# ============================================================================
# FIX 1: Discord Bot - Collection Type (10 errors)
# ============================================================================

echo "🔧 [1/6] Fixing Discord bot Collection types..."

# Fix src/discord/core/discord_bot.ts line 439
if [[ -f "src/discord/core/discord_bot.ts" ]]; then
    # Add Collection import if missing
    if ! grep -q "import.*Collection" "src/discord/core/discord_bot.ts"; then
        sed -i '' '1i\
import { Collection } from "discord.js";
' "src/discord/core/discord_bot.ts"
    fi
    
    # Fix Guild[] to Collection conversion at line 439
    sed -i '' 's/guildRequests: Guild\[\]/guildRequests: Collection<string, Guild>/g' "src/discord/core/discord_bot.ts"
    
    echo "  ✓ Fixed Collection types in discord_bot.ts"
fi

# Fix command_handlers.ts - add CommandInteractionOptionResolver
if [[ -f "src/discord/handlers/command_handlers.ts" ]]; then
    sed -i '' 's/CommandInteraction<CacheType>/ChatInputCommandInteraction/g' "src/discord/handlers/command_handlers.ts"
    echo "  ✓ Fixed CommandInteraction types in command_handlers.ts"
fi

# Fix GovernanceConfig type in index.ts
if [[ -f "src/discord/index.ts" ]]; then
    # Add proper GovernanceConfig import or define inline
    sed -i '' 's/governance: { enabled: boolean; apiUrl: string; apiKey: string; }/governance: GovernanceConfig/g' "src/discord/index.ts"
    echo "  ✓ Fixed GovernanceConfig types in index.ts"
fi

echo ""

# ============================================================================
# FIX 2: MCP Transports - Parameter Type Mismatches (5 errors)
# ============================================================================

echo "🔧 [2/6] Fixing MCP transport parameter types..."

# Fix SSE transport
if [[ -f "src/mcp/transports/sse.ts" ]]; then
    # Fix diagnose parameters at line 42
    sed -i '' 's/vitalSigns?: Record<number, unknown>/vitalSigns?: Record<string, number>/g' "src/mcp/transports/sse.ts"
    
    # Fix KnowledgeSearchQuery at line 145
    sed -i '' 's/filters?: { sourceTypes/filters?: KnowledgeFilters \& { sourceTypes/g' "src/mcp/transports/sse.ts"
    
    echo "  ✓ Fixed SSE transport parameter types"
fi

# Fix STDIO transport
if [[ -f "src/mcp/transports/stdio.ts" ]]; then
    # Add type assertion for dateRange at line 252
    sed -i '' 's/\.dateRange/.dateRange as { start?: string; end?: string }/g' "src/mcp/transports/stdio.ts"
    
    echo "  ✓ Fixed STDIO transport type assertions"
fi

echo ""

# ============================================================================
# FIX 3: AISP Specification - Type Conversion (1 error)
# ============================================================================

echo "🔧 [3/6] Fixing AISP specification type conversion..."

if [[ -f "src/aisp/specification.ts" ]]; then
    # Fix line 268 - add 'unknown' intermediate conversion
    sed -i '' 's/as Record<string, unknown>/as unknown as Record<string, unknown>/g' "src/aisp/specification.ts"
    
    echo "  ✓ Fixed AISP type conversion"
fi

echo ""

# ============================================================================
# FIX 4: Integrations - Type Mismatches (3 errors)
# ============================================================================

echo "🔧 [4/6] Fixing integration type mismatches..."

# Fix causal-learning-integration.ts
if [[ -f "src/integrations/causal-learning-integration.ts" ]]; then
    sed -i '' 's/type: "completion"/type: "episode" as const/g' "src/integrations/causal-learning-integration.ts"
    echo "  ✓ Fixed causal learning type literal"
fi

# Fix discord_worker.ts - add ExecutionContext
if [[ -f "src/integrations/discord_worker.ts" ]]; then
    sed -i '' '1i\
import type { ExecutionContext } from "@cloudflare/workers-types";
' "src/integrations/discord_worker.ts"
    echo "  ✓ Added ExecutionContext import"
fi

# Fix stripe_financial_services.ts - function overload
if [[ -f "src/integrations/stripe_financial_services.ts" ]]; then
    # This requires manual review - log for now
    echo "  ⚠️  stripe_financial_services.ts:558 requires manual review (function overload)"
fi

echo ""

# ============================================================================
# FIX 5: Governance & Monitoring - Property Mismatches (3 errors)
# ============================================================================

echo "🔧 [5/6] Fixing governance and monitoring types..."

# Fix semantic_context_enricher.ts
if [[ -f "src/governance/core/semantic_context_enricher.ts" ]]; then
    # Add outcome_tracking to SemanticContext interface
    sed -i '' 's/interface SemanticContext {/interface SemanticContext {\n  outcome_tracking?: unknown;/g' "src/governance/core/semantic_context_enricher.ts"
    echo "  ✓ Added outcome_tracking to SemanticContext"
fi

# Fix automation-self-healing.ts
if [[ -f "src/monitoring/automation-self-healing.ts" ]]; then
    # Fix arguments usage at line 539
    sed -i '' 's/arguments/...args/g' "src/monitoring/automation-self-healing.ts"
    echo "  ✓ Replaced 'arguments' with rest parameters"
fi

echo ""

# ============================================================================
# FIX 6: Main.tsx - Import Extension (1 error)
# ============================================================================

echo "🔧 [6/6] Fixing main.tsx import extension..."

if [[ -f "src/main.tsx" ]]; then
    # Remove .tsx extension from import
    sed -i '' "s/from '\\(.*\\)\\.tsx'/from '\\1'/g" "src/main.tsx"
    echo "  ✓ Removed .tsx extension from imports"
fi

echo ""

# ============================================================================
# VERIFY FIXES
# ============================================================================

echo "📊 Verifying fixes..."
final_errors=$(npx tsc --noEmit 2>&1 | grep -c "error TS" || echo "0")

echo ""
echo "═══════════════════════════════════════════════════════"
echo "✅ TypeScript Error Fix Complete"
echo ""
echo "Results:"
echo "  Before:  $initial_errors errors"
echo "  After:   $final_errors errors"
echo "  Fixed:   $((initial_errors - final_errors)) errors"
echo "  Reduction: $(awk "BEGIN {print ($initial_errors > 0) ? int(($initial_errors - $final_errors) / $initial_errors * 100) : 0}")%"
echo ""

if [[ $final_errors -le 5 ]]; then
    echo "🎉 Excellent! Only $final_errors errors remaining"
elif [[ $final_errors -le 15 ]]; then
    echo "👍 Good progress! $final_errors errors left to fix"
else
    echo "⚠️  $final_errors errors remain - may need manual review"
fi

echo ""
echo "Next steps:"
echo "  1. Review remaining errors: npx tsc --noEmit 2>&1 | grep 'error TS'"
echo "  2. Run tests: npm test"
echo "  3. Generate coverage: npm test -- --coverage"
echo ""
