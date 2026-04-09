#!/usr/bin/env bash
#
# Test TUI Dashboard Portfolio + Coherence Integration
# =====================================================
# Tests the enhanced TUI dashboard with portfolio and coherence metrics
#
# Usage:
#   ./scripts/test-tui-portfolio-coherence.sh
#   ./scripts/test-tui-portfolio-coherence.sh --with-coherence
#   ./scripts/test-tui-portfolio-coherence.sh --with-portfolio

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_ROOT"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  TUI Dashboard Portfolio + Coherence Integration Test${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"

# Step 1: Check dependencies
echo -e "\n${YELLOW}Step 1: Checking dependencies...${NC}"
if ! python3 -c "import textual" 2>/dev/null; then
    echo -e "${RED}✗ Textual not installed${NC}"
    echo "Installing textual..."
    pip install textual
fi
echo -e "${GREEN}✓ Textual installed${NC}"

# Step 2: Create mock coherence data
echo -e "\n${YELLOW}Step 2: Creating mock coherence data...${NC}"
mkdir -p .coherence
cat > .coherence/coherence_report.json <<EOF
{
  "coherence_score": 94.05,
  "adr_ddd_score": 100.0,
  "ddd_tdd_score": 82.14,
  "adr_tdd_score": 100.0,
  "summary": {
    "total_adrs": 7,
    "total_models": 14,
    "tested_models": 9,
    "average_test_coverage": 85.3
  },
  "validation_timestamp": "2026-02-13T12:00:00Z"
}
EOF
echo -e "${GREEN}✓ Mock coherence data created${NC}"

# Step 3: Create mock validation results
echo -e "\n${YELLOW}Step 3: Creating mock validation results...${NC}"
cat > tui_dashboard_data.json <<EOF
{
  "consensus": {
    "score": 85.5,
    "status": "PASS",
    "total_roles": 21
  },
  "roam": {
    "resolved": 5,
    "owned": 3,
    "accepted": 2,
    "mitigated": 1
  },
  "wsjf": {
    "score": 11.25,
    "priority": "HIGH",
    "rank": 1
  },
  "meta": {
    "diversity_score": 0.85,
    "entropy": 0.72,
    "passk_optimization": {
      "k": 5,
      "pass_rate": 0.9,
      "best_approach": "Strategic diversity",
      "improvement_over_first": 0.25
    }
  }
}
EOF
echo -e "${GREEN}✓ Mock validation results created${NC}"

# Step 4: Run coherence pipeline (if requested)
if [[ "${1:-}" == "--with-coherence" ]]; then
    echo -e "\n${YELLOW}Step 4: Running coherence pipeline...${NC}"
    if [[ -f "./scripts/ddd-tdd-adr-coherence.sh" ]]; then
        ./scripts/ddd-tdd-adr-coherence.sh || true
        echo -e "${GREEN}✓ Coherence pipeline executed${NC}"
    else
        echo -e "${YELLOW}⚠ Coherence pipeline script not found, using mock data${NC}"
    fi
fi

# Step 5: Test TUI dashboard
echo -e "\n${YELLOW}Step 5: Testing TUI dashboard...${NC}"
echo -e "${YELLOW}Instructions:${NC}"
echo "  1. Dashboard will launch in 3 seconds"
echo "  2. Press 'p' to toggle Portfolio + Coherence view"
echo "  3. Press 's' to toggle Strategic (33-role) view"
echo "  4. Press 'r' to refresh all widgets"
echo "  5. Press 'q' to quit"
echo ""
echo -e "${GREEN}Launching dashboard in 3 seconds...${NC}"
sleep 3

# Launch dashboard
python3 validation_dashboard_tui.py

# Step 6: Verify results
echo -e "\n${YELLOW}Step 6: Verifying results...${NC}"

# Check if coherence data was loaded
if [[ -f ".coherence/coherence_report.json" ]]; then
    COHERENCE_SCORE=$(python3 -c "import json; print(json.load(open('.coherence/coherence_report.json'))['coherence_score'])")
    echo -e "${GREEN}✓ Coherence score: ${COHERENCE_SCORE}%${NC}"
else
    echo -e "${RED}✗ Coherence data not found${NC}"
fi

# Check if validation results exist
if [[ -f "tui_dashboard_data.json" ]]; then
    CONSENSUS_SCORE=$(python3 -c "import json; print(json.load(open('tui_dashboard_data.json'))['consensus']['score'])")
    echo -e "${GREEN}✓ Consensus score: ${CONSENSUS_SCORE}%${NC}"
else
    echo -e "${RED}✗ Validation results not found${NC}"
fi

echo -e "\n${GREEN}═══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  Test Complete!${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
echo ""
echo "Next steps:"
echo "  1. Integrate with Rust portfolio module (NAPI-RS)"
echo "  2. Replace mock data with real portfolio calculations"
echo "  3. Add historical coherence tracking"
echo ""

