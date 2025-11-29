#!/usr/bin/env bash
set -euo pipefail

# Install Daily Upstream Check Automation
# Supports: macOS (launchd), Linux (cron), systemd

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[INSTALL]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

# Detect OS
detect_os() {
    if [[ "$OSTYPE" == "darwin"* ]]; then
        echo "macos"
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        echo "linux"
    else
        echo "unknown"
    fi
}

# Install for macOS (launchd)
install_macos() {
    log "Installing launchd job for macOS..."
    
    local plist_file="$HOME/Library/LaunchAgents/com.agentic-flow.upstream-check.plist"
    
    cat > "$plist_file" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.agentic-flow.upstream-check</string>
    
    <key>ProgramArguments</key>
    <array>
        <string>/bin/bash</string>
        <string>$SCRIPT_DIR/check_upstream_updates.sh</string>
        <string>run</string>
    </array>
    
    <key>StartCalendarInterval</key>
    <dict>
        <key>Hour</key>
        <integer>9</integer>
        <key>Minute</key>
        <integer>0</integer>
    </dict>
    
    <key>StandardOutPath</key>
    <string>$PROJECT_ROOT/logs/upstream_check_stdout.log</string>
    
    <key>StandardErrorPath</key>
    <string>$PROJECT_ROOT/logs/upstream_check_stderr.log</string>
    
    <key>WorkingDirectory</key>
    <string>$PROJECT_ROOT</string>
    
    <key>RunAtLoad</key>
    <false/>
</dict>
</plist>
EOF
    
    # Load the job
    launchctl unload "$plist_file" 2>/dev/null || true
    launchctl load "$plist_file"
    
    log "✅ Installed: Daily check at 9:00 AM"
    log "   Plist: $plist_file"
    log "   Logs: $PROJECT_ROOT/logs/upstream_check_*.log"
    
    echo ""
    echo "Commands:"
    echo "  Start now:  launchctl start com.agentic-flow.upstream-check"
    echo "  Stop:       launchctl stop com.agentic-flow.upstream-check"
    echo "  Uninstall:  launchctl unload $plist_file && rm $plist_file"
}

# Install for Linux (cron)
install_linux() {
    log "Installing cron job for Linux..."
    
    local cron_entry="0 9 * * * cd $PROJECT_ROOT && $SCRIPT_DIR/check_upstream_updates.sh run >> $PROJECT_ROOT/logs/upstream_check_cron.log 2>&1"
    
    # Add to crontab if not already present
    (crontab -l 2>/dev/null | grep -v check_upstream_updates.sh; echo "$cron_entry") | crontab -
    
    log "✅ Installed: Daily check at 9:00 AM"
    log "   Cron: $cron_entry"
    log "   Logs: $PROJECT_ROOT/logs/upstream_check_cron.log"
    
    echo ""
    echo "Commands:"
    echo "  View cron: crontab -l"
    echo "  Edit cron: crontab -e"
    echo "  Remove:    crontab -l | grep -v check_upstream_updates.sh | crontab -"
}

# Create action tracker integration
create_action_tracker() {
    log "Creating action tracker integration..."
    
    cat > "$SCRIPT_DIR/process_upstream_updates.py" << 'EOF'
#!/usr/bin/env python3
"""
Process upstream updates report and create action items
"""

import json
import os
import re
from datetime import datetime
from pathlib import Path

PROJECT_ROOT = Path(__file__).parent.parent
REPORT_FILE = PROJECT_ROOT / "logs/upstream_updates_latest.md"
ACTIONS_FILE = PROJECT_ROOT / ".goalie/UPSTREAM_ACTIONS.yaml"

def parse_report():
    """Parse upstream report and extract actionable items"""
    if not REPORT_FILE.exists():
        print("No report found. Run: ./scripts/check_upstream_updates.sh")
        return []
    
    with open(REPORT_FILE) as f:
        content = f.read()
    
    actions = []
    
    # Parse NPM updates
    npm_match = re.search(r'\*\*Status:\*\* 🟡 (\d+) packages have updates available', content)
    if npm_match:
        count = int(npm_match.group(1))
        
        # Extract major updates (higher priority)
        major_packages = re.findall(r'\| (.*?) \| .* \| .* \| major \|', content)
        
        if major_packages:
            actions.append({
                "title": f"Update {len(major_packages)} major NPM packages",
                "priority": "HIGH",
                "packages": major_packages,
                "wsjf": 8.0,  # Breaking changes need review
                "command": "npm install " + " ".join([f"{pkg}@latest" for pkg in major_packages[:3]])
            })
        
        if count - len(major_packages) > 0:
            actions.append({
                "title": f"Update {count - len(major_packages)} minor/patch NPM packages",
                "priority": "MEDIUM",
                "wsjf": 6.0,
                "command": "npm update"
            })
    
    # Parse security vulnerabilities
    if "🔴 **CRITICAL**" in content or "🟡" in content:
        severity = "CRITICAL" if "🔴" in content else "HIGH"
        actions.append({
            "title": "Fix security vulnerabilities",
            "priority": severity,
            "wsjf": 10.0 if severity == "CRITICAL" else 8.0,
            "command": "npm audit fix"
        })
    
    # Parse Git updates
    behind_match = re.search(r'Behind upstream by (\d+) commits', content)
    if behind_match:
        commits = int(behind_match.group(1))
        actions.append({
            "title": f"Sync with upstream ({commits} commits)",
            "priority": "MEDIUM",
            "wsjf": 7.0,
            "command": "git pull upstream main"
        })
    
    return actions

def save_actions(actions):
    """Save actions to YAML for goalie tracking"""
    ACTIONS_FILE.parent.mkdir(parents=True, exist_ok=True)
    
    with open(ACTIONS_FILE, 'w') as f:
        f.write("---\n")
        f.write(f"# Upstream Update Actions\n")
        f.write(f"# Generated: {datetime.utcnow().isoformat()}Z\n")
        f.write(f"# From: {REPORT_FILE}\n\n")
        f.write("items:\n")
        
        for i, action in enumerate(actions, 1):
            f.write(f"  - id: UPSTREAM-{i}\n")
            f.write(f"    title: \"{action['title']}\"\n")
            f.write(f"    priority: {action['priority']}\n")
            f.write(f"    wsjf_score: {action['wsjf']}\n")
            f.write(f"    command: \"{action['command']}\"\n")
            f.write(f"    status: PENDING\n")
            if 'packages' in action:
                f.write(f"    packages: {json.dumps(action['packages'])}\n")
            f.write("\n")
    
    print(f"✅ Actions saved: {ACTIONS_FILE}")
    print(f"   Total: {len(actions)} action items")

def main():
    actions = parse_report()
    
    if not actions:
        print("✅ No upstream actions needed - all up to date!")
        return
    
    save_actions(actions)
    
    # Display summary
    print("\n📋 Upstream Action Summary:")
    for action in actions:
        print(f"  [{action['priority']}] {action['title']}")
        print(f"      WSJF: {action['wsjf']} | Command: {action['command']}")

if __name__ == "__main__":
    main()
EOF
    
    chmod +x "$SCRIPT_DIR/process_upstream_updates.py"
    
    log "✅ Created: $SCRIPT_DIR/process_upstream_updates.py"
    echo ""
    echo "Process updates into actions:"
    echo "  python3 $SCRIPT_DIR/process_upstream_updates.py"
}

# Main installation
main() {
    local os=$(detect_os)
    
    log "Installing daily upstream check automation..."
    log "OS: $os"
    log "Project: $PROJECT_ROOT"
    
    echo ""
    
    # Create logs directory
    mkdir -p "$PROJECT_ROOT/logs"
    
    # Install based on OS
    case "$os" in
        macos)
            install_macos
            ;;
        linux)
            install_linux
            ;;
        *)
            warn "Unsupported OS: $os"
            warn "Manually add to cron: 0 9 * * * $SCRIPT_DIR/check_upstream_updates.sh run"
            ;;
    esac
    
    # Create action tracker
    create_action_tracker
    
    echo ""
    log "Installation complete!"
    log "First run will execute tomorrow at 9:00 AM"
    log "To run now: $SCRIPT_DIR/check_upstream_updates.sh run"
}

main "$@"
