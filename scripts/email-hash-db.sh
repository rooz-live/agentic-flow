#!/bin/bash
# scripts/email-hash-db.sh
# @business-context WSJF-2: Essential duplicate tracking logic for evidence
# @adr ADR-019: Hash DB operations validated offline with tempfiles
# @constraint DDD-PERSISTENCE: Testing data bounds outside core flow
#
# RETENTION: DB_FILE under ~/.email_hash_db is operational history — do not
# delete without backup and explicit retention sign-off. Production pipeline
# log is separate; see _SYSTEM/_AUTOMATION/email-hash-db.sh and
# docs/EMAIL-HASH-RETENTION.md.

set -euo pipefail

DB_DIR="${HOME}/.email_hash_db"
DB_FILE="${DB_DIR}/hashes.csv"
LOCK_FILE="${DB_DIR}/db.lock"

function show_help() {
    echo "Usage: email-hash-db.sh [command] [args]"
    echo "Commands:"
    echo "  init          - Initialize database"
    echo "  hash <file>   - Compute email hash"
    echo "  subject <file>- Extract subject"
    echo "  check <hash>  - Check if hash exists"
    echo "  record <hash> <file> - Record email"
    echo "  update <hash> <status> - Update status"
    echo "  query <hash>  - Query status"
    echo "  stats         - Show statistics"
    return 0
}

function init_hash_db() {
    mkdir -p "${DB_DIR}"
    if [[ ! -f "${DB_FILE}" ]]; then
        echo "hash,timestamp,file,status" > "${DB_FILE}"
    fi
    return 0
}

function acquire_lock() {
    # Simple lock mechanism suitable for basic offline use
    local retries=5
    while [[ -f "${LOCK_FILE}" ]] && [[ $retries -gt 0 ]]; do
        sleep 1
        ((retries--))
    done
    if [[ -f "${LOCK_FILE}" ]]; then
        return 1
    fi
    touch "${LOCK_FILE}"
    return 0
}

function release_lock() {
    rm -f "${LOCK_FILE}"
    return 0
}

function compute_email_hash() {
    local file="$1"
    if [[ ! -f "$file" ]]; then return 1; fi
    shasum -a 256 "$file" | awk '{print $1}'
    return 0
}

function extract_subject() {
    local file="$1"
    if [[ ! -f "$file" ]]; then return 1; fi
    grep -i "^Subject:" "$file" | sed 's/^Subject: *//i' || echo "(No Subject)"
    return 0
}

function check_duplicate_email() {
    local hash="$1"
    if grep -q "^${hash}," "${DB_FILE}"; then
        return 0 # Duplicate exists
    fi
    return 1 # Not a duplicate
}

function record_email_hash() {
    local hash="$1"
    local file="$2"
    local timestamp=$(date +%s)
    echo "${hash},${timestamp},${file},PENDING" >> "${DB_FILE}"
    return 0
}

function update_email_status() {
    local hash="$1"
    local status="$2"
    # Basic inline replacement simulation logic
    local temp_file="${DB_FILE}.tmp"
    awk -F, -v h="$hash" -v s="$status" 'BEGIN{OFS=","} {if ($1 == h) $4=s; print $0}' "${DB_FILE}" > "$temp_file"
    mv "$temp_file" "${DB_FILE}"
    return 0
}

function query_hash_db() {
    local hash="$1"
    grep "^${hash}," "${DB_FILE}" | cut -d, -f4 || echo "NOT_FOUND"
    return 0
}

function show_hash_stats() {
    local count=$(tail -n +2 "${DB_FILE}" 2>/dev/null | wc -l | tr -d ' ' || echo 0)
    echo "Total entries: $count"
    return 0
}

function main() {
    local cmd="${1:-}"
    shift || true
    
    init_hash_db
    
    case "$cmd" in
        init) return 0 ;;
        hash) compute_email_hash "$1" ;;
        subject) extract_subject "$1" ;;
        check) check_duplicate_email "$1" ;;
        record) 
            acquire_lock || return 1
            record_email_hash "$1" "${2:-}"
            release_lock
            ;;
        update)
            acquire_lock || return 1
            update_email_status "$1" "$2"
            release_lock
            ;;
        query) query_hash_db "$1" ;;
        stats) show_hash_stats ;;
        help|"") show_help ;;
        *) echo "Unknown command: $cmd"; return 1 ;;
    esac
}

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
