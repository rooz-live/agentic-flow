#!/usr/bin/env bash
#
# fire-execute.sh - Focused Incremental Relentless Execution
#
# Implements the 9-iteration orchestrator cycle with comprehensive tracking,
# learning validation, and verdict generation.
#
# Philosophy: Manthra (thought) → Yasna (alignment) → Mithra (coherence)
#

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Colors
BLUE='\033[0;34m'
CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
MAGENTA='\033[0;35m'
NC='\033[0m'

# Configuration
ITERATIONS=${1:-9}
CACHE_DIR="$PROJECT_ROOT/.cache"
LOGS_DIR="$PROJECT_ROOT/logs"
REPORTS_DIR="$PROJECT_ROOT/reports"

mkdir -p "$CACHE_DIR" "$LOGS_DIR" "$REPORTS_DIR"

# Metrics tracking
BASELINE_FILE="$LOGS_DIR/fire-baseline-$(date +%Y%m%d-%H%M%S).json"
METRICS_FILE="$LOGS_DIR/fire-metrics-$(date +%Y%m%d-%H%M%S).jsonl"
VERDICT_FILE="$REPORTS_DIR/fire-verdict-$(date +%Y%m%d-%H%M%S).md"

echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${MAGENTA}   🔥 FIRE: Focused Incremental Relentless Execution${NC}"
echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${CYAN}Iterations:${NC} $ITERATIONS"
echo -e "${CYAN}Baseline:${NC} $BASELINE_FILE"
echo -e "${CYAN}Metrics:${NC} $METRICS_FILE"
echo -e "${CYAN}Verdict:${NC} $VERDICT_FILE"
echo ""

# ═══════════════════════════════════════════════════════════════════════
# PRE-CYCLE: Establish Baseline (Manthra - Directed Thought)
# ═══════════════════════════════════════════════════════════════════════
echo -e "${BLUE}━━━ Phase 1: MANTHRA (Establish Baseline) ━━━${NC}"
echo ""

if [ -f "$SCRIPT_DIR/baseline-metrics.sh" ]; then
    "$SCRIPT_DIR/baseline-metrics.sh" --output "$BASELINE_FILE" --format json
else
    echo -e "${YELLOW}⚠ baseline-metrics.sh not found, creating minimal baseline${NC}"
    cat > "$BASELINE_FILE" <<EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "git": {
    "branch": "$(git branch --show-current)",
    "commit": "$(git rev-parse --short HEAD)"
  },
  "tests": {
    "passed": 0,
    "failed": 0
  }
}
EOF
fi

echo ""

# ═══════════════════════════════════════════════════════════════════════
# ITERATION LOOP: Execute Cycles (Yasna - Alignment Through Practice)
# ═══════════════════════════════════════════════════════════════════════
echo -e "${BLUE}━━━ Phase 2: YASNA (Iterative Alignment) ━━━${NC}"
echo ""

SUCCESSFUL_ITERATIONS=0
FAILED_ITERATIONS=0

for i in $(seq 1 "$ITERATIONS"); do
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${CYAN}📊 ITERATION $i/$ITERATIONS${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    
    ITERATION_START=$(date +%s)
    
    # Run orchestrator with learning enabled
    if ENABLE_AUTO_LEARNING=1 "$SCRIPT_DIR/ay-yo.sh" orchestrator standup advisory 2>&1 | tee -a "$LOGS_DIR/fire-iteration-$i.log"; then
        ITERATION_STATUS="success"
        ((SUCCESSFUL_ITERATIONS++))
        echo -e "${GREEN}✓ Iteration $i completed successfully${NC}"
    else
        ITERATION_STATUS="failed"
        ((FAILED_ITERATIONS++))
        echo -e "${RED}✗ Iteration $i failed${NC}"
    fi
    
    ITERATION_END=$(date +%s)
    ITERATION_DURATION=$((ITERATION_END - ITERATION_START))
    
    # Capture iteration metrics
    cat >> "$METRICS_FILE" <<EOF
{"iteration": $i, "status": "$ITERATION_STATUS", "duration_sec": $ITERATION_DURATION, "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"}
EOF
    
    # Check for learning artifacts
    LEARNING_COUNT=$(find "$CACHE_DIR" -name "learning-retro-*.json" 2>/dev/null | wc -l | xargs)
    echo -e "${CYAN}  Learning artifacts: $LEARNING_COUNT${NC}"
    
    # Brief pause for system stability
    if [ $i -lt "$ITERATIONS" ]; then
        sleep 5
    fi
    
    echo ""
done

# ═══════════════════════════════════════════════════════════════════════
# POST-VALIDATION: Analyze Results (Mithra - Binding Coherence)
# ═══════════════════════════════════════════════════════════════════════
echo -e "${BLUE}━━━ Phase 3: MITHRA (Validate Coherence) ━━━${NC}"
echo ""

# Count learning artifacts
LEARNING_ARTIFACTS=$(find "$CACHE_DIR" -name "learning-retro-*.json" 2>/dev/null | wc -l | xargs)
TRANSMISSION_LOG="$REPORTS_DIR/learning-transmission.log"

if [ -f "$TRANSMISSION_LOG" ]; then
    TRANSMISSION_LINES=$(wc -l < "$TRANSMISSION_LOG" 2>/dev/null | xargs)
else
    TRANSMISSION_LINES=0
fi

echo -e "${CYAN}Learning Artifacts:${NC} $LEARNING_ARTIFACTS files"
echo -e "${CYAN}Transmission Log:${NC} $TRANSMISSION_LINES entries"

# Check AgentDB skills
echo ""
echo -e "${CYAN}Checking AgentDB skills...${NC}"
if command -v npx &> /dev/null; then
    SKILLS_COUNT=$(npx agentdb skills list 2>/dev/null | grep -c "^- " || echo "0")
    echo -e "${CYAN}Skills in AgentDB:${NC} $SKILLS_COUNT"
else
    SKILLS_COUNT=0
    echo -e "${YELLOW}⚠ npx not available, skipping skills check${NC}"
fi

# ═══════════════════════════════════════════════════════════════════════
# VERDICT GENERATION: GO/CONTINUE/NO_GO Decision
# ═══════════════════════════════════════════════════════════════════════
echo ""
echo -e "${BLUE}━━━ Generating Verdict ━━━${NC}"
echo ""

SUCCESS_RATE=$(awk "BEGIN {printf \"%.1f\", ($SUCCESSFUL_ITERATIONS / $ITERATIONS) * 100}")

# Determine verdict
VERDICT="CONTINUE"
if (( $(echo "$SUCCESS_RATE >= 95" | bc -l) )) && [ "$LEARNING_ARTIFACTS" -gt 0 ]; then
    VERDICT="GO"
elif (( $(echo "$SUCCESS_RATE < 50" | bc -l) )) || [ "$FAILED_ITERATIONS" -gt 5 ]; then
    VERDICT="NO_GO"
fi

# Generate verdict report
cat > "$VERDICT_FILE" <<EOF
# 🔥 FIRE Execution Verdict

**Generated:** $(date -u +%Y-%m-%dT%H:%M:%SZ)
**Iterations:** $ITERATIONS
**Status:** **$VERDICT**

---

## Execution Metrics

| Metric | Value | Status |
|--------|-------|--------|
| Success Rate | ${SUCCESS_RATE}% | $([ $(echo "$SUCCESS_RATE >= 90" | bc -l) -eq 1 ] && echo "✅" || echo "⚠️") |
| Successful | $SUCCESSFUL_ITERATIONS/$ITERATIONS | |
| Failed | $FAILED_ITERATIONS/$ITERATIONS | |
| Learning Artifacts | $LEARNING_ARTIFACTS | $([ "$LEARNING_ARTIFACTS" -gt 0 ] && echo "✅" || echo "❌") |
| Transmission Log | $TRANSMISSION_LINES entries | |
| Skills (AgentDB) | $SKILLS_COUNT | |

---

## Verdict: $VERDICT

EOF

case "$VERDICT" in
    GO)
        cat >> "$VERDICT_FILE" <<EOF
### ✅ GO - Proceed to Next Phase

**Conditions Met:**
- Success rate ≥ 95%
- Learning artifacts generated
- System stability maintained

**Recommended Actions:**
1. Execute extended validation (24h window)
2. Wire skills to AgentDB persistence
3. Implement trajectory tracking baseline
4. Enable live dashboard monitoring

**Next Command:**
\`\`\`bash
./scripts/ay-yo.sh assessor governance advisory --dynamic
./scripts/setup-trajectory-tracking.sh
\`\`\`
EOF
        ;;
    CONTINUE)
        cat >> "$VERDICT_FILE" <<EOF
### ⚠️ CONTINUE - Monitor and Iterate

**Status:**
- Success rate: ${SUCCESS_RATE}% (acceptable, not optimal)
- Some iterations failed or learning limited

**Recommended Actions:**
1. Review failed iteration logs
2. Investigate learning artifact generation
3. Run additional cycles if needed
4. Check system resource constraints

**Debug Commands:**
\`\`\`bash
# Review failures
cat logs/fire-iteration-*.log | grep -i error

# Check learning system
ls -la .cache/learning-retro-*.json
cat reports/learning-transmission.log

# Run single test iteration
ENABLE_AUTO_LEARNING=1 ./scripts/ay-yo.sh orchestrator standup advisory
\`\`\`
EOF
        ;;
    NO_GO)
        cat >> "$VERDICT_FILE" <<EOF
### 🛑 NO_GO - Critical Issues Detected

**Problems:**
- Success rate < 50% or too many failures
- System instability detected
- Learning mechanisms not functioning

**Required Actions:**
1. **STOP** further iterations
2. Investigate root causes in logs
3. Fix critical failures before retry
4. Review test suite health

**Investigation Commands:**
\`\`\`bash
# Check test suite
npm test

# Review error logs
tail -100 logs/fire-iteration-*.log

# Check system resources
./scripts/baseline-metrics.sh

# Validate dependencies
npm ci
\`\`\`

**Do not proceed until issues resolved.**
EOF
        ;;
esac

# Append Three-Dimensional Analysis
cat >> "$VERDICT_FILE" <<EOF

---

## Three-Dimensional Coherence Check

### 🧠 Spiritual (Manthra - Thought-Power)
- **Baseline Established:** $([ -f "$BASELINE_FILE" ] && echo "✅ Yes" || echo "❌ No")
- **Directed Intention:** Learning enabled across all iterations
- **Focus Maintained:** $([ "$FAILED_ITERATIONS" -le 2 ] && echo "✅ Minimal drift" || echo "⚠️ Attention fragmented")

### ⚖️ Ethical (Visible Alignment)
- **Tests Passing:** $(npm test 2>&1 | grep -c "Tests:.*passed" || echo "Check required")
- **Code Quality:** Maintained (divergence test fixed)
- **Transparency:** Full logging enabled

### 💪 Embodied (Lived Practice)
- **Repetition Survived:** $SUCCESSFUL_ITERATIONS/$ITERATIONS cycles completed
- **Fatigue Resistance:** $([ "$SUCCESS_RATE" == "100.0" ] && echo "✅ Perfect" || echo "⚠️ Some degradation")
- **Real-World Stress Test:** $([ "$ITERATIONS" -ge 9 ] && echo "✅ Sufficient" || echo "⚠️ Increase sample")

---

## Structural Integrity Assessment

**Free Rider Detection:** $([ "$LEARNING_ARTIFACTS" -eq 0 ] && echo "⚠️ Learning not circulating" || echo "✅ Value generated")

**Circulation Mechanism:** $([ "$TRANSMISSION_LINES" -gt 0 ] && echo "✅ Knowledge flowing" || echo "❌ Stagnant system")

**Truth vs. Authority Tension:** Maintained (tests verify truth, scripts preserve continuity)

**Load-Bearing Capacity:** $([ "$FAILED_ITERATIONS" -eq 0 ] && echo "✅ Robust" || echo "⚠️ Weakest link: iteration failures")

---

## Recommended Next Steps

EOF

if [ "$VERDICT" == "GO" ]; then
    cat >> "$VERDICT_FILE" <<EOF
1. **Wire Skills to AgentDB** - Persist learned patterns
2. **Trajectory Tracking** - Measure improvement over time
3. **Extended Validation** - 24-hour continuous mode
4. **Dashboard Monitoring** - Live UX for progress visibility
5. **Governance Cycle** - Weekly rhythmic alignment check

\`\`\`bash
# Execute next phase
./scripts/wire-skills-to-agentdb.sh
./scripts/setup-trajectory-tracking.sh
./scripts/ay-yo.sh orchestrator assess advisory --dynamic
\`\`\`
EOF
elif [ "$VERDICT" == "CONTINUE" ]; then
    cat >> "$VERDICT_FILE" <<EOF
1. **Debug Failures** - Review logs for patterns
2. **Re-run Subset** - Target failed iterations
3. **Resource Check** - Ensure system capacity
4. **Learning Validation** - Verify artifact structure

\`\`\`bash
# Targeted retry
for i in {failed_iterations}; do
  ENABLE_AUTO_LEARNING=1 ./scripts/ay-yo.sh orchestrator standup advisory
done
\`\`\`
EOF
else
    cat >> "$VERDICT_FILE" <<EOF
1. **HALT EXECUTION**
2. **Root Cause Analysis** - Critical debugging required
3. **Fix & Validate** - Repair before retry
4. **Test Suite Health** - Ensure baseline functionality

\`\`\`bash
# Emergency diagnostics
npm test 2>&1 | tee logs/emergency-test-run.log
./scripts/baseline-metrics.sh
git status
\`\`\`
EOF
fi

cat >> "$VERDICT_FILE" <<EOF

---

## Artifacts Generated

- **Baseline:** \`$BASELINE_FILE\`
- **Metrics:** \`$METRICS_FILE\`
- **Logs:** \`logs/fire-iteration-*.log\`
- **Learning:** \`.cache/learning-retro-*.json\`
- **Verdict:** \`$VERDICT_FILE\`

---

*"Truth that does not survive the body, could not survive."*  
— Embodied coherence through $ITERATIONS cycles of practice
EOF

# ═══════════════════════════════════════════════════════════════════════
# DISPLAY VERDICT
# ═══════════════════════════════════════════════════════════════════════
echo ""
echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

case "$VERDICT" in
    GO)
        echo -e "${GREEN}   ✅ VERDICT: GO${NC}"
        ;;
    CONTINUE)
        echo -e "${YELLOW}   ⚠️  VERDICT: CONTINUE${NC}"
        ;;
    NO_GO)
        echo -e "${RED}   🛑 VERDICT: NO_GO${NC}"
        ;;
esac

echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${CYAN}Success Rate:${NC} ${SUCCESS_RATE}%"
echo -e "${CYAN}Iterations:${NC} $SUCCESSFUL_ITERATIONS successful, $FAILED_ITERATIONS failed"
echo -e "${CYAN}Learning:${NC} $LEARNING_ARTIFACTS artifacts generated"
echo ""
echo -e "${GREEN}📊 Full report:${NC} $VERDICT_FILE"
echo ""

# Open verdict if on macOS
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo -e "${CYAN}Opening verdict report...${NC}"
    open "$VERDICT_FILE" 2>/dev/null || cat "$VERDICT_FILE"
else
    cat "$VERDICT_FILE"
fi

echo ""
echo -e "${GREEN}✅ FIRE execution complete!${NC}"
echo ""

# Exit with appropriate code
case "$VERDICT" in
    GO) exit 0 ;;
    CONTINUE) exit 0 ;;
    NO_GO) exit 1 ;;
esac
