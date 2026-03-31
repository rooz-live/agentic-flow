#!/usr/bin/env bash
# email-hash-db.sh — SHA256 append-only hash log for .eml deduplication (Grimes loop prevention)
# @adr ADR-001: Shared by validate-email.sh; testable CRUD surface for Method score
#
# Env:
#   EMAIL_HASH_LOG — path to log file (default: ~/Library/Logs/agentic-email-hashes.log)
#   EMAIL_HASH_LOCK_DIR — optional flock directory (default: dirname of log + .locks)
#
# Do not impose strict mode when sourced (validate-email.sh owns strict mode).
#
# RETENTION (production): The append-only log at EMAIL_HASH_LOG (default
# ~/Library/Logs/agentic-email-hashes.log) is audit/dedupe evidence — do NOT
# delete it during disk cleanup. Archive or backup only. See docs/EMAIL-HASH-RETENTION.md.

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  set -euo pipefail
fi

# Portable lock: mkdir atomic (macOS has no util-linux flock by default)
_EMAIL_HASH_LOCK_MARKER=""

init_hash_db() {
  local log_path="${1:-${EMAIL_HASH_LOG:-$HOME/Library/Logs/agentic-email-hashes.log}}"
  local d
  d=$(dirname "$log_path")
  mkdir -p "$d" 2>/dev/null || true
  [[ -f "$log_path" ]] || touch "$log_path" 2>/dev/null || true
}

compute_email_hash() {
  local file="$1"
  if [[ ! -f "$file" ]]; then
    echo ""
    return 1
  fi
  shasum -a 256 "$file" | awk '{print $1}'
}

# Returns 0 if hash already registered, 1 if new
check_duplicate_email() {
  local hash="$1"
  local log_path="${2:-${EMAIL_HASH_LOG:-$HOME/Library/Logs/agentic-email-hashes.log}}"
  [[ -n "$hash" ]] || return 1
  [[ -f "$log_path" ]] || return 1
  grep -q "^$hash" "$log_path" 2>/dev/null
}

acquire_lock() {
  local log_path="${1:-${EMAIL_HASH_LOG:-$HOME/Library/Logs/agentic-email-hashes.log}}"
  local lock_dir="${EMAIL_HASH_LOCK_DIR:-$(dirname "$log_path")/.email-hash-locks}"
  mkdir -p "$lock_dir" 2>/dev/null || true
  _EMAIL_HASH_LOCK_MARKER="$lock_dir/hash-db.lock.dir"
  local i=0
  while ! mkdir "$_EMAIL_HASH_LOCK_MARKER" 2>/dev/null; do
    sleep 0.05
    i=$((i + 1))
    if [[ "$i" -ge 400 ]]; then
      return 1
    fi
  done
}

release_lock() {
  rm -rf "${_EMAIL_HASH_LOCK_MARKER:-}" 2>/dev/null || true
  _EMAIL_HASH_LOCK_MARKER=""
}

# Append hash line; call under acquire_lock for atomicity
register_hash() {
  local hash="$1"
  local basename_hint="${2:-unknown}"
  local log_path="${3:-${EMAIL_HASH_LOG:-$HOME/Library/Logs/agentic-email-hashes.log}}"
  local ts
  ts=$(date -u +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date -u +%s)
  echo "$hash $basename_hint $ts" >> "$log_path"
}
