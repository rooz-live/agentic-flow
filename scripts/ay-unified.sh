#!/usr/bin/env bash
# ay-unified.sh - Unified Agentic Flow Command with Dynamic Threshold Integration
# Orchestrates: continuous-improve, divergence monitoring, WSJF iteration, and real-time dashboards
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
NC='\033[0m'

# ═══════════════════════════════════════════════════════════════════════════
# USAGE
# ═══════════════════════════════════════════════════════════════════════════

usage() {
    cat << 'EOF'
╔═══════════════════════════════════════════════════════════════════════════╗
║                    AY - UNIFIED AGENTIC FLOW COMMAND                     ║
║                     with Dynamic Threshold Integration                   ║
╚═══════════════════════════════════════════════════════════════════════════╝

USAGE:
  ay <command> [options]

COMMANDS:
  auto            🚀 Adaptive auto-resolution with iterative mode cycling
  monitor         Real-time threshold monitoring dashboard
  improve         Run continuous improvement with dynamic thresholds
  divergence      Monitor divergence with Sharpe-adjusted thresholds
  iterate         Run WSJF-based iteration with adaptive thresholds
  health          Quick health check of all thresholds
  backtest        Run backtest on historical episodes
  init            Initialize agentdb with test episodes
  status          Show current system status
  help            Show this help message

MONITORING COMMANDS:
  ay monitor [circle] [ceremony]
    Launch real-time dashboard
    Default: ay monitor orchestrator standup
    
  ay health
    Quick snapshot of all 6 thresholds
    
  ay status
    Database stats + threshold operational status

IMPROVEMENT COMMANDS:
  ay improve [circle] [ceremony]
    Run continuous improvement loop with dynamic thresholds
    Replaces hardcoded thresholds with calculated values
    
  ay iterate [options]
    Run WSJF-prioritized iteration with adaptive check frequency
    Integrates dynamic thresholds into WSJF scoring

DIVERGENCE COMMANDS:
  ay divergence [interval]
    Monitor divergence rate with Sharpe adjustment
    Uses dynamic thresholds from agentdb
    Default interval: 10 seconds

SETUP COMMANDS:
  ay init [count]
    Generate test episodes (default: 50)
    Creates realistic episode distribution for threshold calculation
    
  ay backtest [episodes]
    Run backtest on historical data
    Test threshold accuracy on past episodes

OPTIONS:
  -h, --help      Show this help
  -v, --verbose   Verbose output
  --db PATH       Custom agentdb.db path

EXAMPLES:
  # 🚀 Adaptive auto-resolution (recommended)
  ay auto
  
  # Real-time monitoring
  ay monitor orchestrator standup
  
  # Quick health check
  ay health
  
  # Continuous improvement
  ay improve orchestrator standup
  
  # Divergence monitoring
  ay divergence 15
  
  # Initialize with 100 episodes
  ay init 100
  
  # WSJF iteration
  ay iterate --max-iterations 10

DYNAMIC THRESHOLDS:
  The ay command integrates 6 dynamic threshold patterns:
  
  1. Circuit Breaker (2.5σ method)
  2. Degradation Detection (95% CI)
  3. Cascade Failure (velocity-based 3σ)
  4. Divergence Rate (Sharpe-adjusted)
  5. Check Frequency (adaptive)
  6. Quantile-Based (fat-tail aware)
  
  All thresholds calculated from agentdb.db episodes in real-time.

CONFIDENCE LEVELS:
  ✅ HIGH_CONFIDENCE    - 30+ episodes, statistical significance
  ⚠️  MEDIUM_CONFIDENCE - 10-30 episodes, reasonable estimates
  ⚠️  LOW_CONFIDENCE    - 5-10 episodes, early indicators
  ❌ NO_DATA/FALLBACK   - <5 episodes, using conservative defaults

EOF
}

# ═══════════════════════════════════════════════════════════════════════════
# COMMAND IMPLEMENTATIONS
# ═══════════════════════════════════════════════════════════════════════════

cmd_auto() {
    echo -e "${CYAN}Launching adaptive auto-resolution...${NC}"
    echo ""
    
    if [ ! -f "$SCRIPT_DIR/ay-auto.sh" ]; then
        echo -e "${RED}Error: ay-auto.sh not found${NC}"
        exit 1
    fi
    
    exec bash "$SCRIPT_DIR/ay-auto.sh" "$@"
}

cmd_monitor() {
    local circle="${1:-orchestrator}"
    local ceremony="${2:-standup}"
    
    echo -e "${CYAN}Launching real-time threshold monitor...${NC}"
    echo -e "${CYAN}Circle: ${MAGENTA}$circle${CYAN} | Ceremony: ${MAGENTA}$ceremony${NC}"
    echo ""
    
    exec bash "$SCRIPT_DIR/ay-threshold-monitor.sh" "$circle" "$ceremony"
}

cmd_health() {
    echo -e "${BLUE}╔═══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║                    HEALTH CHECK SNAPSHOT                      ║${NC}"
    echo -e "${BLUE}╚═══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    
    # Run threshold script and capture output
    local output
    output=$("$SCRIPT_DIR/ay-dynamic-thresholds.sh" all orchestrator standup 2>/dev/null || true)
    
    if [ -z "$output" ]; then
        echo -e "${RED}❌ Unable to fetch thresholds. Check ay-dynamic-thresholds.sh${NC}"
        exit 1
    fi
    
    # Parse and display each threshold
    echo -e "${CYAN}1. Circuit Breaker${NC}"
    echo "$output" | grep -A3 "Circuit Breaker" | sed 's/^/  /' || echo "  N/A"
    echo ""
    
    echo -e "${CYAN}2. Degradation Threshold${NC}"
    echo "$output" | grep -A3 "Degradation Threshold" | sed 's/^/  /' || echo "  N/A"
    echo ""
    
    echo -e "${CYAN}3. Cascade Failure${NC}"
    echo "$output" | grep -A3 "Cascade Failure" | sed 's/^/  /' || echo "  N/A"
    echo ""
    
    echo -e "${CYAN}4. Divergence Rate${NC}"
    echo "$output" | grep -A3 "Divergence Rate" | sed 's/^/  /' || echo "  N/A"
    echo ""
    
    echo -e "${CYAN}5. Check Frequency${NC}"
    echo "$output" | grep -A3 "Check Frequency" | sed 's/^/  /' || echo "  N/A"
    echo ""
    
    echo -e "${CYAN}6. Quantile-Based${NC}"
    echo "$output" | grep -A3 "Quantile-Based" | sed 's/^/  /' || echo "  N/A"
    echo ""
    
    # System health
    local high_count=$(echo "$output" | grep -c "HIGH_CONFIDENCE" || echo "0")
    local health_pct=$((high_count * 100 / 6))
    
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${CYAN}System Health: ${high_count}/6 thresholds operational (${health_pct}%)${NC}"
    
    if [ "$health_pct" -ge 80 ]; then
        echo -e "${GREEN}✅ EXCELLENT - All systems operational${NC}"
    elif [ "$health_pct" -ge 50 ]; then
        echo -e "${YELLOW}⚠️ GOOD - Most systems operational${NC}"
    else
        echo -e "${RED}❌ NEEDS IMPROVEMENT - Generate more episodes${NC}"
        echo -e "   Run: ${CYAN}ay init 50${NC}"
    fi
    echo ""
}

cmd_status() {
    local agentdb="${AGENTDB_PATH:-$ROOT_DIR/agentdb.db}"
    
    echo -e "${BLUE}╔═══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║                      SYSTEM STATUS                            ║${NC}"
    echo -e "${BLUE}╚═══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    
    # Database check
    if [ ! -f "$agentdb" ]; then
        echo -e "${RED}❌ Database not found at: $agentdb${NC}"
        echo ""
        echo -e "Initialize with: ${CYAN}ay init 50${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ Database found${NC}: $agentdb"
    echo ""
    
    # Episode counts
    local total=$(sqlite3 "$agentdb" "SELECT COUNT(*) FROM episodes" 2>/dev/null || echo "0")
    local recent_7d=$(sqlite3 "$agentdb" "SELECT COUNT(*) FROM episodes WHERE created_at > strftime('%s', 'now', '-7 days')" 2>/dev/null || echo "0")
    local recent_30d=$(sqlite3 "$agentdb" "SELECT COUNT(*) FROM episodes WHERE created_at > strftime('%s', 'now', '-30 days')" 2>/dev/null || echo "0")
    
    echo -e "${CYAN}📊 Episode Statistics${NC}"
    echo -e "  Total: $total"
    echo -e "  Last 7 days: $recent_7d"
    echo -e "  Last 30 days: $recent_30d"
    echo ""
    
    # Data quality assessment
    if [ "$recent_7d" -ge 30 ]; then
        echo -e "${GREEN}✅ Excellent data coverage (7d >= 30)${NC}"
    elif [ "$recent_7d" -ge 10 ]; then
        echo -e "${YELLOW}⚠️ Good data coverage (7d >= 10)${NC}"
    else
        echo -e "${RED}❌ Insufficient recent data (7d < 10)${NC}"
        echo -e "   Run: ${CYAN}ay init 30${NC}"
    fi
    echo ""
    
    # Threshold operational status
    local output
    output=$("$SCRIPT_DIR/ay-dynamic-thresholds.sh" all orchestrator standup 2>/dev/null || true)
    
    if [ -n "$output" ]; then
        local high=$(echo "$output" | grep -c "HIGH_CONFIDENCE" || echo "0")
        local medium=$(echo "$output" | grep -c "MEDIUM_CONFIDENCE" || echo "0")
        local low=$(echo "$output" | grep -c "LOW_CONFIDENCE" || echo "0")
        local fallback=$(echo "$output" | grep -cE "NO_DATA|FALLBACK" || echo "0")
        
        echo -e "${CYAN}🎯 Threshold Confidence Breakdown${NC}"
        echo -e "  ${GREEN}HIGH_CONFIDENCE:${NC} $high/6"
        echo -e "  ${YELLOW}MEDIUM_CONFIDENCE:${NC} $medium/6"
        echo -e "  ${YELLOW}LOW_CONFIDENCE:${NC} $low/6"
        echo -e "  ${RED}NO_DATA/FALLBACK:${NC} $fallback/6"
    fi
    
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "For detailed monitoring: ${CYAN}ay monitor${NC}"
    echo -e "For quick health check: ${CYAN}ay health${NC}"
    echo ""
}

cmd_improve() {
    local circle="${1:-orchestrator}"
    local ceremony="${2:-standup}"
    
    echo -e "${CYAN}Starting continuous improvement with dynamic thresholds...${NC}"
    echo -e "${CYAN}Circle: ${MAGENTA}$circle${CYAN} | Ceremony: ${MAGENTA}$ceremony${NC}"
    echo ""
    
    # Check if script exists
    if [ ! -f "$SCRIPT_DIR/ay-continuous-improve.sh" ]; then
        echo -e "${RED}Error: ay-continuous-improve.sh not found${NC}"
        exit 1
    fi
    
    # Export circle and ceremony for the script
    export AY_CIRCLE="$circle"
    export AY_CEREMONY="$ceremony"
    
    exec bash "$SCRIPT_DIR/ay-continuous-improve.sh"
}

cmd_divergence() {
    local interval="${1:-10}"
    
    echo -e "${CYAN}Starting divergence monitoring (interval: ${interval}s)...${NC}"
    echo ""
    
    if [ ! -f "$SCRIPT_DIR/monitor-divergence.sh" ]; then
        echo -e "${RED}Error: monitor-divergence.sh not found${NC}"
        exit 1
    fi
    
    export DIVERGENCE_INTERVAL="$interval"
    exec bash "$SCRIPT_DIR/monitor-divergence.sh"
}

cmd_iterate() {
    echo -e "${CYAN}Starting WSJF-based iteration with adaptive thresholds...${NC}"
    echo ""
    
    if [ ! -f "$SCRIPT_DIR/ay-wsjf-iterate.sh" ]; then
        echo -e "${RED}Error: ay-wsjf-iterate.sh not found${NC}"
        exit 1
    fi
    
    exec bash "$SCRIPT_DIR/ay-wsjf-iterate.sh" "$@"
}

cmd_init() {
    local count="${1:-50}"
    
    echo -e "${CYAN}Generating $count test episodes...${NC}"
    echo ""
    
    if [ ! -f "$SCRIPT_DIR/generate-test-episodes.ts" ]; then
        echo -e "${RED}Error: generate-test-episodes.ts not found${NC}"
        exit 1
    fi
    
    npx tsx "$SCRIPT_DIR/generate-test-episodes.ts" --count "$count"
    
    echo ""
    echo -e "${GREEN}✅ Episodes generated${NC}"
    echo ""
    echo -e "Next steps:"
    echo -e "  1. View status: ${CYAN}ay status${NC}"
    echo -e "  2. Health check: ${CYAN}ay health${NC}"
    echo -e "  3. Monitor: ${CYAN}ay monitor${NC}"
    echo ""
}

cmd_backtest() {
    local episodes="${1:-382000}"
    
    echo -e "${CYAN}Running backtest on $episodes episodes...${NC}"
    echo ""
    
    # TODO: Implement backtest logic
    # This would:
    # 1. Split episodes into train/test sets
    # 2. Calculate thresholds on training data
    # 3. Validate on test data
    # 4. Report accuracy, false positives, false negatives
    
    echo -e "${YELLOW}⚠️ Backtest implementation pending${NC}"
    echo ""
    echo "Planned features:"
    echo "  • Train/test split (80/20)"
    echo "  • Threshold accuracy validation"
    echo "  • False positive/negative rates"
    echo "  • ROC curves for each threshold"
    echo ""
}

cmd_audit() {
    local subcommand="${1:-full}"
    
    echo -e "${CYAN}Running baseline audit & governance...${NC}"
    echo ""
    
    if [ ! -f "$SCRIPT_DIR/ay-baseline-audit.sh" ]; then
        echo -e "${RED}Error: ay-baseline-audit.sh not found${NC}"
        exit 1
    fi
    
    exec bash "$SCRIPT_DIR/ay-baseline-audit.sh" "$subcommand"
}

# ═══════════════════════════════════════════════════════════════════════════
# MAIN DISPATCHER
# ═══════════════════════════════════════════════════════════════════════════

main() {
    local command="${1:-help}"
    shift || true
    
    case "$command" in
        auto|a)
            cmd_auto "$@"
            ;;
        monitor|m)
            cmd_monitor "$@"
            ;;
        health|h)
            cmd_health "$@"
            ;;
        status|s)
            cmd_status "$@"
            ;;
        improve|i)
            cmd_improve "$@"
            ;;
        divergence|div|d)
            cmd_divergence "$@"
            ;;
        iterate|it)
            cmd_iterate "$@"
            ;;
        init)
            cmd_init "$@"
            ;;
        backtest|bt)
            cmd_backtest "$@"
            ;;
        audit|baseline|governance)
            cmd_audit "$@"
            ;;
        help|--help|-h)
            usage
            ;;
        *)
            echo -e "${RED}Unknown command: $command${NC}"
            echo ""
            usage
            exit 1
            ;;
    esac
}

# Run
main "$@"
