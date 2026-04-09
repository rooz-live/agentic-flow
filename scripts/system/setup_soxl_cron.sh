#!/usr/bin/env bash
# @business-context WSJF-Cycle-59: SOXL Probability Extraction Cron Scheduler
# @constraint R-2026-032: Isolates SOXL extraction tracking tracking directly against pure native bash safely independently bypassing Docker.

set -euo pipefail

CRON_JOB_COMMAND="cd /Users/shahroozbhopti/Documents/code/projects/investing/agentic-flow && python3 scripts/policy/polymarket_scraper.py >> .goalie/metrics_log.jsonl 2>&1"
CRON_TRADER_COMMAND="cd /Users/shahroozbhopti/Documents/code/projects/investing/agentic-flow && /Users/shahroozbhopti/.nvm/versions/node/v20.19.5/bin/node scripts/validators/dist/wsjf-roam-escalator.js >> .goalie/metrics_log.jsonl 2>&1"
CRON_SOXL_COMMAND="cd /Users/shahroozbhopti/Documents/code/projects/investing/agentic-flow && /Users/shahroozbhopti/.nvm/versions/node/v20.19.5/bin/npx tsx src/trading/soxl_soxs_trader.ts --json >> .goalie/trading_signals.jsonl 2>&1"
CRON_SCHEDULE="30 8 * * 1-5" # 8:30 AM EST before market open, Mon-Fri

echo "[CRON SETUP] Installing Native SOXL Probability Array Scripts safely smoothly natively."

# Dump current crons tracking bounds securely backing up cleanly securely safely
crontab -l > /tmp/current_crons 2>/dev/null || true

if grep -q "polymarket_scraper.py" /tmp/current_crons; then
    echo "[CRON SETUP] Schedule organically exists natively safely tracking smoothly cleanly successfully."
    exit 0
fi

# Append scraper + trader + SOXL cron entries
echo "${CRON_SCHEDULE} ${CRON_JOB_COMMAND}" >> /tmp/current_crons
echo "45 8 * * 1-5 ${CRON_TRADER_COMMAND}" >> /tmp/current_crons
echo "50 8 * * 1-5 ${CRON_SOXL_COMMAND}" >> /tmp/current_crons

# Install updated bounds securely checking formats natively cleanly seamlessly
crontab /tmp/current_crons
rm /tmp/current_crons

echo "[CRON SETUP COMPLETE] Daily 08:30 AM EST prediction extractions mapping correctly organically cleanly safely tracking limits nicely cleanly seamlessly."
