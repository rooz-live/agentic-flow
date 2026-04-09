#!/bin/bash

# GitLab Backup Alerting Script
# Purpose: Send alerts for backup failures and critical issues
# Author: DevOps Team
# Date: $(date +%Y-%m-%d)

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_DIR="${SCRIPT_DIR}/../config"
source "${CONFIG_DIR}/environments/backup.conf"

# Logging configuration
LOG_DIR="${BACKUP_BASE_DIR}/logs"
LOG_FILE="${LOG_DIR}/backup_alerting_$(date +%Y%m%d_%H%M%S).log"

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

# Function to send Slack notification
send_slack_alert() {
    local severity="$1"
    local message="$2"
    local webhook_url="${SLACK_WEBHOOK_URL:-}"
    
    if [[ -n "$webhook_url" ]]; then
        local color="good"
        case "$severity" in
            "critical")
                color="danger"
                ;;
            "warning")
                color="warning"
                ;;
            "info")
                color="good"
                ;;
        esac
        
        local payload=$(cat << EOF
{
    "attachments": [
        {
            "color": "${color}",
            "title": "GitLab Backup Alert - ${severity^}",
            "text": "${message}",
            "fields": [
                {
                    "title": "Timestamp",
                    "value": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
                    "short": true
                },
                {
                    "title": "Server",
                    "value": "$(hostname)",
                    "short": true
                },
                {
                    "title": "Environment",
                    "value": "${ENVIRONMENT:-production}",
                    "short": true
                }
            ],
            "footer": "GitLab Backup Monitoring",
            "ts": $(date +%s)
        }
    ]
}
EOF
)
        
        curl -X POST -H 'Content-type: application/json' \
            --data "$payload" \
            "$webhook_url" \
            --silent \
            --show-error \
            --fail
        
        if [[ $? -eq 0 ]]; then
            log "INFO" "Slack alert sent successfully"
        else
            log "ERROR" "Failed to send Slack alert"
        fi
    else
        log "WARN" "Slack webhook URL not configured"
    fi
}

# Function to send Teams notification
send_teams_alert() {
    local severity="$1"
    local message="$2"
    local webhook_url="${TEAMS_WEBHOOK_URL:-}"
    
    if [[ -n "$webhook_url" ]]; then
        local theme_color="00FF00"
        case "$severity" in
            "critical")
                theme_color="FF0000"
                ;;
            "warning")
                theme_color="FFFF00"
                ;;
            "info")
                theme_color="00FF00"
                ;;
        esac
        
        local payload=$(cat << EOF
{
    "@type": "MessageCard",
    "@context": "http://schema.org/extensions",
    "themeColor": "${theme_color}",
    "summary": "GitLab Backup Alert - ${severity^}",
    "sections": [
        {
            "activityTitle": "GitLab Backup Monitoring",
            "activitySubtitle": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
            "facts": [
                {
                    "name": "Severity",
                    "value": "${severity^}"
                },
                {
                    "name": "Message",
                    "value": "${message}"
                },
                {
                    "name": "Server",
                    "value": "$(hostname)"
                },
                {
                    "name": "Environment",
                    "value": "${ENVIRONMENT:-production}"
                }
            ],
            "markdown": true
        }
    ]
}
EOF
)
        
        curl -X POST -H 'Content-Type: application/json' \
            --data "$payload" \
            "$webhook_url" \
            --silent \
            --show-error \
            --fail
        
        if [[ $? -eq 0 ]]; then
            log "INFO" "Teams alert sent successfully"
        else
            log "ERROR" "Failed to send Teams alert"
        fi
    else
        log "WARN" "Teams webhook URL not configured"
    fi
}

# Function to send email notification
send_email_alert() {
    local severity="$1"
    local message="$2"
    local recipient="${BACKUP_NOTIFICATION_EMAIL:-}"
    
    if [[ -n "$recipient" ]]; then
        local subject="[GitLab Backup Alert - ${severity^}] ${ENVIRONMENT:-production}"
        
        {
            echo "GitLab Backup Alert"
            echo "===================="
            echo "Severity: ${severity^}"
            echo "Message: ${message}"
            echo "Timestamp: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
            echo "Server: $(hostname)"
            echo "Environment: ${ENVIRONMENT:-production}"
            echo ""
            echo "This is an automated alert from the GitLab backup monitoring system."
        } | mail -s "$subject" "$recipient"
        
        if [[ $? -eq 0 ]]; then
            log "INFO" "Email alert sent successfully"
        else
            log "ERROR" "Failed to send email alert"
        fi
    else
        log "WARN" "Email recipient not configured"
    fi
}

# Function to send alert to all configured channels
send_alert() {
    local severity="$1"
    local message="$2"
    
    log "INFO" "Sending ${severity} alert: ${message}"
    
    # Send to all configured channels
    send_slack_alert "$severity" "$message"
    send_teams_alert "$severity" "$message"
    send_email_alert "$severity" "$message"
}

# Function to check backup failures
check_backup_failures() {
    log "INFO" "Checking for backup failures"
    
    # Check for recent backup failures
    local failed_backups=0
    local recent_minutes=60  # Check last hour
    
    if [[ -d "${BACKUP_BASE_DIR}/logs" ]]; then
        failed_backups=$(find "${BACKUP_BASE_DIR}/logs" -name "*backup_*.log" \
            -mmin -$recent_minutes \
            -exec grep -l "ERROR" {} \; | wc -l)
    fi
    
    if [[ $failed_backups -gt 0 ]]; then
        send_alert "critical" "Detected ${failed_backups} backup failure(s) in the last ${recent_minutes} minutes"
    fi
}

# Function to check backup duration
check_backup_duration() {
    log "INFO" "Checking backup duration"
    
    local max_duration_minutes=60  # Alert if backup takes more than 1 hour
    local current_duration=0
    
    # Check for currently running backup
    if [[ -f "${BACKUP_BASE_DIR}/logs/current_backup_start.txt" ]]; then
        local start_time=$(cat "${BACKUP_BASE_DIR}/logs/current_backup_start.txt")
        current_duration=$((($(date +%s) - start_time) / 60))
        
        if [[ $current_duration -gt $max_duration_minutes ]]; then
            send_alert "warning" "Backup has been running for ${current_duration} minutes (threshold: ${max_duration_minutes} minutes)"
        fi
    fi
}

# Function to check storage usage
check_storage_usage() {
    log "INFO" "Checking backup storage usage"
    
    local warning_threshold=80
    local critical_threshold=95
    local usage_percent=0
    
    if [[ -d "$BACKUP_BASE_DIR" ]]; then
        usage_percent=$(df "$BACKUP_BASE_DIR" | awk 'NR==2 {print $5}' | sed 's/%//')
    fi
    
    if [[ $usage_percent -ge $critical_threshold ]]; then
        send_alert "critical" "Backup storage usage is ${usage_percent}% (critical threshold: ${critical_threshold}%)"
    elif [[ $usage_percent -ge $warning_threshold ]]; then
        send_alert "warning" "Backup storage usage is ${usage_percent}% (warning threshold: ${warning_threshold}%)"
    fi
}

# Function to check validation failures
check_validation_failures() {
    log "INFO" "Checking for validation failures"
    
    local failed_validations=0
    local recent_minutes=120  # Check last 2 hours
    
    if [[ -d "${BACKUP_BASE_DIR}/validation_reports" ]]; then
        failed_validations=$(find "${BACKUP_BASE_DIR}/validation_reports" -name "*.json" \
            -mmin -$recent_minutes \
            -exec jq -r '.overall_status' {} \; | grep -c "FAIL" || echo "0")
    fi
    
    if [[ $failed_validations -gt 0 ]]; then
        send_alert "warning" "Detected ${failed_validations} validation failure(s) in the last ${recent_minutes} minutes"
    fi
}

# Function to check recovery operations
check_recovery_operations() {
    log "INFO" "Checking for recovery operations"
    
    local ongoing_recoveries=0
    
    # Check for ongoing recovery operations
    if [[ -f "${BACKUP_BASE_DIR}/logs/current_recovery_start.txt" ]]; then
        ongoing_recoveries=1
        send_alert "info" "Recovery operation in progress"
    fi
}

# Function to check system health
check_system_health() {
    log "INFO" "Checking system health"
    
    local health_issues=0
    local issues=()
    
    # Check disk space
    local disk_usage=$(df "$BACKUP_BASE_DIR" | awk 'NR==2 {print $5}' | sed 's/%//')
    if [[ $disk_usage -gt 90 ]]; then
        issues+=("High disk usage: ${disk_usage}%")
        ((health_issues++))
    fi
    
    # Check memory usage
    local mem_usage=$(free | awk 'NR==2{printf "%.0f", $3*100/$2}')
    if [[ ${mem_usage%.*} -gt 90 ]]; then
        issues+=("High memory usage: ${mem_usage}%")
        ((health_issues++))
    fi
    
    # Check load average
    local load_avg=$(uptime | awk -F'load average:' '{print $2}' | awk '{print $1}' | sed 's/,//')
    if [[ $(echo "$load_avg > 2.0" | bc -l) -eq 1 ]]; then
        issues+=("High load average: $load_avg")
        ((health_issues++))
    fi
    
    # Send health alert if issues found
    if [[ $health_issues -gt 0 ]]; then
        local issues_text=$(IFS=', '; echo "${issues[*]}")
        send_alert "warning" "System health issues detected: ${issues_text}"
    fi
}

# Function to generate daily summary
generate_daily_summary() {
    log "INFO" "Generating daily backup summary"
    
    local summary_date=$(date -u +%Y-%m-%d)
    local total_backups=0
    local successful_backups=0
    local failed_backups=0
    local total_size=0
    
    # Collect daily statistics
    if [[ -d "${BACKUP_BASE_DIR}/repositories" ]]; then
        total_backups=$(find "${BACKUP_BASE_DIR}/repositories" -name "gitlab_backup_${summary_date}*" -type d | wc -l)
        
        if [[ -d "${BACKUP_BASE_DIR}/validation_reports" ]]; then
            successful_backups=$(find "${BACKUP_BASE_DIR}/validation_reports" -name "*full_backup_gitlab_backup_${summary_date}*.json" \
                -exec jq -r '.overall_status' {} \; | grep -c "PASS" || echo "0")
        fi
        
        failed_backups=$((total_backups - successful_backups))
        
        # Calculate total size
        total_size=$(find "${BACKUP_BASE_DIR}/repositories" -name "gitlab_backup_${summary_date}*" -type d \
            -exec du -sb {} \; 2>/dev/null | awk '{sum += $1} END {print sum}' || echo "0")
    fi
    
    # Generate summary message
    local summary_message="Daily Backup Summary for ${summary_date}:
- Total Backups: ${total_backups}
- Successful: ${successful_backups}
- Failed: ${failed_backups}
- Total Size: $((total_size / 1024 / 1024 / 1024)) GB"
    
    # Send summary if there were backups or failures
    if [[ $total_backups -gt 0 || $failed_backups -gt 0 ]]; then
        local severity="info"
        if [[ $failed_backups -gt 0 ]]; then
            severity="warning"
        fi
        send_alert "$severity" "$summary_message"
    fi
}

# Function to setup alerting monitoring
setup_monitoring() {
    log "INFO" "Setting up backup alerting monitoring"
    
    # Create monitoring cron job
    local alert_cron="/etc/cron.d/gitlab-backup-alerting"
    cat > "$alert_cron" << EOF
# GitLab Backup Alerting Monitor
# Run every 5 minutes
*/5 * * * * ${BACKUP_USER:-root} ${SCRIPT_DIR}/backup_alerting.sh monitor >> ${LOG_DIR}/alerting_monitor.log 2>&1

# Daily summary at 8 AM
0 8 * * * ${BACKUP_USER:-root} ${SCRIPT_DIR}/backup_alerting.sh summary >> ${LOG_DIR}/daily_summary.log 2>&1
EOF
    
    chmod 644 "$alert_cron"
    log "INFO" "Alerting monitoring cron job created: $alert_cron"
}

# Function to run all checks
run_all_checks() {
    log "INFO" "Running all alerting checks"
    
    check_backup_failures
    check_backup_duration
    check_storage_usage
    check_validation_failures
    check_recovery_operations
    check_system_health
}

# Display usage information
show_usage() {
    cat << EOF
GitLab Backup Alerting Usage:
===============================

Commands:
  monitor                         Run all monitoring checks
  check_failures                 Check for backup failures
  check_duration                 Check backup duration
  check_storage                   Check storage usage
  check_validation               Check validation failures
  check_recovery                 Check recovery operations
  check_health                   Check system health
  summary                        Generate daily summary
  setup                          Setup monitoring cron job

Examples:
  $0 monitor                              Run all monitoring checks
  $0 check_failures                       Check for recent backup failures
  $0 summary                               Generate daily summary report
  $0 setup                                 Setup automated monitoring

Alert Channels:
  - Slack (if SLACK_WEBHOOK_URL configured)
  - Teams (if TEAMS_WEBHOOK_URL configured)
  - Email (if BACKUP_NOTIFICATION_EMAIL configured)

Configuration:
  Configure alert channels in backup.conf or secrets.conf
  Set appropriate thresholds for alerts
EOF
}

# Main execution function
main() {
    local command="${1:-monitor}"
    
    case "$command" in
        "monitor")
            run_all_checks
            ;;
        "check_failures")
            check_backup_failures
            ;;
        "check_duration")
            check_backup_duration
            ;;
        "check_storage")
            check_storage_usage
            ;;
        "check_validation")
            check_validation_failures
            ;;
        "check_recovery")
            check_recovery_operations
            ;;
        "check_health")
            check_system_health
            ;;
        "summary")
            generate_daily_summary
            ;;
        "setup")
            setup_monitoring
            ;;
        *)
            echo "Error: Unknown command '$command'"
            show_usage
            exit 1
            ;;
    esac
    
    log "INFO" "Backup alerting completed"
}

# Execute main function
main "$@"