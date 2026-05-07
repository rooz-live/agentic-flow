#!/bin/bash
# =============================================================================
# Dynamic Token Calculator - ADR-005 Implementation
# Calculates token limits based on available system memory (OpenWorm Taxonomy)
# =============================================================================
# ADR: 005 - Swarm Persistence Architecture
# Method: Physical host memory telemetry
# Pattern: Episodic Active Connectome (Short-Term Trace)
# Protocol: stdout JSON
#
# Removes static 2MM token ceiling, derives from vm_stat (macOS) or free (Linux)
# =============================================================================

set -euo pipefail

# Calculate safe token ceiling based on available memory
# Rule: 1 token ≈ 4 bytes (conservative estimate)
# Safety margin: 50% of available memory reserved for OS/processes
calculate_token_ceiling() {
    local available_bytes=0
    local os_type=$(uname -s)
    
    case "$os_type" in
        Darwin)
            # macOS: Use vm_stat to get free memory
            local vm_stats=$(vm_stat)
            local page_size=$(vm_stats | grep "page size" | awk '{print $8}' || echo "4096")
            local free_pages=$(vm_stats | grep "Pages free" | awk '{print $3}' | tr -d '.')
            local inactive_pages=$(vm_stats | grep "Pages inactive" | awk '{print $3}' | tr -d '.')
            
            # Handle empty values
            page_size=${page_size:-4096}
            free_pages=${free_pages:-0}
            inactive_pages=${inactive_pages:-0}
            
            available_bytes=$(( (free_pages + inactive_pages) * page_size ))
            ;;
        Linux)
            # Linux: Use free command
            available_bytes=$(free -b | awk '/^Mem:/ {print $7}')
            ;;
        *)
            # Fallback: conservative 1GB estimate
            available_bytes=$((1024 * 1024 * 1024))
            ;;
    esac
    
    # Apply safety margin (50% of available memory)
    local usable_bytes=$(( available_bytes / 2 ))
    
    # Convert to tokens (4 bytes per token, conservative)
    local token_ceiling=$(( usable_bytes / 4 ))
    
    # Hard floor at 100K tokens (minimum viable)
    if [[ $token_ceiling -lt 100000 ]]; then
        token_ceiling=100000
    fi
    
    echo "$token_ceiling"
}

# Get memory statistics for telemetry
get_memory_telemetry() {
    local os_type=$(uname -s)
    local total_mem=0
    local used_mem=0
    local free_mem=0
    
    case "$os_type" in
        Darwin)
            local vm_stats=$(vm_stat)
            local page_size=$(vm_stats | grep "page size" | awk '{print $8}' || echo "4096")
            page_size=${page_size:-4096}
            
            local total_pages=$(sysctl -n hw.memsize 2>/dev/null | awk '{print int($1/page_size)}' || echo "0")
            local free_pages=$(vm_stats | grep "Pages free" | awk '{print $3}' | tr -d '.' || echo "0")
            local inactive_pages=$(vm_stats | grep "Pages inactive" | awk '{print $3}' | tr -d '.' || echo "0")
            
            total_mem=$(( total_pages * page_size ))
            free_mem=$(( (free_pages + inactive_pages) * page_size ))
            used_mem=$(( total_mem - free_mem ))
            ;;
        Linux)
            local mem_info=$(free -b | grep "^Mem:")
            total_mem=$(echo "$mem_info" | awk '{print $2}')
            used_mem=$(echo "$mem_info" | awk '{print $3}')
            free_mem=$(echo "$mem_info" | awk '{print $7}')
            ;;
    esac
    
    echo "{\"total_bytes\":$total_mem,\"used_bytes\":$used_mem,\"free_bytes\":$free_mem}"
}

# Main output
main() {
    local token_ceiling=$(calculate_token_ceiling)
    local memory_telemetry=$(get_memory_telemetry)
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    
    # Output JSON for downstream consumption
    cat << EOF
{
  "adr": "005",
  "timestamp": "$timestamp",
  "token_ceiling": $token_ceiling,
  "memory": $memory_telemetry,
  "safety_margin_percent": 50,
  "bytes_per_token": 4,
  "episodic_connectome": {
    "type": "short_term_trace",
    "calculated_from": "physical_host_memory",
    "adaptive": true
  }
}
EOF
}

# Execute if run directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main
fi
