#!/usr/bin/env bash
set -euo pipefail

# Force Re-Scan Trigger for Validator #12
# 
# Purpose: Touch files to trigger watcher re-processing
# Use: When existing files haven't been processed but should be

WATCH_DIR="$HOME/Documents/Personal/CLT/MAA"

echo "🔄 Force re-scanning files in $WATCH_DIR..."

# Touch files modified in last 7 days
find "$WATCH_DIR" -maxdepth 1 \( -name "*.pdf" -o -name "*.md" -o -name "*.json" -o -name "*.eml" \) -mtime -7 -exec touch {} \; 2>/dev/null

echo "✅ Files touched - watcher will re-process them within 3 seconds"
echo "   Monitor: tail -f ~/Library/Logs/validator-12-enhanced.log"
