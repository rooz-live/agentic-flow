#!/usr/bin/env bash
# hostbill-deploy.sh — Automated HostBill installation workflow
#
# Business Context: WSJF-1 Infrastructure Automation
# Risk Level: HIGH (Direct mutation of infrastructure)
#
# This script wires the credential slot and installs HostBill using the
# official installation script.

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

if [[ "$1" != "--confirm" ]]; then
  log_error "You must explicitly acknowledge this mutation by passing --confirm"
  exit 1
fi

# Pre-flight check
if [[ "$EUID" -ne 0 ]]; then
  log_error "This script must be run as root to install packages and configure HostBill."
  exit 1
fi

log_info "Starting HostBill deployment workflow..."

# Step 1: Install dependencies
log_info "Installing required dependencies (wget)..."
yum -y install wget

# Step 2: Download the installation script
WORK_DIR=$(mktemp -d)
cd "${WORK_DIR}"
log_info "Downloading HostBill installation script to ${WORK_DIR}..."
wget -q http://install.hostbillapp.com/install/install.sh -O install.sh

# Step 3: Execute the installation with the wired credential slot
# Target provided in implementation plan: 7db3f39c91e41859961fbfc9245e2099
log_info "Executing HostBill installation payload..."
/bin/bash install.sh 7db3f39c91e41859961fbfc9245e2099

# Cleanup
log_info "Cleaning up temporary files..."
rm -rf "${WORK_DIR}"

log_info "HostBill deployment workflow completed successfully."
