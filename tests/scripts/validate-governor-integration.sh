#!/usr/bin/env bash
# ProcessGovernor CPU load validation harness
# Production Cycle 42 - NOW phase defensive safeguards

set -euo pipefail

# Configuration
: "${AF_GOVERNOR_MAX_SPAWN_PER_SEC:=4}"
: "${AF_GOVERNOR_POLL_INTERVAL_MS:=250}"
: "${AF_GOVERNOR_BACKOFF_BASE_MS:=200}"
: "${CPU_THRESHOLD:=40}"
: "${IDLE_THRESHOLD:=10}"
: "${TEST_DURATION_SECS:=60}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
METRICS_LOG="$REPO_ROOT/.goalie/metrics_log.jsonl"

log_event() {
    local event="$1"
    local payload="$2"
    echo "{\"timestamp\":\"$(date -u +"%Y-%m-%dT%H:%M:%SZ\")\",\"event\":\"$event\",$payload}" >> "$METRICS_LOG"
}

echo "=== ProcessGovernor CPU Load Validation ==="
echo "Config: max_spawn=$AF_GOVERNOR_MAX_SPAWN_PER_SEC poll_ms=$AF_GOVERNOR_POLL_INTERVAL_MS backoff_ms=$AF_GOVERNOR_BACKOFF_BASE_MS"
echo "Thresholds: cpu<${CPU_THRESHOLD}% idle>${IDLE_THRESHOLD}% duration=${TEST_DURATION_SECS}s"
echo ""

# Baseline CPU measurement (system-wide)
echo "Sampling CPU for ${TEST_DURATION_SECS}s..."
cpu_samples=()
idle_samples=()

for i in $(seq 1 $TEST_DURATION_SECS); do
    # MacOS iostat: use -c for CPU, sample 1 second
    cpu_line=$(iostat -c 1 2 | tail -1)
    user=$(echo "$cpu_line" | awk '{print $1}')
    sys=$(echo "$cpu_line" | awk '{print $2}')
    idle=$(echo "$cpu_line" | awk '{print $3}')
    
    cpu_used=$(echo "$user + $sys" | bc)
    cpu_samples+=("$cpu_used")
    idle_samples+=("$idle")
    
    [ $((i % 10)) -eq 0 ] && echo -n "."
done
echo ""

# Calculate averages
avg_cpu=$(echo "${cpu_samples[@]}" | tr ' ' '\n' | awk '{sum+=$1} END {print sum/NR}')
avg_idle=$(echo "${idle_samples[@]}" | tr ' ' '\n' | awk '{sum+=$1} END {print sum/NR}')

echo ""
echo "Results:"
echo "  Average CPU:  ${avg_cpu}%"
echo "  Average Idle: ${avg_idle}%"

# Threshold checks
status="PASS"
violations=()

if (( $(echo "$avg_cpu > $CPU_THRESHOLD" | bc -l) )); then
    violations+=("cpu:${avg_cpu}>${CPU_THRESHOLD}")
    status="FAIL"
fi

if (( $(echo "$avg_idle < $IDLE_THRESHOLD" | bc -l) )); then
    violations+=("idle:${avg_idle}<${IDLE_THRESHOLD}")
    status="FAIL"
fi

# Emit results
log_event "governor_health_validation" \
    "\"status\":\"$status\",\"avg_cpu\":$avg_cpu,\"avg_idle\":$avg_idle,\"threshold_cpu\":$CPU_THRESHOLD,\"threshold_idle\":$IDLE_THRESHOLD,\"duration_secs\":$TEST_DURATION_SECS,\"violations\":[$(printf '"%s",' "${violations[@]}" | sed 's/,$//')]"

if [ "$status" = "FAIL" ]; then
    echo ""
    echo "⚠️  VALIDATION FAILED: ${violations[*]}"
    
    # Emit guardrail events
    log_event "guardrail_lock" \
        "\"enforced\":true,\"health_state\":\"degraded\",\"reason\":\"cpu_threshold_exceeded\",\"user_requests\":0"
    
    log_event "safe_degrade" \
        "\"triggers\":1,\"actions\":\"block_deploy_depth>3\",\"recovery_cycles\":0"
    
    echo "Blocked: deploy depth>3 until CPU stabilizes"
    exit 1
fi

echo ""
echo "✅ VALIDATION PASSED"
exit 0
