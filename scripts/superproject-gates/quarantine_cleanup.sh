#!/bin/bash

# Quarantine Cleanup Script
# Automates deletion of quarantined files after 7-day retention period
# Includes confirmation prompts and audit logging

LOG_FILE="quarantine_audit.log"
RETENTION_DAYS=7
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
USER=$(whoami)

# Function to log cleanup actions
log_cleanup() {
    local action="$1"
    local file="$2"
    local details="$3"
    echo "$TIMESTAMP | $action | $file | $USER | $details" >> "$LOG_FILE"
}

# Function to check if file is older than retention period
is_expired() {
    local file="$1"
    local file_date=$(stat -f "%Sm" -t "%Y-%m-%d" "$file" 2>/dev/null || date -r "$file" +"%Y-%m-%d" 2>/dev/null)
    local current_date=$(date +"%Y-%m-%d")
    local days_diff=$(( ($(date -j -f "%Y-%m-%d" "$current_date" +%s) - $(date -j -f "%Y-%m-%d" "$file_date" +%s)) / 86400 ))
    [ $days_diff -ge $RETENTION_DAYS ]
}

# Function to prompt for confirmation
confirm_deletion() {
    local file="$1"
    echo "File: $file"
    echo "This file has exceeded the $RETENTION_DAYS-day retention period."
    read -p "Confirm deletion (yes/no): " -r
    [[ $REPLY =~ ^[Yy][Ee][Ss]$ ]]
}

# Check if running in dry-run mode
DRY_RUN=false
if [ "$1" = "--dry-run" ]; then
    DRY_RUN=true
    echo "Running in DRY-RUN mode - no actual deletions will occur"
fi

echo "Starting quarantine cleanup check (Retention: $RETENTION_DAYS days)"
echo "Timestamp: $TIMESTAMP"
echo "User: $USER"
echo "---"

# Find and process expired files
for file in *.tar.gz; do
    if [ -f "$file" ] && is_expired "$file"; then
        echo "Processing expired file: $file"

        if $DRY_RUN; then
            log_cleanup "DELETION_SCHEDULED_DRYRUN" "$file" "Dry run - deletion would be confirmed"
            echo "DRY RUN: Would prompt for deletion of $file"
        else
            if confirm_deletion "$file"; then
                rm -f "$file"
                log_cleanup "DELETION_EXECUTED" "$file" "File deleted after confirmation per 7-day retention policy"
                echo "Deleted: $file"
            else
                log_cleanup "DELETION_CANCELLED" "$file" "Deletion cancelled by user"
                echo "Deletion cancelled for: $file"
            fi
        fi
    fi
done

echo "---"
echo "Cleanup check completed"
echo "Run with --dry-run to test without actual deletions"