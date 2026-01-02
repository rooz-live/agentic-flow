#!/usr/bin/env bash
#
# AF CLI Integration Patch
# Adds: intent-coverage flags, system-health, quick-health, infra-health, preflight
#

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
AF_FILE="$SCRIPT_DIR/af"

echo "🔧 Patching af CLI with new integrations..."

# Backup original
cp "$AF_FILE" "$AF_FILE.backup-$(date +%Y%m%d-%H%M%S)"

# Create enhanced intent-coverage section
cat > /tmp/af_intent_coverage.txt << 'INTENT_COVERAGE_EOF'
    prompt-intent-coverage|intent-coverage|pattern-coverage)
        shift
        JSON_OUTPUT=false
        REQUIRED_PATTERNS=""
        MIN_HIT_PCT=60.0
        OTHER_ARGS=()

        while [[ $# -gt 0 ]]; do
            case $1 in
                --json)
                    JSON_OUTPUT=true
                    OTHER_ARGS+=("--json")
                    shift
                    ;;
                --required-patterns)
                    REQUIRED_PATTERNS="$2"
                    OTHER_ARGS+=("--required-patterns" "$2")
                    shift 2
                    ;;
                --min-hit-pct)
                    MIN_HIT_PCT="$2"
                    OTHER_ARGS+=("--min-hit-pct" "$2")
                    shift 2
                    ;;
                --circle)
                    OTHER_ARGS+=("--circle" "$2")
                    shift 2
                    ;;
                *)
                    OTHER_ARGS+=("$1")
                    shift
                    ;;
            esac
        done

        # Try multiple locations for intent_coverage script
        if [ -f "$SCRIPT_DIR/cmd_prompt_intent_coverage.py" ]; then
            python3 "$SCRIPT_DIR/cmd_prompt_intent_coverage.py" "${OTHER_ARGS[@]}"
        elif [ -f "$SCRIPT_DIR/agentic/intent_coverage.py" ]; then
            python3 "$SCRIPT_DIR/agentic/intent_coverage.py" "${OTHER_ARGS[@]}"
        elif [ -f "$SCRIPT_DIR/cmd_intent_coverage.py" ]; then
            python3 "$SCRIPT_DIR/cmd_intent_coverage.py" "${OTHER_ARGS[@]}"
        else
            echo "Error: Intent coverage script not found" >&2
            echo "Expected one of:" >&2
            echo "  - scripts/cmd_prompt_intent_coverage.py" >&2
            echo "  - scripts/agentic/intent_coverage.py" >&2
            echo "  - scripts/cmd_intent_coverage.py" >&2
            exit 1
        fi
        ;;
INTENT_COVERAGE_EOF

# Create new commands section
cat > /tmp/af_new_commands.txt << 'NEW_COMMANDS_EOF'

    system-health|system-state)
        shift
        JSON_OUTPUT=false
        BASELINE=""
        OTHER_ARGS=()

        while [[ $# -gt 0 ]]; do
            case $1 in
                --json)
                    JSON_OUTPUT=true
                    OTHER_ARGS+=("--json")
                    shift
                    ;;
                --baseline)
                    BASELINE="$2"
                    OTHER_ARGS+=("--baseline" "$2")
                    shift 2
                    ;;
                *)
                    OTHER_ARGS+=("$1")
                    shift
                    ;;
            esac
        done

        # Check for integrated version first, fallback to .goalie
        if [ -f "$SCRIPT_DIR/monitoring/system_health.sh" ]; then
            "$SCRIPT_DIR/monitoring/system_health.sh" "${OTHER_ARGS[@]}"
        elif [ -f "$PROJECT_ROOT/.goalie/measure_system_state.sh" ]; then
            "$PROJECT_ROOT/.goalie/measure_system_state.sh" "${OTHER_ARGS[@]}"
        else
            echo "Error: System health script not found" >&2
            echo "Expected: scripts/monitoring/system_health.sh or .goalie/measure_system_state.sh" >&2
            exit 1
        fi
        ;;

    quick-health)
        shift
        JSON_OUTPUT=false

        while [[ $# -gt 0 ]]; do
            case $1 in
                --json)
                    JSON_OUTPUT=true
                    shift
                    ;;
                *)
                    shift
                    ;;
            esac
        done

        # Quick health aggregates multiple checks
        if [ "$JSON_OUTPUT" = "true" ]; then
            cat << EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "revenue_concentration_pct": $(timeout 5s "$SCRIPT_DIR/af" wsjf-by-circle --json 2>/dev/null | jq -r '.circles.assessor.revenue_pct // 0' || echo 0),
  "evidence_emitter_health": $(timeout 5s "$SCRIPT_DIR/af" evidence list --json 2>/dev/null | jq -r '[.emitters[]?.success_rate // 0.8] | add / length' || echo 0.8),
  "pattern_coverage_pct": $(timeout 5s "$SCRIPT_DIR/af" intent-coverage --json 2>/dev/null | jq -r '.pattern_hit_pct // 0' || echo 0),
  "system_health_checks": "$(timeout 5s "$SCRIPT_DIR/af" system-health --json 2>/dev/null | jq -r '.success_criteria | to_entries | map(select(.value == true)) | length' || echo 0)/4"
}
EOF
        else
            echo "📊 Quick Health Check"
            echo ""
            REV_CONC=$(timeout 5s "$SCRIPT_DIR/af" wsjf-by-circle --json 2>/dev/null | jq -r '.circles.assessor.revenue_pct // "N/A"' || echo "N/A")
            EMIT_HEALTH=$(timeout 5s "$SCRIPT_DIR/af" evidence list --json 2>/dev/null | jq -r '([.emitters[]?.success_rate // 0.8] | add / length * 100) | round' || echo "N/A")
            PAT_COV=$(timeout 5s "$SCRIPT_DIR/af" intent-coverage --json 2>/dev/null | jq -r '.pattern_hit_pct // "N/A"' || echo "N/A")
            SYS_HEALTH=$(timeout 5s "$SCRIPT_DIR/af" system-health --json 2>/dev/null | jq -r '.success_criteria | to_entries | map(select(.value == true)) | length' || echo "N/A")
            
            echo "  Revenue Concentration: ${REV_CONC}%"
            echo "  Evidence Emitter Health: ${EMIT_HEALTH}%"
            echo "  Pattern Coverage: ${PAT_COV}%"
            echo "  System Health: ${SYS_HEALTH}/4 checks passed"
        fi
        ;;

    infra-health|infrastructure-health)
        shift
        
        if [ -f "$PROJECT_ROOT/warp_health_monitor.sh" ]; then
            "$PROJECT_ROOT/warp_health_monitor.sh" "$@"
        else
            echo "Infrastructure health monitoring not available" >&2
            echo "Install: warp_health_monitor.sh in project root" >&2
            exit 1
        fi
        ;;

    preflight|preflight-check)
        shift
        MODE="${1:-strict}"
        
        if [ -f "$SCRIPT_DIR/preflight_health_check.sh" ]; then
            "$SCRIPT_DIR/preflight_health_check.sh" "$MODE"
        else
            echo "Error: Pre-flight health check not found" >&2
            echo "Expected: scripts/preflight_health_check.sh" >&2
            exit 1
        fi
        ;;

    goalie-gaps)
        shift
        FILTER=""
        JSON_OUTPUT=false
        OTHER_ARGS=()

        while [[ $# -gt 0 ]]; do
            case $1 in
                --json)
                    JSON_OUTPUT=true
                    OTHER_ARGS+=("--json")
                    shift
                    ;;
                --filter)
                    FILTER="$2"
                    OTHER_ARGS+=("--filter" "$2")
                    shift 2
                    ;;
                *)
                    OTHER_ARGS+=("$1")
                    shift
                    ;;
            esac
        done

        if [ -f "$SCRIPT_DIR/cmd_goalie_gaps.py" ]; then
            python3 "$SCRIPT_DIR/cmd_goalie_gaps.py" "${OTHER_ARGS[@]}"
        else
            echo "Error: Goalie gaps script not found" >&2
            exit 1
        fi
        ;;
NEW_COMMANDS_EOF

echo "✅ Patch files created"
echo ""
echo "📋 To apply manually:"
echo "1. Edit scripts/af"
echo "2. Replace the existing 'prompt-intent-coverage|intent-coverage' section (lines ~437-445)"
echo "   with the content from /tmp/af_intent_coverage.txt"
echo "3. Add the new commands from /tmp/af_new_commands.txt before the final '*')"
echo "   case (around line 585)"
echo "4. Update the help text to include:"
echo "   - intent-coverage --required-patterns, --min-hit-pct"
echo "   - system-health, quick-health, infra-health, preflight, goalie-gaps"
echo ""
echo "Or run: cat /tmp/af_intent_coverage.txt /tmp/af_new_commands.txt"

echo ""
echo "🧪 TEST COMMANDS:"
echo ""
echo "# Intent coverage with patterns"
echo "./scripts/af intent-coverage --required-patterns safe_degrade,observability_first --json"
echo ""
echo "# System health"
echo "./scripts/af system-health --json"
echo ""
echo "# Quick health dashboard"
echo "./scripts/af quick-health --json"
echo ""
echo "# Pre-flight check"
echo "./scripts/af preflight strict"
echo ""
echo "# Goalie gaps with filter"
echo "./scripts/af goalie-gaps --filter autocommit-readiness --json"
