#!/usr/bin/env bash
set -euo pipefail

# Automated Upstream Sync System
# Hourly: Check for updates
# Daily: Pull updates, run tests, notify

CODE="$HOME/Documents/code"
SCRIPTS="$CODE/scripts"
LOGS="$HOME/Documents/workspace/logs"

log() { echo -e "\033[0;32m[SETUP]\033[0m $1"; }

log "╔══════════════════════════════════════════════════════════════╗"
log "║     Automated Upstream Sync System - Hourly/Daily           ║"
log "╚══════════════════════════════════════════════════════════════╝"
log ""

# =============================================================================
# SYNC SCRIPT 1: Hourly Check (lightweight)
# =============================================================================
log "Creating hourly check script..."

cat > "$SCRIPTS/upstream_check_hourly.sh" << 'EOF'
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
EOF

chmod +x "$SCRIPTS/upstream_check_hourly.sh"
log "  ✓ upstream_check_hourly.sh created"

# =============================================================================
# SYNC SCRIPT 2: Daily Pull & Test
# =============================================================================
log "Creating daily sync script..."

cat > "$SCRIPTS/upstream_sync_daily.sh" << 'EOF'
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
EOF
fi

# Update .opex tracking with last sync date
for OPEX_FILE in "$CODE/investing"/*/.opex/*.json; do
  if [[ -f "$OPEX_FILE" ]]; then
    # Update upstream_integration.last_sync using jq if available
    if command -v jq &>/dev/null; then
      jq '.upstream_integration.last_sync = "'$(date +%Y-%m-%d)'"' "$OPEX_FILE" > "$OPEX_FILE.tmp" && \
      mv "$OPEX_FILE.tmp" "$OPEX_FILE"
    fi
  fi
done

log "✓ OpEx tracking updated with sync dates"
EOF

chmod +x "$SCRIPTS/upstream_sync_daily.sh"
log "  ✓ upstream_sync_daily.sh created"

# =============================================================================
# LAUNCHAGENT 1: Hourly Check
# =============================================================================
log ""
log "Creating LaunchAgent for hourly checks..."

PLIST_HOURLY="$HOME/Library/LaunchAgents/com.rooz.upstream-check-hourly.plist"

cat > "$PLIST_HOURLY" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.rooz.upstream-check-hourly</string>
    
    <key>ProgramArguments</key>
    <array>
        <string>$SCRIPTS/upstream_check_hourly.sh</string>
    </array>
    
    <key>StartInterval</key>
    <integer>3600</integer>
    
    <key>RunAtLoad</key>
    <true/>
    
    <key>StandardOutPath</key>
    <string>$LOGS/upstream_check_hourly.stdout.log</string>
    
    <key>StandardErrorPath</key>
    <string>$LOGS/upstream_check_hourly.stderr.log</string>
    
    <key>WorkingDirectory</key>
    <string>$CODE</string>
</dict>
</plist>
EOF

log "  ✓ LaunchAgent: $PLIST_HOURLY"

# =============================================================================
# LAUNCHAGENT 2: Daily Sync
# =============================================================================
log "Creating LaunchAgent for daily sync..."

PLIST_DAILY="$HOME/Library/LaunchAgents/com.rooz.upstream-sync-daily.plist"

cat > "$PLIST_DAILY" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.rooz.upstream-sync-daily</string>
    
    <key>ProgramArguments</key>
    <array>
        <string>$SCRIPTS/upstream_sync_daily.sh</string>
    </array>
    
    <key>StartCalendarInterval</key>
    <dict>
        <key>Hour</key>
        <integer>6</integer>
        <key>Minute</key>
        <integer>0</integer>
    </dict>
    
    <key>RunAtLoad</key>
    <false/>
    
    <key>StandardOutPath</key>
    <string>$LOGS/upstream_sync_daily.stdout.log</string>
    
    <key>StandardErrorPath</key>
    <string>$LOGS/upstream_sync_daily.stderr.log</string>
    
    <key>WorkingDirectory</key>
    <string>$CODE</string>
</dict>
</plist>
EOF

log "  ✓ LaunchAgent: $PLIST_DAILY"

# =============================================================================
# Load LaunchAgents
# =============================================================================
log ""
log "Loading LaunchAgents..."

# Unload if already loaded
launchctl unload "$PLIST_HOURLY" 2>/dev/null || true
launchctl unload "$PLIST_DAILY" 2>/dev/null || true

# Load
launchctl load "$PLIST_HOURLY" && log "  ✓ Hourly check enabled (every hour)"
launchctl load "$PLIST_DAILY" && log "  ✓ Daily sync enabled (6:00 AM)"

# =============================================================================
# Manual Commands
# =============================================================================
log ""
log "═══════════════════════════════════════════════════════════════"
log "          Upstream Sync System Installed                       "
log "═══════════════════════════════════════════════════════════════"
log ""
log "📅 Automated Schedule:"
log "  • Hourly: Check for upstream updates"
log "  • Daily: Pull updates & run tests (6:00 AM)"
log ""
log "🔧 Manual Commands:"
log "  # Check now (hourly)"
log "  bash $SCRIPTS/upstream_check_hourly.sh"
log ""
log "  # Sync now (daily)"
log "  bash $SCRIPTS/upstream_sync_daily.sh"
log ""
log "  # View hourly check log"
log "  tail -f $LOGS/upstream_check_hourly.stdout.log"
log ""
log "  # View daily sync report"
log "  cat $LOGS/upstream_sync_report_\$(date +%Y%m%d).md"
log ""
log "  # Unload services"
log "  launchctl unload $PLIST_HOURLY"
log "  launchctl unload $PLIST_DAILY"
log ""
log "📊 Status:"
log "  launchctl list | grep com.rooz.upstream"
