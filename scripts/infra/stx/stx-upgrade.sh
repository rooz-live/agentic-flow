#!/usr/bin/env bash
# stx-upgrade.sh — Automates the upgrade of OpenStack services on StarlingX (STX)
#
# Business Context: WSJF-1 Infrastructure Automation
# Risk Level: HIGH (Direct mutation of STX/OpenStack infrastructure and K8s matrix)
#
# Usage:
#   ./stx-upgrade.sh <tarball_path_or_version>
#
# Description:
#   Upgrades the stx-openstack application in the StarlingX environment,
#   ensuring integration with the active K8s matrix.

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# 1. Source Credentials
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../../../.." && pwd)"
ENV_FILE="${PROJECT_ROOT}/credentials/.env.cpanel"

if [[ -f "$ENV_FILE" ]]; then
    log_info "Sourcing credentials from $ENV_FILE"
    source "$ENV_FILE"
else
    log_warn "Credential file not found at $ENV_FILE. Relying on active environment variables."
fi

# Ensure OpenStack/STX CLI is authenticated
if [[ -z "${OS_AUTH_URL:-}" || -z "${OS_USERNAME:-}" || -z "${OS_PASSWORD:-}" ]]; then
    log_warn "OS_ environment variables are incomplete. Attempting to source /etc/nova/openrc or similar if local."
    if [[ -f "/etc/nova/openrc" ]]; then
        source /etc/nova/openrc
    else
        log_error "Missing STX/OpenStack credentials. Please set them or use a valid openrc file."
        exit 1
    fi
fi

if [[ "$1" != "--confirm" ]]; then
  log_error "You must explicitly acknowledge this mutation by passing --confirm"
  exit 1
fi
shift

# 2. Parse Arguments
if [[ $# -lt 1 ]]; then
    log_error "Missing target upgrade version or tarball."
    echo "Usage: $0 <stx-openstack-version-or-tarball-path>"
    exit 1
fi

TARGET_APP="$1"

# 3. Pre-flight Checks
if ! command -v system >/dev/null 2>&1; then
    log_error "The 'system' CLI tool is not installed or not in PATH."
    exit 1
fi

log_info "Checking current status of stx-openstack application..."
APP_STATUS=$(system application-show stx-openstack --format value --column status 2>/dev/null || echo "not-found")

if [[ "$APP_STATUS" == "not-found" ]]; then
    log_error "stx-openstack application is not installed on this system."
    exit 1
fi

log_info "Current status of stx-openstack is: $APP_STATUS"

if [[ "$APP_STATUS" == "applying" || "$APP_STATUS" == "updating" ]]; then
    log_error "An update or apply operation is already in progress for stx-openstack."
    exit 1
fi

# 4. Upload/Update Application
if [[ -f "$TARGET_APP" ]]; then
    log_info "Uploading application tarball: $TARGET_APP"
    system application-update stx-openstack "$TARGET_APP"
else
    log_info "Attempting to update stx-openstack to version/reference: $TARGET_APP"
    # Note: Depending on STX version, this may require specific patch/upload commands prior.
    # Assuming application-update with version tag if registry is configured.
    system application-update stx-openstack "$TARGET_APP"
fi

# 5. Apply the Update
log_info "Applying the stx-openstack update to the K8s matrix..."
system application-apply stx-openstack

# 6. Monitor Application Status
log_info "Monitoring apply progress (this may take a while)..."

while true; do
    CURRENT_STATUS=$(system application-show stx-openstack --format value --column status)
    if [[ "$CURRENT_STATUS" == "applied" ]]; then
        log_info "stx-openstack successfully upgraded and applied."
        break
    elif [[ "$CURRENT_STATUS" == "apply-failed" ]]; then
        log_error "stx-openstack application apply failed."
        system application-show stx-openstack
        exit 1
    else
        log_info "Status: $CURRENT_STATUS... waiting 30 seconds."
        sleep 30
    fi
done

log_info "STX OpenStack upgrade workflow completed."
