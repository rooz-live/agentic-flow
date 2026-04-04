#!/bin/bash

# Schedule Quarantine Cleanup
# Sets up cron job for automated quarantine cleanup checks
# Run manually or via cron for regular execution

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLEANUP_SCRIPT="$SCRIPT_DIR/quarantine_cleanup.sh"
LOG_FILE="$SCRIPT_DIR/quarantine_audit.log"

# Function to log scheduling actions
log_schedule() {
    local action="$1"
    local details="$2"
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    local user=$(whoami)
    echo "$timestamp | $action | SCHEDULE_SCRIPT | $user | $details" >> "$LOG_FILE"
}

# Check if cron job already exists
CRON_JOB="0 2 * * * cd $SCRIPT_DIR && ./quarantine_cleanup.sh"  # Daily at 2 AM

if crontab -l 2>/dev/null | grep -q "quarantine_cleanup.sh"; then
    echo "Cron job already exists for quarantine cleanup"
    log_schedule "SCHEDULE_EXISTS" "Daily cleanup already scheduled at 2 AM"
else
    # Add cron job
    (crontab -l 2>/dev/null; echo "$CRON_JOB") | crontab -
    if [ $? -eq 0 ]; then
        echo "Scheduled daily quarantine cleanup at 2 AM"
        log_schedule "SCHEDULE_CREATED" "Added daily cleanup job at 2 AM"
    else
        echo "Failed to schedule cron job"
        exit 1
    fi
fi

echo "Current quarantine cleanup schedule:"
crontab -l | grep quarantine_cleanup.sh