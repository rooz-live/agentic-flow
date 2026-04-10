#!/usr/bin/env bash
# drift-check.sh — Master infrastructure drift detection
#
# Runs all audit scripts and produces a unified health report.
# Designed to be run ad-hoc or via cron/launchd for continuous monitoring.
#
# Usage: ./drift-check.sh [--fix] [--log LOGFILE]
#   --fix   Pass --fix to sub-scripts that support auto-remediation
#   --log   Append output to a log file (default: stdout only)
#
# Exit codes:
#   0 = all clear
#   1 = issues found
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FIX_FLAG=""
LOG_FILE=""
TOTAL_ISSUES=0

while [[ $# -gt 0 ]]; do
    case "$1" in
        --fix) FIX_FLAG="--fix"; shift ;;
        --log) LOG_FILE="$2"; shift 2 ;;
        *)     echo "Unknown option: $1"; exit 1 ;;
    esac
done

# Logging tee setup
if [[ -n "$LOG_FILE" ]]; then
    exec > >(tee -a "$LOG_FILE") 2>&1
fi

TIMESTAMP=$(date -u +"%Y-%m-%d %H:%M:%S UTC")
echo "╔══════════════════════════════════════════════╗"
echo "║  Infrastructure Drift Check                  ║"
echo "║  ${TIMESTAMP}                ║"
echo "╚══════════════════════════════════════════════╝"
echo ""

run_audit() {
    local name="$1"
    local script="$2"
    shift 2
    local args=("$@")

    echo "┌─── ${name} ───"
    if [[ -x "$script" ]]; then
        "$script" "${args[@]}" || TOTAL_ISSUES=$((TOTAL_ISSUES + 1))
    else
        echo "  ✗ Script not found or not executable: ${script}"
        TOTAL_ISSUES=$((TOTAL_ISSUES + 1))
    fi
    echo "└───────────────────────────────────────────"
    echo ""
}

# ─── Run all audits ──────────────────────────────────────────────────────────

# 1. SSL Certificate Monitor (runs locally, no SSH for cert checks)
run_audit "SSL Certificate Monitor" "${SCRIPT_DIR}/cpanel/ssl-monitor.sh"

# 2. DNS Zone & DNSSEC Audit (requires SSH)
if [[ -n "$FIX_FLAG" ]]; then
    run_audit "DNS Zone & DNSSEC Audit" "${SCRIPT_DIR}/cpanel/dns-zone-audit.sh" "$FIX_FLAG"
else
    run_audit "DNS Zone & DNSSEC Audit" "${SCRIPT_DIR}/cpanel/dns-zone-audit.sh"
fi

# 3. Firewall Audit (requires SSH)
run_audit "Firewall Audit" "${SCRIPT_DIR}/cpanel/firewall-audit.sh" --snapshot

# 4. Nginx Configuration Audit (requires SSH)
run_audit "Nginx Configuration Audit" "${SCRIPT_DIR}/nginx/config-audit.sh"

# ─── Final Summary ───────────────────────────────────────────────────────────
echo "╔══════════════════════════════════════════════╗"
if [[ $TOTAL_ISSUES -eq 0 ]]; then
    echo "║  RESULT: ALL CLEAR ✓                        ║"
else
    printf "║  RESULT: %d audit(s) reported issues ✗       ║\n" "$TOTAL_ISSUES"
fi
echo "║  $(date -u +"%Y-%m-%d %H:%M:%S UTC")                ║"
echo "╚══════════════════════════════════════════════╝"

if [[ -n "$LOG_FILE" ]]; then
    echo "Log saved to: ${LOG_FILE}"
fi

exit $( [[ $TOTAL_ISSUES -eq 0 ]] && echo 0 || echo 1 )
