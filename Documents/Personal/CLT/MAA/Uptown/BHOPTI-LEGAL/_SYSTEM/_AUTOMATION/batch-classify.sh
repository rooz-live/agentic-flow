#!/bin/bash
# batch-classify.sh — Bulk file classifier for bhopti-legal pipeline
#
# Usage:
#   batch-classify.sh --file FILE                classify a single file
#   batch-classify.sh --dir DIR                  classify all files in DIR (non-recursive)
#   batch-classify.sh --all-files                scan entire BHOPTI-LEGAL tree
#   batch-classify.sh --newer N                  classify files modified in last N days
#   batch-classify.sh --json                     output JSON instead of text
#   batch-classify.sh --level RED|YELLOW|GREEN   filter by level
#   batch-classify.sh --help
#
# Exit codes:
#   0  — no classified hits (all NONE, or file not found)
#   1  — one or more files classified (RED/YELLOW/GREEN hits)
#   21 — missing argument
#   22 — invalid argument

set -uo pipefail

LEGAL="/Users/shahroozbhopti/Documents/Personal/CLT/MAA/Uptown/BHOPTI-LEGAL"
AUTO_DIR="${LEGAL}/_SYSTEM/_AUTOMATION"
LOG_FILE="${HOME}/Library/Logs/batch-classify.log"

# Source shared rules
# shellcheck source=./_classifier-rules.sh
if ! source "${AUTO_DIR}/_classifier-rules.sh" 2>/dev/null; then
  echo "ERROR: cannot source _classifier-rules.sh from ${AUTO_DIR}" >&2
  exit 22
fi

timestamp() { date '+%Y-%m-%d %H:%M:%S'; }
log() { echo "[$(timestamp)] $*" | tee -a "$LOG_FILE"; }

infer_confidence() {
  local level="$1"
  local bounce="$2"
  if [[ "$bounce" == "true" ]]; then
    echo "0.99"
    return
  fi
  case "$level" in
    RED) echo "0.95" ;;
    YELLOW) echo "0.85" ;;
    GREEN) echo "0.75" ;;
    *) echo "0.50" ;;
  esac
}

match_rule_pattern() {
  local filename="$1"
  for rule in "${FILE_CLASSIFIER[@]}"; do
    IFS='|' read -r pattern _roam _level _message <<< "$rule"
    if echo "$filename" | grep -qiE "$pattern"; then
      echo "$pattern"
      return 0
    fi
  done
  echo "none"
}

# ─── ARGUMENT PARSING ─────────────────────────────────────────────────────────
MODE="none"        # single-file | dir | all-files | newer
TARGET=""
NEWER_DAYS=0
OUTPUT_JSON=false
LEVEL_FILTER=""    # RED | YELLOW | GREEN | "" (all)
LIST_FILE="$(mktemp)"

if [[ $# -eq 0 ]]; then
  echo "Usage: batch-classify.sh --file FILE | --dir DIR | --all-files | --newer N [--json] [--level LEVEL]" >&2
  exit 21
fi

while [[ $# -gt 0 ]]; do
  case "$1" in
    --file)      [[ -z "${2:-}" ]] && { echo "ERROR: --file requires a path" >&2; exit 21; }
                 MODE="single-file"; TARGET="$2"; shift 2 ;;
    --dir)       [[ -z "${2:-}" ]] && { echo "ERROR: --dir requires a path" >&2; exit 21; }
                 MODE="dir"; TARGET="$2"; shift 2 ;;
    --all-files) MODE="all-files"; shift ;;
    --newer)     [[ -z "${2:-}" ]] && { echo "ERROR: --newer requires a number" >&2; exit 21; }
                 MODE="newer"; NEWER_DAYS="$2"; shift 2 ;;
    --json)      OUTPUT_JSON=true; shift ;;
    --level)     [[ -z "${2:-}" ]] && { echo "ERROR: --level requires RED|YELLOW|GREEN" >&2; exit 21; }
                 LEVEL_FILTER="$(printf '%s' "$2" | tr '[:lower:]' '[:upper:]')"; shift 2 ;;
    --help|-h)
      sed -n '3,14p' "$0" | sed 's/^# *//'
      exit 0 ;;
    *)
      echo "ERROR: unknown argument '$1'" >&2; exit 22 ;;
  esac
done

if [[ "$MODE" == "none" ]]; then
  echo "ERROR: specify one of --file, --dir, --all-files, --newer" >&2
  exit 21
fi

# ─── FILE COLLECTION ──────────────────────────────────────────────────────────
apply_exclusions() {
  awk 'NF' | grep -Ev '/\.git/|/_LEGACY-ARCHIVE/|/node_modules/|/\.agentic-qe/' | grep -Ev '/\.DS_Store$|\.tmp$|\.bak$|\.pyc$'
}

case "$MODE" in
  single-file)
    if [[ ! -f "$TARGET" ]]; then
      echo "ERROR: file not found: $TARGET" >&2; exit 0
    fi
    printf '%s\n' "$TARGET" > "$LIST_FILE"
    ;;
  dir)
    if [[ ! -d "$TARGET" ]]; then
      echo "ERROR: directory not found: $TARGET" >&2; exit 0
    fi
    : > "$LIST_FILE"
    for f in "$TARGET"/*; do
      [[ -f "$f" ]] || continue
      printf '%s\n' "$f" >> "$LIST_FILE"
    done
    apply_exclusions < "$LIST_FILE" > "${LIST_FILE}.tmp"
    mv "${LIST_FILE}.tmp" "$LIST_FILE"
    ;;
  all-files)
    find "$LEGAL" -type f 2>/dev/null | apply_exclusions > "$LIST_FILE"
    ;;
  newer)
    _STAMP=$(mktemp)
    touch -t "$(date -v-${NEWER_DAYS}d '+%Y%m%d%H%M' 2>/dev/null || date -d "${NEWER_DAYS} days ago" '+%Y%m%d%H%M')" "$_STAMP" 2>/dev/null || touch "$_STAMP"
    find "$LEGAL" -newer "$_STAMP" -type f 2>/dev/null | apply_exclusions > "$LIST_FILE"
    rm -f "$_STAMP"
    ;;
esac

# deterministic ordering
awk 'NF' "$LIST_FILE" | sort > "${LIST_FILE}.sorted"
mv "${LIST_FILE}.sorted" "$LIST_FILE"

if [[ ! -s "$LIST_FILE" ]]; then
  log "batch-classify: no files to process (mode=$MODE)"
  rm -f "$LIST_FILE"
  exit 0
fi

# ─── CLASSIFY + OUTPUT ────────────────────────────────────────────────────────
hits=0
total=0

if $OUTPUT_JSON; then
  echo "["
  first_item=true
fi

while IFS= read -r filepath; do
  [[ -z "$filepath" ]] && continue
  ((total++))

  classification=$(classify_file "$filepath")
  IFS=':' read -r roam_id level message <<< "$classification"

  # Bounce check for .eml files
  bounce_flag=false
  bounce_code_val=""
  if scan_smtp_bounce "$filepath" 2>/dev/null; then
    bounce_flag=true
    bounce_code_val=$(get_bounce_code "$filepath")
    bounce_roam=$(get_bounce_roam_ref "$filepath")
    level="RED"
    roam_id="$bounce_roam"
    message="SMTP BOUNCE ${bounce_code_val}"
  fi

  # Level filter
  if [[ -n "$LEVEL_FILTER" && "$level" != "$LEVEL_FILTER" ]]; then
    continue
  fi

  if [[ "$level" == "NONE" && -z "$LEVEL_FILTER" ]]; then
    # Quietly skip unclassified unless explicitly filtering
    continue
  fi

  ((hits++))

  fname=$(basename "$filepath")
  rel="${filepath#$LEGAL/}"
  confidence=$(infer_confidence "$level" "$bounce_flag")
  reason="$message"
  matched_pattern=$(match_rule_pattern "$fname")

  if $OUTPUT_JSON; then
    $first_item || echo ","
    first_item=false
    printf '  {"file":"%s","path":"%s","roam":"%s","level":"%s","message":"%s","reason":"%s","matched_pattern":"%s","confidence":%s,"bounce":%s}' \
      "$fname" "$rel" "$roam_id" "$level" "$message" "$reason" "$matched_pattern" "$confidence" "$bounce_flag"
  else
    printf '%-6s  %-10s  %-20s  conf=%s  reason=%s\n' "$level" "$roam_id" "$fname" "$confidence" "$reason"
    [[ "$matched_pattern" != "none" ]] && printf '         ↳ pattern=%s\n' "$matched_pattern"
    [[ "$bounce_flag" == true ]] && printf '         ↳ BOUNCE %s — cross-ref: %s\n' "$bounce_code_val" "$roam_id"
  fi

done < "$LIST_FILE"

rm -f "$LIST_FILE"

if $OUTPUT_JSON; then
  echo ""
  echo "]"
fi

log "batch-classify done: ${hits}/${total} classified (mode=${MODE})"

[[ "$hits" -gt 0 ]] && exit 1 || exit 0
