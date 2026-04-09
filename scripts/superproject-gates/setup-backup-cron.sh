#!/usr/bin/env bash
set -euo pipefail

# Setup Automated Incremental Backups via Cron/LaunchAgent
# macOS uses LaunchAgents instead of cron for reliability

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BACKUP_SCRIPT="$SCRIPT_DIR/backup-incremental.sh"

echo "⚙️  Automated Backup Setup"
echo "=========================="
echo

# Check if backup script exists
if [ ! -f "$BACKUP_SCRIPT" ]; then
  echo "❌ Error: backup-incremental.sh not found at $BACKUP_SCRIPT"
  exit 1
fi

# Make backup script executable
chmod +x "$BACKUP_SCRIPT"

# macOS LaunchAgent setup (preferred over cron)
PLIST_DIR="$HOME/Library/LaunchAgents"
PLIST_NAME="com.agenticflow.backup.plist"
PLIST_PATH="$PLIST_DIR/$PLIST_NAME"

mkdir -p "$PLIST_DIR"

echo "📦 Creating LaunchAgent for automated backups..."
echo

# Create LaunchAgent plist
cat > "$PLIST_PATH" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.agenticflow.backup</string>
    
    <key>ProgramArguments</key>
    <array>
        <string>/bin/bash</string>
        <string>$BACKUP_SCRIPT</string>
    </array>
    
    <key>WorkingDirectory</key>
    <string>$PROJECT_ROOT</string>
    
    <key>StartCalendarInterval</key>
    <array>
        <!-- Daily at 2 AM -->
        <dict>
            <key>Hour</key>
            <integer>2</integer>
            <key>Minute</key>
            <integer>0</integer>
        </dict>
        <!-- Daily at 2 PM -->
        <dict>
            <key>Hour</key>
            <integer>14</integer>
            <key>Minute</key>
            <integer>0</integer>
        </dict>
    </array>
    
    <key>StandardOutPath</key>
    <string>$HOME/.code-backups/agentic-flow/launchagent.log</string>
    
    <key>StandardErrorPath</key>
    <string>$HOME/.code-backups/agentic-flow/launchagent.error.log</string>
    
    <key>RunAtLoad</key>
    <false/>
    
    <key>Nice</key>
    <integer>10</integer>
</dict>
</plist>
EOF

echo "✅ LaunchAgent created: $PLIST_PATH"
echo

# Load the LaunchAgent
echo "🔄 Loading LaunchAgent..."
launchctl unload "$PLIST_PATH" 2>/dev/null || true
launchctl load "$PLIST_PATH"

# Check if loaded successfully
if launchctl list | grep -q "com.agenticflow.backup"; then
  echo "✅ LaunchAgent loaded successfully"
else
  echo "⚠️  LaunchAgent may not be loaded. Check manually with:"
  echo "   launchctl list | grep agenticflow"
fi

echo
echo "📋 Backup Schedule:"
echo "  - Daily at 2:00 AM"
echo "  - Daily at 2:00 PM"
echo
echo "📊 Retention Policy:"
echo "  - Daily backups: 7 days"
echo "  - Weekly backups: 4 weeks"
echo "  - Monthly backups: 12 months"
echo
echo "📝 Logs:"
echo "  - Output: ~/.code-backups/agentic-flow/launchagent.log"
echo "  - Errors: ~/.code-backups/agentic-flow/launchagent.error.log"
echo "  - Backup log: ~/.code-backups/agentic-flow/backup.log"
echo

# Also create traditional crontab entry (as fallback)
echo "🔧 Optional: Crontab Entry (Linux/fallback)"
echo "==========================================="
echo
echo "Add this to crontab (run: crontab -e):"
echo
cat << 'CRONEOF'
# Incremental backups twice daily (2 AM and 2 PM)
0 2 * * * /bin/bash "$HOME/Documents/code/investing/agentic-flow/scripts/backup-incremental.sh" >> "$HOME/.code-backups/agentic-flow/cron.log" 2>&1
0 14 * * * /bin/bash "$HOME/Documents/code/investing/agentic-flow/scripts/backup-incremental.sh" >> "$HOME/.code-backups/agentic-flow/cron.log" 2>&1
CRONEOF
echo

# Manual trigger test
echo "🧪 Test Commands:"
echo "================"
echo
echo "# Test backup now"
echo "bash $BACKUP_SCRIPT"
echo
echo "# Check LaunchAgent status"
echo "launchctl list | grep agenticflow"
echo
echo "# View logs"
echo "tail -f ~/.code-backups/agentic-flow/launchagent.log"
echo
echo "# Manually trigger LaunchAgent"
echo "launchctl start com.agenticflow.backup"
echo
echo "# Unload LaunchAgent (disable)"
echo "launchctl unload $PLIST_PATH"
echo

# Create convenience wrapper
CONVENIENCE_SCRIPT="$SCRIPT_DIR/backup-now.sh"
cat > "$CONVENIENCE_SCRIPT" << 'EOF'
#!/usr/bin/env bash
# Quick backup trigger
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
bash "$SCRIPT_DIR/backup-incremental.sh"
EOF

chmod +x "$CONVENIENCE_SCRIPT"

echo "✅ Setup Complete!"
echo
echo "💡 Quick Commands:"
echo "  - Backup now: bash scripts/backup-now.sh"
echo "  - Check status: launchctl list | grep agenticflow"
echo "  - View backups: ls -lh ~/.code-backups/agentic-flow/snapshots/"
echo

exit 0
