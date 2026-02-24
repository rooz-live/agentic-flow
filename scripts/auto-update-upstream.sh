#!/usr/bin/env bash
################################################################################
# Automated Upstream Update System
# Checks and updates Claude Flow v3 alpha + dependencies
#
# Cron Schedule:
#   - Hourly:  Check for critical security updates
#   - Daily:   Check for alpha releases
#   - Weekly:  Full dependency audit
################################################################################

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${BLUE}[$(date +'%H:%M:%S')]${NC} $*"; }
success() { echo -e "${GREEN}✓${NC} $*"; }
error() { echo -e "${RED}✗${NC} $*"; }
warn() { echo -e "${YELLOW}⚠${NC} $*"; }

# Configuration
UPDATE_MODE="${1:-check}"  # check, update, force
UPDATE_LOG="/tmp/upstream-updates-$(date +%Y%m%d).log"

################################################################################
# Version Detection
################################################################################

get_installed_versions() {
    log "Detecting installed versions..."
    
    # Claude Flow v3
    CLAUDE_FLOW_CURRENT=$(npx claude-flow@v3alpha --version 2>&1 | grep -oE '[0-9]+\.[0-9]+\.[0-9]+-alpha\.[0-9]+' | head -1 || echo "unknown")
    
    # Agentic QE
    AGENTIC_QE_CURRENT=$(agentic-qe --version 2>/dev/null | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' || echo "not installed")
    
    # AISP (git commit)
    if [ -d ".integrations/aisp-open-core" ]; then
        AISP_CURRENT=$(cd .integrations/aisp-open-core && git rev-parse --short HEAD)
    else
        AISP_CURRENT="not installed"
    fi
    
    # LLM Observatory
    LLM_OBS_CURRENT=$(npm list @llm-observatory/sdk --depth=0 2>/dev/null | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' || echo "not installed")
    
    success "Current versions detected"
    cat <<EOF
  Claude Flow v3:    $CLAUDE_FLOW_CURRENT
  Agentic QE:        $AGENTIC_QE_CURRENT
  AISP:              $AISP_CURRENT
  LLM Observatory:   $LLM_OBS_CURRENT
EOF
}

check_latest_versions() {
    log "Checking latest upstream versions..."
    
    # Claude Flow v3 latest alpha
    CLAUDE_FLOW_LATEST=$(npm view claude-flow@v3alpha version 2>/dev/null || echo "unknown")
    
    # Agentic QE latest
    AGENTIC_QE_LATEST=$(npm view agentic-qe version 2>/dev/null || echo "unknown")
    
    # AISP latest commit
    if [ -d ".integrations/aisp-open-core" ]; then
        AISP_LATEST=$(cd .integrations/aisp-open-core && git fetch origin -q && git rev-parse --short origin/main)
    else
        AISP_LATEST="unknown"
    fi
    
    # LLM Observatory latest
    LLM_OBS_LATEST=$(npm view @llm-observatory/sdk version 2>/dev/null || echo "unknown")
    
    success "Latest versions retrieved"
    cat <<EOF
  Claude Flow v3:    $CLAUDE_FLOW_LATEST
  Agentic QE:        $AGENTIC_QE_LATEST
  AISP:              $AISP_LATEST
  LLM Observatory:   $LLM_OBS_LATEST
EOF
}

################################################################################
# Update Detection
################################################################################

compare_versions() {
    local component=$1
    local current=$2
    local latest=$3
    
    if [ "$current" = "not installed" ]; then
        warn "$component: Not installed"
        return 2
    elif [ "$current" = "unknown" ] || [ "$latest" = "unknown" ]; then
        warn "$component: Version check failed"
        return 3
    elif [ "$current" = "$latest" ]; then
        success "$component: Up to date ($current)"
        return 0
    else
        warn "$component: Update available ($current → $latest)"
        return 1
    fi
}

check_for_updates() {
    log "Comparing versions..."
    echo ""
    
    local updates_available=0
    
    # Claude Flow v3
    if ! compare_versions "Claude Flow v3" "$CLAUDE_FLOW_CURRENT" "$CLAUDE_FLOW_LATEST"; then
        [ $? -eq 1 ] && ((updates_available++))
    fi
    
    # Agentic QE
    if ! compare_versions "Agentic QE" "$AGENTIC_QE_CURRENT" "$AGENTIC_QE_LATEST"; then
        [ $? -eq 1 ] && ((updates_available++))
    fi
    
    # AISP
    if [ "$AISP_CURRENT" != "$AISP_LATEST" ] && [ "$AISP_CURRENT" != "not installed" ]; then
        warn "AISP: Update available ($AISP_CURRENT → $AISP_LATEST)"
        ((updates_available++))
    fi
    
    # LLM Observatory
    if ! compare_versions "LLM Observatory" "$LLM_OBS_CURRENT" "$LLM_OBS_LATEST"; then
        [ $? -eq 1 ] && ((updates_available++))
    fi
    
    echo ""
    if [ $updates_available -gt 0 ]; then
        warn "Total updates available: $updates_available"
        return 1
    else
        success "All components up to date!"
        return 0
    fi
}

################################################################################
# Security Checks
################################################################################

check_security_advisories() {
    log "Checking for security advisories..."
    
    # npm audit for security vulnerabilities
    npm audit --json > /tmp/npm-audit.json 2>/dev/null || true
    
    local critical=$(jq -r '.metadata.vulnerabilities.critical // 0' /tmp/npm-audit.json)
    local high=$(jq -r '.metadata.vulnerabilities.high // 0' /tmp/npm-audit.json)
    
    if [ "$critical" -gt 0 ] || [ "$high" -gt 0 ]; then
        error "Security vulnerabilities found: $critical critical, $high high"
        return 1
    else
        success "No critical security issues"
        return 0
    fi
}

################################################################################
# Update Execution
################################################################################

backup_current_state() {
    log "Creating backup..."
    
    local backup_dir="/tmp/agentic-flow-backup-$(date +%Y%m%d-%H%M%S)"
    mkdir -p "$backup_dir"
    
    # Backup package.json and lock file
    cp package.json "$backup_dir/"
    cp package-lock.json "$backup_dir/" 2>/dev/null || true
    
    # Backup current versions
    cat > "$backup_dir/versions.txt" <<EOF
CLAUDE_FLOW=$CLAUDE_FLOW_CURRENT
AGENTIC_QE=$AGENTIC_QE_CURRENT
AISP=$AISP_CURRENT
LLM_OBS=$LLM_OBS_CURRENT
EOF
    
    success "Backup created at $backup_dir"
    echo "$backup_dir"
}

update_claude_flow() {
    if [ "$CLAUDE_FLOW_CURRENT" = "$CLAUDE_FLOW_LATEST" ]; then
        return 0
    fi
    
    log "Updating Claude Flow v3: $CLAUDE_FLOW_CURRENT → $CLAUDE_FLOW_LATEST"
    
    # Update npm package
    npm update claude-flow@v3alpha
    
    # Verify installation
    local new_version=$(npx claude-flow@v3alpha --version 2>&1 | grep -oE '[0-9]+\.[0-9]+\.[0-9]+-alpha\.[0-9]+' | head -1)
    
    if [ "$new_version" = "$CLAUDE_FLOW_LATEST" ]; then
        success "Claude Flow v3 updated successfully to $new_version"
        
        # Restart daemon if running
        if pgrep -f "claude-flow.*daemon" > /dev/null; then
            warn "Restarting Claude Flow daemon..."
            npx claude-flow@v3alpha daemon stop || true
            sleep 2
            npx claude-flow@v3alpha daemon start --memory-backend=hnsw &
        fi
        
        return 0
    else
        error "Claude Flow v3 update verification failed"
        return 1
    fi
}

update_agentic_qe() {
    if [ "$AGENTIC_QE_CURRENT" = "$AGENTIC_QE_LATEST" ]; then
        return 0
    fi
    
    log "Updating Agentic QE: $AGENTIC_QE_CURRENT → $AGENTIC_QE_LATEST"
    
    npm install -g agentic-qe@latest
    
    local new_version=$(agentic-qe --version 2>/dev/null | grep -oE '[0-9]+\.[0-9]+\.[0-9]+')
    
    if [ "$new_version" = "$AGENTIC_QE_LATEST" ]; then
        success "Agentic QE updated to $new_version"
        return 0
    else
        error "Agentic QE update verification failed"
        return 1
    fi
}

update_aisp() {
    if [ "$AISP_CURRENT" = "$AISP_LATEST" ] || [ ! -d ".integrations/aisp-open-core" ]; then
        return 0
    fi
    
    log "Updating AISP: $AISP_CURRENT → $AISP_LATEST"
    
    cd .integrations/aisp-open-core
    git pull origin main
    cd "$PROJECT_ROOT"
    
    local new_commit=$(cd .integrations/aisp-open-core && git rev-parse --short HEAD)
    
    if [ "$new_commit" = "$AISP_LATEST" ]; then
        success "AISP updated to $new_commit"
        return 0
    else
        error "AISP update verification failed"
        return 1
    fi
}

update_llm_observatory() {
    if [ "$LLM_OBS_CURRENT" = "$LLM_OBS_LATEST" ]; then
        return 0
    fi
    
    log "Updating LLM Observatory: $LLM_OBS_CURRENT → $LLM_OBS_LATEST"
    
    npm update @llm-observatory/sdk
    
    local new_version=$(npm list @llm-observatory/sdk --depth=0 2>/dev/null | grep -oE '[0-9]+\.[0-9]+\.[0-9]+')
    
    if [ "$new_version" = "$LLM_OBS_LATEST" ]; then
        success "LLM Observatory updated to $new_version"
        return 0
    else
        error "LLM Observatory update verification failed"
        return 1
    fi
}

run_updates() {
    log "Starting update process..."
    
    # Create backup
    local backup_dir=$(backup_current_state)
    
    local failed=0
    
    # Update each component
    update_claude_flow || ((failed++))
    update_agentic_qe || ((failed++))
    update_aisp || ((failed++))
    update_llm_observatory || ((failed++))
    
    if [ $failed -eq 0 ]; then
        success "All updates completed successfully!"
        
        # Run tests to verify
        log "Running verification tests..."
        npm test --silent || warn "Some tests failed after update"
        
        # Clean up old backup if tests pass
        echo "Backup retained at: $backup_dir"
        return 0
    else
        error "$failed component(s) failed to update"
        warn "Backup available at: $backup_dir"
        return 1
    fi
}

################################################################################
# Rollback
################################################################################

rollback_updates() {
    local backup_dir=$1
    
    if [ ! -d "$backup_dir" ]; then
        error "Backup directory not found: $backup_dir"
        return 1
    fi
    
    warn "Rolling back to backup: $backup_dir"
    
    # Restore package.json
    cp "$backup_dir/package.json" .
    cp "$backup_dir/package-lock.json" . 2>/dev/null || true
    
    # Reinstall dependencies
    npm ci
    
    success "Rollback complete"
}

################################################################################
# Notification
################################################################################

send_notification() {
    local title=$1
    local message=$2
    local severity=${3:-info}  # info, warning, error
    
    # Slack notification
    if [ -n "${SLACK_WEBHOOK:-}" ]; then
        local color=""
        case $severity in
            info) color="good" ;;
            warning) color="warning" ;;
            error) color="danger" ;;
        esac
        
        curl -X POST "$SLACK_WEBHOOK" \
            -H 'Content-Type: application/json' \
            -d "{
                \"attachments\": [{
                    \"color\": \"$color\",
                    \"title\": \"$title\",
                    \"text\": \"$message\",
                    \"footer\": \"Agentic Flow Auto-Update\",
                    \"ts\": $(date +%s)
                }]
            }" 2>/dev/null || true
    fi
    
    # GitHub issue creation for critical updates
    if [ "$severity" = "error" ] && [ -n "${GH_TOKEN:-}" ]; then
        gh issue create \
            --title "⚠️ Auto-Update Failed: $title" \
            --body "$message" \
            --label "auto-update,urgent" 2>/dev/null || true
    fi
}

################################################################################
# Main Logic
################################################################################

main() {
    log "🔄 Upstream Update Check"
    log "Mode: $UPDATE_MODE"
    echo ""
    
    # Get current versions
    get_installed_versions
    echo ""
    
    # Get latest versions
    check_latest_versions
    echo ""
    
    # Compare and detect updates
    if check_for_updates; then
        success "No updates needed"
        exit 0
    fi
    
    # Check for security issues
    echo ""
    if ! check_security_advisories; then
        warn "Security vulnerabilities detected!"
        
        if [ "$UPDATE_MODE" = "check" ]; then
            send_notification \
                "Security Updates Available" \
                "Critical security vulnerabilities found. Run with 'update' mode to apply fixes." \
                "error"
            exit 2
        fi
    fi
    
    # Execute updates if requested
    case "$UPDATE_MODE" in
        update|force)
            echo ""
            log "Proceeding with updates..."
            
            if run_updates; then
                send_notification \
                    "Updates Applied Successfully" \
                    "All components updated to latest versions." \
                    "info"
                exit 0
            else
                send_notification \
                    "Update Failed" \
                    "Some components failed to update. Manual intervention required." \
                    "error"
                exit 1
            fi
            ;;
        check)
            log "Updates available (run with 'update' to apply)"
            send_notification \
                "Updates Available" \
                "Updates available for Claude Flow and dependencies." \
                "warning"
            exit 1
            ;;
        *)
            error "Unknown mode: $UPDATE_MODE"
            exit 1
            ;;
    esac
}

main "$@" | tee "$UPDATE_LOG"
