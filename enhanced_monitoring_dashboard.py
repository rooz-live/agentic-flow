#!/usr/bin/env python3
# enhanced_monitoring_dashboard.py
# @business-context WSJF-49: Native visual IPC bridging rendering JSONL trace output cleanly avoiding internal webserver HTTP attacks.
# @adr ADR-007: Validates dashboard mapping bounds via secure .goalie metrics loops.

import os
import sys
import json
import time

def parse_telemetry_logs():
    log_path = ".goalie/metrics_log.jsonl"
    results = {
        "SATURATION": 0.0,
        "ERRORS": 0.0,
        "TRAFFIC": 0.0,
        "LATENCY": 0.0
    }
    
    if not os.path.exists(log_path):
        return results
        
    try:
        # Read the last 20 frames mapping recent structural limits
        with open(log_path, 'r') as f:
            lines = f.readlines()[-20:]
            
        for line in lines:
            try:
                frame = json.loads(line)
                signal = frame.get("signal")
                value = float(frame.get("value", 0.0))
                
                if signal in results:
                    results[signal] = max(results[signal], value)
            except json.JSONDecodeError:
                pass
    except Exception as e:
        print(f"File Parse Warning: {e}")
        
    return results

def render_dashboard():
    metrics = parse_telemetry_logs()
    
    os.system('clear' if os.name == 'posix' else 'cls')
    print("=" * 60)
    print("   SWARM DBOS ENHANCED TELEMETRY [IPC DASHBOARD ADR-007]")
    print("=" * 60)
    print("")
    
    for signal, value in metrics.items():
        # Map values to a 40-character bar structurally evaluating width
        normalized = min(max(value, 0.0), 1.0)
        width = int(normalized * 40)
        bar = "█" * width + "░" * (40 - width)
        
        color = "\033[0;32m"  # Green
        if normalized > 0.8:
            color = "\033[0;31m"  # Red
        elif normalized > 0.5:
            color = "\033[1;33m"  # Yellow
            
        reset = "\033[0m"
        print(f" {signal:<10} | {color}{bar}{reset} | {value:.2f}")

    print("\n" + "=" * 60)
    print(" STATUS: MONITORING ACTIVE [Ctrl+C to Exit]")

def main():
    try:
        # For CI automated bounds, we render once and exit cleanly
        if os.getenv("CI") == "true":
            render_dashboard()
            return
            
        while True:
            render_dashboard()
            time.sleep(2)
    except KeyboardInterrupt:
        print("\n[OK] Dashboard mapping closed.")

if __name__ == "__main__":
    main()
