#!/usr/bin/env python3
import os
import re

# NanoIndex Tree/Graph Reasoning & WSJF Sequencing Agent
# Processes CAPABILITY_BACKLOG.md into a hierarchical, WSJF-sorted structure.

def calculate_wsjf(priority_str, effort_str):
    # WSJF = Cost of Delay / Job Size (Effort)
    # Map priority to Cost of Delay (P0=21, P1=13, P2=5)
    cod_map = {"P0 — Critical": 21, "P1 — High": 13, "P2 — Medium": 5}
    cod = cod_map.get(priority_str.strip(), 1)
    
    try:
        effort = int(effort_str.strip())
        if effort == 0: effort = 1
    except ValueError:
        effort = 5
        
    return cod / effort

def main():
    root = os.environ.get('WORKSPACE_ROOT', '/Users/shahroozbhopti/Documents/code')
    backlog_path = os.path.join(root, 'CAPABILITY_BACKLOG.md')
    
    if not os.path.exists(backlog_path):
        print(f"File not found: {backlog_path}")
        return
        
    with open(backlog_path, 'r') as f:
        content = f.read()
        
    # Extract table rows
    table_regex = re.compile(r'\|(.*?)\|(.*?)\|(.*?)\|(.*?)\|(.*?)\|(.*?)\|(.*?)\|')
    rows = table_regex.findall(content)
    
    # Skip headers
    data_rows = []
    for r in rows:
        if 'ID' in r[0] or '---' in r[0]:
            continue
        # Structure: ID, Status, Epic, Capability, Product Domain, Priority, Effort
        data_rows.append({
            'id': r[0].strip(),
            'status': r[1].strip(),
            'epic': r[2].strip(),
            'capability': r[3].strip(),
            'domain': r[4].strip(),
            'priority': r[5].strip(),
            'effort': r[6].strip(),
            'wsjf': calculate_wsjf(r[5], r[6])
        })
        
    # Tree/Graph Reasoning: Group by Domain
    graph = {}
    for row in data_rows:
        dom = row['domain']
        if dom not in graph:
            graph[dom] = []
        graph[dom].append(row)
        
    # Sequence by WSJF within each branch of the tree
    for dom in graph:
        graph[dom].sort(key=lambda x: x['wsjf'], reverse=True)
        
    # Generate Output
    print("🌳 NanoIndex: Tree/Graph Reasoning & WSJF Sequencing")
    print("=====================================================")
    for dom, items in graph.items():
        print(f"\n📂 Domain: {dom}")
        for item in items:
            wsjf_score = round(item['wsjf'], 2)
            print(f"  ├── 📄 [{item['id']}] {item['epic']} - {item['capability']} (WSJF: {wsjf_score}) | Status: {item['status']}")

if __name__ == '__main__':
    main()
