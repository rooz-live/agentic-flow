#!/usr/bin/env bash
# Validate Learned Skills - Human-in-Loop Verification
# Prevents "reward hacking" and validates real improvement

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

CIRCLE="${1:-orchestrator}"

# Colors
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $*"; }
log_success() { echo -e "${GREEN}[✓]${NC} $*"; }
log_warning() { echo -e "${YELLOW}[⚠]${NC} $*"; }
log_error() { echo -e "${RED}[✗]${NC} $*"; }

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  SKILL VALIDATION REPORT: $CIRCLE"
echo "  $(date '+%Y-%m-%d %H:%M:%S')"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo

# 1. Export skills
log_info "Exporting skills for $CIRCLE..."
SKILLS_JSON=$(npx agentdb skill export --circle "$CIRCLE" 2>/dev/null || echo "{}")

SKILL_COUNT=$(echo "$SKILLS_JSON" | jq '. | length' 2>/dev/null || echo "0")

if [[ "$SKILL_COUNT" == "0" ]]; then
    log_warning "No skills found for circle: $CIRCLE"
    echo
    echo "This could mean:"
    echo "  • Not enough divergent episodes run"
    echo "  • MPP hasn't detected patterns yet"
    echo "  • Skills exist but export failed"
    echo
    echo "Try running:"
    echo "  ./scripts/divergence-test.sh --phase 1 $CIRCLE"
    exit 0
fi

log_success "Found $SKILL_COUNT skills"
echo

# 2. Analyze skills
log_info "Analyzing skill quality..."
echo

echo "$SKILLS_JSON" | jq -r '.[] | 
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n" +
    "Skill: \(.name // "unnamed")\n" +
    "Type: \(.type // "unknown")\n" +
    "Confidence: \(.confidence // "N/A")\n" +
    "Usage: \(.usage_count // 0) times\n" +
    "Description: \(.description // "No description")\n"
' 2>/dev/null || echo "Could not parse skills"

echo
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  VALIDATION CHECKLIST"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo

# Anti-pattern detection
log_info "Checking for anti-patterns..."

HAS_SKIP_PATTERN=$(echo "$SKILLS_JSON" | jq -r '.[] | select(.name | contains("skip") or contains("bypass"))' | wc -l)
HAS_FAST_PATTERN=$(echo "$SKILLS_JSON" | jq -r '.[] | select(.name | contains("fast") or contains("quick"))' | wc -l)
HAS_SHORTCUT=$(echo "$SKILLS_JSON" | jq -r '.[] | select(.name | contains("shortcut") or contains("hack"))' | wc -l)

if [[ "$HAS_SKIP_PATTERN" -gt 0 ]]; then
    log_warning "⚠️  Found skills with 'skip' pattern - potential reward hacking"
fi

if [[ "$HAS_FAST_PATTERN" -gt 0 ]]; then
    log_warning "⚠️  Found skills with 'fast' pattern - verify quality maintained"
fi

if [[ "$HAS_SHORTCUT" -gt 0 ]]; then
    log_error "❌ Found shortcut/hack patterns - investigate immediately"
fi

echo

# Quality checks
log_info "Running quality checks..."

LOW_CONFIDENCE=$(echo "$SKILLS_JSON" | jq -r '.[] | select(.confidence < 0.7)' | wc -l)
if [[ "$LOW_CONFIDENCE" -gt 0 ]]; then
    log_warning "⚠️  $LOW_CONFIDENCE skills have low confidence (<0.7)"
fi

LOW_USAGE=$(echo "$SKILLS_JSON" | jq -r '.[] | select(.usage_count < 5)' | wc -l)
if [[ "$LOW_USAGE" -gt 0 ]]; then
    log_warning "⚠️  $LOW_USAGE skills have low usage (<5)"
fi

echo
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  MANUAL VALIDATION REQUIRED"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo
echo "Review each skill and verify:"
echo "  1. Does it improve actual outcomes (not just metrics)?"
echo "  2. Does it maintain quality standards?"
echo "  3. Is it generalizable or overfit to test data?"
echo "  4. Would a domain expert approve this pattern?"
echo
echo "Commands:"
echo "  • View full details: npx agentdb skill export --circle $CIRCLE | jq ."
echo "  • Test in production: ./scripts/ay-prod-cycle.sh $CIRCLE <ceremony> advisory"
echo "  • Rollback if needed: ./scripts/divergence-test.sh --rollback"
echo

# Final recommendation
TOTAL_ISSUES=$((HAS_SKIP_PATTERN + HAS_SHORTCUT + LOW_CONFIDENCE))

if [[ "$TOTAL_ISSUES" -eq 0 ]]; then
    log_success "✓ All automated checks passed"
    log_success "✓ Safe to proceed with manual validation"
elif [[ "$TOTAL_ISSUES" -lt 3 ]]; then
    log_warning "⚠️  Some issues detected - careful review recommended"
else
    log_error "❌ Multiple issues detected - thorough investigation required"
fi

echo
