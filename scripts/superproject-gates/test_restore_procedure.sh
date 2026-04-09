#!/bin/bash

# GitLab Test Restore Procedure Script
# Purpose: Test restore procedures in isolated environment to validate backup integrity
# Author: DevOps Team
# Date: $(date +%Y-%m-%d)

set -euo pipefail

# Configuration - Load from environment variables or config file
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_DIR="${SCRIPT_DIR}/../../config"
source "${CONFIG_DIR}/environments/backup.conf"

# Logging configuration
LOG_DIR="${BACKUP_BASE_DIR}/logs"
LOG_FILE="${LOG_DIR}/test_restore_$(date +%Y%m%d_%H%M%S).log"
TEST_RESTORE_ID="test_restore_$(date +%Y%m%d_%H%M%S)"
TEST_RESTORE_DIR="${BACKUP_BASE_DIR}/test_restores/${TEST_RESTORE_ID}"
TEST_REPORT_DIR="${BACKUP_BASE_DIR}/test_reports"

# Create necessary directories
mkdir -p "${LOG_DIR}" "${TEST_RESTORE_DIR}" "${TEST_REPORT_DIR}"

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
    log "INFO" "Checking prerequisites for test restore procedure"
    
    # Check if required tools are installed
    for tool in docker docker-compose gitlab-rake pg_restore tar jq; do
        if ! command -v "$tool" &> /dev/null; then
            log "ERROR" "Required tool '$tool' is not installed"
            exit 1
        fi
    done
    
    # Check if Docker is running
    if ! docker info &> /dev/null; then
        log "ERROR" "Docker is not running"
        exit 1
    fi
    
    # Check available disk space for test restore
    local available_space=$(df -BG "${TEST_RESTORE_DIR}" | awk 'NR==2 {print $4}' | sed 's/G//')
    if [[ $available_space -lt 50 ]]; then
        log "ERROR" "Insufficient disk space for test restore. Required: 50GB, Available: ${available_space}GB"
        exit 1
    fi
    
    log "INFO" "Prerequisites check completed successfully"
}

# Function to create isolated test environment
create_test_environment() {
    log "INFO" "Creating isolated test environment"
    
    local test_env_dir="${TEST_RESTORE_DIR}/test_environment"
    mkdir -p "$test_env_dir"
    
    # Create Docker Compose file for test GitLab instance
    cat > "${test_env_dir}/docker-compose.yml" << EOF
version: '3.8'

services:
  postgresql:
    image: postgres:13
    environment:
      POSTGRES_USER: gitlab
      POSTGRES_PASSWORD: testpassword
      POSTGRES_DB: gitlabhq_production_test
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - gitlab_test

  redis:
    image: redis:6-alpine
    networks:
      - gitlab_test

  gitlab:
    image: gitlab/gitlab-ce:latest
    hostname: gitlab-test
    environment:
      GITLAB_OMNIBUS_CONFIG: |
        external_url 'http://gitlab-test:8080'
        gitlab_rails['db_adapter'] = 'postgresql'
        gitlab_rails['db_encoding'] = 'utf8'
        gitlab_rails['db_database'] = 'gitlabhq_production_test'
        gitlab_rails['db_username'] = 'gitlab'
        gitlab_rails['db_password'] = 'testpassword'
        gitlab_rails['db_host'] = 'postgresql'
        gitlab_rails['redis_host'] = 'redis'
        gitlab_rails['gitlab_shell_ssh_port'] = 2222
        gitlab_rails['initial_root_password'] = 'testpassword123'
        gitlab_rails['backup_keep_time'] = 604800
    ports:
      - "8080:80"
      - "2222:22"
    volumes:
      - gitlab_data:/var/opt/gitlab
      - gitlab_config:/etc/gitlab
      - gitlab_logs:/var/log/gitlab
    depends_on:
      - postgresql
      - redis
    networks:
      - gitlab_test

volumes:
  postgres_data:
  gitlab_data:
  gitlab_config:
  gitlab_logs:

networks:
  gitlab_test:
    driver: bridge
EOF
    
    # Start test environment
    cd "$test_env_dir"
    docker-compose up -d
    
    # Wait for GitLab to be ready
    log "INFO" "Waiting for GitLab test environment to be ready"
    local max_attempts=30
    local attempt=1
    
    while [[ $attempt -le $max_attempts ]]; do
        if curl -f http://localhost:8080 &> /dev/null; then
            log "INFO" "GitLab test environment is ready"
            break
        fi
        
        log "INFO" "Waiting for GitLab to start... (attempt $attempt/$max_attempts)"
        sleep 30
        ((attempt++))
    done
    
    if [[ $attempt -gt $max_attempts ]]; then
        log "ERROR" "GitLab test environment failed to start within expected time"
        exit 1
    fi
    
    cd - > /dev/null
    log "INFO" "Test environment created successfully"
}

# Function to test full backup restore
test_full_backup_restore() {
    local backup_id="$1"
    local test_report="${TEST_REPORT_DIR}/${TEST_RESTORE_ID}_full_backup_${backup_id}.json"
    
    log "INFO" "Testing full backup restore: ${backup_id}"
    
    local test_results=()
    local overall_status="PASS"
    
    # Locate backup files
    local backup_dir="${BACKUP_BASE_DIR}/repositories/${backup_id}"
    if [[ ! -d "$backup_dir" ]]; then
        log "ERROR" "Backup directory not found: $backup_dir"
        overall_status="FAIL"
        test_results+=("\"backup_location\": {\"status\": \"FAIL\", \"details\": [\"Backup directory not found\"]}")
    else
        test_results+=("\"backup_location\": {\"status\": \"PASS\", \"details\": [\"Backup directory found\"]}")
        
        # Find application backup file
        local app_backup=$(find "$backup_dir" -name "*_${backup_id}_gitlab_backup.tar" | head -1)
        if [[ -n "$app_backup" && -f "$app_backup" ]]; then
            test_results+=("\"app_backup_file\": {\"status\": \"PASS\", \"details\": [\"Application backup file found\"]}")
            
            # Copy backup to test environment
            local test_backup_dir="${TEST_RESTORE_DIR}/backup_files"
            mkdir -p "$test_backup_dir"
            cp "$app_backup" "$test_backup_dir/"
            
            # Test restore in Docker container
            log "INFO" "Testing application backup restore"
            local container_id=$(docker-compose -f "${TEST_RESTORE_DIR}/test_environment/docker-compose.yml" ps -q gitlab)
            
            if [[ -n "$container_id" ]]; then
                # Copy backup to container
                docker cp "$app_backup" "${container_id}:/var/opt/gitlab/backups/"
                
                # Extract backup filename
                local backup_filename=$(basename "$app_backup")
                
                # Run restore command
                if docker exec "$container_id" gitlab-rake gitlab:backup:restore BACKUP="${backup_filename%_gitlab_backup.tar}" FORCE=yes; then
                    test_results+=("\"app_restore\": {\"status\": \"PASS\", \"details\": [\"Application backup restored successfully\"]}")
                else
                    test_results+=("\"app_restore\": {\"status\": \"FAIL\", \"details\": [\"Application backup restore failed\"]}")
                    overall_status="FAIL"
                fi
            else
                test_results+=("\"app_restore\": {\"status\": \"FAIL\", \"details\": [\"GitLab container not found\"]}")
                overall_status="FAIL"
            fi
        else
            test_results+=("\"app_backup_file\": {\"status\": \"FAIL\", \"details\": [\"Application backup file not found\"]}")
            overall_status="FAIL"
        fi
        
        # Test database restore
        log "INFO" "Testing database backup restore"
        local db_backup_dir="${BACKUP_BASE_DIR}/database/${backup_id}"
        if [[ -d "$db_backup_dir" ]]; then
            local db_backup="${db_backup_dir}/gitlab_db_full.dump"
            if [[ -f "$db_backup" ]]; then
                test_results+=("\"db_backup_file\": {\"status\": \"PASS\", \"details\": [\"Database backup file found\"]}")
                
                # Test database restore in isolated environment
                local test_db_container="test-postgres-${TEST_RESTORE_ID}"
                docker run -d --name "$test_db_container" \
                    -e POSTGRES_USER=gitlab \
                    -e POSTGRES_PASSWORD=testpassword \
                    -e POSTGRES_DB=gitlabhq_production_test \
                    postgres:13
                
                # Wait for database to be ready
                sleep 10
                
                # Test restore
                if docker exec "$test_db_container" pg_restore -h localhost -U gitlab -d gitlabhq_production_test \
                    --verbose --clean --if-exists < "$db_backup"; then
                    test_results+=("\"db_restore\": {\"status\": \"PASS\", \"details\": [\"Database backup restored successfully\"]}")
                else
                    test_results+=("\"db_restore\": {\"status\": \"FAIL\", \"details\": [\"Database backup restore failed\"]}")
                    overall_status="FAIL"
                fi
                
                # Cleanup test database container
                docker stop "$test_db_container" && docker rm "$test_db_container"
            else
                test_results+=("\"db_backup_file\": {\"status\": \"FAIL\", \"details\": [\"Database backup file not found\"]}")
                overall_status="FAIL"
            fi
        else
            test_results+=("\"db_backup_dir\": {\"status\": \"FAIL\", \"details\": [\"Database backup directory not found\"]}")
            overall_status="FAIL"
        fi
    fi
    
    # Create test report
    cat > "$test_report" << EOF
{
    "test_restore_id": "${TEST_RESTORE_ID}",
    "backup_id": "${backup_id}",
    "backup_type": "full",
    "test_timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "overall_status": "${overall_status}",
    "test_results": {
        $(IFS=','; echo "${test_results[*]}")
    },
    "test_environment": {
        "docker_compose_file": "${TEST_RESTORE_DIR}/test_environment/docker-compose.yml",
        "gitlab_url": "http://localhost:8080",
        "test_duration": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
    },
    "test_script_version": "1.0.0"
}
EOF
    
    log "INFO" "Full backup restore test completed: $test_report"
    echo "$test_report"
}

# Function to test snapshot restore
test_snapshot_restore() {
    local snapshot_id="$1"
    local test_report="${TEST_REPORT_DIR}/${TEST_RESTORE_ID}_snapshot_${snapshot_id}.json"
    
    log "INFO" "Testing snapshot restore: ${snapshot_id}"
    
    local test_results=()
    local overall_status="PASS"
    
    # Locate snapshot directory
    local snapshot_dir="${BACKUP_BASE_DIR}/snapshots/${snapshot_id}"
    if [[ ! -d "$snapshot_dir" ]]; then
        log "ERROR" "Snapshot directory not found: $snapshot_dir"
        overall_status="FAIL"
        test_results+=("\"snapshot_location\": {\"status\": \"FAIL\", \"details\": [\"Snapshot directory not found\"]}")
    else
        test_results+=("\"snapshot_location\": {\"status\": \"PASS\", \"details\": [\"Snapshot directory found\"]}")
        
        # Test each snapshot component
        local components=("application" "database" "filesystem" "repositories" "cicd")
        
        for component in "${components[@]}"; do
            local component_dir="${snapshot_dir}/${component}"
            if [[ -d "$component_dir" ]]; then
                local component_size=$(du -sh "$component_dir" | cut -f1)
                local file_count=$(find "$component_dir" -type f | wc -l)
                
                test_results+=("\"${component}_component\": {\"status\": \"PASS\", \"details\": [\"Size: $component_size\", \"Files: $file_count\"]}")
                
                # Component-specific restore tests
                case "$component" in
                    "database")
                        # Test database restore from snapshot
                        local db_snapshot="${component_dir}/gitlab_db_snapshot.dump"
                        if [[ -f "$db_snapshot" ]]; then
                            if pg_restore --list "$db_snapshot" > /dev/null 2>&1; then
                                test_results+=("\"${component}_restore_test\": {\"status\": \"PASS\", \"details\": [\"Database snapshot valid\"]}")
                            else
                                test_results+=("\"${component}_restore_test\": {\"status\": \"FAIL\", \"details\": [\"Database snapshot invalid\"]}")
                                overall_status="FAIL"
                            fi
                        fi
                        ;;
                    "repositories")
                        # Test repository bundle validity
                        local bundle_count=$(find "$component_dir" -name "*.bundle" | wc -l)
                        local valid_bundles=0
                        
                        for bundle in "$component_dir"/*.bundle; do
                            if [[ -f "$bundle" ]]; then
                                if git bundle verify "$bundle" > /dev/null 2>&1; then
                                    ((valid_bundles++))
                                fi
                            fi
                        done
                        
                        if [[ $valid_bundles -eq $bundle_count ]]; then
                            test_results+=("\"${component}_restore_test\": {\"status\": \"PASS\", \"details\": [\"All repository bundles valid\"]}")
                        else
                            test_results+=("\"${component}_restore_test\": {\"status\": \"FAIL\", \"details\": [\"${valid_bundles}/${bundle_count} repository bundles valid\"]}")
                            overall_status="FAIL"
                        fi
                        ;;
                esac
            else
                test_results+=("\"${component}_component\": {\"status\": \"FAIL\", \"details\": [\"Component directory not found\"]}")
                overall_status="FAIL"
            fi
        done
    fi
    
    # Create test report
    cat > "$test_report" << EOF
{
    "test_restore_id": "${TEST_RESTORE_ID}",
    "snapshot_id": "${snapshot_id}",
    "backup_type": "snapshot",
    "test_timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "overall_status": "${overall_status}",
    "test_results": {
        $(IFS=','; echo "${test_results[*]}")
    },
    "test_environment": {
        "snapshot_directory": "${snapshot_dir}",
        "test_duration": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
    },
    "test_script_version": "1.0.0"
}
EOF
    
    log "INFO" "Snapshot restore test completed: $test_report"
    echo "$test_report"
}

# Function to cleanup test environment
cleanup_test_environment() {
    log "INFO" "Cleaning up test environment"
    
    # Stop and remove Docker containers
    if [[ -f "${TEST_RESTORE_DIR}/test_environment/docker-compose.yml" ]]; then
        cd "${TEST_RESTORE_DIR}/test_environment"
        docker-compose down -v
        cd - > /dev/null
    fi
    
    # Remove any remaining test containers
    docker ps -a --filter "name=test-" --format "{{.Names}}" | xargs -r docker rm -f
    
    # Remove test networks
    docker network ls --filter "name=gitlab_test" --format "{{.Name}}" | xargs -r docker network rm
    
    log "INFO" "Test environment cleanup completed"
}

# Function to generate test summary
generate_test_summary() {
    local summary_file="${TEST_REPORT_DIR}/${TEST_RESTORE_ID}_test_summary.json"
    
    log "INFO" "Generating test restore summary"
    
    # Count test reports by status
    local total_tests=$(find "${TEST_REPORT_DIR}" -name "${TEST_RESTORE_ID}_*.json" | wc -l)
    local pass_tests=$(find "${TEST_REPORT_DIR}" -name "${TEST_RESTORE_ID}_*.json" -exec jq -r '.overall_status' {} \; | grep -c "PASS" || echo "0")
    local fail_tests=$(find "${TEST_REPORT_DIR}" -name "${TEST_RESTORE_ID}_*.json" -exec jq -r '.overall_status' {} \; | grep -c "FAIL" || echo "0")
    
    cat > "$summary_file" << EOF
{
    "test_restore_id": "${TEST_RESTORE_ID}",
    "summary_timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "total_tests": $total_tests,
    "passed_tests": $pass_tests,
    "failed_tests": $fail_tests,
    "success_rate": "$(echo "scale=2; $pass_tests * 100 / $total_tests" | bc -l 2>/dev/null || echo "0")%",
    "test_reports_dir": "${TEST_REPORT_DIR}",
    "test_environment_dir": "${TEST_RESTORE_DIR}",
    "test_script_version": "1.0.0"
}
EOF
    
    log "INFO" "Test restore summary generated: $summary_file"
    cat "$summary_file" | tee -a "${LOG_FILE}"
}

# Display usage information
show_usage() {
    cat << EOF
GitLab Test Restore Procedure Usage:
====================================

Commands:
  full <backup_id>                Test full backup restore
  snapshot <snapshot_id>          Test snapshot restore
  cleanup                         Cleanup test environment
  summary                         Generate test summary

Examples:
  $0 full gitlab_backup_20231126_120000      Test full backup restore
  $0 snapshot gitlab_snapshot_20231126_120000 Test snapshot restore
  $0 cleanup                                 Cleanup test environment
  $0 summary                                 Generate test summary

Environment:
  Creates isolated Docker environment for testing
  Uses temporary containers and networks
  Generates detailed test reports in JSON format
  Automatically cleans up test resources

Note:
  This script creates a temporary GitLab instance for testing
  All test data is isolated and cleaned up automatically
  Requires sufficient disk space and Docker resources
EOF
}

# Main execution function
main() {
    local command="${1:-}"
    
    log "INFO" "GitLab Test Restore Procedure started"
    log "INFO" "Command: $command"
    
    case "$command" in
        "full")
            if [[ $# -lt 2 ]]; then
                echo "Error: Missing backup ID"
                show_usage
                exit 1
            fi
            check_prerequisites
            create_test_environment
            test_full_backup_restore "$2"
            cleanup_test_environment
            generate_test_summary
            ;;
        "snapshot")
            if [[ $# -lt 2 ]]; then
                echo "Error: Missing snapshot ID"
                show_usage
                exit 1
            fi
            check_prerequisites
            test_snapshot_restore "$2"
            generate_test_summary
            ;;
        "cleanup")
            cleanup_test_environment
            ;;
        "summary")
            generate_test_summary
            ;;
        *)
            echo "Error: Unknown command '$command'"
            show_usage
            exit 1
            ;;
    esac
    
    log "INFO" "GitLab Test Restore Procedure completed"
}

# Execute main function
main "$@"