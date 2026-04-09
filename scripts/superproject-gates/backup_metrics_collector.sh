#!/bin/bash

# GitLab Backup Metrics Collector Script
# Purpose: Collect and expose backup metrics for monitoring
# Author: DevOps Team
# Date: $(date +%Y-%m-%d)

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_DIR="${SCRIPT_DIR}/../config"
source "${CONFIG_DIR}/environments/backup.conf"

# Metrics configuration
METRICS_FILE="/tmp/gitlab_backup_metrics.prom"
METRICS_PORT="9100"
PUSHGATEWAY_URL="${PROMETHEUS_PUSHGATEWAY_URL:-http://localhost:9091}"

# Function to log messages
log() {
    local level="$1"
    shift
    local message="$*"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[${timestamp}] [${level}] ${message}"
}

# Function to collect backup metrics
collect_backup_metrics() {
    log "INFO" "Collecting backup metrics"
    
    # Initialize metrics file
    cat > "$METRICS_FILE" << EOF
# HELP gitlab_backup_success Indicates if backup completed successfully (1) or failed (0)
# TYPE gitlab_backup_success gauge
gitlab_backup_success 0

# HELP gitlab_backup_duration_seconds Time taken to complete backup in seconds
# TYPE gitlab_backup_duration_seconds gauge
gitlab_backup_duration_seconds 0

# HELP gitlab_backup_size_bytes Size of backup in bytes
# TYPE gitlab_backup_size_bytes gauge
gitlab_backup_size_bytes 0

# HELP gitlab_backup_components Number of components backed up
# TYPE gitlab_backup_components gauge
gitlab_backup_components 0

# HELP gitlab_backup_validation_success Indicates if backup validation passed (1) or failed (0)
# TYPE gitlab_backup_validation_success gauge
gitlab_backup_validation_success 0

# HELP gitlab_backup_storage_usage_percent Percentage of backup storage used
# TYPE gitlab_backup_storage_usage_percent gauge
gitlab_backup_storage_usage_percent 0

# HELP gitlab_backup_retention_days Number of days backups are retained
# TYPE gitlab_backup_retention_days gauge
gitlab_backup_retention_days ${BACKUP_RETENTION_DAYS:-30}

# HELP gitlab_backup_last_success_timestamp Unix timestamp of last successful backup
# TYPE gitlab_backup_last_success_timestamp gauge
gitlab_backup_last_success_timestamp 0

# HELP gitlab_backup_last_failure_timestamp Unix timestamp of last failed backup
# TYPE gitlab_backup_last_failure_timestamp gauge
gitlab_backup_last_failure_timestamp 0

# HELP gitlab_backup_total_count Total number of backups
# TYPE gitlab_backup_total_count counter
gitlab_backup_total_count 0

# HELP gitlab_backup_failure_count Total number of backup failures
# TYPE gitlab_backup_failure_count counter
gitlab_backup_failure_count 0
EOF
    
    # Collect backup statistics
    collect_backup_statistics
    
    # Collect storage metrics
    collect_storage_metrics
    
    # Collect validation metrics
    collect_validation_metrics
    
    # Collect recovery metrics
    collect_recovery_metrics
}

# Function to collect backup statistics
collect_backup_statistics() {
    log "INFO" "Collecting backup statistics"
    
    # Count total backups
    local total_backups=0
    if [[ -d "${BACKUP_BASE_DIR}/repositories" ]]; then
        total_backups=$(find "${BACKUP_BASE_DIR}/repositories" -maxdepth 1 -type d -name "gitlab_backup_*" | wc -l)
    fi
    
    # Count successful backups (based on validation reports)
    local successful_backups=0
    if [[ -d "${BACKUP_BASE_DIR}/validation_reports" ]]; then
        successful_backups=$(find "${BACKUP_BASE_DIR}/validation_reports" -name "*_full_backup_*.json" \
            -exec jq -r '.overall_status' {} \; | grep -c "PASS" || echo "0")
    fi
    
    # Count failed backups
    local failed_backups=$((total_backups - successful_backups))
    
    # Get last successful backup timestamp
    local last_success_timestamp=0
    local latest_backup=$(find "${BACKUP_BASE_DIR}/repositories" -maxdepth 1 -type d -name "gitlab_backup_*" \
            -exec stat -c "%Y" {} \; | sort -nr | head -1)
    if [[ -n "$latest_backup" ]]; then
        last_success_timestamp=$latest_backup
    fi
    
    # Update metrics
    sed -i "s/gitlab_backup_total_count 0/gitlab_backup_total_count ${total_backups}/" "$METRICS_FILE"
    sed -i "s/gitlab_backup_failure_count 0/gitlab_backup_failure_count ${failed_backups}/" "$METRICS_FILE"
    sed -i "s/gitlab_backup_last_success_timestamp 0/gitlab_backup_last_success_timestamp ${last_success_timestamp}/" "$METRICS_FILE"
    
    if [[ $successful_backups -gt 0 ]]; then
        sed -i "s/gitlab_backup_success 0/gitlab_backup_success 1/" "$METRICS_FILE"
    fi
}

# Function to collect storage metrics
collect_storage_metrics() {
    log "INFO" "Collecting storage metrics"
    
    # Get storage usage
    local storage_usage=0
    if [[ -d "$BACKUP_BASE_DIR" ]]; then
        local usage_percent=$(df "$BACKUP_BASE_DIR" | awk 'NR==2 {print $5}' | sed 's/%//')
        storage_usage=$usage_percent
    fi
    
    # Get backup sizes by type
    local repos_size=0
    local db_size=0
    local config_size=0
    local artifacts_size=0
    local snapshots_size=0
    
    if [[ -d "${BACKUP_BASE_DIR}/repositories" ]]; then
        repos_size=$(du -sb "${BACKUP_BASE_DIR}/repositories" 2>/dev/null | cut -f1 || echo "0")
    fi
    
    if [[ -d "${BACKUP_BASE_DIR}/database" ]]; then
        db_size=$(du -sb "${BACKUP_BASE_DIR}/database" 2>/dev/null | cut -f1 || echo "0")
    fi
    
    if [[ -d "${BACKUP_BASE_DIR}/config" ]]; then
        config_size=$(du -sb "${BACKUP_BASE_DIR}/config" 2>/dev/null | cut -f1 || echo "0")
    fi
    
    if [[ -d "${BACKUP_BASE_DIR}/artifacts" ]]; then
        artifacts_size=$(du -sb "${BACKUP_BASE_DIR}/artifacts" 2>/dev/null | cut -f1 || echo "0")
    fi
    
    if [[ -d "${BACKUP_BASE_DIR}/snapshots" ]]; then
        snapshots_size=$(du -sb "${BACKUP_BASE_DIR}/snapshots" 2>/dev/null | cut -f1 || echo "0")
    fi
    
    # Add size metrics
    cat >> "$METRICS_FILE" << EOF

# HELP gitlab_backup_repositories_size_bytes Size of repository backups in bytes
# TYPE gitlab_backup_repositories_size_bytes gauge
gitlab_backup_repositories_size_bytes ${repos_size}

# HELP gitlab_backup_database_size_bytes Size of database backups in bytes
# TYPE gitlab_backup_database_size_bytes gauge
gitlab_backup_database_size_bytes ${db_size}

# HELP gitlab_backup_config_size_bytes Size of configuration backups in bytes
# TYPE gitlab_backup_config_size_bytes gauge
gitlab_backup_config_size_bytes ${config_size}

# HELP gitlab_backup_artifacts_size_bytes Size of artifacts backups in bytes
# TYPE gitlab_backup_artifacts_size_bytes gauge
gitlab_backup_artifacts_size_bytes ${artifacts_size}

# HELP gitlab_backup_snapshots_size_bytes Size of snapshots in bytes
# TYPE gitlab_backup_snapshots_size_bytes gauge
gitlab_backup_snapshots_size_bytes ${snapshots_size}

# HELP gitlab_backup_total_size_bytes Total size of all backups in bytes
# TYPE gitlab_backup_total_size_bytes gauge
gitlab_backup_total_size_bytes $((repos_size + db_size + config_size + artifacts_size + snapshots_size))
EOF
    
    # Update storage usage
    sed -i "s/gitlab_backup_storage_usage_percent 0/gitlab_backup_storage_usage_percent ${storage_usage}/" "$METRICS_FILE"
}

# Function to collect validation metrics
collect_validation_metrics() {
    log "INFO" "Collecting validation metrics"
    
    # Count validation reports
    local total_validations=0
    local passed_validations=0
    local failed_validations=0
    
    if [[ -d "${BACKUP_BASE_DIR}/validation_reports" ]]; then
        total_validations=$(find "${BACKUP_BASE_DIR}/validation_reports" -name "*.json" | wc -l)
        passed_validations=$(find "${BACKUP_BASE_DIR}/validation_reports" -name "*.json" \
            -exec jq -r '.overall_status' {} \; | grep -c "PASS" || echo "0")
        failed_validations=$((total_validations - passed_validations))
    fi
    
    # Get latest validation status
    local latest_validation_status=0
    local latest_validation=$(find "${BACKUP_BASE_DIR}/validation_reports" -name "*.json" \
            -exec stat -c "%Y" {} \; | sort -nr | head -1)
    
    if [[ -n "$latest_validation" ]]; then
        local validation_file=$(find "${BACKUP_BASE_DIR}/validation_reports" -name "*.json" \
                -exec stat -c "%Y %n" {} \; | sort -nr | head -1 | cut -d' ' -f2)
        if [[ -n "$validation_file" ]]; then
            local status=$(jq -r '.overall_status' "$validation_file" 2>/dev/null || echo "UNKNOWN")
            if [[ "$status" == "PASS" ]]; then
                latest_validation_status=1
            fi
        fi
    fi
    
    # Add validation metrics
    cat >> "$METRICS_FILE" << EOF

# HELP gitlab_backup_validation_total_count Total number of backup validations
# TYPE gitlab_backup_validation_total_count counter
gitlab_backup_validation_total_count ${total_validations}

# HELP gitlab_backup_validation_passed_count Total number of passed backup validations
# TYPE gitlab_backup_validation_passed_count counter
gitlab_backup_validation_passed_count ${passed_validations}

# HELP gitlab_backup_validation_failed_count Total number of failed backup validations
# TYPE gitlab_backup_validation_failed_count counter
gitlab_backup_validation_failed_count ${failed_validations}

# HELP gitlab_backup_validation_success_rate Percentage of passed validations
# TYPE gitlab_backup_validation_success_rate gauge
gitlab_backup_validation_success_rate $([[ $total_validations -gt 0 ]] && echo "scale=2; $passed_validations * 100 / $total_validations" | bc -l || echo "0")
EOF
    
    # Update validation success
    sed -i "s/gitlab_backup_validation_success 0/gitlab_backup_validation_success ${latest_validation_status}/" "$METRICS_FILE"
}

# Function to collect recovery metrics
collect_recovery_metrics() {
    log "INFO" "Collecting recovery metrics"
    
    # Count recovery operations
    local total_recoveries=0
    local successful_recoveries=0
    local failed_recoveries=0
    
    if [[ -d "${BACKUP_BASE_DIR}/recovery_reports" ]]; then
        total_recoveries=$(find "${BACKUP_BASE_DIR}/recovery_reports" -name "*.json" | wc -l)
        successful_recoveries=$(find "${BACKUP_BASE_DIR}/recovery_reports" -name "*.json" \
            -exec jq -r '.recovery_status' {} \; | grep -c "COMPLETED" || echo "0")
        failed_recoveries=$((total_recoveries - successful_recoveries))
    fi
    
    # Calculate average recovery time
    local avg_recovery_time=0
    if [[ $successful_recoveries -gt 0 ]]; then
        local total_recovery_time=$(find "${BACKUP_BASE_DIR}/recovery_reports" -name "*.json" \
            -exec jq -r '.recovery_duration_seconds' {} \; | awk '{sum += $1} END {print sum}')
        avg_recovery_time=$((total_recovery_time / successful_recoveries))
    fi
    
    # Add recovery metrics
    cat >> "$METRICS_FILE" << EOF

# HELP gitlab_backup_recovery_total_count Total number of recovery operations
# TYPE gitlab_backup_recovery_total_count counter
gitlab_backup_recovery_total_count ${total_recoveries}

# HELP gitlab_backup_recovery_successful_count Total number of successful recoveries
# TYPE gitlab_backup_recovery_successful_count counter
gitlab_backup_recovery_successful_count ${successful_recoveries}

# HELP gitlab_backup_recovery_failed_count Total number of failed recoveries
# TYPE gitlab_backup_recovery_failed_count counter
gitlab_backup_recovery_failed_count ${failed_recoveries}

# HELP gitlab_backup_recovery_avg_duration_seconds Average recovery duration in seconds
# TYPE gitlab_backup_recovery_avg_duration_seconds gauge
gitlab_backup_recovery_avg_duration_seconds ${avg_recovery_time}

# HELP gitlab_backup_recovery_rto_achieved Percentage of recoveries meeting RTO
# TYPE gitlab_backup_recovery_rto_achieved gauge
gitlab_backup_recovery_rto_achieved $([[ $successful_recoveries -gt 0 ]] && echo "scale=2; $(find "${BACKUP_BASE_DIR}/recovery_reports" -name "*.json" -exec jq -r '.recovery_objectives.rto_achieved' {} \; | grep -c true) * 100 / $successful_recoveries" | bc -l || echo "0")
EOF
}

# Function to start metrics server
start_metrics_server() {
    log "INFO" "Starting metrics server on port ${METRICS_PORT}"
    
    # Check if node_exporter is available
    if command -v node_exporter &> /dev/null; then
        # Start node exporter for custom metrics
        nohup node_exporter --web.listen-address=":${METRICS_PORT}" \
            --collector.textfile.directory="/tmp" \
            --collector.textfile \
            > /dev/null 2>&1 &
        echo $! > /tmp/metrics_server.pid
    else
        # Simple HTTP server for metrics
        cat > /tmp/metrics_server.py << 'EOF'
#!/usr/bin/env python3
import http.server
import socketserver
import os

class MetricsHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path == '/metrics':
            try:
                with open('/tmp/gitlab_backup_metrics.prom', 'r') as f:
                    content = f.read()
                self.send_response(200, 'text/plain; charset=utf-8')
                self.end_headers()
                self.wfile.write(content.encode('utf-8'))
            except FileNotFoundError:
                self.send_response(404, 'text/plain')
                self.end_headers()
                self.wfile.write(b'Metrics file not found')
        else:
            self.send_response(404, 'text/plain')
            self.end_headers()
            self.wfile.write(b'Not found')

if __name__ == '__main__':
    port = ${METRICS_PORT}
    with socketserver.TCPServer(("", port), MetricsHandler) as httpd:
        print(f"Serving metrics on port {port}")
        httpd.serve_forever()
EOF
        
        chmod +x /tmp/metrics_server.py
        nohup python3 /tmp/metrics_server.py > /dev/null 2>&1 &
        echo $! > /tmp/metrics_server.pid
    fi
    
    log "INFO" "Metrics server started"
}

# Function to push metrics to Prometheus Pushgateway
push_metrics_to_gateway() {
    log "INFO" "Pushing metrics to Prometheus Pushgateway"
    
    if [[ -n "$PUSHGATEWAY_URL" ]]; then
        # Push metrics using curl
        curl -X POST "$PUSHGATEWAY_URL/metrics/job/gitlab-backup" \
            --data-binary "@${METRICS_FILE}" \
            --header "Content-Type: text/plain" \
            --silent \
            --show-error \
            --fail
        
        if [[ $? -eq 0 ]]; then
            log "INFO" "Metrics pushed successfully to Pushgateway"
        else
            log "ERROR" "Failed to push metrics to Pushgateway"
        fi
    else
        log "WARN" "Pushgateway URL not configured, metrics available locally only"
    fi
}

# Function to stop metrics server
stop_metrics_server() {
    log "INFO" "Stopping metrics server"
    
    if [[ -f "/tmp/metrics_server.pid" ]]; then
        local pid=$(cat /tmp/metrics_server.pid)
        if kill -0 "$pid" 2>/dev/null; then
            kill "$pid"
            log "INFO" "Metrics server stopped (PID: $pid)"
        fi
        rm -f "/tmp/metrics_server.pid"
    fi
}

# Function to cleanup
cleanup() {
    log "INFO" "Cleaning up metrics collector"
    stop_metrics_server
    rm -f "$METRICS_FILE"
    rm -f /tmp/metrics_server.py
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Main execution function
main() {
    local command="${1:-collect}"
    
    case "$command" in
        "collect")
            collect_backup_metrics
            ;;
        "serve")
            collect_backup_metrics
            start_metrics_server
            log "INFO" "Metrics server running. Press Ctrl+C to stop."
            while true; do
                collect_backup_metrics
                sleep 60  # Update metrics every minute
            done
            ;;
        "push")
            collect_backup_metrics
            push_metrics_to_gateway
            ;;
        "stop")
            stop_metrics_server
            ;;
        *)
            echo "Usage: $0 {collect|serve|push|stop}"
            echo "  collect - Collect metrics and save to file"
            echo "  serve   - Start metrics server and collect continuously"
            echo "  push    - Collect and push metrics to Pushgateway"
            echo "  stop    - Stop metrics server"
            exit 1
            ;;
    esac
}

# Execute main function
main "$@"