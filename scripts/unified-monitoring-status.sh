#!/bin/bash
# Unified monitoring status dashboard
# Shows LaunchAgent status, cron job status, and system health

set -euo pipefail

echo "═══════════════════════════════════════════"
echo "  🔍 UNIFIED MONITORING STATUS DASHBOARD"
echo "  $(date '+%Y-%m-%d %H:%M:%S')"
echo "═══════════════════════════════════════════"
echo ""

# LaunchAgent Status
echo "📋 LAUNCHAGENT STATUS:"
echo "─────────────────────────────────────────"
launchctl list | grep com.bhopti | while read -r pid status label; do
    if [[ "$status" == "0" ]]; then
        echo "✅ $label (PID: $pid)"
    else
        echo "❌ $label (Exit: $status)"
    fi
done
echo ""

# Cron Job Status
echo "⏰ CRON JOB STATUS:"
echo "─────────────────────────────────────────"
crontab -l | grep -E "(ROAM|Swarm)" | while read -r line; do
    if [[ "$line" =~ ^#.* ]]; then
        echo "📝 $line"
    else
        echo "🔄 $line"
    fi
done
echo ""

# ROAM Status
echo "🏛️ ROAM COMPLIANCE:"
echo "─────────────────────────────────────────"
if [[ -f "ROAM_TRACKER.yaml" ]]; then
    age_hours=$(( ($(date +%s) - $(stat -f "%m" ROAM_TRACKER.yaml)) / 3600 ))
    if [[ $age_hours -lt 96 ]]; then
        echo "✅ ROAM tracker FRESH (${age_hours}h < 96h)"
    else
        echo "⚠️ ROAM tracker STALE (${age_hours}h >= 96h)"
    fi
else
    echo "❌ ROAM tracker not found"
fi
echo ""

# VibeThinker Status
echo "🧠 VIBETHINKER STATUS:"
echo "─────────────────────────────────────────"
if pgrep -f "vibethinker-trial-swarm.sh" > /dev/null; then
    pid=$(pgrep -f "vibethinker-trial-swarm.sh")
    echo "✅ VibeThinker running (PID: $pid)"
    if [[ -f ~/Library/Logs/vibethinker-mgpo.log ]]; then
        echo "📊 Latest activity: $(tail -1 ~/Library/Logs/vibethinker-mgpo.log | cut -c1-80)..."
    fi
else
    echo "❌ VibeThinker not running"
fi
echo ""

# System Health
echo "💻 SYSTEM HEALTH:"
echo "─────────────────────────────────────────"
disk_usage=$(df -h . | tail -1 | awk '{print $5}' | sed 's/%//')
if [[ $disk_usage -ge 90 ]]; then
    echo "🔴 CRITICAL: Disk usage ${disk_usage}% (>=90%)"
else
    echo "✅ Disk usage: ${disk_usage}%"
fi

memory_free=$(vm_stat | grep "Pages free" | awk '{print $3}' | sed 's/\.//')
memory_mb=$(( memory_free * 4096 / 1024 / 1024 ))
if [[ $memory_mb -lt 500 ]]; then
    echo "⚠️ Low memory: ${memory_mb}MB free (<500MB)"
else
    echo "✅ Memory: ${memory_mb}MB free"
fi
echo ""

# Recommendations
echo "💡 RECOMMENDATIONS:"
echo "─────────────────────────────────────────"
failed_agents=$(launchctl list | grep com.bhopti | grep -v " 0 " | wc -l | tr -d ' ')
if [[ $failed_agents -gt 0 ]]; then
    echo "🔧 $failed_agents LaunchAgent(s) failing - consider MCP-based monitoring"
fi

if [[ $disk_usage -ge 90 ]]; then
    echo "🧹 Run cleanup: scripts/ay-yo-cleanup.sh"
fi

if [[ $age_hours -ge 72 ]]; then
    echo "📝 ROAM tracker approaching staleness - update recommended"
fi

echo "✅ Manual monitoring: scripts/validators/roam-staleness-watchdog.sh"
echo ""
