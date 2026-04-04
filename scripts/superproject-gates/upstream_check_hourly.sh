#!/usr/bin/env bash
set -euo pipefail

# Hourly Upstream Check (Lightweight)
# Just checks if updates are available, doesn't pull

CODE="$HOME/Documents/code"
LOG="$HOME/Documents/workspace/logs/upstream_check_$(date +%Y%m%d-%H).log"
NOTIFY="$HOME/Documents/workspace/logs/upstream_updates_available.flag"

log() { echo "[$(date '+%H:%M:%S')] $1" | tee -a "$LOG"; }

log "=== Hourly Upstream Check ==="

# Remove old notification flag
rm -f "$NOTIFY"

check_updates() {
  local PROJECT="$1"
  local REMOTE="$2"
  local BRANCH="${3:-master}"
  
  if [[ ! -d "$PROJECT" ]]; then
    return
  fi
  
  cd "$PROJECT"
  
  # Check if remote exists
  if ! git remote | grep -q "$REMOTE"; then
    return
  fi
  
  # Fetch without merging
  git fetch "$REMOTE" "$BRANCH" --quiet 2>/dev/null || return
  
  # Check if updates available
  LOCAL=$(git rev-parse HEAD)
  REMOTE_SHA=$(git rev-parse "$REMOTE/$BRANCH" 2>/dev/null || echo "$LOCAL")
  
  if [[ "$LOCAL" != "$REMOTE_SHA" ]]; then
    log "✓ Updates available: $(basename "$PROJECT") ($REMOTE/$BRANCH)"
    echo "$(date)|$(basename "$PROJECT")|$REMOTE/$BRANCH" >> "$NOTIFY"
  fi
}

# Check Platform Infrastructure
log "Checking Platform Infrastructure..."
check_updates "$CODE/investing/platform-infrastructure/openstack" "upstream" "master"
check_updates "$CODE/investing/platform-infrastructure/starlingx" "upstream" "master"

# Check Communications Platform SDKs (conceptual - would check package versions)
log "Checking Communications Platform..."
# For SDKs, check PyPI versions
if command -v pip &>/dev/null; then
  pip list --outdated 2>/dev/null | grep -E "telnyx|plivo" >> "$NOTIFY" 2>/dev/null || true
fi

# Check Oro CRM (if cloned)
if [[ -d "$CODE/evaluating/oro-crm-spike/oro-crm" ]]; then
  log "Checking Oro CRM..."
  check_updates "$CODE/evaluating/oro-crm-spike/oro-crm" "upstream" "master"
fi

# Summary
if [[ -f "$NOTIFY" ]]; then
  COUNT=$(wc -l < "$NOTIFY")
  log "⚠️ $COUNT upstream updates available - run daily sync"
else
  log "✓ All platforms up to date"
fi
