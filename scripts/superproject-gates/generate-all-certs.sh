#!/bin/bash
# Off-Host Syslog Internal PKI - Generate All Certificates
# This script orchestrates the generation of CA, server, and client certificates
#
# Usage: ./generate-all-certs.sh
#
# Environment:
# - Syslog Sink: 77.42.28.179 (syslog-sink)
# - stx-aio-0: 23.92.79.2 (client)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
export CA_DIR="${SCRIPT_DIR}/ca"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_step() { echo -e "${BLUE}[STEP]${NC} $1"; }

echo "=============================================="
echo "  Off-Host Syslog PKI Certificate Generator  "
echo "=============================================="
echo ""

# Step 1: Generate CA
log_step "1/3 - Generating Certificate Authority..."
bash "${SCRIPT_DIR}/generate-ca.sh"
echo ""

# Step 2: Generate Server Certificate for syslog-sink
log_step "2/3 - Generating Server Certificate (syslog-sink)..."
bash "${SCRIPT_DIR}/generate-server-cert.sh" "syslog-sink" "77.42.28.179"
echo ""

# Step 3: Generate Client Certificate for stx-aio-0
log_step "3/3 - Generating Client Certificate (stx-aio-0)..."
bash "${SCRIPT_DIR}/generate-client-cert.sh" "stx-aio-0" "23.92.79.2"
echo ""

# Summary
log_info "=============================================="
log_info "  PKI Generation Complete!                   "
log_info "=============================================="
echo ""
echo "Files ready for deployment:"
echo ""
echo "CA Certificate (deploy to both servers):"
echo "  ${CA_DIR}/certs/ca.crt"
echo ""
echo "Server Certificate (deploy to syslog-sink at 77.42.28.179):"
echo "  ${CA_DIR}/certs/syslog-sink.crt"
echo "  ${CA_DIR}/private/syslog-sink.key"
echo ""
echo "Client Certificate (deploy to stx-aio-0 at 23.92.79.2):"
echo "  ${CA_DIR}/certs/stx-aio-0-client.crt"
echo "  ${CA_DIR}/private/stx-aio-0-client.key"
echo ""
echo "Next Steps:"
echo "  1. Deploy certificates via Ansible: ansible-playbook -i inventory.yml deploy-certs.yml"
echo "  2. Configure rsyslog-gnutls on syslog-sink"
echo "  3. Configure rsyslog forwarding on stx-aio-0"
echo "  4. Verify log flow with test messages"
echo ""

# Verify all files exist
log_info "Verifying all certificate files..."
REQUIRED_FILES=(
    "${CA_DIR}/certs/ca.crt"
    "${CA_DIR}/private/ca.key"
    "${CA_DIR}/certs/syslog-sink.crt"
    "${CA_DIR}/private/syslog-sink.key"
    "${CA_DIR}/certs/stx-aio-0-client.crt"
    "${CA_DIR}/private/stx-aio-0-client.key"
)

ALL_OK=true
for file in "${REQUIRED_FILES[@]}"; do
    if [[ -f "$file" ]]; then
        echo -e "  ${GREEN}✓${NC} $file"
    else
        echo -e "  ${RED}✗${NC} $file (MISSING)"
        ALL_OK=false
    fi
done

if $ALL_OK; then
    log_info "All certificate files generated successfully!"
    exit 0
else
    log_error "Some files are missing. Check the errors above."
    exit 1
fi
