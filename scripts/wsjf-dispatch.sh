#!/usr/bin/env bash
# Orchestrator Circle: WSJF Task Dispatcher
# Reads .goalie/ingestion.json, selects highest-priority actionable item,
# and writes a dispatch artifact to .goalie/dispatch.json.
#
# Usage:
#   ./scripts/wsjf-dispatch.sh              # Auto-select top WSJF item
#   ./scripts/wsjf-dispatch.sh --dry-run    # Show what would be dispatched
#   ./scripts/wsjf-dispatch.sh --id US-028  # Dispatch a specific story
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
INGESTION="$ROOT_DIR/.goalie/ingestion.json"
DISPATCH="$ROOT_DIR/.goalie/dispatch.json"
DISPATCH_LOG="$ROOT_DIR/.goalie/dispatch_log.jsonl"
DRY_RUN=false
FORCE_ID=""

for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=true ;;
    --id=*)    FORCE_ID="${arg#--id=}" ;;
    --id)      shift; FORCE_ID="${1:-}" ;;
  esac
done

if [ ! -f "$INGESTION" ]; then
  echo "❌ No ingestion data. Run: ./scripts/one.sh ingest"
  exit 1
fi

command python3 - "$INGESTION" "$DISPATCH" "$DISPATCH_LOG" "$([ "$DRY_RUN" = true ] && echo True || echo False)" "$FORCE_ID" << 'PYTHON'
import sys, json, os
from datetime import datetime, timezone

ingestion_path = sys.argv[1]
dispatch_path = sys.argv[2]
log_path = sys.argv[3]
dry_run = sys.argv[4] == 'True'
force_id = sys.argv[5] if len(sys.argv) > 5 else ''

data = json.load(open(ingestion_path))
recommendations = data.get('recommendations', [])
now_queue = data.get('wsjf_queue', {}).get('now', [])
done_unverified = data.get('wsjf_queue', {}).get('done_unverified', [])

# ── Decision logic: CRITICAL recommendations first, then WSJF ────────────
# Priority 1: CRITICAL recommendations (e.g. Assessor E2E sweep)
# Priority 2: Highest WSJF in NOW queue
# Priority 3: Promote from LATER if NOW is empty

dispatch = None

# Check for CRITICAL recommendations first
critical_recs = [r for r in recommendations if r['priority'] == 'CRITICAL']
if critical_recs and not force_id:
    rec = critical_recs[0]
    dispatch = {
        'type': 'recommendation',
        'priority': 'CRITICAL',
        'action': rec['action'],
        'circle': rec['circle'],
        'items': [u['id'] for u in done_unverified],
        'reason': f'WSJF dispatcher: {len(done_unverified)} unverified items block structural sovereignty',
    }

# If forcing a specific ID, find it
if force_id:
    for item in now_queue + data.get('wsjf_queue', {}).get('later', []):
        if item['id'] == force_id:
            dispatch = {
                'type': 'story',
                'id': item['id'],
                'wsjf': item.get('wsjf', 0),
                'capability': item.get('capability', ''),
                'pct': item.get('pct', 0),
                'circle': 'orchestrator',
                'reason': f'Manual dispatch: {force_id}',
            }
            break

# Default: highest WSJF from NOW queue
if not dispatch and now_queue:
    top = now_queue[0]
    dispatch = {
        'type': 'story',
        'id': top['id'],
        'wsjf': top['wsjf'],
        'capability': top['capability'],
        'pct': top['pct'],
        'circle': 'orchestrator',
        'reason': f'Auto-dispatch: highest WSJF ({top["wsjf"]}) in NOW queue',
    }

if not dispatch:
    print('⚠️  Nothing to dispatch — all queues empty')
    sys.exit(0)

# ── Build dispatch artifact ──────────────────────────────────────────────
artifact = {
    'timestamp': datetime.now(timezone.utc).isoformat(),
    'dispatch': dispatch,
    'context': {
        'total_stories': data['metrics']['total_stories'],
        'velocity_pct': data['metrics']['velocity_pct'],
        'unverified_green': data['metrics']['unverified_green'],
        'now_queue_depth': len(now_queue),
        'ingestion_ts': data['timestamp'],
    },
}

# ── Output ───────────────────────────────────────────────────────────────
if dry_run:
    print('🔍 DRY RUN — would dispatch:')
else:
    with open(dispatch_path, 'w') as f:
        json.dump(artifact, f, indent=2)
    # Append to log
    os.makedirs(os.path.dirname(log_path), exist_ok=True)
    with open(log_path, 'a') as f:
        f.write(json.dumps(artifact) + '\n')
    print('✅ Dispatched:')

d = dispatch
if d['type'] == 'recommendation':
    print(f'  Type:     {d["type"]}')
    print(f'  Priority: {d["priority"]}')
    print(f'  Action:   {d["action"]}')
    print(f'  Circle:   {d["circle"]}')
    print(f'  Items:    {len(d["items"])} stories')
    print(f'  Reason:   {d["reason"]}')
elif d['type'] == 'story':
    print(f'  Type:       {d["type"]}')
    print(f'  Story:      {d["id"]}')
    print(f'  WSJF:       {d["wsjf"]}')
    print(f'  Capability: {d["capability"]}')
    print(f'  Progress:   {d["pct"]}%')
    print(f'  Circle:     {d["circle"]}')
    print(f'  Reason:     {d["reason"]}')
PYTHON
