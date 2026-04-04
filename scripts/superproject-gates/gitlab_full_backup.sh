#!/bin/bash

# GitLab Full Backup Script
# Purpose: Create comprehensive backup of gitlab.yocloud.com for migration
# Author: DevOps Team
# Date: $(date +%Y-%m-%d)

set -euo pipefail

# Configuration - Load from environment variables or config file
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_DIR="${SCRIPT_DIR}/../../config"
source "${CONFIG_DIR}/environments/backup.conf"

# Logging configuration
LOG_DIR="${BACKUP_BASE_DIR}/logs"
LOG_FILE="${LOG_DIR}/gitlab_backup_$(date +%Y%m%d_%H%M%S).log"
BACKUP_ID="gitlab_backup_$(date +%Y%m%d_%H%M%S)"

# Create necessary directories
mkdir -p "${LOG_DIR}" "${BACKUP_BASE_DIR}/repositories" "${BACKUP_BASE_DIR}/database" "${BACKUP_BASE_DIR}/config" "${BACKUP_BASE_DIR}/artifacts"

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
    log "INFO" "Checking prerequisites for GitLab backup"
    
    # Check if required tools are installed
    for tool in gitlab-rake gitlab-ctl pg_dump tar gpg; do
        if ! command -v "$tool" &> /dev/null; then
            log "ERROR" "Required tool '$tool' is not installed"
            exit 1
        fi
    done
    
    # Check if GitLab services are running
    if ! gitlab-ctl status &> /dev/null; then
        log "ERROR" "GitLab services are not running properly"
        exit 1
    fi
    
    # Check disk space
    local available_space=$(df -BG "${BACKUP_BASE_DIR}" | awk 'NR==2 {print $4}' | sed 's/G//')
    if [[ $available_space -lt 50 ]]; then
        log "ERROR" "Insufficient disk space. Required: 50GB, Available: ${available_space}GB"
        exit 1
    fi
    
    log "INFO" "Prerequisites check completed successfully"
}

# Function to backup GitLab repositories
backup_repositories() {
    log "INFO" "Starting GitLab repositories backup"
    
    local repos_backup_dir="${BACKUP_BASE_DIR}/repositories/${BACKUP_ID}"
    mkdir -p "${repos_backup_dir}"
    
    # Create application backup using GitLab's built-in backup tool
    log "INFO" "Creating GitLab application backup"
    gitlab-rake gitlab:backup:create BACKUP="${BACKUP_ID}" CRON=1
    
    # Move the created backup to our repositories directory
    local latest_backup=$(find /var/opt/gitlab/backups -name "*_${BACKUP_ID}_gitlab_backup.tar" -type f | head -1)
    if [[ -n "$latest_backup" ]]; then
        mv "$latest_backup" "${repos_backup_dir}/"
        log "INFO" "GitLab application backup moved to ${repos_backup_dir}"
    else
        log "ERROR" "GitLab application backup not found"
        exit 1
    fi
    
    # Backup individual repositories for granular restore
    log "INFO" "Creating individual repository backups"
    gitlab-rake gitlab:backup:repo:create BACKUP_DIR="${repos_backup_dir}/individual_repos"
    
    log "INFO" "Repositories backup completed"
}

# Function to backup PostgreSQL database
backup_database() {
    log "INFO" "Starting PostgreSQL database backup"
    
    local db_backup_dir="${BACKUP_BASE_DIR}/database/${BACKUP_ID}"
    mkdir -p "${db_backup_dir}"
    
    # Get database connection details from GitLab configuration
    local db_name=$(gitlab-ctl get-attribute postgresql 'dbname' 2>/dev/null || echo "gitlabhq_production")
    local db_user=$(gitlab-ctl get-attribute postgresql 'username' 2>/dev/null || echo "gitlab")
    
    # Create full database dump
    log "INFO" "Creating full database dump"
    pg_dump -h /var/opt/postgresql -U "${db_user}" -d "${db_name}" \
        --format=custom \
        --compress=9 \
        --file="${db_backup_dir}/gitlab_db_full.dump"
    
    # Create schema-only backup for quick validation
    log "INFO" "Creating schema-only backup"
    pg_dump -h /var/opt/postgresql -U "${db_user}" -d "${db_name}" \
        --schema-only \
        --file="${db_backup_dir}/gitlab_db_schema.sql"
    
    # Create point-in-time recovery backup
    log "INFO" "Creating point-in-time recovery backup"
    pg_dump -h /var/opt/postgresql -U "${db_user}" -d "${db_name}" \
        --format=directory \
        --file="${db_backup_dir}/gitlab_db_pitr" \
        --jobs=4
    
    log "INFO" "Database backup completed"
}

# Function to backup GitLab configuration
backup_configuration() {
    log "INFO" "Starting GitLab configuration backup"
    
    local config_backup_dir="${BACKUP_BASE_DIR}/config/${BACKUP_ID}"
    mkdir -p "${config_backup_dir}"
    
    # Backup GitLab configuration files
    log "INFO" "Backing up GitLab configuration files"
    cp -r /etc/gitlab "${config_backup_dir}/"
    
    # Backup SSL certificates
    log "INFO" "Backing up SSL certificates"
    cp -r /etc/gitlab/ssl "${config_backup_dir}/" 2>/dev/null || log "WARN" "SSL certificates directory not found"
    
    # Backup secrets
    log "INFO" "Backing up GitLab secrets"
    cp /etc/gitlab/gitlab-secrets.json "${config_backup_dir}/" 2>/dev/null || log "WARN" "GitLab secrets file not found"
    
    # Export GitLab configuration settings
    log "INFO" "Exporting GitLab configuration settings"
    gitlab-ctl show-config > "${config_backup_dir}/gitlab_config_export.txt"
    
    # Backup custom hooks and scripts
    log "INFO" "Backing up custom hooks and scripts"
    cp -r /var/opt/gitlab/gitaly/custom_hooks "${config_backup_dir}/" 2>/dev/null || log "WARN" "Custom hooks directory not found"
    
    log "INFO" "Configuration backup completed"
}

# Function to backup CI/CD artifacts and data
backup_ci_cd_data() {
    log "INFO" "Starting CI/CD data backup"
    
    local artifacts_backup_dir="${BACKUP_BASE_DIR}/artifacts/${BACKUP_ID}"
    mkdir -p "${artifacts_backup_dir}"
    
    # Backup CI/CD artifacts
    log "INFO" "Backing up CI/CD artifacts"
    cp -r /var/opt/gitlab/gitlab-rails/shared/artifacts "${artifacts_backup_dir}/"
    
    # Backup LFS objects
    log "INFO" "Backing up Git LFS objects"
    cp -r /var/opt/gitlab/gitlab-rails/shared/lfs-objects "${artifacts_backup_dir}/" 2>/dev/null || log "WARN" "LFS objects directory not found"
    
    # Backup CI/CD runner configurations
    log "INFO" "Backing up CI/CD runner configurations"
    cp -r /etc/gitlab-runner "${artifacts_backup_dir}/" 2>/dev/null || log "WARN" "GitLab Runner configuration not found"
    
    # Backup packages registry
    log "INFO" "Backing up packages registry"
    cp -r /var/opt/gitlab/gitlab-rails/shared/packages "${artifacts_backup_dir}/" 2>/dev/null || log "WARN" "Packages registry not found"
    
    log "INFO" "CI/CD data backup completed"
}

# Function to encrypt backups
encrypt_backups() {
    log "INFO" "Starting backup encryption"
    
    if [[ -z "${ENCRYPTION_KEY:-}" ]]; then
        log "WARN" "No encryption key provided, skipping encryption"
        return 0
    fi
    
    local backup_dirs=("repositories" "database" "config" "artifacts")
    
    for dir in "${backup_dirs[@]}"; do
        local backup_path="${BACKUP_BASE_DIR}/${dir}/${BACKUP_ID}"
        if [[ -d "$backup_path" ]]; then
            log "INFO" "Encrypting ${dir} backup"
            tar -czf - "${backup_path}" | gpg --symmetric --cipher-algo AES256 --compress-algo 1 --s2k-mode 3 \
                --s2k-digest-algo SHA512 --s2k-count 65536 --passphrase-file <(echo "$ENCRYPTION_KEY") \
                --output "${backup_path}.tar.gz.gpg"
            
            # Remove unencrypted directory
            rm -rf "$backup_path"
            log "INFO" "Encrypted ${dir} backup: ${backup_path}.tar.gz.gpg"
        fi
    done
    
    log "INFO" "Backup encryption completed"
}

# Function to create backup manifest
create_backup_manifest() {
    log "INFO" "Creating backup manifest"
    
    local manifest_file="${BACKUP_BASE_DIR}/${BACKUP_ID}_manifest.json"
    
    cat > "$manifest_file" << EOF
{
    "backup_id": "${BACKUP_ID}",
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "source_instance": "gitlab.yocloud.com",
    "gitlab_version": "$(gitlab-rake gitlab:env:info | grep 'GitLab version' | cut -d' ' -f3)",
    "backup_components": {
        "repositories": {
            "path": "${BACKUP_BASE_DIR}/repositories/${BACKUP_ID}",
            "size": "$(du -sh "${BACKUP_BASE_DIR}/repositories/${BACKUP_ID}" 2>/dev/null | cut -f1 || echo 'N/A')",
            "encrypted": $([[ -n "${ENCRYPTION_KEY:-}" ]] && echo "true" || echo "false")
        },
        "database": {
            "path": "${BACKUP_BASE_DIR}/database/${BACKUP_ID}",
            "size": "$(du -sh "${BACKUP_BASE_DIR}/database/${BACKUP_ID}" 2>/dev/null | cut -f1 || echo 'N/A')",
            "encrypted": $([[ -n "${ENCRYPTION_KEY:-}" ]] && echo "true" || echo "false")
        },
        "configuration": {
            "path": "${BACKUP_BASE_DIR}/config/${BACKUP_ID}",
            "size": "$(du -sh "${BACKUP_BASE_DIR}/config/${BACKUP_ID}" 2>/dev/null | cut -f1 || echo 'N/A')",
            "encrypted": $([[ -n "${ENCRYPTION_KEY:-}" ]] && echo "true" || echo "false")
        },
        "artifacts": {
            "path": "${BACKUP_BASE_DIR}/artifacts/${BACKUP_ID}",
            "size": "$(du -sh "${BACKUP_BASE_DIR}/artifacts/${BACKUP_ID}" 2>/dev/null | cut -f1 || echo 'N/A')",
            "encrypted": $([[ -n "${ENCRYPTION_KEY:-}" ]] && echo "true" || echo "false")
        }
    },
    "total_size": "$(du -sh "${BACKUP_BASE_DIR}" 2>/dev/null | cut -f1 || echo 'N/A')",
    "log_file": "${LOG_FILE}",
    "backup_script_version": "1.0.0"
}
EOF
    
    log "INFO" "Backup manifest created: ${manifest_file}"
}

# Function to cleanup old backups
cleanup_old_backups() {
    log "INFO" "Starting cleanup of old backups"
    
    local retention_days=${BACKUP_RETENTION_DAYS:-30}
    local cutoff_date=$(date -d "${retention_days} days ago" +%Y%m%d)
    
    # Clean up old backup directories
    for dir in repositories database config artifacts; do
        find "${BACKUP_BASE_DIR}/${dir}" -maxdepth 1 -type d -name "gitlab_backup_*" \
            | while read -r backup_dir; do
                local backup_date=$(basename "$backup_dir" | sed 's/gitlab_backup_//' | cut -d'_' -f1)
                if [[ $backup_date -lt $cutoff_date ]]; then
                    log "INFO" "Removing old backup: $backup_dir"
                    rm -rf "$backup_dir"
                fi
            done
    done
    
    # Clean up old log files
    find "${LOG_DIR}" -name "gitlab_backup_*.log" -mtime +${retention_days} -delete
    
    log "INFO" "Old backup cleanup completed"
}

# Main execution function
main() {
    log "INFO" "Starting GitLab full backup process"
    log "INFO" "Backup ID: ${BACKUP_ID}"
    
    # Check prerequisites
    check_prerequisites
    
    # Execute backup components
    backup_repositories
    backup_database
    backup_configuration
    backup_ci_cd_data
    
    # Encrypt backups if key is provided
    encrypt_backups
    
    # Create backup manifest
    create_backup_manifest
    
    # Cleanup old backups
    cleanup_old_backups
    
    log "INFO" "GitLab full backup process completed successfully"
    log "INFO" "Backup location: ${BACKUP_BASE_DIR}"
    log "INFO" "Backup ID: ${BACKUP_ID}"
}

# Execute main function
main "$@"