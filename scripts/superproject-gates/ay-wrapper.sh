#!/usr/bin/env bash
set -euo pipefail

# ay Command Wrapper - Routes commands properly
# This ensures ay yo calls the correct interactive dashboard

# Resolve symlink to get actual script location
SOURCE="${BASH_SOURCE[0]}"
while [ -h "$SOURCE" ]; do
  DIR="$(cd -P "$(dirname "$SOURCE")" && pwd)"
  SOURCE="$(readlink "$SOURCE")"
  [[ $SOURCE != /* ]] && SOURCE="$DIR/$SOURCE"
done
SCRIPT_DIR="$(cd -P "$(dirname "$SOURCE")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

COMMAND="${1:-}"

case "$COMMAND" in
  yo|yolife)
    shift  # Remove 'yo' from args
    SUBCOMMAND="${1:-}"
    
    if [ -z "$SUBCOMMAND" ]; then
      # No subcommand - run inventory/SSH probe, then launch interactive cockpit
      "$PROJECT_ROOT/dist/cli/yolife-cockpit.js" inventory >/dev/null 2>&1 || true
      echo -e "\n[yolife inventory] OK\n"
      echo "[DEBUG] About to exec: npx tsx $SCRIPT_DIR/ay-yo-interactive-cockpit.ts"
      echo "[DEBUG] SCRIPT_DIR=$SCRIPT_DIR"
      echo "[DEBUG] File exists: $(test -f "$SCRIPT_DIR/ay-yo-interactive-cockpit.ts" && echo 'YES' || echo 'NO')"
      exec npx tsx "$SCRIPT_DIR/ay-yo-interactive-cockpit.ts"
      echo "[DEBUG] This line should never be reached"
    else
      # Has subcommand - route to yolife-cockpit CLI
      exec "$PROJECT_ROOT/dist/cli/yolife-cockpit.js" "$@"
    fi
    ;;
    
  prod)
    # Production execution
    shift
    if [ -f "$SCRIPT_DIR/ay-prod-cycle.sh" ]; then
      exec "$SCRIPT_DIR/ay-prod-cycle.sh" "$@"
    else
      echo "❌ ay-prod-cycle.sh not found"
      exit 1
    fi
    ;;
    
  improve|i)
    # Continuous improvement interface
    shift
    if [ -f "$SCRIPT_DIR/ay-improve-wrapper.sh" ]; then
      exec "$SCRIPT_DIR/ay-improve-wrapper.sh" "$@"
    else
      echo "❌ ay-improve-wrapper.sh not found"
      exit 1
    fi
    ;;
    
  truth|focus|execute)
    # Focused Incremental Relentless Execution
    # Validates truth conditions, authority legitimacy
    # Executes Manthra → Yasna → Mithra triad
    shift
    if [ -f "$SCRIPT_DIR/ay-focused-execution.sh" ]; then
      exec "$SCRIPT_DIR/ay-focused-execution.sh" "$@"
    else
      echo "❌ ay-focused-execution.sh not found"
      exit 1
    fi
    ;;
    
  baseline|review)
    # Baseline/Frequency/Hardcoded Review & Retro
    shift
    if [ -f "$SCRIPT_DIR/ay-baseline-review.sh" ]; then
      exec "$SCRIPT_DIR/ay-baseline-review.sh" "$@"
    else
      echo "❌ ay-baseline-review.sh not found"
      exit 1
    fi
    ;;
    
  govern|governance)
    # Governance Framework with MPP Learning
    shift
    if [ -f "$SCRIPT_DIR/ay-governance-framework.sh" ]; then
      exec "$SCRIPT_DIR/ay-governance-framework.sh" "$@"
    else
      echo "❌ ay-governance-framework.sh not found"
      exit 1
    fi
    ;;
    
  smart|cycle)
    # Smart-Cycle Auto-Improvement
    shift
    if [ -f "$SCRIPT_DIR/ay-smart-cycle.sh" ]; then
      exec "$SCRIPT_DIR/ay-smart-cycle.sh" "$@"
    else
      echo "❌ ay-smart-cycle.sh not found"
      exit 1
    fi
    ;;
    
  *)
    # Default to yolife-cockpit for all other commands
    exec "$PROJECT_ROOT/dist/cli/yolife-cockpit.js" "$@"
    ;;
esac
