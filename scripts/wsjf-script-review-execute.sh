#!/usr/bin/env bash
# wsjf-script-review-execute.sh — Iterative script review/execution with WSJF ordering
#
# Flow: discover scripts → review (syntax) → score (WSJF) → execute in priority order.
# Supports: --dry-run, --max N, --interactive, --iterate N.
#
# WSJF in script: first 30 lines, e.g. "# WSJF: 85" or "# WSJF=90" (default 50).

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

log()   { echo -e "${BLUE}[review-exec]${NC} $*"; }
ok()    { echo -e "${GREEN}[OK]${NC} $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $*"; }
err()   { echo -e "${RED}[ERR]${NC} $*"; }

# Defaults
SEARCH_DIR="${SEARCH_DIR:-$SCRIPT_DIR}"
GLOB="${GLOB:-*.sh}"
DEFAULT_WSJF="${DEFAULT_WSJF:-50}"
MAX_SCRIPTS=""
DRY_RUN=false
INTERACTIVE=false
ITERATE=1
REVIEW_ONLY=false
JSON_OUT=""

usage() {
  cat << EOF
Usage: $0 [options] [--] [script ...]

Iterative script review/execution with WSJF ordering.

Options:
  --dir DIR       Directory to search (default: scripts/)
  --glob PATTERN  Glob for names (default: *.sh); use "*.py" or "*" for both
  --default-wsjf N  Default WSJF when not in script (default: 50)
  --max N         Run at most N scripts per iteration
  --dry-run       Only review and list order; do not execute
  --interactive   Prompt before each script execution
  --iterate N     Run full cycle (review→sort→execute) N times (default: 1)
  --review-only   Only run review/sort; do not execute
  --json          Emit sorted list as JSON to stdout (one object per line)

Convention: in script, set WSJF in first 30 lines, e.g.:
  # WSJF: 85
  # WSJF=90

Examples:
  $0 --dir scripts --max 5
  $0 --dry-run --dir scripts
  $0 --iterate 2 --max 3 --interactive
  $0 --review-only --json
EOF
  exit 0
}

# Parse args
EXTRA=()
while [[ $# -gt 0 ]]; do
  case "$1" in
    --dir)          SEARCH_DIR="$2"; shift 2 ;;
    --glob)         GLOB="$2"; shift 2 ;;
    --default-wsjf) DEFAULT_WSJF="$2"; shift 2 ;;
    --max)          MAX_SCRIPTS="$2"; shift 2 ;;
    --dry-run)      DRY_RUN=true; shift ;;
    --interactive)  INTERACTIVE=true; shift ;;
    --iterate)      ITERATE="$2"; shift 2 ;;
    --review-only)  REVIEW_ONLY=true; shift ;;
    --json)         JSON_OUT=true; shift ;;
    --help|-h)      usage ;;
    --)             shift; EXTRA=("$@"); break ;;
    *)              EXTRA+=("$1"); shift ;;
  esac
done

# Discover scripts (or use explicit list)
discover_scripts() {
  if [[ ${#EXTRA[@]} -gt 0 ]]; then
    printf '%s\n' "${EXTRA[@]}"
    return
  fi
  if [[ "$GLOB" == "*" ]]; then
    find "$SEARCH_DIR" -maxdepth 3 -type f \( -name "*.sh" -o -name "*.py" \) 2>/dev/null | sort
  else
    find "$SEARCH_DIR" -maxdepth 3 -type f -name "$GLOB" 2>/dev/null | sort
  fi
}

# Review: syntax check. Exit 0 = OK, 1 = fail
review_one() {
  local path="$1"
  local ext="${path##*.}"
  if [[ "$ext" == "sh" ]]; then
    bash -n "$path" 2>/dev/null
    return $?
  fi
  if [[ "$ext" == "py" ]]; then
    python3 -m py_compile "$path" 2>/dev/null
    return $?
  fi
  return 0
}

# Extract WSJF from first 30 lines: # WSJF: N or # WSJF=N
extract_wsjf() {
  local path="$1"
  local score
  score=$(head -n 30 "$path" 2>/dev/null | grep -iE '^\s*#\s*WSJF\s*[=:]\s*[0-9]+' | head -n 1 | grep -oE '[0-9]+')
  if [[ -n "$score" ]]; then
    echo "$score"
  else
    echo "$DEFAULT_WSJF"
  fi
}

# Full review: discover → syntax check → WSJF; output "score|path|ok" per line
review_all() {
  local script
  while IFS= read -r script; do
    [[ -z "$script" || ! -f "$script" ]] && continue
    local wsjf
    wsjf=$(extract_wsjf "$script")
    local ok_flag="1"
    if ! review_one "$script"; then
      ok_flag="0"
    fi
    echo "${wsjf}|${script}|${ok_flag}"
  done < <(discover_scripts)
}

# Sort by WSJF descending, then by path; optionally cap at --max
sort_and_cap() {
  if [[ -n "${MAX_SCRIPTS:-}" ]]; then
    sort -t'|' -k1,1nr -k2,2 | head -n "$MAX_SCRIPTS"
  else
    sort -t'|' -k1,1nr -k2,2
  fi
}

# Execute one script (or dry-run print)
run_one() {
  local path="$1"
  local wsjf="$2"
  if $DRY_RUN; then
    log "would run WSJF=$wsjf $path"
    return 0
  fi
  if $INTERACTIVE; then
    echo -n "Run $path (WSJF=$wsjf)? [y/N] "
    read -r ans
    [[ "${ans,,}" != "y" && "${ans,,}" != "yes" ]] && return 0
  fi
  log "executing $path (WSJF=$wsjf)"
  if [[ "${path##*.}" == "py" ]]; then
    python3 "$path" || true
  else
    bash "$path" || true
  fi
}

main() {
  local iter=1
  while [[ $iter -le $ITERATE ]]; do
    if [[ $ITERATE -gt 1 ]]; then
      log "=== iteration $iter/$ITERATE ==="
    fi

    # Review and sort
    local list
    list=$(review_all | sort_and_cap)
    local total pass fail
    total=$(echo "$list" | grep -c . || echo 0)
    pass=$(echo "$list" | grep -c '|1$' || echo 0)
    fail=$((total - pass))

    if $JSON_OUT; then
      echo "$list" | while IFS= read -r line; do
        [[ -z "$line" ]] && continue
        local wsjf path ok_flag rest
        wsjf="${line%%|*}"; rest="${line#*|}"; path="${rest%%|*}"; ok_flag="${rest##*|}"
        echo "{\"wsjf\":$wsjf,\"path\":\"$path\",\"review_ok\":$ok_flag}"
      done
      ok "done (json)"
      exit 0
    fi

    log "review: $pass passed, $fail failed (syntax), $total total (WSJF-ordered)"
    if [[ $fail -gt 0 ]]; then
      echo "$list" | grep '|0$' | while IFS= read -r line; do
        path="${line#*|}"; path="${path%|*}"
        warn "syntax: $path"
      done
    fi

    if $REVIEW_ONLY; then
      log "review-only: no execution"
      echo "$list" | while IFS= read -r line; do
        [[ -z "$line" ]] && continue
        wsjf="${line%%|*}"; rest="${line#*|}"; path="${rest%%|*}"; ok="${rest##*|}"
        echo "  $wsjf  $path  (review_ok=$ok)"
      done
      iter=$((iter + 1))
      continue
    fi

    # Execute in order (only those that passed review, unless dry-run)
    echo "$list" | while IFS= read -r line; do
      [[ -z "$line" ]] && continue
      wsjf="${line%%|*}"; rest="${line#*|}"; path="${rest%%|*}"; ok="${rest##*|}"
      if [[ "$ok" == "0" && "$DRY_RUN" != "true" ]]; then
        warn "skip (review fail): $path"
        continue
      fi
      run_one "$path" "$wsjf"
    done

    iter=$((iter + 1))
    [[ $iter -le $ITERATE ]] && sleep 1
  done
  ok "done"
}

main
