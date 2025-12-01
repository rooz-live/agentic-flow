#!/usr/bin/env bash
#
# show_quick_wins_progress.sh
#
# WSJF-enhanced progress reporting for QUICK_WINS.md
# Part of WSJF-1: WSJF Calculation Script Enhancement
#
# Usage:
#   ./scripts/show_quick_wins_progress.sh           # Basic progress report
#   ./scripts/show_quick_wins_progress.sh --wsjf    # Full WSJF analysis
#   ./scripts/show_quick_wins_progress.sh --json    # JSON output
#
set -euo pipefail

# Configuration
QUICK_WINS="docs/QUICK_WINS.md"
CONSOLIDATED_ACTIONS=".goalie/CONSOLIDATED_ACTIONS.yaml"
METRICS_LOG=".goalie/metrics_log.jsonl"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

# Parse arguments
WSJF_MODE=false
JSON_MODE=false
while [[ $# -gt 0 ]]; do
    case $1 in
        --wsjf)
            WSJF_MODE=true
            shift
            ;;
        --json)
            JSON_MODE=true
            shift
            ;;
        *)
            echo "Usage: $0 [--wsjf] [--json]"
            exit 1
            ;;
    esac
done

[[ ! -f "$QUICK_WINS" ]] && echo "❌ $QUICK_WINS not found" && exit 1

# =============================================================================
# WSJF Calculation Functions
# =============================================================================

# Calculate WSJF: (Business Value + Time Criticality + Risk Reduction) / Job Size
calculate_wsjf() {
    local bv=$1 tc=$2 rr=$3 js=$4
    awk -v bv="$bv" -v tc="$tc" -v rr="$rr" -v js="$js" \
        'BEGIN { if(js > 0) printf "%.2f\n", (bv + tc + rr) / js; else print "0.00" }'
}

# Calculate Cost of Delay per week (in business value units)
calculate_cod() {
    local bv=$1 tc=$2 rr=$3
    awk -v bv="$bv" -v tc="$tc" -v rr="$rr" \
        'BEGIN { printf "%.1f\n", (bv + tc + rr) * 1.5 }'
}

# Priority to numeric value
priority_to_value() {
    case $1 in
        HIGH|high|critical|CRITICAL) echo "3" ;;
        MEDIUM|medium|urgent|URGENT) echo "2" ;;
        LOW|low|important|IMPORTANT) echo "1" ;;
        *) echo "1" ;;
    esac
}

# =============================================================================
# Basic Progress Metrics
# =============================================================================

COMPLETED=$(grep -c "^- \[x\]" "$QUICK_WINS" || true)
INCOMPLETE=$(grep -c "^- \[ \]" "$QUICK_WINS" || true)
TOTAL=$(( COMPLETED + INCOMPLETE ))

[[ $TOTAL -eq 0 ]] && echo "⚠️  No action items found" && exit 0

PCT=$(( COMPLETED * 100 / TOTAL ))

# =============================================================================
# Throughput Metrics (items/day, lead time, cycle time)
# =============================================================================

# Get completion timestamps for throughput calculation
TIMESTAMPS=$(grep -oE '[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}' "$QUICK_WINS" 2>/dev/null | sort)
COMPLETION_COUNT=$(echo "$TIMESTAMPS" | grep -c . 2>/dev/null || echo "0")

# Calculate items completed today
TODAY=$(date +%Y-%m-%d)
ITEMS_TODAY=$(echo "$TIMESTAMPS" | grep -c "^$TODAY" 2>/dev/null || echo "0")

# Calculate items this week
WEEK_AGO=$(date -v-7d +%Y-%m-%d 2>/dev/null || date -d "7 days ago" +%Y-%m-%d 2>/dev/null || echo "$TODAY")
ITEMS_WEEK=$(echo "$TIMESTAMPS" | awk -v week="$WEEK_AGO" '$1 >= week' | wc -l | xargs)

# Items per day (over last 7 days)
ITEMS_PER_DAY=$(awk -v items="$ITEMS_WEEK" 'BEGIN { printf "%.2f\n", items / 7 }')

# Lead time estimation (from first incomplete to now)
FIRST_INCOMPLETE_DATE=$(grep "^- \[ \]" "$QUICK_WINS" | grep -oE '[0-9]{4}-[0-9]{2}-[0-9]{2}' | head -1 || echo "$TODAY")
if [[ -n "$FIRST_INCOMPLETE_DATE" && "$FIRST_INCOMPLETE_DATE" != "$TODAY" ]]; then
    LEAD_TIME_DAYS=$(( ($(date +%s) - $(date -j -f "%Y-%m-%d" "$FIRST_INCOMPLETE_DATE" +%s 2>/dev/null || echo $(date +%s))) / 86400 ))
else
    LEAD_TIME_DAYS=0
fi

# Cycle time (average time between completions)
if [[ $COMPLETION_COUNT -ge 2 ]]; then
    FIRST_TS=$(echo "$TIMESTAMPS" | head -1)
    LAST_TS=$(echo "$TIMESTAMPS" | tail -1)
    FIRST_EPOCH=$(date -j -f "%Y-%m-%dT%H:%M" "$FIRST_TS" +%s 2>/dev/null || echo "0")
    LAST_EPOCH=$(date -j -f "%Y-%m-%dT%H:%M" "$LAST_TS" +%s 2>/dev/null || echo "0")
    if [[ "$FIRST_EPOCH" != "0" && "$LAST_EPOCH" != "0" && $COMPLETION_COUNT -gt 1 ]]; then
        CYCLE_TIME_HOURS=$(awk -v f="$FIRST_EPOCH" -v l="$LAST_EPOCH" -v c="$COMPLETION_COUNT" \
            'BEGIN { printf "%.1f\n", (l - f) / 3600 / (c - 1) }')
    else
        CYCLE_TIME_HOURS="N/A"
    fi
else
    CYCLE_TIME_HOURS="N/A"
fi

# =============================================================================
# WSJF Analysis from CONSOLIDATED_ACTIONS.yaml
# =============================================================================

declare -a WSJF_ITEMS=()
declare -a WSJF_SCORES=()

if [[ -f "$CONSOLIDATED_ACTIONS" ]]; then
    # Use awk for more reliable YAML parsing
    while IFS='|' read -r id title status wsjf bv tc rr js; do
        if [[ "$status" == "PENDING" && -n "$wsjf" && "$wsjf" != "null" ]]; then
            COD=$(calculate_cod "${bv:-5}" "${tc:-5}" "${rr:-5}")
            WSJF_ITEMS+=("$id|$title|$wsjf|$COD|${bv:-5}|${tc:-5}|${rr:-5}|${js:-3}")
            WSJF_SCORES+=("$wsjf")
        fi
    done < <(awk '
    /^- id:/ {
        if (id != "" && status == "PENDING" && wsjf != "" && wsjf != "null") {
            print id "|" title "|" status "|" wsjf "|" bv "|" tc "|" rr "|" js
        }
        id = $3; title = ""; status = ""; wsjf = ""; bv = ""; tc = ""; rr = ""; js = ""
    }
    /^  title:/ { gsub(/^  title: /, ""); title = $0 }
    /^  status:/ { status = $2 }
    /^  wsjf_score:/ { wsjf = $2 }
    /^  user_value:/ { bv = $2 }
    /^  time_criticality:/ { tc = $2 }
    /^  risk_reduction:/ { rr = $2 }
    /^  job_size:/ { js = $2 }
    END {
        if (id != "" && status == "PENDING" && wsjf != "" && wsjf != "null") {
            print id "|" title "|" status "|" wsjf "|" bv "|" tc "|" rr "|" js
        }
    }
    ' "$CONSOLIDATED_ACTIONS")
fi

# Sort WSJF items by score (descending)
IFS=$'\n' SORTED_WSJF=($(for item in "${WSJF_ITEMS[@]}"; do
    score=$(echo "$item" | cut -d'|' -f3)
    echo "$score|$item"
done | sort -t'|' -k1 -rn | cut -d'|' -f2-))
unset IFS

# =============================================================================
# Output
# =============================================================================

if $JSON_MODE; then
    # JSON output for automation
    cat <<EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "progress": {
    "completed": $COMPLETED,
    "incomplete": $INCOMPLETE,
    "total": $TOTAL,
    "percentage": $PCT
  },
  "throughput": {
    "items_today": $ITEMS_TODAY,
    "items_week": $ITEMS_WEEK,
    "items_per_day": $ITEMS_PER_DAY,
    "lead_time_days": $LEAD_TIME_DAYS,
    "cycle_time_hours": "${CYCLE_TIME_HOURS}"
  },
  "wsjf_queue": [
$(for i in "${!SORTED_WSJF[@]}"; do
    item="${SORTED_WSJF[$i]}"
    id=$(echo "$item" | cut -d'|' -f1)
    title=$(echo "$item" | cut -d'|' -f2)
    score=$(echo "$item" | cut -d'|' -f3)
    cod=$(echo "$item" | cut -d'|' -f4)
    echo "    {\"rank\": $((i+1)), \"id\": \"$id\", \"wsjf\": $score, \"cod_per_week\": $cod}$([ $i -lt $((${#SORTED_WSJF[@]}-1)) ] && echo ",")"
done)
  ]
}
EOF
    exit 0
fi

# Terminal output
echo -e "${CYAN}📊 Quick Wins Progress Report${NC}"
echo "=============================="
echo ""

echo -e "✅ Completed: ${GREEN}$COMPLETED${NC}"
echo -e "⏳ In Progress: ${YELLOW}$INCOMPLETE${NC}"
echo "📊 Total: $TOTAL"
echo ""
echo -n "Progress: ${PCT}% ["
for i in $(seq 1 $((PCT / 5))); do echo -n "█"; done
for i in $(seq 1 $((20 - PCT / 5))); do echo -n "░"; done
echo "]"
echo ""

if [[ $PCT -ge 80 ]]; then
    echo -e "${GREEN}🎯 STATUS: TARGET EXCEEDED (>80%)${NC}"
elif [[ $PCT -ge 60 ]]; then
    echo -e "${YELLOW}🟡 STATUS: ON TRACK (60-79%)${NC}"
else
    echo -e "${RED}🔴 STATUS: NEEDS ATTENTION (<60%)${NC}"
fi

# =============================================================================
# Throughput Metrics Section
# =============================================================================

echo ""
echo -e "${CYAN}📈 Throughput Metrics${NC}"
echo "====================="
echo ""
echo "| Metric              | Value        | Target   |"
echo "|---------------------|--------------|----------|"
echo "| Items Today         | $ITEMS_TODAY           | ≥1       |"
echo "| Items This Week     | $ITEMS_WEEK           | ≥7       |"
echo "| Items/Day (7d avg)  | $ITEMS_PER_DAY        | ≥1.0     |"
echo "| Lead Time (days)    | $LEAD_TIME_DAYS           | <7       |"
echo "| Cycle Time (hours)  | $CYCLE_TIME_HOURS        | <24      |"
echo ""

# =============================================================================
# WSJF Mode: Full Analysis
# =============================================================================

if $WSJF_MODE; then
    echo -e "${CYAN}🎯 WSJF Priority Queue${NC}"
    echo "======================"
    echo ""
    echo "| Rank | ID           | WSJF  | CoD/Week | Title                              |"
    echo "|------|--------------|-------|----------|-------------------------------------|"

    for i in "${!SORTED_WSJF[@]}"; do
        if [[ $i -ge 10 ]]; then break; fi
        item="${SORTED_WSJF[$i]}"
        id=$(echo "$item" | cut -d'|' -f1)
        title=$(echo "$item" | cut -d'|' -f2 | cut -c1-35)
        score=$(echo "$item" | cut -d'|' -f3)
        cod=$(echo "$item" | cut -d'|' -f4)
        printf "| %-4d | %-12s | %-5s | \$%-7s | %-35s |\n" "$((i+1))" "$id" "$score" "$cod" "$title"
    done
    echo ""

    # Cost of Delay Analysis
    echo -e "${CYAN}💰 Cost of Delay Analysis (HIGH Priority)${NC}"
    echo "==========================================="
    echo ""
    echo "| ID           | BV | TC | RR | JS | WSJF  | CoD/Week | Weekly Impact |"
    echo "|--------------|----|----|----|----|-------|----------|---------------|"

    for item in "${SORTED_WSJF[@]:0:5}"; do
        id=$(echo "$item" | cut -d'|' -f1)
        score=$(echo "$item" | cut -d'|' -f3)
        cod=$(echo "$item" | cut -d'|' -f4)
        bv=$(echo "$item" | cut -d'|' -f5)
        tc=$(echo "$item" | cut -d'|' -f6)
        rr=$(echo "$item" | cut -d'|' -f7)
        js=$(echo "$item" | cut -d'|' -f8)
        impact=$(awk -v cod="$cod" 'BEGIN { printf "%.0f\n", cod * 4 }')
        printf "| %-12s | %-2s | %-2s | %-2s | %-2s | %-5s | \$%-7s | \$%-12s |\n" \
            "$id" "$bv" "$tc" "$rr" "$js" "$score" "$cod" "$impact/mo"
    done
    echo ""
    echo "Legend: BV=Business Value, TC=Time Criticality, RR=Risk Reduction, JS=Job Size"
    echo "Formula: WSJF = (BV + TC + RR) / JS | CoD = (BV + TC + RR) × 1.5"
    echo ""
fi

# =============================================================================
# Recommended Next Item
# =============================================================================

echo ""
echo -e "${CYAN}🎯 WSJF Recommended Next Item${NC}"
echo "==============================="
echo ""

if [[ ${#SORTED_WSJF[@]} -gt 0 ]]; then
    TOP_ITEM="${SORTED_WSJF[0]}"
    TOP_ID=$(echo "$TOP_ITEM" | cut -d'|' -f1)
    TOP_TITLE=$(echo "$TOP_ITEM" | cut -d'|' -f2)
    TOP_SCORE=$(echo "$TOP_ITEM" | cut -d'|' -f3)
    TOP_COD=$(echo "$TOP_ITEM" | cut -d'|' -f4)
    TOP_BV=$(echo "$TOP_ITEM" | cut -d'|' -f5)
    TOP_TC=$(echo "$TOP_ITEM" | cut -d'|' -f6)
    TOP_RR=$(echo "$TOP_ITEM" | cut -d'|' -f7)
    TOP_JS=$(echo "$TOP_ITEM" | cut -d'|' -f8)

    echo -e "${GREEN}🥇 TOP PRIORITY: $TOP_ID${NC}"
    echo "   Title: $TOP_TITLE"
    echo ""
    echo "   WSJF Breakdown:"
    echo "   ├─ Business Value:    $TOP_BV"
    echo "   ├─ Time Criticality:  $TOP_TC"
    echo "   ├─ Risk Reduction:    $TOP_RR"
    echo "   ├─ Job Size:          $TOP_JS"
    echo "   ├─ WSJF Score:        $TOP_SCORE"
    echo "   └─ Cost of Delay:     \$$TOP_COD/week"
    echo ""
    echo -e "   ${YELLOW}💡 Start this item now for maximum value delivery!${NC}"
else
    HIGH_COUNT=$(grep -c "^- \[ \].*priority: HIGH" "$QUICK_WINS" || true)
    if [[ $HIGH_COUNT -eq 0 ]]; then
        echo -e "${GREEN}✅ No HIGH priority items remaining!${NC}"
    else
        ITEM=$(grep "^- \[ \].*priority: HIGH" "$QUICK_WINS" | head -1 | sed 's/^- \[ \] //')
        echo -e "${RED}🔴 Recommended (HIGH priority):${NC}"
        echo "$ITEM"
        echo ""
        echo "WSJF Score: ~5.3 (estimated)"
        echo -e "${YELLOW}💡 Start this item now for maximum impact!${NC}"
    fi
fi

echo ""
echo "Recent Completions:"
echo "-------------------"
grep "^- \[x\]" "$QUICK_WINS" | tail -5 | sed 's/^- \[x\] /✅ /' || echo "None yet"

echo ""
echo "---"
echo "Run './scripts/show_quick_wins_progress.sh --wsjf' for full WSJF analysis"
echo "Run './scripts/show_quick_wins_progress.sh --json' for JSON output"
