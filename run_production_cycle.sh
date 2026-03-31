#!/usr/bin/env bash
set -e

# ===================================================================
# Agentic Flow Production Cycle Runner
# Optional wiring and configurable ranges based on maturity
# ===================================================================

# Default configuration (maturity-adaptive)
ITERATIONS=${AF_PROD_ITERATIONS:-"auto"}  # auto, 1-50
MODE=${AF_PROD_MODE:-"auto"}              # auto, advisory, mutate, enforcement
SKIP_CORE=${AF_SKIP_CORE:-false}          # Skip core prod commands
SKIP_VERIFY=${AF_SKIP_VERIFY:-false}      # Skip verification scripts
SKIP_MONITOR=${AF_SKIP_MONITOR:-false}    # Skip monitoring scripts
SKIP_LEARNING=${AF_SKIP_LEARNING:-false}  # Skip learning collector
VERBOSE=${AF_VERBOSE:-false}              # Verbose output
JSON_OUTPUT=${AF_JSON:-false}             # JSON output format

# Bounds checking for iterations
MAX_ITERATIONS=${AF_MAX_ITERATIONS:-50}   # Maximum allowed iterations
MIN_ITERATIONS=${AF_MIN_ITERATIONS:-1}    # Minimum allowed iterations

# Parse command-line flags
while [[ $# -gt 0 ]]; do
  case $1 in
    --iterations) ITERATIONS="$2"; shift 2 ;;
    --mode) MODE="$2"; shift 2 ;;
    --skip-core) SKIP_CORE=true; shift ;;
    --skip-verify) SKIP_VERIFY=true; shift ;;
    --skip-monitor) SKIP_MONITOR=true; shift ;;
    --skip-learning) SKIP_LEARNING=true; shift ;;
    --verbose|-v) VERBOSE=true; shift ;;
    --json) JSON_OUTPUT=true; shift ;;
    --help|-h)
      cat <<EOF
Usage: $0 [OPTIONS]

Run Agentic Flow production cycle with optional components.

OPTIONS:
  --iterations N        Prod-cycle iterations (auto, 1-50) [default: auto]
  --mode M              Execution mode (auto, advisory, mutate, enforcement) [default: auto]
  --skip-core           Skip core prod commands (prod, pattern-coverage, goalie-gaps)
  --skip-verify         Skip verification scripts
  --skip-monitor        Skip monitoring scripts
  --skip-learning       Skip learning evidence collector
  --verbose, -v         Verbose output
  --json                JSON output format
  --help, -h            Show this help

ENVIRONMENT VARIABLES:
  AF_PROD_ITERATIONS    Override default iterations
  AF_PROD_MODE          Override default mode
  AF_SKIP_CORE          Skip core commands (true/false)
  AF_SKIP_VERIFY        Skip verification (true/false)
  AF_SKIP_MONITOR       Skip monitoring (true/false)
  AF_SKIP_LEARNING      Skip learning collector (true/false)
  AF_VERBOSE            Verbose output (true/false)
  AF_JSON               JSON output (true/false)

EXAMPLES:
  # Minimal run (core only)
  $0 --skip-verify --skip-monitor

  # Quick assessment (1 iteration, advisory mode)
  $0 --iterations 1 --mode advisory

  # Full production cycle with auto-tuning
  $0

  # Maturity-building run (10 iterations, mutate mode)
  $0 --iterations 10 --mode mutate

  # Custom via env vars
  AF_PROD_ITERATIONS=5 AF_SKIP_MONITOR=true $0
EOF
      exit 0
      ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

echo "🚀 Running Agentic Flow Production Cycle"
echo "========================================"
[[ "$VERBOSE" == "true" ]] && echo "🔧 Configuration: AF_ENV=${AF_ENV:-local}, MAX_ITER=$MAX_ITERATIONS, MIN_ITER=$MIN_ITERATIONS"
[[ "$VERBOSE" == "true" ]] && echo "Config: iterations=$ITERATIONS mode=$MODE skip_core=$SKIP_CORE skip_verify=$SKIP_VERIFY skip_monitor=$SKIP_MONITOR skip_learning=$SKIP_LEARNING"
echo ""

# ===================================================================
# CORE PRODUCTION COMMANDS
# ===================================================================
if [[ "$SKIP_CORE" != "true" ]]; then
  echo "📋 Running Core Production Commands..."
  
  # af prod (adaptive orchestrator)
  if [[ "$JSON_OUTPUT" == "true" ]]; then
    ./scripts/af prod --json 2>/dev/null || echo '{"status":"error","component":"af_prod"}'
  else
    ./scripts/af prod
  fi
  
  # Pattern coverage analysis
  ./scripts/af pattern-coverage --required-patterns
  
  # Goalie gaps (autocommit readiness)
  ./scripts/af goalie-gaps --filter autocommit-readiness
  
  echo ""
fi

# ===================================================================
# PROD-CYCLE ITERATIONS
# ===================================================================
echo "🔄 Running Production Cycle Iterations..."

# Auto-tune iterations and mode if needed
if [[ "$ITERATIONS" == "auto" ]] || [[ "$MODE" == "auto" ]]; then
  # Check if learning evidence exists
  if [[ -f ".goalie/prod_learning_evidence.jsonl" ]]; then
    # Extract maturity score from latest evidence
    MATURITY=$(tail -1 .goalie/prod_learning_evidence.jsonl | python3 -c "import sys, json; print(json.load(sys.stdin).get('maturity_score', 40))" 2>/dev/null || echo "40")
    
    # Auto-tune iterations based on maturity
    if [[ "$ITERATIONS" == "auto" ]]; then
      if (( $(echo "$MATURITY < 40" | bc -l 2>/dev/null || echo 1) )); then
        ITERATIONS=1
      elif (( $(echo "$MATURITY < 70" | bc -l 2>/dev/null || echo 0) )); then
        ITERATIONS=5
      elif (( $(echo "$MATURITY < 85" | bc -l 2>/dev/null || echo 0) )); then
        ITERATIONS=10
      else
        ITERATIONS=25
      fi
    fi
    
    # Auto-tune mode based on maturity
    if [[ "$MODE" == "auto" ]]; then
      if (( $(echo "$MATURITY < 70" | bc -l 2>/dev/null || echo 1) )); then
        MODE="advisory"
      elif (( $(echo "$MATURITY < 85" | bc -l 2>/dev/null || echo 0) )); then
        MODE="mutate"
      else
        MODE="enforcement"
      fi
    fi
    
    [[ "$VERBOSE" == "true" ]] && echo "Auto-tuned: maturity=$MATURITY iterations=$ITERATIONS mode=$MODE"
  else
    # No learning evidence yet - use safe defaults
    [[ "$ITERATIONS" == "auto" ]] && ITERATIONS=1
    [[ "$MODE" == "auto" ]] && MODE="advisory"
    [[ "$VERBOSE" == "true" ]] && echo "No learning evidence - using safe defaults: iterations=$ITERATIONS mode=$MODE"
  fi
fi

# Apply bounds checking (after auto-tuning)
if [[ "$ITERATIONS" =~ ^[0-9]+$ ]]; then
  if (( ITERATIONS > MAX_ITERATIONS )); then
    [[ "$VERBOSE" == "true" ]] && echo "⚠️  Capping iterations: $ITERATIONS → $MAX_ITERATIONS (AF_MAX_ITERATIONS)"
    ITERATIONS=$MAX_ITERATIONS
  elif (( ITERATIONS < MIN_ITERATIONS )); then
    [[ "$VERBOSE" == "true" ]] && echo "⚠️  Raising iterations: $ITERATIONS → $MIN_ITERATIONS (AF_MIN_ITERATIONS)"
    ITERATIONS=$MIN_ITERATIONS
  fi
fi

# Run prod-cycle with tuned parameters
AF_ENV=${AF_ENV:-local} ./scripts/af prod-cycle --iterations "$ITERATIONS" --mode "$MODE"
echo ""

# ===================================================================
# CONTINUOUS IMPROVEMENT ORCHESTRATOR
# ===================================================================
echo "📊 Running Continuous Improvement Orchestrator..."
./scripts/orchestrate_continuous_improvement.py
echo ""

# ===================================================================
# VERIFICATION SCRIPTS (optional)
# ===================================================================
if [[ "$SKIP_VERIFY" != "true" ]]; then
  echo "🔍 Running System Verification Scripts..."
  ./scripts/verify_logger_enhanced.py
  ./scripts/verify_system_improvements.py
  ./scripts/validate_learning_parity.py
  echo ""
fi

# ===================================================================
# MONITORING SCRIPTS (optional)
# ===================================================================
if [[ "$SKIP_MONITOR" != "true" ]]; then
  echo "📈 Running Monitoring Scripts..."
  ./scripts/temporal/budget_tracker.py
  ./scripts/agentdb/audit_agentdb.py
  ./scripts/analysis/check_pattern_tag_coverage.py
  ./scripts/execution/wip_monitor.py
  ./scripts/monitoring/site_health_monitor.py
  ./scripts/monitoring/heartbeat_monitor.py
  echo ""
fi

# ===================================================================
# LEARNING EVIDENCE COLLECTOR
# ===================================================================
if [[ "$SKIP_LEARNING" != "true" ]]; then
  echo "🧠 Collecting Learning Evidence..."
  ./scripts/agentic/prod_learning_collector.py
  echo ""
fi

# ===================================================================
# COMPLETION
# ===================================================================
if [[ "$JSON_OUTPUT" == "true" ]]; then
  cat <<EOF
{"status":"complete","iterations":$ITERATIONS,"mode":"$MODE","environment":{"af_env":"${AF_ENV:-local}","max_iterations":$MAX_ITERATIONS,"min_iterations":$MIN_ITERATIONS},"components":{"core":$([ "$SKIP_CORE" == "true" ] && echo "false" || echo "true"),"verify":$([ "$SKIP_VERIFY" == "true" ] && echo "false" || echo "true"),"monitor":$([ "$SKIP_MONITOR" == "true" ] && echo "false" || echo "true"),"learning":$([ "$SKIP_LEARNING" == "true" ] && echo "false" || echo "true")}}
EOF
else
  echo "✅ Production cycle complete!"
  echo "   Iterations: $ITERATIONS | Mode: $MODE | Environment: ${AF_ENV:-local}"
fi
