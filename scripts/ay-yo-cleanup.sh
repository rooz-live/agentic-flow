#!/bin/bash
# ay-yo-cleanup.sh - Resource Management (Mitigation M1)
# Addresses R1: Resource Exhaustion risk

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Configuration
METRICS_DIR="$PROJECT_ROOT/.dor-metrics"
EPISODES_DIR="$PROJECT_ROOT/.episodes"
VIOLATIONS_DIR="$PROJECT_ROOT/.dor-violations"
AGENTDB="$PROJECT_ROOT/agentdb.db"
ARCHIVE_DIR="$PROJECT_ROOT/.archives"

METRICS_RETENTION_DAYS=30
EPISODES_RETENTION_DAYS=60
VIOLATIONS_RETENTION_DAYS=30

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() { echo -e "${GREEN}[✓]${NC} $*"; }
warn() { echo -e "${YELLOW}[⚠]${NC} $*"; }
error() { echo -e "${RED}[✗]${NC} $*"; }

check_disk_usage() {
  log "Checking disk usage..."
  
  local disk_pct
  disk_pct=$(df -h "$PROJECT_ROOT" | tail -1 | awk '{print $5}' | tr -d '%')
  
  echo "  Disk usage: ${disk_pct}%"
  
  if [[ $disk_pct -gt 90 ]]; then
    error "CRITICAL: Disk usage at ${disk_pct}% (>90%)"
    return 1
  elif [[ $disk_pct -gt 80 ]]; then
    warn "WARNING: Disk usage at ${disk_pct}% (>80%)"
  else
    log "Disk usage healthy: ${disk_pct}%"
  fi
}

check_directory_sizes() {
  log "Checking directory sizes..."
  
  for dir in "$METRICS_DIR" "$EPISODES_DIR" "$VIOLATIONS_DIR"; do
    if [[ -d "$dir" ]]; then
      local size
      size=$(du -sh "$dir" 2>/dev/null | cut -f1)
      echo "  $dir: $size"
    fi
  done
  
  if [[ -f "$AGENTDB" ]]; then
    local db_size
    db_size=$(du -sh "$AGENTDB" | cut -f1)
    echo "  $AGENTDB: $db_size"
  fi
}

archive_old_data() {
  log "Archiving old data..."
  
  mkdir -p "$ARCHIVE_DIR"
  
  local archive_file="$ARCHIVE_DIR/metrics-archive-$(date +%Y%m%d-%H%M%S).tar.gz"
  
  # Create archive
  tar -czf "$archive_file" \
    -C "$PROJECT_ROOT" \
    .dor-metrics/ \
    .episodes/ \
    .dor-violations/ \
    2>/dev/null || warn "Some directories may be empty"
  
  log "Archive created: $archive_file"
  
  # Show archive size
  local archive_size
  archive_size=$(du -sh "$archive_file" | cut -f1)
  echo "  Archive size: $archive_size"
}

cleanup_old_metrics() {
  log "Cleaning up old metrics (>${METRICS_RETENTION_DAYS} days)..."
  
  if [[ -d "$METRICS_DIR" ]]; then
    local count
    count=$(find "$METRICS_DIR" -name "*.json" -mtime +${METRICS_RETENTION_DAYS} | wc -l | tr -d ' ')
    
    if [[ $count -gt 0 ]]; then
      find "$METRICS_DIR" -name "*.json" -mtime +${METRICS_RETENTION_DAYS} -delete
      log "Removed $count old metric files"
    else
      log "No old metrics to clean"
    fi
  fi
}

cleanup_old_episodes() {
  log "Cleaning up old episodes (>${EPISODES_RETENTION_DAYS} days)..."
  
  if [[ -d "$EPISODES_DIR" ]]; then
    local count
    count=$(find "$EPISODES_DIR" -name "*.json" -mtime +${EPISODES_RETENTION_DAYS} | wc -l | tr -d ' ')
    
    if [[ $count -gt 0 ]]; then
      find "$EPISODES_DIR" -name "*.json" -mtime +${EPISODES_RETENTION_DAYS} -delete
      log "Removed $count old episode files"
    else
      log "No old episodes to clean"
    fi
  fi
}

cleanup_old_violations() {
  log "Cleaning up old violations (>${VIOLATIONS_RETENTION_DAYS} days)..."
  
  if [[ -d "$VIOLATIONS_DIR" ]]; then
    local count
    count=$(find "$VIOLATIONS_DIR" -name "*.json" -mtime +${VIOLATIONS_RETENTION_DAYS} | wc -l | tr -d ' ')
    
    if [[ $count -gt 0 ]]; then
      find "$VIOLATIONS_DIR" -name "*.json" -mtime +${VIOLATIONS_RETENTION_DAYS} -delete
      log "Removed $count old violation files"
    else
      log "No old violations to clean"
    fi
  fi
}

cleanup_old_archives() {
  log "Cleaning up old archives (>90 days)..."
  
  if [[ -d "$ARCHIVE_DIR" ]]; then
    local count
    count=$(find "$ARCHIVE_DIR" -name "*.tar.gz" -mtime +90 | wc -l | tr -d ' ')
    
    if [[ $count -gt 0 ]]; then
      find "$ARCHIVE_DIR" -name "*.tar.gz" -mtime +90 -delete
      log "Removed $count old archives"
    else
      log "No old archives to clean"
    fi
  fi
}

vacuum_database() {
  log "Vacuuming AgentDB..."
  
  if [[ -f "$AGENTDB" ]]; then
    local before_size
    before_size=$(du -sh "$AGENTDB" | cut -f1)
    
    sqlite3 "$AGENTDB" "VACUUM;"
    
    local after_size
    after_size=$(du -sh "$AGENTDB" | cut -f1)
    
    log "Database optimized: $before_size → $after_size"
  fi
}

show_summary() {
  echo
  echo "═══════════════════════════════════════════"
  echo "  Cleanup Summary"
  echo "═══════════════════════════════════════════"
  echo
  
  check_directory_sizes
  check_disk_usage
}

main() {
  echo
  echo "═══════════════════════════════════════════"
  echo "  Resource Management & Cleanup"
  echo "  ROAM Mitigation: M1 (R1: Resource Exhaustion)"
  echo "═══════════════════════════════════════════"
  echo
  
  # Pre-cleanup state
  log "Before cleanup:"
  check_directory_sizes
  echo
  
  # Archive before cleanup
  archive_old_data
  echo
  
  # Cleanup operations
  cleanup_old_metrics
  cleanup_old_episodes
  cleanup_old_violations
  cleanup_old_archives
  echo
  
  # Database maintenance
  vacuum_database
  echo
  
  # Post-cleanup summary
  show_summary
  
  log "Cleanup complete"
}

main "$@"
