#!/usr/bin/env bash
# Canonical registry: ../_SYSTEM/_AUTOMATION/exit-codes-robust.sh
# This file sources robust zones and adds describe_exit_code + helpers for callers that
# historically imported scripts/exit-codes.sh (single source of truth; no duplicate numeric zones).
# @adr ADR-019: Align all validators on exit-codes-robust.sh semantics

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
_PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
# shellcheck source=../_SYSTEM/_AUTOMATION/exit-codes-robust.sh
source "$_PROJECT_ROOT/_SYSTEM/_AUTOMATION/exit-codes-robust.sh"

# Legacy alias: older docs referenced EX_SUCCESS_WITH_WARNINGS alongside robust names
export EX_SUCCESS_WITH_WARNINGS="${EX_SUCCESS_WARNING:-2}"

# describe_exit_code — human-readable line for logs (robust zones)
describe_exit_code() {
    local code="$1"
    case "$code" in
        0) echo "Success" ;;
        1) echo "Success with warnings (noop)" ;;
        2) echo "Success with warnings" ;;
        10) echo "Invalid arguments" ;;
        11) echo "File not found" ;;
        12) echo "Invalid format" ;;
        21) echo "Missing required field" ;;
        51|52|53|54|55) echo "File system or I/O error" ;;
        100) echo "Schema or dependency validation failed" ;;
        101) echo "API unavailable" ;;
        102) echo "Auth failure" ;;
        103) echo "Database unavailable" ;;
        104) echo "Network timeout" ;;
        110) echo "Date in past" ;;
        111) echo "Placeholder detected" ;;
        120) echo "Duplicate email detected" ;;
        130) echo "Address mismatch" ;;
        150) echo "Validation failed (domain)" ;;
        156) echo "ROAM stale" ;;
        160) echo "Validation warning / WSJF low" ;;
        170) echo "HITL pending" ;;
        180) echo "Not actually sent" ;;
        200) echo "Disk full" ;;
        210) echo "Permission denied" ;;
        211|212|213|214|215|216|217|218|219|221) echo "Tunnel orchestration error" ;;
        220) echo "Daemon crashed" ;;
        230) echo "Database locked" ;;
        240) echo "Memory exhausted" ;;
        250|251|252) echo "Critical data or fatal error" ;;
        255) echo "Panic" ;;
        *) echo "Unknown exit code: $code" ;;
    esac
}

log_exit() {
    local code="$1"
    local message="$2"
    local description
    description=$(describe_exit_code "$code")
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] EXIT $code: $description - $message" >&2
}

safe_exit() {
    local code="$1"
    local message="${2:-}"
    if [[ -n "$message" ]]; then
        log_exit "$code" "$message"
    fi
    exit "$code"
}

validate_file_exists() {
    local file="$1"
    local context="${2:-file}"
    if [[ ! -f "$file" ]]; then
        safe_exit "${EX_NOINPUT:?}" "$context not found: $file"
    fi
}

validate_directory_exists() {
    local dir="$1"
    local context="${2:-directory}"
    if [[ ! -d "$dir" ]]; then
        safe_exit "${EX_NOINPUT:?}" "$context not found: $dir"
    fi
}

validate_command_exists() {
    local cmd="$1"
    if ! command -v "$cmd" >/dev/null 2>&1; then
        safe_exit "${EXIT_TOOL_MISSING:?}" "Required command not found: $cmd"
    fi
}

check_disk_space() {
    local threshold="${1:-90}"
    local usage
    usage=$(df . | tail -1 | awk '{print $5}' | sed 's/%//')
    if [[ "$usage" -ge "$threshold" ]]; then
        safe_exit "${EX_DISK_FULL:?}" "Disk usage ${usage}% exceeds threshold ${threshold}%"
    fi
}

check_memory() {
    local threshold="${1:-100}"
    local memory_free
    memory_free=$(vm_stat 2>/dev/null | grep "Pages free" | awk '{print $3}' | sed 's/\.//' || echo 0)
    local memory_mb=$(( memory_free * 4096 / 1024 / 1024 ))
    if [[ "$memory_mb" -le "$threshold" ]]; then
        safe_exit "${EX_MEMORY_EXHAUSTED:?}" "Memory ${memory_mb}MB below threshold ${threshold}MB"
    fi
}

export -f describe_exit_code log_exit safe_exit validate_file_exists validate_directory_exists validate_command_exists check_disk_space check_memory 2>/dev/null || true
