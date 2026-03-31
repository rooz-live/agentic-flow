#!/usr/bin/env bash
# setup-automation-cron.sh - Setup automated cron jobs for QE Fleet, AISP, and pattern reviews
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

log_info() { echo -e "${CYAN}[INFO]${NC} $*"; }
log_success() { echo -e "${GREEN}[✓]${NC} $*"; }
log_warn() { echo -e "${YELLOW}[⚠]${NC} $*"; }
log_error() { echo -e "${RED}[✗]${NC} $*"; }

# Detect cron system (crontab vs launchd on macOS)
detect_scheduler() {
    if [[ "$OSTYPE" == "darwin"* ]]; then
        echo "launchd"
    else
        echo "cron"
    fi
}

# Setup crontab entries (Linux/traditional)
setup_crontab() {
    log_info "Setting up crontab automation..."
    
    # Backup existing crontab
    crontab -l > /tmp/crontab.backup 2>/dev/null || touch /tmp/crontab.backup
    
    # Create new crontab entries
    cat > /tmp/agentic-flow.cron <<EOF
# Agentic Flow - QE Fleet & AISP Automation
# Generated: $(date)

# Skills cache update - Every hour
0 * * * * cd $ROOT_DIR && npm run cache:update >> /var/log/agentic-flow/skills-cache.log 2>&1

# Pattern factor review - Daily at 2 AM
0 2 * * * cd $ROOT_DIR && npx ts-node tools/federation/pattern_metrics_analyzer.ts --goalie-dir=.goalie >> /var/log/agentic-flow/pattern-review.log 2>&1

# claude-flow upgrade check - Weekly (Monday 2 AM)
0 2 * * 1 cd $ROOT_DIR && npx claude-flow@alpha init --force >> /var/log/agentic-flow/claude-flow-upgrade.log 2>&1

# NPM dependency updates - Monthly (1st of month, 3 AM)
0 3 1 * * cd $ROOT_DIR && npm update && npm audit fix >> /var/log/agentic-flow/npm-upgrade.log 2>&1

# Test suite health check - Daily at 4 AM
0 4 * * * cd $ROOT_DIR && npm test 2>&1 | grep "Test Suites:" >> /var/log/agentic-flow/test-health.log

# Governance system validation - Daily at 5 AM
0 5 * * * cd $ROOT_DIR && npm run governance-agent >> /var/log/agentic-flow/governance.log 2>&1

EOF

    # Merge with existing crontab
    cat /tmp/crontab.backup > /tmp/crontab.new
    echo "" >> /tmp/crontab.new
    cat /tmp/agentic-flow.cron >> /tmp/crontab.new
    
    # Install new crontab
    crontab /tmp/crontab.new
    
    log_success "Crontab automation configured"
    log_info "View with: crontab -l"
    log_info "Edit with: crontab -e"
}

# Setup launchd agents (macOS)
setup_launchd() {
    log_info "Setting up launchd automation (macOS)..."
    
    local LAUNCHD_DIR="$HOME/Library/LaunchAgents"
    mkdir -p "$LAUNCHD_DIR"
    
    # Skills Cache Update - Hourly
    cat > "$LAUNCHD_DIR/io.agentic-flow.cache-update.plist" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>io.agentic-flow.cache-update</string>
    <key>ProgramArguments</key>
    <array>
        <string>/bin/bash</string>
        <string>-c</string>
        <string>cd $ROOT_DIR && npm run cache:update</string>
    </array>
    <key>StartInterval</key>
    <integer>3600</integer>
    <key>StandardOutPath</key>
    <string>/tmp/agentic-flow-cache-update.log</string>
    <key>StandardErrorPath</key>
    <string>/tmp/agentic-flow-cache-update.err</string>
</dict>
</plist>
EOF

    # Pattern Review - Daily at 2 AM
    cat > "$LAUNCHD_DIR/io.agentic-flow.pattern-review.plist" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>io.agentic-flow.pattern-review</string>
    <key>ProgramArguments</key>
    <array>
        <string>/bin/bash</string>
        <string>-c</string>
        <string>cd $ROOT_DIR && npx ts-node tools/federation/pattern_metrics_analyzer.ts --goalie-dir=.goalie</string>
    </array>
    <key>StartCalendarInterval</key>
    <dict>
        <key>Hour</key>
        <integer>2</integer>
        <key>Minute</key>
        <integer>0</integer>
    </dict>
    <key>StandardOutPath</key>
    <string>/tmp/agentic-flow-pattern-review.log</string>
    <key>StandardErrorPath</key>
    <string>/tmp/agentic-flow-pattern-review.err</string>
</dict>
</plist>
EOF

    # claude-flow Upgrade - Weekly Monday at 2 AM
    cat > "$LAUNCHD_DIR/io.agentic-flow.claude-flow-upgrade.plist" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>io.agentic-flow.claude-flow-upgrade</string>
    <key>ProgramArguments</key>
    <array>
        <string>/bin/bash</string>
        <string>-c</string>
        <string>cd $ROOT_DIR && npx claude-flow@alpha init --force</string>
    </array>
    <key>StartCalendarInterval</key>
    <dict>
        <key>Weekday</key>
        <integer>1</integer>
        <key>Hour</key>
        <integer>2</integer>
        <key>Minute</key>
        <integer>0</integer>
    </dict>
    <key>StandardOutPath</key>
    <string>/tmp/agentic-flow-claude-upgrade.log</string>
    <key>StandardErrorPath</key>
    <string>/tmp/agentic-flow-claude-upgrade.err</string>
</dict>
</plist>
EOF

    # Load launchd agents
    launchctl load "$LAUNCHD_DIR/io.agentic-flow.cache-update.plist" 2>/dev/null || true
    launchctl load "$LAUNCHD_DIR/io.agentic-flow.pattern-review.plist" 2>/dev/null || true
    launchctl load "$LAUNCHD_DIR/io.agentic-flow.claude-flow-upgrade.plist" 2>/dev/null || true
    
    log_success "LaunchAgents configured in $LAUNCHD_DIR"
    log_info "View with: launchctl list | grep agentic-flow"
    log_info "Unload with: launchctl unload $LAUNCHD_DIR/io.agentic-flow.*.plist"
}

# Create log directories
setup_log_dirs() {
    log_info "Creating log directories..."
    
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS uses /tmp
        mkdir -p /tmp/agentic-flow
    else
        # Linux uses /var/log
        sudo mkdir -p /var/log/agentic-flow
        sudo chown $USER:$USER /var/log/agentic-flow
    fi
    
    log_success "Log directories created"
}

# Show status
show_status() {
    log_info "Automation Status:"
    echo ""
    
    local scheduler=$(detect_scheduler)
    
    if [[ "$scheduler" == "launchd" ]]; then
        echo "LaunchAgents (macOS):"
        launchctl list | grep agentic-flow || echo "  No agents loaded"
    else
        echo "Crontab entries:"
        crontab -l 2>/dev/null | grep -A1 "Agentic Flow" || echo "  No cron jobs found"
    fi
}

# Remove automation
remove_automation() {
    log_warn "Removing automation..."
    
    local scheduler=$(detect_scheduler)
    
    if [[ "$scheduler" == "launchd" ]]; then
        launchctl unload ~/Library/LaunchAgents/io.agentic-flow.*.plist 2>/dev/null || true
        rm -f ~/Library/LaunchAgents/io.agentic-flow.*.plist
        log_success "LaunchAgents removed"
    else
        # Remove from crontab
        crontab -l 2>/dev/null | grep -v "Agentic Flow" | grep -v "agentic-flow" | crontab - || true
        log_success "Cron jobs removed"
    fi
}

# Usage
usage() {
    cat <<EOF
Usage: $0 <command>

Commands:
  install    Setup automated cron jobs / launchd agents
  status     Show current automation status
  remove     Remove all automation
  logs       View recent log entries

Environment:
  Scheduler: $(detect_scheduler)
  Root Dir:  $ROOT_DIR

Examples:
  $0 install          # Setup automation
  $0 status           # Check status
  $0 remove           # Remove automation
  $0 logs             # View logs

EOF
    exit 1
}

# Main
case "${1:-}" in
    install)
        setup_log_dirs
        
        scheduler=$(detect_scheduler)
        if [[ "$scheduler" == "launchd" ]]; then
            setup_launchd
        else
            setup_crontab
        fi
        
        show_status
        ;;
    
    status)
        show_status
        ;;
    
    remove)
        remove_automation
        ;;
    
    logs)
        scheduler=$(detect_scheduler)
        if [[ "$scheduler" == "launchd" ]]; then
            tail -20 /tmp/agentic-flow-*.log 2>/dev/null || echo "No logs yet"
        else
            tail -20 /var/log/agentic-flow/*.log 2>/dev/null || echo "No logs yet"
        fi
        ;;
    
    *)
        usage
        ;;
esac
