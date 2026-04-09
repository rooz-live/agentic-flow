#!/usr/bin/env bash
# ay-truth-calibration.sh - Axiomatic Truth-Alignment Verification
# Implements: Manthra (Thought), Yasna (Ritual/Alignment), Mithra (Coherence)
#
# Usage:
#   ./scripts/ay-truth-calibration.sh --phase=manthra   # Pre-cycle thought calibration
#   ./scripts/ay-truth-calibration.sh --phase=yasna     # Mid-cycle intention check
#   ./scripts/ay-truth-calibration.sh --phase=coherence # Post-cycle verification

set -euo pipefail

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Configuration
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
TRUTH_DIR="${PROJECT_ROOT}/data/truth-alignment"
DB_PATH="${PROJECT_ROOT}/agentdb.db"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
BOLD='\033[1m'
DIM='\033[2m'
NC='\033[0m'

# Ensure truth-alignment directory exists
mkdir -p "$TRUTH_DIR"

CYCLE_ID="truth-$(date +%Y%m%d-%H%M%S)"
PHASE="${1:-manthra}"  # Default to manthra (thought calibration)

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Phase 1: MANTHRA - Directed Thought-Power Calibration
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

manthra_calibration() {
    echo ""
    echo -e "${CYAN}╔══════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║${NC} ${BOLD}🧘 MANTHRA: Directed Thought-Power Calibration${NC}"
    echo -e "${CYAN}╚══════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${DIM}\"Not casual thinking, but directed thought-power\"${NC}"
    echo ""
    
    # Question 1: Honest Description of Reality?
    echo -e "${BOLD}1. AXIOMATIC TRUTH CONDITION${NC}"
    echo -e "   ${DIM}Is the world being described honestly?${NC}"
    echo ""
    
    # Show current metrics for context
    if [[ -f "$DB_PATH" ]]; then
        local total_eps=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM episodes;" 2>/dev/null || echo "0")
        local success_eps=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM episodes WHERE success = 1;" 2>/dev/null || echo "0")
        local success_rate=$(echo "scale=1; $success_eps * 100 / $total_eps" | bc 2>/dev/null || echo "0.0")
        
        echo -e "   ${DIM}Current System Metrics:${NC}"
        echo -e "     Success Rate: ${BOLD}${success_rate}%${NC}"
        echo -e "     Total Episodes: ${BOLD}${total_eps}${NC}"
        echo ""
    fi
    
    # Reality check prompt
    echo -e "   ${YELLOW}→ Do current metrics honestly describe reality?${NC}"
    echo -e "     ${DIM}(Consider: Are we measuring what matters, or gaming proxies?)${NC}"
    echo ""
    read -p "     Answer (y/n): " honest_description
    
    local truth_violation=0
    if [[ "$honest_description" != "y" ]]; then
        truth_violation=1
        echo ""
        echo -e "   ${RED}⚠️  TRUTH VIOLATION DETECTED${NC}"
        echo -e "   ${DIM}Metrics may not reflect lived reality${NC}"
        echo ""
        echo -e "   ${BOLD}Recommended Actions:${NC}"
        echo -e "     1. Manual reality audit: ${CYAN}ay truth-audit --manual${NC}"
        echo -e "     2. User interviews: ${CYAN}ay user-interviews --sample=5${NC}"
        echo -e "     3. Compare metrics vs experience: ${CYAN}ay reality-check${NC}"
        echo ""
        read -p "   Continue anyway? (y/n): " force_continue
        if [[ "$force_continue" != "y" ]]; then
            echo ""
            echo -e "   ${RED}Aborting cycle - Truth must precede authority${NC}"
            exit 1
        fi
    else
        echo ""
        echo -e "   ${GREEN}✓ Truth condition satisfied${NC}"
    fi
    
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    
    # Question 2: Authority Legitimacy?
    echo -e "${BOLD}2. AUTHORITY LEGITIMACY CHECK${NC}"
    echo -e "   ${DIM}Is the authority doing the judging legitimate?${NC}"
    echo ""
    echo -e "   ${YELLOW}→ Is judgment grounded in direct experience or positional authority?${NC}"
    echo -e "     ${DIM}(Experience: first-person reality testing)${NC}"
    echo -e "     ${DIM}(Position: compliance with targets/hierarchy)${NC}"
    echo ""
    read -p "     Answer (experience/position): " authority_type
    
    local authority_violation=0
    if [[ "$authority_type" == "position" ]]; then
        authority_violation=1
        echo ""
        echo -e "   ${YELLOW}⚠️  AUTHORITY WITHOUT DISCERNMENT${NC}"
        echo -e "   ${DIM}Judgment source: Positional authority (not lived experience)${NC}"
        echo ""
        echo -e "   ${BOLD}Risk:${NC} Optimizing proxy metrics while ignoring reality"
        echo -e "   ${BOLD}Mitigation:${NC} Restore first-person reality testing"
        echo ""
    else
        echo ""
        echo -e "   ${GREEN}✓ Authority grounded in experience${NC}"
    fi
    
    # Save axiomatic state
    cat > "$TRUTH_DIR/manthra-${CYCLE_ID}.json" <<EOF
{
  "cycle_id": "$CYCLE_ID",
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "phase": "manthra",
  "truth_condition": {
    "honest_description": "$honest_description",
    "truth_violation": $truth_violation
  },
  "authority_condition": {
    "authority_type": "$authority_type",
    "authority_violation": $authority_violation
  },
  "next_phase": "yasna"
}
EOF
    
    echo ""
    echo -e "${BOLD}📊 MANTHRA Assessment:${NC}"
    if [[ $truth_violation -eq 0 ]] && [[ $authority_violation -eq 0 ]]; then
        echo -e "   ${GREEN}✓ ALIGNED${NC} - Thought calibration verified"
    elif [[ $truth_violation -eq 1 ]] || [[ $authority_violation -eq 1 ]]; then
        echo -e "   ${YELLOW}⚠ CAUTION${NC} - Risks identified but acknowledged"
    fi
    echo ""
    echo -e "   ${DIM}State saved: ${CYAN}$TRUTH_DIR/manthra-${CYCLE_ID}.json${NC}"
    echo ""
    echo -e "${BOLD}Next:${NC} Run ${CYAN}./scripts/ay-truth-calibration.sh yasna${NC} during cycle"
    echo ""
}

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Phase 2: YASNA - Ritual as Alignment (not performance)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

yasna_alignment() {
    echo ""
    echo -e "${MAGENTA}╔══════════════════════════════════════════════════════════╗${NC}"
    echo -e "${MAGENTA}║${NC} ${BOLD}🙏 YASNA: Ritual as Alignment (Not Performance)${NC}"
    echo -e "${MAGENTA}╚══════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${DIM}\"Prayer and ritual as alignment, not performance\"${NC}"
    echo ""
    
    # Intention Check
    echo -e "${BOLD}3. INTENTION VERIFICATION${NC}"
    echo -e "   ${DIM}Why are we running this improvement cycle?${NC}"
    echo ""
    echo -e "   ${YELLOW}→ What is your true intention?${NC}"
    echo -e "     ${DIM}[service]  - Serve users and improve real outcomes${NC}"
    echo -e "     ${DIM}[ego]      - Optimize appearance/metrics/status${NC}"
    echo -e "     ${DIM}[habit]    - Ritual without meaning, automated behavior${NC}"
    echo ""
    read -p "     Answer (service/ego/habit): " intention
    
    local intention_aligned=1
    case "$intention" in
        service)
            echo ""
            echo -e "   ${GREEN}✓ Aligned Intention${NC}"
            echo -e "   ${DIM}Purpose: Serve users and improve real outcomes${NC}"
            intention_aligned=0
            ;;
        ego)
            echo ""
            echo -e "   ${YELLOW}⚠️  EGO-REACTIVE INTENTION${NC}"
            echo -e "   ${DIM}Risk: Optimization for appearance rather than substance${NC}"
            echo ""
            echo -e "   ${BOLD}Danger:${NC} Metrics improve while reality degrades"
            echo -e "   ${BOLD}Check:${NC} Will this actually help users, or just dashboards?"
            echo ""
            ;;
        habit)
            echo ""
            echo -e "   ${RED}⚠️  RITUAL WITHOUT MEANING${NC}"
            echo -e "   ${DIM}Risk: Ethics hollowed out - choreography without alignment${NC}"
            echo ""
            echo -e "   ${BOLD}Failure Mode:${NC} Identity as empty repetition"
            echo -e "   ${BOLD}Recovery:${NC} Return to first principles - why does this matter?"
            echo ""
            ;;
        *)
            echo ""
            echo -e "   ${CYAN}ℹ️  Custom intention recorded: $intention${NC}"
            ;;
    esac
    
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    
    # Mithra Binding Force Preview
    echo -e "${BOLD}4. MITHRA: Binding Force (Preview)${NC}"
    echo -e "   ${DIM}Mithra keeps thought, word, and action from drifting apart${NC}"
    echo ""
    echo -e "   ${YELLOW}→ Post-cycle, we will verify:${NC}"
    echo -e "     1. Did we act on what we discerned? ${DIM}(thought → deed)${NC}"
    echo -e "     2. Did our reports match our actions? ${DIM}(word → deed)${NC}"
    echo -e "     3. Did reality align with predictions? ${DIM}(thought → reality)${NC}"
    echo ""
    echo -e "   ${DIM}Bookmarking current discernment for later verification...${NC}"
    
    # Save yasna state
    cat > "$TRUTH_DIR/yasna-${CYCLE_ID}.json" <<EOF
{
  "cycle_id": "$CYCLE_ID",
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "phase": "yasna",
  "intention": "$intention",
  "intention_aligned": $intention_aligned,
  "mithra_test": "pending_post_cycle",
  "next_phase": "coherence"
}
EOF
    
    echo ""
    echo -e "${BOLD}📊 YASNA Assessment:${NC}"
    if [[ $intention_aligned -eq 0 ]]; then
        echo -e "   ${GREEN}✓ ALIGNED${NC} - Intention clear and service-oriented"
    else
        echo -e "   ${YELLOW}⚠ MONITOR${NC} - Intention requires vigilance"
    fi
    echo ""
    echo -e "   ${DIM}State saved: ${CYAN}$TRUTH_DIR/yasna-${CYCLE_ID}.json${NC}"
    echo ""
    echo -e "${BOLD}Next:${NC} Run ${CYAN}./scripts/ay-truth-calibration.sh coherence${NC} after cycle"
    echo ""
}

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Phase 3: MITHRA - Coherence Verification (Thought-Word-Deed)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

coherence_verification() {
    echo ""
    echo -e "${GREEN}╔══════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║${NC} ${BOLD}⚖️  MITHRA: Thought-Word-Deed Coherence Verification${NC}"
    echo -e "${GREEN}╚══════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${DIM}\"Mithra binds thought, word, and action - preventing drift\"${NC}"
    echo ""
    
    # Load pre-cycle intentions
    local latest_yasna=$(ls -t "$TRUTH_DIR"/yasna-*.json 2>/dev/null | head -1)
    if [[ ! -f "$latest_yasna" ]]; then
        echo -e "${YELLOW}⚠️  No yasna state found - run yasna phase first${NC}"
        exit 1
    fi
    
    local intention=$(jq -r '.intention' "$latest_yasna")
    local cycle_id=$(jq -r '.cycle_id' "$latest_yasna")
    
    echo -e "${BOLD}Stated Intention (Pre-Cycle):${NC} ${CYAN}$intention${NC}"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    
    # Test 1: Thought → Deed alignment
    echo -e "${BOLD}5. THOUGHT → DEED ALIGNMENT${NC}"
    echo -e "   ${DIM}Did we act on what we discerned?${NC}"
    echo ""
    echo -e "   ${YELLOW}→ Did actions match stated intention?${NC}"
    read -p "     Answer (y/n): " thought_deed_aligned
    
    if [[ "$thought_deed_aligned" != "y" ]]; then
        echo ""
        echo -e "   ${RED}✗ COHERENCE FAILURE${NC}"
        echo -e "   ${DIM}Said '$intention' but acted differently${NC}"
        echo ""
        echo -e "   ${BOLD}Failure Mode:${NC} Thought-deed drift"
        echo -e "   ${BOLD}Recovery:${NC} ${CYAN}ay review --intention-audit${NC}"
    else
        echo ""
        echo -e "   ${GREEN}✓ Thought-deed coherence maintained${NC}"
    fi
    
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    
    # Test 2: Word → Deed alignment
    echo -e "${BOLD}6. WORD → DEED ALIGNMENT${NC}"
    echo -e "   ${DIM}Did our reports match our actions?${NC}"
    echo ""
    echo -e "   ${YELLOW}→ Were reports and metrics honest about what was done?${NC}"
    read -p "     Answer (y/n): " word_deed_aligned
    
    if [[ "$word_deed_aligned" != "y" ]]; then
        echo ""
        echo -e "   ${RED}✗ INTEGRITY VIOLATION${NC}"
        echo -e "   ${DIM}Reports do not accurately describe actions taken${NC}"
        echo ""
        echo -e "   ${BOLD}Danger:${NC} Authority without truth"
        echo -e "   ${BOLD}Recovery:${NC} ${CYAN}ay audit --honesty-check${NC}"
    else
        echo ""
        echo -e "   ${GREEN}✓ Word-deed integrity verified${NC}"
    fi
    
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    
    # Test 3: Thought → Reality alignment
    echo -e "${BOLD}7. THOUGHT → REALITY ALIGNMENT${NC}"
    echo -e "   ${DIM}Did reality align with our predictions?${NC}"
    echo ""
    
    # Measure actual outcomes
    if [[ -f "$DB_PATH" ]]; then
        local before_success=$(sqlite3 "$DB_PATH" \
            "SELECT COUNT(*) FROM episodes WHERE success = 1 AND timestamp < datetime('now', '-1 hour');" \
            2>/dev/null || echo "0")
        local after_success=$(sqlite3 "$DB_PATH" \
            "SELECT COUNT(*) FROM episodes WHERE success = 1;" \
            2>/dev/null || echo "0")
        local improvement=$((after_success - before_success))
        
        echo -e "   ${DIM}Measured Improvement: ${BOLD}+${improvement}${NC} ${DIM}successful episodes${NC}"
        echo ""
    fi
    
    echo -e "   ${YELLOW}→ Did outcomes match expectations?${NC}"
    read -p "     Answer (y/n): " thought_reality_aligned
    
    if [[ "$thought_reality_aligned" != "y" ]]; then
        echo ""
        echo -e "   ${YELLOW}⚠️  PREDICTION-REALITY GAP${NC}"
        echo -e "   ${DIM}Our model of reality needs recalibration${NC}"
        echo ""
        echo -e "   ${BOLD}Learning:${NC} Update mental models with actual outcomes"
        echo -e "   ${BOLD}Action:${NC} ${CYAN}ay learn --recalibrate${NC}"
    else
        echo ""
        echo -e "   ${GREEN}✓ Predictions matched reality${NC}"
    fi
    
    # Calculate coherence score
    local coherence_score=0
    [[ "$thought_deed_aligned" == "y" ]] && coherence_score=$((coherence_score + 33))
    [[ "$word_deed_aligned" == "y" ]] && coherence_score=$((coherence_score + 34))
    [[ "$thought_reality_aligned" == "y" ]] && coherence_score=$((coherence_score + 33))
    
    # Save coherence verification
    cat > "$TRUTH_DIR/coherence-${cycle_id}.json" <<EOF
{
  "cycle_id": "$cycle_id",
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "phase": "coherence",
  "stated_intention": "$intention",
  "mithra_verification": {
    "thought_deed_aligned": "$thought_deed_aligned",
    "word_deed_aligned": "$word_deed_aligned",
    "thought_reality_aligned": "$thought_reality_aligned",
    "coherence_score": $coherence_score
  }
}
EOF
    
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo -e "${BOLD}📊 MITHRA Coherence Assessment:${NC}"
    echo -e "   Coherence Score: ${BOLD}$coherence_score/100${NC}"
    echo ""
    
    if [[ $coherence_score -eq 100 ]]; then
        echo -e "   ${GREEN}✓ FULL COHERENCE${NC}"
        echo -e "   ${DIM}Thought, word, and deed fully aligned${NC}"
        echo -e "   ${DIM}Truth survives the body - can endure${NC}"
    elif [[ $coherence_score -ge 67 ]]; then
        echo -e "   ${YELLOW}⚠ PARTIAL COHERENCE${NC}"
        echo -e "   ${DIM}Some drift detected - requires attention${NC}"
        echo -e "   ${DIM}Recommendation: Focus on failed dimensions${NC}"
    else
        echo -e "   ${RED}✗ LOW COHERENCE${NC}"
        echo -e "   ${DIM}Significant misalignment - integrity at risk${NC}"
        echo -e "   ${DIM}Action Required: Return to first principles${NC}"
        echo ""
        echo -e "   ${BOLD}Wisdom Check:${NC}"
        echo -e "   ${DIM}\"When discernment feels endangered, return to earliest texts\"${NC}"
    fi
    
    echo ""
    echo -e "   ${DIM}State saved: ${CYAN}$TRUTH_DIR/coherence-${cycle_id}.json${NC}"
    echo ""
    
    # Three-dimensional completeness check
    echo ""
    echo -e "${BOLD}📐 THREE-DIMENSIONAL COMPLETENESS${NC}"
    echo -e "   ${DIM}(Spiritual, Ethical, Lived/Embodied)${NC}"
    echo ""
    
    echo -e "   1. ${BOLD}SPIRITUAL:${NC} Inner discipline maintained?"
    echo -e "      ${DIM}→ Manthra (thought calibration) completed${NC}"
    echo ""
    
    echo -e "   2. ${BOLD}ETHICAL:${NC} Good deeds visible in world?"
    echo -e "      ${DIM}→ Yasna (intention alignment) verified${NC}"
    echo ""
    
    echo -e "   3. ${BOLD}LIVED/EMBODIED:${NC} Coherence survived stress test?"
    echo -e "      ${DIM}→ Mithra (thought-word-deed) score: $coherence_score/100${NC}"
    echo ""
    
    if [[ $coherence_score -ge 67 ]]; then
        echo -e "   ${GREEN}✓ System maintains three-dimensional integrity${NC}"
        echo -e "   ${DIM}Not flattened into single axis (belief/ethics/culture alone)${NC}"
    else
        echo -e "   ${YELLOW}⚠ Risk of dimensional collapse${NC}"
        echo -e "   ${DIM}System may be flattening into one-dimensional authority${NC}"
        echo -e "   ${CYAN}→ Review: docs/TRUTH_ALIGNMENT_GOVERNANCE.md${NC}"
    fi
    
    echo ""
}

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Main Execution
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

main() {
    case "$PHASE" in
        manthra|--phase=manthra)
            manthra_calibration
            ;;
        yasna|--phase=yasna)
            yasna_alignment
            ;;
        coherence|--phase=coherence|mithra|--phase=mithra)
            coherence_verification
            ;;
        *)
            echo "Unknown phase: $PHASE"
            echo "Usage: $0 [manthra|yasna|coherence]"
            exit 1
            ;;
    esac
}

main "$@"
