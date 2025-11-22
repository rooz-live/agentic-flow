#!/bin/bash
# Track memory usage of Agentic Flow processes

LOG_FILE="logs/memory_leak_analysis.log"
mkdir -p logs

echo "Starting Memory Leak Analysis at $(date)" | tee -a "$LOG_FILE"
echo "Tracking PIDs for 'agentic-flow' and 'processGovernor'..." | tee -a "$LOG_FILE"

while true; do
    echo "--- $(date) ---" >> "$LOG_FILE"
    # Find PIDs for node processes related to agentic-flow
    pids=$(pgrep -f "agentic-flow|processGovernor")

    if [ -z "$pids" ]; then
        echo "No relevant processes found." >> "$LOG_FILE"
    else
        # Log RSS and VSZ
        ps -o pid,ppid,rss,vsz,comm,args -p $pids >> "$LOG_FILE"
    fi

    sleep 60
done
