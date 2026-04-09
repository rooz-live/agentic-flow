#!/bin/bash
################################################################################
# Incremental Backup Script with Hard Links
# 
# Uses rsync with --link-dest for space-efficient incremental backups
# Unchanged files are hard-linked to previous backup (0 additional space)
# Only changed files consume new disk space
#
# Usage:
#   ./scripts/backup-incremental.sh              # Backup current project
#   ./scripts/backup-incremental.sh --all-code   # Backup entire /code directory
#   ./scripts/backup-incremental.sh --verify     # Verify latest backup
#
# Backup location: ~/Backups/code/
# Retention: Keeps last 30 daily backups, compresses older
################################################################################

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BACKUP_ROOT="$HOME/Backups/code"
SOURCE_DIR="$HOME/Documents/code"
PROJECT_DIR="$(pwd)"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_NAME="backup-$TIMESTAMP"
RETENTION_DAYS=30

# Exclusions
EXCLUDES=(
    "node_modules"
    ".git/objects"
    "*.log"
    ".DS_Store"
    "coverage"
    "dist"
    "build"
    ".cache"
    "*.tmp"
    ".venv"
    "venv"
    "__pycache__"
)

################################################################################
# Functions
################################################################################

log_info() {
    echo -e "${BLUE}ℹ${NC}  $1"
}

log_success() {
    echo -e "${GREEN}✓${NC}  $1"
}

log_warning() {
    echo -e "${YELLOW}⚠${NC}  $1"
}

log_error() {
    echo -e "${RED}✗${NC}  $1"
}

create_backup_structure() {
    mkdir -p "$BACKUP_ROOT"/{daily,weekly,monthly,latest}
    log_success "Backup directory structure created"
}

build_rsync_excludes() {
    local exclude_args=""
    for pattern in "${EXCLUDES[@]}"; do
        exclude_args="$exclude_args --exclude=$pattern"
    done
    echo "$exclude_args"
}

perform_incremental_backup() {
    local source="$1"
    local dest="$2"
    local link_dest="$3"
    
    log_info "Starting incremental backup..."
    log_info "Source: $source"
    log_info "Destination: $dest"
    
    local exclude_args
    exclude_args=$(build_rsync_excludes)
    
    local rsync_cmd="rsync -av --stats --human-readable"
    
    # Add link-dest if previous backup exists
    if [[ -d "$link_dest" ]]; then
        rsync_cmd="$rsync_cmd --link-dest=$link_dest"
        log_info "Using hard links from: $link_dest"
    else
        log_warning "No previous backup found - performing full backup"
    fi
    
    # Execute rsync
    eval "$rsync_cmd $exclude_args $source/ $dest/" 2>&1 | tee "$dest/backup.log"
    
    local exit_code=${PIPESTATUS[0]}
    if [[ $exit_code -eq 0 ]]; then
        log_success "Backup completed successfully"
        return 0
    else
        log_error "Backup failed with exit code: $exit_code"
        return $exit_code
    fi
}

calculate_backup_size() {
    local backup_dir="$1"
    local total_size
    total_size=$(du -sh "$backup_dir" 2>/dev/null | cut -f1)
    echo "$total_size"
}

calculate_space_savings() {
    local backup_dir="$1"
    local apparent_size
    local actual_size
    
    apparent_size=$(du -sh --apparent-size "$backup_dir" 2>/dev/null | cut -f1 || echo "0")
    actual_size=$(du -sh "$backup_dir" 2>/dev/null | cut -f1 || echo "0")
    
    echo "Apparent: $apparent_size | Actual: $actual_size"
}

update_latest_symlink() {
    local backup_dir="$1"
    local latest_link="$BACKUP_ROOT/daily/latest"
    
    if [[ -L "$latest_link" ]]; then
        rm "$latest_link"
    fi
    
    ln -s "$backup_dir" "$latest_link"
    log_success "Updated 'latest' symlink"
}

cleanup_old_backups() {
    log_info "Cleaning up backups older than $RETENTION_DAYS days..."
    
    find "$BACKUP_ROOT/daily" -maxdepth 1 -type d -name "backup-*" -mtime +$RETENTION_DAYS -exec rm -rf {} \;
    
    log_success "Cleanup complete"
}

compress_old_backups() {
    log_info "Compressing backups older than 7 days..."
    
    find "$BACKUP_ROOT/daily" -maxdepth 1 -type d -name "backup-*" -mtime +7 ! -name "*.tar.gz" | while read -r dir; do
        if [[ -d "$dir" ]]; then
            local basename
            basename=$(basename "$dir")
            log_info "Compressing $basename..."
            
            tar -czf "$BACKUP_ROOT/daily/$basename.tar.gz" -C "$BACKUP_ROOT/daily" "$basename"
            rm -rf "$dir"
            
            log_success "Compressed $basename"
        fi
    done
}

verify_backup() {
    local backup_dir="$1"
    
    log_info "Verifying backup integrity..."
    
    # Check if backup directory exists
    if [[ ! -d "$backup_dir" ]]; then
        log_error "Backup directory not found: $backup_dir"
        return 1
    fi
    
    # Check if backup log exists
    if [[ ! -f "$backup_dir/backup.log" ]]; then
        log_warning "Backup log not found"
    fi
    
    # Count files
    local file_count
    file_count=$(find "$backup_dir" -type f | wc -l | tr -d ' ')
    
    log_success "Backup verified: $file_count files"
    
    # Show size
    local size
    size=$(calculate_backup_size "$backup_dir")
    log_info "Backup size: $size"
    
    return 0
}

show_backup_stats() {
    log_info "=== Backup Statistics ==="
    
    # Count backups
    local daily_count
    daily_count=$(find "$BACKUP_ROOT/daily" -maxdepth 1 -type d -name "backup-*" | wc -l | tr -d ' ')
    echo "  Daily backups: $daily_count"
    
    # Total size
    local total_size
    total_size=$(du -sh "$BACKUP_ROOT" 2>/dev/null | cut -f1)
    echo "  Total backup size: $total_size"
    
    # Latest backup
    if [[ -L "$BACKUP_ROOT/daily/latest" ]]; then
        local latest_target
        latest_target=$(readlink "$BACKUP_ROOT/daily/latest")
        local latest_size
        latest_size=$(calculate_backup_size "$BACKUP_ROOT/daily/latest")
        echo "  Latest backup: $(basename "$latest_target") ($latest_size)"
    fi
}

################################################################################
# Main Script
################################################################################

main() {
    local mode="${1:-project}"
    
    echo "======================================================================"
    echo "  Incremental Backup Script"
    echo "  Timestamp: $TIMESTAMP"
    echo "======================================================================"
    echo
    
    create_backup_structure
    
    case "$mode" in
        --all-code)
            log_info "Mode: Backup entire /code directory"
            local dest="$BACKUP_ROOT/daily/$BACKUP_NAME"
            local link_dest="$BACKUP_ROOT/daily/latest"
            
            perform_incremental_backup "$SOURCE_DIR" "$dest" "$link_dest"
            update_latest_symlink "$dest"
            ;;
            
        --verify)
            log_info "Mode: Verify latest backup"
            if [[ -L "$BACKUP_ROOT/daily/latest" ]]; then
                verify_backup "$BACKUP_ROOT/daily/latest"
            else
                log_error "No backup found to verify"
                exit 1
            fi
            ;;
            
        --stats)
            show_backup_stats
            exit 0
            ;;
            
        --cleanup)
            cleanup_old_backups
            compress_old_backups
            show_backup_stats
            exit 0
            ;;
            
        *)
            log_info "Mode: Backup current project"
            local dest="$BACKUP_ROOT/daily/$BACKUP_NAME"
            local link_dest="$BACKUP_ROOT/daily/latest"
            
            perform_incremental_backup "$PROJECT_DIR" "$dest" "$link_dest"
            update_latest_symlink "$dest"
            ;;
    esac
    
    # Post-backup tasks
    verify_backup "$BACKUP_ROOT/daily/$BACKUP_NAME"
    cleanup_old_backups
    compress_old_backups
    show_backup_stats
    
    echo
    log_success "Backup workflow complete!"
    echo "======================================================================"
}

# Run main function
main "$@"
