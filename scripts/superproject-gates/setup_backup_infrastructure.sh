#!/bin/bash

# GitLab Backup Infrastructure Setup Script
# Purpose: Set up dedicated backup infrastructure with appropriate security controls
# Author: DevOps Team
# Date: $(date +%Y-%m-%d)

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_DIR="${SCRIPT_DIR}/../../config"
source "${CONFIG_DIR}/environments/backup.conf"

# Logging configuration
LOG_DIR="${BACKUP_BASE_DIR}/logs"
LOG_FILE="${LOG_DIR}/infrastructure_setup_$(date +%Y%m%d_%H%M%S).log"

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

# Function to check prerequisites
check_prerequisites() {
    log "INFO" "Checking prerequisites for backup infrastructure setup"
    
    # Check if running as root
    if [[ $EUID -ne 0 ]]; then
        log "ERROR" "This script must be run as root"
        exit 1
    fi
    
    # Check if required tools are installed
    for tool in useradd groupadd mkdir chmod chown systemctl; do
        if ! command -v "$tool" &> /dev/null; then
            log "ERROR" "Required tool '$tool' is not installed"
            exit 1
        fi
    done
    
    log "INFO" "Prerequisites check completed successfully"
}

# Function to create backup user and group
create_backup_user() {
    log "INFO" "Creating backup user and group"
    
    # Create backup group if it doesn't exist
    if ! getent group "${BACKUP_GROUP}" &>/dev/null; then
        groupadd "${BACKUP_GROUP}"
        log "INFO" "Created backup group: ${BACKUP_GROUP}"
    else
        log "INFO" "Backup group already exists: ${BACKUP_GROUP}"
    fi
    
    # Create backup user if it doesn't exist
    if ! getent passwd "${BACKUP_USER}" &>/dev/null; then
        useradd -r -g "${BACKUP_GROUP}" -s /bin/bash -d "${BACKUP_BASE_DIR}" "${BACKUP_USER}"
        log "INFO" "Created backup user: ${BACKUP_USER}"
    else
        log "INFO" "Backup user already exists: ${BACKUP_USER}"
    fi
    
    # Set password for backup user (disabled login)
    passwd -l "${BACKUP_USER}"
}

# Function to create backup directory structure
create_backup_directories() {
    log "INFO" "Creating backup directory structure"
    
    # Create main backup directory
    mkdir -p "${BACKUP_BASE_DIR}"
    
    # Create subdirectories
    local subdirs=(
        "repositories"
        "database"
        "config"
        "artifacts"
        "snapshots"
        "incremental"
        "logs"
        "validation_reports"
        "test_reports"
        "recovery_reports"
        "temp"
    )
    
    for subdir in "${subdirs[@]}"; do
        mkdir -p "${BACKUP_BASE_DIR}/${subdir}"
        log "INFO" "Created directory: ${BACKUP_BASE_DIR}/${subdir}"
    done
    
    # Set ownership and permissions
    chown -R "${BACKUP_USER}:${BACKUP_GROUP}" "${BACKUP_BASE_DIR}"
    chmod "${BACKUP_DIR_PERMISSIONS}" "${BACKUP_BASE_DIR}"
    find "${BACKUP_BASE_DIR}" -type d -exec chmod "${BACKUP_DIR_PERMISSIONS}" {} \;
    
    log "INFO" "Backup directory structure created and permissions set"
}

# Function to setup log rotation
setup_log_rotation() {
    log "INFO" "Setting up log rotation"
    
    local logrotate_config="/etc/logrotate.d/gitlab-backup"
    
    cat > "$logrotate_config" << EOF
${LOG_DIR}/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 640 ${BACKUP_USER} ${BACKUP_GROUP}
    postrotate
        systemctl reload rsyslog || true
    endscript
}
EOF
    
    chmod 644 "$logrotate_config"
    log "INFO" "Log rotation configured: $logrotate_config"
}

# Function to setup systemd services
setup_systemd_services() {
    log "INFO" "Setting up systemd services"
    
    # Create backup service
    local backup_service="/etc/systemd/system/gitlab-backup.service"
    cat > "$backup_service" << EOF
[Unit]
Description=GitLab Backup Service
After=network.target gitlab-runsvdir.service
Wants=network.target

[Service]
Type=oneshot
User=${BACKUP_USER}
Group=${BACKUP_GROUP}
ExecStart=${SCRIPT_DIR}/gitlab_full_backup.sh
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF
    
    # Create backup timer
    local backup_timer="/etc/systemd/system/gitlab-backup.timer"
    cat > "$backup_timer" << EOF
[Unit]
Description=Run GitLab backup daily
Requires=gitlab-backup.service

[Timer]
OnCalendar=${BACKUP_SCHEDULE_FULL:-0 2 * * *}
Persistent=true

[Install]
WantedBy=timers.target
EOF
    
    # Create snapshot service
    local snapshot_service="/etc/systemd/system/gitlab-snapshot.service"
    cat > "$snapshot_service" << EOF
[Unit]
Description=GitLab Snapshot Service
After=network.target gitlab-runsvdir.service
Wants=network.target

[Service]
Type=oneshot
User=${BACKUP_USER}
Group=${BACKUP_GROUP}
ExecStart=${SCRIPT_DIR}/gitlab_snapshot_manager.sh
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF
    
    # Reload systemd and enable services
    systemctl daemon-reload
    systemctl enable gitlab-backup.timer
    systemctl enable gitlab-snapshot.service
    
    log "INFO" "Systemd services configured and enabled"
}

# Function to setup firewall rules
setup_firewall_rules() {
    log "INFO" "Setting up firewall rules"
    
    # Check if firewall is active
    if command -v firewall-cmd &> /dev/null && systemctl is-active --quiet firewalld; then
        # Add backup service to firewall
        firewall-cmd --permanent --add-service=ssh
        firewall-cmd --permanent --add-service=nfs
        firewall-cmd --permanent --add-service=rsync
        firewall-cmd --reload
        log "INFO" "Firewall rules configured (firewalld)"
    elif command -v ufw &> /dev/null && systemctl is-active --quiet ufw; then
        # Configure UFW
        ufw allow ssh
        ufw allow nfs
        ufw allow rsync
        log "INFO" "Firewall rules configured (ufw)"
    else
        log "WARN" "No active firewall detected, manual configuration may be required"
    fi
}

# Function to setup monitoring
setup_monitoring() {
    log "INFO" "Setting up monitoring configuration"
    
    # Create monitoring configuration directory
    local monitoring_dir="${CONFIG_DIR}/monitoring"
    mkdir -p "$monitoring_dir"
    
    # Create Prometheus metrics configuration
    local prometheus_config="${monitoring_dir}/prometheus.yml"
    cat > "$prometheus_config" << EOF
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - "backup_rules.yml"

scrape_configs:
  - job_name: 'gitlab-backup'
    static_configs:
      - targets: ['localhost:9100']
    metrics_path: '/metrics'
    scrape_interval: 30s

alerting:
  alertmanagers:
    - static_configs:
        - targets:
          - alertmanager:9093
EOF
    
    # Create alerting rules
    local alert_rules="${monitoring_dir}/backup_rules.yml"
    cat > "$alert_rules" << EOF
groups:
  - name: backup_alerts
    rules:
      - alert: BackupFailure
        expr: backup_success == 0
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "GitLab backup failed"
          description: "GitLab backup has been failing for more than 5 minutes"
      
      - alert: BackupDurationHigh
        expr: backup_duration_seconds > 3600
        for: 0m
        labels:
          severity: warning
        annotations:
          summary: "GitLab backup taking too long"
          description: "GitLab backup duration is {{ \$value }} seconds, exceeding 1 hour threshold"
      
      - alert: BackupStorageUsage
        expr: backup_storage_usage_percent > 80
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Backup storage usage high"
          description: "Backup storage usage is {{ \$value }}%, exceeding 80% threshold"
EOF
    
    log "INFO" "Monitoring configuration created"
}

# Function to setup backup storage
setup_backup_storage() {
    log "INFO" "Setting up backup storage"
    
    # Check storage type and configure accordingly
    case "${BACKUP_STORAGE_TYPE}" in
        "s3")
            setup_s3_storage
            ;;
        "gcs")
            setup_gcs_storage
            ;;
        "azure")
            setup_azure_storage
            ;;
        "local"|*)
            setup_local_storage
            ;;
    esac
}

# Function to setup S3 storage
setup_s3_storage() {
    log "INFO" "Setting up S3 storage"
    
    # Install AWS CLI if not present
    if ! command -v aws &> /dev/null; then
        log "INFO" "Installing AWS CLI"
        curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
        unzip awscliv2.zip
        sudo ./aws/install
        rm -rf awscliv2.zip aws
    fi
    
    # Configure AWS credentials
    if [[ -n "${S3_ACCESS_KEY_ID:-}" && -n "${S3_SECRET_ACCESS_KEY:-}" ]]; then
        sudo -u "${BACKUP_USER}" aws configure set aws_access_key_id "$S3_ACCESS_KEY_ID"
        sudo -u "${BACKUP_USER}" aws configure set aws_secret_access_key "$S3_SECRET_ACCESS_KEY"
        sudo -u "${BACKUP_USER}" aws configure set default.region "${S3_REGION:-us-east-1}"
        log "INFO" "AWS CLI configured for backup user"
    else
        log "WARN" "S3 credentials not provided, S3 storage will not be available"
    fi
    
    # Create S3 sync script
    local s3_sync_script="${SCRIPT_DIR}/s3_sync.sh"
    cat > "$s3_sync_script" << 'EOF'
#!/bin/bash
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/../../config/environments/backup.conf"

# Sync local backups to S3
aws s3 sync "${BACKUP_BASE_DIR}" "s3://${S3_BUCKET}/gitlab-backups/" \
    --exclude "temp/*" \
    --exclude "logs/*" \
    --storage-class STANDARD_IA \
    --delete
EOF
    
    chmod +x "$s3_sync_script"
    chown "${BACKUP_USER}:${BACKUP_GROUP}" "$s3_sync_script"
    
    log "INFO" "S3 storage setup completed"
}

# Function to setup local storage
setup_local_storage() {
    log "INFO" "Setting up local storage"
    
    # Check available disk space
    local available_space=$(df -BG "${BACKUP_BASE_DIR}" | awk 'NR==2 {print $4}' | sed 's/G//')
    if [[ $available_space -lt 100 ]]; then
        log "WARN" "Insufficient disk space for local storage. Recommended: 100GB, Available: ${available_space}GB"
    fi
    
    # Create storage monitoring script
    local storage_monitor_script="${SCRIPT_DIR}/storage_monitor.sh"
    cat > "$storage_monitor_script" << 'EOF'
#!/bin/bash
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/../../config/environments/backup.conf"

# Check disk usage
usage=$(df "${BACKUP_BASE_DIR}" | awk 'NR==2 {print $5}' | sed 's/%//')
if [[ $usage -gt 85 ]]; then
    echo "WARNING: Backup storage usage is ${usage}%, exceeding 85% threshold"
    # Send alert notification here
fi
EOF
    
    chmod +x "$storage_monitor_script"
    chown "${BACKUP_USER}:${BACKUP_GROUP}" "$storage_monitor_script"
    
    log "INFO" "Local storage setup completed"
}

# Function to setup backup validation
setup_backup_validation() {
    log "INFO" "Setting up backup validation"
    
    # Create validation cron job
    local validation_cron="/etc/cron.d/gitlab-backup-validation"
    cat > "$validation_cron" << EOF
# GitLab Backup Validation
# Run validation daily at 4 AM
0 4 * * * ${BACKUP_USER} ${SCRIPT_DIR}/../validation/backup_validator.sh all 7 >> ${LOG_DIR}/daily_validation.log 2>&1
EOF
    
    chmod 644 "$validation_cron"
    
    log "INFO" "Backup validation setup completed"
}

# Function to generate setup report
generate_setup_report() {
    log "INFO" "Generating setup report"
    
    local setup_report="${BACKUP_BASE_DIR}/infrastructure_setup_report_$(date +%Y%m%d_%H%M%S).json"
    
    cat > "$setup_report" << EOF
{
    "setup_timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "backup_base_directory": "${BACKUP_BASE_DIR}",
    "backup_user": "${BACKUP_USER}",
    "backup_group": "${BACKUP_GROUP}",
    "storage_type": "${BACKUP_STORAGE_TYPE}",
    "backup_retention_days": ${BACKUP_RETENTION_DAYS:-30},
    "snapshot_retention_days": ${SNAPSHOT_RETENTION_DAYS:-14},
    "encryption_enabled": ${ENCRYPTION_ENABLED:-false},
    "monitoring_enabled": ${BACKUP_METRICS_ENABLED:-true},
    "validation_enabled": ${BACKUP_VALIDATION_ENABLED:-true},
    "setup_components": {
        "user_and_group": "completed",
        "directory_structure": "completed",
        "log_rotation": "completed",
        "systemd_services": "completed",
        "firewall_rules": "completed",
        "monitoring": "completed",
        "storage": "completed",
        "validation": "completed"
    },
    "setup_script_version": "1.0.0"
}
EOF
    
    log "INFO" "Setup report generated: $setup_report"
    cat "$setup_report"
}

# Function to verify setup
verify_setup() {
    log "INFO" "Verifying backup infrastructure setup"
    
    local verification_errors=0
    
    # Check backup user
    if ! getent passwd "${BACKUP_USER}" &>/dev/null; then
        log "ERROR" "Backup user not found: ${BACKUP_USER}"
        ((verification_errors++))
    fi
    
    # Check backup directory
    if [[ ! -d "${BACKUP_BASE_DIR}" ]]; then
        log "ERROR" "Backup directory not found: ${BACKUP_BASE_DIR}"
        ((verification_errors++))
    fi
    
    # Check systemd services
    if ! systemctl is-enabled --quiet gitlab-backup.timer; then
        log "ERROR" "GitLab backup timer not enabled"
        ((verification_errors++))
    fi
    
    # Check permissions
    local actual_owner=$(stat -c "%U:%G" "${BACKUP_BASE_DIR}")
    if [[ "$actual_owner" != "${BACKUP_USER}:${BACKUP_GROUP}" ]]; then
        log "ERROR" "Incorrect ownership on backup directory: $actual_owner"
        ((verification_errors++))
    fi
    
    if [[ $verification_errors -eq 0 ]]; then
        log "INFO" "Setup verification completed successfully"
        return 0
    else
        log "ERROR" "Setup verification failed with $verification_errors errors"
        return 1
    fi
}

# Main execution function
main() {
    log "INFO" "Starting GitLab backup infrastructure setup"
    
    check_prerequisites
    create_backup_user
    create_backup_directories
    setup_log_rotation
    setup_systemd_services
    setup_firewall_rules
    setup_monitoring
    setup_backup_storage
    setup_backup_validation
    
    generate_setup_report
    
    if verify_setup; then
        log "INFO" "GitLab backup infrastructure setup completed successfully"
        log "INFO" "Backup infrastructure is ready for use"
        log "INFO" "Run 'systemctl start gitlab-backup.timer' to start scheduled backups"
    else
        log "ERROR" "GitLab backup infrastructure setup failed"
        exit 1
    fi
}

# Execute main function
main "$@"