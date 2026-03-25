#!/usr/bin/env bash
# email-hash-db.sh - SHA256 Hash Database for Duplicate Email Detection
# CROSS-REF: TODO #3 | ROAM R-2026-012 (duplicate send risk)
# MPP: method=persistence | pattern=database | protocol=file_backed
# AISP: Atomicity (lock-based), Idempotency (hash dedup), Safety (read-only check), Precision (SHA256)
#
# PURPOSE: Prevent duplicate email sends to critical recipients (Mike Chaney, Attorney Grimes)
# ARCHITECTURE: TSV database with hash|timestamp|recipient|subject|status columns
#
# USAGE:
#   source email-hash-db.sh
#   check_duplicate_email "$email_file" "$recipient" || exit $EXIT_DUPLICATE_DETECTED
#   record_email_hash "$email_file" "$recipient" "sent"

set -euo pipefail

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# CONFIGURATION
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BASE_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Database location
HASH_DB="${HASH_DB:-$SCRIPT_DIR/.email-hashes.db}"
HASH_DB_LOCK="${HASH_DB}.lock"

# Source exit codes
# shellcheck source=exit-codes.sh
source "$SCRIPT_DIR/exit-codes.sh" 2>/dev/null || true

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# DATABASE INITIALIZATION
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

init_hash_db() {
    if [[ ! -f "$HASH_DB" ]]; then
        # Create database with header
        cat > "$HASH_DB" <<'EOF'
# Email Hash Database v1.0
# Format: hash<TAB>timestamp<TAB>recipient<TAB>subject<TAB>status<TAB>notes
# Status: draft|validated|sent|failed|duplicate
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
EOF
        echo "✓ Initialized hash database: $HASH_DB" >&2
    fi
}

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# LOCKING PRIMITIVES (Atomicity)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

acquire_lock() {
    local timeout=10
    local elapsed=0
    
    while [[ $elapsed -lt $timeout ]]; do
        if mkdir "$HASH_DB_LOCK" 2>/dev/null; then
            # Lock acquired
            trap 'release_lock' EXIT INT TERM
            return 0
        fi
        sleep 0.1
        elapsed=$((elapsed + 1))
    done
    
    echo "ERROR: Failed to acquire lock on $HASH_DB (timeout)" >&2
    return 1
}

release_lock() {
    rmdir "$HASH_DB_LOCK" 2>/dev/null || true
    trap - EXIT INT TERM
}

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# CORE HASH OPERATIONS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

# Compute SHA256 hash of email content (excluding headers)
compute_email_hash() {
    local email_file="$1"
    
    [[ ! -f "$email_file" ]] && {
        echo "ERROR: Email file not found: $email_file" >&2
        return 1
    }
    
    # Extract body only (after first blank line)
    awk 'BEGIN{body=0} /^$/{body=1; next} body{print}' "$email_file" | \
        shasum -a 256 | awk '{print $1}'
}

# Extract subject from email
extract_subject() {
    local email_file="$1"
    
    [[ ! -f "$email_file" ]] && return 1
    
    grep -i '^Subject:' "$email_file" | sed 's/^Subject: *//i' | head -1
}

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# DATABASE CRUD OPERATIONS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

# Check if email hash exists (READ)
# Returns: 0 if DUPLICATE found, 1 if NEW/UNIQUE
check_duplicate_email() {
    local email_file="$1"
    local recipient="${2:-}"
    
    init_hash_db
    
    local hash
    hash=$(compute_email_hash "$email_file") || return 1
    
    # Check if hash exists in database
    if grep -q "^${hash}" "$HASH_DB"; then
        # Duplicate found
        local existing_entry
        existing_entry=$(grep "^${hash}" "$HASH_DB" | head -1)
        
        echo "DUPLICATE DETECTED:" >&2
        echo "  Hash: $hash" >&2
        echo "  Existing: $existing_entry" >&2
        
        return 0  # 0 = duplicate exists
    fi
    
    return 1  # 1 = unique (no duplicate)
}

# Record email hash (CREATE)
record_email_hash() {
    local email_file="$1"
    local recipient="$2"
    local status="${3:-draft}"
    local notes="${4:-}"
    
    init_hash_db
    acquire_lock || return 1
    
    local hash
    hash=$(compute_email_hash "$email_file") || {
        release_lock
        return 1
    }
    
    local subject
    subject=$(extract_subject "$email_file" | tr '\t' ' ')
    
    local timestamp
    timestamp=$(date -u +%Y-%m-%dT%H:%M:%SZ)
    
    # Append to database (TSV format)
    printf "%s\t%s\t%s\t%s\t%s\t%s\n" \
        "$hash" "$timestamp" "$recipient" "$subject" "$status" "$notes" \
        >> "$HASH_DB"
    
    release_lock
    
    echo "✓ Recorded: hash=${hash:0:12}... recipient=$recipient status=$status" >&2
}

# Update email hash status (UPDATE)
update_email_status() {
    local hash="$1"
    local new_status="$2"
    local notes="${3:-}"
    
    acquire_lock || return 1
    
    local temp_file
    temp_file=$(mktemp)
    
    # Update status in-place
    awk -v hash="$hash" -v status="$new_status" -v notes="$notes" \
        'BEGIN{FS=OFS="\t"} $1==hash{$5=status; if(notes!="")$6=notes} {print}' \
        "$HASH_DB" > "$temp_file"
    
    mv "$temp_file" "$HASH_DB"
    
    release_lock
    
    echo "✓ Updated: hash=${hash:0:12}... status=$new_status" >&2
}

# Query database (READ)
query_hash_db() {
    local filter="${1:-}"
    
    init_hash_db
    
    if [[ -z "$filter" ]]; then
        # Show all non-comment lines
        grep -v '^#' "$HASH_DB"
    else
        # Filter by recipient or status
        grep -v '^#' "$HASH_DB" | grep -i "$filter"
    fi
}

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# STATISTICS & REPORTING
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

show_hash_stats() {
    init_hash_db
    
    local total
    total=$(grep -cv '^#' "$HASH_DB")
    
    local sent
    sent=$(grep -v '^#' "$HASH_DB" | awk -F'\t' '$5=="sent"' | wc -l | xargs)
    
    local draft
    draft=$(grep -v '^#' "$HASH_DB" | awk -F'\t' '$5=="draft"' | wc -l | xargs)
    
    local duplicates
    duplicates=$(grep -v '^#' "$HASH_DB" | awk -F'\t' '$5=="duplicate"' | wc -l | xargs)
    
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "Email Hash Database Statistics"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "Total records:     $total"
    echo "Sent:              $sent"
    echo "Draft:             $draft"
    echo "Duplicates caught: $duplicates"
    echo ""
    echo "Database: $HASH_DB"
}

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# CLI INTERFACE
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

show_help() {
    cat <<'HELP'
email-hash-db.sh - SHA256 Hash Database for Duplicate Email Detection

USAGE:
    email-hash-db.sh check <email_file> [recipient]
    email-hash-db.sh record <email_file> <recipient> [status] [notes]
    email-hash-db.sh update <hash> <status> [notes]
    email-hash-db.sh query [filter]
    email-hash-db.sh stats
    email-hash-db.sh --help

COMMANDS:
    check    - Check if email is duplicate (exit 0 if dup, 1 if unique)
    record   - Record email hash with metadata
    update   - Update status of existing hash
    query    - Query database (filter by recipient/status)
    stats    - Show database statistics

EXAMPLES:
    # Check for duplicate before sending
    email-hash-db.sh check EMAIL-TO-MIKE.eml "mike@example.com"
    
    # Record sent email
    email-hash-db.sh record EMAIL-TO-MIKE.eml "mike@example.com" sent
    
    # Query all emails to Attorney Grimes
    email-hash-db.sh query "grimes"
    
    # Show statistics
    email-hash-db.sh stats

EXIT CODES:
    0  - Duplicate found (for check command)
    1  - Unique/no duplicate (for check command)
    
DATABASE:
    Location: _SYSTEM/_AUTOMATION/.email-hashes.db
    Format:   hash<TAB>timestamp<TAB>recipient<TAB>subject<TAB>status<TAB>notes
    
HELP
}

# Main entry point
main() {
    case "${1:-}" in
        check)
            shift
            check_duplicate_email "$@"
            ;;
        record)
            shift
            record_email_hash "$@"
            ;;
        update)
            shift
            update_email_status "$@"
            ;;
        query)
            shift
            query_hash_db "$@"
            ;;
        stats)
            show_hash_stats
            ;;
        --help|-h|help)
            show_help
            exit 0
            ;;
        "")
            echo "ERROR: No command specified"
            echo "Run '$0 --help' for usage"
            exit 1
            ;;
        *)
            echo "ERROR: Unknown command: $1"
            echo "Run '$0 --help' for usage"
            exit 1
            ;;
    esac
}

# Execute if run directly (not sourced)
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
