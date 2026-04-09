#!/bin/bash
#
# Circuit Breaker Traffic Generator
#
# Generates synthetic traffic data for circuit breaker threshold learning.
# Simulates normal, spike, and degraded service patterns.
#
# Usage:
#   ./scripts/generate-circuit-breaker-traffic.sh [days] [output_file]
#
# Examples:
#   ./scripts/generate-circuit-breaker-traffic.sh 7              # Generate 7 days of traffic
#   ./scripts/generate-circuit-breaker-traffic.sh 14 custom.jsonl  # Custom output file

set -euo pipefail

# Default values
DAYS=${1:-7}
OUTPUT_FILE=${2:-evidence/pattern_metrics.jsonl}

# Services to generate traffic for
SERVICES=("network" "tcp_connection" "websocket" "mcp_operations" "database" "api_gateway")

# Pattern types
PATTERN_TYPES=("normal" "spike" "degraded" "timeout" "network")

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

# Generate a random timestamp
generate_timestamp() {
    local base_date=$1
    local offset_minutes=$2
    local timestamp=$(date -u -d "$base_date +$offset_minutes minutes" +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null || \
                  date -u -j -v +${offset_minutes}M +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null || \
                  date -u +"%Y-%m-%dT%H:%M:%SZ")
    echo "$timestamp"
}

# Generate normal traffic (baseline)
generate_normal_traffic() {
    local service=$1
    local timestamp=$2
    local failure_count=$((RANDOM % 3))  # 0-2 failures
    local total_requests=100
    local failure_rate=$(awk "BEGIN {printf \"%.2f\", $failure_count / $total_requests}")
    local recovery_time_ms=$((10000 + RANDOM % 20000))  # 10-30s

    echo "{\"timestamp\":\"$timestamp\",\"service\":\"$service\",\"failure_count\":$failure_count,\"total_requests\":$total_requests,\"failure_rate\":$failure_rate,\"recovery_time_ms\":$recovery_time_ms,\"pattern_type\":\"normal\",\"was_false_positive\":false}"
}

# Generate spike traffic (load spikes)
generate_spike_traffic() {
    local service=$1
    local timestamp=$2
    local failure_count=$((5 + RANDOM % 8))  # 5-12 failures
    local total_requests=100
    local failure_rate=$(awk "BEGIN {printf \"%.2f\", $failure_count / $total_requests}")
    local recovery_time_ms=$((30000 + RANDOM % 40000))  # 30-70s

    echo "{\"timestamp\":\"$timestamp\",\"service\":\"$service\",\"failure_count\":$failure_count,\"total_requests\":$total_requests,\"failure_rate\":$failure_rate,\"recovery_time_ms\":$recovery_time_ms,\"pattern_type\":\"spike\",\"was_false_positive\":false}"
}

# Generate degraded traffic (circuit breaker triggers)
generate_degraded_traffic() {
    local service=$1
    local timestamp=$2
    local failure_count=$((15 + RANDOM % 20))  # 15-35 failures
    local total_requests=100
    local failure_rate=$(awk "BEGIN {printf \"%.2f\", $failure_count / $total_requests}")
    local recovery_time_ms=$((60000 + RANDOM % 120000))  # 60-180s

    echo "{\"timestamp\":\"$timestamp\",\"service\":\"$service\",\"failure_count\":$failure_count,\"total_requests\":$total_requests,\"failure_rate\":$failure_rate,\"recovery_time_ms\":$recovery_time_ms,\"pattern_type\":\"degraded\",\"was_false_positive\":false}"
}

# Generate timeout traffic
generate_timeout_traffic() {
    local service=$1
    local timestamp=$2
    local failure_count=$((8 + RANDOM % 12))  # 8-20 failures
    local total_requests=100
    local failure_rate=$(awk "BEGIN {printf \"%.2f\", $failure_count / $total_requests}")
    local recovery_time_ms=$((45000 + RANDOM % 75000))  # 45-120s

    echo "{\"timestamp\":\"$timestamp\",\"service\":\"$service\",\"failure_count\":$failure_count,\"total_requests\":$total_requests,\"failure_rate\":$failure_rate,\"recovery_time_ms\":$recovery_time_ms,\"pattern_type\":\"timeout\",\"was_false_positive\":false}"
}

# Generate network traffic
generate_network_traffic() {
    local service=$1
    local timestamp=$2
    local failure_count=$((3 + RANDOM % 7))  # 3-10 failures
    local total_requests=100
    local failure_rate=$(awk "BEGIN {printf \"%.2f\", $failure_count / $total_requests}")
    local recovery_time_ms=$((20000 + RANDOM % 50000))  # 20-70s

    echo "{\"timestamp\":\"$timestamp\",\"service\":\"$service\",\"failure_count\":$failure_count,\"total_requests\":$total_requests,\"failure_rate\":$failure_rate,\"recovery_time_ms\":$recovery_time_ms,\"pattern_type\":\"network\",\"was_false_positive\":false}"
}

# Generate traffic for a service
generate_service_traffic() {
    local service=$1
    local base_date=$2
    local events_per_day=$3
    local day_offset=$4

    for ((i=0; i<events_per_day; i++)); do
        local offset_minutes=$((day_offset * 24 * 60 + i * 15))
        local timestamp=$(generate_timestamp "$base_date" $offset_minutes)

        # Determine pattern type based on ratios
        local rand=$((RANDOM % 100))
        local metric

        if [ $rand -lt 60 ]; then
            # 60% normal traffic
            metric=$(generate_normal_traffic "$service" "$timestamp")
        elif [ $rand -lt 80 ]; then
            # 20% spike traffic
            metric=$(generate_spike_traffic "$service" "$timestamp")
        elif [ $rand -lt 90 ]; then
            # 10% degraded traffic
            metric=$(generate_degraded_traffic "$service" "$timestamp")
        elif [ $rand -lt 95 ]; then
            # 5% timeout traffic
            metric=$(generate_timeout_traffic "$service" "$timestamp")
        else
            # 5% network traffic
            metric=$(generate_network_traffic "$service" "$timestamp")
        fi

        echo "$metric"
    done
}

# Main execution
main() {
    log_info "Generating circuit breaker traffic for $DAYS days..."
    log_info "Output file: $OUTPUT_FILE"

    local events_per_service_per_day=20  # 20 events per service per day
    local total_events=0
    local normal_count=0
    local spike_count=0
    local degraded_count=0
    local timeout_count=0
    local network_count=0

    # Generate base date (DAYS ago)
    local base_date=$(date -u -d "-$DAYS days" +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null || \
                  date -u -v-${DAYS}d +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null || \
                  date -u +"%Y-%m-%dT%H:%M:%SZ")

    # Create temporary file for metrics
    local temp_file=$(mktemp)

    # Generate traffic for each day
    for ((day=0; day<DAYS; day++)); do
        for service in "${SERVICES[@]}"; do
            # Generate traffic for this service
            while IFS= read -r metric; do
                echo "$metric" >> "$temp_file"
                total_events=$((total_events + 1))

                # Count pattern types
                if [[ $metric == *"pattern_type\":\"normal"* ]]; then
                    normal_count=$((normal_count + 1))
                elif [[ $metric == *"pattern_type\":\"spike"* ]]; then
                    spike_count=$((spike_count + 1))
                elif [[ $metric == *"pattern_type\":\"degraded"* ]]; then
                    degraded_count=$((degraded_count + 1))
                elif [[ $metric == *"pattern_type\":\"timeout"* ]]; then
                    timeout_count=$((timeout_count + 1))
                elif [[ $metric == *"pattern_type\":\"network"* ]]; then
                    network_count=$((network_count + 1))
                fi
            done < <(generate_service_traffic "$service" "$base_date" $events_per_service_per_day $day)
        done
    done

    # Sort by timestamp and append to output file
    sort -t',' -k1,1 "$temp_file" >> "$OUTPUT_FILE"
    rm -f "$temp_file"

    # Display summary
    log_info "Traffic generation complete!"
    log_info "Total events generated: $total_events"
    log_info "  - Normal traffic: $normal_count"
    log_info "  - Spike traffic: $spike_count"
    log_info "  - Degraded traffic: $degraded_count"
    log_info "  - Timeout traffic: $timeout_count"
    log_info "  - Network traffic: $network_count"
    log_info "Duration: $DAYS days"
    log_info "Services covered: ${SERVICES[*]}"
    log_info "Threshold learning enabled: yes"
}

main "$@"
