#!/usr/bin/env bash
# Quick backup trigger
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
bash "$SCRIPT_DIR/backup-incremental.sh"
