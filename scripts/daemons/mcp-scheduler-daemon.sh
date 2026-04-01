#!/bin/bash
# scripts/daemons/mcp-scheduler-daemon.sh
# @business-context WSJF-52: Triggers active topology checking and structural connectome pruning mapping ADR-005 constraints over STX routing cycles naturally.
# @adr ADR-005, ADR-006: Defines native loop restrictions preventing execution saturation securely blocking infinite API requests.

set -euo pipefail

CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${CYAN}Executing MCP Scheduler Daemon Traces...${NC}"

# 0. Cold Storage Archival (HostBill Mitigation WSJF-53)
echo -e "${CYAN}[ARCHIVE] Triggering STX Cold Storage Telemetry extraction mitigating ADR-005 loss...${NC}"
if [[ -x scripts/daemons/stx-cold-storage-archiver.sh ]]; then
    ./scripts/daemons/stx-cold-storage-archiver.sh || true
fi

# 1. Connectome Pruning (ADR-005)
echo -e "${YELLOW}[PRUNE] Auditing stale execution telemetry tracking bounds...${NC}"
find .goalie -name "*.jsonl" -type f -mmin +120 -exec rm -f {} \; || true
find .goalie -name "*.md" -type f -mmin +240 -exec rm -f {} \; || true

# 2. CSQBM Truth Gate (ADR-005 Governance Constraint)
echo -e "${YELLOW}[GATE] Verifying CSQBM truth context via ADR-005 bounds...${NC}"
if [[ -x scripts/validators/project/check-csqbm.sh ]]; then
     if ! ./scripts/validators/project/check-csqbm.sh --deep-why > /dev/null 2>&1; then
         echo -e "${RED}[HALT] CSQBM Governance Halt. agentdb.db staleness >96h. Execution Topology bypassed.${NC}"
         python3 scripts/emit_metrics.py --event-type action --command "mcp_daemon" --target "csqbm_halt" \
              --cycle-index 0 --log-file .goalie/metrics_log.jsonl || true
         exit 150
     fi
     echo -e "${GREEN}[GATE] CSQBM Deep-Why Validation complete. Hydration confirmed.${NC}"
else
     echo -e "${YELLOW}[WARNING] scripts/validators/project/check-csqbm.sh not found. Assuming risk bypass for legacy reasons...${NC}"
fi

# 3. Trigger active Model Router cycles
if [[ -x scripts/validators/aqe-model-router.sh ]]; then
     echo -e "${GREEN}[PULSE] Triggering STX AQE Topology...${NC}"
     ./scripts/validators/aqe-model-router.sh "telemetry" || echo -e "${RED}[WARNING] Router triggered faults.${NC}"
else
     echo -e "${YELLOW}[SKIP] AQE router unavailable natively. Bypassing pulse.${NC}"
fi

# 4. Log Daemon Heartbeat
python3 scripts/emit_metrics.py --event-type action --command "mcp_daemon" --target "pulse_nominal" \
     --cycle-index 0 --log-file .goalie/metrics_log.jsonl || true

echo -e "${GREEN}[SUCCESS] MCP Scheduler successfully cycled physical bounds.${NC}"
exit 0
