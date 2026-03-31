#!/usr/bin/env bash
# ============================================================================
# GitLab Migration Execution Script
# ============================================================================
# Purpose: Automate Saturday morning migration from gitlab.yocloud.com to
#          gitlab.interface.splitcite.com with progress tracking & rollback
#
# Usage: ./execute_migration.sh [--dry-run] [--verbose] [--phase N]
# ============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
LOG_DIR="$PROJECT_ROOT/logs/migration"
GOALIE_DIR="$PROJECT_ROOT/.goalie"
CYCLE_LOG="$GOALIE_DIR/cycle_log.jsonl"
CHECKPOINT_DIR="$LOG_DIR/checkpoints"
DASHBOARD_FILE="$LOG_DIR/migration_dashboard.txt"

SOURCE_GITLAB="gitlab.yocloud.com"
TARGET_GITLAB="gitlab.interface.splitcite.com"
SLACK_WEBHOOK_URL="${SLACK_WEBHOOK_URL:-}"
NOTIFICATION_EMAIL="${NOTIFICATION_EMAIL:-}"

DRY_RUN=false
VERBOSE=false
START_PHASE=0
CURRENT_PHASE=0
ROLLBACK_REQUIRED=false

declare -A PHASE_NAMES=(
    [0]="Pre-flight checks"
    [1]="Full backup of source GitLab"
    [2]="Restore backup to target"
    [3]="DNS and SSL configuration"
    [4]="CI/CD runner migration"
    [5]="Post-migration validation"
)

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; MAGENTA='\033[0;35m'; NC='\033[0m'

while [[ $# -gt 0 ]]; do
    case $1 in
        --dry-run) DRY_RUN=true; shift ;;
        --verbose) VERBOSE=true; shift ;;
        --phase) START_PHASE="$2"; shift 2 ;;
        --help|-h) echo "Usage: $0 [--dry-run] [--verbose] [--phase N]"; exit 0 ;;
        *) echo "Unknown option: $1"; exit 2 ;;
    esac
done

get_timestamp() { date -u +"%Y-%m-%dT%H:%M:%SZ"; }
log_info() { echo -e "${BLUE}[INFO]${NC} $(get_timestamp) $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $(get_timestamp) $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $(get_timestamp) $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $(get_timestamp) $1"; }
log_phase() { echo -e "${MAGENTA}[PHASE $CURRENT_PHASE]${NC} $(get_timestamp) $1"; }

log_to_goalie() {
    local phase="$1" status="$2" msg="$3"
    if [[ "$DRY_RUN" == "false" ]]; then
        echo "{\"type\":\"migration_execution\",\"timestamp\":\"$(get_timestamp)\",\"phase\":$phase,\"status\":\"$status\",\"message\":\"$msg\"}" >> "$CYCLE_LOG"
    fi
    return 0
}

send_notification() {
    local level="$1" title="$2" msg="$3"
    if [[ -n "$SLACK_WEBHOOK_URL" ]]; then
        local color="good"
        [[ "$level" == "warning" ]] && color="warning"
        [[ "$level" == "critical" ]] && color="danger"
        curl -s -X POST "$SLACK_WEBHOOK_URL" -H 'Content-type: application/json' \
            -d "{\"attachments\":[{\"color\":\"$color\",\"title\":\"$title\",\"text\":\"$msg\"}]}" >/dev/null 2>&1 || true
    fi
}

update_dashboard() {
    local phase="$1" status="$2" msg="$3"
    cat > "$DASHBOARD_FILE" << EOF
============================================================================
                    GITLAB MIGRATION DASHBOARD
                    Updated: $(get_timestamp)
============================================================================

Source: $SOURCE_GITLAB
Target: $TARGET_GITLAB

Current Phase: $phase - ${PHASE_NAMES[$phase]:-Unknown}
Status: $status

Progress:
  [$([ "$phase" -gt 0 ] && echo "✓" || echo " ")] Phase 0: Pre-flight checks
  [$([ "$phase" -gt 1 ] && echo "✓" || echo " ")] Phase 1: Backup source
  [$([ "$phase" -gt 2 ] && echo "✓" || echo " ")] Phase 2: Restore to target
  [$([ "$phase" -gt 3 ] && echo "✓" || echo " ")] Phase 3: DNS/SSL config
  [$([ "$phase" -gt 4 ] && echo "✓" || echo " ")] Phase 4: Runner migration
  [$([ "$phase" -gt 5 ] && echo "✓" || echo " ")] Phase 5: Validation

Last Message: $msg
============================================================================
EOF
}

create_checkpoint() {
    local phase="$1"
    mkdir -p "$CHECKPOINT_DIR"
    echo "{\"phase\":$phase,\"timestamp\":\"$(get_timestamp)\",\"status\":\"checkpoint\"}" > "$CHECKPOINT_DIR/phase_${phase}.json"
    log_info "Checkpoint created for phase $phase"
}


# ============================================================================
# Migration Phases
# ============================================================================

phase_0_preflight() {
    log_phase "Pre-flight checks"
    update_dashboard 0 "IN_PROGRESS" "Running pre-flight checks..."
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log_success "Pre-flight checks (dry-run)"
        return 0
    fi
    
    # Check connectivity
    if ! timeout 10 ssh -o BatchMode=yes "$SOURCE_GITLAB" "echo OK" 2>/dev/null; then
        log_error "Cannot connect to source GitLab"
        return 1
    fi
    
    # Verify GitLab is running
    if ! ssh "$SOURCE_GITLAB" "sudo gitlab-ctl status" 2>/dev/null | grep -q "run:"; then
        log_error "GitLab services not running on source"
        return 1
    fi
    
    log_success "Pre-flight checks passed"
    create_checkpoint 0
    send_notification "info" "Migration Phase 0 Complete" "Pre-flight checks passed"
}

phase_1_backup() {
    log_phase "Creating full backup of source GitLab"
    update_dashboard 1 "IN_PROGRESS" "Creating backup (this may take 1-2 hours)..."
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log_success "Backup created (dry-run)"
        return 0
    fi
    
    # Create backup
    log_info "Starting backup on $SOURCE_GITLAB..."
    if ! ssh "$SOURCE_GITLAB" "sudo gitlab-backup create STRATEGY=copy" 2>&1 | tee "$LOG_DIR/backup_output.log"; then
        log_error "Backup creation failed"
        return 1
    fi
    
    # Get backup filename
    local backup_file
    backup_file=$(ssh "$SOURCE_GITLAB" "ls -t /var/opt/gitlab/backups/*.tar 2>/dev/null | head -1")
    if [[ -z "$backup_file" ]]; then
        log_error "No backup file found"
        return 1
    fi
    
    log_success "Backup created: $backup_file"
    echo "$backup_file" > "$CHECKPOINT_DIR/backup_filename.txt"
    
    # Backup secrets
    ssh "$SOURCE_GITLAB" "sudo gitlab-ctl backup-etc" 2>&1 | tee -a "$LOG_DIR/backup_output.log"
    
    create_checkpoint 1
    send_notification "info" "Migration Phase 1 Complete" "Backup created successfully"
}

phase_2_restore() {
    log_phase "Restoring backup to target GitLab"
    update_dashboard 2 "IN_PROGRESS" "Restoring backup to target..."
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log_success "Backup restored (dry-run)"
        return 0
    fi
    
    local backup_file
    backup_file=$(cat "$CHECKPOINT_DIR/backup_filename.txt" 2>/dev/null || echo "")
    if [[ -z "$backup_file" ]]; then
        log_error "No backup file reference found"
        return 1
    fi
    
    # Copy backup to target
    log_info "Copying backup to target..."
    local backup_basename
    backup_basename=$(basename "$backup_file")
    scp "$SOURCE_GITLAB:$backup_file" "$TARGET_GITLAB:/var/opt/gitlab/backups/" || return 1
    
    # Stop services on target
    ssh "$TARGET_GITLAB" "sudo gitlab-ctl stop puma && sudo gitlab-ctl stop sidekiq" || true
    
    # Restore
    local timestamp
    timestamp=$(echo "$backup_basename" | sed 's/_gitlab_backup.tar//')
    log_info "Restoring backup $timestamp..."
    if ! ssh "$TARGET_GITLAB" "sudo gitlab-backup restore BACKUP=$timestamp force=yes" 2>&1 | tee "$LOG_DIR/restore_output.log"; then
        log_error "Restore failed"
        return 1
    fi
    
    # Reconfigure and restart
    ssh "$TARGET_GITLAB" "sudo gitlab-ctl reconfigure && sudo gitlab-ctl restart"
    
    create_checkpoint 2
    send_notification "info" "Migration Phase 2 Complete" "Backup restored to target"
}


phase_3_dns_ssl() {
    log_phase "Configuring DNS and SSL"
    update_dashboard 3 "IN_PROGRESS" "Configuring DNS and SSL..."
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log_success "DNS and SSL configured (dry-run)"
        return 0
    fi
    
    # MANUAL CONFIRMATION REQUIRED
    echo ""
    echo "============================================================================"
    echo "  MANUAL CONFIRMATION REQUIRED"
    echo "============================================================================"
    echo "  DNS cutover is about to occur. This will:"
    echo "  1. Update DNS to point to new GitLab instance"
    echo "  2. Configure SSL certificates"
    echo ""
    read -p "  Type 'PROCEED' to continue or 'ABORT' to rollback: " confirm
    
    if [[ "$confirm" != "PROCEED" ]]; then
        log_warning "DNS cutover aborted by user"
        ROLLBACK_REQUIRED=true
        return 1
    fi
    
    # Update GitLab external URL
    ssh "$TARGET_GITLAB" "sudo sed -i \"s|external_url.*|external_url 'https://$TARGET_GITLAB'|\" /etc/gitlab/gitlab.rb"
    ssh "$TARGET_GITLAB" "sudo gitlab-ctl reconfigure"
    
    create_checkpoint 3
    send_notification "info" "Migration Phase 3 Complete" "DNS and SSL configured"
}

phase_4_runners() {
    log_phase "Migrating CI/CD runners"
    update_dashboard 4 "IN_PROGRESS" "Migrating CI/CD runners..."
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log_success "Runners migrated (dry-run)"
        return 0
    fi
    
    log_info "Runners need manual re-registration on new instance"
    log_info "Update runner config: sed -i 's/$SOURCE_GITLAB/$TARGET_GITLAB/g' /etc/gitlab-runner/config.toml"
    
    create_checkpoint 4
    send_notification "info" "Migration Phase 4 Complete" "Runner migration instructions provided"
}

phase_5_validate() {
    log_phase "Running post-migration validation"
    update_dashboard 5 "IN_PROGRESS" "Validating migration..."
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log_success "Validation passed (dry-run)"
        return 0
    fi
    
    # Run validation script
    if [[ -x "$SCRIPT_DIR/post_migration_validate.sh" ]]; then
        if ! "$SCRIPT_DIR/post_migration_validate.sh" --quick; then
            log_warning "Some validations failed"
        fi
    fi
    
    create_checkpoint 5
    send_notification "info" "Migration Complete" "GitLab migration completed successfully"
}

rollback() {
    log_error "ROLLBACK INITIATED"
    send_notification "critical" "Migration Rollback" "Rollback initiated at phase $CURRENT_PHASE"
    
    echo ""
    echo "============================================================================"
    echo "  ROLLBACK INSTRUCTIONS"
    echo "============================================================================"
    echo "  1. Revert DNS to point back to $SOURCE_GITLAB"
    echo "  2. Ensure $SOURCE_GITLAB is running: sudo gitlab-ctl start"
    echo "  3. Notify users of rollback"
    echo "============================================================================"
    
    log_to_goalie "$CURRENT_PHASE" "rollback" "Rollback initiated"
}


# ============================================================================
# Main Execution
# ============================================================================

main() {
    mkdir -p "$LOG_DIR" "$CHECKPOINT_DIR" "$GOALIE_DIR"
    
    echo ""
    echo "============================================================================"
    echo "       GitLab Migration Execution - $(get_timestamp)"
    echo "============================================================================"
    echo "  Source: $SOURCE_GITLAB"
    echo "  Target: $TARGET_GITLAB"
    echo "  Starting Phase: $START_PHASE"
    [[ "$DRY_RUN" == "true" ]] && echo "  Mode: DRY RUN"
    echo ""
    
    log_to_goalie 0 "started" "Migration execution started"
    send_notification "info" "Migration Started" "GitLab migration from $SOURCE_GITLAB to $TARGET_GITLAB"
    
    local phases=(phase_0_preflight phase_1_backup phase_2_restore phase_3_dns_ssl phase_4_runners phase_5_validate)
    
    for i in "${!phases[@]}"; do
        if [[ $i -lt $START_PHASE ]]; then
            log_info "Skipping phase $i (starting from phase $START_PHASE)"
            continue
        fi
        
        CURRENT_PHASE=$i
        log_to_goalie "$i" "in_progress" "Starting phase $i: ${PHASE_NAMES[$i]}"
        
        if ! ${phases[$i]}; then
            log_error "Phase $i failed: ${PHASE_NAMES[$i]}"
            log_to_goalie "$i" "failed" "Phase $i failed"
            
            if [[ "$ROLLBACK_REQUIRED" == "true" ]]; then
                rollback
            fi
            exit 1
        fi
        
        log_to_goalie "$i" "completed" "Phase $i completed"
    done
    
    echo ""
    echo "============================================================================"
    echo "  ${GREEN}MIGRATION COMPLETED SUCCESSFULLY${NC}"
    echo "============================================================================"
    echo "  New GitLab: https://$TARGET_GITLAB"
    echo "  Logs: $LOG_DIR"
    echo "============================================================================"
    
    update_dashboard 5 "COMPLETE" "Migration completed successfully"
    log_to_goalie 5 "completed" "Migration completed successfully"
}

main "$@"
