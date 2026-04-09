#!/bin/bash
#
# P1-LIVE: Circuit Breaker Threshold Learning Script
#
# This script analyzes historical failure patterns from pattern_metrics.jsonl
# to learn optimal circuit breaker thresholds.
#
# Usage:
#   ./scripts/learn-circuit-breaker-thresholds.sh [options]
#
# Options:
#   --days N         Number of days to analyze (default: 7)
#   --min-events N    Minimum events required (default: 20)
#   --warning P       Warning percentile (default: 0.90)
#   --trip P          Trip percentile (default: 0.99)
#   --dry-run         Analyze without applying changes
#   --verbose         Enable verbose output
#
# Cron example (weekly):
#   0 2 * * 0 /path/to/learn-circuit-breaker-thresholds.sh

set -euo pipefail

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_ROOT"

# Default values
DAYS=7
MIN_EVENTS=20
WARNING_PERCENTILE=0.90
TRIP_PERCENTILE=0.99
DRY_RUN=false
VERBOSE=false

# Colors for output
RED='\033[0;31m'
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

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_verbose() {
    if [ "$VERBOSE" = true ]; then
        echo -e "[VERBOSE] $1"
    fi
}

# Print usage
usage() {
    cat << EOF
Usage: $0 [options]

Options:
  --days N             Number of days to analyze (default: 7)
  --min-events N        Minimum events required (default: 20)
  --warning P           Warning percentile (default: 0.90)
  --trip P              Trip percentile (default: 0.99)
  --dry-run             Analyze without applying changes
  --verbose              Enable verbose output
  -h, --help           Show this help message

Examples:
  $0                                    # Analyze last 7 days
  $0 --days 14                          # Analyze last 14 days
  $0 --dry-run --verbose                  # Analyze with verbose output, no changes
  $0 --warning 0.85 --trip 0.95         # Custom percentiles

EOF
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --days)
            DAYS="$2"
            shift 2
            ;;
        --min-events)
            MIN_EVENTS="$2"
            shift 2
            ;;
        --warning)
            WARNING_PERCENTILE="$2"
            shift 2
            ;;
        --trip)
            TRIP_PERCENTILE="$2"
            shift 2
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --verbose)
            VERBOSE=true
            shift
            ;;
        -h|--help)
            usage
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            usage
            exit 1
            ;;
    esac
done

# Validate inputs
if [[ ! "$DAYS" =~ ^[0-9]+$ ]] || [ "$DAYS" -lt 1 ] || [ "$DAYS" -gt 30 ]; then
    log_error "Days must be between 1 and 30"
    exit 1
fi

if [[ ! "$MIN_EVENTS" =~ ^[0-9]+$ ]] || [ "$MIN_EVENTS" -lt 5 ]; then
    log_error "Minimum events must be at least 5"
    exit 1
fi

if (( $(echo "$WARNING_PERCENTILE < 0.5 || $WARNING_PERCENTILE > 0.99" | bc -l 2>/dev/null)); then
    log_error "Warning percentile must be between 0.5 and 0.99"
    exit 1
fi

if (( $(echo "$TRIP_PERCENTILE < 0.5 || $TRIP_PERCENTILE > 0.999" | bc -l 2>/dev/null)); then
    log_error "Trip percentile must be between 0.5 and 0.999"
    exit 1
fi

log_info "Starting circuit breaker threshold learning"
log_info "Analysis window: last $DAYS days"
log_info "Minimum events: $MIN_EVENTS"
log_info "Warning percentile: $WARNING_PERCENTILE"
log_info "Trip percentile: $TRIP_PERCENTILE"
log_info "Dry run: $DRY_RUN"

# Check if pattern_metrics.jsonl exists
PATTERN_METRICS_FILE="evidence/pattern_metrics.jsonl"
if [ ! -f "$PATTERN_METRICS_FILE" ]; then
    log_warn "Pattern metrics file not found: $PATTERN_METRICS_FILE"
    log_warn "Sample file already created by threshold_learner module"
fi

# Count lines in pattern metrics
METRIC_COUNT=$(wc -l < "$PATTERN_METRICS_FILE" 2>/dev/null | tr -d ' ')
log_info "Found $METRIC_COUNT pattern metrics"

if [ "$METRIC_COUNT" -lt "$MIN_EVENTS" ]; then
    log_warn "Insufficient metrics: $METRIC_COUNT < $MIN_EVENTS minimum"
    log_warn "Thresholds will not be reliable with this sample size"
fi

# Create config directory if it doesn't exist
CONFIG_DIR="config"
mkdir -p "$CONFIG_DIR"

# Backup existing config
CONFIG_FILE="$CONFIG_DIR/circuit_breaker_config.json"
BACKUP_FILE="$CONFIG_DIR/circuit_breaker_config.json.backup.$(date +%Y%m%d_%H%M%S)"

if [ -f "$CONFIG_FILE" ]; then
    log_info "Backing up existing config to: $BACKUP_FILE"
    cp "$CONFIG_FILE" "$BACKUP_FILE"
fi

# Build Rust threshold learner binary
log_info "Building threshold learner..."
cd emerging/VisionFlow

if [ "$VERBOSE" = true ]; then
    cargo build --release --bin learn_thresholds 2>&1 | tee /tmp/build.log
else
    cargo build --release --bin learn_thresholds > /tmp/build.log 2>&1
fi

if [ $? -ne 0 ]; then
    log_error "Failed to build threshold learner"
    cat /tmp/build.log
    exit 1
fi

log_info "Build successful"

# Create a temporary config file for learner
TEMP_CONFIG=$(mktemp)
cat > "$TEMP_CONFIG" << EOF
{
  "pattern_metrics_path": "$PATTERN_METRICS_FILE",
  "config_output_path": "$CONFIG_FILE",
  "analysis_days": $DAYS,
  "min_events_threshold": $MIN_EVENTS,
  "warning_percentile": $WARNING_PERCENTILE,
  "trip_percentile": $TRIP_PERCENTILE
}
EOF

if [ "$DRY_RUN" = true ]; then
    log_warn "DRY RUN MODE - No changes will be applied"
    log_info "Run without --dry-run to apply learned thresholds"
    rm -f "$TEMP_CONFIG"
    exit 0
fi

# Run threshold learner
log_info "Running threshold learner..."
./target/release/learn_thresholds "$TEMP_CONFIG"

if [ $? -ne 0 ]; then
    log_error "Threshold learner failed"
    rm -f "$TEMP_CONFIG"
    exit 1
fi

rm -f "$TEMP_CONFIG"

# Verify new config
if [ -f "$CONFIG_FILE" ]; then
    log_info "Threshold learning completed successfully"
    log_info "New config written to: $CONFIG_FILE"
    
    # Display summary
    log_info "Learned thresholds summary:"
    # Simple JSON parsing without jq dependency
    if [ -f "$CONFIG_FILE" ]; then
        # Extract and display learned thresholds
        if grep -q '"learned_thresholds"' "$CONFIG_FILE"; then
            # Extract service names and their thresholds
            log_info "  Network: $(grep -oP '"network"[^}]*' "$CONFIG_FILE" | head -1 | sed 's/.*"optimal_failure_threshold":[[:space:]]*\([0-9]*\).*/\1/' || echo 'N/A')"
            log_info "  TCP Connection: $(grep -oP '"tcp_connection"[^}]*' "$CONFIG_FILE" | head -1 | sed 's/.*"optimal_failure_threshold":[[:space:]]*\([0-9]*\).*/\1/' || echo 'N/A')"
            log_info "  WebSocket: $(grep -oP '"websocket"[^}]*' "$CONFIG_FILE" | head -1 | sed 's/.*"optimal_failure_threshold":[[:space:]]*\([0-9]*\).*/\1/' || echo 'N/A')"
            log_info "  MCP Operations: $(grep -oP '"mcp_operations"[^}]*' "$CONFIG_FILE" | head -1 | sed 's/.*"optimal_failure_threshold":[[:space:]]*\([0-9]*\).*/\1/' || echo 'N/A')"
        else
            log_info "  No learned thresholds found"
        fi
    exit 0
else
    log_error "Config file was not created"
    exit 1
fi

log_info "Threshold learning process completed"
