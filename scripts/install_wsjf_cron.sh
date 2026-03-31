#!/usr/bin/env bash
#
# Install WSJF Automation Cron Jobs
# Sets up daily WSJF automation and weekly health reports
#
# Usage: ./install_wsjf_cron.sh [--dry-run]
#

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
DRY_RUN=false

# Parse args
if [[ "${1:-}" == "--dry-run" ]]; then
    DRY_RUN=true
    echo "🚫 DRY RUN MODE - No changes will be made"
    echo
fi

# Cron job definitions
CRON_DAILY_WSJF="0 2 * * * cd $PROJECT_ROOT && /usr/local/bin/python3 scripts/circles/wsjf_automation_engine.py --mode auto >> logs/wsjf_automation.log 2>&1"
CRON_WEEKLY_HEALTH="0 9 * * 0 cd $PROJECT_ROOT && /usr/local/bin/python3 scripts/check_wsjf_hygiene.py >> logs/wsjf_health.log 2>&1"

echo "📅 WSJF Automation Cron Job Installer"
echo "======================================"
echo
echo "Will install:"
echo "  1. Daily WSJF automation (2am)"
echo "  2. Weekly health report (Sunday 9am)"
echo

# Check if crontab exists
if ! crontab -l > /dev/null 2>&1; then
    echo "⚠️  No existing crontab found. Will create new one."
    EXISTING_CRON=""
else
    EXISTING_CRON=$(crontab -l 2>/dev/null || echo "")
fi

# Check if already installed
if echo "$EXISTING_CRON" | grep -q "wsjf_automation_engine.py"; then
    echo "✅ Daily WSJF automation already installed"
    INSTALL_DAILY=false
else
    echo "📝 Will add: Daily WSJF automation"
    INSTALL_DAILY=true
fi

if echo "$EXISTING_CRON" | grep -q "check_wsjf_hygiene.py"; then
    echo "✅ Weekly WSJF health check already installed"
    INSTALL_WEEKLY=false
else
    echo "📝 Will add: Weekly WSJF health report"
    INSTALL_WEEKLY=true
fi

echo

# Create logs directory if needed
if [[ ! -d "$PROJECT_ROOT/logs" ]]; then
    echo "📁 Creating logs directory..."
    if [[ "$DRY_RUN" == "false" ]]; then
        mkdir -p "$PROJECT_ROOT/logs"
    fi
fi

# Build new crontab
NEW_CRON="$EXISTING_CRON"

if [[ "$INSTALL_DAILY" == "true" ]]; then
    if [[ -n "$NEW_CRON" ]]; then
        NEW_CRON="$NEW_CRON"$'\n'
    fi
    NEW_CRON="${NEW_CRON}# WSJF Automation - Daily at 2am"$'\n'
    NEW_CRON="${NEW_CRON}${CRON_DAILY_WSJF}"
fi

if [[ "$INSTALL_WEEKLY" == "true" ]]; then
    if [[ -n "$NEW_CRON" ]]; then
        NEW_CRON="$NEW_CRON"$'\n'
    fi
    NEW_CRON="${NEW_CRON}# WSJF Health Report - Weekly Sunday 9am"$'\n'
    NEW_CRON="${NEW_CRON}${CRON_WEEKLY_HEALTH}"
fi

# Preview
echo "Preview of new crontab:"
echo "─────────────────────────────────────────"
echo "$NEW_CRON"
echo "─────────────────────────────────────────"
echo

# Install
if [[ "$DRY_RUN" == "false" ]]; then
    if [[ "$INSTALL_DAILY" == "true" ]] || [[ "$INSTALL_WEEKLY" == "true" ]]; then
        echo "📥 Installing cron jobs..."
        echo "$NEW_CRON" | crontab -
        echo "✅ Cron jobs installed successfully"
        echo
        echo "Verify with: crontab -l"
    else
        echo "✅ All cron jobs already installed, nothing to do"
    fi
else
    echo "🚫 DRY RUN - Would install cron jobs shown above"
fi

echo
echo "📊 Next steps:"
echo "  1. Verify: crontab -l"
echo "  2. Test daily run: python3 scripts/circles/wsjf_automation_engine.py --mode auto"
echo "  3. Test health check: python3 scripts/check_wsjf_hygiene.py"
echo "  4. Monitor logs:"
echo "     - tail -f logs/wsjf_automation.log"
echo "     - tail -f logs/wsjf_health.log"
echo

exit 0
