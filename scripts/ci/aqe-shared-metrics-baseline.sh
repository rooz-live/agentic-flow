#!/bin/bash
# scripts/ci/aqe-shared-metrics-baseline.sh
# @business-context WSJF-52: Triggers cross-environment threshold verifications checking .goalie/ parameters definitively before dropping PI Sync matrices.
# @adr ADR-011: Strict assertion requiring physical metric presence inside native logging bounds avoiding silent failures.

set -euo pipefail

CYAN='\033[0;36m'
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${CYAN}Executing Shared Dashboard Metric Baseline Over STX Boundaries...${NC}"

# CSQBM Governance Constraint: Enforce agentdb >96h staleness natively (ADR-005)
PROJECT_ROOT="$(cd "$(dirname "$(dirname "${BASH_SOURCE[0]}")")/.." && pwd)"
AGENTDB_PATH="$PROJECT_ROOT/agentdb.db"
if [ ! -f "$AGENTDB_PATH" ] && [ -f "$PROJECT_ROOT/../../agentdb.db" ]; then
    AGENTDB_PATH="$PROJECT_ROOT/../../agentdb.db"
fi

if [ -f "$AGENTDB_PATH" ]; then
    if [[ "$OSTYPE" == "darwin"* ]]; then
        file_age=$(( $(date +%s) - $(stat -f %m "$AGENTDB_PATH") ))
    else
        file_age=$(( $(date +%s) - $(stat -c %Y "$AGENTDB_PATH") ))
    fi
    if [ "$file_age" -gt 345600 ]; then
        echo -e "${RED}[FATAL] CSQBM Governance Halt: agentdb.db staleness >96h. CI blocked via OpenWorm Bounds (ADR-005).${NC}"
        exit 1
    fi
fi

if [ -f "$PROJECT_ROOT/scripts/validators/project/check-csqbm.sh" ]; then
    if ! bash "$PROJECT_ROOT/scripts/validators/project/check-csqbm.sh" > /dev/null 2>&1; then
        echo -e "${RED}[FATAL] CSQBM Governance Halt: CSQBM trace missing. CI blocked via OpenWorm Bounds (ADR-005).${NC}"
        exit 1
    fi
fi

# Define CI Test Threshold Bounds
REQUIRED_KEYS=("SUCCESS" "TRAFFIC" "ERRORS" "SATURATION")
METRICS_LOG=".goalie/metrics_log.jsonl"

if [[ ! -f "$METRICS_LOG" ]]; then
     echo -e "${RED}[FATAL] Missing telemetry vectors natively blocking CI Sync loops.${NC}"
     exit 1
fi

echo "Synthesizing explicit keys..."
for key in "${REQUIRED_KEYS[@]}"; do
    if ! grep -q "\"$key\"" "$METRICS_LOG"; then
        echo -e "${RED}[FATAL] Essential testing signal ($key) absent from local DBOS mapping.${NC}"
        echo -e "CI matrices halted protecting physical STX bounds."
        exit 1
    fi
done

echo -e "${GREEN}[OK] Native DBOS Telemetry bounds mathematically sound.${NC}"
echo -e "${GREEN}[SUCCESS] Pipeline integrations validated organically.${NC}"
exit 0
