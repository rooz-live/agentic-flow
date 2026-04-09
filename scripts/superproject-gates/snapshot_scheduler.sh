#!/bin/bash

# GitLab Snapshot Scheduler Script
# Purpose: Schedule automated snapshots before major migration steps
# Author: DevOps Team
# Date: $(date +%Y-%m-%d)

set -euo pipefail

# Configuration - Load from environment variables or config file
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_DIR="${SCRIPT_DIR}/../../config"
source "${CONFIG_DIR}/environments/backup.conf"

# Logging configuration
LOG_DIR="${BACKUP_BASE_DIR}/logs"
LOG_FILE="${LOG_DIR}/snapshot_scheduler_$(date +%Y%m%d_%H%M%S).log"

# Create necessary directories
mkdir -p "${LOG_DIR}"

# Function to log messages
log() {
    local level="$1"
    shift
    local message="$*"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[${timestamp}] [${level}] ${message}" | tee -a "${LOG_FILE}"
}

# Function to setup cron jobs for automated snapshots
setup_cron_jobs() {
    log "INFO" "Setting up cron jobs for automated snapshots"
    
    local cron_file="/etc/cron.d/gitlab-migration-snapshots"
    
    # Create cron file
    cat > "$cron_file" << EOF
# GitLab Migration Snapshot Scheduler
# This file manages automated snapshots for GitLab migration

# Pre-migration snapshot (daily at 1 AM)
0 1 * * * gitlab-backup ${SCRIPT_DIR}/gitlab_snapshot_manager.sh pre_migration_daily >> ${LOG_DIR}/pre_migration_daily.log 2>&1

# Weekly comprehensive snapshot (Sunday at 2 AM)
0 2 * * 0 gitlab-backup ${SCRIPT_DIR}/gitlab_snapshot_manager.sh weekly_comprehensive >> ${LOG_DIR}/weekly_comprehensive.log 2>&1

# Pre-migration step snapshots (triggered by migration workflow)
# These will be added dynamically by the migration workflow

# Cleanup old snapshots (daily at 3 AM)
0 3 * * * gitlab-backup find ${BACKUP_BASE_DIR}/snapshots -maxdepth 1 -type d -name "gitlab_snapshot_*" -mtime +${SNAPSHOT_RETENTION_DAYS:-14} -exec rm -rf {} \; >> ${LOG_DIR}/snapshot_cleanup.log 2>&1
EOF
    
    # Set proper permissions
    chmod 644 "$cron_file"
    
    # Reload cron service
    if command -v systemctl &> /dev/null; then
        systemctl reload cron || systemctl reload crond || log "WARN" "Could not reload cron service"
    fi
    
    log "INFO" "Cron jobs configured successfully"
}

# Function to add pre-migration step snapshot
add_pre_migration_snapshot() {
    local step_name="$1"
    local scheduled_time="${2:-now}"
    
    log "INFO" "Adding pre-migration snapshot for step: $step_name"
    
    if [[ "$scheduled_time" == "now" ]]; then
        # Execute snapshot immediately
        log "INFO" "Executing immediate snapshot for step: $step_name"
        "${SCRIPT_DIR}/gitlab_snapshot_manager.sh" "pre_migration_${step_name}"
    else
        # Schedule snapshot for specific time
        local cron_entry="$scheduled_time gitlab-backup ${SCRIPT_DIR}/gitlab_snapshot_manager.sh pre_migration_${step_name} >> ${LOG_DIR}/pre_migration_${step_name}.log 2>&1"
        
        # Add to crontab
        (crontab -l 2>/dev/null; echo "$cron_entry") | crontab -
        
        log "INFO" "Scheduled snapshot for step: $step_name at: $scheduled_time"
    fi
}

# Function to remove scheduled snapshot
remove_scheduled_snapshot() {
    local step_name="$1"
    
    log "INFO" "Removing scheduled snapshot for step: $step_name"
    
    # Remove from crontab
    crontab -l 2>/dev/null | grep -v "pre_migration_${step_name}" | crontab -
    
    log "INFO" "Removed scheduled snapshot for step: $step_name"
}

# Function to list scheduled snapshots
list_scheduled_snapshots() {
    log "INFO" "Listing scheduled snapshots"
    
    echo "Scheduled Snapshots:"
    echo "===================="
    crontab -l 2>/dev/null | grep "gitlab_snapshot_manager.sh" || echo "No scheduled snapshots found"
}

# Function to create migration workflow snapshots
create_migration_workflow_snapshots() {
    log "INFO" "Creating migration workflow snapshots"
    
    local migration_steps=(
        "pre_migration_assessment"
        "pre_backup_creation"
        "pre_target_setup"
        "pre_data_migration"
        "pre_dns_update"
        "post_migration_verification"
    )
    
    for step in "${migration_steps[@]}"; do
        log "INFO" "Scheduling snapshot for migration step: $step"
        add_pre_migration_snapshot "$step"
    done
    
    log "INFO" "Migration workflow snapshots scheduled"
}

# Function to validate snapshot schedule
validate_snapshot_schedule() {
    log "INFO" "Validating snapshot schedule"
    
    local validation_errors=0
    
    # Check if snapshot manager script exists and is executable
    if [[ ! -x "${SCRIPT_DIR}/gitlab_snapshot_manager.sh" ]]; then
        log "ERROR" "Snapshot manager script not found or not executable"
        ((validation_errors++))
    fi
    
    # Check if log directory exists and is writable
    if [[ ! -d "$LOG_DIR" || ! -w "$LOG_DIR" ]]; then
        log "ERROR" "Log directory not found or not writable: $LOG_DIR"
        ((validation_errors++))
    fi
    
    # Check if backup base directory exists
    if [[ ! -d "$BACKUP_BASE_DIR" ]]; then
        log "ERROR" "Backup base directory not found: $BACKUP_BASE_DIR"
        ((validation_errors++))
    fi
    
    # Check cron service status
    if command -v systemctl &> /dev/null; then
        if ! systemctl is-active --quiet cron && ! systemctl is-active --quiet crond; then
            log "ERROR" "Cron service is not running"
            ((validation_errors++))
        fi
    fi
    
    if [[ $validation_errors -eq 0 ]]; then
        log "INFO" "Snapshot schedule validation passed"
        return 0
    else
        log "ERROR" "Snapshot schedule validation failed with $validation_errors errors"
        return 1
    fi
}

# Function to generate snapshot schedule report
generate_schedule_report() {
    log "INFO" "Generating snapshot schedule report"
    
    local report_file="${LOG_DIR}/snapshot_schedule_report_$(date +%Y%m%d_%H%M%S).txt"
    
    {
        echo "GitLab Migration Snapshot Schedule Report"
        echo "=========================================="
        echo "Generated: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
        echo ""
        
        echo "Configuration:"
        echo "-------------"
        echo "Backup Base Directory: ${BACKUP_BASE_DIR}"
        echo "Log Directory: ${LOG_DIR}"
        echo "Snapshot Retention Days: ${SNAPSHOT_RETENTION_DAYS:-14}"
        echo ""
        
        echo "Scheduled Snapshots:"
        echo "-------------------"
        crontab -l 2>/dev/null | grep "gitlab_snapshot_manager.sh" || echo "No scheduled snapshots found"
        echo ""
        
        echo "Recent Snapshots:"
        echo "----------------"
        find "${BACKUP_BASE_DIR}/snapshots" -maxdepth 1 -type d -name "gitlab_snapshot_*" \
            -exec ls -ld {} \; 2>/dev/null | sort -k9 -r | head -10 || echo "No snapshots found"
        echo ""
        
        echo "System Status:"
        echo "--------------"
        echo "Cron Service: $(systemctl is-active cron 2>/dev/null || systemctl is-active crond 2>/dev/null || echo 'Unknown')"
        echo "Disk Space (Backup Dir): $(df -h "${BACKUP_BASE_DIR}" | awk 'NR==2 {print $4}' 2>/dev/null || echo 'Unknown')"
        echo "Available Memory: $(free -h | awk 'NR==2{print $7}' 2>/dev/null || echo 'Unknown')"
        echo ""
        
        echo "Next Scheduled Snapshots:"
        echo "-------------------------"
        # Parse crontab to show next execution times
        crontab -l 2>/dev/null | grep "gitlab_snapshot_manager.sh" | while read -r line; do
            local time_part=$(echo "$line" | awk '{print $1" "$2" "$3" "$4" "$5}')
            local command_part=$(echo "$line" | awk '{for(i=6;i<=NF;i++) printf "%s ", $i; print ""}')
            echo "Schedule: $time_part"
            echo "Command: $command_part"
            echo ""
        done
        
    } > "$report_file"
    
    log "INFO" "Snapshot schedule report generated: $report_file"
    cat "$report_file" | tee -a "${LOG_FILE}"
}

# Function to cleanup old scheduled snapshots
cleanup_old_schedules() {
    log "INFO" "Cleaning up old scheduled snapshots"
    
    # Remove completed migration step snapshots
    local completed_steps=(
        "pre_migration_assessment"
        "pre_backup_creation"
    )
    
    for step in "${completed_steps[@]}"; do
        remove_scheduled_snapshot "$step"
    done
    
    log "INFO" "Old scheduled snapshots cleanup completed"
}

# Display usage information
show_usage() {
    cat << EOF
GitLab Snapshot Scheduler Usage:
================================

Commands:
  setup                           Setup cron jobs for automated snapshots
  add <step_name> [time]          Add pre-migration snapshot for specific step
  remove <step_name>              Remove scheduled snapshot for specific step
  list                            List all scheduled snapshots
  migration                       Create migration workflow snapshots
  validate                        Validate snapshot schedule configuration
  report                          Generate snapshot schedule report
  cleanup                         Cleanup old scheduled snapshots

Examples:
  $0 setup                        Setup automated snapshot cron jobs
  $0 add pre_dns_update "0 22 * * *"  Add snapshot before DNS update at 10 PM
  $0 add pre_data_migration now   Execute immediate snapshot before data migration
  $0 list                         List all scheduled snapshots
  $0 migration                    Schedule all migration workflow snapshots
  $0 validate                     Validate snapshot configuration
  $0 report                       Generate comprehensive schedule report

Migration Steps:
  pre_migration_assessment        Before migration assessment
  pre_backup_creation             Before backup creation
  pre_target_setup                Before target environment setup
  pre_data_migration              Before data migration
  pre_dns_update                  Before DNS update
  post_migration_verification     After migration verification
EOF
}

# Main execution function
main() {
    local command="${1:-}"
    
    log "INFO" "GitLab Snapshot Scheduler started"
    log "INFO" "Command: $command"
    
    case "$command" in
        "setup")
            setup_cron_jobs
            ;;
        "add")
            if [[ $# -lt 2 ]]; then
                echo "Error: Missing step name"
                show_usage
                exit 1
            fi
            add_pre_migration_snapshot "$2" "${3:-now}"
            ;;
        "remove")
            if [[ $# -lt 2 ]]; then
                echo "Error: Missing step name"
                show_usage
                exit 1
            fi
            remove_scheduled_snapshot "$2"
            ;;
        "list")
            list_scheduled_snapshots
            ;;
        "migration")
            create_migration_workflow_snapshots
            ;;
        "validate")
            validate_snapshot_schedule
            ;;
        "report")
            generate_schedule_report
            ;;
        "cleanup")
            cleanup_old_schedules
            ;;
        *)
            echo "Error: Unknown command '$command'"
            show_usage
            exit 1
            ;;
    esac
    
    log "INFO" "GitLab Snapshot Scheduler completed"
}

# Execute main function
main "$@"