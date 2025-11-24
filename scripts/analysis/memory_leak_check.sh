#!/bin/bash
# Track memory usage of Agentic Flow processes

LOG_FILE="logs/memory_leak_analysis.log"
mkdir -p logs

echo "Starting Memory Leak Analysis at $(date)" | tee -a "$LOG_FILE"
echo "Tracking PIDs for 'agentic-flow', 'processGovernor', and 'node'..." | tee -a "$LOG_FILE"

while true; do
    echo "--- $(date) ---" >> "$LOG_FILE"
    # Find PIDs for node processes related to agentic-flow
    # Using pgrep to find all node processes might be noisy, but safer for catching leaks
    pids=$(pgrep -f "agentic-flow|processGovernor|node")

    if [ -z "$pids" ]; then
        echo "No relevant processes found." >> "$LOG_FILE"
    else
        # Log RSS, VSZ, %MEM, %CPU, TIME
        # sort by RSS (memory usage) descending
        echo "PID   PPID  RSS    VSZ    %MEM %CPU TIME     COMMAND" >> "$LOG_FILE"
        ps -o pid,ppid,rss,vsz,pmem,pcpu,time,comm,args -p $pids | sort -rnk3 | head -n 20 >> "$LOG_FILE"
    fi

    # Check for zombie processes
    zombies=$(ps aux | grep 'Z' | grep -v grep)
    if [ -n "$zombies" ]; then
        echo "WARNING: Zombie processes detected:" >> "$LOG_FILE"
        echo "$zombies" >> "$LOG_FILE"
    fi

    sleep 60
done
