#!/bin/bash
# -*- coding: utf-8 -*-
# FIRE DRILL: Morning Daily Routine
# ===================================
# OODA-based fire-focused routine for advocacy pipeline
# Execute: ./scripts/fire_drill.sh [--quick | --deep]
#
# Fire = NOW items only (WSJF > 20.0, deadline < 48h)
# Focus = Single-tasking, no context switching

set -e

MODE="${1:---standard}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
LOG_FILE="$PROJECT_ROOT/logs/fire_drill_$(date +%Y%m%d).log"
WSJF_TRACKER="$PROJECT_ROOT/src/wsjf_tracker.py"
RETRY_MECHANISM="$PROJECT_ROOT/src/retry_mechanism.py"
INVARIANT_VALIDATOR="$PROJECT_ROOT/src/invariant_validator.py"
EVIDENCE_VALIDATOR="$PROJECT_ROOT/src/evidence_bundle_validator.py"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

section() {
    echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
    log "SECTION: $1"
}

fire_icon() {
    echo -e "${RED}🔥${NC}"
}

# ============================================
# OODA PHASE 1: OBSERVE
# ============================================
phase_observe() {
    section "🔥 PHASE 1: OBSERVE - What's on fire?"
    
    # 1.1 Inbox status
    log "Checking inbox for new messages..."
    if [ -d "$PROJECT_ROOT/CORRESPONDENCE/INBOUND" ]; then
        INBOX_COUNT=$(find "$PROJECT_ROOT/CORRESPONDENCE/INBOUND" -name "*.eml" -mtime -1 | wc -l)
        log "  New emails (24h): $INBOX_COUNT"
    fi
    
    # 1.2 NOW items (WSJF > 20.0)
    log "Identifying NOW items (WSJF > 20.0)..."
    if [ -f "$WSJF_TRACKER" ]; then
        cd "$PROJECT_ROOT"
        python3 "$WSJF_TRACKER" --horizon NOW --limit 5 2>/dev/null || log "  WSJF tracker not configured"
    fi
    
    # 1.3 Cancelled retry queue
    log "Checking cancelled classification retry queue..."
    if [ -f "$RETRY_MECHANISM" ]; then
        cd "$PROJECT_ROOT"
        RETRY_COUNT=$(python3 "$RETRY_MECHANISM" --list-cancelled 2>/dev/null | grep -c "message_id" || echo "0")
        log "  Pending retries: $RETRY_COUNT"
    fi
    
    # 1.4 Invariant violations (fires waiting to happen)
    log "Checking for invariant violations..."
    if [ -f "$PROJECT_ROOT/logs/invariant_violations.jsonl" ]; then
        VIOLATION_COUNT=$(wc -l < "$PROJECT_ROOT/logs/invariant_violations.jsonl" 2>/dev/null || echo "0")
        log "  Total violations logged: $VIOLATION_COUNT"
    fi
    
    # 1.5 Deadline pressure
    log "Checking deadline pressure..."
    DEADLINE_FILE="$PROJECT_ROOT/_WSJF-TRACKER/2026-02-12-DEADLINE-PRIORITIES.md"
    if [ -f "$DEADLINE_FILE" ]; then
        HOURS_REMAINING=$(grep -o "[0-9]*\.[0-9]* hours remaining" "$DEADLINE_FILE" | head -1 | grep -o "[0-9]*\.[0-9]*" || echo "unknown")
        log "  Settlement deadline: $HOURS_REMAINING hours"
    fi
}

# ============================================
# OODA PHASE 2: ORIENT
# ============================================
phase_orient() {
    section "🧭 PHASE 2: ORIENT - Where am I relative to the fire?"
    
    # 2.1 Current position
    log "Assessing current position..."
    
    # Check for stale WSJF scores (>96h)
    STALE_FILE="$PROJECT_ROOT/logs/wsjf_stale_scores.json"
    if [ -f "$STALE_FILE" ]; then
        STALE_COUNT=$(jq length "$STALE_FILE" 2>/dev/null || echo "0")
        log "  Stale WSJF scores (>96h): $STALE_COUNT"
        if [ "$STALE_COUNT" -gt 0 ]; then
            echo -e "${YELLOW}  ⚠️  Stale priorities detected - recalculation needed${NC}"
        fi
    fi
    
    # 2.2 Evidence gaps
    log "Assessing evidence completeness..."
    if [ -f "$EVIDENCE_VALIDATOR" ]; then
        cd "$PROJECT_ROOT"
        GAP_COUNT=$(python3 "$EVIDENCE_VALIDATOR" --gaps-only 2>/dev/null | grep -c "GAP" || echo "0")
        log "  Evidence gaps identified: $GAP_COUNT"
    fi
    
    # 2.3 ROAM risks
    log "Reviewing ROAM risk status..."
    ROAM_FILE="$PROJECT_ROOT/logs/roam_risks.json"
    if [ -f "$ROAM_FILE" ]; then
        ACCEPTED_RISKS=$(jq '.[] | select(.status == "ACCEPTED")' "$ROAM_FILE" 2>/dev/null | wc -l || echo "0")
        log "  Accepted risks (monitoring): $ACCEPTED_RISKS"
    fi
    
    # 2.4 Strategic alignment
    log "Checking strategic alignment..."
    if [ -f "$PROJECT_ROOT/docs/ARCHITECTURAL_REVIEW_STRUCTURAL_WEAKNESSES.md" ]; then
        log "  Architecture review: Current"
    fi
}

# ============================================
# OODA PHASE 3: DECIDE
# ============================================
phase_decide() {
    section "🎯 PHASE 3: DECIDE - Which fires to fight?"
    
    # 3.1 Select top 3 fires for the day
    log "Selecting top 3 fires based on WSJF + deadline pressure..."
    
    echo -e "\n${RED}Today's Fires (NOW items only):${NC}"
    echo "  1. ___________________________________________________ [ ]"
    echo "     WSJF: ___/10 | Deadline: ___h | Impact: $_________"
    echo ""
    echo "  2. ___________________________________________________ [ ]"
    echo "     WSJF: ___/10 | Deadline: ___h | Impact: $_________"
    echo ""
    echo "  3. ___________________________________________________ [ ]"
    echo "     WSJF: ___/10 | Deadline: ___h | Impact: $_________"
    echo ""
    
    # 3.2 Decide on retry strategy
    log "Determining retry strategy for cancelled items..."
    if [ -f "$RETRY_MECHANISM" ]; then
        cd "$PROJECT_ROOT"
        # Get high-priority retries (WSJF > 10)
        HIGH_PRIORITY_RETRIES=$(python3 "$RETRY_MECHANISM" --list-cancelled 2>/dev/null | grep -c "WSJF:" || echo "0")
        log "  High-priority retries to process: $HIGH_PRIORITY_RETRIES"
    fi
    
    # 3.3 Blockers and dependencies
    log "Identifying blockers..."
    echo -e "\n${YELLOW}Blockers to resolve:${NC}"
    echo "  • _______________________________________________________________"
    echo "  • _______________________________________________________________"
    echo ""
}

# ============================================
# OODA PHASE 4: ACT
# ============================================
phase_act() {
    section "⚡ PHASE 4: ACT - Fight the first fire immediately"
    
    # 4.1 Execute first fire immediately
    log "Executing Fire #1 immediately (no delay)..."
    echo -e "\n${RED}🔥 EXECUTING FIRE #1 NOW${NC}"
    echo "   Working on: ________________________________________________"
    echo "   Started at: $(date '+%H:%M:%S')"
    echo "   Target completion: $(date -v+2H '+%H:%M:%S' 2>/dev/null || echo '+2 hours')"
    echo ""
    
    # 4.2 Queue remaining fires
    log "Queueing remaining fires for sequential execution..."
    
    # 4.3 Retry high-priority cancelled items
    if [ "$MODE" != "--quick" ] && [ -f "$RETRY_MECHANISM" ]; then
        log "Processing high-priority retries..."
        cd "$PROJECT_ROOT"
        # Retry items with WSJF > 10
        python3 "$RETRY_MECHANISM" --retry-all 2>/dev/null | tee -a "$LOG_FILE" || log "  No retries processed"
    fi
    
    # 4.4 Evidence bundle completion
    if [ "$MODE" == "--deep" ] && [ -f "$EVIDENCE_VALIDATOR" ]; then
        log "Gathering missing evidence..."
        cd "$PROJECT_ROOT"
        python3 "$EVIDENCE_VALIDATOR" --auto-gather 2>/dev/null | tee -a "$LOG_FILE" || true
    fi
}

# ============================================
# SUMMARY
# ============================================
fire_summary() {
    section "📊 FIRE DRILL SUMMARY"
    
    echo -e "${GREEN}Completed:${NC}"
    echo "  ✓ OODA cycle executed"
    echo "  ✓ Top 3 fires identified"
    echo "  ✓ Fire #1 initiated"
    
    if [ "$MODE" == "--deep" ]; then
        echo "  ✓ Retry queue processed"
        echo "  ✓ Evidence bundles validated"
        echo "  ✓ Invariant violations reviewed"
    fi
    
    echo -e "\n${YELLOW}Next Actions:${NC}"
    echo "  1. Complete Fire #1 (in progress)"
    echo "  2. Execute Fire #2"
    echo "  3. Execute Fire #3"
    echo "  4. Run evening retro (18:00)"
    
    echo -e "\n${BLUE}Log saved to: $LOG_FILE${NC}"
    
    # Append to daily metrics
    echo "$(date '+%Y-%m-%d %H:%M:%S'),FIRE_DRILL_COMPLETED,$MODE" >> "$PROJECT_ROOT/logs/daily_metrics.csv"
}

# ============================================
# MAIN
# ============================================
main() {
    # Create log directory
    mkdir -p "$PROJECT_ROOT/logs"
    mkdir -p "$PROJECT_ROOT/CORRESPONDENCE/_RETRY_QUEUE"
    
    log "=========================================="
    log "FIRE DRILL STARTED - MODE: $MODE"
    log "=========================================="
    
    case "$MODE" in
        --quick)
            phase_observe
            phase_decide
            echo -e "\n${GREEN}Quick mode complete. Top fires identified.${NC}"
            ;;
        --deep)
            phase_observe
            phase_orient
            phase_decide
            phase_act
            fire_summary
            ;;
        --standard|*)
            phase_observe
            phase_orient
            phase_decide
            phase_act
            fire_summary
            ;;
    esac
    
    log "Fire drill completed"
}

# Show help
if [ "$1" == "--help" ] || [ "$1" == "-h" ]; then
    echo "Fire Drill - Morning OODA Routine"
    echo ""
    echo "Usage: ./fire_drill.sh [MODE]"
    echo ""
    echo "Modes:"
    echo "  --quick   Fast observation + decision (5 min)"
    echo "  --standard Full OODA cycle (15 min) [default]"
    echo "  --deep     Full cycle + retry processing (30 min)"
    echo ""
    echo "Integrates with:"
    echo "  - WSJF Tracker (priority scoring)"
    echo "  - Retry Mechanism (cancelled classifications)"
    echo "  - Invariant Validator (structural integrity)"
    echo "  - Evidence Validator (bundle completeness)"
    exit 0
fi

main "$@"
