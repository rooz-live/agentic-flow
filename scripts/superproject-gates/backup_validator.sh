#!/bin/bash

# GitLab Backup Validator Script
# Purpose: Validate backup completeness and integrity
# Author: DevOps Team
# Date: $(date +%Y-%m-%d)

set -euo pipefail

# Configuration - Load from environment variables or config file
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_DIR="${SCRIPT_DIR}/../../config"
source "${CONFIG_DIR}/environments/backup.conf"

# Logging configuration
LOG_DIR="${BACKUP_BASE_DIR}/logs"
LOG_FILE="${LOG_DIR}/backup_validation_$(date +%Y%m%d_%H%M%S).log"
VALIDATION_ID="validation_$(date +%Y%m%d_%H%M%S)"
VALIDATION_REPORT_DIR="${BACKUP_BASE_DIR}/validation_reports"

# Create necessary directories
mkdir -p "${LOG_DIR}" "${VALIDATION_REPORT_DIR}"

# Function to log messages
log() {
    local level="$1"
    shift
    local message="$*"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[${timestamp}] [${level}] ${message}" | tee -a "${LOG_FILE}"
}

# Function to validate full backup
validate_full_backup() {
    local backup_id="$1"
    local validation_report="${VALIDATION_REPORT_DIR}/${VALIDATION_ID}_full_backup_${backup_id}.json"
    
    log "INFO" "Validating full backup: ${backup_id}"
    
    local validation_results=()
    local overall_status="PASS"
    
    # Validate repositories backup
    log "INFO" "Validating repositories backup"
    local repos_backup_dir="${BACKUP_BASE_DIR}/repositories/${backup_id}"
    if [[ -d "$repos_backup_dir" ]]; then
        local repos_status="PASS"
        local repos_details=()
        
        # Check for main application backup
        local app_backup=$(find "$repos_backup_dir" -name "*_${backup_id}_gitlab_backup.tar" | head -1)
        if [[ -n "$app_backup" && -f "$app_backup" ]]; then
            repos_details+=("Application backup file exists: $(basename "$app_backup")")
            
            # Validate tar file integrity
            if tar -tf "$app_backup" > /dev/null 2>&1; then
                repos_details+=("Application backup tar file integrity: PASS")
            else
                repos_details+=("Application backup tar file integrity: FAIL")
                repos_status="FAIL"
                overall_status="FAIL"
            fi
            
            # Check backup size
            local backup_size=$(du -h "$app_backup" | cut -f1)
            repos_details+=("Application backup size: $backup_size")
        else
            repos_details+=("Application backup file: MISSING")
            repos_status="FAIL"
            overall_status="FAIL"
        fi
        
        # Check individual repositories
        local individual_repos_dir="${repos_backup_dir}/individual_repos"
        if [[ -d "$individual_repos_dir" ]]; then
            local repo_count=$(find "$individual_repos_dir" -maxdepth 1 -type d | wc -l)
            repos_details+=("Individual repositories count: $((repo_count - 1))")  # Subtract 1 for the directory itself
        else
            repos_details+=("Individual repositories directory: MISSING")
        fi
        
        validation_results+=("\"repositories\": {\"status\": \"$repos_status\", \"details\": $(printf '%s\n' "${repos_details[@]}" | jq -R . | jq -s .)}")
    else
        validation_results+=("\"repositories\": {\"status\": \"FAIL\", \"details\": [\"Repositories backup directory not found\"]}")
        overall_status="FAIL"
    fi
    
    # Validate database backup
    log "INFO" "Validating database backup"
    local db_backup_dir="${BACKUP_BASE_DIR}/database/${backup_id}"
    if [[ -d "$db_backup_dir" ]]; then
        local db_status="PASS"
        local db_details=()
        
        # Check full database dump
        local full_dump="${db_backup_dir}/gitlab_db_full.dump"
        if [[ -f "$full_dump" ]]; then
            db_details+=("Full database dump exists")
            
            # Validate dump file
            if pg_restore --list "$full_dump" > /dev/null 2>&1; then
                db_details+=("Full database dump integrity: PASS")
            else
                db_details+=("Full database dump integrity: FAIL")
                db_status="FAIL"
                overall_status="FAIL"
            fi
            
            local dump_size=$(du -h "$full_dump" | cut -f1)
            db_details+=("Full database dump size: $dump_size")
        else
            db_details+=("Full database dump: MISSING")
            db_status="FAIL"
            overall_status="FAIL"
        fi
        
        # Check schema backup
        local schema_backup="${db_backup_dir}/gitlab_db_schema.sql"
        if [[ -f "$schema_backup" ]]; then
            db_details+=("Schema backup exists")
            local schema_size=$(du -h "$schema_backup" | cut -f1)
            db_details+=("Schema backup size: $schema_size")
        else
            db_details+=("Schema backup: MISSING")
        fi
        
        # Check PITR backup
        local pitr_backup="${db_backup_dir}/gitlab_db_pitr"
        if [[ -d "$pitr_backup" ]]; then
            db_details+=("Point-in-time recovery backup exists")
        else
            db_details+=("Point-in-time recovery backup: MISSING")
        fi
        
        validation_results+=("\"database\": {\"status\": \"$db_status\", \"details\": $(printf '%s\n' "${db_details[@]}" | jq -R . | jq -s .)}")
    else
        validation_results+=("\"database\": {\"status\": \"FAIL\", \"details\": [\"Database backup directory not found\"]}")
        overall_status="FAIL"
    fi
    
    # Validate configuration backup
    log "INFO" "Validating configuration backup"
    local config_backup_dir="${BACKUP_BASE_DIR}/config/${backup_id}"
    if [[ -d "$config_backup_dir" ]]; then
        local config_status="PASS"
        local config_details=()
        
        # Check GitLab configuration
        if [[ -d "${config_backup_dir}/gitlab" ]]; then
            config_details+=("GitLab configuration directory exists")
            local config_files=$(find "${config_backup_dir}/gitlab" -type f | wc -l)
            config_details+=("GitLab configuration files count: $config_files")
        else
            config_details+=("GitLab configuration directory: MISSING")
            config_status="FAIL"
            overall_status="FAIL"
        fi
        
        # Check SSL certificates
        if [[ -d "${config_backup_dir}/ssl" ]]; then
            config_details+=("SSL certificates directory exists")
        else
            config_details+=("SSL certificates directory: MISSING (may be expected if using external certs)")
        fi
        
        # Check secrets file
        if [[ -f "${config_backup_dir}/gitlab-secrets.json" ]]; then
            config_details+=("GitLab secrets file exists")
        else
            config_details+=("GitLab secrets file: MISSING")
        fi
        
        validation_results+=("\"configuration\": {\"status\": \"$config_status\", \"details\": $(printf '%s\n' "${config_details[@]}" | jq -R . | jq -s .)}")
    else
        validation_results+=("\"configuration\": {\"status\": \"FAIL\", \"details\": [\"Configuration backup directory not found\"]}")
        overall_status="FAIL"
    fi
    
    # Validate artifacts backup
    log "INFO" "Validating artifacts backup"
    local artifacts_backup_dir="${BACKUP_BASE_DIR}/artifacts/${backup_id}"
    if [[ -d "$artifacts_backup_dir" ]]; then
        local artifacts_status="PASS"
        local artifacts_details=()
        
        # Check CI/CD artifacts
        if [[ -d "${artifacts_backup_dir}/artifacts" ]]; then
            artifacts_details+=("CI/CD artifacts directory exists")
            local artifact_count=$(find "${artifacts_backup_dir}/artifacts" -type f | wc -l)
            artifacts_details+=("CI/CD artifacts count: $artifact_count")
        else
            artifacts_details+=("CI/CD artifacts directory: MISSING")
        fi
        
        # Check LFS objects
        if [[ -d "${artifacts_backup_dir}/lfs-objects" ]]; then
            artifacts_details+=("Git LFS objects directory exists")
        else
            artifacts_details+=("Git LFS objects directory: MISSING")
        fi
        
        validation_results+=("\"artifacts\": {\"status\": \"$artifacts_status\", \"details\": $(printf '%s\n' "${artifacts_details[@]}" | jq -R . | jq -s .)}")
    else
        validation_results+=("\"artifacts\": {\"status\": \"FAIL\", \"details\": [\"Artifacts backup directory not found\"]}")
        overall_status="FAIL"
    fi
    
    # Create validation report
    cat > "$validation_report" << EOF
{
    "validation_id": "${VALIDATION_ID}",
    "backup_id": "${backup_id}",
    "backup_type": "full",
    "validation_timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "overall_status": "${overall_status}",
    "validation_results": {
        $(IFS=','; echo "${validation_results[*]}")
    },
    "validator_version": "1.0.0"
}
EOF
    
    log "INFO" "Full backup validation completed: $validation_report"
    echo "$validation_report"
}

# Function to validate incremental backup
validate_incremental_backup() {
    local backup_id="$1"
    local validation_report="${VALIDATION_REPORT_DIR}/${VALIDATION_ID}_incremental_${backup_id}.json"
    
    log "INFO" "Validating incremental backup: ${backup_id}"
    
    local validation_results=()
    local overall_status="PASS"
    
    # Validate incremental backup components
    local incremental_backup_dir="${BACKUP_BASE_DIR}/incremental/${backup_id}"
    if [[ -d "$incremental_backup_dir" ]]; then
        # Check database differential
        local db_dir="${incremental_backup_dir}/database"
        if [[ -d "$db_dir" ]]; then
            local db_status="PASS"
            if [[ -d "${db_dir}/differential" ]]; then
                validation_results+=("\"database_differential\": {\"status\": \"PASS\", \"details\": [\"Differential backup exists\"]}")
            else
                validation_results+=("\"database_differential\": {\"status\": \"FAIL\", \"details\": [\"Differential backup missing\"]}")
                overall_status="FAIL"
            fi
        else
            validation_results+=("\"database_differential\": {\"status\": \"FAIL\", \"details\": [\"Database directory missing\"]}")
            overall_status="FAIL"
        fi
        
        # Check changed repositories
        local repos_dir="${incremental_backup_dir}/repositories"
        if [[ -d "$repos_dir" ]]; then
            local changed_repos_file="${repos_dir}/changed_repos.txt"
            if [[ -f "$changed_repos_file" ]]; then
                local changed_count=$(wc -l < "$changed_repos_file")
                validation_results+=("\"changed_repositories\": {\"status\": \"PASS\", \"details\": [\"Changed repositories count: $changed_count\"]}")
            else
                validation_results+=("\"changed_repositories\": {\"status\": \"FAIL\", \"details\": [\"Changed repositories list missing\"]}")
                overall_status="FAIL"
            fi
        else
            validation_results+=("\"changed_repositories\": {\"status\": \"FAIL\", \"details\": [\"Repositories directory missing\"]}")
            overall_status="FAIL"
        fi
        
        # Check configuration changes
        local config_dir="${incremental_backup_dir}/config"
        if [[ -d "$config_dir" ]]; then
            local config_changes=$(find "$config_dir" -type f | wc -l)
            validation_results+=("\"configuration_changes\": {\"status\": \"PASS\", \"details\": [\"Configuration changes count: $config_changes\"]}")
        else
            validation_results+=("\"configuration_changes\": {\"status\": \"FAIL\", \"details\": [\"Configuration directory missing\"]}")
            overall_status="FAIL"
        fi
        
        # Check new artifacts
        local artifacts_dir="${incremental_backup_dir}/artifacts"
        if [[ -d "$artifacts_dir" ]]; then
            local new_artifacts=$(find "$artifacts_dir" -type f | wc -l)
            validation_results+=("\"new_artifacts\": {\"status\": \"PASS\", \"details\": [\"New artifacts count: $new_artifacts\"]}")
        else
            validation_results+=("\"new_artifacts\": {\"status\": \"FAIL\", \"details\": [\"Artifacts directory missing\"]}")
            overall_status="FAIL"
        fi
        
    else
        validation_results+=("\"incremental_backup\": {\"status\": \"FAIL\", \"details\": [\"Incremental backup directory not found\"]}")
        overall_status="FAIL"
    fi
    
    # Create validation report
    cat > "$validation_report" << EOF
{
    "validation_id": "${VALIDATION_ID}",
    "backup_id": "${backup_id}",
    "backup_type": "incremental",
    "validation_timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "overall_status": "${overall_status}",
    "validation_results": {
        $(IFS=','; echo "${validation_results[*]}")
    },
    "validator_version": "1.0.0"
}
EOF
    
    log "INFO" "Incremental backup validation completed: $validation_report"
    echo "$validation_report"
}

# Function to validate snapshot
validate_snapshot() {
    local snapshot_id="$1"
    local validation_report="${VALIDATION_REPORT_DIR}/${VALIDATION_ID}_snapshot_${snapshot_id}.json"
    
    log "INFO" "Validating snapshot: ${snapshot_id}"
    
    local validation_results=()
    local overall_status="PASS"
    
    local snapshot_dir="${BACKUP_BASE_DIR}/snapshots/${snapshot_id}"
    if [[ -d "$snapshot_dir" ]]; then
        # Validate snapshot components
        local components=("application" "database" "filesystem" "repositories" "cicd")
        
        for component in "${components[@]}"; do
            local component_dir="${snapshot_dir}/${component}"
            if [[ -d "$component_dir" ]]; then
                local component_size=$(du -sh "$component_dir" | cut -f1)
                local file_count=$(find "$component_dir" -type f | wc -l)
                validation_results+=("\"${component}\": {\"status\": \"PASS\", \"details\": [\"Size: $component_size\", \"Files: $file_count\"]}")
            else
                validation_results+=("\"${component}\": {\"status\": \"FAIL\", \"details\": [\"Component directory missing\"]}")
                overall_status="FAIL"
            fi
        done
        
        # Validate snapshot metadata
        local metadata_file="${snapshot_dir}/snapshot_metadata.json"
        if [[ -f "$metadata_file" ]]; then
            if jq empty "$metadata_file" 2>/dev/null; then
                validation_results+=("\"metadata\": {\"status\": \"PASS\", \"details\": [\"Metadata file valid JSON\"]}")
            else
                validation_results+=("\"metadata\": {\"status\": \"FAIL\", \"details\": [\"Metadata file invalid JSON\"]}")
                overall_status="FAIL"
            fi
        else
            validation_results+=("\"metadata\": {\"status\": \"FAIL\", \"details\": [\"Metadata file missing\"]}")
            overall_status="FAIL"
        fi
        
        # Validate verification report if exists
        local verification_file="${snapshot_dir}/verification_report.txt"
        if [[ -f "$verification_file" ]]; then
            validation_results+=("\"verification\": {\"status\": \"PASS\", \"details\": [\"Verification report exists\"]}")
        else
            validation_results+=("\"verification\": {\"status\": \"WARN\", \"details\": [\"Verification report missing\"]}")
        fi
        
    else
        validation_results+=("\"snapshot\": {\"status\": \"FAIL\", \"details\": [\"Snapshot directory not found\"]}")
        overall_status="FAIL"
    fi
    
    # Create validation report
    cat > "$validation_report" << EOF
{
    "validation_id": "${VALIDATION_ID}",
    "snapshot_id": "${snapshot_id}",
    "backup_type": "snapshot",
    "validation_timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "overall_status": "${overall_status}",
    "validation_results": {
        $(IFS=','; echo "${validation_results[*]}")
    },
    "validator_version": "1.0.0"
}
EOF
    
    log "INFO" "Snapshot validation completed: $validation_report"
    echo "$validation_report"
}

# Function to validate backup chain
validate_backup_chain() {
    local base_backup_id="$1"
    local validation_report="${VALIDATION_REPORT_DIR}/${VALIDATION_ID}_backup_chain_${base_backup_id}.json"
    
    log "INFO" "Validating backup chain starting from: ${base_backup_id}"
    
    local validation_results=()
    local overall_status="PASS"
    
    # Find base backup
    local base_backup_dir="${BACKUP_BASE_DIR}/repositories/${base_backup_id}"
    if [[ -d "$base_backup_dir" ]]; then
        validation_results+=("\"base_backup\": {\"status\": \"PASS\", \"details\": [\"Base backup found: ${base_backup_id}\"]}")
    else
        validation_results+=("\"base_backup\": {\"status\": \"FAIL\", \"details\": [\"Base backup not found: ${base_backup_id}\"]}")
        overall_status="FAIL"
    fi
    
    # Find related incremental backups
    local incremental_backups=()
    while IFS= read -r -d '' backup_dir; do
        local backup_name=$(basename "$backup_dir")
        if [[ "$backup_name" =~ ^gitlab_incremental_ ]]; then
            incremental_backups+=("$backup_name")
        fi
    done < <(find "${BACKUP_BASE_DIR}/incremental" -maxdepth 1 -type d -name "gitlab_incremental_*" -print0 | sort -z)
    
    validation_results+=("\"incremental_backups\": {\"status\": \"PASS\", \"details\": [\"Found ${#incremental_backups[@]} incremental backups\"]}")
    
    # Validate incremental backup chain
    for inc_backup in "${incremental_backups[@]}"; do
        local inc_validation=$(validate_incremental_backup "$inc_backup")
        local inc_status=$(jq -r '.overall_status' "$inc_validation")
        
        if [[ "$inc_status" == "PASS" ]]; then
            validation_results+=("\"${inc_backup}\": {\"status\": \"PASS\", \"details\": [\"Incremental backup valid\"]}")
        else
            validation_results+=("\"${inc_backup}\": {\"status\": \"FAIL\", \"details\": [\"Incremental backup invalid\"]}")
            overall_status="FAIL"
        fi
    done
    
    # Create validation report
    cat > "$validation_report" << EOF
{
    "validation_id": "${VALIDATION_ID}",
    "base_backup_id": "${base_backup_id}",
    "backup_type": "backup_chain",
    "validation_timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "overall_status": "${overall_status}",
    "validation_results": {
        $(IFS=','; echo "${validation_results[*]}")
    },
    "validator_version": "1.0.0"
}
EOF
    
    log "INFO" "Backup chain validation completed: $validation_report"
    echo "$validation_report"
}

# Function to generate validation summary
generate_validation_summary() {
    local summary_file="${VALIDATION_REPORT_DIR}/${VALIDATION_ID}_validation_summary.json"
    
    log "INFO" "Generating validation summary"
    
    # Count validation reports by status
    local total_reports=$(find "${VALIDATION_REPORT_DIR}" -name "${VALIDATION_ID}_*.json" | wc -l)
    local pass_reports=$(find "${VALIDATION_REPORT_DIR}" -name "${VALIDATION_ID}_*.json" -exec jq -r '.overall_status' {} \; | grep -c "PASS" || echo "0")
    local fail_reports=$(find "${VALIDATION_REPORT_DIR}" -name "${VALIDATION_ID}_*.json" -exec jq -r '.overall_status' {} \; | grep -c "FAIL" || echo "0")
    
    cat > "$summary_file" << EOF
{
    "validation_id": "${VALIDATION_ID}",
    "summary_timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "total_validations": $total_reports,
    "passed_validations": $pass_reports,
    "failed_validations": $fail_reports,
    "success_rate": "$(echo "scale=2; $pass_reports * 100 / $total_reports" | bc -l 2>/dev/null || echo "0")%",
    "validation_reports_dir": "${VALIDATION_REPORT_DIR}",
    "validator_version": "1.0.0"
}
EOF
    
    log "INFO" "Validation summary generated: $summary_file"
    cat "$summary_file" | tee -a "${LOG_FILE}"
}

# Function to validate all recent backups
validate_all_recent_backups() {
    log "INFO" "Validating all recent backups"
    
    local recent_days=${1:-7}
    local cutoff_date=$(date -d "${recent_days} days ago" +%Y%m%d)
    
    # Validate recent full backups
    find "${BACKUP_BASE_DIR}/repositories" -maxdepth 1 -type d -name "gitlab_backup_*" \
        | while read -r backup_dir; do
            local backup_name=$(basename "$backup_dir")
            local backup_date=$(echo "$backup_name" | sed 's/gitlab_backup_//' | cut -d'_' -f1)
            
            if [[ $backup_date -ge $cutoff_date ]]; then
                log "INFO" "Validating recent full backup: $backup_name"
                validate_full_backup "$backup_name"
            fi
        done
    
    # Validate recent snapshots
    find "${BACKUP_BASE_DIR}/snapshots" -maxdepth 1 -type d -name "gitlab_snapshot_*" \
        | while read -r snapshot_dir; do
            local snapshot_name=$(basename "$snapshot_dir")
            local snapshot_date=$(echo "$snapshot_name" | sed 's/gitlab_snapshot_//' | cut -d'_' -f1)
            
            if [[ $snapshot_date -ge $cutoff_date ]]; then
                log "INFO" "Validating recent snapshot: $snapshot_name"
                validate_snapshot "$snapshot_name"
            fi
        done
    
    # Generate summary
    generate_validation_summary
}

# Display usage information
show_usage() {
    cat << EOF
GitLab Backup Validator Usage:
==============================

Commands:
  full <backup_id>                Validate full backup
  incremental <backup_id>         Validate incremental backup
  snapshot <snapshot_id>          Validate snapshot
  chain <base_backup_id>          Validate backup chain
  all [days]                      Validate all recent backups (default: 7 days)
  summary                         Generate validation summary

Examples:
  $0 full gitlab_backup_20231126_120000      Validate specific full backup
  $0 snapshot gitlab_snapshot_20231126_120000 Validate specific snapshot
  $0 all 7                                   Validate all backups from last 7 days
  $0 chain gitlab_backup_20231120_000000     Validate backup chain from base backup

Output:
  Validation reports are saved to: ${VALIDATION_REPORT_DIR}
  Each validation generates a detailed JSON report
  Use 'summary' command to get overall validation status
EOF
}

# Main execution function
main() {
    local command="${1:-}"
    
    log "INFO" "GitLab Backup Validator started"
    log "INFO" "Command: $command"
    
    case "$command" in
        "full")
            if [[ $# -lt 2 ]]; then
                echo "Error: Missing backup ID"
                show_usage
                exit 1
            fi
            validate_full_backup "$2"
            ;;
        "incremental")
            if [[ $# -lt 2 ]]; then
                echo "Error: Missing backup ID"
                show_usage
                exit 1
            fi
            validate_incremental_backup "$2"
            ;;
        "snapshot")
            if [[ $# -lt 2 ]]; then
                echo "Error: Missing snapshot ID"
                show_usage
                exit 1
            fi
            validate_snapshot "$2"
            ;;
        "chain")
            if [[ $# -lt 2 ]]; then
                echo "Error: Missing base backup ID"
                show_usage
                exit 1
            fi
            validate_backup_chain "$2"
            ;;
        "all")
            validate_all_recent_backups "${2:-7}"
            ;;
        "summary")
            generate_validation_summary
            ;;
        *)
            echo "Error: Unknown command '$command'"
            show_usage
            exit 1
            ;;
    esac
    
    log "INFO" "GitLab Backup Validator completed"
}

# Execute main function
main "$@"