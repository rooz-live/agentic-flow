#!/usr/bin/env bash
# ay-cleanup-free-riders.sh - Remove stale/unused artifacts
# Addresses MITIGATED #10: Free rider accumulation
# Run weekly via cron: 0 2 * * 0 /path/to/ay-cleanup-free-riders.sh
#
# Co-Authored-By: Warp <agent@warp.dev>

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
DB_PATH="${DB_PATH:-$PROJECT_ROOT/agentdb.db}"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    echo -e "${BLUE}[CLEANUP]${NC} $*"
}

success() {
    echo -e "${GREEN}✓${NC} $*"
}

warning() {
    echo -e "${YELLOW}⚠${NC} $*"
}

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  AY Free Rider Cleanup"
echo "  Removing stale artifacts older than threshold"
echo "═══════════════════════════════════════════════════════════"
echo ""

# Configuration
STALE_DAYS=${STALE_DAYS:-90}  # Files older than 90 days
DRY_RUN=${DRY_RUN:-0}         # Set to 1 for dry run
TOTAL_REMOVED=0
TOTAL_SAVED_MB=0

# ════════════════════════════════════════════════════════════
# 1. Clean stale learning files
# ════════════════════════════════════════════════════════════

log "Checking for stale learning files (>$STALE_DAYS days)..."

if [[ -d "$PROJECT_ROOT/.ay-learning" ]]; then
    mapfile -t stale_learning < <(find "$PROJECT_ROOT/.ay-learning" -name "*.json" -mtime +$STALE_DAYS 2>/dev/null)
    
    if [[ ${#stale_learning[@]} -gt 0 ]]; then
        local size_kb=$(du -sk "${stale_learning[@]}" 2>/dev/null | awk '{sum+=$1} END {print sum}')
        local size_mb=$((size_kb / 1024))
        
        warning "Found ${#stale_learning[@]} stale learning files ($size_mb MB)"
        
        if [[ $DRY_RUN -eq 0 ]]; then
            for file in "${stale_learning[@]}"; do
                rm -f "$file"
            done
            TOTAL_REMOVED=$((TOTAL_REMOVED + ${#stale_learning[@]}))
            TOTAL_SAVED_MB=$((TOTAL_SAVED_MB + size_mb))
            success "Removed ${#stale_learning[@]} stale learning files"
        else
            warning "DRY RUN: Would remove ${#stale_learning[@]} files"
        fi
    else
        success "No stale learning files found"
    fi
fi

# ════════════════════════════════════════════════════════════
# 2. Clean stale baselines
# ════════════════════════════════════════════════════════════

log "Checking for stale baseline files (>$STALE_DAYS days)..."

if [[ -d "$PROJECT_ROOT/.ay-baselines" ]]; then
    mapfile -t stale_baselines < <(find "$PROJECT_ROOT/.ay-baselines" -name "*.json" -mtime +$STALE_DAYS 2>/dev/null)
    
    if [[ ${#stale_baselines[@]} -gt 0 ]]; then
        local size_kb=$(du -sk "${stale_baselines[@]}" 2>/dev/null | awk '{sum+=$1} END {print sum}')
        local size_mb=$((size_kb / 1024))
        
        warning "Found ${#stale_baselines[@]} stale baseline files ($size_mb MB)"
        
        if [[ $DRY_RUN -eq 0 ]]; then
            for file in "${stale_baselines[@]}"; do
                rm -f "$file"
            done
            TOTAL_REMOVED=$((TOTAL_REMOVED + ${#stale_baselines[@]}))
            TOTAL_SAVED_MB=$((TOTAL_SAVED_MB + size_mb))
            success "Removed ${#stale_baselines[@]} stale baseline files"
        else
            warning "DRY RUN: Would remove ${#stale_baselines[@]} files"
        fi
    else
        success "No stale baseline files found"
    fi
fi

# ════════════════════════════════════════════════════════════
# 3. Clean old verdict records (keep last 30 days)
# ════════════════════════════════════════════════════════════

log "Checking for old verdict records (>30 days)..."

if [[ -f "$PROJECT_ROOT/.ay-verdicts/registry.json" ]]; then
    local old_count=$(jq '[.verdicts[] | select(.timestamp < (now - 2592000 | todate))] | length' "$PROJECT_ROOT/.ay-verdicts/registry.json" 2>/dev/null || echo "0")
    
    if [[ $old_count -gt 0 ]]; then
        warning "Found $old_count old verdict records"
        
        if [[ $DRY_RUN -eq 0 ]]; then
            jq '.verdicts = [.verdicts[] | select(.timestamp >= (now - 2592000 | todate))]' \
                "$PROJECT_ROOT/.ay-verdicts/registry.json" > "$PROJECT_ROOT/.ay-verdicts/registry.json.tmp"
            mv "$PROJECT_ROOT/.ay-verdicts/registry.json.tmp" "$PROJECT_ROOT/.ay-verdicts/registry.json"
            success "Pruned $old_count old verdict records"
        else
            warning "DRY RUN: Would prune $old_count verdict records"
        fi
    else
        success "No old verdict records found"
    fi
fi

# ════════════════════════════════════════════════════════════
# 4. Clean orphaned cache files
# ════════════════════════════════════════════════════════════

log "Checking for orphaned cache files..."

if [[ -d "$PROJECT_ROOT/.cache" ]]; then
    mapfile -t orphaned_cache < <(find "$PROJECT_ROOT/.cache" -name "learning-retro-*.json" -mtime +30 2>/dev/null)
    
    if [[ ${#orphaned_cache[@]} -gt 0 ]]; then
        local size_kb=$(du -sk "${orphaned_cache[@]}" 2>/dev/null | awk '{sum+=$1} END {print sum}')
        local size_mb=$((size_kb / 1024))
        
        warning "Found ${#orphaned_cache[@]} orphaned cache files ($size_mb MB)"
        
        if [[ $DRY_RUN -eq 0 ]]; then
            for file in "${orphaned_cache[@]}"; do
                rm -f "$file"
            done
            TOTAL_REMOVED=$((TOTAL_REMOVED + ${#orphaned_cache[@]}))
            TOTAL_SAVED_MB=$((TOTAL_SAVED_MB + size_mb))
            success "Removed ${#orphaned_cache[@]} orphaned cache files"
        else
            warning "DRY RUN: Would remove ${#orphaned_cache[@]} files"
        fi
    else
        success "No orphaned cache files found"
    fi
fi

# ════════════════════════════════════════════════════════════
# 5. Archive old database episodes (>180 days)
# ════════════════════════════════════════════════════════════

log "Checking for old database episodes (>180 days)..."

local old_episodes=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM episodes WHERE created_at < datetime('now', '-180 days')" 2>/dev/null || echo "0")

if [[ $old_episodes -gt 0 ]]; then
    warning "Found $old_episodes old episodes"
    
    if [[ $DRY_RUN -eq 0 ]]; then
        # Archive to JSON before deleting
        local archive_file="$PROJECT_ROOT/.ay-archive/episodes-$(date +%Y%m%d).json"
        mkdir -p "$PROJECT_ROOT/.ay-archive"
        
        sqlite3 "$DB_PATH" "SELECT json_group_array(json_object(
            'id', id,
            'ts', ts,
            'session_id', session_id,
            'task', task,
            'reward', reward,
            'success', success
        )) FROM episodes WHERE created_at < datetime('now', '-180 days')" > "$archive_file" 2>/dev/null || true
        
        # Delete old episodes
        sqlite3 "$DB_PATH" "DELETE FROM episodes WHERE created_at < datetime('now', '-180 days')" 2>/dev/null || true
        
        success "Archived and removed $old_episodes old episodes"
    else
        warning "DRY RUN: Would archive $old_episodes episodes"
    fi
else
    success "No old episodes to archive"
fi

# ════════════════════════════════════════════════════════════
# SUMMARY
# ════════════════════════════════════════════════════════════

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  Cleanup Summary"
echo "═══════════════════════════════════════════════════════════"
echo ""

if [[ $DRY_RUN -eq 1 ]]; then
    warning "DRY RUN MODE - No files were actually deleted"
else
    success "Files removed: $TOTAL_REMOVED"
    success "Space saved: ${TOTAL_SAVED_MB} MB"
fi

echo ""
echo "To run as dry run: DRY_RUN=1 $0"
echo "To change stale threshold: STALE_DAYS=60 $0"
echo ""
echo "Add to cron for weekly cleanup:"
echo "  0 2 * * 0 $0  # Every Sunday at 2am"
echo ""
