#!/usr/bin/env bash
# scripts/ay-dynamic-sleep.sh
# Dynamic sleep delays based on system load and memory pressure

set -euo pipefail

# ═══════════════════════════════════════════════════════════════════════════
# System Load Detection
# ═══════════════════════════════════════════════════════════════════════════

get_system_load() {
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sysctl -n vm.loadavg | awk '{print $2}'
    else
        uptime | awk -F'load average:' '{print $2}' | awk -F',' '{print $1}' | xargs
    fi
}

get_cpu_count() {
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sysctl -n hw.ncpu
    else
        nproc
    fi
}

get_memory_pressure() {
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # Parse memory_pressure output (0-100%)
        memory_pressure 2>/dev/null | grep "System-wide memory free percentage" | awk '{print 100 - $5}' | sed 's/%//' || echo "50"
    else
        # Linux: calculate from /proc/meminfo
        awk '/MemTotal/{total=$2} /MemAvailable/{avail=$2} END {print int((1 - avail/total) * 100)}' /proc/meminfo
    fi
}

# ═══════════════════════════════════════════════════════════════════════════
# Calculate Dynamic Sleep Duration
# ═══════════════════════════════════════════════════════════════════════════

calculate_sleep_duration() {
    local base_duration="${1:-3}"  # Base sleep in seconds
    local context="${2:-auto}"
    
    if [[ "$context" != "auto" ]]; then
        # Manual context override
        case "$context" in
            high_load) echo "$base_duration * 3" | bc ;;
            low_load) echo "$base_duration * 0.5" | bc ;;
            *) echo "$base_duration" ;;
        esac
        return
    fi
    
    # Auto-detect from system metrics
    local load=$(get_system_load)
    local cpus=$(get_cpu_count)
    local memory_pressure=$(get_memory_pressure)
    
    # Calculate load per CPU
    local load_per_cpu=$(echo "scale=2; $load / $cpus" | bc)
    
    # Determine sleep multiplier based on load and memory
    local multiplier="1.0"
    
    # High load: increase sleep to reduce contention
    if (( $(echo "$load_per_cpu > 0.8" | bc -l) )); then
        multiplier=$(echo "scale=2; $multiplier * 2.0" | bc)
    elif (( $(echo "$load_per_cpu > 0.6" | bc -l) )); then
        multiplier=$(echo "scale=2; $multiplier * 1.5" | bc)
    fi
    
    # High memory pressure: increase sleep
    if (( memory_pressure > 80 )); then
        multiplier=$(echo "scale=2; $multiplier * 1.5" | bc)
    elif (( memory_pressure > 60 )); then
        multiplier=$(echo "scale=2; $multiplier * 1.2" | bc)
    fi
    
    # Low load and memory: decrease sleep for faster iteration
    if (( $(echo "$load_per_cpu < 0.3" | bc -l) )) && (( memory_pressure < 40 )); then
        multiplier=$(echo "scale=2; $multiplier * 0.5" | bc)
    fi
    
    # Calculate final duration
    local duration=$(echo "scale=1; $base_duration * $multiplier" | bc)
    
    # Clamp to reasonable bounds [0.5, 30]
    if (( $(echo "$duration > 30" | bc -l) )); then
        duration="30"
    elif (( $(echo "$duration < 0.5" | bc -l) )); then
        duration="0.5"
    fi
    
    echo "$duration"
}

# ═══════════════════════════════════════════════════════════════════════════
# Dynamic Sleep with Monitoring
# ═══════════════════════════════════════════════════════════════════════════

dynamic_sleep() {
    local base_duration="${1:-3}"
    local context="${2:-auto}"
    
    local duration=$(calculate_sleep_duration "$base_duration" "$context")
    
    # Output diagnostic info if verbose
    if [[ "${VERBOSE:-0}" == "1" ]]; then
        local load=$(get_system_load)
        local mem=$(get_memory_pressure)
        echo "⏱️ Dynamic sleep: ${duration}s (load=$load, memory=$mem%)" >&2
    fi
    
    sleep "$duration"
}

# ═══════════════════════════════════════════════════════════════════════════
# CLI Interface
# ═══════════════════════════════════════════════════════════════════════════

main() {
    local command="${1:-sleep}"
    shift || true
    
    case "$command" in
        calculate)
            calculate_sleep_duration "$@"
            ;;
        sleep)
            dynamic_sleep "$@"
            ;;
        status)
            echo "System Load: $(get_system_load)"
            echo "CPU Count: $(get_cpu_count)"
            echo "Memory Pressure: $(get_memory_pressure)%"
            echo "Recommended Sleep: $(calculate_sleep_duration 3 auto)s"
            ;;
        *)
            cat <<EOF
Usage: $0 <command> [options]

Commands:
  calculate [base_duration] [context]   Calculate dynamic sleep duration
  sleep [base_duration] [context]       Execute dynamic sleep
  status                                Show system status

Contexts:
  auto       - Auto-detect from system metrics (default)
  high_load  - Triple base duration
  low_load   - Half base duration

Examples:
  $0 calculate 3 auto
  $0 sleep 5 auto
  $0 status
EOF
            ;;
    esac
}

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
