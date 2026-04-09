#!/bin/bash
################################################################################
# Archive Compression Script
# 
# Automatically compresses archived projects for long-horizon storage optimization
# Achieves 70-90% space savings depending on file types
#
# Usage:
#   ./scripts/archive-compress.sh                    # Interactive mode
#   ./scripts/archive-compress.sh --auto             # Auto-compress all
#   ./scripts/archive-compress.sh --project NAME     # Compress specific project
#   ./scripts/archive-compress.sh --verify          # Verify compressed archives
#   ./scripts/archive-compress.sh --stats           # Show statistics
#
# Features:
#   - Multi-threaded compression (pigz)
#   - Integrity verification (checksums)
#   - Space savings calculation
#   - Safe mode (keeps original until verified)
################################################################################

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Configuration
ARCHIVE_ROOT="$HOME/Documents/code/archive"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
LOG_FILE="$ARCHIVE_ROOT/compression-$TIMESTAMP.log"
CHECKSUM_DIR="$ARCHIVE_ROOT/.checksums"
MIN_SIZE_GB=1  # Only compress directories > 1GB

################################################################################
# Logging
################################################################################

log() {
    echo -e "$1" | tee -a "$LOG_FILE"
}

log_info() {
    log "${BLUE}ℹ${NC}  $1"
}

log_success() {
    log "${GREEN}✓${NC}  $1"
}

log_warning() {
    log "${YELLOW}⚠${NC}  $1"
}

log_error() {
    log "${RED}✗${NC}  $1"
}

log_stats() {
    log "${CYAN}📊${NC}  $1"
}

################################################################################
# Helper Functions
################################################################################

check_dependencies() {
    local missing=()
    
    for cmd in tar gzip pigz md5sum; do
        if ! command -v $cmd &> /dev/null; then
            missing+=("$cmd")
        fi
    done
    
    if [[ ${#missing[@]} -gt 0 ]]; then
        log_error "Missing dependencies: ${missing[*]}"
        log_info "Install with: brew install ${missing[*]}"
        exit 1
    fi
    
    log_success "All dependencies available"
}

get_dir_size_gb() {
    local dir="$1"
    local size_bytes
    size_bytes=$(du -sb "$dir" 2>/dev/null | cut -f1)
    echo "scale=2; $size_bytes / 1073741824" | bc
}

get_dir_size_human() {
    local dir="$1"
    du -sh "$dir" 2>/dev/null | cut -f1
}

should_compress() {
    local dir="$1"
    local size_gb
    size_gb=$(get_dir_size_gb "$dir")
    
    # Check if already compressed
    if [[ -f "${dir}.tar.gz" ]]; then
        return 1
    fi
    
    # Check size threshold
    if (( $(echo "$size_gb < $MIN_SIZE_GB" | bc -l) )); then
        return 1
    fi
    
    return 0
}

compress_directory() {
    local source_dir="$1"
    local archive_name="${source_dir}.tar.gz"
    local temp_archive="${archive_name}.tmp"
    
    log_info "Compressing: $(basename "$source_dir")"
    log_info "Source: $source_dir"
    log_info "Target: $archive_name"
    
    # Get original size
    local original_size
    original_size=$(get_dir_size_human "$source_dir")
    log_info "Original size: $original_size"
    
    # Compress with pigz (multi-threaded) if available, otherwise gzip
    local compressor="gzip"
    if command -v pigz &> /dev/null; then
        compressor="pigz"
        log_info "Using pigz (multi-threaded compression)"
    fi
    
    # Perform compression
    log_info "Compressing... (this may take several minutes)"
    local start_time
    start_time=$(date +%s)
    
    if tar -cf - -C "$(dirname "$source_dir")" "$(basename "$source_dir")" | $compressor > "$temp_archive"; then
        local end_time
        end_time=$(date +%s)
        local duration=$((end_time - start_time))
        
        log_success "Compression completed in ${duration}s"
        
        # Get compressed size
        local compressed_size
        compressed_size=$(du -sh "$temp_archive" | cut -f1)
        log_info "Compressed size: $compressed_size"
        
        # Calculate savings
        local original_bytes
        local compressed_bytes
        original_bytes=$(du -sb "$source_dir" | cut -f1)
        compressed_bytes=$(du -sb "$temp_archive" | cut -f1)
        local savings_percent
        savings_percent=$(echo "scale=1; (1 - $compressed_bytes / $original_bytes) * 100" | bc)
        
        log_stats "Space savings: ${savings_percent}%"
        
        # Move to final location
        mv "$temp_archive" "$archive_name"
        
        # Generate checksum
        generate_checksum "$archive_name"
        
        return 0
    else
        log_error "Compression failed"
        rm -f "$temp_archive"
        return 1
    fi
}

generate_checksum() {
    local archive="$1"
    local checksum_file="$CHECKSUM_DIR/$(basename "$archive").md5"
    
    mkdir -p "$CHECKSUM_DIR"
    
    log_info "Generating checksum..."
    md5sum "$archive" > "$checksum_file"
    log_success "Checksum saved: $checksum_file"
}

verify_archive() {
    local archive="$1"
    
    log_info "Verifying archive: $(basename "$archive")"
    
    # Check if archive exists
    if [[ ! -f "$archive" ]]; then
        log_error "Archive not found: $archive"
        return 1
    fi
    
    # Test archive integrity
    if tar -tzf "$archive" > /dev/null 2>&1; then
        log_success "Archive integrity verified"
        
        # Verify checksum if exists
        local checksum_file="$CHECKSUM_DIR/$(basename "$archive").md5"
        if [[ -f "$checksum_file" ]]; then
            if md5sum -c "$checksum_file" &> /dev/null; then
                log_success "Checksum verified"
            else
                log_error "Checksum mismatch!"
                return 1
            fi
        fi
        
        return 0
    else
        log_error "Archive integrity check failed"
        return 1
    fi
}

safe_remove_original() {
    local source_dir="$1"
    local archive="${source_dir}.tar.gz"
    
    # Verify archive before removing original
    if verify_archive "$archive"; then
        log_warning "Removing original directory: $source_dir"
        log_warning "Press Ctrl+C within 5 seconds to cancel..."
        sleep 5
        
        rm -rf "$source_dir"
        log_success "Original directory removed"
        return 0
    else
        log_error "Archive verification failed - keeping original"
        return 1
    fi
}

process_directory() {
    local dir="$1"
    local auto_mode="${2:-false}"
    
    if [[ ! -d "$dir" ]]; then
        log_warning "Skipping: $dir (not a directory)"
        return 1
    fi
    
    if ! should_compress "$dir"; then
        log_info "Skipping: $(basename "$dir") (already compressed or too small)"
        return 0
    fi
    
    # Interactive confirmation unless auto mode
    if [[ "$auto_mode" != "true" ]]; then
        local size
        size=$(get_dir_size_human "$dir")
        echo
        log_info "Found: $(basename "$dir") ($size)"
        read -p "Compress this directory? (y/n): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log_info "Skipped by user"
            return 0
        fi
    fi
    
    # Compress
    if compress_directory "$dir"; then
        # Remove original if successful
        safe_remove_original "$dir"
        return 0
    else
        return 1
    fi
}

show_stats() {
    log_stats "=== Archive Statistics ==="
    
    # Count archives
    local archive_count
    archive_count=$(find "$ARCHIVE_ROOT" -maxdepth 1 -type f -name "*.tar.gz" | wc -l | tr -d ' ')
    echo "  Compressed archives: $archive_count"
    
    # Count uncompressed directories
    local dir_count
    dir_count=$(find "$ARCHIVE_ROOT" -maxdepth 1 -type d ! -name ".*" ! -path "$ARCHIVE_ROOT" | wc -l | tr -d ' ')
    echo "  Uncompressed directories: $dir_count"
    
    # Total sizes
    local total_archive_size
    total_archive_size=$(du -sh "$ARCHIVE_ROOT"/*.tar.gz 2>/dev/null | awk '{sum += $1} END {print sum}' || echo "0")
    echo "  Total archive size: $total_archive_size"
    
    # Potential savings
    if [[ $dir_count -gt 0 ]]; then
        local uncompressed_size
        uncompressed_size=$(du -sh "$ARCHIVE_ROOT"/* 2>/dev/null | grep -v ".tar.gz" | awk '{sum += $1} END {print sum}' || echo "0")
        echo "  Uncompressed size: $uncompressed_size"
        log_warning "Potential space savings: ~70-90% if compressed"
    fi
}

################################################################################
# Main Script
################################################################################

main() {
    local mode="${1:-interactive}"
    local project_name="${2:-}"
    
    echo "======================================================================"
    echo "  Archive Compression Script"
    echo "  Timestamp: $TIMESTAMP"
    echo "  Archive: $ARCHIVE_ROOT"
    echo "======================================================================"
    echo
    
    # Check dependencies
    check_dependencies
    
    # Create log
    mkdir -p "$(dirname "$LOG_FILE")"
    log_info "Log file: $LOG_FILE"
    echo
    
    case "$mode" in
        --auto)
            log_info "Mode: Automatic compression of all archives"
            
            find "$ARCHIVE_ROOT" -maxdepth 1 -type d ! -name ".*" ! -path "$ARCHIVE_ROOT" | while read -r dir; do
                process_directory "$dir" true
            done
            ;;
            
        --project)
            if [[ -z "$project_name" ]]; then
                log_error "Project name required: --project NAME"
                exit 1
            fi
            
            local target_dir="$ARCHIVE_ROOT/$project_name"
            if [[ -d "$target_dir" ]]; then
                process_directory "$target_dir" true
            else
                log_error "Project not found: $project_name"
                exit 1
            fi
            ;;
            
        --verify)
            log_info "Mode: Verify all archives"
            
            find "$ARCHIVE_ROOT" -maxdepth 1 -type f -name "*.tar.gz" | while read -r archive; do
                verify_archive "$archive"
            done
            ;;
            
        --stats)
            show_stats
            exit 0
            ;;
            
        *)
            log_info "Mode: Interactive compression"
            
            find "$ARCHIVE_ROOT" -maxdepth 1 -type d ! -name ".*" ! -path "$ARCHIVE_ROOT" | while read -r dir; do
                process_directory "$dir" false
            done
            ;;
    esac
    
    echo
    show_stats
    echo
    log_success "Archive compression workflow complete!"
    echo "======================================================================"
}

main "$@"
