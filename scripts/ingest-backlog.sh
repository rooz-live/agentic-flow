#!/usr/bin/env bash
# Orchestrator Circle: Autonomous Ingestion Engine
# Parses CAPABILITY_BACKLOG.md + ROAM risks into structured .goalie/ingestion.json
# Wired into one.sh as a pre-CI step for WSJF queue adjustment.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKLOG="$ROOT_DIR/CAPABILITY_BACKLOG.md"
ROAM_DIR="$ROOT_DIR/docs/governance/roam"
ROAM_TRACKER="$ROOT_DIR/docs/ROAM-tracker.md"
OUTPUT="$ROOT_DIR/.goalie/ingestion.json"

mkdir -p "$ROOT_DIR/.goalie"

command python3 - "$BACKLOG" "$ROAM_TRACKER" "$ROAM_DIR" "$OUTPUT" << 'PYTHON'
import sys, json, re, os, glob
from datetime import datetime, timezone
from pathlib import Path

backlog_path = sys.argv[1]
roam_tracker_path = sys.argv[2]
roam_dir = sys.argv[3]
output_path = sys.argv[4]

# ── Parse CAPABILITY_BACKLOG.md ──────────────────────────────────────────
stories = []
if os.path.exists(backlog_path):
    with open(backlog_path) as f:
        for line in f:
            # Match table rows: | US-XXX | status | epic | capability | domain | priority | effort/wsjf |
            m = re.match(
                r'\|\s*(US-\d+)\s*\|\s*([^|]+)\|\s*([^|]+)\|\s*([^|]+)\|\s*([^|]+)\|\s*([^|]+)\|\s*([^|]+)\|',
                line
            )
            if not m:
                continue
            sid, status_raw, epic, capability, domain, priority, effort_wsjf = [
                g.strip() for g in m.groups()
            ]
            # Extract percentage from status
            pct_match = re.search(r'(\d+)%', status_raw)
            pct = int(pct_match.group(1)) if pct_match else (100 if '🟢' in status_raw else 0)
            # Extract WSJF score if present
            wsjf_match = re.search(r'([\d.]+)', effort_wsjf)
            wsjf = float(wsjf_match.group(1)) if wsjf_match else 0.0
            # Determine lane
            if pct == 100:
                lane = 'DONE'
            elif pct > 0:
                lane = 'NOW'
            elif 'RED' in status_raw or pct == 0:
                lane = 'LATER'
            else:
                lane = 'LATER'
            stories.append({
                'id': sid,
                'status_pct': pct,
                'lane': lane,
                'epic': epic,
                'capability': capability,
                'domain': domain,
                'priority': priority,
                'wsjf': wsjf,
                'e2e_verified': False,  # Default: not verified until Assessor sweep
            })

# ── Parse ROAM risks ─────────────────────────────────────────────────────
risks = []
roam_files = glob.glob(os.path.join(roam_dir, '*.md')) if os.path.isdir(roam_dir) else []
if os.path.exists(roam_tracker_path):
    roam_files.append(roam_tracker_path)
# Also check root-level ROAM files
roam_files.extend(glob.glob(os.path.join(os.path.dirname(backlog_path), 'ROAM-*.md')))

for rpath in set(roam_files):
    try:
        content = Path(rpath).read_text(errors='ignore')
        # Extract risk entries: lines starting with - [HIGH|MEDIUM|LOW|CRITICAL]
        for m in re.finditer(
            r'-\s*\[(HIGH|MEDIUM|LOW|CRITICAL)\]\s*(.+?)(?:\||$)', content
        ):
            severity, desc = m.group(1), m.group(2).strip()
            risks.append({
                'severity': severity,
                'description': desc[:200],
                'source': os.path.basename(rpath),
                'stale': False,
            })
        # Also extract ROAM categories (Risks/Obstacles/Assumptions/Mitigations headers)
        for m in re.finditer(r'##\s*(Risks?|Obstacles?|Assumptions?|Mitigations?)\s*\n((?:.*\n)*?(?=##|\Z))', content):
            category = m.group(1)
            block = m.group(2)
            for item in re.findall(r'-\s+(.+)', block):
                if item.strip() and not any(r['description'][:50] in item for r in risks):
                    risks.append({
                        'severity': 'MEDIUM',
                        'description': item.strip()[:200],
                        'source': os.path.basename(rpath),
                        'category': category,
                        'stale': False,
                    })
    except Exception:
        continue

# ── Compute WSJF queue ───────────────────────────────────────────────────
now_lane = sorted(
    [s for s in stories if s['lane'] == 'NOW'],
    key=lambda s: s['wsjf'], reverse=True
)
later_lane = sorted(
    [s for s in stories if s['lane'] == 'LATER'],
    key=lambda s: s['wsjf'], reverse=True
)
done_lane = [s for s in stories if s['lane'] == 'DONE']
critical_risks = [r for r in risks if r['severity'] in ('CRITICAL', 'HIGH')]

# ── Metrics ──────────────────────────────────────────────────────────────
total = len(stories)
done_count = len(done_lane)
now_count = len(now_lane)
later_count = len(later_lane)
velocity = done_count / max(total, 1) * 100
unverified_green = len([s for s in done_lane if not s['e2e_verified']])

ingestion = {
    'timestamp': datetime.now(timezone.utc).isoformat(),
    'source_files': {
        'backlog': backlog_path,
        'roam_files': len(set(roam_files)),
    },
    'metrics': {
        'total_stories': total,
        'done': done_count,
        'in_progress': now_count,
        'backlog': later_count,
        'velocity_pct': round(velocity, 1),
        'unverified_green': unverified_green,
        'critical_risks': len(critical_risks),
        'total_risks': len(risks),
    },
    'wsjf_queue': {
        'now': [{'id': s['id'], 'wsjf': s['wsjf'], 'capability': s['capability'], 'pct': s['status_pct']} for s in now_lane],
        'later': [{'id': s['id'], 'wsjf': s['wsjf'], 'capability': s['capability']} for s in later_lane[:10]],
        'done_unverified': [{'id': s['id'], 'capability': s['capability']} for s in done_lane if not s['e2e_verified']],
    },
    'roam_risks': critical_risks[:20],
    'recommendations': [],
}

# ── Generate recommendations ─────────────────────────────────────────────
if unverified_green > 0:
    ingestion['recommendations'].append({
        'priority': 'CRITICAL',
        'action': f'Assessor E2E sweep: {unverified_green} items marked 100% without E2E verification',
        'circle': 'assessor',
    })
if critical_risks:
    ingestion['recommendations'].append({
        'priority': 'HIGH',
        'action': f'{len(critical_risks)} HIGH/CRITICAL ROAM risks require mitigation',
        'circle': 'orchestrator',
    })
if now_count > 0:
    top = now_lane[0]
    ingestion['recommendations'].append({
        'priority': 'NOW',
        'action': f'Highest WSJF: {top["id"]} ({top["capability"]}) at {top["status_pct"]}% — WSJF {top["wsjf"]}',
        'circle': 'orchestrator',
    })

# ── Write output ─────────────────────────────────────────────────────────
with open(output_path, 'w') as f:
    json.dump(ingestion, f, indent=2)
print(f'✅ Ingested {total} stories, {len(risks)} risks → {output_path}')
for rec in ingestion['recommendations']:
    print(f'  [{rec["priority"]}] {rec["action"]}')
PYTHON
