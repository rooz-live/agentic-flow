#!/bin/bash
set -e

# stx_phase2_manual_rpm_auto.sh - Non-interactive version of manual RPM installer
# Usage: AF_ACCEPT_DRIFT=1 ./scripts/stx_phase2_manual_rpm_auto.sh

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# Check for drift acceptance
if [ "${AF_ACCEPT_DRIFT:-0}" != "1" ]; then
    echo -e "${RED}❌ This script requires explicit drift acceptance${NC}" >&2
    echo "Set AF_ACCEPT_DRIFT=1 to confirm you accept the drift risk" >&2
    echo "Example: AF_ACCEPT_DRIFT=1 $0" >&2
    exit 1
fi

echo -e "${YELLOW}⚠️  DRIFT ACCEPTED VIA AF_ACCEPT_DRIFT=1${NC}"
echo "Proceeding with manual containerd RPM installation..."

# Call the original script with all arguments
exec "$(dirname "$0")/stx_phase2_manual_rpm.sh" "$@"
