#!/bin/bash
# exit-codes.sh — Thin wrapper for backward compatibility
# VERIFIED - DO NOT EDIT (Shellcheck 2026-03-25)
# DEPRECATED: Prefer sourcing exit-codes-robust.sh directly.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
source "${SCRIPT_DIR}/exit-codes-robust.sh" 2>/dev/null || true
