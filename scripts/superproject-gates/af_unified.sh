#!/bin/bash
set -e

# --- Unified AF CLI with Consistent Evidence Emission ---
# This script provides a unified interface for prod-cycle and prod-swarm
# with consistent argument patterns and evidence emission

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
UNIFIED_CLI_DIR="$(dirname "$SCRIPT_DIR")/src/cli"

if [ -z "$PROJECT_ROOT" ]; then
  export PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
fi

export PYTHONPATH="$SCRIPT_DIR:$PROJECT_ROOT:$PYTHONPATH"
export AF_RUN_ID=${AF_RUN_ID:-$(uuidgen | tr '[:upper:]' '[:lower:]')}
export AF_PROD_OBSERVABILITY_FIRST=${AF_PROD_OBSERVABILITY_FIRST:-1}

# Ensure Goalie directories exist
mkdir -p "$PROJECT_ROOT/.goalie/hooks"

# --- Unified Argument Parser ---
COMMAND=""
MODE="normal"
TESTING="none"
CIRCLE=""
JSON_OUTPUT=false
VERBOSE=false
DRY_RUN=false
LOG_GOALIE=false

# Production cycle specific
SAFEGUARDS=false
ROLLOUT_STRATEGY="gradual"
VALIDATION=false
PATTERN_METRICS=false
COMPLIANCE_CHECKS=false
TIER_DEPTH_COVERAGE=true
ITERATIONS=""
NO_EARLY_STOP=false

# Production swarm specific
PRIOR=""
CURRENT=""
AUTO_REF=""
OUT_FORMAT="json"
SAVE=""
GENERATE_MOCK=false
MOCK_OUTPUT_DIR="swarm_data"
DISCOVER=false
SAVE_TABLE=false
TABLE_LABEL="current"
AUTO_COMPARE=false
VALIDATE_ONLY=false
INTEGRATE_WORKFLOW=false
FALLBACK_TO_UNIFIED=true
NO_AUTO_DISCOVER=false

# WSJF specific
JOB_ID=""
UBV=""
TC=""
RR=""
JOB_SIZE=""
BUDGET_ID=""
AMOUNT=""
STRATEGY="wsjf_only"

# --- Parse Arguments ---
parse_arguments() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            # Core arguments (both commands)
            --mode)
                MODE="$2"
                shift 2
                ;;
            --circle)
                CIRCLE="$2"
                shift 2
                ;;
            --testing)
                TESTING="$2"
                shift 2
                ;;
            --json)
                JSON_OUTPUT=true
                shift
                ;;
            --verbose)
                VERBOSE=true
                shift
                ;;
            --dry-run)
                DRY_RUN=true
                shift
                ;;
            --log-goalie)
                LOG_GOALIE=true
                export AF_ENABLE_IRIS_METRICS=1
                shift
                ;;
            # Production cycle specific
            --safeguards)
                SAFEGUARDS=true
                shift
                ;;
            --rollout-strategy)
                ROLLOUT_STRATEGY="$2"
                shift 2
                ;;
            --validation)
                VALIDATION=true
                shift
                ;;
            --pattern-metrics)
                PATTERN_METRICS=true
                shift
                ;;
            --compliance-checks)
                COMPLIANCE_CHECKS=true
                shift
                ;;
            --tier-depth-coverage|--tier-depth)
                TIER_DEPTH_COVERAGE=true
                shift
                ;;
            --no-tier-depth-coverage|--no-tier-depth)
                TIER_DEPTH_COVERAGE=false
                shift
                ;;
            --iterations)
                ITERATIONS="$2"
                shift 2
                ;;
            --no-early-stop)
                NO_EARLY_STOP=true
                shift
                ;;
            # Production swarm specific
            --prior)
                PRIOR="$2"
                shift 2
                ;;
            --current)
                CURRENT="$2"
                shift 2
                ;;
            --auto-ref)
                AUTO_REF="$2"
                shift 2
                ;;
            --out)
                OUT_FORMAT="$2"
                shift 2
                ;;
            --save)
                SAVE="$2"
                shift 2
                ;;
            --generate-mock)
                GENERATE_MOCK=true
                shift
                ;;
            --mock-output-dir)
                MOCK_OUTPUT_DIR="$2"
                shift 2
                ;;
            --discover)
                DISCOVER=true
                shift
                ;;
            --save-table)
                SAVE_TABLE=true
                shift
                ;;
            --table-label)
                TABLE_LABEL="$2"
                shift 2
                ;;
            --auto-compare)
                AUTO_COMPARE=true
                shift
                ;;
            --validate-only)
                VALIDATE_ONLY=true
                shift
                ;;
            --integrate-workflow)
                INTEGRATE_WORKFLOW=true
                shift
                ;;
            --fallback-to-unified)
                FALLBACK_TO_UNIFIED=true
                shift
                ;;
            --no-auto-discover)
                NO_AUTO_DISCOVER=true
                shift
                ;;
            # Help and version
            --help|-h)
                show_help
                exit 0
                ;;
            --version|-v)
                echo "Unified AF CLI version 2.0.0"
                echo "Agentic Flow Production Tools with Unified Evidence Emission"
                exit 0
                ;;
            *)
                # Positional arguments
                if [ -z "$COMMAND" ]; then
                    COMMAND="$1"
                else
                    echo "Unknown argument: $1"
                    show_help
                    exit 1
                fi
                shift
                ;;
        esac
    done
}

# --- Validation Functions ---
validate_arguments() {
    # Validate command
    if [ -z "$COMMAND" ]; then
        echo "Error: No command specified"
        show_help
        exit 1
    fi
    
    if [ "$COMMAND" != "prod-cycle" ] && [ "$COMMAND" != "prod-swarm" ] && [ "$COMMAND" != "wsjf" ] && [ "$COMMAND" != "budget" ] && [ "$COMMAND" != "priority" ]; then
        echo "Error: Invalid command '$COMMAND'. Valid commands are: prod-cycle, prod-swarm, wsjf, budget, priority"
        exit 1
    fi
    
    # Validate mode
    case $MODE in
        mutate|normal|advisory|enforcement)
            # Valid mode
            ;;
        *)
            echo "Error: Invalid mode '$MODE'. Valid choices are: mutate, normal, advisory, enforcement"
            exit 1
            ;;
    esac
    
    # Validate testing
    case $TESTING in
        backtest|forward|full|none)
            # Valid testing type
            ;;
        *)
            echo "Error: Invalid testing '$TESTING'. Valid choices are: backtest, forward, full, none"
            exit 1
            ;;
    esac
    
    # Validate rollout strategy
    case $ROLLOUT_STRATEGY in
        gradual|big-bang|canary)
            # Valid rollout strategy
            ;;
        *)
            echo "Error: Invalid rollout strategy '$ROLLOUT_STRATEGY'. Valid choices are: gradual, big-bang, canary"
            exit 1
            ;;
    esac
    
    # Validate output format
    case $OUT_FORMAT in
        json|tsv)
            # Valid output format
            ;;
        *)
            echo "Error: Invalid output format '$OUT_FORMAT'. Valid choices are: json, tsv"
            exit 1
            ;;
    esac
    
    # Command-specific validation
    if [ "$COMMAND" = "prod-swarm" ] && [ "$GENERATE_MOCK" = false ] && [ "$DISCOVER" = false ]; then
        if [ -z "$PRIOR" ] || [ -z "$CURRENT" ] || [ -z "$AUTO_REF" ]; then
            echo "Error: prod-swarm requires --prior, --current, and --auto-ref (or use --generate-mock or --discover)"
            exit 1
        fi
    fi
}

# --- Help Function ---
show_help() {
    cat << EOF
Usage: $0 {COMMAND} [OPTIONS]

Unified AF CLI - Production Cycle and Swarm Analysis with Consistent Evidence Emission

COMMANDS:
    prod-cycle              Run production cycle with WSJF prioritization
    prod-swarm              Run production swarm comparison and analysis
    wsjf                    Calculate WSJF scores for jobs
    budget                  Manage temporal budgets and track utilization
    priority                Calculate and optimize job priorities

CORE OPTIONS (both commands):
    --mode MODE             Execution mode (mutate|normal|advisory|enforcement)
    --circle CIRCLE          Specify circle for execution
    --testing STRATEGY       Testing methodology (backtest|forward|full|none)
    --json                  Output JSON format
    --verbose               Enable verbose logging
    --dry-run              Show what would be executed without running
    --log-goalie           Enable Goalie logging

PRODUCTION CYCLE OPTIONS:
    --safeguards           Enable enhanced safeguards
    --rollout-strategy STRATEGY  Rollout strategy (gradual|big-bang|canary)
    --validation            Enable comprehensive validation
    --pattern-metrics       Collect pattern execution metrics
    --compliance-checks     Run compliance checks
    --tier-depth-coverage  Run tier depth coverage (default: enabled)
    --no-tier-depth-coverage Skip tier depth coverage
    --iterations COUNT      Number of iterations
    --no-early-stop        Don't stop early on success

PRODUCTION SWARM OPTIONS:
    --prior FILE            Prior swarm TSV file
    --current FILE          Current swarm TSV file
    --auto-ref FILE         Auto-reference swarm TSV file
    --out FORMAT           Output format (json|tsv)
    --save FILE            Save output to file
    --generate-mock        Generate mock swarm data for testing
    --mock-output-dir DIR   Output directory for mock data
    --discover             Auto-discover swarm tables in .goalie directory
    --save-table           Save current swarm table to .goalie directory
    --table-label LABEL    Label for saved swarm table
    --auto-compare         Trigger automated comparison after prod-swarm
    --validate-only        Only validate swarm table files
    --integrate-workflow   Use integration helper for enhanced workflow
    --fallback-to-unified  Fallback to unified CLI on automation failure
    --no-auto-discover    Disable auto-discovery fallback

EXAMPLES:
    # Production cycle examples
    $0 prod-cycle --mode mutate --json
    $0 prod-cycle --mode normal --circle orchestrator --verbose
    $0 prod-cycle --mode advisory --safeguards --validation --iterations 10

    # Production swarm examples
    $0 prod-swarm --prior baseline.tsv --current current.tsv --auto-ref optimized.tsv --json
    $0 prod-swarm --generate-mock --json
    $0 prod-swarm --discover --save-table --table-label production --auto-compare

GLOBAL OPTIONS:
    --help, -h             Show this help message
    --version, -v           Show version information

ENVIRONMENT VARIABLES:
    AF_RUN_ID              Unique run identifier (auto-generated if not set)
    AF_ENABLE_IRIS_METRICS Enable IRIS metrics logging (set to 1)
    AF_PROD_OBSERVABILITY_FIRST Enable observability-first mode (default: 1)

EVIDENCE FILES:
    All evidence is written to .goalie/ directory:
    - unified_evidence.jsonl      All unified events
    - production_events.jsonl     Production cycle events
    - swarm_events.jsonl          Swarm analysis events
    - metrics_log.jsonl          System and pattern metrics
    - system_health.json           System health snapshots

EOF
}

# --- Command Execution Functions ---
execute_prod_cycle() {
    # Build unified CLI command
    local cmd="$UNIFIED_CLI_DIR/unified_af_cli.py"
    
    # Build arguments for unified CLI
    local args=(
        "prod-cycle"
        "--mode" "$MODE"
        "--json"  # Always use JSON for internal communication
    )
    
    # Add optional arguments
    [ -n "$CIRCLE" ] && args+=("--circle" "$CIRCLE")
    [ "$TESTING" != "none" ] && args+=("--testing" "$TESTING")
    [ "$VERBOSE" = true ] && args+=("--verbose")
    [ "$DRY_RUN" = true ] && args+=("--dry-run")
    [ "$LOG_GOALIE" = true ] && args+=("--log-goalie")
    [ "$SAFEGUARDS" = true ] && args+=("--safeguards")
    [ "$ROLLOUT_STRATEGY" != "gradual" ] && args+=("--rollout-strategy" "$ROLLOUT_STRATEGY")
    [ "$VALIDATION" = true ] && args+=("--validation")
    [ "$PATTERN_METRICS" = true ] && args+=("--pattern-metrics")
    [ "$COMPLIANCE_CHECKS" = true ] && args+=("--compliance-checks")
    [ "$TIER_DEPTH_COVERAGE" = false ] && args+=("--no-tier-depth-coverage")
    [ -n "$ITERATIONS" ] && args+=("--iterations" "$ITERATIONS")
    [ "$NO_EARLY_STOP" = true ] && args+=("--no-early-stop")
    
    # Execute unified CLI
    if [ "$DRY_RUN" = true ]; then
        echo "DRY RUN: Would execute: python3 $cmd ${args[*]}"
        return 0
    fi
    
    python3 "$cmd" "${args[@]}"
    local exit_code=$?
    
    # Handle tier depth coverage if enabled
    if [ "$TIER_DEPTH_COVERAGE" = true ] && [ "$exit_code" -eq 0 ]; then
        echo "Running tier depth coverage analysis..."
        local td_args=("--correlation-id" "$AF_RUN_ID")
        [ -n "$CIRCLE" ] && td_args+=("--circle" "$CIRCLE")
        [ "$CIRCLE" = "testing" ] && td_args+=("--tier1-circles" "orchestrator,assessor,testing")
        [ "$JSON_OUTPUT" = true ] && td_args+=("--json")
        
        if [ -f "$PROJECT_ROOT/investing/agentic-flow/scripts/cmd_tier_depth_coverage.py" ]; then
            python3 "$PROJECT_ROOT/investing/agentic-flow/scripts/cmd_tier_depth_coverage.py" "${td_args[@]}"
        else
            echo "Warning: Tier depth coverage script not found, skipping"
        fi
    fi
    
    return $exit_code
}

execute_prod_swarm() {
    # Check for enhanced automation availability
    local automation_script="$SCRIPT_DIR/af/swarm_compare_automation.py"
    local integration_script="$SCRIPT_DIR/af/integrate_swarm_comparison.py"
    
    # Use enhanced automation if available and requested
    if [ -f "$automation_script" ] && [ "$DISCOVER" = true ] || [ "$AUTO_COMPARE" = true ]; then
        echo "Using enhanced swarm comparison automation..."
        
        # Build automation command
        local auto_args=(
            "--project-root" "$PROJECT_ROOT"
            "--mode" "$MODE"
            "--json"
        )
        
        [ "$VERBOSE" = true ] && auto_args+=("--verbose")
        [ "$DISCOVER" = true ] && auto_args+=("--discover")
        [ "$VALIDATE_ONLY" = true ] && auto_args+=("--validate-only")
        [ -n "$PRIOR" ] && auto_args+=("--prior" "$PRIOR")
        [ -n "$CURRENT" ] && auto_args+=("--current" "$CURRENT")
        [ -n "$AUTO_REF" ] && auto_args+=("--auto-ref" "$AUTO_REF")
        [ "$OUT_FORMAT" != "json" ] && auto_args+=("--out" "$OUT_FORMAT")
        [ -n "$SAVE" ] && auto_args+=("--save" "$SAVE")
        [ "$NO_AUTO_DISCOVER" = true ] && auto_args+=("--no-auto-discover")
        
        if [ "$DRY_RUN" = true ]; then
            echo "DRY RUN: Would execute: python3 $automation_script ${auto_args[*]}"
            return 0
        fi
        
        python3 "$automation_script" "${auto_args[@]}"
        local exit_code=$?
        
        # If automation fails, fallback to unified CLI
        if [ $exit_code -ne 0 ] && [ "$FALLBACK_TO_UNIFIED" = true ]; then
            echo "Automation failed, falling back to unified CLI..."
            execute_unified_prod_swarm
            return $?
        fi
        
        return $exit_code
    
    # Use integration helper if available and requested
    elif [ -f "$integration_script" ] && [ "$INTEGRATE_WORKFLOW" = true ]; then
        echo "Using swarm comparison integration helper..."
        
        # Build integration command
        local integ_args=(
            "--project-root" "$PROJECT_ROOT"
            "--mode" "$MODE"
            "--workflow" "prod-swarm"
            "--json"
        )
        
        [ "$VERBOSE" = true ] && integ_args+=("--verbose")
        [ -n "$PRIOR" ] && integ_args+=("--prior" "$PRIOR")
        [ -n "$CURRENT" ] && integ_args+=("--current" "$CURRENT")
        [ -n "$AUTO_REF" ] && integ_args+=("--auto-ref" "$AUTO_REF")
        [ "$AUTO_DISCOVER" = true ] && integ_args+=("--auto-discover")
        [ "$SAVE_TABLE" = true ] && integ_args+=("--save-table")
        [ "$TABLE_LABEL" != "current" ] && integ_args+=("--table-label" "$TABLE_LABEL")
        [ "$AUTO_COMPARE" = true ] && integ_args+=("--auto-compare")
        [ "$OUT_FORMAT" != "json" ] && integ_args+=("--out" "$OUT_FORMAT")
        [ -n "$SAVE" ] && integ_args+=("--save" "$SAVE")
        
        if [ "$DRY_RUN" = true ]; then
            echo "DRY RUN: Would execute: python3 $integration_script ${integ_args[*]}"
            return 0
        fi
        
        python3 "$integration_script" "${integ_args[@]}"
        return $?
    
    # Fallback to unified CLI
    else
        execute_unified_prod_swarm
    fi
}

execute_unified_prod_swarm() {
    # Build unified CLI command
    local cmd="$UNIFIED_CLI_DIR/unified_af_cli.py"
    
    # Build arguments for unified CLI
    local args=(
        "prod-swarm"
        "--json"  # Always use JSON for internal communication
    )
    
    # Add optional arguments
    [ -n "$PRIOR" ] && args+=("--prior" "$PRIOR")
    [ -n "$CURRENT" ] && args+=("--current" "$CURRENT")
    [ -n "$AUTO_REF" ] && args+=("--auto-ref" "$AUTO_REF")
    [ "$OUT_FORMAT" != "json" ] && args+=("--out" "$OUT_FORMAT")
    [ -n "$SAVE" ] && args+=("--save" "$SAVE")
    [ "$VERBOSE" = true ] && args+=("--verbose")
    [ "$LOG_GOALIE" = true ] && args+=("--log-goalie")
    [ "$GENERATE_MOCK" = true ] && args+=("--generate-mock")
    [ "$MOCK_OUTPUT_DIR" != "swarm_data" ] && args+=("--mock-output-dir" "$MOCK_OUTPUT_DIR")
    [ "$DISCOVER" = true ] && args+=("--discover")
    [ "$SAVE_TABLE" = true ] && args+=("--save-table")
    [ "$TABLE_LABEL" != "current" ] && args+=("--table-label" "$TABLE_LABEL")
    [ "$AUTO_COMPARE" = true ] && args+=("--auto-compare")
    [ "$VALIDATE_ONLY" = true ] && args+=("--validate-only")
    
    # Execute unified CLI
    if [ "$DRY_RUN" = true ]; then
        echo "DRY RUN: Would execute: python3 $cmd ${args[*]}"
        return 0
    fi
    
    python3 "$cmd" "${args[@]}"
}

execute_wsjf() {
    # Build unified CLI command
    local cmd="$UNIFIED_CLI_DIR/unified_af_cli.py"

    # Build arguments for unified CLI
    local args=(
        "wsjf"
        "--json"  # Always use JSON for internal communication
    )

    # Add optional arguments
    [ -n "$CIRCLE" ] && args+=("--circle" "$CIRCLE")
    [ "$VERBOSE" = true ] && args+=("--verbose")
    [ "$DRY_RUN" = true ] && args+=("--dry-run")
    [ "$LOG_GOALIE" = true ] && args+=("--log-goalie")

    # WSJF specific arguments
    [ -n "$JOB_ID" ] && args+=("--job-id" "$JOB_ID")
    [ -n "$UBV" ] && args+=("--ubv" "$UBV")
    [ -n "$TC" ] && args+=("--tc" "$TC")
    [ -n "$RR" ] && args+=("--rr" "$RR")
    [ -n "$JOB_SIZE" ] && args+=("--job-size" "$JOB_SIZE")

    # Execute unified CLI
    if [ "$DRY_RUN" = true ]; then
        echo "DRY RUN: Would execute: python3 $cmd ${args[*]}"
        return 0
    fi

    python3 "$cmd" "${args[@]}"
}

execute_budget() {
    # Build unified CLI command
    local cmd="$UNIFIED_CLI_DIR/unified_af_cli.py"

    # Build arguments for unified CLI
    local args=(
        "budget"
        "--json"  # Always use JSON for internal communication
    )

    # Add optional arguments
    [ -n "$CIRCLE" ] && args+=("--circle" "$CIRCLE")
    [ "$VERBOSE" = true ] && args+=("--verbose")
    [ "$DRY_RUN" = true ] && args+=("--dry-run")
    [ "$LOG_GOALIE" = true ] && args+=("--log-goalie")

    # Budget specific arguments
    [ -n "$BUDGET_ID" ] && args+=("--budget-id" "$BUDGET_ID")
    [ -n "$AMOUNT" ] && args+=("--amount" "$AMOUNT")
    [ -n "$JOB_ID" ] && args+=("--job-id" "$JOB_ID")

    # Execute unified CLI
    if [ "$DRY_RUN" = true ]; then
        echo "DRY RUN: Would execute: python3 $cmd ${args[*]}"
        return 0
    fi

    python3 "$cmd" "${args[@]}"
}

execute_priority() {
    # Build unified CLI command
    local cmd="$UNIFIED_CLI_DIR/unified_af_cli.py"

    # Build arguments for unified CLI
    local args=(
        "priority"
        "--json"  # Always use JSON for internal communication
    )

    # Add optional arguments
    [ -n "$CIRCLE" ] && args+=("--circle" "$CIRCLE")
    [ "$VERBOSE" = true ] && args+=("--verbose")
    [ "$DRY_RUN" = true ] && args+=("--dry-run")
    [ "$LOG_GOALIE" = true ] && args+=("--log-goalie")

    # Priority specific arguments
    [ -n "$STRATEGY" ] && args+=("--strategy" "$STRATEGY")

    # Execute unified CLI
    if [ "$DRY_RUN" = true ]; then
        echo "DRY RUN: Would execute: python3 $cmd ${args[*]}"
        return 0
    fi

    python3 "$cmd" "${args[@]}"
}

# --- Main Execution ---
main() {
    # Parse all arguments
    parse_arguments "$@"
    
    # Validate arguments
    validate_arguments
    
    # Set environment variables
    export AF_PROD_CYCLE_MODE="$MODE"
    
    # Execute command
    case $COMMAND in
        prod-cycle)
            execute_prod_cycle
            ;;
        prod-swarm)
            execute_prod_swarm
            ;;
        wsjf)
            execute_wsjf
            ;;
        budget)
            execute_budget
            ;;
        priority)
            execute_priority
            ;;
        *)
            echo "Error: Unknown command '$COMMAND'"
            show_help
            exit 1
            ;;
    esac
}

# --- Run Main ---
main "$@"