#!/bin/bash

# GitLab Incremental Backup Script
# Purpose: Create incremental backups of gitlab.yocloud.com for frequent backup cycles
# Author: DevOps Team
# Date: $(date +%Y-%m-%d)

set -euo pipefail

# Configuration - Load from environment variables or config file
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_DIR="${SCRIPT_DIR}/../../config"
source "${CONFIG_DIR}/environments/backup.conf"

# Logging configuration
LOG_DIR="${BACKUP_BASE_DIR}/logs"
LOG_FILE="${LOG_DIR}/gitlab_incremental_backup_$(date +%Y%m%d_%H%M%S).log"
BACKUP_ID="gitlab_incremental_$(date +%Y%m%d_%H%M%S)"

# Create necessary directories
mkdir -p "${LOG_DIR}" "${BACKUP_BASE_DIR}/incremental"

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
    log "INFO" "Checking prerequisites for GitLab incremental backup"
    
    # Check if required tools are installed
    for tool in gitlab-rake gitlab-ctl pg_dump tar gpg rsync; do
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
    
    # Check if full backup exists for incremental base
    local latest_full_backup=$(find "${BACKUP_BASE_DIR}/repositories" -name "gitlab_backup_*" -type d | sort | tail -1)
    if [[ -z "$latest_full_backup" ]]; then
        log "ERROR" "No full backup found. Run full backup first."
        exit 1
    fi
    
    log "INFO" "Using full backup as base: $(basename "$latest_full_backup")"
    echo "$latest_full_backup" > "${BACKUP_BASE_DIR}/incremental/last_full_backup.txt"
    
    log "INFO" "Prerequisites check completed successfully"
}

# Function to create incremental database backup
incremental_database_backup() {
    log "INFO" "Starting incremental database backup"
    
    local db_backup_dir="${BACKUP_BASE_DIR}/incremental/${BACKUP_ID}/database"
    mkdir -p "$db_backup_dir"
    
    # Get database connection details
    local db_name=$(gitlab-ctl get-attribute postgresql 'dbname' 2>/dev/null || echo "gitlabhq_production")
    local db_user=$(gitlab-ctl get-attribute postgresql 'username' 2>/dev/null || echo "gitlab")
    
    # Create WAL backup for point-in-time recovery
    log "INFO" "Creating WAL backup for point-in-time recovery"
    pg_receivewal -h /var/opt/postgresql -U "${db_user}" -D "${db_backup_dir}/wal" --no-sync --compress=9
    
    # Create differential backup using pg_dump with --incremental if available
    log "INFO" "Creating differential database backup"
    pg_dump -h /var/opt/postgresql -U "${db_user}" -d "${db_name}" \
        --format=directory \
        --file="${db_backup_dir}/differential" \
        --jobs=4 \
        --verbose
    
    # Backup recent transaction logs
    log "INFO" "Backing up recent transaction logs"
    find /var/opt/postgresql/data/pg_wal -name "*.gz" -mtime -1 -exec cp {} "${db_backup_dir}/recent_wal/" \;
    
    log "INFO" "Incremental database backup completed"
}

# Function to backup changed repositories
incremental_repositories_backup() {
    log "INFO" "Starting incremental repositories backup"
    
    local repos_backup_dir="${BACKUP_BASE_DIR}/incremental/${BACKUP_ID}/repositories"
    mkdir -p "$repos_backup_dir"
    
    # Get list of repositories modified since last backup
    local last_backup_time=$(cat "${BACKUP_BASE_DIR}/incremental/last_backup_time.txt" 2>/dev/null || echo "1970-01-01 00:00:00")
    
    # Use GitLab API to get recently updated repositories
    log "INFO" "Identifying recently updated repositories"
    gitlab-rake gitlab:backup:repo:list --since="$last_backup_time" > "${repos_backup_dir}/changed_repos.txt"
    
    # Backup only changed repositories
    while IFS= read -r repo_path; do
        if [[ -n "$repo_path" && -e "$repo_path" ]]; then
            local repo_name=$(basename "$repo_path")
            log "INFO" "Backing up changed repository: $repo_name"
            
            # Create repository bundle
            cd "$(dirname "$repo_path")"
            git bundle create "${repos_backup_dir}/${repo_name}.bundle" --all
            cd - > /dev/null
        fi
    done < "${repos_backup_dir}/changed_repos.txt"
    
    log "INFO" "Incremental repositories backup completed"
}

# Function to backup changed configuration files
incremental_config_backup() {
    log "INFO" "Starting incremental configuration backup"
    
    local config_backup_dir="${BACKUP_BASE_DIR}/incremental/${BACKUP_ID}/config"
    mkdir -p "$config_backup_dir"
    
    # Get last backup timestamp
    local last_backup_time=$(cat "${BACKUP_BASE_DIR}/incremental/last_backup_time.txt" 2>/dev/null || echo "1970-01-01 00:00:00")
    local last_backup_epoch=$(date -d "$last_backup_time" +%s 2>/dev/null || echo 0)
    
    # Find modified configuration files
    log "INFO" "Identifying modified configuration files"
    
    # Backup /etc/gitlab changes
    find /etc/gitlab -newermt "$last_backup_time" -type f -exec cp --parents {} "${config_backup_dir}/" \;
    
    # Backup /var/opt/gitlab/config changes
    find /var/opt/gitlab/config -newermt "$last_backup_time" -type f -exec cp --parents {} "${config_backup_dir}/" \;
    
    # Export current GitLab configuration
    log "INFO" "Exporting current GitLab configuration"
    gitlab-ctl show-config > "${config_backup_dir}/gitlab_config_export_$(date +%Y%m%d_%H%M%S).txt"
    
    log "INFO" "Incremental configuration backup completed"
}

# Function to backup new CI/CD artifacts
incremental_artifacts_backup() {
    log "INFO" "Starting incremental CI/CD artifacts backup"
    
    local artifacts_backup_dir="${BACKUP_BASE_DIR}/incremental/${BACKUP_ID}/artifacts"
    mkdir -p "$artifacts_backup_dir"
    
    # Get last backup timestamp
    local last_backup_time=$(cat "${BACKUP_BASE_DIR}/incremental/last_backup_time.txt" 2>/dev/null || echo "1970-01-01 00:00:00")
    
    # Backup new artifacts
    log "INFO" "Backing up new CI/CD artifacts"
    find /var/opt/gitlab/gitlab-rails/shared/artifacts -newermt "$last_backup_time" -type f \
        -exec rsync -av --relative {} "${artifacts_backup_dir}/" \;
    
    # Backup new LFS objects
    log "INFO" "Backing up new Git LFS objects"
    find /var/opt/gitlab/gitlab-rails/shared/lfs-objects -newermt "$last_backup_time" -type f \
        -exec rsync -av --relative {} "${artifacts_backup_dir}/" \; 2>/dev/null || log "WARN" "LFS objects directory not found"
    
    # Backup new packages
    log "INFO" "Backing up new packages"
    find /var/opt/gitlab/gitlab-rails/shared/packages -newermt "$last_backup_time" -type f \
        -exec rsync -av --relative {} "${artifacts_backup_dir}/" \; 2>/dev/null || log "WARN" "Packages directory not found"
    
    log "INFO" "Incremental CI/CD artifacts backup completed"
}

# Function to create incremental backup manifest
create_incremental_manifest() {
    log "INFO" "Creating incremental backup manifest"
    
    local manifest_file="${BACKUP_BASE_DIR}/incremental/${BACKUP_ID}_manifest.json"
    local base_backup=$(cat "${BACKUP_BASE_DIR}/incremental/last_full_backup.txt" 2>/dev/null || echo "unknown")
    
    cat > "$manifest_file" << EOF
{
    "backup_id": "${BACKUP_ID}",
    "backup_type": "incremental",
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "source_instance": "gitlab.yocloud.com",
    "base_backup": "$(basename "$base_backup")",
    "gitlab_version": "$(gitlab-rake gitlab:env:info | grep 'GitLab version' | cut -d' ' -f3)",
    "backup_components": {
        "database": {
            "path": "${BACKUP_BASE_DIR}/incremental/${BACKUP_ID}/database",
            "size": "$(du -sh "${BACKUP_BASE_DIR}/incremental/${BACKUP_ID}/database" 2>/dev/null | cut -f1 || echo 'N/A')",
            "type": "differential"
        },
        "repositories": {
            "path": "${BACKUP_BASE_DIR}/incremental/${BACKUP_ID}/repositories",
            "size": "$(du -sh "${BACKUP_BASE_DIR}/incremental/${BACKUP_ID}/repositories" 2>/dev/null | cut -f1 || echo 'N/A')",
            "changed_repos": "$(wc -l < "${BACKUP_BASE_DIR}/incremental/${BACKUP_ID}/repositories/changed_repos.txt" 2>/dev/null || echo '0')"
        },
        "configuration": {
            "path": "${BACKUP_BASE_DIR}/incremental/${BACKUP_ID}/config",
            "size": "$(du -sh "${BACKUP_BASE_DIR}/incremental/${BACKUP_ID}/config" 2>/dev/null | cut -f1 || echo 'N/A')",
            "changed_files": "$(find "${BACKUP_BASE_DIR}/incremental/${BACKUP_ID}/config" -type f | wc -l)"
        },
        "artifacts": {
            "path": "${BACKUP_BASE_DIR}/incremental/${BACKUP_ID}/artifacts",
            "size": "$(du -sh "${BACKUP_BASE_DIR}/incremental/${BACKUP_ID}/artifacts" 2>/dev/null | cut -f1 || echo 'N/A')",
            "new_files": "$(find "${BACKUP_BASE_DIR}/incremental/${BACKUP_ID}/artifacts" -type f | wc -l)"
        }
    },
    "total_size": "$(du -sh "${BACKUP_BASE_DIR}/incremental/${BACKUP_ID}" 2>/dev/null | cut -f1 || echo 'N/A')",
    "log_file": "${LOG_FILE}",
    "backup_script_version": "1.0.0"
}
EOF
    
    log "INFO" "Incremental backup manifest created: ${manifest_file}"
}

# Function to update backup timestamp
update_backup_timestamp() {
    log "INFO" "Updating backup timestamp"
    echo "$(date '+%Y-%m-%d %H:%M:%S')" > "${BACKUP_BASE_DIR}/incremental/last_backup_time.txt"
    log "INFO" "Backup timestamp updated: $(cat "${BACKUP_BASE_DIR}/incremental/last_backup_time.txt")"
}

# Function to cleanup old incremental backups
cleanup_old_incremental_backups() {
    log "INFO" "Starting cleanup of old incremental backups"
    
    local retention_days=7  # Keep incremental backups for 7 days
    
    # Clean up old incremental backup directories
    find "${BACKUP_BASE_DIR}/incremental" -maxdepth 1 -type d -name "gitlab_incremental_*" \
        | while read -r backup_dir; do
            local backup_date=$(basename "$backup_dir" | sed 's/gitlab_incremental_//' | cut -d'_' -f1)
            local backup_epoch=$(date -d "${backup_date}" +%s 2>/dev/null || echo 0)
            local cutoff_epoch=$(date -d "${retention_days} days ago" +%s)
            
            if [[ $backup_epoch -lt $cutoff_epoch ]]; then
                log "INFO" "Removing old incremental backup: $backup_dir"
                rm -rf "$backup_dir"
            fi
        done
    
    log "INFO" "Old incremental backup cleanup completed"
}

# Main execution function
main() {
    log "INFO" "Starting GitLab incremental backup process"
    log "INFO" "Backup ID: ${BACKUP_ID}"
    
    # Check prerequisites
    check_prerequisites
    
    # Create backup directory
    mkdir -p "${BACKUP_BASE_DIR}/incremental/${BACKUP_ID}"
    
    # Execute incremental backup components
    incremental_database_backup
    incremental_repositories_backup
    incremental_config_backup
    incremental_artifacts_backup
    
    # Create backup manifest
    create_incremental_manifest
    
    # Update backup timestamp
    update_backup_timestamp
    
    # Cleanup old backups
    cleanup_old_incremental_backups
    
    log "INFO" "GitLab incremental backup process completed successfully"
    log "INFO" "Backup location: ${BACKUP_BASE_DIR}/incremental/${BACKUP_ID}"
    log "INFO" "Backup ID: ${BACKUP_ID}"
}

# Execute main function
main "$@"