#!/usr/bin/env bash
set -euo pipefail

# SAFe Structure Governance: Root File Creation Enforcement
# Principle: Location-aware workflow, forbid root sprawl
# Usage: Install as pre-commit hook or run as validation

CODE="$HOME/Documents/code"
WORKSPACE="$HOME/Documents/workspace"

log() { echo -e "\033[0;32m[ENFORCE]\033[0m $1"; }
warn() { echo -e "\033[0;33m[WARN]\033[0m $1"; }
error() { echo -e "\033[0;31m[ERROR]\033[0m $1"; }

# Check for files in forbidden root locations
check_root_sprawl() {
  local ROOT_DIR="$1"
  local ALLOWED_PATTERNS="$2"
  
  # Find files (not dirs) in root, excluding allowed patterns
  local VIOLATIONS=$(find "$ROOT_DIR" -maxdepth 1 -type f 2>/dev/null | \
    grep -Ev "($ALLOWED_PATTERNS)$" || true)
  
  if [[ -n "$VIOLATIONS" ]]; then
    error "Root file sprawl detected in: $ROOT_DIR"
    echo "$VIOLATIONS" | while read file; do
      error "  ❌ $(basename "$file")"
      
      # Suggest proper location based on file type
      suggest_location "$file"
    done
    return 1
  fi
  
  return 0
}

suggest_location() {
  local FILE="$1"
  local FILENAME=$(basename "$FILE")
  local EXT="${FILENAME##*.}"
  
  case "$EXT" in
    md)
      if [[ "$FILENAME" =~ README ]]; then
        warn "     → OK: README.md allowed at roots"
      elif [[ "$FILENAME" =~ STRUCTURE ]]; then
        warn "     → OK: STRUCTURE.md allowed at code/"
      else
        error "     → Move to: code/evaluating/docs/ or workspace/docs/"
      fi
      ;;
    py|sh|js|ts)
      error "     → Move to:"
      error "       - workspace/h0-actions/scripts/ (daily scripts)"
      error "       - code/emerging/[project]/src/ (project code)"
      error "       - code/evaluating/[experiment]/ (R&D code)"
      ;;
    json|yaml|yml|env)
      error "     → Move to:"
      error "       - workspace/h2-areas/operational-files/configs/"
      error "       - code/[lifecycle]/[project]/config/"
      ;;
    txt|log)
      error "     → Move to:"
      error "       - workspace/logs/"
      error "       - code/[lifecycle]/[project]/logs/"
      ;;
    *)
      error "     → Classify and move to appropriate SAFe lifecycle folder"
      ;;
  esac
}

# Context-aware file router
route_file() {
  local FILE="$1"
  local CONTEXT="$2"  # investing, emerging, evaluating, retiring
  
  log "Routing file with context: $CONTEXT"
  
  local FILENAME=$(basename "$FILE")
  local EXT="${FILENAME##*.}"
  
  # Determine target based on context + file type
  case "$CONTEXT" in
    investing)
      # Production code
      TARGET="$CODE/investing/agentic-flow"
      case "$EXT" in
        py|js|ts) TARGET+="/src/" ;;
        json|yaml|yml) TARGET+="/config/" ;;
        md) TARGET+="/docs/" ;;
        *) TARGET+="/misc/" ;;
      esac
      ;;
    emerging)
      # New development
      warn "Which emerging project? lionagi-qe-fleet or lionagi-qe-improvements?"
      TARGET="$CODE/emerging/"
      ;;
    evaluating)
      # R&D experiments
      TARGET="$CODE/evaluating/"
      case "$EXT" in
        py|js|ts) TARGET+="experiments/" ;;
        md) TARGET+="docs/" ;;
        *) TARGET+="data/" ;;
      esac
      ;;
    workspace)
      # GTD horizons
      if [[ "$EXT" == "sh" ]] || [[ "$EXT" == "py" ]]; then
        TARGET="$WORKSPACE/h0-actions/scripts/"
      elif [[ "$EXT" == "md" ]]; then
        TARGET="$WORKSPACE/docs/"
      else
        TARGET="$WORKSPACE/h2-areas/operational-files/"
      fi
      ;;
    *)
      error "Unknown context: $CONTEXT"
      return 1
      ;;
  esac
  
  log "  → Suggested: $TARGET"
  echo "$TARGET"
}

# Main enforcement
log "╔══════════════════════════════════════════════════════════════╗"
log "║       SAFe Structure Governance: Root Sprawl Check          ║"
log "╚══════════════════════════════════════════════════════════════╝"
log ""

VIOLATIONS=0

# Check code/ root (only STRUCTURE.md + README.md allowed)
log "Checking: $CODE/"
if ! check_root_sprawl "$CODE" "STRUCTURE.md|README.md|.DS_Store"; then
  VIOLATIONS=$((VIOLATIONS + 1))
fi

# Check code/investing/ root (only README.md allowed)
log "Checking: $CODE/investing/"
if ! check_root_sprawl "$CODE/investing" "README.md|.DS_Store"; then
  VIOLATIONS=$((VIOLATIONS + 1))
fi

# Check code/emerging/ root
log "Checking: $CODE/emerging/"
if ! check_root_sprawl "$CODE/emerging" "README.md|.DS_Store"; then
  VIOLATIONS=$((VIOLATIONS + 1))
fi

# Check code/evaluating/ root
log "Checking: $CODE/evaluating/"
if ! check_root_sprawl "$CODE/evaluating" "README.md|.DS_Store"; then
  VIOLATIONS=$((VIOLATIONS + 1))
fi

# Check workspace/ root (strict: only subdirs allowed)
log "Checking: $WORKSPACE/"
if ! check_root_sprawl "$WORKSPACE" "README.md|.DS_Store"; then
  VIOLATIONS=$((VIOLATIONS + 1))
fi

log ""
if [[ "$VIOLATIONS" -eq 0 ]]; then
  log "✅ No root sprawl detected - SAFe structure compliant"
  exit 0
else
  error "❌ $VIOLATIONS root sprawl violations detected"
  error ""
  error "To fix:"
  error "  1. Review files flagged above"
  error "  2. Use: route_file <file> <context> to get target location"
  error "  3. Move files to suggested locations"
  error "  4. Run this script again to validate"
  exit 1
fi
