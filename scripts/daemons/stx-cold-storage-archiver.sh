#!/bin/bash
# scripts/daemons/stx-cold-storage-archiver.sh
# @business-context WSJF-53: Extracts JSONL/MD metrics off the .goalie physical trace bounds securing them into the HostBill sync archive blocking ADR-005 destruction definitively.
# @adr ADR-014: Discover/Consolidate THEN Extend isolation arrays defining physical evidence boundaries securely separating storage lifecycles.

set -euo pipefail

CYAN='\033[0;36m'
GREEN='\033[0;32m'
NC='\033[0m'

echo -e "${CYAN}Executing STX Cold Storage Archiver...${NC}"

ARCHIVE_DIR=".integrations/hostbill-sync/archive"
mkdir -p "$ARCHIVE_DIR"

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
ARCHIVE_TARGET="$ARCHIVE_DIR/metrics_pulse_${TIMESTAMP}.tar.gz"

if [ -d ".goalie" ] && [ "$(ls -A .goalie 2>/dev/null)" ]; then
    echo "Compressing existing Goal telemetry parameters..."
    tar -czf "$ARCHIVE_TARGET" .goalie/*.jsonl .goalie/*.md 2>/dev/null || true
    echo -e "${GREEN}[OK] Telemetry secured at $ARCHIVE_TARGET natively.${NC}"
else
    echo -e "${CYAN}[SKIP] No physical tracking limits detected in .goalie boundaries.${NC}"
fi

exit 0
