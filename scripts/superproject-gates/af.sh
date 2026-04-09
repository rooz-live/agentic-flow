#!/bin/bash
set -e

# --- Enhanced AF CLI with Multipass Integration ---
# This script provides backward compatibility while integrating with the new
# multipass pre/post cycle capabilities

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
AF_MULTIPASS_SCRIPT="$SCRIPT_DIR/af_multipass"
BREAK_GLASS_SCRIPT="$SCRIPT_DIR/af/break_glass.py"

if [ -z "$PROJECT_ROOT" ]; then
  export PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
fi

export PYTHONPATH="$SCRIPT_DIR:$PROJECT_ROOT:$PYTHONPATH"
export AF_RUN_ID=${AF_RUN_ID:-$(uuidgen | tr '[:upper:]' '[:lower:]')}
export AF_PROD_OBSERVABILITY_FIRST=${AF_PROD_OBSERVABILITY_FIRST:-1}

# Export script info for break-glass rerun suggestions
export AF_SCRIPT_NAME="$0"
export AF_SCRIPT_ARGS="$*"

# Ensure Goalie directories exist
mkdir -p "$PROJECT_ROOT/.goalie/hooks"

# --- Break-Glass Hook Functions ---

# Check if a command requires break-glass approval
# Returns 0 if approved, 1 if blocked
check_break_glass() {
    local command="$1"
    local rerun_command="${2:-}"
    
    if [ -f "$BREAK_GLASS_SCRIPT" ]; then
        if [ -n "$rerun_command" ]; then
            python3 "$BREAK_GLASS_SCRIPT" check "$command" --rerun "$rerun_command"
        else
            python3 "$BREAK_GLASS_SCRIPT" check "$command"
        fi
        return $?
    fi
    
    # If break-glass script doesn't exist, allow the command
    return 0
}

# Get the risk category of a command (for logging/display)
get_risk_category() {
    local command="$1"
    
    if [ -f "$BREAK_GLASS_SCRIPT" ]; then
        python3 "$BREAK_GLASS_SCRIPT" category "$command" --json 2>/dev/null | \
            python3 -c "import sys, json; data = json.load(sys.stdin); print(data.get('risk_category', ''))" 2>/dev/null || echo ""
    fi
}

# Check break-glass status and print to stderr
print_break_glass_status() {
    if [ -f "$BREAK_GLASS_SCRIPT" ]; then
        python3 "$BREAK_GLASS_SCRIPT" status >&2
    fi
}

# Execute a command with break-glass protection
# Usage: execute_with_break_glass "command" ["rerun_command"]
execute_with_break_glass() {
    local command="$1"
    local rerun_command="${2:-$AF_SCRIPT_NAME $AF_SCRIPT_ARGS}"
    
    if ! check_break_glass "$command" "$rerun_command"; then
        return 1
    fi
    
    # If approved, execute the command
    eval "$command"
}

# Wrapper for SSH commands with break-glass
ssh_with_break_glass() {
    local host="$1"
    shift
    local remote_command="$*"
    local full_command="ssh $host '$remote_command'"
    
    if ! check_break_glass "$full_command"; then
        return 1
    fi
    
    ssh "$host" "$remote_command"
}

# Check if multipass features are requested
MULTIPASS_REQUESTED=false
for arg in "$@"; do
    case $arg in
        --multipass|--preflight-iters|--progress-tooltip|--progress-status-file)
            MULTIPASS_REQUESTED=true
            break
            ;;
    esac
done

# If multipass features are requested, delegate to enhanced script
if [ "$MULTIPASS_REQUESTED" = true ]; then
    exec "$AF_MULTIPASS_SCRIPT" "$@"
fi

# --- Subcommands ---

echo "DEBUG: Command received: '$1'" >&2
case "$1" in
    prod-cycle)
        shift
        # Parse --mode and --testing arguments specifically for prod-cycle
        MODE="mutate"  # Default mode
        TESTING="none"  # Default testing
        CIRCLE=""  # Optional circle (used for tier-depth coverage)
        RUN_TIER_DEPTH=1
        JSON_OUTPUT=false
        OTHER_ARGS=()
        
        while [[ $# -gt 0 ]]; do
            case $1 in
                --mode)
                    MODE="$2"
                    OTHER_ARGS+=("--mode" "$2")
                    shift 2
                    ;;
                --circle)
                    CIRCLE="$2"
                    OTHER_ARGS+=("--circle" "$2")
                    shift 2
                    ;;
                --testing)
                    TESTING="$2"
                    OTHER_ARGS+=("--testing" "$2")
                    shift 2
                    ;;
                --testing-strategy|--testing-samples)
                    OTHER_ARGS+=("$1" "$2")
                    shift 2
                    ;;
                --tier-depth-coverage|--tier-depth)
                    RUN_TIER_DEPTH=1
                    shift
                    ;;
                --no-tier-depth-coverage|--no-tier-depth)
                    RUN_TIER_DEPTH=0
                    shift
                    ;;
                --json)
                    JSON_OUTPUT=true
                    OTHER_ARGS+=("--json")
                    shift
                    ;;
                --log-goalie)
                    export AF_ENABLE_IRIS_METRICS=1
                    shift
                    ;;
                *)
                    OTHER_ARGS+=("$1")
                    shift
                    ;;
            esac
        done
        
        # Validate mode choices
        case $MODE in
            mutate|advisory|enforcement)
                # Valid mode
                ;;
            *)
                if [ "$JSON_OUTPUT" = true ]; then
                    echo '{"error": "Invalid mode", "message": "Invalid mode '$MODE'. Valid choices are: mutate, advisory, enforcement"}'
                else
                    echo "Error: Invalid mode '$MODE'. Valid choices are: mutate, advisory, enforcement"
                fi
                exit 1
                ;;
        esac
        
        # Validate testing choices
        case $TESTING in
            backtest|forward|full|none)
                # Valid testing type
                ;;
            *)
                if [ "$JSON_OUTPUT" = true ]; then
                    echo '{"error": "Invalid testing", "message": "Invalid testing '$TESTING'. Valid choices are: backtest, forward, full, none"}'
                else
                    echo "Error: Invalid testing '$TESTING'. Valid choices are: backtest, forward, full, none"
                fi
                exit 1
                ;;
        esac
        
        # Pass mode as environment variable and other args
        export AF_PROD_CYCLE_MODE="$MODE"
        
        # Check if we should use existing script or our new implementation
        if [ -f "$SCRIPT_DIR/af/af_prod_cycle.py" ]; then
            python3 "$SCRIPT_DIR/af/af_prod_cycle.py" --mode "$MODE" "${OTHER_ARGS[@]}"
        else
            python3 "$SCRIPT_DIR/../investing/agentic-flow/scripts/cmd_prod_cycle.py" --mode "$MODE" "${OTHER_ARGS[@]}"
        fi
        
        if [ "$RUN_TIER_DEPTH" -eq 1 ]; then
          TD_ARGS=("--correlation-id" "$AF_RUN_ID")
          if [ -n "$CIRCLE" ]; then
            TD_ARGS+=("--circle" "$CIRCLE")
            if [ "$CIRCLE" = "testing" ]; then
              TD_ARGS+=("--tier1-circles" "orchestrator,assessor,testing")
            fi
          fi
          if [ "$JSON_OUTPUT" = true ]; then
            TD_ARGS+=("--json")
          fi
          
          if [ -f "$SCRIPT_DIR/../investing/agentic-flow/scripts/cmd_tier_depth_coverage.py" ]; then
            python3 "$SCRIPT_DIR/../investing/agentic-flow/scripts/cmd_tier_depth_coverage.py" "${TD_ARGS[@]}"
          else
            echo "Warning: Tier depth coverage script not found, skipping"
          fi
        fi
        ;;

    prod-swarm)
        shift
        JSON_OUTPUT=false
        OTHER_ARGS=()
        
        while [[ $# -gt 0 ]]; do
            case $1 in
                --json)
                    JSON_OUTPUT=true
                    OTHER_ARGS+=("--json")
                    shift
                    ;;
                --save-table)
                    OTHER_ARGS+=("--save-table")
                    shift
                    ;;
                --table-label)
                    OTHER_ARGS+=("--table-label" "$2")
                    shift 2
                    ;;
                --auto-compare)
                    OTHER_ARGS+=("--auto-compare")
                    shift
                    ;;
                --validate-only)
                    OTHER_ARGS+=("--validate-only")
                    shift
                    ;;
                --discover)
                    OTHER_ARGS+=("--discover")
                    shift
                    ;;
                --compare-out)
                    OTHER_ARGS+=("--compare-out" "$2")
                    shift 2
                    ;;
                --compare-save)
                    OTHER_ARGS+=("--compare-save" "$2")
                    shift 2
                    ;;
                *)
                    OTHER_ARGS+=("$1")
                    shift
                    ;;
            esac
        done
        
        # Check if we should use existing script or our new implementation
        if [ -f "$SCRIPT_DIR/../investing/agentic-flow/scripts/cmd_swarm_compare.py" ]; then
            python3 "$SCRIPT_DIR/../investing/agentic-flow/scripts/cmd_swarm_compare.py" "${OTHER_ARGS[@]}"
        else
            python3 "$SCRIPT_DIR/af/af_prod_swarm.py" "${OTHER_ARGS[@]}"
        fi
        ;;

    wsjf|wsjf-top|wsjf-by-circle|wsjf-replenish)
        cmd="$1"
        shift
        case "$cmd" in
            wsjf)
                if [ -f "$SCRIPT_DIR/../investing/agentic-flow/scripts/cmd_wsjf.py" ]; then
                    python3 "$SCRIPT_DIR/../investing/agentic-flow/scripts/cmd_wsjf.py" "$@"
                else
                    echo "Error: WSJF script not found"
                    exit 1
                fi
                ;;
            wsjf-top)
                if [ -f "$SCRIPT_DIR/../investing/agentic-flow/scripts/cmd_wsjf.py" ]; then
                    python3 "$SCRIPT_DIR/../investing/agentic-flow/scripts/cmd_wsjf.py" --top "$@"
                else
                    echo "Error: WSJF script not found"
                    exit 1
                fi
                ;;
            wsjf-by-circle)
                if [ -f "$SCRIPT_DIR/../investing/agentic-flow/scripts/cmd_wsjf.py" ]; then
                    python3 "$SCRIPT_DIR/../investing/agentic-flow/scripts/cmd_wsjf.py" --circle "$@"
                else
                    echo "Error: WSJF script not found"
                    exit 1
                fi
                ;;
            wsjf-replenish)
                if [ -f "$SCRIPT_DIR/../investing/agentic-flow/scripts/circles/replenish_circle.sh" ]; then
                    "$SCRIPT_DIR/../investing/agentic-flow/scripts/circles/replenish_circle.sh" "$@"
                else
                    echo "Error: WSJF replenish script not found"
                    exit 1
                fi
                ;;
        esac
        ;;
    
    pattern-stats)
        shift
        # Check if this is a wsjf-enrichment request
        if [ "$1" = "--pattern" ] && [ "$2" = "wsjf-enrichment" ]; then
            # Use WSJF-enrichment specific analysis
            if [ -f "$SCRIPT_DIR/agentic/wsjf_enrichment_analysis.py" ]; then
                python3 "$SCRIPT_DIR/agentic/wsjf_enrichment_analysis.py" "$@"
            else
                echo "Error: WSJF-enrichment analysis script not found"
                exit 1
            fi
        elif [ "$1" = "--pattern" ] && [ "$2" = "wsjf-root-cause" ]; then
            # Use WSJF root cause analyzer
            if [ -f "$SCRIPT_DIR/agentic/wsjf_root_cause_analyzer.py" ]; then
                python3 "$SCRIPT_DIR/agentic/wsjf_root_cause_analyzer.py" "$@"
            else
                echo "Error: WSJF root cause analyzer script not found"
                exit 1
            fi
        elif [ "$1" = "--pattern" ] && [ "$2" = "wsjf-failure-tracker" ]; then
            # Use WSJF failure tracker
            if [ -f "$SCRIPT_DIR/agentic/wsjf_failure_tracker.py" ]; then
                python3 "$SCRIPT_DIR/agentic/wsjf_failure_tracker.py" "$@"
            else
                echo "Error: WSJF failure tracker script not found"
                exit 1
            fi
        elif [ "$1" = "--pattern" ] && [ "$2" = "wsjf-remediation" ]; then
            # Use WSJF remediation recommender
            if [ -f "$SCRIPT_DIR/agentic/wsjf_remediation_recommender.py" ]; then
                python3 "$SCRIPT_DIR/agentic/wsjf_remediation_recommender.py" "$@"
            else
                echo "Error: WSJF remediation recommender script not found"
                exit 1
            fi
        elif [ "$1" = "--pattern" ] && [ "$2" = "wsjf-pattern-filter" ]; then
            # Use WSJF pattern filter
            if [ -f "$SCRIPT_DIR/agentic/wsjf_pattern_filter.py" ]; then
                python3 "$SCRIPT_DIR/agentic/wsjf_pattern_filter.py" "$@"
            else
                echo "Error: WSJF pattern filter script not found"
                exit 1
            fi
        elif [ -f "$SCRIPT_DIR/cmd_pattern_stats.py" ]; then
            python3 "$SCRIPT_DIR/cmd_pattern_stats.py" "$@"
        else
            echo "Error: Pattern stats script not found"
            exit 1
        fi
        ;;

    correlation-analysis|correlation)
        shift
        if [ -f "$SCRIPT_DIR/af/correlation_analysis.py" ]; then
            python3 "$SCRIPT_DIR/af/correlation_analysis.py" "$@"
        else
            echo "Error: Correlation analysis script not found"
            exit 1
        fi
        ;;

    status)
        # Handle status command
        if [ -f "$SCRIPT_DIR/production_status_manager.py" ]; then
            python3 "$SCRIPT_DIR/production_status_manager.py" status "$@"
        else
            echo "Error: Production status manager not found"
            exit 1
        fi
        ;;
    dashboard)
        # Handle dashboard command
        if [ -f "$SCRIPT_DIR/progress_dashboard.py" ]; then
            python3 "$SCRIPT_DIR/progress_dashboard.py" generate "$@"
        else
            echo "Error: Progress dashboard not found"
            exit 1
        fi
        ;;
    watch)
        # Handle watch command
        if [ -f "$SCRIPT_DIR/progress_dashboard.py" ]; then
            python3 "$SCRIPT_DIR/progress_dashboard.py" watch "$@"
        else
            echo "Error: Progress dashboard not found"
            exit 1
        fi
        ;;
    validate)
        # Handle validation command
        if [ -f "$SCRIPT_DIR/validation/comprehensive_validator.py" ]; then
            python3 "$SCRIPT_DIR/validation/comprehensive_validator.py" "$@"
        else
            echo "Error: Comprehensive validator not found"
            exit 1
        fi
        ;;
    evidence)
        # Handle evidence commands
        if [ -f "$SCRIPT_DIR/evidence_integration.py" ]; then
            python3 "$SCRIPT_DIR/evidence_integration.py" "$@"
        else
            echo "Error: Evidence integration not found"
            exit 1
        fi
        ;;
    evidence-trails)
        # Handle evidence trails commands
        shift
        if [ -f "$SCRIPT_DIR/monitoring/evidence_trail_manager.py" ]; then
            python3 "$SCRIPT_DIR/monitoring/evidence_trail_manager.py" "$@"
        else
            echo "Error: Evidence trail manager not found"
            exit 1
        fi
        ;;
    circle-health)
        # Handle circle health commands
        shift
        if [ -f "$SCRIPT_DIR/monitoring/circle_health_monitor.py" ]; then
            python3 "$SCRIPT_DIR/monitoring/circle_health_monitor.py" "$@"
        else
            echo "Error: Circle health monitor not found"
            exit 1
        fi
        ;;
    system-health)
        # Handle system health commands
        shift
        if [ -f "$SCRIPT_DIR/monitoring/system_health_orchestrator.py" ]; then
            python3 "$SCRIPT_DIR/monitoring/system_health_orchestrator.py" "$@"
        else
            echo "Error: System health orchestrator not found"
            exit 1
        fi
        ;;
    governance)
        # Handle governance commands
        shift
        if [ -f "$SCRIPT_DIR/governance/governance_orchestrator.py" ]; then
            python3 "$SCRIPT_DIR/governance/governance_orchestrator.py" "$@"
        else
            echo "Error: Governance orchestrator not found"
            exit 1
        fi
        ;;
    baseline)
        # Handle baseline commands
        shift
        if [ -f "$SCRIPT_DIR/governance/baseline_assessment.py" ]; then
            python3 "$SCRIPT_DIR/governance/baseline_assessment.py" "$@"
        else
            echo "Error: Baseline assessment not found"
            exit 1
        fi
        ;;
    improvement)
        # Handle improvement commands
        shift
        if [ -f "$SCRIPT_DIR/governance/continuous_improvement.py" ]; then
            python3 "$SCRIPT_DIR/governance/continuous_improvement.py" "$@"
        else
            echo "Error: Continuous improvement not found"
            exit 1
        fi
        ;;
    policy)
        # Handle policy commands
        shift
        if [ -f "$SCRIPT_DIR/governance/policy_engine.py" ]; then
            python3 "$SCRIPT_DIR/governance/policy_engine.py" "$@"
        else
            echo "Error: Policy engine not found"
            exit 1
        fi
        ;;
    break-glass)
        # Handle break-glass commands
        shift
        if [ -f "$BREAK_GLASS_SCRIPT" ]; then
            python3 "$BREAK_GLASS_SCRIPT" "$@"
        else
            echo "Error: Break-glass script not found"
            exit 1
        fi
        ;;
    prod)
        exec "$0" "prod-cycle" "${@:2}"
        ;;

    --help|-h)
        echo "Usage: $0 {COMMAND} [OPTIONS]"
        echo ""
        echo "Core Commands:"
        echo "  prod-cycle              - Run production cycle with WSJF prioritization"
        echo "  prod-swarm              - Run production swarm comparison and analysis"
        echo ""
        echo "Enhanced Commands (with Multipass Integration):"
        echo "  status                  - Show current production status"
        echo "  dashboard               - Generate progress dashboard"
        echo "  watch                   - Watch progress in real-time"
        echo "  validate                - Run comprehensive validation"
        echo "  evidence                - Manage evidence and metrics"
        echo ""
        echo "Governance & Continuous Improvement:"
        echo "  governance              - Governance hierarchy and circle management"
        echo "  baseline                - Baseline assessment and monitoring"
        echo "  improvement             - Continuous improvement orchestration"
        echo "  policy                  - Policy engine and guardrails"
        echo ""
        echo "Production Safety:"
        echo "  break-glass check CMD   - Check if a command requires break-glass approval"
        echo "  break-glass category CMD - Get risk category for a command"
        echo "  break-glass status      - Show break-glass configuration status"
        echo "  break-glass audit       - View break-glass audit log"
        echo ""
        echo "Analysis & Insights:"
        echo "  pattern-stats           - View pattern metrics and statistics"
        echo "  correlation-analysis     - Analyze pattern correlations over 72 hours"
        echo ""
        echo "WSJF Enrichment Analysis:"
        echo "  pattern-stats --pattern wsjf-enrichment     - WSJF-enrichment failure analysis"
        echo "  pattern-stats --pattern wsjf-root-cause     - WSJF-enrichment root cause analysis"
        echo "  pattern-stats --pattern wsjf-failure-tracker - WSJF-enrichment failure tracking"
        echo "  pattern-stats --pattern wsjf-pattern-filter    - WSJF-enrichment pattern filtering"
        echo "  pattern-stats --pattern wsjf-remediation    - WSJF-enrichment remediation recommendations"
        echo ""
        echo "WSJF & Prioritization:"
        echo "  wsjf                    - View WSJF scores for all items"
        echo "  wsjf-top                - Show top WSJF items"
        echo "  wsjf-by-circle          - Show WSJF scores by circle"
        echo "  wsjf-replenish          - Replenish with WSJF calculation"
        echo ""
        echo "Swarm Comparison Options:"
        echo "  --discover               - Auto-discover swarm tables in .goalie directory"
        echo "  --save-table            - Save current swarm table with enhanced metrics"
        echo "  --auto-compare          - Trigger automated comparison after prod-swarm"
        echo "  --validate-only          - Only validate swarm table files"
        echo "  --table-label            - Label for saved swarm table"
        echo "  --compare-out            - Comparison output format (json/tsv)"
        echo "  --compare-save           - Save comparison results to file"
        echo ""
        echo "Multipass Options (use with prod-cycle or prod-swarm):"
        echo "  --multipass             - Enable multipass pre/post cycle integration"
        echo "  --preflight-iters N     - Number of preflight iterations (default: 5)"
        echo "  --progress-tooltip MODE  - Progress output mode (off|compact|rich|json|write-status-file)"
        echo "  --progress-status-file PATH - Status file path for write-status-file mode"
        echo ""
        echo "Global Options:"
        echo "  --json                  - Output JSON format"
        echo "  --help                  - Show this help message"
        echo "  --version               - Show version information"
        echo ""
        echo "Examples:"
        echo "  $0 prod-cycle --mode mutate --multipass --preflight-iters 5 --progress-tooltip rich"
        echo "  $0 prod-swarm --multipass --preflight-iters 3 --progress-tooltip compact --discover"
        echo "  $0 prod-cycle --mode mutate --json"
        echo "  $0 prod-swarm --discover --json"
        echo "  $0 prod-swarm --save-table --table-label production --auto-compare"
        echo "  $0 prod-swarm --validate-only --current /path/to/table.tsv"
        echo "  $0 wsjf-top 10 --json"
        echo "  $0 pattern-stats --circle analyst --json"
        echo "  $0 correlation-analysis --circle ui --json"
        echo "  $0 status"
        echo "  $0 dashboard --format rich"
        echo "  $0 watch --format compact --interval 10"
        echo "  $0 validate all"
        echo "  $0 evidence emit-evidence --type validation --data '{\"status\": \"passed\"}'"
        echo ""
        echo "For detailed help on multipass features, run:"
        echo "  $SCRIPT_DIR/af_multipass --help"
        exit 0
        ;;

    --version|-v)
        echo "af CLI version 1.0.0"
        echo "Agentic Flow Production Tools"
        exit 0
        ;;

    *)
        echo "Usage: $0 {COMMAND} [OPTIONS]"
        echo ""
        echo "Core Commands:"
        echo "  prod-cycle              - Run production cycle with WSJF prioritization"
        echo "  prod-swarm              - Run production swarm comparison and analysis"
        echo ""
        echo "Analysis & Insights:"
        echo "  pattern-stats           - View pattern metrics and statistics"
        echo "  correlation-analysis     - Analyze pattern correlations over 72 hours"
        echo ""
        echo "Governance & Continuous Improvement:"
        echo "  governance              - Governance hierarchy and circle management"
        echo "  baseline                - Baseline assessment and monitoring"
        echo "  improvement             - Continuous improvement orchestration"
        echo "  policy                  - Policy engine and guardrails"
        echo ""
        echo "WSJF & Prioritization:"
        echo "  wsjf                    - View WSJF scores for all items"
        echo "  wsjf-top                - Show top WSJF items"
        echo "  wsjf-by-circle          - Show WSJF scores by circle"
        echo "  wsjf-replenish          - Replenish with WSJF calculation"
        echo ""
        echo "Global Options:"
        echo "  --json                  - Output JSON format"
        echo "  --help                  - Show this help message"
        echo "  --version               - Show version information"
        echo ""
        echo "Examples:"
        echo "  $0 prod-cycle --mode mutate --json"
        echo "  $0 prod-swarm --json"
        echo "  $0 wsjf-top 10 --json"
        echo "  $0 pattern-stats --circle analyst --json"
        echo ""
        echo "Use '$0 --help' for more information on a specific command."
        exit 1
        ;;
esac