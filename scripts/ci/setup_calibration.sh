#!/bin/bash
# Setup Calibration Environment
# Prepares directories, validates dependencies, and initializes calibration data structures

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="${SCRIPT_DIR}/../.."
CORRELATION_ID="consciousness-1758658960"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

echo "Setting up calibration environment"
echo "Correlation ID: ${CORRELATION_ID}"
echo "Timestamp: ${TIMESTAMP}"

# Create required directories
echo "Creating directory structure..."
mkdir -p "${PROJECT_ROOT}/reports/calibration"
mkdir -p "${PROJECT_ROOT}/logs/calibration"
mkdir -p "${PROJECT_ROOT}/data/calibration"
mkdir -p "${PROJECT_ROOT}/metrics"

# Validate git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo "❌ Not in a git repository"
    exit 1
fi

echo "✓ Git repository validated"

# Check for required commands
REQUIRED_COMMANDS=("git" "awk" "date")
for cmd in "${REQUIRED_COMMANDS[@]}"; do
    if ! command -v "$cmd" > /dev/null 2>&1; then
        echo "❌ Required command not found: $cmd"
        exit 1
    fi
    echo "✓ Found command: $cmd"
done

# Validate calibration script exists
if [ ! -f "${SCRIPT_DIR}/run_calibration.sh" ]; then
    echo "❌ Calibration script not found: ${SCRIPT_DIR}/run_calibration.sh"
    exit 1
fi
echo "✓ Found run_calibration.sh"

# Initialize calibration metadata
METADATA_FILE="${PROJECT_ROOT}/data/calibration/metadata.json"
if [ ! -f "${METADATA_FILE}" ]; then
    echo "Initializing calibration metadata..."
    cat > "${METADATA_FILE}" << EOF
{
  "calibration_metadata": {
    "initialized_at": "${TIMESTAMP}",
    "correlation_id": "${CORRELATION_ID}",
    "version": "1.0.0",
    "repository": "$(git remote get-url origin 2>/dev/null || echo 'local')",
    "branch": "$(git branch --show-current)",
    "last_calibration": null,
    "total_runs": 0
  }
}
EOF
    echo "✓ Created calibration metadata"
else
    echo "✓ Calibration metadata exists"
fi

# Initialize baseline metrics if not present
BASELINE_FILE="${PROJECT_ROOT}/metrics/performance_baselines.json"
if [ ! -f "${BASELINE_FILE}" ]; then
    echo "Initializing performance baselines..."
    cat > "${BASELINE_FILE}" << EOF
{
  "created": "${TIMESTAMP}",
  "note": "seed baseline ready",
  "calibration_baselines": {
    "avg_risk_score": 0,
    "high_risk_threshold": 50,
    "medium_risk_threshold": 25,
    "low_risk_threshold": 0
  }
}
EOF
    echo "✓ Created performance baselines"
else
    echo "✓ Performance baselines exist"
fi

# Check git commit history
COMMIT_COUNT=$(git log --oneline --no-merges | wc -l | tr -d ' ')
if [ "${COMMIT_COUNT}" -lt 10 ]; then
    echo "⚠ Warning: Only ${COMMIT_COUNT} commits found. Calibration works best with at least 10 commits."
else
    echo "✓ Found ${COMMIT_COUNT} commits for analysis"
fi

# Create logs directory for heartbeats
mkdir -p "${PROJECT_ROOT}/logs"
touch "${PROJECT_ROOT}/logs/heartbeats.log"
echo "✓ Heartbeat log initialized"

# Emit heartbeat
echo "${TIMESTAMP}|setup_calibration|environment_ready|SUCCESS|0|${CORRELATION_ID}|{\"commits_available\":${COMMIT_COUNT}}" >> "${PROJECT_ROOT}/logs/heartbeats.log"

# Summary
echo ""
echo "Calibration Environment Setup Complete"
echo "  ✓ Directory structure created"
echo "  ✓ Dependencies validated"
echo "  ✓ Metadata initialized"
echo "  ✓ Baselines configured"
echo "  ✓ ${COMMIT_COUNT} commits available for analysis"
echo ""
echo "Ready to run calibration with:"
echo "  ./scripts/ci/run_calibration_enhanced.sh [OPTIONS]"
echo ""
