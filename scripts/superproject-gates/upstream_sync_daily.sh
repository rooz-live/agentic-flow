#!/usr/bin/env bash
set -euo pipefail

# Daily Upstream Sync
# Pulls updates, runs tests, notifies on conflicts

CODE="$HOME/Documents/code"
LOG="$HOME/Documents/workspace/logs/upstream_sync_$(date +%Y%m%d).log"
REPORT="$HOME/Documents/workspace/logs/upstream_sync_report_$(date +%Y%m%d).md"

log() { echo "[$(date '+%H:%M:%S')] $1" | tee -a "$LOG"; }
error() { echo "[ERROR] $1" | tee -a "$LOG"; }

log "=== Daily Upstream Sync ==="
log ""

# Initialize report
cat > "$REPORT" << 'HEADER'
# Upstream Sync Report

**Date**: $(date '+%Y-%m-%d %H:%M:%S')  
**Scope**: All active platforms

---

## Sync Results

HEADER

sync_platform() {
  local PROJECT_NAME="$1"
  local PROJECT_PATH="$2"
  local REMOTE="$3"
  local BRANCH="${4:-master}"
  local TEST_CMD="${5:-}"
  
  log "Syncing: $PROJECT_NAME..."
  
  if [[ ! -d "$PROJECT_PATH" ]]; then
    log "  ⚠ Project not found, skipping"
    echo "- **$PROJECT_NAME**: Not found" >> "$REPORT"
    return
  fi
  
  cd "$PROJECT_PATH"
  
  # Check if it's a git repo
  if [[ ! -d ".git" ]]; then
    log "  ⚠ Not a git repo, skipping"
    echo "- **$PROJECT_NAME**: Not a git repo" >> "$REPORT"
    return
  fi
  
  # Check if remote exists
  if ! git remote | grep -q "$REMOTE"; then
    log "  ⚠ Remote '$REMOTE' not configured"
    echo "- **$PROJECT_NAME**: Remote not configured" >> "$REPORT"
    return
  fi
  
  # Save current state
  BEFORE=$(git rev-parse HEAD)
  
  # Fetch
  log "  → Fetching from $REMOTE/$BRANCH..."
  if ! git fetch "$REMOTE" "$BRANCH" 2>&1 | tee -a "$LOG"; then
    error "  ✗ Fetch failed"
    echo "- **$PROJECT_NAME**: ❌ Fetch failed" >> "$REPORT"
    return 1
  fi
  
  # Check for updates
  REMOTE_SHA=$(git rev-parse "$REMOTE/$BRANCH" 2>/dev/null)
  
  if [[ "$BEFORE" == "$REMOTE_SHA" ]]; then
    log "  ✓ Already up to date"
    echo "- **$PROJECT_NAME**: ✅ Up to date" >> "$REPORT"
    return 0
  fi
  
  # Attempt merge/rebase
  log "  → Merging updates..."
  if git merge "$REMOTE/$BRANCH" --no-ff -m "upstream: daily sync $(date +%Y-%m-%d)" 2>&1 | tee -a "$LOG"; then
    AFTER=$(git rev-parse HEAD)
    COMMITS=$(git rev-list --count "$BEFORE..$AFTER")
    log "  ✓ Merged $COMMITS commits"
    
    # Run tests if provided
    if [[ -n "$TEST_CMD" ]]; then
      log "  → Running tests..."
      if eval "$TEST_CMD" 2>&1 | tee -a "$LOG"; then
        log "  ✓ Tests passed"
        echo "- **$PROJECT_NAME**: ✅ Synced ($COMMITS commits), tests passed" >> "$REPORT"
      else
        error "  ✗ Tests failed - rolling back"
        git reset --hard "$BEFORE"
        echo "- **$PROJECT_NAME**: ⚠️ Synced but tests failed (rolled back)" >> "$REPORT"
        return 1
      fi
    else
      echo "- **$PROJECT_NAME**: ✅ Synced ($COMMITS commits)" >> "$REPORT"
    fi
  else
    error "  ✗ Merge conflict detected"
    git merge --abort 2>/dev/null || true
    echo "- **$PROJECT_NAME**: ⚠️ Merge conflict - manual intervention required" >> "$REPORT"
    
    # Create conflict notification
    echo "$PROJECT_NAME|$PROJECT_PATH|$(date)" >> \
      "$HOME/Documents/workspace/logs/upstream_conflicts.txt"
    return 1
  fi
}

# =============================================================================
# Sync All Platforms
# =============================================================================

# Platform Infrastructure - OpenStack
sync_platform \
  "OpenStack" \
  "$CODE/investing/platform-infrastructure/openstack" \
  "upstream" \
  "master" \
  ""

# Platform Infrastructure - StarlingX
sync_platform \
  "StarlingX" \
  "$CODE/investing/platform-infrastructure/starlingx" \
  "upstream" \
  "master" \
  ""

# Oro CRM (if evaluation started)
if [[ -d "$CODE/evaluating/oro-crm-spike/oro-crm" ]]; then
  sync_platform \
    "Oro CRM" \
    "$CODE/evaluating/oro-crm-spike/oro-crm" \
    "upstream" \
    "master" \
    ""
fi

# =============================================================================
# SDK Updates (Python packages)
# =============================================================================
log ""
log "Updating Python SDKs..."

cat >> "$REPORT" << 'SDK_HEADER'

---

## SDK Updates

SDK_HEADER

if command -v pip &>/dev/null; then
  # Telnyx
  if pip show telnyx &>/dev/null; then
    BEFORE=$(pip show telnyx | grep Version | cut -d' ' -f2)
    pip install --upgrade telnyx --quiet 2>&1 | tee -a "$LOG"
    AFTER=$(pip show telnyx | grep Version | cut -d' ' -f2)
    if [[ "$BEFORE" != "$AFTER" ]]; then
      log "  ✓ Telnyx: $BEFORE → $AFTER"
      echo "- **Telnyx SDK**: $BEFORE → $AFTER" >> "$REPORT"
    else
      echo "- **Telnyx SDK**: Up to date ($BEFORE)" >> "$REPORT"
    fi
  fi
  
  # Plivo
  if pip show plivo &>/dev/null; then
    BEFORE=$(pip show plivo | grep Version | cut -d' ' -f2)
    pip install --upgrade plivo --quiet 2>&1 | tee -a "$LOG"
    AFTER=$(pip show plivo | grep Version | cut -d' ' -f2)
    if [[ "$BEFORE" != "$AFTER" ]]; then
      log "  ✓ Plivo: $BEFORE → $AFTER"
      echo "- **Plivo SDK**: $BEFORE → $AFTER" >> "$REPORT"
    else
      echo "- **Plivo SDK**: Up to date ($BEFORE)" >> "$REPORT"
    fi
  fi
fi

# =============================================================================
# Summary & Notifications
# =============================================================================
log ""
log "=== Sync Complete ==="
log "Report: $REPORT"

# Check for conflicts
if [[ -f "$HOME/Documents/workspace/logs/upstream_conflicts.txt" ]]; then
  CONFLICTS=$(wc -l < "$HOME/Documents/workspace/logs/upstream_conflicts.txt")
  log "⚠️ $CONFLICTS merge conflicts require manual resolution"
  
  cat >> "$REPORT" << EOF

---

## ⚠️ Action Required

**$CONFLICTS merge conflicts** detected. Manual resolution needed:

\`\`\`
$(cat "$HOME/Documents/workspace/logs/upstream_conflicts.txt")
\`\`\`

**Resolution steps**:
1. cd to project directory
2. git fetch upstream
3. git merge upstream/master
4. Resolve conflicts manually
5. git commit
6. Remove entry from upstream_conflicts.txt
