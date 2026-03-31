#!/bin/bash
# metrics-collector.sh - Collect and track ROBUST implementation metrics
# Measures build percentage improvements over time

set -euo pipefail

METRICS_DIR="/tmp/robust-metrics"
METRICS_FILE="$METRICS_DIR/build-metrics.json"
TRENDS_FILE="$METRICS_DIR/trends.json"

# Create metrics directory
mkdir -p "$METRICS_DIR"

# Current timestamp
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Collect current metrics
collect_metrics() {
    local script_name="${1:-cascade-tunnel}"
    local exit_code="${2:-0}"
    
    # Initialize metrics if not exist
    if [[ ! -f "$METRICS_FILE" ]]; then
        echo '{"runs": [], "summary": {}}' > "$METRICS_FILE"
    fi
    
    # Calculate build quality percentage
    local quality_pct=0
    
    # Check for ROBUST implementations
    local has_prereqs=0
    local has_bounded=0
    local has_eta=0
    local has_tdd=0
    local has_cleanup=0
    
    # Analyze cascade-tunnel.sh
    if [[ -f "/Users/shahroozbhopti/Documents/code/investing/agentic-flow/scripts/orchestrators/cascade-tunnel.sh" ]]; then
        if grep -q "check_prerequisites" "/Users/shahroozbhopti/Documents/code/investing/agentic-flow/scripts/orchestrators/cascade-tunnel.sh"; then
            has_prereqs=20
        fi
        if grep -q "create_contract" "/Users/shahroozbhopti/Documents/code/investing/agentic-flow/scripts/orchestrators/cascade-tunnel.sh"; then
            has_bounded=20
        fi
        if grep -q "emit_progress_update\|update_progress" "/Users/shahroozbhopti/Documents/code/investing/agentic-flow/scripts/orchestrators/cascade-tunnel.sh"; then
            has_eta=20
        fi
        if grep -q "log_tdd" "/Users/shahroozbhopti/Documents/code/investing/agentic-flow/scripts/orchestrators/cascade-tunnel.sh"; then
            has_tdd=20
        fi
        if grep -q "wait.*PID" "/Users/shahroozbhopti/Documents/code/investing/agentic-flow/scripts/orchestrators/cascade-tunnel.sh"; then
            has_cleanup=20
        fi
    fi
    
    # Base quality from exit code
    local base_quality=0
    if [[ $exit_code -eq 0 ]]; then
        base_quality=20
    elif [[ $exit_code -gt 0 && $exit_code -lt 10 ]]; then
        base_quality=15
    elif [[ $exit_code -ge 10 && $exit_code -lt 50 ]]; then
        base_quality=10
    fi
    
    # Calculate total quality
    quality_pct=$((base_quality + has_prereqs + has_bounded + has_eta + has_tdd + has_cleanup))
    
    # Create metric entry
    local metric=$(cat << EOF
{
  "timestamp": "$TIMESTAMP",
  "script": "$script_name",
  "exit_code": $exit_code,
  "quality_pct": $quality_pct,
  "components": {
    "prerequisites": $has_prereqs,
    "bounded_reasoning": $has_bounded,
    "eta_tracking": $has_eta,
    "tdd_logging": $has_tdd,
    "process_cleanup": $has_cleanup,
    "base_success": $base_quality
  }
}
EOF
)
    
    # Update metrics file
    local temp_file=$(mktemp)
    jq --argjson new_metric "$metric" '.runs += [$new_metric]' "$METRICS_FILE" > "$temp_file"
    mv "$temp_file" "$METRICS_FILE"
    
    # Update summary
    update_summary
    
    echo "$quality_pct"
}

# Update summary statistics
update_summary() {
    local temp_file=$(mktemp)
    
    # Calculate averages and trends
    jq '
        .summary = {
            total_runs: (.runs | length),
            avg_quality: (.runs | map(.quality_pct) | add / length),
            last_run: (.runs[-1].timestamp),
            last_quality: (.runs[-1].quality_pct),
            trend: (
                if (.runs | length) >= 2 then
                    (.runs[-1].quality_pct - .runs[-2].quality_pct)
                else
                    0
                end
            )
        }
    ' "$METRICS_FILE" > "$temp_file"
    
    mv "$temp_file" "$METRICS_FILE"
}

# Show current metrics
show_metrics() {
    if [[ ! -f "$METRICS_FILE" ]]; then
        echo "No metrics collected yet"
        return 1
    fi
    
    echo ""
    echo "═══════════════════════════════════════════════════════════════"
    echo "  ROBUST IMPLEMENTATION METRICS"
    echo "═══════════════════════════════════════════════════════════════"
    echo ""
    
    # Show summary
    jq -r '
        "Total Runs: \(.summary.total_runs)",
        "Average Quality: \(.summary.avg_quality | floor)%",
        "Last Run: \(.summary.last_run)",
        "Last Quality: \(.summary.last_quality)%",
        "Trend: \(
            if .summary.trend > 0 then
                "↑ Improving (+\(.summary.trend)%)"
            elif .summary.trend < 0 then
                "↓ Declining (\(.summary.trend)%)"
            else
                "→ Stable"
            end
        )"
    ' "$METRICS_FILE"
    
    echo ""
    echo "Recent Runs:"
    echo "─────────────────────────────────────────────────────────────────"
    
    # Show last 5 runs
    jq -r '
        .runs[-5:] | reverse | .[] |
        "\(.timestamp | strftime("%Y-%m-%d %H:%M")) | \(.script) | Exit: \(.exit_code) | Quality: \(.quality_pct)%"
    ' "$METRICS_FILE"
    
    echo ""
    
    # Component breakdown from adoption tracker
    if [[ -f "/tmp/component-adoption.json" ]]; then
        echo "Component Implementation Status:"
        echo "─────────────────────────────────────────────────────────────────"
        
        jq -r '
            .components | to_entries[] |
            "\(.value.name): \(if .value.implemented then "✅" else "❌" end)"
        ' "/tmp/component-adoption.json"
        
        local adoption=$("$SCRIPT_DIR/component-adoption-tracker.sh" | grep "Overall Adoption" | grep -o '[0-9.]*')
        echo ""
        echo "Component Adoption: ${adoption}%"
    else
        echo "Component Implementation Status:"
        echo "─────────────────────────────────────────────────────────────────"
        
        if [[ -f "/Users/shahroozbhopti/Documents/code/investing/agentic-flow/scripts/orchestrators/cascade-tunnel.sh" ]]; then
            echo "cascade-tunnel.sh:"
            grep -q "check_prerequisites" "/Users/shahroozbhopti/Documents/code/investing/agentic-flow/scripts/orchestrators/cascade-tunnel.sh" && echo "  ✅ Pre-flight checks" || echo "  ❌ Pre-flight checks"
            grep -q "create_contract" "/Users/shahroozbhopti/Documents/code/investing/agentic-flow/scripts/orchestrators/cascade-tunnel.sh" && echo "  ✅ Bounded reasoning" || echo "  ❌ Bounded reasoning"
            grep -q "update_progress" "/Users/shahroozbhopti/Documents/code/investing/agentic-flow/scripts/orchestrators/cascade-tunnel.sh" && echo "  ✅ ETA tracking" || echo "  ❌ ETA tracking"
            grep -q "log_tdd" "/Users/shahroozbhopti/Documents/code/investing/agentic-flow/scripts/orchestrators/cascade-tunnel.sh" && echo "  ✅ TDD logging" || echo "  ❌ TDD logging"
            grep -q "wait.*PID" "/Users/shahroozbhopti/Documents/code/investing/agentic-flow/scripts/orchestrators/cascade-tunnel.sh" && echo "  ✅ Process cleanup" || echo "  ❌ Process cleanup"
        fi
    fi
    
    echo ""
}

# Generate trend report
generate_trend_report() {
    if [[ ! -f "$METRICS_FILE" ]] || [[ $(jq '.runs | length' "$METRICS_FILE") -lt 2 ]]; then
        echo "Insufficient data for trend analysis"
        return 1
    fi
    
    echo ""
    echo "═══════════════════════════════════════════════════════════════"
    echo "  TREND ANALYSIS (Continuous Improvement)"
    echo "═══════════════════════════════════════════════════════════════"
    echo ""
    
    # Calculate improvement rate
    local improvement_rate=$(jq '
        .runs as $runs |
        if ($runs | length) >= 10 then
            ($runs[-1].quality_pct - $runs[-10].quality_pct) / 10
        elif ($runs | length) >= 2 then
            ($runs[-1].quality_pct - $runs[0].quality_pct) / ($runs | length)
        else
            0
        end
    ' "$METRICS_FILE")
    
    printf "Improvement Rate: %.2f%% per run\n" "$improvement_rate"
    
    # Project future quality
    local current_quality=$(jq '.summary.last_quality' "$METRICS_FILE")
    local target_quality=95
    local runs_needed=0
    
    if (( $(echo "$improvement_rate > 0" | bc -l) )); then
        runs_needed=$(echo "($target_quality - $current_quality) / $improvement_rate" | bc -l)
        printf "Projected $target_quality%% quality in %.0f runs\n" "$runs_needed"
    else
        echo "⚠️ No positive improvement trend detected"
    fi
    
    echo ""
    
    # Best and worst runs
    echo "Performance Extremes:"
    echo "─────────────────────────────────────────────────────────────────"
    
    jq -r '
        "Best: \(.runs | sort_by(.quality_pct) | reverse[0] | "\(.quality_pct)% on \(.timestamp | strftime("%Y-%m-%d %H:%M"))")",
        "Worst: \(.runs | sort_by(.quality_pct)[0] | "\(.quality_pct)% on \(.timestamp | strftime("%Y-%m-%d %H:%M"))")"
    ' "$METRICS_FILE"
    
    echo ""
}

# Main execution
case "${1:-collect}" in
    "collect")
        collect_metrics "$2" "${3:-0}"
        ;;
    "show")
        show_metrics
        ;;
    "trend")
        generate_trend_report
        ;;
    "reset")
        rm -f "$METRICS_FILE" "$TRENDS_FILE"
        echo "Metrics reset"
        ;;
    *)
        echo "Usage: $0 {collect|show|trend|reset} [script] [exit_code]"
        exit 1
        ;;
esac
