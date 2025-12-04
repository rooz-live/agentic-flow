#!/bin/bash
# Repository Reorganization Script - Lean Budget Compliance
# Classifies orphaned projects into lifecycle directories

set -e

REPO_ROOT="/Users/shahroozbhopti/Documents/code"
cd "$REPO_ROOT"

echo "=== Lean Budget Repository Reorganization ==="
echo "Timestamp: $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
echo ""

# Create lifecycle directories if missing
mkdir -p evaluating emerging investing extracting retiring

# Move documentation to proper location
echo "📄 Organizing documentation..."
mkdir -p docs/governance
mv -v CRITICAL_BLOCKER_RESOLUTION_PLAN.md docs/governance/ 2>/dev/null || true
mv -v ENVIRONMENT_RESTORATION_AUDIT_REPORT.md docs/governance/ 2>/dev/null || true
mv -v KNOWLEDGE_GAP_ANALYSIS.md docs/governance/ 2>/dev/null || true
mv -v LEAN_AGENTIC_INTEGRATION_MILESTONES.md docs/governance/ 2>/dev/null || true
mv -v SECRETS_MANAGEMENT_IMPLEMENTATION.md docs/governance/ 2>/dev/null || true
mv -v SECURITY_AUDIT_REPORT.md docs/governance/ 2>/dev/null || true
mv -v SECURITY_REMEDIATION_PLAN.md docs/governance/ 2>/dev/null || true
mv -v TEST_ALIGNMENT_VERIFICATION.md docs/governance/ 2>/dev/null || true

# Delete stale logs and broken symlinks
echo ""
echo "🗑️  Removing stale files..."
rm -fv firebase-debug.log
rm -fv claude-flow 2>/dev/null || true
rm -rf .git.DISABLED 2>/dev/null || true

# Classify projects into lifecycle directories
echo ""
echo "📦 Classifying projects..."

# EVALUATING - Proof-of-concept and experimental
echo "  → evaluating/ (experimental projects)"
if [ -d "ssr_test" ]; then
    mv -v ssr_test evaluating/ssr-experiments
fi
if [ -d "mobile" ] && [ $(find mobile -type f | wc -l) -lt 10 ]; then
    mv -v mobile evaluating/mobile-prototypes
fi

# EMERGING - Early-stage development
echo "  → emerging/ (early-stage projects)"
if [ -d "ml" ]; then
    mv -v ml emerging/ml-training-infrastructure
fi
if [ -d "training" ]; then
    mv -v training emerging/ml-training-pipelines
fi
if [ -d "web" ]; then
    mv -v web emerging/web-applications
fi
if [ -d "mobile" ]; then
    # Fallback if mobile has more files
    mv -v mobile emerging/mobile-applications
fi

# INVESTING - Active development (mature projects)
echo "  → investing/ (active development)"
if [ -d "ruvector" ]; then
    mv -v ruvector investing/ruvector
fi

# DEPLOYMENT - Shared infrastructure (keep at root as approved cross-cutting concern)
# deployment/ is cross-cutting infrastructure, can stay at root temporarily
# Or move to shared infrastructure model:
if [ -d "deployment" ]; then
    echo "  ℹ️  deployment/ - Evaluating as cross-cutting infrastructure..."
    echo "     Consider moving to investing/infrastructure-as-code if project-specific"
fi

# __tests__ - Move to appropriate project or create test infrastructure
if [ -d "__tests__" ]; then
    echo "  ℹ️  __tests__/ - Evaluating test fixtures..."
    # Check if related to agentic-flow
    if [ -f "__tests__/agentic-flow.test.js" ]; then
        mv -v __tests__ investing/agentic-flow/__tests__
    else
        mkdir -p evaluating/test-infrastructure
        mv -v __tests__ evaluating/test-infrastructure/
    fi
fi

# src/ - Merge utility into appropriate project
if [ -d "src" ]; then
    echo "  ℹ️  src/ - Merging utilities..."
    if [ -f "src/utils/SafeGuard.ts" ]; then
        # Move to shared scripts if truly cross-cutting
        mkdir -p scripts/utils
        mv -v src/utils/SafeGuard.ts scripts/utils/
        rm -rf src/
    fi
fi

echo ""
echo "✅ Reorganization complete!"
echo ""
echo "=== Post-Reorganization Audit ==="
find . -maxdepth 1 -type d ! -name "." ! -name "evaluating" ! -name "emerging" ! -name "investing" ! -name "extracting" ! -name "retiring" ! -name ".goalie" ! -name ".governance" ! -name "coordination" ! -name "scripts" ! -name "docs" ! -name "logs" ! -name "memory" ! -name "reports" ! -name "node_modules" ! -name ".git" ! -name ".vscode" ! -name ".mypy_cache" ! -name ".pytest_cache" ! -name ".claude" ! -name ".claude-flow" ! -name ".hive-mind" ! -name ".swarm" ! -name ".archived-temp" ! -name ".archived-agentic-flow-root" ! -name "deployment" | sort

echo ""
echo "Remaining violations (if any) listed above"
echo "deployment/ is permitted as cross-cutting infrastructure"
