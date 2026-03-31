#!/usr/bin/env bash
# Measure system state post-RCA cleanup
# Compare against baseline from RCA_CPU_IDLE_ZERO.md

set -euo pipefail

OUTPUT_FILE=".goalie/SYSTEM_STATE_POST_CLEANUP.json"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

echo "📊 Measuring system state post-cleanup..."

# Load averages
LOAD_1MIN=$(uptime | awk -F'load averages: ' '{print $2}' | awk '{print $1}' | tr -d ',')
LOAD_5MIN=$(uptime | awk -F'load averages: ' '{print $2}' | awk '{print $2}' | tr -d ',')
LOAD_15MIN=$(uptime | awk -F'load averages: ' '{print $2}' | awk '{print $3}')

# Process counts
TOTAL_PROCS=$(ps aux | wc -l | xargs)
RUNNING_PROCS=$(ps aux | grep -E ' R ' | wc -l | xargs)
STUCK_PROCS=$(ps aux | grep -E ' D ' | wc -l | xargs)

# IDE process counts
VSCODE_PROCS=$(ps aux | grep -i 'Visual Studio Code\|Code Helper' | grep -v grep | wc -l | xargs)
CURSOR_PROCS=$(ps aux | grep -i 'Cursor' | grep -v grep | wc -l | xargs)
ZED_PROCS=$(ps aux | grep -i 'Zed' | grep -v grep | wc -l | xargs)
WARP_PROCS=$(ps aux | grep -i 'Warp' | grep -v grep | wc -l | xargs)
TOTAL_IDE_PROCS=$((VSCODE_PROCS + CURSOR_PROCS + ZED_PROCS + WARP_PROCS))

# CPU + Memory metrics (single top call, ~2s instead of ~10s)
TOP_OUTPUT=$(top -l 2 -n 0 -s 1 2>/dev/null || echo "")
CPU_LINE=$(echo "$TOP_OUTPUT" | grep "CPU usage" | tail -1)
CPU_IDLE=$(echo "$CPU_LINE" | awk '{print $7}' | tr -d '%')
CPU_USER=$(echo "$CPU_LINE" | awk '{print $3}' | tr -d '%')
CPU_SYS=$(echo "$CPU_LINE" | awk '{print $5}' | tr -d '%')
# Ensure numeric defaults for CPU
CPU_IDLE=${CPU_IDLE:-0}
CPU_USER=${CPU_USER:-0}
CPU_SYS=${CPU_SYS:-0}

# Memory from same top output
MEM_LINE=$(echo "$TOP_OUTPUT" | grep PhysMem | tail -1)
MEM_USED_GB=$(echo "$MEM_LINE" | awk '{print $2}' | tr -d 'GMB')
MEM_WIRED_GB=$(echo "$MEM_LINE" | awk '{print $6}' | tr -d 'GMB')
MEM_USED_GB=${MEM_USED_GB:-0}
MEM_WIRED_GB=${MEM_WIRED_GB:-0}

# Disk I/O (single iostat call, ~2s instead of ~4s)
IOSTAT_OUTPUT=$(iostat -d -c 2 disk0 2>/dev/null | tail -1 || echo "0 0 0 0")
DISK_READ_MB=$(echo "$IOSTAT_OUTPUT" | awk '{print $3}')
DISK_WRITE_MB=$(echo "$IOSTAT_OUTPUT" | awk '{print $4}')
DISK_READ_MB=${DISK_READ_MB:-0}
DISK_WRITE_MB=${DISK_WRITE_MB:-0}

# Build JSON
cat > "$OUTPUT_FILE" << JSON
{
  "timestamp": "$TIMESTAMP",
  "system": {
    "load_avg": {
      "1min": $LOAD_1MIN,
      "5min": $LOAD_5MIN,
      "15min": $LOAD_15MIN
    },
    "processes": {
      "total": $TOTAL_PROCS,
      "running": $RUNNING_PROCS,
      "stuck": $STUCK_PROCS
    },
    "cpu": {
      "idle_pct": $CPU_IDLE,
      "user_pct": $CPU_USER,
      "sys_pct": $CPU_SYS
    },
    "memory": {
      "used_gb": $MEM_USED_GB,
      "wired_gb": $MEM_WIRED_GB
    },
    "disk_io": {
      "read_mb_per_sec": $DISK_READ_MB,
      "write_mb_per_sec": $DISK_WRITE_MB
    }
  },
  "ides": {
    "total": $TOTAL_IDE_PROCS,
    "vscode": $VSCODE_PROCS,
    "cursor": $CURSOR_PROCS,
    "zed": $ZED_PROCS,
    "warp": $WARP_PROCS
  },
  "baseline_comparison": {
    "load_1min_delta_pct": $(awk "BEGIN {printf \"%.2f\", (($LOAD_1MIN - 194.04) / 194.04) * 100}"),
    "ide_count_delta_pct": $(awk "BEGIN {printf \"%.2f\", (($TOTAL_IDE_PROCS - 159) / 159) * 100}"),
    "cpu_idle_delta_pct": $(awk "BEGIN {printf \"%.2f\", (($CPU_IDLE - 1.56) / 1.56) * 100}")
  },
  "success_criteria": {
    "cpu_idle_gt_20": $([ $(echo "$CPU_IDLE > 20" | bc -l) -eq 1 ] && echo "true" || echo "false"),
    "load_avg_lt_50": $([ $(echo "$LOAD_1MIN < 50" | bc -l) -eq 1 ] && echo "true" || echo "false"),
    "running_procs_lt_100": $([ $RUNNING_PROCS -lt 100 ] && echo "true" || echo "false"),
    "ide_procs_le_50": $([ $TOTAL_IDE_PROCS -le 50 ] && echo "true" || echo "false")
  }
}
JSON

echo "✅ System state captured: $OUTPUT_FILE"
cat "$OUTPUT_FILE" | python3 -m json.tool
