#!/usr/bin/env python3
"""
Process Health Analyzer
Tracks PIDs, memory, and dependencies for Agentic Flow components.
"""

import sys
import os
import json
import subprocess
import time
from datetime import datetime, timezone

def get_processes():
    """
    Retrieves running processes relevant to the Agentic Flow ecosystem.
    Uses 'ps' command for portability (Linux/macOS).
    """
    try:
        # ps -A -o pid,ppid,rss,pcpu,time,command
        # rss is resident set size in 1024-byte units (kB on Linux, usually kB on macOS but ps man page says 1024 byte units)
        cmd = ["ps", "-A", "-o", "pid,ppid,rss,pcpu,time,command"]
        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode != 0:
            return {"error": f"ps command failed: {result.stderr}"}
        
        lines = result.stdout.strip().split('\n')
        # Skip header
        if len(lines) < 2:
            return []

        processes = []
        
        # Keywords to identify relevant processes
        keywords = [
            "node", "python", "af", "goalie", "claudette", 
            "ts-node", "jest", "wsjf", "replenish", 
            "governance", "retro-coach"
        ]
        
        # Exclude this script itself
        this_pid = os.getpid()

        for line in lines[1:]:
            # Split with limit to keep command intact (args might have spaces)
            # But ps output is column based, split by whitespace is tricky if columns merge.
            # However, standard ps output usually has enough spacing or specific order.
            # Parts: PID PPID RSS %CPU TIME COMMAND
            parts = line.strip().split(None, 5)
            if len(parts) < 6:
                continue
                
            pid_str, ppid_str, rss_str, pcpu_str, time_str, command = parts
            
            try:
                pid = int(pid_str)
                if pid == this_pid:
                    continue
                    
                # Check keywords
                if any(k in command for k in keywords):
                    processes.append({
                        "pid": pid,
                        "ppid": int(ppid_str),
                        "memory_kb": int(rss_str),
                        "cpu_percent": float(pcpu_str),
                        "time": time_str,
                        "command": command
                    })
            except ValueError:
                continue
                
        return processes
    except Exception as e:
        return {"error": str(e)}

def analyze_health(processes):
    """
    Analyzes process list for high resource usage and anomalies.
    """
    analysis = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "total_relevant_processes": len(processes),
        "total_memory_mb": 0,
        "high_load_processes": [],
        "details": processes
    }
    
    total_mem_kb = 0
    
    # Thresholds
    MEM_THRESHOLD_KB = 500 * 1024 # 500 MB
    CPU_THRESHOLD = 50.0 # 50%
    
    for p in processes:
        total_mem_kb += p['memory_kb']
        
        issues = []
        if p['memory_kb'] > MEM_THRESHOLD_KB:
            issues.append("High Memory")
        if p['cpu_percent'] > CPU_THRESHOLD:
            issues.append("High CPU")
            
        if issues:
            p['issues'] = issues
            analysis["high_load_processes"].append(p)
            
    analysis["total_memory_mb"] = round(total_mem_kb / 1024, 2)
    
    return analysis

if __name__ == "__main__":
    procs = get_processes()
    if isinstance(procs, dict) and "error" in procs:
        print(json.dumps(procs))
        sys.exit(1)
    else:
        report = analyze_health(procs)
        print(json.dumps(report, indent=2))
