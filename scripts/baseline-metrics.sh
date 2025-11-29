#!/usr/bin/env bash
#
# baseline-metrics.sh
#
# Captures comprehensive baseline metrics for comparison in Build-Measure-Learn cycles
#
# Usage: ./scripts/baseline-metrics.sh [--output <file>] [--format <json|markdown>]

set -euo pipefail

# Configuration
OUTPUT_FILE="logs/baseline-metrics-$(date +%Y%m%d-%H%M%S).json"
FORMAT="json"

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --output)
            OUTPUT_FILE="$2"
            shift 2
            ;;
        --format)
            FORMAT="$2"
            shift 2
            ;;
        *)
            echo "Unknown option: $1"
            echo "Usage: $0 [--output <file>] [--format <json|markdown>]"
            exit 1
            ;;
    esac
done

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "📊 Baseline Metrics Capture"
echo "============================"
echo ""

# System metrics
echo "Collecting system metrics..."
CPU_CORES=$(sysctl -n hw.ncpu 2>/dev/null || nproc)
TOTAL_MEM=$(sysctl -n hw.memsize 2>/dev/null || free -b | awk '/Mem:/ {print $2}')
LOAD_1MIN=$(uptime | awk -F'load average:' '{print $2}' | cut -d, -f1 | xargs)
LOAD_5MIN=$(uptime | awk -F'load average:' '{print $2}' | cut -d, -f2 | xargs)
LOAD_15MIN=$(uptime | awk -F'load average:' '{print $2}' | cut -d, -f3 | xargs)

# Git metrics
echo "Collecting git metrics..."
GIT_BRANCH=$(git branch --show-current)
GIT_COMMIT=$(git rev-parse HEAD)
GIT_COMMIT_SHORT=$(git rev-parse --short HEAD)
GIT_UNCOMMITTED=$(git status --porcelain | wc -l | xargs)
GIT_BEHIND=$(git rev-list HEAD..@{u} --count 2>/dev/null || echo "0")
GIT_AHEAD=$(git rev-list @{u}..HEAD --count 2>/dev/null || echo "0")

# Codebase metrics
echo "Collecting codebase metrics..."
TOTAL_FILES=$(git ls-files | wc -l | xargs)
TS_FILES=$(git ls-files '*.ts' '*.tsx' | wc -l | xargs)
JS_FILES=$(git ls-files '*.js' '*.jsx' | wc -l | xargs)
TEST_FILES=$(git ls-files '*test.ts' '*test.js' '*spec.ts' '*spec.js' | wc -l | xargs)
TOTAL_LINES=$(git ls-files | xargs wc -l 2>/dev/null | tail -1 | awk '{print $1}')

# Governor metrics
echo "Collecting governor metrics..."
GOVERNOR_INCIDENTS=0
GOVERNOR_WIP_VIOLATIONS=0
GOVERNOR_CPU_OVERLOADS=0
if [ -f "logs/governor_incidents.jsonl" ]; then
    GOVERNOR_INCIDENTS=$(wc -l < logs/governor_incidents.jsonl | xargs)
    GOVERNOR_WIP_VIOLATIONS=$(grep -c 'WIP_VIOLATION' logs/governor_incidents.jsonl 2>/dev/null || echo "0")
    GOVERNOR_CPU_OVERLOADS=$(grep -c 'CPU_OVERLOAD' logs/governor_incidents.jsonl 2>/dev/null || echo "0")
fi

# Test metrics
echo "Collecting test metrics..."
TEST_PASSED=0
TEST_FAILED=0
TEST_DURATION=0
if [ -f "test-results.json" ]; then
    TEST_PASSED=$(jq -r '.numPassedTests // 0' test-results.json 2>/dev/null || echo "0")
    TEST_FAILED=$(jq -r '.numFailedTests // 0' test-results.json 2>/dev/null || echo "0")
    TEST_DURATION=$(jq -r '.testResults[].perfStats.runtime // 0' test-results.json 2>/dev/null | awk '{s+=$1} END {print s}')
fi

# Node/NPM versions
NODE_VERSION=$(node --version 2>/dev/null || echo "unknown")
NPM_VERSION=$(npm --version 2>/dev/null || echo "unknown")

# Package metrics
echo "Collecting package metrics..."
DEPENDENCIES=0
DEV_DEPENDENCIES=0
if [ -f "package.json" ]; then
    DEPENDENCIES=$(jq -r '.dependencies // {} | length' package.json 2>/dev/null || echo "0")
    DEV_DEPENDENCIES=$(jq -r '.devDependencies // {} | length' package.json 2>/dev/null || echo "0")
fi

# Build metrics
echo "Checking build status..."
BUILD_STATUS="unknown"
BUILD_SIZE=0
if [ -d "dist" ]; then
    BUILD_STATUS="exists"
    BUILD_SIZE=$(du -sk dist 2>/dev/null | awk '{print $1}' || echo "0")
fi

# Timestamp
TIMESTAMP=$(date -u +%Y-%m-%dT%H:%M:%SZ)

# Generate output
mkdir -p "$(dirname "$OUTPUT_FILE")"

if [ "$FORMAT" = "json" ]; then
    cat > "$OUTPUT_FILE" <<EOF
{
  "timestamp": "$TIMESTAMP",
  "system": {
    "cpu_cores": $CPU_CORES,
    "total_memory_bytes": $TOTAL_MEM,
    "load_1min": $LOAD_1MIN,
    "load_5min": $LOAD_5MIN,
    "load_15min": $LOAD_15MIN
  },
  "git": {
    "branch": "$GIT_BRANCH",
    "commit": "$GIT_COMMIT",
    "commit_short": "$GIT_COMMIT_SHORT",
    "uncommitted_changes": $GIT_UNCOMMITTED,
    "commits_behind": $GIT_BEHIND,
    "commits_ahead": $GIT_AHEAD
  },
  "codebase": {
    "total_files": $TOTAL_FILES,
    "typescript_files": $TS_FILES,
    "javascript_files": $JS_FILES,
    "test_files": $TEST_FILES,
    "total_lines": $TOTAL_LINES
  },
  "governor": {
    "total_incidents": $GOVERNOR_INCIDENTS,
    "wip_violations": $GOVERNOR_WIP_VIOLATIONS,
    "cpu_overloads": $GOVERNOR_CPU_OVERLOADS
  },
  "tests": {
    "passed": $TEST_PASSED,
    "failed": $TEST_FAILED,
    "duration_ms": $TEST_DURATION
  },
  "environment": {
    "node_version": "$NODE_VERSION",
    "npm_version": "$NPM_VERSION"
  },
  "packages": {
    "dependencies": $DEPENDENCIES,
    "dev_dependencies": $DEV_DEPENDENCIES
  },
  "build": {
    "status": "$BUILD_STATUS",
    "size_kb": $BUILD_SIZE
  }
}
EOF
else
    # Markdown format
    cat > "$OUTPUT_FILE" <<EOF
# Baseline Metrics

**Captured:** $TIMESTAMP

## System
- **CPU Cores:** $CPU_CORES
- **Total Memory:** $(numfmt --to=iec-i --suffix=B $TOTAL_MEM 2>/dev/null || echo "${TOTAL_MEM} bytes")
- **Load Average:** $LOAD_1MIN (1m), $LOAD_5MIN (5m), $LOAD_15MIN (15m)

## Git
- **Branch:** $GIT_BRANCH
- **Commit:** $GIT_COMMIT_SHORT ($GIT_COMMIT)
- **Uncommitted Changes:** $GIT_UNCOMMITTED files
- **Sync Status:** $GIT_AHEAD ahead, $GIT_BEHIND behind

## Codebase
- **Total Files:** $TOTAL_FILES
- **TypeScript Files:** $TS_FILES
- **JavaScript Files:** $JS_FILES
- **Test Files:** $TEST_FILES
- **Total Lines:** $TOTAL_LINES

## Governor
- **Total Incidents:** $GOVERNOR_INCIDENTS
- **WIP Violations:** $GOVERNOR_WIP_VIOLATIONS
- **CPU Overloads:** $GOVERNOR_CPU_OVERLOADS

## Tests
- **Passed:** $TEST_PASSED
- **Failed:** $TEST_FAILED
- **Duration:** ${TEST_DURATION}ms

## Environment
- **Node:** $NODE_VERSION
- **NPM:** $NPM_VERSION

## Packages
- **Dependencies:** $DEPENDENCIES
- **Dev Dependencies:** $DEV_DEPENDENCIES

## Build
- **Status:** $BUILD_STATUS
- **Size:** ${BUILD_SIZE}KB
EOF
fi

echo ""
echo -e "${GREEN}✓ Baseline metrics captured${NC}"
echo "  Output: $OUTPUT_FILE"
echo ""

# Display summary
if [ "$FORMAT" = "json" ]; then
    echo "Summary:"
    jq -r '
    "  System Load: \(.system.load_1min) (1m avg)",
    "  Git Branch: \(.git.branch)",
    "  Uncommitted: \(.git.uncommitted_changes) files",
    "  Governor Incidents: \(.governor.total_incidents)",
    "  Tests: \(.tests.passed) passed, \(.tests.failed) failed"
    ' "$OUTPUT_FILE"
else
    echo "Summary:"
    echo "  System Load: $LOAD_1MIN (1m avg)"
    echo "  Git Branch: $GIT_BRANCH"
    echo "  Uncommitted: $GIT_UNCOMMITTED files"
    echo "  Governor Incidents: $GOVERNOR_INCIDENTS"
    echo "  Tests: $TEST_PASSED passed, $TEST_FAILED failed"
fi

echo ""
echo "✅ Baseline metrics capture complete!"
