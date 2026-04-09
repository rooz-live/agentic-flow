#!/bin/bash

# GitLab Snapshot Manager Script
# Purpose: Create consistent snapshots of all GitLab components before migration steps
# Author: DevOps Team
# Date: $(date +%Y-%m-%d)

set -euo pipefail

# Configuration - Load from environment variables or config file
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_DIR="${SCRIPT_DIR}/../../config"
source "${CONFIG_DIR}/environments/backup.conf"

# Logging configuration
LOG_DIR="${BACKUP_BASE_DIR}/logs"
LOG_FILE="${LOG_DIR}/gitlab_snapshot_$(date +%Y%m%d_%H%M%S).log"
SNAPSHOT_ID="gitlab_snapshot_$(date +%Y%m%d_%H%M%S)"
SNAPSHOT_REASON="${1:-manual}"

# Create necessary directories
mkdir -p "${LOG_DIR}" "${BACKUP_BASE_DIR}/snapshots"

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
    log "INFO" "Checking prerequisites for GitLab snapshot creation"
    
    # Check if required tools are installed
    for tool in gitlab-rake gitlab-ctl lvm lvcreate mount umount tar; do
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
    
    # Check available disk space for snapshots
    local available_space=$(df -BG "${BACKUP_BASE_DIR}" | awk 'NR==2 {print $4}' | sed 's/G//')
    if [[ $available_space -lt 100 ]]; then
        log "ERROR" "Insufficient disk space for snapshots. Required: 100GB, Available: ${available_space}GB"
        exit 1
    fi
    
    log "INFO" "Prerequisites check completed successfully"
}

# Function to create application-level snapshot
create_application_snapshot() {
    log "INFO" "Creating application-level snapshot"
    
    local app_snapshot_dir="${BACKUP_BASE_DIR}/snapshots/${SNAPSHOT_ID}/application"
    mkdir -p "$app_snapshot_dir"
    
    # Put GitLab in maintenance mode to ensure consistency
    log "INFO" "Putting GitLab in maintenance mode"
    gitlab-ctl deploy-page-up
    
    # Create consistent database state
    log "INFO" "Creating consistent database state"
    gitlab-rake gitlab:db:lock_writes
    
    # Export current GitLab state
    log "INFO" "Exporting GitLab application state"
    gitlab-rake gitlab:backup:create BACKUP="snapshot_${SNAPSHOT_ID}" SKIP=repositories,db
    
    # Move the application backup to snapshot directory
    local latest_backup=$(find /var/opt/gitlab/backups -name "*_snapshot_${SNAPSHOT_ID}_gitlab_backup.tar" -type f | head -1)
    if [[ -n "$latest_backup" ]]; then
        mv "$latest_backup" "${app_snapshot_dir}/"
        log "INFO" "Application snapshot moved to ${app_snapshot_dir}"
    else
        log "ERROR" "Application snapshot creation failed"
        exit 1
    fi
    
    # Unlock database writes
    log "INFO" "Unlocking database writes"
    gitlab-rake gitlab:db:unlock_writes
    
    # Take GitLab out of maintenance mode
    log "INFO" "Taking GitLab out of maintenance mode"
    gitlab-ctl deploy-page-down
    
    log "INFO" "Application-level snapshot completed"
}

# Function to create database snapshot
create_database_snapshot() {
    log "INFO" "Creating database snapshot"
    
    local db_snapshot_dir="${BACKUP_BASE_DIR}/snapshots/${SNAPSHOT_ID}/database"
    mkdir -p "$db_snapshot_dir"
    
    # Get database connection details
    local db_name=$(gitlab-ctl get-attribute postgresql 'dbname' 2>/dev/null || echo "gitlabhq_production")
    local db_user=$(gitlab-ctl get-attribute postgresql 'username' 2>/dev/null || echo "gitlab")
    
    # Create consistent database snapshot
    log "INFO" "Creating consistent database snapshot"
    pg_dump -h /var/opt/postgresql -U "${db_user}" -d "${db_name}" \
        --format=custom \
        --compress=9 \
        --verbose \
        --file="${db_snapshot_dir}/gitlab_db_snapshot.dump"
    
    # Create transaction log backup for point-in-time recovery
    log "INFO" "Creating transaction log backup for point-in-time recovery"
    pg_receivewal -h /var/opt/postgresql -U "${db_user}" -D "${db_snapshot_dir}/wal" --no-sync --compress=9
    
    # Create database statistics snapshot
    log "INFO" "Creating database statistics snapshot"
    psql -h /var/opt/postgresql -U "${db_user}" -d "${db_name}" -c "SELECT * FROM pg_stat_database;" > "${db_snapshot_dir}/db_stats.txt"
    
    log "INFO" "Database snapshot completed"
}

# Function to create filesystem snapshot
create_filesystem_snapshot() {
    log "INFO" "Creating filesystem snapshot"
    
    local fs_snapshot_dir="${BACKUP_BASE_DIR}/snapshots/${SNAPSHOT_ID}/filesystem"
    mkdir -p "$fs_snapshot_dir"
    
    # Identify GitLab data directories
    local data_dirs=(
        "/var/opt/gitlab"
        "/opt/gitlab"
        "/etc/gitlab"
    )
    
    # Create LVM snapshots if available
    if command -v lvcreate &> /dev/null; then
        log "INFO" "Attempting to create LVM snapshots"
        
        for dir in "${data_dirs[@]}"; do
            if [[ -d "$dir" ]]; then
                local mount_point=$(df "$dir" | awk 'NR==2 {print $1}')
                local vg_name=$(lvs --noheadings -o vg_name "$mount_point" 2>/dev/null || echo "")
                
                if [[ -n "$vg_name" ]]; then
                    local lv_name=$(basename "$dir")
                    local snapshot_name="snapshot_${lv_name}_${SNAPSHOT_ID}"
                    
                    log "INFO" "Creating LVM snapshot: $snapshot_name"
                    lvcreate -L 10G -s -n "$snapshot_name" "$vg_name/$lv_name" || \
                        log "WARN" "Failed to create LVM snapshot for $dir"
                else
                    log "WARN" "No volume group found for $dir, using filesystem backup"
                fi
            fi
        done
    fi
    
    # Create filesystem backups for critical directories
    for dir in "${data_dirs[@]}"; do
        if [[ -d "$dir" ]]; then
            local dir_name=$(basename "$dir")
            log "INFO" "Creating filesystem backup for $dir"
            
            # Create compressed tar backup
            tar -czf "${fs_snapshot_dir}/${dir_name}_snapshot.tar.gz" -C "$(dirname "$dir")" "$(basename "$dir")" || \
                log "WARN" "Failed to create filesystem backup for $dir"
        fi
    done
    
    log "INFO" "Filesystem snapshot completed"
}

# Function to create repositories snapshot
create_repositories_snapshot() {
    log "INFO" "Creating repositories snapshot"
    
    local repos_snapshot_dir="${BACKUP_BASE_DIR}/snapshots/${SNAPSHOT_ID}/repositories"
    mkdir -p "$repos_snapshot_dir"
    
    # Get list of all repositories
    log "INFO" "Discovering all repositories"
    gitlab-rake gitlab:backup:repo:list > "${repos_snapshot_dir}/all_repositories.txt"
    
    # Create repository bundles
    log "INFO" "Creating repository bundles"
    local repo_count=0
    local total_repos=$(wc -l < "${repos_snapshot_dir}/all_repositories.txt")
    
    while IFS= read -r repo_path; do
        if [[ -n "$repo_path" && -e "$repo_path" ]]; then
            ((repo_count++))
            local repo_name=$(basename "$repo_path" | sed 's/.git$//')
            
            log "INFO" "Creating bundle for repository $repo_count/$total_repos: $repo_name"
            
            # Create repository bundle
            cd "$(dirname "$repo_path")"
            git bundle create "${repos_snapshot_dir}/${repo_name}.bundle" --all
            cd - > /dev/null
            
            # Create repository metadata
            cd "$repo_path"
            {
                echo "Repository: $repo_name"
                echo "Path: $repo_path"
                echo "Last commit: $(git log -1 --format='%H %s %ai' 2>/dev/null || echo 'N/A')"
                echo "Branch count: $(git branch -a | wc -l)"
                echo "Tag count: $(git tag | wc -l)"
                echo "Size: $(du -sh . | cut -f1)"
                echo "---"
            } >> "${repos_snapshot_dir}/repository_metadata.txt"
            cd - > /dev/null
        fi
    done < "${repos_snapshot_dir}/all_repositories.txt"
    
    log "INFO" "Repositories snapshot completed: $repo_count repositories processed"
}

# Function to create CI/CD components snapshot
create_cicd_snapshot() {
    log "INFO" "Creating CI/CD components snapshot"
    
    local cicd_snapshot_dir="${BACKUP_BASE_DIR}/snapshots/${SNAPSHOT_ID}/cicd"
    mkdir -p "$cicd_snapshot_dir"
    
    # Export CI/CD configuration
    log "INFO" "Exporting CI/CD configuration"
    
    # Backup CI/CD variables
    gitlab-rake gitlab:ci:variables:list > "${cicd_snapshot_dir}/ci_variables.txt" 2>/dev/null || \
        log "WARN" "Failed to export CI/CD variables"
    
    # Backup runner configurations
    if [[ -d /etc/gitlab-runner ]]; then
        cp -r /etc/gitlab-runner "${cicd_snapshot_dir}/"
        log "INFO" "GitLab Runner configuration backed up"
    fi
    
    # Backup CI/CD templates
    if [[ -d /var/opt/gitlab/gitlab-rails/shared/ci_templates ]]; then
        cp -r /var/opt/gitlab/gitlab-rails/shared/ci_templates "${cicd_snapshot_dir}/"
        log "INFO" "CI/CD templates backed up"
    fi
    
    # Export active pipeline information
    log "INFO" "Exporting active pipeline information"
    gitlab-rake gitlab:ci:pipelines:list --status=running > "${cicd_snapshot_dir}/active_pipelines.txt" 2>/dev/null || \
        log "WARN" "Failed to export active pipelines"
    
    log "INFO" "CI/CD components snapshot completed"
}

# Function to create snapshot metadata
create_snapshot_metadata() {
    log "INFO" "Creating snapshot metadata"
    
    local metadata_file="${BACKUP_BASE_DIR}/snapshots/${SNAPSHOT_ID}/snapshot_metadata.json"
    
    # Get system information
    local gitlab_version=$(gitlab-rake gitlab:env:info | grep 'GitLab version' | cut -d' ' -f3)
    local postgres_version=$(gitlab-ctl get-attribute postgresql 'version' 2>/dev/null || echo "unknown")
    local redis_version=$(gitlab-ctl get-attribute redis 'version' 2>/dev/null || echo "unknown")
    
    # Calculate snapshot sizes
    local app_size=$(du -sh "${BACKUP_BASE_DIR}/snapshots/${SNAPSHOT_ID}/application" 2>/dev/null | cut -f1 || echo "0")
    local db_size=$(du -sh "${BACKUP_BASE_DIR}/snapshots/${SNAPSHOT_ID}/database" 2>/dev/null | cut -f1 || echo "0")
    local fs_size=$(du -sh "${BACKUP_BASE_DIR}/snapshots/${SNAPSHOT_ID}/filesystem" 2>/dev/null | cut -f1 || echo "0")
    local repos_size=$(du -sh "${BACKUP_BASE_DIR}/snapshots/${SNAPSHOT_ID}/repositories" 2>/dev/null | cut -f1 || echo "0")
    local cicd_size=$(du -sh "${BACKUP_BASE_DIR}/snapshots/${SNAPSHOT_ID}/cicd" 2>/dev/null | cut -f1 || echo "0")
    
    cat > "$metadata_file" << EOF
{
    "snapshot_id": "${SNAPSHOT_ID}",
    "snapshot_reason": "${SNAPSHOT_REASON}",
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "source_instance": "gitlab.yocloud.com",
    "gitlab_version": "${gitlab_version}",
    "system_components": {
        "postgresql_version": "${postgres_version}",
        "redis_version": "${redis_version}",
        "os_version": "$(uname -a)",
        "kernel_version": "$(uname -r)"
    },
    "snapshot_components": {
        "application": {
            "path": "${BACKUP_BASE_DIR}/snapshots/${SNAPSHOT_ID}/application",
            "size": "${app_size}",
            "created": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
        },
        "database": {
            "path": "${BACKUP_BASE_DIR}/snapshots/${SNAPSHOT_ID}/database",
            "size": "${db_size}",
            "created": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
        },
        "filesystem": {
            "path": "${BACKUP_BASE_DIR}/snapshots/${SNAPSHOT_ID}/filesystem",
            "size": "${fs_size}",
            "created": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
        },
        "repositories": {
            "path": "${BACKUP_BASE_DIR}/snapshots/${SNAPSHOT_ID}/repositories",
            "size": "${repos_size}",
            "created": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
        },
        "cicd": {
            "path": "${BACKUP_BASE_DIR}/snapshots/${SNAPSHOT_ID}/cicd",
            "size": "${cicd_size}",
            "created": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
        }
    },
    "total_size": "$(du -sh "${BACKUP_BASE_DIR}/snapshots/${SNAPSHOT_ID}" | cut -f1)",
    "log_file": "${LOG_FILE}",
    "snapshot_script_version": "1.0.0",
    "checksum": "$(find "${BACKUP_BASE_DIR}/snapshots/${SNAPSHOT_ID}" -type f -exec sha256sum {} \; | sort | sha256sum | cut -d' ' -f1)"
}
EOF
    
    log "INFO" "Snapshot metadata created: ${metadata_file}"
}

# Function to verify snapshot integrity
verify_snapshot_integrity() {
    log "INFO" "Verifying snapshot integrity"
    
    local snapshot_dir="${BACKUP_BASE_DIR}/snapshots/${SNAPSHOT_ID}"
    local verification_file="${snapshot_dir}/verification_report.txt"
    
    {
        echo "Snapshot Verification Report"
        echo "==========================="
        echo "Snapshot ID: ${SNAPSHOT_ID}"
        echo "Verification Date: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
        echo ""
        
        # Verify application backup
        echo "Application Backup Verification:"
        if [[ -f "${snapshot_dir}/application/"*"_gitlab_backup.tar" ]]; then
            echo "✓ Application backup file exists"
            local app_file=$(find "${snapshot_dir}/application" -name "*_gitlab_backup.tar" | head -1)
            if tar -tf "$app_file" > /dev/null 2>&1; then
                echo "✓ Application backup file is valid"
            else
                echo "✗ Application backup file is corrupted"
            fi
        else
            echo "✗ Application backup file missing"
        fi
        echo ""
        
        # Verify database backup
        echo "Database Backup Verification:"
        if [[ -f "${snapshot_dir}/database/gitlab_db_snapshot.dump" ]]; then
            echo "✓ Database backup file exists"
            if pg_restore --list "${snapshot_dir}/database/gitlab_db_snapshot.dump" > /dev/null 2>&1; then
                echo "✓ Database backup file is valid"
            else
                echo "✗ Database backup file is corrupted"
            fi
        else
            echo "✗ Database backup file missing"
        fi
        echo ""
        
        # Verify repository bundles
        echo "Repository Bundles Verification:"
        local bundle_count=$(find "${snapshot_dir}/repositories" -name "*.bundle" | wc -l)
        echo "Found ${bundle_count} repository bundles"
        
        local valid_bundles=0
        for bundle in "${snapshot_dir}/repositories"/*.bundle; do
            if [[ -f "$bundle" ]]; then
                if git bundle verify "$bundle" > /dev/null 2>&1; then
                    ((valid_bundles++))
                fi
            fi
        done
        echo "✓ ${valid_bundles}/${bundle_count} repository bundles are valid"
        echo ""
        
        # Calculate overall checksum
        echo "Overall Integrity Check:"
        local calculated_checksum=$(find "$snapshot_dir" -type f -not -name "verification_report.txt" -exec sha256sum {} \; | sort | sha256sum | cut -d' ' -f1)
        echo "Calculated Checksum: ${calculated_checksum}"
        
        # Compare with metadata checksum if available
        if [[ -f "${snapshot_dir}/snapshot_metadata.json" ]]; then
            local metadata_checksum=$(grep -o '"checksum": *"[^"]*"' "${snapshot_dir}/snapshot_metadata.json" | cut -d'"' -f4)
            if [[ "$calculated_checksum" == "$metadata_checksum" ]]; then
                echo "✓ Checksum verification passed"
            else
                echo "✗ Checksum verification failed"
                echo "Expected: ${metadata_checksum}"
                echo "Actual: ${calculated_checksum}"
            fi
        fi
        
    } > "$verification_file"
    
    log "INFO" "Snapshot verification completed: ${verification_file}"
    cat "$verification_file" | tee -a "${LOG_FILE}"
}

# Function to cleanup old snapshots
cleanup_old_snapshots() {
    log "INFO" "Starting cleanup of old snapshots"
    
    local retention_days=${SNAPSHOT_RETENTION_DAYS:-14}
    local cutoff_date=$(date -d "${retention_days} days ago" +%Y%m%d)
    
    # Clean up old snapshot directories
    find "${BACKUP_BASE_DIR}/snapshots" -maxdepth 1 -type d -name "gitlab_snapshot_*" \
        | while read -r snapshot_dir; do
            local snapshot_date=$(basename "$snapshot_dir" | sed 's/gitlab_snapshot_//' | cut -d'_' -f1)
            if [[ $snapshot_date -lt $cutoff_date ]]; then
                log "INFO" "Removing old snapshot: $snapshot_dir"
                rm -rf "$snapshot_dir"
            fi
        done
    
    log "INFO" "Old snapshot cleanup completed"
}

# Main execution function
main() {
    log "INFO" "Starting GitLab snapshot creation process"
    log "INFO" "Snapshot ID: ${SNAPSHOT_ID}"
    log "INFO" "Snapshot Reason: ${SNAPSHOT_REASON}"
    
    # Check prerequisites
    check_prerequisites
    
    # Create snapshot directory
    mkdir -p "${BACKUP_BASE_DIR}/snapshots/${SNAPSHOT_ID}"
    
    # Execute snapshot creation components
    create_application_snapshot
    create_database_snapshot
    create_filesystem_snapshot
    create_repositories_snapshot
    create_cicd_snapshot
    
    # Create snapshot metadata
    create_snapshot_metadata
    
    # Verify snapshot integrity
    verify_snapshot_integrity
    
    # Cleanup old snapshots
    cleanup_old_snapshots
    
    log "INFO" "GitLab snapshot creation process completed successfully"
    log "INFO" "Snapshot location: ${BACKUP_BASE_DIR}/snapshots/${SNAPSHOT_ID}"
    log "INFO" "Snapshot ID: ${SNAPSHOT_ID}"
    log "INFO" "Snapshot Reason: ${SNAPSHOT_REASON}"
}

# Execute main function
main "$@"