#!/usr/bin/env python3
import os
import re
import csv
import math

# Analyst Circle: WSJF Autonomous Ingestion Engine
# Calculates WSJF based on telemetry and restructures CAPABILITY_BACKLOG.md
# WSJF = (User Business Value + Time Criticality + Risk Reduction/Opportunity Enablement) / Job Size

BACKLOG_FILE = os.path.join(os.path.dirname(__file__), '../../CAPABILITY_BACKLOG.md')
TELEMETRY_CSV = os.path.join(os.path.dirname(__file__), '../../metrics/telemetry.csv')

def parse_backlog():
    with open(BACKLOG_FILE, 'r') as f:
        lines = f.readlines()
    
    header_idx = -1
    for i, line in enumerate(lines):
        if line.startswith('| ID | Status | Epic'):
            header_idx = i
            break
            
    if header_idx == -1:
        return None
        
    pre_table = lines[:header_idx+2]
    table_lines = []
    post_table = []
    
    in_table = True
    for i in range(header_idx+2, len(lines)):
        if not lines[i].strip().startswith('|'):
            in_table = False
        
        if in_table:
            table_lines.append(lines[i])
        else:
            post_table.append(lines[i])
            
    return pre_table, table_lines, post_table

def ingest_telemetry():
    # Simulated physical ingestion of .csv metrics & ROAM
    # In a real deployed node, this parses Datadog/Amplitude CSV exports
    telemetry = {}
    if os.path.exists(TELEMETRY_CSV):
        with open(TELEMETRY_CSV, 'r') as f:
            reader = csv.DictReader(f)
            for row in reader:
                telemetry[row['ID']] = {
                    'ubv': float(row.get('UBV', 5)),
                    'tc': float(row.get('TC', 5)),
                    'rr_oe': float(row.get('RR_OE', 5))
                }
    return telemetry

def calculate_wsjf(row, telemetry):
    # row format: | ID | Status | Epic | Capability | Product Domain | Priority | Effort |
    cols = [col.strip() for col in row.split('|') if col.strip()]
    if len(cols) < 7:
        return 0
    
    story_id = cols[0]
    priority = cols[5]
    try:
        effort = float(cols[6])
    except ValueError:
        effort = 1.0
        
    metrics = telemetry.get(story_id, None)
    
    # If no telemetry, derive from Priority Matrix
    if not metrics:
        ubv = 8 if 'P0' in priority else (5 if 'P1' in priority else 2)
        tc = 8 if 'P0' in priority else (5 if 'P1' in priority else 2)
        rr_oe = 5
    else:
        ubv = metrics['ubv']
        tc = metrics['tc']
        rr_oe = metrics['rr_oe']
        
    cost_of_delay = ubv + tc + rr_oe
    wsjf = cost_of_delay / max(effort, 1.0)
    return round(wsjf, 2)

def execute_ingestion():
    parsed = parse_backlog()
    if not parsed:
        print("❌ [ANALYST DAEMON] FATAL: Could not parse CAPABILITY_BACKLOG.md table.")
        return
        
    pre_table, table_lines, post_table = parsed
    telemetry = ingest_telemetry()
    
    # Separate completed/in-progress vs pending (RED)
    completed = []
    pending = []
    
    for line in table_lines:
        if '🔴' in line:
            wsjf = calculate_wsjf(line, telemetry)
            # Append WSJF to line for visibility if not present
            pending.append((wsjf, line))
        else:
            completed.append(line)
            
    # Sort pending by WSJF descending
    pending.sort(key=lambda x: x[0], reverse=True)
    
    # Reassemble Backlog
    with open(BACKLOG_FILE, 'w') as f:
        f.writelines(pre_table)
        f.writelines(completed)
        for wsjf, line in pending:
            f.write(line)
        f.writelines(post_table)
        
    print(f"✅ [ANALYST DAEMON] Ingestion Complete. WSJF Queue Recalculated.")
    print(f"📊 Processed {len(pending)} pending nodes sorted by maximum ROI velocity.")

if __name__ == '__main__':
    execute_ingestion()
