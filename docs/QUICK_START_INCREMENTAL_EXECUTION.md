# Quick Start: Incremental Relentless Execution

**Status**: System load CRITICAL - Follow stabilization steps first  
**Last Updated**: 2025-01-13T08:30:00Z  
**See Also**: [AGENTIC_WORKFLOW_ANALYSIS.md](./AGENTIC_WORKFLOW_ANALYSIS.md)

---

## Immediate Actions (Do These First)

### Step 1: Emergency System Stabilization (5-10 minutes)

**Current State**: System load = 543 (should be < 50)

```bash
# Check current load
uptime

# Identify high-CPU processes
ps aux | awk '$3 > 80.0 || $4 > 20.0' | grep -E 'node|jest|test'

# Kill runaway processes (adjust PIDs as needed)
ps aux | awk '$3 > 80.0' | grep -E 'jest|node.*test' | awk '{print $2}' | xargs kill -9

# Wait and verify load drops
watch -n 5 'uptime && ps aux | grep -E "jest|node.*test" | head -5'
```

**Success Criteria**:
- Load average (1 min) < 50
- No single process using > 80% CPU
- Memory usage < 80%

**Once Stable**: Proceed to Step 2

---

### Step 2: Validate Existing Infrastructure (10 minutes)

```bash
# Navigate to project root
cd /Users/shahroozbhopti/Documents/code/agentic-flow

# Check environment variables
echo "AF_DYNAMIC_GOVERNOR=$AF_DYNAMIC_GOVERNOR"

# Verify scripts exist
ls -lh scripts/doc_query.py
ls -lh scripts/monitoring/process_tree_watch.js
ls -lh .claude/agents/workflow_orchestrator.py

# Verify .goalie tracking directory
ls -lh .goalie/

# Test doc_query.py
python3 scripts/doc_query.py --action-items | head -20

# Test workflow orchestrator
python3 .claude/agents/workflow_orchestrator.py --cycle --action "METRICS-SNAPSHOT-$(date +%Y%m%d%H%M%S)" --json
```

**Success Criteria**:
- All scripts execute without errors
- .goalie/ directory contains cycle_log.jsonl, metrics_log.jsonl, insights_log.jsonl
- doc_query.py reports ~3,607 action items

---

### Step 3: Restart Monitoring Dashboard (5 minutes)

```bash
# Start monitoring in background
cd /Users/shahroozbhopti/Documents/code/agentic-flow
export AF_DYNAMIC_GOVERNOR=1
nohup node scripts/monitoring/process_tree_watch.js >> logs/process_watch.log 2>&1 &

# Capture PID
echo $! > logs/process_watch.pid

# Verify it's running
ps aux | grep process_tree_watch | grep -v grep

# Check logs
tail -f logs/process_watch.log
# Press Ctrl+C to exit tail
```

**Success Criteria**:
- process_tree_watch.js running in background
- logs/process_watch.log updating every 10 seconds
- logs/process_tree_snapshot.json created
- No new load spikes

---

## Phase 1 Implementation (Week 1)

### Task 1.1: Implement Process Governor [WSJF: 15.0]

**Estimated Time**: 2-3 hours  
**Dependencies**: None

**Steps**:
1. Create directory structure:
```bash
mkdir -p src/runtime
mkdir -p state
mkdir -p logs
```

2. Create `src/runtime/processGovernor.ts`:
   - Use template from AGENTIC_WORKFLOW_ANALYSIS.md section 1.2
   - Implement `checkOrphanProcesses()` method
   - Implement `checkRunawayProcesses()` method
   - Implement `checkCascadeIncidents()` method
   - Add logging to `logs/governor_incidents.jsonl`

3. Create TypeScript types:
```typescript
// src/runtime/types.ts
export interface GovernorIncident {
  pid: number;
  ppid: number;
  command: string;
  reason: 'orphan' | 'cpu_threshold' | 'runtime_limit' | 'cascade';
  action: 'warn' | 'term' | 'kill';
  timestamp: string;
  cpu_percent?: number;
  elapsed_seconds?: number;
}

export interface IncidentRecord {
  command: string;
  count: number;
  first_seen: string;
  last_seen: string;
  pids: number[];
}
```

4. Integrate with Jest:
```typescript
// tests/setup/globalSetup.js
const { processGovernor } = require('../../src/runtime/processGovernor');

module.exports = async () => {
  console.log('[GlobalSetup] Starting process governor...');
  processGovernor.start();
  
  // Wait 2 seconds to ensure governor is monitoring
  await new Promise(resolve => setTimeout(resolve, 2000));
};
```

5. Test manually:
```bash
# Start governor in test mode
AF_DYNAMIC_GOVERNOR=1 node src/runtime/processGovernor.ts

# In another terminal, create a CPU-intensive process
stress --cpu 4 --timeout 60s

# Verify governor detects and logs it
tail -f logs/governor_incidents.jsonl
```

**Success Criteria**:
- processGovernor.ts compiles without errors
- Governor starts when AF_DYNAMIC_GOVERNOR=1
- Detects orphan processes (PPID=1)
- Kills processes exceeding CPU threshold (95% for 2 min)
- Logs incidents to JSONL file
- No false positives on legitimate processes

---

### Task 1.2: Create Metrics Collector [WSJF: 14.0]

**Estimated Time**: 2-3 hours  
**Dependencies**: None

**Steps**:
1. Create `scripts/metrics_collector.py`:
   - Use template from AGENTIC_WORKFLOW_ANALYSIS.md section 2.1
   - Implement `collect_process_metrics()`
   - Implement `collect_flow_metrics()`
   - Implement `collect_learning_metrics()`
   - Implement `emit_metrics_snapshot()`

2. Add CLI interface:
```python
# At bottom of scripts/metrics_collector.py
if __name__ == '__main__':
    parser = argparse.ArgumentParser(
        description='Real-time flow metrics collector'
    )
    parser.add_argument('--daemon', action='store_true',
                       help='Run as daemon')
    parser.add_argument('--interval', type=int, default=60,
                       help='Collection interval (seconds)')
    parser.add_argument('--query', action='store_true',
                       help='Query current metrics')
    parser.add_argument('--dashboard', action='store_true',
                       help='Show terminal dashboard')
    parser.add_argument('--project-root', default='.',
                       help='Project root directory')
    
    args = parser.parse_args()
    
    collector = FlowMetricsCollector(Path(args.project_root))
    
    if args.query:
        metrics = collector.emit_metrics_snapshot()
        print(json.dumps(metrics, indent=2))
    elif args.dashboard:
        # TODO: Implement rich terminal dashboard
        pass
    elif args.daemon:
        print(f'[MetricsCollector] Starting daemon (interval={args.interval}s)')
        while True:
            collector.emit_metrics_snapshot()
            time.sleep(args.interval)
```

3. Test manually:
```bash
# Query current metrics
python3 scripts/metrics_collector.py --query

# Run daemon for 5 minutes
timeout 300 python3 scripts/metrics_collector.py --daemon --interval 60

# Verify metrics logged
cat .goalie/metrics_log.jsonl | jq '.'
```

**Success Criteria**:
- Metrics collector runs without errors
- Emits snapshots to .goalie/metrics_log.jsonl
- Calculates lead time, cycle time, throughput
- Detects WIP violations, blocked items
- Alerts on threshold violations

---

### Task 1.3: Automate Retrospective → Backlog Pipeline [WSJF: 12.0]

**Estimated Time**: 2-3 hours  
**Dependencies**: None

**Steps**:
1. Create `scripts/retro_to_backlog.py`:
   - Use template from AGENTIC_WORKFLOW_ANALYSIS.md section 2.2
   - Implement `process_rca_file()`
   - Implement `_calculate_wsjf()` with heuristics
   - Implement `create_backlog_issues()`

2. Add git hook for automatic trigger:
```bash
# .git/hooks/post-commit
#!/bin/bash
# Auto-trigger retro pipeline on RCA commits

# Check if commit modified RCA files
if git diff-tree --no-commit-id --name-only -r HEAD | grep -q '.goalie/RCA_.*\.yaml'; then
  echo "[GitHook] RCA file committed, triggering retro→backlog pipeline..."
  python3 scripts/retro_to_backlog.py --rca .goalie/RCA_*.yaml
fi
```

3. Make hook executable:
```bash
chmod +x .git/hooks/post-commit
```

4. Test manually:
```bash
# Process existing RCA
python3 scripts/retro_to_backlog.py --rca .goalie/RCA_20251113_0357_system_health.yaml

# Verify backlog items created
cat .goalie/INBOX_ZERO_SAFLA_BOARD.yaml
```

**Success Criteria**:
- Pipeline extracts improvements from RCA
- Calculates WSJF scores automatically
- Creates backlog items in SAFLA board
- Links items to source RCA
- Runs in < 5 seconds per RCA file

---

## Phase 2 Implementation (Week 2-3)

### Task 2.1: Agent Coordinator Foundation [WSJF: 11.0]

See AGENTIC_WORKFLOW_ANALYSIS.md section 3.1 for full implementation details.

**Key Steps**:
1. Create `src/orchestration/agentCoordinator.ts`
2. Implement agent registration and capability matching
3. Add task routing logic
4. Integrate with existing workflow_orchestrator.py
5. Test with simple workflow: analyze → implement → review

---

### Task 2.2: TDD Metrics & Quality Gates [WSJF: 10.0]

See AGENTIC_WORKFLOW_ANALYSIS.md section 3.2 for full implementation details.

**Key Steps**:
1. Create `src/quality/tddMetrics.ts`
2. Integrate with Jest coverage reports
3. Add pre-commit hook for quality gate enforcement
4. Report metrics to .goalie/metrics_log.jsonl
5. Display in monitoring dashboard

---

## Monitoring & Validation

### Check System Health

```bash
# System load
uptime

# Process tree snapshot
cat logs/process_tree_snapshot.json | jq '.system'

# Recent incidents
tail -20 logs/governor_incidents.jsonl | jq '.'

# Recent metrics
tail -5 .goalie/metrics_log.jsonl | jq '.system'

# Action item count trend
python3 scripts/doc_query.py --action-items | wc -l
```

### Daily Checklist

- [ ] System load < 50
- [ ] No governor incidents (CPU/orphan) in last 24h
- [ ] Monitoring dashboard running (check PID)
- [ ] Metrics collector emitting snapshots every 60s
- [ ] Zero orphaned processes (ps -eo ppid,pid,comm | grep ' 1 ')
- [ ] At least 1 commit per day (git log --since="24 hours ago")

---

## Troubleshooting

### "ModuleNotFoundError: No module named 'X'"

```bash
# Install missing Python packages
pip3 install pyyaml rich

# Or use venv
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### "Cannot find module" (TypeScript)

```bash
# Compile TypeScript
npm run build

# Or install dependencies
npm install
```

### "Process governor not starting"

```bash
# Check environment variable
echo $AF_DYNAMIC_GOVERNOR

# Set it if missing
export AF_DYNAMIC_GOVERNOR=1

# Add to shell config for persistence
echo 'export AF_DYNAMIC_GOVERNOR=1' >> ~/.bashrc
source ~/.bashrc
```

### "Monitoring dashboard not running"

```bash
# Check if process exists
ps aux | grep process_tree_watch

# Restart if missing
cd /Users/shahroozbhopti/Documents/code/agentic-flow
nohup node scripts/monitoring/process_tree_watch.js >> logs/process_watch.log 2>&1 &
echo $! > logs/process_watch.pid
```

### "High system load persists"

```bash
# Find all test-related processes
ps aux | grep -E 'jest|node.*test|stress' | grep -v grep

# Kill them one by one (replace PID)
kill -9 <PID>

# Or kill all at once (dangerous!)
pkill -9 -f 'jest|node.*test'

# Wait 60 seconds and check load
sleep 60 && uptime
```

---

## Next Steps After Stabilization

1. **Archive backlog items** (reduce from 3,607 → ~2,900)
   ```bash
   mkdir -p archive/backlog-2025-01
   # Move low-priority markdown files to archive
   ```

2. **Complete BML Phase 1 integration test**
   ```bash
   # Run one full workflow cycle
   ./scripts/start-work.sh
   # Make a small change
   git commit -m "Test: BML cycle integration"
   # Verify git hook auto-linked to issue
   ```

3. **Enable WIP limits** in SAFLA board
   - NOW column: max 3 items
   - NEXT column: max 5 items
   - Enforce via pre-commit hook

4. **Create terminal dashboard** using `rich` library
   - Real-time metrics display
   - Load trend graph (sparklines)
   - Top 5 action items by WSJF
   - Governor incident log

---

## Resources

- **Main Analysis**: [AGENTIC_WORKFLOW_ANALYSIS.md](./AGENTIC_WORKFLOW_ANALYSIS.md)
- **Execution Status**: [EXECUTION_STATUS_REPORT.md](./EXECUTION_STATUS_REPORT.md)
- **RCA Report**: [.goalie/RCA_20251113_0357_system_health.yaml](../.goalie/RCA_20251113_0357_system_health.yaml)
- **BEAM TDD Metrics**: https://modelstorming.squarespace.com/s/BEAM_Reference_Card_US.pdf
- **Kanban Maturity**: https://www.kanbanmaturitymodel.com/

---

**Status**: Ready for incremental execution  
**Owner**: Development Team  
**Next Review**: After Phase 1 stabilization (Week 1 complete)
