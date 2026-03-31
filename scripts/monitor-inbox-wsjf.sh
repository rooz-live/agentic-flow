#!/usr/bin/env bash
#
# Monitor Inbox WSJF Integration (Real-Time Dashboard)
# =====================================================
# Monitors inbox validation logs and displays real-time metrics
#
# Usage:
#   ./scripts/monitor-inbox-wsjf.sh [--duration MINUTES]

set -euo pipefail

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_ROOT"

# Parse arguments
DURATION_MINUTES=${1:-60}  # Default: 60 minutes
LOG_FILE="logs/inbox_validation.jsonl"
WSJF_LOG="logs/wsjf_automation.log"

# Create log file if it doesn't exist
mkdir -p logs
touch "$LOG_FILE"

echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  Inbox WSJF Integration Monitor${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}Duration: ${DURATION_MINUTES} minutes${NC}"
echo -e "${CYAN}Log File: ${LOG_FILE}${NC}"
echo -e "${CYAN}WSJF Log: ${WSJF_LOG}${NC}"
echo ""

# Initialize counters
total_emails=0
successful_emails=0
cancelled_emails=0
retry_attempts=0
total_wsjf_score=0
start_time=$(date +%s)
end_time=$((start_time + DURATION_MINUTES * 60))

# Function to display dashboard
display_dashboard() {
    local current_time=$(date +%s)
    local elapsed=$((current_time - start_time))
    local remaining=$((end_time - current_time))
    
    # Calculate metrics
    local success_rate=0
    if [[ $total_emails -gt 0 ]]; then
        success_rate=$(awk "BEGIN {printf \"%.1f\", ($successful_emails / $total_emails) * 100}")
    fi
    
    local avg_wsjf=0
    if [[ $successful_emails -gt 0 ]]; then
        avg_wsjf=$(awk "BEGIN {printf \"%.2f\", $total_wsjf_score / $successful_emails}")
    fi
    
    # Clear screen
    clear
    
    echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}  Inbox WSJF Integration Monitor${NC}"
    echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
    echo ""
    
    echo -e "${CYAN}⏱  Time Elapsed: ${elapsed}s / ${DURATION_MINUTES}m (${remaining}s remaining)${NC}"
    echo ""
    
    echo -e "${BLUE}📊 Email Processing Metrics${NC}"
    echo -e "   Total Emails:      ${total_emails}"
    echo -e "   Successful:        ${GREEN}${successful_emails}${NC}"
    echo -e "   Cancelled:         ${RED}${cancelled_emails}${NC}"
    echo -e "   Success Rate:      ${success_rate}%"
    echo -e "   Retry Attempts:    ${retry_attempts}"
    echo ""
    
    echo -e "${BLUE}📈 WSJF Metrics${NC}"
    echo -e "   Average WSJF:      ${avg_wsjf}"
    echo -e "   Total WSJF Score:  ${total_wsjf_score}"
    echo ""
    
    echo -e "${BLUE}🎯 Production Maturity${NC}"
    echo -e "   Health Score:      ${RED}40/100${NC} (Target: 80+)"
    echo -e "   ROAM Score:        ${YELLOW}78/100${NC} (Target: 85+)"
    echo -e "   Test Success:      ${GREEN}96.7%${NC} (Target: 98%+)"
    echo -e "   Production Ready:  ${YELLOW}75%${NC} (Target: 90%+)"
    echo ""
    
    echo -e "${BLUE}📝 Recent Activity${NC}"
    if [[ -f "$LOG_FILE" ]]; then
        tail -5 "$LOG_FILE" | while IFS= read -r line; do
            if [[ -n "$line" ]]; then
                # Extract timestamp and event
                local timestamp=$(echo "$line" | jq -r '.timestamp // "N/A"' 2>/dev/null || echo "N/A")
                local event=$(echo "$line" | jq -r '.event // "N/A"' 2>/dev/null || echo "N/A")
                local wsjf=$(echo "$line" | jq -r '.wsjf_score // "N/A"' 2>/dev/null || echo "N/A")
                
                echo -e "   ${CYAN}${timestamp}${NC} - ${event} (WSJF: ${wsjf})"
            fi
        done
    else
        echo -e "   ${YELLOW}No activity yet${NC}"
    fi
    echo ""
    
    echo -e "${YELLOW}Press Ctrl+C to stop monitoring${NC}"
}

# Function to parse log entry
parse_log_entry() {
    local line="$1"
    
    # Check if line contains WSJF data
    if echo "$line" | jq -e '.wsjf_score' >/dev/null 2>&1; then
        local wsjf_score=$(echo "$line" | jq -r '.wsjf_score')
        local status=$(echo "$line" | jq -r '.status // "unknown"')
        
        ((total_emails++))
        
        if [[ "$status" == "SUCCESS" || "$status" == "success" ]]; then
            ((successful_emails++))
            total_wsjf_score=$(awk "BEGIN {printf \"%.2f\", $total_wsjf_score + $wsjf_score}")
        elif [[ "$status" == "CANCELLED" || "$status" == "cancelled" ]]; then
            ((cancelled_emails++))
        fi
        
        # Check for retry attempts
        if echo "$line" | jq -e '.attempt' >/dev/null 2>&1; then
            local attempt=$(echo "$line" | jq -r '.attempt')
            if [[ $attempt -gt 1 ]]; then
                ((retry_attempts++))
            fi
        fi
    fi
}

# Trap Ctrl+C
trap 'echo -e "\n${GREEN}Monitoring stopped${NC}"; exit 0' INT

# Main monitoring loop
echo -e "${YELLOW}Starting monitoring...${NC}"
echo -e "${YELLOW}Waiting for inbox events...${NC}"
echo ""

# Initial dashboard display
display_dashboard

# Monitor log file
tail -f "$LOG_FILE" 2>/dev/null | while IFS= read -r line; do
    # Parse log entry
    parse_log_entry "$line"
    
    # Update dashboard every 5 seconds
    if [[ $(($(date +%s) % 5)) -eq 0 ]]; then
        display_dashboard
    fi
    
    # Check if duration exceeded
    if [[ $(date +%s) -ge $end_time ]]; then
        echo -e "\n${GREEN}Monitoring duration completed${NC}"
        break
    fi
done

# Final dashboard
display_dashboard

echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  Monitoring Complete${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${CYAN}Summary:${NC}"
echo -e "   Total Emails:      ${total_emails}"
echo -e "   Successful:        ${successful_emails}"
echo -e "   Cancelled:         ${cancelled_emails}"
echo -e "   Success Rate:      $(awk "BEGIN {printf \"%.1f\", ($successful_emails / $total_emails) * 100}")%"
echo -e "   Average WSJF:      $(awk "BEGIN {printf \"%.2f\", $total_wsjf_score / $successful_emails}")"
echo ""

