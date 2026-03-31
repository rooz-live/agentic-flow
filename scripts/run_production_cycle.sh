#!/bin/bash
set -e

echo "======================================================================="
echo "🎓 PRODUCTION CYCLE WITH LEARNING EVIDENCE & COMPOUNDING BENEFITS"
echo "======================================================================="
echo ""

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_ROOT"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}Phase 1: Enable Evidence Collection${NC}"
echo "-----------------------------------------------------------------------"
echo ""

# Check and enable evidence emitters
if [ ! -f "config/evidence_config.json" ]; then
    echo "⚠️  Evidence config not found, using defaults"
else
    echo "📋 Listing available evidence emitters..."
    ./scripts/af evidence list || echo "   (evidence list not available)"
    echo ""
    
    echo "🔓 Enabling economic_compounding emitter..."
    if ! ./scripts/af evidence enable economic_compounding 2>&1; then
        echo "   ⚠️  Enable failed, checking if already enabled..."
        if ! ./scripts/af evidence list 2>/dev/null | grep -q "economic_compounding.*enabled"; then
            echo "   ❌ CRITICAL: economic_compounding emitter not available"
            exit 1
        fi
        echo "   ✅ Already enabled"
    fi
    echo ""
fi

# Verify evidence file
echo "📁 Checking evidence file..."
if [ -f ".goalie/evidence.jsonl" ]; then
    ls -lh .goalie/evidence.jsonl
    echo "   ✅ Evidence file exists"
else
    echo "   ⚠️  Creating evidence file..."
    touch .goalie/evidence.jsonl
    echo "   ✅ Evidence file created"
fi
echo ""

# Ensure learning evidence files exist
echo "📁 Initializing learning evidence tracking..."
mkdir -p .goalie
touch .goalie/learning_evidence.jsonl
touch .goalie/compounding_benefits.jsonl
echo "   ✅ Learning evidence files ready"
echo ""

echo "======================================================================="
echo -e "${BLUE}Phase 2: Pre-Assessment (Learning Baseline)${NC}"
echo "======================================================================="
echo ""

echo "📊 Running enhanced needs assessment..."
python3 scripts/cmd_prod_enhanced.py --assess-only

echo ""
echo "======================================================================="
echo -e "${BLUE}Phase 3: Production Cycle with Compounding Benefits (3 Rotations)${NC}"
echo "======================================================================="
echo ""

echo "🚀 Starting enhanced production orchestrator..."
echo "   This will:"
echo "   1. Run adaptive cycle→swarm rotations"
echo "   2. Track learning evidence at each step"
echo "   3. Calculate compounding benefits"
echo "   4. Re-assess after each rotation (learning loop)"
echo ""

# Run enhanced prod with 3 rotations
python3 scripts/cmd_prod_enhanced.py --rotations 3 --mode advisory

PROD_EXIT=$?

echo ""
echo "======================================================================="
echo -e "${BLUE}Phase 4: Post-Execution Assessment${NC}"
echo "======================================================================="
echo ""

if [ $PROD_EXIT -eq 0 ] || [ $PROD_EXIT -eq 130 ]; then
    echo "✅ Production cycle completed (exit code: $PROD_EXIT)"
else
    echo "⚠️  Production cycle had issues (exit code: $PROD_EXIT)"
fi

echo ""
echo "📊 Running evidence assessment..."
./scripts/af evidence assess --recent 10 || echo "   ⚠️  Assessment unavailable (may need more evidence)"

echo ""
echo "======================================================================="
echo -e "${BLUE}Phase 5: Learning Evidence Analysis${NC}"
echo "======================================================================="
echo ""

echo "📈 Analyzing learning evidence..."
if [ -f ".goalie/learning_evidence.jsonl" ]; then
    LEARNING_COUNT=$(wc -l < .goalie/learning_evidence.jsonl)
    echo "   Learning Events Captured: $LEARNING_COUNT"
    
    if [ $LEARNING_COUNT -gt 0 ]; then
        echo ""
        echo "   Recent Learning Events:"
        tail -5 .goalie/learning_evidence.jsonl | python3 -c "
import sys, json
for line in sys.stdin:
    try:
        event = json.loads(line)
        print(f\"   - {event.get('event_type', 'unknown')}: {event.get('timestamp', 'no timestamp')}\")
    except: pass
" || cat .goalie/learning_evidence.jsonl | tail -5
    fi
else
    echo "   ⚠️  No learning evidence file found"
fi

echo ""
echo "💰 Analyzing compounding benefits..."
if [ -f ".goalie/compounding_benefits.jsonl" ]; then
    BENEFITS_COUNT=$(wc -l < .goalie/compounding_benefits.jsonl)
    echo "   Benefit Entries: $BENEFITS_COUNT"
    
    if [ $BENEFITS_COUNT -gt 0 ]; then
        echo ""
        echo "   Latest Compounding Metrics:"
        tail -1 .goalie/compounding_benefits.jsonl | python3 -c "
import sys, json
for line in sys.stdin:
    try:
        benefit = json.loads(line)
        metrics = benefit.get('metrics', {})
        cumulative = benefit.get('cumulative', {})
        print(f\"   Rotation: {benefit.get('rotation', 0)}\")
        print(f\"   Iterations: {metrics.get('iterations', 0)}\")
        print(f\"   Improvements: {metrics.get('improvements', 0)}\")
        print(f\"   Cumulative Iterations: {cumulative.get('total_iterations', 0)}\")
        print(f\"   Cumulative Improvements: {cumulative.get('total_improvements', 0)}\")
        print(f\"   Improvement Rate: {cumulative.get('improvement_rate', 0):.1%}\")
    except: pass
" || cat .goalie/compounding_benefits.jsonl | tail -1
    fi
else
    echo "   ⚠️  No compounding benefits file found"
fi

echo ""
echo "======================================================================="
echo -e "${BLUE}Phase 6: Quality Validation${NC}"
echo "======================================================================="
echo ""

echo "🔍 Running post-flight quality gates..."
python3 scripts/quality/prod_quality_gates.py --context post

echo ""
echo "======================================================================="
echo -e "${GREEN}✅ WORKFLOW COMPLETE${NC}"
echo "======================================================================="
echo ""

echo "📁 Generated Artifacts:"
echo "   - .goalie/learning_evidence.jsonl (learning events)"
echo "   - .goalie/compounding_benefits.jsonl (benefit metrics)"
echo "   - .goalie/evidence.jsonl (evidence collection)"
echo "   - .goalie/pattern_metrics.jsonl (system metrics)"
echo ""

echo "📊 View Learning Summary:"
echo "   python3 -c 'import json; [print(json.dumps(json.loads(line), indent=2)) for line in open(\".goalie/learning_evidence.jsonl\")]' | tail -50"
echo ""

echo "💰 View Compounding Benefits:"
echo "   python3 -c 'import json; [print(json.dumps(json.loads(line), indent=2)) for line in open(\".goalie/compounding_benefits.jsonl\")]'"
echo ""

echo "🎯 Next Steps:"
echo "   1. Review learning evidence for insights"
echo "   2. Analyze compounding benefits growth"
echo "   3. Run ./scripts/af evidence assess to check graduation status"
echo "   4. Iterate with more rotations to compound benefits further"
echo ""

exit $PROD_EXIT
